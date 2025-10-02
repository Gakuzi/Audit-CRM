
import React, { useState, useRef, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, sendGuestEventNotification } from '../services/supabaseClient';
import { Spinner } from './ui/Spinner';
// Fix: Import 'PlanItem' type to resolve 'Cannot find name' error.
import { Event, Project, PlanItem, PlanItemType } from '../types';
import { FaTimes, FaPaperclip, FaGoogleDrive, FaCamera, FaLink, FaTasks, FaVideo, FaPlus, FaPaperPlane } from 'react-icons/fa';
import { FILE_SIZE_LIMIT } from '../constants';
import UploadToDriveModal from './UploadToDriveModal';
import AttachLinkModal from './AttachLinkModal';
import AudioRecorderModal from './AudioRecorderModal';

interface AddEventFormProps {
  user: User | null;
  providerToken: string | null;
  context: { weekId: string; taskId: string; projectId: string; item: PlanItem };
  quotedEvent: Event | null;
  onClearQuote: () => void;
  onNewEvent: (event: Event) => void;
  project: Project;
  isGuest: boolean;
  onAddSubTaskRequest: (type: PlanItemType) => void;
}

const sanitizeFileName = (fileName: string): string => {
    return fileName.replace(/[^a-zA-Z0-9_.-]/g, '_').substring(0, 100);
};

const AddEventForm: React.FC<AddEventFormProps> = ({ user, providerToken, context, quotedEvent, onClearQuote, onNewEvent, project, isGuest, onAddSubTaskRequest }) => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [filesToAttach, setFilesToAttach] = useState<File[]>([]);
    
    const [fileForDrive, setFileForDrive] = useState<File | null>(null);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const actionMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
                setIsActionMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [content]);

    const uploadFiles = async (files: File[]) => {
        if (files.length === 0) return [];
        
        const uploadPromises = files.map(async file => {
            const sanitized = sanitizeFileName(file.name);
            const filePath = `${user ? user.id : 'guests'}/${context.taskId}/${Date.now()}-${sanitized}`;
            const { error } = await supabase.storage.from('audit-files').upload(filePath, file);
            if (error) throw error;
            const { data } = supabase.storage.from('audit-files').getPublicUrl(filePath);
            return { name: file.name, url: data.publicUrl, type: file.type };
        });
    
        return Promise.all(uploadPromises);
    };
    
    const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files) return;
        const selectedFiles = Array.from(event.target.files);
        const validFiles: File[] = [];
        for (const file of selectedFiles) {
            const currentFile = file as File;
            if (currentFile.size > FILE_SIZE_LIMIT) {
                if (providerToken) setFileForDrive(currentFile);
                else alert(`Файл "${currentFile.name}" слишком большой (>${FILE_SIZE_LIMIT/1024/1024}MB) и не может быть загружен. Войдите через Google, чтобы загружать большие файлы на Google Drive.`);
            } else {
                validFiles.push(currentFile);
            }
        }
        setFilesToAttach(prev => [...prev, ...validFiles]);
        event.target.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() && filesToAttach.length === 0) return;
        setLoading(true);
        try {
            const uploadedFiles = await uploadFiles(filesToAttach);
            const { data, error } = await supabase.from('events').insert({
                project_id: context.projectId,
                week_id: context.weekId,
                task_id: context.taskId,
                user_id: user ? user.id : null,
                author_email: user ? user.email : (localStorage.getItem('guestName') || 'Гость'),
                type: 'comment' as const,
                content: content.trim(),
                parent_event_id: quotedEvent?.id || null,
                data: uploadedFiles.length > 0 ? { file_urls: uploadedFiles } : null,
            }).select().single();
            if (error) throw error;
            if (data) {
                const newEvent = data as Event;
                onNewEvent(newEvent);
                if (isGuest) {
                    sendGuestEventNotification(project, context.item, newEvent, window.location.origin);
                }
                setContent(''); setFilesToAttach([]); onClearQuote();
            }
        } catch(err: any) {
            alert('Ошибка: ' + err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const handleAttachLink = (url: string) => { setContent(prev => `${prev}\n[Ссылка](${url})`.trim()); }

    const ActionButton = ({ icon, label, action }: { icon: React.ReactNode, label: string, action: () => void }) => (
        <button type="button" onClick={() => { action(); setIsActionMenuOpen(false); }} className="action-button">
            {icon} <span className="ml-3">{label}</span>
        </button>
    );

    return (
        <div className="relative">
            <input type="file" multiple ref={fileInputRef} onChange={handleFilesSelected} className="hidden" />
            <input type="file" accept="image/*" capture="environment" ref={imageInputRef} onChange={handleFilesSelected} className="hidden" />

            <div className="bg-white p-2 rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500">
                {quotedEvent && (
                    <div className="p-2 mb-2 bg-gray-100 rounded-md text-sm relative border-l-4 border-blue-400">
                        <p className="font-semibold text-gray-700">Ответ на: {quotedEvent.author_email}</p>
                        <p className="truncate text-gray-600">{quotedEvent.content}</p>
                        <button onClick={onClearQuote} className="absolute top-1.5 right-1.5 p-1 rounded-full hover:bg-gray-200"><FaTimes size={12}/></button>
                    </div>
                )}
                <form onSubmit={handleSubmit} className="flex items-end gap-2">
                    <div className="relative" ref={actionMenuRef}>
                        <button type="button" onClick={() => setIsActionMenuOpen(p => !p)} className="action-btn flex-shrink-0">
                            <FaPlus />
                        </button>
                        {isActionMenuOpen && (
                             <div className="absolute bottom-full left-0 mb-2 w-60 bg-white rounded-lg shadow-lg border p-2 z-10">
                                <ActionButton icon={<FaPaperclip />} label="Файл с устройства" action={() => fileInputRef.current?.click()} />
                                <ActionButton icon={<FaCamera />} label="Сделать фото" action={() => imageInputRef.current?.click()} />
                                <ActionButton icon={<FaLink />} label="Прикрепить ссылку" action={() => setIsLinkModalOpen(true)} />
                                <ActionButton icon={<FaVideo />} label="Записать аудио" action={() => setIsAudioModalOpen(true)} />
                                <div className="my-1 border-t"></div>
                                <ActionButton icon={<FaTasks />} label="Добавить подзадачу" action={() => onAddSubTaskRequest('task')} />
                                <ActionButton icon={<FaVideo />} label="Запросить встречу" action={() => onAddSubTaskRequest('meeting')} />
                                {providerToken && <ActionButton icon={<FaGoogleDrive />} label="Файл с Google Drive" action={() => alert("Выберите файл >47MB")} />}
                            </div>
                        )}
                    </div>
                    <textarea ref={textareaRef} value={content} onChange={(e) => setContent(e.target.value)} rows={1} placeholder="Напишите комментарий..." disabled={loading} className="w-full p-2 border-0 focus:ring-0 resize-none bg-transparent textarea-autogrow" />
                    <button type="submit" disabled={loading || (!content.trim() && filesToAttach.length === 0)} className="btn-primary p-2.5 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
                        {loading ? <Spinner size="sm" /> : <FaPaperPlane />}
                    </button>
                </form>
            </div>
            {filesToAttach.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                    {filesToAttach.map((file, i) => (
                        <div key={i} className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1 text-sm">
                            <span className="truncate max-w-xs">{file.name}</span>
                            <button type="button" onClick={() => setFilesToAttach(f => f.filter((_, idx) => idx !== i))}><FaTimes size={12} /></button>
                        </div>
                    ))}
                </div>
            )}
            
            {fileForDrive && providerToken && <UploadToDriveModal isOpen={!!fileForDrive} onClose={() => setFileForDrive(null)} file={fileForDrive} providerToken={providerToken} onUploadComplete={link => setContent(p => `${p}\n[${link.name}](${link.url})`)} />}
            <AttachLinkModal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} onAttach={handleAttachLink} />
            <AudioRecorderModal isOpen={isAudioModalOpen} onClose={() => setIsAudioModalOpen(false)} onSave={(files) => setFilesToAttach(prev => [...prev, ...files])} />
        </div>
    );
};

export default AddEventForm;

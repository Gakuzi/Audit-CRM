// src/components/AddEventForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { Spinner } from './ui/Spinner';
import { Event, Project, PlanItem } from '../types';
import { FaTimes, FaPaperclip, FaVideo, FaMicrophone, FaLink, FaCamera, FaTasks, FaGoogleDrive, FaPlus, FaPaperPlane } from 'react-icons/fa';
import AudioRecorderModal from './AudioRecorderModal';
import AttachLinkModal from './AttachLinkModal';
import UploadToDriveModal from './UploadToDriveModal';
import { FILE_SIZE_LIMIT } from '../constants';

interface AddEventFormProps {
  user: User | null;
  providerToken: string | null;
  context: { weekId: string; taskId: string; projectId: string; };
  quotedEvent: Event | null;
  onClearQuote: () => void;
  onNewEvent: (event: Event) => void;
  onAddSubTaskRequest: () => void;
  project: Project;
  isGuest: boolean;
  isAuditor: boolean;
}

const sanitizeFileName = (fileName: string) => {
    const parts = fileName.split('.');
    const extension = parts.length > 1 ? '.' + parts.pop() : '';
    const name = parts.join('.');
    const cleanedName = name
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .substring(0, 100);
    return cleanedName + extension;
};

const AddEventForm: React.FC<AddEventFormProps> = ({ user, providerToken, context, quotedEvent, onClearQuote, onNewEvent, onAddSubTaskRequest, isGuest, isAuditor }) => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [filesToAttach, setFilesToAttach] = useState<File[]>([]);
    const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [fileToDrive, setFileToDrive] = useState<File | null>(null);
    const [isActionsOpen, setIsActionsOpen] = useState(false);
    const actionsRef = useRef<HTMLDivElement>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    
    const autoGrow = (element: HTMLTextAreaElement | null) => {
        if (element) {
            element.style.height = 'auto';
            element.style.height = `${element.scrollHeight}px`;
        }
    };
    
    useEffect(() => {
        autoGrow(textareaRef.current);
    }, [content]);

    useEffect(() => {
        if (quotedEvent) textareaRef.current?.focus();
    }, [quotedEvent]);
    
     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
                setIsActionsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const uploadFiles = async (files: File[]) => {
        if (!files || files.length === 0) return [];
        const authorId = user ? user.id : (localStorage.getItem('guestName') || 'guest');
        return Promise.all(files.map(async file => {
            const sanitizedFileName = sanitizeFileName(file.name);
            const filePath = `${authorId}/${context.taskId}/${Date.now()}-${sanitizedFileName}`;
            const { error } = await supabase.storage.from('audit-files').upload(filePath, file);
            if (error) throw error;
            const { data } = supabase.storage.from('audit-files').getPublicUrl(filePath);
            return { name: file.name, url: data.publicUrl, type: file.type };
        }));
    };
    
    const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        for (const file of Array.from(files) as File[]) {
            if (file.size > FILE_SIZE_LIMIT) {
                if (providerToken) {
                    setFileToDrive(file); 
                } else {
                    alert(`Файл "${file.name}" слишком большой (${(file.size / 1024 / 1024).toFixed(1)}MB). Максимальный размер: ${FILE_SIZE_LIMIT / 1024 / 1024}MB. Войдите через Google, чтобы загружать большие файлы.`);
                }
            } else {
                setFilesToAttach(prev => [...prev, file]);
            }
        }
        event.target.value = '';
    };
    
    const handleAttachLink = (url: string) => {
        setContent(prev => `${prev}\n[${url}](${url})`.trim());
        textareaRef.current?.focus();
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
                type: 'comment',
                content: content.trim(),
                parent_event_id: quotedEvent ? quotedEvent.id : null,
                data: uploadedFiles.length > 0 ? { file_urls: uploadedFiles } : null,
            }).select().single();
    
            if (error) throw error;
            if (data) onNewEvent(data as Event);
            setContent('');
            setFilesToAttach([]);
            onClearQuote();
        } catch(err: any) {
            alert('Ошибка добавления комментария: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveFile = (index: number) => {
        setFilesToAttach(files => files.filter((_, i) => i !== index));
    };

    return (
        <div className="bg-white rounded-lg border">
            <input type="file" multiple ref={fileInputRef} onChange={handleFilesSelected} className="hidden" />
            <input type="file" accept="image/*" capture="environment" ref={imageInputRef} onChange={handleFilesSelected} className="hidden" />
            <input type="file" accept="video/*" capture="environment" ref={videoInputRef} onChange={handleFilesSelected} className="hidden" />

            <form onSubmit={handleSubmit} className="p-2">
                 {quotedEvent && (
                    <div className="mb-2 bg-gray-100 rounded-md text-sm relative border-l-4 border-blue-400 p-2">
                        <p className="font-semibold text-gray-700">Ответ на: {quotedEvent.author_email}</p>
                        <p className="text-gray-600 truncate">{quotedEvent.content}</p>
                        <button onClick={onClearQuote} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"><FaTimes size={12}/></button>
                    </div>
                )}
                {filesToAttach.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2 border-b pb-2">
                        {filesToAttach.map((file, index) => (
                            <div key={index} className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1 text-sm">
                                <span className="max-w-xs truncate">{file.name}</span>
                                <button type="button" onClick={() => handleRemoveFile(index)} className="text-gray-500 hover:text-gray-800"><FaTimes size={12} /></button>
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex items-end gap-2">
                    <div className="relative" ref={actionsRef}>
                        <button type="button" onClick={() => setIsActionsOpen(prev => !prev)} className="p-3 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 transition-colors" title="Прикрепить">
                            <FaPlus />
                        </button>
                        {isActionsOpen && (
                            <div className="absolute bottom-full mb-2 w-max bg-white border rounded-lg shadow-lg p-1 flex flex-col items-start gap-1 z-10">
                                <button type="button" onClick={() => { fileInputRef.current?.click(); setIsActionsOpen(false); }} className="action-button"><FaPaperclip className="mr-2 text-gray-500"/>Файл</button>
                                <button type="button" onClick={() => { imageInputRef.current?.click(); setIsActionsOpen(false); }} className="action-button"><FaCamera className="mr-2 text-gray-500"/>Фото</button>
                                <button type="button" onClick={() => { videoInputRef.current?.click(); setIsActionsOpen(false); }} className="action-button"><FaVideo className="mr-2 text-orange-500"/>Видео</button>
                                <button type="button" onClick={() => { setIsAudioModalOpen(true); setIsActionsOpen(false); }} className="action-button"><FaMicrophone className="mr-2 text-red-500"/>Аудио</button>
                                <button type="button" onClick={() => { setIsLinkModalOpen(true); setIsActionsOpen(false); }} className="action-button"><FaLink className="mr-2 text-blue-500"/>Ссылка</button>
                                {(isGuest || isAuditor) && <button type="button" onClick={() => { onAddSubTaskRequest(); setIsActionsOpen(false); }} className="action-button"><FaTasks className="mr-2 text-green-500"/>Подзадача</button>}
                                {providerToken && <button type="button" onClick={() => { fileInputRef.current?.click(); setIsActionsOpen(false); }} className="action-button"><FaGoogleDrive className="mr-2 text-yellow-500"/>Большой файл</button>}
                            </div>
                        )}
                    </div>

                    <div className="flex-grow bg-gray-100 rounded-lg flex items-end">
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any); } }}
                            className="w-full bg-transparent py-2 px-3 border-0 focus:ring-0 resize-none textarea-autogrow"
                            rows={1}
                            placeholder="Напишите комментарий..."
                            disabled={loading}
                        />
                    </div>

                    <button type="submit" disabled={loading || (!content.trim() && filesToAttach.length === 0)} className="p-3 btn-primary flex justify-center items-center rounded-lg disabled:bg-blue-300" title="Отправить">
                        {loading ? <Spinner size="sm" /> : <FaPaperPlane />}
                    </button>
                </div>
            </form>

            <AudioRecorderModal isOpen={isAudioModalOpen} onClose={() => setIsAudioModalOpen(false)} onSave={(files) => setFilesToAttach(prev => [...prev, ...files])} />
            <AttachLinkModal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} onAttach={handleAttachLink} />
            {fileToDrive && providerToken && <UploadToDriveModal isOpen={!!fileToDrive} onClose={() => setFileToDrive(null)} file={fileToDrive} providerToken={providerToken} onUploadComplete={(link) => handleAttachLink(link.url)} />}
        </div>
    );
};

export default AddEventForm;

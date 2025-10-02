import React, { useState, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, sendGuestEventNotification } from '../services/supabaseClient';
import { Spinner } from './ui/Spinner';
import { Event, Project, PlanItem } from '../types';
import { FaTimes, FaPaperclip, FaGoogleDrive, FaCamera, FaLink, FaTasks } from 'react-icons/fa';
import { FILE_SIZE_LIMIT } from '../constants';
import UploadToDriveModal from './UploadToDriveModal';
import AttachLinkModal from './AttachLinkModal';
import { useGooglePicker } from '../hooks/useGooglePicker';

interface AddEventFormProps {
  user: User | null;
  providerToken: string | null;
  context: { item: PlanItem; weekId: string; projectId: string; };
  quotedEvent: Event | null;
  onClearQuote: () => void;
  onNewEvent: (event: Event) => void;
  project: Project;
  isGuest: boolean;
  onAddSubTaskRequest: () => void;
}

const sanitizeFileName = (fileName: string): string => {
    return fileName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '').substring(0, 100);
};

const AddEventForm: React.FC<AddEventFormProps> = ({ user, providerToken, context, quotedEvent, onClearQuote, onNewEvent, project, isGuest, onAddSubTaskRequest }) => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [filesToAttach, setFilesToAttach] = useState<File[]>([]);
    const [fileForDrive, setFileForDrive] = useState<File | null>(null);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    
    const handlePickerFiles = (files: { name: string, url: string, mimeType: string }[]) => {
        const links = files.map(file => `[${file.name}](${file.url})`).join('\n');
        setContent(prev => `${prev}\n${links}`.trim());
    };

    const { openPicker, isPickerReady } = useGooglePicker({ token: providerToken, onFilesSelected: handlePickerFiles });

    const uploadFiles = async (files: File[]) => {
        if (files.length === 0) return [];
        
        const uploadPromises = files.map(async file => {
            const sanitized = sanitizeFileName(file.name);
            const filePath = `${user ? user.id : 'guests'}/${context.item.id}/${Date.now()}-${sanitized}`;
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
            if (file.size > FILE_SIZE_LIMIT) {
                if (providerToken) setFileForDrive(file);
                else alert(`Файл "${file.name}" слишком большой (>${FILE_SIZE_LIMIT/1024/1024}MB) и не может быть загружен. Войдите через Google, чтобы загружать большие файлы на Google Drive.`);
            } else {
                validFiles.push(file);
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
            const author_email = user ? user.email : (localStorage.getItem('guestName') || 'Гость');
            
            const { data, error } = await supabase.from('events').insert({
                project_id: context.projectId,
                week_id: context.weekId,
                task_id: context.item.id,
                user_id: user ? user.id : null,
                author_email: author_email,
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
    
    const handleAttachLink = (url: string) => {
        setContent(prev => `${prev}\n[Ссылка](${url})`.trim());
    }

    return (
        <div className="bg-white p-3 rounded-lg border">
            <input type="file" multiple ref={fileInputRef} onChange={handleFilesSelected} className="hidden" />
            <input type="file" accept="image/*" capture="environment" ref={imageInputRef} onChange={handleFilesSelected} className="hidden" />
            {quotedEvent && (
                <div className="p-2 mb-2 bg-gray-100 rounded-md text-sm relative">
                    <p>Ответ на: <span className="font-semibold">{quotedEvent.author_email}</span></p>
                    <p className="truncate">{quotedEvent.content}</p>
                    <button onClick={onClearQuote} className="absolute top-2 right-2"><FaTimes size={12}/></button>
                </div>
            )}
            <form onSubmit={handleSubmit}>
                <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} placeholder="Напишите комментарий..." disabled={loading} className="w-full p-2 border-0 focus:ring-0 resize-none" />
                <div className="mt-2 flex flex-wrap gap-2">
                    {filesToAttach.map((file, i) => (
                        <div key={i} className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1 text-sm">
                            <span className="truncate max-w-[200px]">{file.name}</span>
                            <button type="button" onClick={() => setFilesToAttach(f => f.filter((_, idx) => idx !== i))}><FaTimes size={12} /></button>
                        </div>
                    ))}
                </div>
                <div className="mt-2 pt-2 border-t flex justify-between items-center">
                    <div className="flex items-center space-x-1 text-gray-500">
                        <button type="button" onClick={() => fileInputRef.current?.click()} title="Прикрепить файл" className="action-btn"><FaPaperclip/></button>
                        <button type="button" onClick={() => imageInputRef.current?.click()} title="Сделать фото" className="action-btn"><FaCamera/></button>
                        <button type="button" onClick={() => setIsLinkModalOpen(true)} title="Прикрепить ссылку" className="action-btn"><FaLink/></button>
                        {(user || isGuest) && <button type="button" onClick={onAddSubTaskRequest} title="Добавить подзадачу" className="action-btn"><FaTasks/></button>}
                        {isPickerReady && <button type="button" onClick={openPicker} title="Загрузить с Google Drive" className="action-btn"><FaGoogleDrive/></button>}
                    </div>
                    <button type="submit" disabled={loading || (!content.trim() && filesToAttach.length === 0)} className="w-32 py-2 px-4 btn-primary flex justify-center items-center">{loading ? <Spinner size="sm" /> : 'Отправить'}</button>
                </div>
            </form>
            {fileForDrive && providerToken && <UploadToDriveModal isOpen={!!fileForDrive} onClose={() => setFileForDrive(null)} file={fileForDrive} providerToken={providerToken} onUploadComplete={link => setContent(p => `${p}\n[${link.name}](${link.url})`)} />}
            <AttachLinkModal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} onAttach={handleAttachLink} />
        </div>
    );
};

export default AddEventForm;

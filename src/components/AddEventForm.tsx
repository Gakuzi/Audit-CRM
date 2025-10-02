// src/components/AddEventForm.tsx
import React, { useState, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { Spinner } from './ui/Spinner';
import { Event, Project } from '../types';
import { FaTimes, FaPaperclip, FaVideo, FaMicrophone, FaCamera, FaLink } from 'react-icons/fa';
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
  onNewEvent: (event: Event, isAi?: boolean) => void;
  project: Project;
  isGuest: boolean;
  onAddSubTaskRequest: (type: 'meeting') => void;
}

const AddEventForm: React.FC<AddEventFormProps> = ({ user, providerToken, context, quotedEvent, onClearQuote, onNewEvent, isGuest, onAddSubTaskRequest }) => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [filesToAttach, setFilesToAttach] = useState<File[]>([]);
    const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [largeFileToUpload, setLargeFileToUpload] = useState<File | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);

    const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files) return;
        const selectedFiles = Array.from(event.target.files);
        
        // Fix: Explicitly type 'file' as 'File' to resolve type inference issue.
        selectedFiles.forEach((file: File) => {
            if (file.size > FILE_SIZE_LIMIT) {
                if (providerToken) {
                    setLargeFileToUpload(file);
                } else {
                    alert(`Файл "${file.name}" слишком большой (>${FILE_SIZE_LIMIT / 1024 / 1024} MB) и не может быть загружен. Подключите Google Drive для загрузки больших файлов.`);
                }
            } else {
                setFilesToAttach(prev => [...prev, file]);
            }
        });
        event.target.value = '';
    };

    const handleDriveUploadComplete = (link: { name: string; url: string }) => {
        const newContent = `Прикреплен большой файл (Google Drive): [${link.name}](${link.url})`;
        onNewEvent({ content: newContent } as Event);
        setLargeFileToUpload(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() && filesToAttach.length === 0) return;
        setLoading(true);
        try {
            const uploadPromises = filesToAttach.map(async file => {
                const filePath = `${user ? user.id : 'guests'}/${context.taskId}/${Date.now()}-${file.name}`;
                await supabase.storage.from('audit-files').upload(filePath, file);
                const { data } = supabase.storage.from('audit-files').getPublicUrl(filePath);
                return { name: file.name, url: data.publicUrl, type: file.type };
            });
            const uploadedFiles = await Promise.all(uploadPromises);

            const { data, error } = await supabase.from('events').insert({
                project_id: context.projectId, week_id: context.weekId, task_id: context.taskId,
                user_id: user?.id, author_email: user?.email ?? (localStorage.getItem('guestName') || 'Гость'),
                type: 'comment', content: content.trim(), parent_event_id: quotedEvent?.id,
                data: uploadedFiles.length > 0 ? { file_urls: uploadedFiles } : {},
            }).select().single();
    
            if (error) throw error;
            onNewEvent(data as Event);
            setContent(''); setFilesToAttach([]); onClearQuote();
        } catch(err: any) {
            alert('Ошибка: ' + err.message);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="bg-white p-3 rounded-lg border">
            <input type="file" multiple ref={fileInputRef} onChange={handleFilesSelected} className="hidden" />
            <input type="file" accept="image/*" capture="environment" ref={imageInputRef} onChange={handleFilesSelected} className="hidden" />
            <input type="file" accept="video/*" capture="environment" ref={videoInputRef} onChange={handleFilesSelected} className="hidden" />

             {quotedEvent && <div className="p-2 mb-2 bg-gray-100 rounded-md text-sm relative"><p className="font-semibold">Ответ на:</p><p className="truncate">{quotedEvent.content}</p><button onClick={onClearQuote} className="absolute top-2 right-2"><FaTimes size={12}/></button></div>}
            
            <form onSubmit={handleSubmit}>
                <textarea ref={textareaRef} value={content} onChange={(e) => setContent(e.target.value)} className="w-full p-2 border-0 focus:ring-0 resize-none" rows={3} placeholder="Напишите комментарий..." disabled={loading} />
                <div className="mt-2 flex flex-wrap gap-2">{filesToAttach.map((file, i) => <div key={i} className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1 text-sm">{file.name}<button type="button" onClick={() => setFilesToAttach(f => f.filter((_, idx) => idx !== i))}><FaTimes size={12} /></button></div>)}</div>
                <div className="mt-2 pt-2 border-t flex justify-between items-center">
                    <div className="flex items-center space-x-1">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="action-btn" title="Прикрепить файл" disabled={loading}><FaPaperclip size={18} /></button>
                        <button type="button" onClick={() => imageInputRef.current?.click()} className="action-btn" title="Сделать фото" disabled={loading}><FaCamera size={18} /></button>
                        <button type="button" onClick={() => videoInputRef.current?.click()} className="action-btn" title="Записать видео" disabled={loading}><FaVideo size={18} /></button>
                        <button type="button" onClick={() => setIsAudioModalOpen(true)} className="action-btn" title="Записать аудио" disabled={loading}><FaMicrophone size={18} /></button>
                        <button type="button" onClick={() => setIsLinkModalOpen(true)} className="action-btn" title="Прикрепить ссылку" disabled={loading}><FaLink size={18} /></button>
                        {isGuest && <button type="button" onClick={() => onAddSubTaskRequest('meeting')} className="action-btn" title="Запросить встречу" disabled={loading}><FaVideo size={18} /></button>}
                    </div>
                    <button type="submit" disabled={loading || (!content.trim() && filesToAttach.length === 0)} className="w-32 py-2 px-4 btn-primary flex justify-center items-center">{loading ? <Spinner size="sm" /> : 'Отправить'}</button>
                </div>
            </form>

            <AudioRecorderModal isOpen={isAudioModalOpen} onClose={() => setIsAudioModalOpen(false)} onSave={files => setFilesToAttach(prev => [...prev, ...files])} />
            <AttachLinkModal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} onAttach={url => onNewEvent({ content: `Прикреплена ссылка: [${url}](${url})` } as Event)} />
            {largeFileToUpload && providerToken && <UploadToDriveModal isOpen={!!largeFileToUpload} onClose={() => setLargeFileToUpload(null)} file={largeFileToUpload} providerToken={providerToken} onUploadComplete={handleDriveUploadComplete} />}
        </div>
    );
};

export default AddEventForm;

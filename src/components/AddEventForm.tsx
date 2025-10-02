
// src/components/AddEventForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { Spinner } from './ui/Spinner';
import { Event, Project } from '../types';
import { FaTimes, FaPaperclip, FaVideo, FaMicrophone, FaLink, FaCamera, FaTasks, FaGoogleDrive } from 'react-icons/fa';
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

const AddEventForm: React.FC<AddEventFormProps> = ({ user, providerToken, context, quotedEvent, onClearQuote, onNewEvent, onAddSubTaskRequest, isGuest }) => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [filesToAttach, setFilesToAttach] = useState<File[]>([]);
    const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [fileToDrive, setFileToDrive] = useState<File | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if(quotedEvent) textareaRef.current?.focus();
    }, [quotedEvent]);

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

        for (const file of Array.from(files)) {
            if (file.size > FILE_SIZE_LIMIT) {
                if (providerToken) {
                    setFileToDrive(file); // Trigger Drive upload modal for large files
                } else {
                    alert(`Файл "${file.name}" слишком большой (${(file.size / 1024 / 1024).toFixed(1)}MB). Максимальный размер: ${FILE_SIZE_LIMIT / 1024 / 1024}MB. Войдите через Google, чтобы загружать большие файлы.`);
                }
            } else {
                setFilesToAttach(prev => [...prev, file]);
            }
        }
        event.target.value = ''; // Reset input
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
        <div className="bg-white p-3 rounded-lg border">
            <input type="file" multiple ref={fileInputRef} onChange={handleFilesSelected} className="hidden" />
            <input type="file" accept="image/*" capture="environment" ref={imageInputRef} onChange={handleFilesSelected} className="hidden" />
            <input type="file" accept="video/*" capture="environment" ref={videoInputRef} onChange={handleFilesSelected} className="hidden" />
            {quotedEvent && (
                <div className="p-2 mb-2 bg-gray-100 rounded-md text-sm relative">
                    <p className="font-semibold text-gray-700">Ответ на: {quotedEvent.author_email}</p>
                    <p className="text-gray-600 truncate">{quotedEvent.content}</p>
                    <button onClick={onClearQuote} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"><FaTimes size={12}/></button>
                </div>
            )}
            <form onSubmit={handleSubmit}>
                <textarea ref={textareaRef} value={content} onChange={(e) => setContent(e.target.value)} className="w-full p-2 border-0 focus:ring-0 resize-none" rows={3} placeholder="Напишите комментарий..." disabled={loading}/>
                <div className="mt-2 flex flex-wrap gap-2">
                    {filesToAttach.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1 text-sm">
                            <span className="max-w-xs truncate">{file.name}</span>
                            <button type="button" onClick={() => handleRemoveFile(index)} className="text-gray-500 hover:text-gray-800"><FaTimes size={12} /></button>
                        </div>
                    ))}
                </div>
                <div className="mt-2 pt-2 border-t flex justify-between items-center">
                    <div className="flex items-center space-x-1">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100" title="Прикрепить файл"><FaPaperclip/></button>
                        <button type="button" onClick={() => imageInputRef.current?.click()} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100" title="Сделать фото"><FaCamera/></button>
                        <button type="button" onClick={() => videoInputRef.current?.click()} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100" title="Записать видео"><FaVideo/></button>
                        <button type="button" onClick={() => setIsAudioModalOpen(true)} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100" title="Записать аудио"><FaMicrophone/></button>
                        <button type="button" onClick={() => setIsLinkModalOpen(true)} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100" title="Прикрепить ссылку"><FaLink/></button>
                        {(isGuest || isAuditor) && <button type="button" onClick={onAddSubTaskRequest} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100" title="Добавить подзадачу"><FaTasks/></button>}
                        {providerToken && <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100" title="Загрузить большой файл на Google Drive"><FaGoogleDrive/></button>}
                    </div>
                    <button type="submit" disabled={loading || (!content.trim() && filesToAttach.length === 0)} className="w-32 py-2 px-4 btn-primary flex justify-center items-center">
                        {loading ? <Spinner size="sm" /> : 'Отправить'}
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

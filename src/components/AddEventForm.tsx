import React, { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { Spinner } from './ui/Spinner';
import { Event, Project, PlanItem, PlanItemType } from '../types';
import { FaTimes, FaPaperclip, FaVideo, FaMicrophone, FaCamera, FaPlus } from 'react-icons/fa';
import AudioRecorderModal from './AudioRecorderModal';

interface AddEventFormProps {
  user: User | null;
  context: { weekId: string; taskId: string; projectId: string; };
  quotedEvent: Event | null;
  onClearQuote: () => void;
  onNewEvent: (event: Event) => void;
  project: Project;
  task: PlanItem;
  isGuest: boolean;
  onAddSubTaskRequest: (type: PlanItemType) => void;
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

const AddEventForm: React.FC<AddEventFormProps> = ({ user, context, quotedEvent, onClearQuote, onNewEvent, project, task, isGuest, onAddSubTaskRequest }) => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [filesToAttach, setFilesToAttach] = useState<File[]>([]);
    const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (quotedEvent) {
            textareaRef.current?.focus();
        }
    }, [quotedEvent]);

    const uploadFiles = async (files: File[]) => {
        if (!files || files.length === 0) return [];
        
        const uploadPromises = files.map(async file => {
            const sanitizedFileName = sanitizeFileName(file.name);
            const filePath = `${user ? user.id : 'guests'}/${context.taskId}/${Date.now()}-${sanitizedFileName}`;
            const { error: uploadError } = await supabase.storage.from('audit-files').upload(filePath, file);
            if (uploadError) throw uploadError;
            
            const { data } = supabase.storage.from('audit-files').getPublicUrl(filePath);
            return { name: file.name, url: data.publicUrl, type: file.type };
        });
    
        return Promise.all(uploadPromises);
    };
    
    const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFilesToAttach(prev => [...prev, ...Array.from(event.target.files!)]);
            event.target.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() && filesToAttach.length === 0) return;

        let authorIdentifier = user ? user.email : localStorage.getItem('guestName');
        if (isGuest && !authorIdentifier) {
            const guestName = prompt('Пожалуйста, представьтесь (ваше имя будет видно в истории):', 'Гость');
            if (!guestName || guestName.trim() === '') return;
            authorIdentifier = guestName;
            localStorage.setItem('guestName', guestName);
        }

        setLoading(true);
        try {
            const uploadedFiles = await uploadFiles(filesToAttach);
            const eventData = {
                project_id: context.projectId,
                week_id: context.weekId,
                task_id: context.taskId,
                user_id: user ? user.id : null,
                author_email: authorIdentifier,
                type: 'comment' as const,
                content: content.trim(),
                parent_event_id: quotedEvent ? quotedEvent.id : null,
                data: uploadedFiles.length > 0 ? { file_urls: uploadedFiles } : {},
            };
    
            const { data, error } = await supabase.from('events').insert(eventData).select('*, parent:events!parent_event_id(content, author_email)').single();
    
            if (error) {
                throw error;
            } else if (data) {
                onNewEvent(data as Event);
                setContent('');
                setFilesToAttach([]);
                onClearQuote();
            }
        } catch(err: any) {
            alert('Ошибка: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveFile = (indexToRemove: number) => {
        setFilesToAttach(currentFiles => currentFiles.filter((_, index) => index !== indexToRemove));
    };
    
    const isAuditor = !!user && user.id === project.user_id;

    return (
        <div className="bg-white p-3 rounded-lg border">
            <input type="file" multiple ref={fileInputRef} onChange={handleFilesSelected} className="hidden" />
            <input type="file" accept="image/*" capture="environment" ref={imageInputRef} onChange={handleFilesSelected} className="hidden" />
            <input type="file" accept="video/*" capture="environment" ref={videoInputRef} onChange={handleFilesSelected} className="hidden" />

             {quotedEvent && (
                <div className="p-2 mb-2 bg-gray-100 rounded-md text-sm relative">
                    <p className="font-semibold text-gray-700">Ответ на: {quotedEvent.author_email}</p>
                    <p className="text-gray-600 truncate">{quotedEvent.content}</p>
                    <button onClick={onClearQuote} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800">
                        <FaTimes size={12}/>
                    </button>
                </div>
            )}
            <form onSubmit={handleSubmit}>
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full p-2 border-0 focus:ring-0 resize-none"
                    rows={3}
                    placeholder="Напишите комментарий..."
                    disabled={loading}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                    {filesToAttach.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1 text-sm">
                            <span className="max-w-xs truncate">{file.name}</span>
                            <button type="button" onClick={() => handleRemoveFile(index)} className="text-gray-500 hover:text-gray-800">
                                <FaTimes size={12} />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="mt-2 pt-2 border-t flex justify-between items-center">
                    <div className="flex items-center space-x-1">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="action-btn" title="Прикрепить файл" disabled={loading}><FaPaperclip /></button>
                        <button type="button" onClick={() => imageInputRef.current?.click()} className="action-btn" title="Сделать фото" disabled={loading}><FaCamera /></button>
                        <button type="button" onClick={() => videoInputRef.current?.click()} className="action-btn" title="Записать видео" disabled={loading}><FaVideo /></button>
                        <button type="button" onClick={() => setIsAudioModalOpen(true)} className="action-btn" title="Записать аудио" disabled={loading}><FaMicrophone /></button>
                        {isGuest ? (
                            <button type="button" onClick={() => onAddSubTaskRequest('meeting')} className="action-btn" title="Запросить встречу" disabled={loading}><FaPlus /></button>
                        ) : isAuditor && (
                            <button type="button" onClick={() => onAddSubTaskRequest('task')} className="action-btn" title="Создать подзадачу" disabled={loading}><FaPlus /></button>
                        )}
                    </div>

                    <button type="submit" disabled={loading || (!content.trim() && filesToAttach.length === 0)} className="w-32 py-2 px-4 btn-primary flex justify-center items-center">
                        {loading ? <Spinner size="sm" /> : 'Отправить'}
                    </button>
                </div>
            </form>
            <AudioRecorderModal
                isOpen={isAudioModalOpen}
                onClose={() => setIsAudioModalOpen(false)}
                onSave={(blob) => {
                    const audioFile = new File([blob], `audio-recording-${Date.now()}.webm`, { type: blob.type });
                    setFilesToAttach(prev => [...prev, audioFile]);
                }}
            />
        </div>
    );
};

export default AddEventForm;

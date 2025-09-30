import React, { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { Spinner } from './ui/Spinner';
import { Event } from '../types';
import { FaTimes, FaPaperclip, FaVideo, FaMicrophone, FaFileAlt, FaCamera } from 'react-icons/fa';
import Modal from './ui/Modal';
import AudioRecorder from './AudioRecorder';

interface AddEventFormProps {
  user: User;
  context: { weekId: string; taskId: string; projectId: string; };
  quotedEvent: Event | null;
  onClearQuote: () => void;
  onNewEvent: (event: Event) => void;
  onAddStructuredEvent?: () => void;
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

const AddEventForm: React.FC<AddEventFormProps> = ({ user, context, quotedEvent, onClearQuote, onNewEvent, onAddStructuredEvent }) => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [filesToAttach, setFilesToAttach] = useState<File[]>([]);
    const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if(quotedEvent) {
            textareaRef.current?.focus();
        }
    }, [quotedEvent]);

    const uploadFiles = async (files: File[]) => {
        if (!files || files.length === 0) return [];
        
        const uploadPromises = files.map(async file => {
            const sanitizedFileName = sanitizeFileName(file.name);
            const filePath = `${user.id}/${context.taskId}/${Date.now()}-${sanitizedFileName}`;
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
            event.target.value = ''; // Reset input
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() && filesToAttach.length === 0) return;

        setLoading(true);
        try {
            const uploadedFiles = await uploadFiles(filesToAttach);
            const eventData = {
                project_id: context.projectId,
                week_id: context.weekId,
                task_id: context.taskId,
                user_id: user.id,
                author_email: user.email,
                type: 'comment' as const,
                content: content.trim(),
                parent_event_id: quotedEvent ? quotedEvent.id : null,
                data: uploadedFiles.length > 0 ? { file_urls: uploadedFiles } : {},
            };
    
            const { data, error } = await supabase.from('events').insert(eventData).select().single();
    
            if (error) {
                throw error;
            } else if (data) {
                onNewEvent(data as Event);
                setContent('');
                setFilesToAttach([]);
                onClearQuote();
            }
        } catch(err: any) {
            alert('Ошибка добавления комментария: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveFile = (indexToRemove: number) => {
        setFilesToAttach(currentFiles => currentFiles.filter((_, index) => index !== indexToRemove));
    };

    return (
        <div className="bg-white p-3 rounded-lg border">
            <input type="file" multiple ref={fileInputRef} onChange={handleFilesSelected} className="hidden" />
            <input type="file" accept="image/*" capture="environment" ref={imageInputRef} onChange={handleFilesSelected} className="hidden" />
            <input type="file" accept="video/*" capture="environment" ref={videoInputRef} onChange={handleFilesSelected} className="hidden" />

             {quotedEvent && (
                <div className="p-2 mb-2 bg-gray-100 rounded-md text-sm relative">
                    <p className="font-semibold text-gray-700">Ответ на сообщение от {quotedEvent.author_email}:</p>
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
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100"
                            title="Прикрепить файл"
                            disabled={loading}
                        >
                            <FaPaperclip size={18} />
                        </button>
                         <button
                            type="button"
                            onClick={() => imageInputRef.current?.click()}
                            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                            title="Сделать фото"
                            disabled={loading}
                        >
                            <FaCamera size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={() => videoInputRef.current?.click()}
                            className="p-2 text-gray-500 hover:text-orange-600 rounded-full hover:bg-gray-100"
                            title="Записать видео"
                            disabled={loading}
                        >
                            <FaVideo size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsAudioModalOpen(true)}
                            className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100"
                            title="Записать аудио"
                            disabled={loading}
                        >
                            <FaMicrophone size={18} />
                        </button>
                        {onAddStructuredEvent && (
                            <button
                                type="button"
                                onClick={onAddStructuredEvent}
                                className="p-2 text-gray-500 hover:text-indigo-600 rounded-full hover:bg-gray-100"
                                title="Добавить событие (встреча, интервью)"
                                disabled={loading}
                            >
                                <FaFileAlt size={18} />
                            </button>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || (!content.trim() && filesToAttach.length === 0)}
                        className="w-32 py-2 px-4 btn-primary flex justify-center items-center"
                    >
                        {loading ? <Spinner size="sm" /> : 'Отправить'}
                    </button>
                </div>
            </form>
            <Modal isOpen={isAudioModalOpen} onClose={() => setIsAudioModalOpen(false)} title="Записать аудио">
                <AudioRecorder onSave={(blob, duration) => {
                    const audioFile = new File([blob], `audio-recording-${Date.now()}.webm`, { type: blob.type });
                    setFilesToAttach(prev => [...prev, audioFile]);
                    setIsAudioModalOpen(false);
                }} />
            </Modal>
        </div>
    );
};

export default AddEventForm;
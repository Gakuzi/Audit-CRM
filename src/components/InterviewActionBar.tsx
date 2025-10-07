import React, { useState, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { Event, PlanItem } from '../types';
import { FaCamera, FaUpload, FaMicrophone } from 'react-icons/fa';
import { supabase } from '../services/supabaseClient';
import { recognizeTextFromImage } from '../services/geminiService';
import { Spinner } from './ui/Spinner';
import AudioRecorderModal from './AudioRecorderModal';
import { FILE_SIZE_LIMIT } from '../constants';

interface InterviewActionBarProps {
    user: User;
    context: { item: PlanItem; weekId: string; projectId: string; };
    events: Event[];
    onNewEvent: (event: Event) => void;
}

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error("Failed to convert blob to base64"));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

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


const InterviewActionBar: React.FC<InterviewActionBarProps> = ({ user, context, events, onNewEvent }) => {
    const [loading, setLoading] = useState<string | null>(null);
    const [isRecorderModalOpen, setIsRecorderModalOpen] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);
    
    const createNewEvent = async (eventPayload: Partial<Event>) => {
        const fullPayload = {
            project_id: context.projectId,
            week_id: context.weekId,
            task_id: context.item.id,
            user_id: user.id,
            author_email: user.email,
            ...eventPayload
        };
        
        const { data, error } = await supabase.from('events').insert(fullPayload).select().single();
        if (error) throw error;

        onNewEvent(data as Event);
        return data as Event;
    };
    
    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > FILE_SIZE_LIMIT) {
            alert(`Файл "${file.name}" слишком большой. Максимальный размер: ${FILE_SIZE_LIMIT / 1024 / 1024} МБ.`);
            event.target.value = '';
            return;
        }

        setLoading('recognize');
        try {
            const base64Data = await blobToBase64(file);
            const recognizedText = await recognizeTextFromImage(base64Data);
            
            await createNewEvent({
                type: 'comment',
                content: `**Распознанные заметки:**\n\n${recognizedText}`,
            });

        } catch (error: any) {
            alert("Ошибка распознавания: " + error.message);
        } finally {
            setLoading(null);
            event.target.value = '';
        }
    };
    
    const handleAudioUpload = async (files: File[]) => {
        setLoading('upload');
        try {
            for (const file of files) {
                 const sanitizedFileName = sanitizeFileName(file.name);
                 const filePath = `${user.id}/${context.item.id}/${Date.now()}-${sanitizedFileName}`;
                 const { error: uploadError } = await supabase.storage.from('audit-files').upload(filePath, file);
                 if (uploadError) throw uploadError;

                 const { data: urlData } = supabase.storage.from('audit-files').getPublicUrl(filePath);
                 const fileUrl = { name: file.name, url: urlData.publicUrl, type: file.type };

                 await createNewEvent({
                     type: 'interview',
                     content: `Прикреплена аудиозапись: ${file.name}`,
                     data: { file_urls: [fileUrl] }
                 });
            }
        } catch (error: any) {
            alert("Ошибка загрузки аудио: " + error.message);
        } finally {
            setLoading(null);
            if (audioInputRef.current) audioInputRef.current.value = '';
        }
    };
    
    const handleAudioFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const validFiles: File[] = [];
        for (const file of Array.from(files) as File[]) {
            if (file.size > FILE_SIZE_LIMIT) {
                alert(`Файл "${file.name}" слишком большой. Максимальный размер: ${FILE_SIZE_LIMIT / 1024 / 1024} МБ.`);
            } else {
                validFiles.push(file);
            }
        }
        if (validFiles.length > 0) {
            handleAudioUpload(validFiles);
        }
        event.target.value = '';
    }

    return (
        <div className="p-4 border-b bg-gray-50">
             <input type="file" accept="image/*" ref={imageInputRef} onChange={handleImageUpload} className="hidden" />
             <input type="file" accept="audio/*" ref={audioInputRef} onChange={handleAudioFilesSelected} className="hidden" multiple/>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                 <button onClick={() => imageInputRef.current?.click()} disabled={!!loading} className="btn-secondary flex items-center justify-center gap-2"><FaCamera /> Распознать заметки</button>
                 <button onClick={() => audioInputRef.current?.click()} disabled={!!loading} className="btn-secondary flex items-center justify-center gap-2"><FaUpload /> Загрузить аудио</button>
                 <button onClick={() => setIsRecorderModalOpen(true)} disabled={!!loading} className="btn-secondary flex items-center justify-center gap-2"><FaMicrophone /> Начать запись</button>
            </div>

            <AudioRecorderModal
                isOpen={isRecorderModalOpen}
                onClose={() => setIsRecorderModalOpen(false)}
                onSave={(files) => handleAudioUpload(files)}
            />
        </div>
    )
}

export default InterviewActionBar;

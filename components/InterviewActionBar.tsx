import React, { useState, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { Event, PlanItem } from '../types';
import { FaCamera, FaUpload, FaMicrophone, FaBrain } from 'react-icons/fa';
import { supabase } from '../services/supabaseClient';
import { recognizeTextFromImage, processInterviewAudio } from '../services/geminiService';
import { Spinner } from './ui/Spinner';
import Modal from './ui/Modal';
import AudioRecorder from './AudioRecorder';

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
    const [loading, setLoading] = useState<string | null>(null); // To track specific loading actions
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
            event.target.value = ''; // Reset input
        }
    };
    
    const handleAudioUpload = async (file: File | Blob, fileName?: string) => {
        setLoading('upload');
        try {
             const audioFile = file instanceof File ? file : new File([file], fileName || `recording-${Date.now()}.webm`, { type: file.type });
             const sanitizedFileName = sanitizeFileName(audioFile.name);
             const filePath = `${user.id}/${context.item.id}/${Date.now()}-${sanitizedFileName}`;
             const { error: uploadError } = await supabase.storage.from('audit-files').upload(filePath, audioFile);
             if (uploadError) throw uploadError;

             const { data: urlData } = supabase.storage.from('audit-files').getPublicUrl(filePath);
             const fileUrl = { name: audioFile.name, url: urlData.publicUrl, type: audioFile.type };

             await createNewEvent({
                 type: 'interview',
                 content: `Прикреплена аудиозапись: ${audioFile.name}`,
                 data: { file_urls: [fileUrl] }
             });

        } catch (error: any) {
            alert("Ошибка загрузки аудио: " + error.message);
        } finally {
            setLoading(null);
            if (audioInputRef.current) audioInputRef.current.value = '';
        }
    };
    
    const handleAnalyzeAudio = async (audioEvent: Event) => {
        const audioFile = audioEvent.data?.file_urls?.[0];
        if (!audioFile) return;

        setLoading(`analyze-${audioEvent.id}`);
        try {
            // Using a proxy to bypass potential CORS issues with Supabase Storage if RLS is strict
            const response = await fetch(audioFile.url);
            const blob = await response.blob();
            const base64Data = await blobToBase64(blob);
            
            const resultText = await processInterviewAudio(base64Data, audioFile.type || blob.type, context.item.content);
            
            await createNewEvent({
                type: 'comment',
                content: `**Анализ аудиозаписи "${audioFile.name}":**\n\n${resultText}`,
                parent_event_id: audioEvent.id
            });

        } catch (error: any) {
             alert("Ошибка анализа аудио: " + error.message);
        } finally {
            setLoading(null);
        }
    }
    
    const audioEvents = events.filter(e => e.type === 'interview' && e.data?.file_urls?.some(f => f.type?.startsWith('audio/')));

    return (
        <div className="p-4 border-b bg-gray-50">
             <input type="file" accept="image/*" ref={imageInputRef} onChange={handleImageUpload} className="hidden" />
             <input type="file" accept="audio/*" ref={audioInputRef} onChange={(e) => e.target.files && handleAudioUpload(e.target.files[0])} className="hidden" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                 <button onClick={() => imageInputRef.current?.click()} disabled={!!loading} className="btn-secondary flex items-center justify-center gap-2"><FaCamera /> Распознать заметки</button>
                 <button onClick={() => audioInputRef.current?.click()} disabled={!!loading} className="btn-secondary flex items-center justify-center gap-2"><FaUpload /> Загрузить аудио</button>
                 <button onClick={() => setIsRecorderModalOpen(true)} disabled={!!loading} className="btn-secondary flex items-center justify-center gap-2"><FaMicrophone /> Начать запись</button>
            </div>
            
             {audioEvents.length > 0 && (
                <div className="pt-3 border-t">
                    <h4 className="text-sm font-semibold mb-2">Записи для анализа:</h4>
                    <div className="space-y-2">
                    {audioEvents.map(event => (
                         <div key={event.id} className="flex items-center justify-between p-2 bg-white rounded-md border">
                            <p className="text-sm truncate pr-2">{event.data?.file_urls?.[0].name}</p>
                            <button onClick={() => handleAnalyzeAudio(event)} disabled={!!loading} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-2 shrink-0">
                                {loading === `analyze-${event.id}` ? <Spinner size="sm" /> : <><FaBrain /> Анализ с AI</>}
                            </button>
                         </div>
                    ))}
                    </div>
                </div>
             )}

            <Modal isOpen={isRecorderModalOpen} onClose={() => setIsRecorderModalOpen(false)} title="Запись интервью">
                <AudioRecorder 
                    enableWakeLock={true}
                    onSave={(blob, duration) => {
                        setIsRecorderModalOpen(false);
                        handleAudioUpload(blob, `interview-recording-${Date.now()}.webm`);
                    }}
                />
            </Modal>
        </div>
    )
}

export default InterviewActionBar;
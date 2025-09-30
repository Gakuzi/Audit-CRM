
import React, { useState } from 'react';
import Modal from './ui/Modal';
import { User } from '@supabase/supabase-js';
import { Event } from '../types';
import { supabase } from '../services/supabaseClient';
import { Spinner } from './ui/Spinner';
import AudioRecorder from './AudioRecorder';
import { FaComment, FaVideo, FaMicrophone, FaFileAlt, FaArrowLeft } from 'react-icons/fa';

interface AddEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    context: { weekId: string; taskId: string; projectId: string };
    onNewEvent: (event: Event) => void;
}

type EventStepType = 'meeting' | 'interview' | 'documentation_review';

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

const AddEventModal: React.FC<AddEventModalProps> = ({ isOpen, onClose, user, context, onNewEvent }) => {
    const [step, setStep] = useState<'select' | 'form'>('select');
    const [eventType, setEventType] = useState<EventStepType | null>(null);
    const [loading, setLoading] = useState(false);

    // Form states
    const [content, setContent] = useState('');
    const [meetingTime, setMeetingTime] = useState('');
    const [participants, setParticipants] = useState('');
    const [files, setFiles] = useState<FileList | null>(null);
    const [audioBlob, setAudioBlob] = useState<{ blob: Blob, duration: number } | null>(null);

    const handleSelectType = (type: EventStepType) => {
        setEventType(type);
        setStep('form');
    }
    
    const handleBack = () => {
        resetForm();
        setStep('select');
        setEventType(null);
    }
    
    const handleClose = () => {
        resetForm();
        setStep('select');
        setEventType(null);
        onClose();
    }
    
    const resetForm = () => {
        setContent('');
        setMeetingTime('');
        setParticipants('');
        setFiles(null);
        setAudioBlob(null);
        setLoading(false);
    }

    const uploadFiles = async (filesToUpload: FileList | Blob | null) => {
        if (!filesToUpload) return [];
        
        const filesArray = filesToUpload instanceof Blob ? [new File([filesToUpload], `interview-recording-${Date.now()}.webm`, { type: filesToUpload.type })] : Array.from(filesToUpload);
        
        const uploadPromises = filesArray.map(async file => {
            const sanitizedFileName = sanitizeFileName(file.name);
            const filePath = `${user.id}/${context.taskId}/${Date.now()}-${sanitizedFileName}`;
            const { error: uploadError } = await supabase.storage.from('audit-files').upload(filePath, file);
            if (uploadError) throw uploadError;
            
            const { data } = supabase.storage.from('audit-files').getPublicUrl(filePath);
            return { name: file.name, url: data.publicUrl, type: file.type };
        });

        return Promise.all(uploadPromises);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventType || !user) return;
        setLoading(true);

        try {
            const eventData: any = {
                project_id: context.projectId,
                week_id: context.weekId,
                task_id: context.taskId,
                user_id: user.id,
                author_email: user.email,
                type: eventType,
                content,
                data: {}
            };

            if (eventType === 'meeting') {
                eventData.data.meeting_time = new Date(meetingTime).toISOString();
                eventData.data.participants = participants.split('\n').filter(p => p.trim() !== '');
            } else if (eventType === 'documentation_review') {
                const uploadedFiles = await uploadFiles(files);
                eventData.data.file_urls = uploadedFiles;
            } else if (eventType === 'interview') {
                if (!audioBlob) throw new Error("Нет аудиозаписи для сохранения.");
                const uploadedAudio = await uploadFiles(audioBlob.blob);
                eventData.data.file_urls = uploadedAudio;
                eventData.content = content || `Аудиозапись интервью (${audioBlob.duration} сек.)`;
            }
            
            const { data, error } = await supabase.from('events').insert(eventData).select().single();
            if (error) throw error;
            
            if (data) {
                onNewEvent(data as Event);
            }
            handleClose();
        } catch (error: any) {
            alert("Ошибка: " + error.message);
        } finally {
            setLoading(false);
        }
    };
    
    const renderForm = () => {
        switch (eventType) {
            case 'meeting':
                return (
                    <>
                        <h3 className="text-lg font-bold">Запланировать встречу</h3>
                        <div>
                            <label htmlFor="meetingContent" className="block text-sm font-medium text-gray-700">Цель встречи</label>
                            <textarea id="meetingContent" value={content} onChange={e => setContent(e.target.value)} className="w-full mt-1 input" rows={3} required />
                        </div>
                        <div>
                            <label htmlFor="meetingTime" className="block text-sm font-medium text-gray-700">Дата и время</label>
                            <input id="meetingTime" type="datetime-local" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} className="w-full mt-1 input" required />
                        </div>
                        <div>
                            <label htmlFor="participants" className="block text-sm font-medium text-gray-700">Участники (каждый с новой строки)</label>
                            <textarea id="participants" value={participants} onChange={e => setParticipants(e.target.value)} className="w-full mt-1 input" rows={3} />
                        </div>
                    </>
                );
            case 'interview':
                return (
                    <>
                        <h3 className="text-lg font-bold">Запись интервью</h3>
                        <AudioRecorder onSave={(blob, duration) => setAudioBlob({blob, duration})} />
                        <div className="mt-4">
                            <label htmlFor="audioNotes" className="block text-sm font-medium text-gray-700">Примечания (опционально)</label>
                            <textarea id="audioNotes" value={content} onChange={e => setContent(e.target.value)} className="w-full mt-1 input" rows={2} />
                        </div>
                    </>
                );
            case 'documentation_review':
                 return (
                    <>
                        <h3 className="text-lg font-bold">Анализ документации</h3>
                        <div>
                            <label htmlFor="fileConclusion" className="block text-sm font-medium text-gray-700">Заключение</label>
                            <textarea id="fileConclusion" value={content} onChange={e => setContent(e.target.value)} className="w-full mt-1 input" rows={4} required />
                        </div>
                        <div>
                            <label htmlFor="fileUpload" className="block text-sm font-medium text-gray-700">Прикрепить файлы</label>
                            <input id="fileUpload" type="file" multiple onChange={e => setFiles(e.target.files)} className="w-full mt-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" required/>
                        </div>
                    </>
                );
            default: return null;
        }
    }
    
    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Добавить событие">
            {step === 'select' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={() => handleSelectType('meeting')} className="flex flex-col items-center justify-center p-6 bg-gray-50 hover:bg-blue-100 rounded-lg text-center transition-colors">
                        <FaVideo size={24} className="mb-2 text-purple-600" />
                        <span className="font-semibold">Встреча</span>
                    </button>
                     <button onClick={() => handleSelectType('interview')} className="flex flex-col items-center justify-center p-6 bg-gray-50 hover:bg-blue-100 rounded-lg text-center transition-colors">
                        <FaMicrophone size={24} className="mb-2 text-red-600" />
                        <span className="font-semibold">Интервью</span>
                    </button>
                     <button onClick={() => handleSelectType('documentation_review')} className="flex flex-col items-center justify-center p-6 bg-gray-50 hover:bg-blue-100 rounded-lg text-center transition-colors col-span-1 md:col-span-2">
                        <FaFileAlt size={24} className="mb-2 text-blue-600" />
                        <span className="font-semibold">Анализ документов</span>
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    {renderForm()}
                    <div className="pt-2 flex justify-between items-center">
                         <button type="button" onClick={handleBack} className="flex items-center btn-secondary"><FaArrowLeft className="mr-2"/> Назад</button>
                         <button type="submit" disabled={loading || (eventType === 'interview' && !audioBlob)} className="w-32 py-2 px-4 btn-primary flex justify-center items-center">
                            {loading ? <Spinner size="sm" /> : 'Добавить'}
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    )
};

export default AddEventModal;
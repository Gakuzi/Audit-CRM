
import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import { User } from '@supabase/supabase-js';
import { Event, Project, PlanItem } from '../types';
import { supabase, sendGuestEventNotification } from '../services/supabaseClient';
import { Spinner } from './ui/Spinner';
import AudioRecorder from './AudioRecorder';
import { FaVideo, FaMicrophone, FaFileAlt, FaArrowLeft, FaHandshake } from 'react-icons/fa';

interface AddEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    context: { weekId: string; taskId: string; projectId: string };
    onNewEvent: (event: Event) => void;
    project: Project;
    task: PlanItem;
    isGuest: boolean;
}

type EventStepType = 'meeting' | 'interview' | 'documentation_review';

const eventTypeConfig: { type: EventStepType, name: string, icon: React.ReactNode, guest_allowed: boolean }[] = [
    { type: 'meeting', name: 'Встреча', icon: <FaVideo size={24} className="mb-2 text-purple-600" />, guest_allowed: true },
    { type: 'interview', name: 'Интервью', icon: <FaMicrophone size={24} className="mb-2 text-red-600" />, guest_allowed: false },
    { type: 'documentation_review', name: 'Анализ документов', icon: <FaFileAlt size={24} className="mb-2 text-blue-600" />, guest_allowed: false },
];


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

const AddEventModal: React.FC<AddEventModalProps> = ({ isOpen, onClose, user, context, onNewEvent, project, task, isGuest }) => {
    const [step, setStep] = useState<'select' | 'form'>('select');
    const [eventType, setEventType] = useState<EventStepType | null>(isGuest ? 'meeting' : null);
    const [loading, setLoading] = useState(false);

    // Form states
    const [content, setContent] = useState('');
    const [meetingTime, setMeetingTime] = useState('');
    const [participants, setParticipants] = useState('');
    const [files, setFiles] = useState<FileList | null>(null);
    const [audioBlob, setAudioBlob] = useState<{ blob: Blob, duration: number } | null>(null);
    
    useEffect(() => {
      if (isOpen && isGuest) {
        setStep('form');
        setEventType('meeting');
      } else if (!isOpen) {
        handleClose();
      }
    }, [isOpen, isGuest]);

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
        setEventType(isGuest ? 'meeting' : null);
        if (isGuest) {
          setStep('form');
        }
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
            const filePath = `${user ? user.id : 'guests'}/${context.taskId}/${Date.now()}-${sanitizedFileName}`;
            const { error: uploadError } = await supabase.storage.from('audit-files').upload(filePath, file);
            if (uploadError) throw uploadError;
            
            const { data } = supabase.storage.from('audit-files').getPublicUrl(filePath);
            return { name: file.name, url: data.publicUrl, type: file.type };
        });

        return Promise.all(uploadPromises);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventType) return;
        setLoading(true);

        try {
            let authorIdentifier = user ? user.email : localStorage.getItem('guestName');
            let isGuestSubmission = !user;

            if (isGuestSubmission && !authorIdentifier) {
                const guestName = prompt('Пожалуйста, представьтесь:', 'Гость');
                if (!guestName || guestName.trim() === '') {
                    setLoading(false);
                    return;
                }
                authorIdentifier = guestName;
                localStorage.setItem('guestName', guestName);
            }

            const eventData: Partial<Event> = {
                project_id: context.projectId,
                week_id: context.weekId,
                task_id: context.taskId,
                user_id: user ? user.id : project.user_id, // Fallback to auditor's ID for guests
                author_email: authorIdentifier,
                type: eventType,
                content,
                data: {}
            };

            if (eventType === 'meeting') {
                eventData.data!.meeting_time = new Date(meetingTime).toISOString();
                eventData.data!.participants = participants.split('\n').filter(p => p.trim() !== '');
            } else if (eventType === 'documentation_review') {
                const uploadedFiles = await uploadFiles(files);
                eventData.data!.file_urls = uploadedFiles;
            } else if (eventType === 'interview') {
                if (!audioBlob) throw new Error("Нет аудиозаписи для сохранения.");
                const uploadedAudio = await uploadFiles(audioBlob.blob);
                eventData.data!.file_urls = uploadedAudio;
                eventData.content = content || `Аудиозапись интервью (${audioBlob.duration} сек.)`;
            }
            
            const { data, error } = await supabase.from('events').insert(eventData).select().single();
            if (error) throw error;
            
            if (data) {
                const newEvent = data as Event;
                onNewEvent(newEvent);
                if (isGuestSubmission) {
                    sendGuestEventNotification(project, task, newEvent);
                }
            }
            onClose(); // Use onClose which resets state properly
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
                        <h3 className="text-lg font-bold">Запросить встречу</h3>
                        <div>
                            <label htmlFor="meetingContent" className="block text-sm font-medium text-gray-700">Цель встречи</label>
                            <textarea id="meetingContent" value={content} onChange={e => setContent(e.target.value)} className="w-full mt-1 input" rows={3} required />
                        </div>
                        <div>
                            <label htmlFor="meetingTime" className="block text-sm font-medium text-gray-700">Предпочтительные дата и время</label>
                            <input id="meetingTime" type="datetime-local" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} className="w-full mt-1 input" required />
                        </div>
                        <div>
                            <label htmlFor="participants" className="block text-sm font-medium text-gray-700">Участники (каждый с новой строки)</label>
                            <textarea id="participants" value={participants} onChange={e => setParticipants(e.target.value)} className="w-full mt-1 input" rows={3} placeholder="Например, ваше ФИО и должность"/>
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

    const availableEventTypes = eventTypeConfig
      .filter(et => !isGuest || et.guest_allowed)
      .map(et => {
        if (isGuest && et.type === 'meeting') {
          return { ...et, name: 'Личная встреча', icon: <FaHandshake size={24} className="mb-2 text-purple-600" /> };
        }
        return et;
      });

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isGuest ? "Запрос на встречу" : "Добавить событие"}>
            {step === 'select' && !isGuest ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {availableEventTypes.map(({ type, name, icon }) => (
                     <button key={type} onClick={() => handleSelectType(type)} className="flex flex-col items-center justify-center p-6 bg-gray-50 hover:bg-blue-100 rounded-lg text-center transition-colors">
                        {icon}
                        <span className="font-semibold">{name}</span>
                    </button>
                   ))}
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    {renderForm()}
                    <div className="pt-2 flex justify-between items-center">
                         {!isGuest ? (
                            <button type="button" onClick={handleBack} className="flex items-center btn-secondary"><FaArrowLeft className="mr-2"/> Назад</button>
                         ) : <div></div>}
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
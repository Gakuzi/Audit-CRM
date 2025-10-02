import React, { useState } from 'react';
import Modal from './ui/Modal';
import { User } from '@supabase/supabase-js';
import { Event, PlanItem, PlanItemType } from '../types';
import { supabase } from '../services/supabaseClient';
import { Spinner } from './ui/Spinner';
import AudioRecorder from './AudioRecorder';
import { FaComment, FaVideo, FaMicrophone, FaFileAlt, FaArrowLeft } from 'react-icons/fa';

interface AddEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    onAddSubTask: (subTask: PlanItem) => void;
    parentItem: PlanItem;
    parentEvent: Event | null;
    isGuest: boolean;
    preselectedType?: PlanItemType;
}

const AddEventModal: React.FC<AddEventModalProps> = ({ isOpen, onClose, user, onAddSubTask, parentItem, parentEvent, isGuest, preselectedType }) => {
    const [step, setStep] = useState<'select' | 'form'>(preselectedType ? 'form' : 'select');
    const [eventType, setEventType] = useState<PlanItemType | null>(preselectedType || null);
    const [loading, setLoading] = useState(false);

    // Form states
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [meetingDate, setMeetingDate] = useState('');
    const [meetingTime, setMeetingTime] = useState('');
    const [meetingLocation, setMeetingLocation] = useState('');
    const [meetingDuration, setMeetingDuration] = useState('');


    const handleSelectType = (type: PlanItemType) => {
        setEventType(type);
        setStep('form');
    }
    
    const handleBack = () => {
        if (preselectedType) {
            handleClose();
        } else {
            resetForm(false);
            setStep('select');
        }
    }
    
    const handleClose = () => {
        resetForm(true);
        setStep('select');
        onClose();
    }
    
    const resetForm = (full: boolean) => {
        setTitle('');
        setDescription('');
        setMeetingDate('');
        setMeetingTime('');
        setMeetingLocation('');
        setMeetingDuration('');
        if (full) {
           setEventType(null);
           setLoading(false);
        }
    }


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventType || !title.trim()) return;
        setLoading(true);

        const newSubTask: PlanItem = {
            id: crypto.randomUUID(),
            title: title.trim(),
            description: description.trim(),
            completed: false,
            type: eventType,
        };

        if (eventType === 'meeting') {
            newSubTask.data = {
                date: meetingDate,
                time: meetingTime,
                location: meetingLocation,
                duration: meetingDuration,
            }
        }
        
        onAddSubTask(newSubTask);
        handleClose();
    };
    
    const renderForm = () => {
        switch (eventType) {
            case 'meeting':
                return (
                    <>
                        <h3 className="text-lg font-bold">Запрос на встречу</h3>
                        <div>
                            <label className="label">Тема встречи</label>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="input" required />
                        </div>
                         <div>
                            <label className="label">Описание/повестка</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} className="input" rows={3} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label">Дата</label>
                                <input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} className="input" />
                            </div>
                             <div>
                                <label className="label">Время</label>
                                <input type="time" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} className="input" />
                            </div>
                             <div>
                                <label className="label">Место</label>
                                <input type="text" value={meetingLocation} onChange={e => setMeetingLocation(e.target.value)} className="input" />
                            </div>
                             <div>
                                <label className="label">Длительность (мин)</label>
                                <input type="number" value={meetingDuration} onChange={e => setMeetingDuration(e.target.value)} className="input" />
                            </div>
                        </div>
                    </>
                );
            case 'task':
                 return (
                    <>
                        <h3 className="text-lg font-bold">Добавить подзадачу</h3>
                        <div>
                            <label className="label">Название</label>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="input" required />
                        </div>
                         <div>
                            <label className="label">Описание</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} className="input" rows={3} />
                        </div>
                    </>
                );
            default: return null;
        }
    }
    
    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Добавить подзадачу">
            {step === 'select' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={() => handleSelectType('task')} className="flex flex-col items-center justify-center p-6 bg-gray-50 hover:bg-blue-100 rounded-lg text-center transition-colors">
                        <FaComment size={24} className="mb-2 text-gray-600" />
                        <span className="font-semibold">Обычная задача</span>
                    </button>
                    <button onClick={() => handleSelectType('meeting')} className="flex flex-col items-center justify-center p-6 bg-gray-50 hover:bg-blue-100 rounded-lg text-center transition-colors">
                        <FaVideo size={24} className="mb-2 text-purple-600" />
                        <span className="font-semibold">Запрос на встречу</span>
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    {renderForm()}
                    <div className="pt-2 flex justify-between items-center">
                         <button type="button" onClick={handleBack} className="flex items-center btn-secondary"><FaArrowLeft className="mr-2"/> Назад</button>
                         <button type="submit" disabled={loading} className="w-32 py-2 px-4 btn-primary flex justify-center items-center">
                            {loading ? <Spinner size="sm" /> : 'Добавить'}
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    )
};

export default AddEventModal;

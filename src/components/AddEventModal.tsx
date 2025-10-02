
import React, { useState } from 'react';
import Modal from './ui/Modal';
import { User } from '@supabase/supabase-js';
import { Event, PlanItem } from '../types';
import { supabase } from '../services/supabaseClient';
import { Spinner } from './ui/Spinner';
import AudioRecorderModal from './AudioRecorderModal';
import { FaComment, FaVideo, FaMicrophone, FaFileAlt, FaArrowLeft, FaTasks } from 'react-icons/fa';

interface AddEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    onAddSubTask: (subTask: PlanItem) => void;
    parentItem: PlanItem;
    parentEvent: Event | null;
    isGuest: boolean;
    preselectedType?: PlanItem['type'];
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

const AddEventModal: React.FC<AddEventModalProps> = ({ isOpen, onClose, user, onAddSubTask, parentItem, parentEvent, isGuest }) => {
    const [step, setStep] = useState<'select' | 'form'>('select');
    const [itemType, setItemType] = useState<PlanItem['type']>('task');
    const [loading, setLoading] = useState(false);
    const [isRecorderOpen, setIsRecorderOpen] = useState(false);

    // Form states
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [meetingTime, setMeetingTime] = useState('');
    const [participants, setParticipants] = useState('');
    const [files, setFiles] = useState<FileList | null>(null);

    const handleSelectType = (type: PlanItem['type']) => {
        setItemType(type);
        setStep('form');
    }
    
    const handleBack = () => { resetForm(); setStep('select'); }
    const handleClose = () => { resetForm(); setStep('select'); onClose(); }
    
    const resetForm = () => {
        setTitle('');
        setDescription('');
        setMeetingTime('');
        setParticipants('');
        setFiles(null);
        setLoading(false);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setLoading(true);

        const subTask: PlanItem = {
            id: crypto.randomUUID(),
            title: title.trim(),
            description: description.trim(),
            type: itemType,
            completed: false,
            data: {},
        };

        if (itemType === 'meeting') {
            subTask.data = {
                date: meetingTime.split('T')[0],
                time: meetingTime.split('T')[1],
                participants: participants.split('\n').filter(p => p.trim())
            }
        }
        
        onAddSubTask(subTask);
        handleClose();
    };
    
    const renderForm = () => {
        switch (itemType) {
            case 'meeting':
                return <>
                    <h3 className="text-lg font-bold">Запланировать встречу</h3>
                    <div><label className="label">Тема встречи</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} className="input" required/></div>
                    <div><label className="label">Дата и время</label><input type="datetime-local" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} className="input" required/></div>
                    <div><label className="label">Участники (каждый с новой строки)</label><textarea value={participants} onChange={e => setParticipants(e.target.value)} className="input" rows={3}/></div>
                    <div><label className="label">Описание/повестка</label><textarea value={description} onChange={e => setDescription(e.target.value)} className="input" rows={3}/></div>
                </>;
            default: // task
                return <>
                    <h3 className="text-lg font-bold">Добавить подзадачу</h3>
                    <div><label className="label">Название</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} className="input" required/></div>
                    <div><label className="label">Описание (опционально)</label><textarea value={description} onChange={e => setDescription(e.target.value)} className="input" rows={3}/></div>
                </>;
        }
    }
    
    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={step === 'select' ? "Добавить подзадачу" : ""}>
            {step === 'select' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={() => handleSelectType('task')} className="modal-select-btn"><FaTasks size={24} className="mb-2 text-gray-600"/><span>Задача</span></button>
                    <button onClick={() => handleSelectType('meeting')} className="modal-select-btn"><FaVideo size={24} className="mb-2 text-purple-600"/><span>Встреча</span></button>
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
            {isRecorderOpen && <AudioRecorderModal isOpen={isRecorderOpen} onClose={() => setIsRecorderOpen(false)} onSave={() => {}} />}
        </Modal>
    )
};

export default AddEventModal;

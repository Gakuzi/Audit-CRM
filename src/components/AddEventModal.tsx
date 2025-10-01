import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import { User } from '@supabase/supabase-js';
import { Event, PlanItem, PlanItemType } from '../types';
import { Spinner } from './ui/Spinner';
import { FaTasks, FaCalendarCheck, FaUsers, FaFileContract, FaBinoculars, FaArrowLeft, FaSitemap, FaHandshake } from 'react-icons/fa';

interface AddSubTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    onAddSubTask: (subTask: PlanItem) => void;
    parentItem: PlanItem;
    parentEvent: Event | null;
    isGuest: boolean;
    preselectedType?: PlanItemType;
}

const eventTypes: { type: PlanItemType, name: string, icon: React.ReactNode, guest_allowed: boolean }[] = [
    { type: 'task', name: 'Задача', icon: <FaTasks size={24} className="mb-2 text-gray-600" />, guest_allowed: false },
    { type: 'meeting', name: 'Встреча', icon: <FaCalendarCheck size={24} className="mb-2 text-purple-600" />, guest_allowed: true },
    { type: 'interview', name: 'Интервью', icon: <FaUsers size={24} className="mb-2 text-green-600" />, guest_allowed: false },
    { type: 'doc_review', name: 'Анализ документов', icon: <FaFileContract size={24} className="mb-2 text-blue-600" />, guest_allowed: false },
    { type: 'process_analysis', name: 'Анализ процесса', icon: <FaSitemap size={24} className="mb-2 text-teal-600" />, guest_allowed: false },
    { type: 'observation', name: 'Наблюдение', icon: <FaBinoculars size={24} className="mb-2 text-orange-600" />, guest_allowed: false },
];

const AddEventModal: React.FC<AddSubTaskModalProps> = ({ isOpen, onClose, user, onAddSubTask, parentItem, parentEvent, isGuest, preselectedType }) => {
    const [step, setStep] = useState<'select' | 'form'>('select');
    const [itemType, setItemType] = useState<PlanItemType | null>(null);
    const [loading, setLoading] = useState(false);

    // Form states
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [location, setLocation] = useState('');
    const [duration, setDuration] = useState('');

    const resetFormState = () => {
        setStep('select');
        setItemType(null);
        setTitle('');
        setDescription('');
        setDate('');
        setTime('');
        setLocation('');
        setDuration('');
        setLoading(false);
    }

    useEffect(() => {
        if (isOpen) {
            if (isGuest || preselectedType) {
                setItemType(preselectedType || 'meeting');
                setStep('form');
            } else {
                setStep('select');
            }
            if (parentEvent) {
                setDescription(`На основе комментария от ${parentEvent.author_email}:\n> ${parentEvent.content}`);
            }
        } else {
            resetFormState();
        }
    }, [isOpen, isGuest, preselectedType, parentEvent]);

    const handleSelectType = (type: PlanItemType) => {
        setItemType(type);
        setStep('form');
    }
    
    const handleBack = () => {
        resetFormState();
        setStep('select');
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !itemType) return;
        setLoading(true);

        let authorIdentifier = user ? user.email : localStorage.getItem('guestName');
        if (isGuest && !authorIdentifier) {
            const guestName = prompt('Пожалуйста, представьтесь:', 'Гость');
            if (!guestName || guestName.trim() === '') {
                setLoading(false);
                return;
            }
            authorIdentifier = guestName;
            localStorage.setItem('guestName', guestName);
        }
        
        const newSubTask: PlanItem = {
            id: crypto.randomUUID(),
            title: title.trim(),
            description: description.trim(),
            completed: false,
            type: itemType,
            parent_id: parentItem.id,
        };

        if (isGuest && itemType === 'meeting') {
            newSubTask.data = {
                date,
                time,
                location,
                duration,
                agenda: title,
            };
            newSubTask.title = `Запрос на встречу: ${title}`;
            newSubTask.description = description;
        }
        
        onAddSubTask(newSubTask);
        setLoading(false);
        onClose();
    };

    const renderForm = () => {
        if (!itemType) return null;
        let currentType = eventTypes.find(et => et.type === itemType);
        if (isGuest && itemType === 'meeting') {
            currentType = { type: 'meeting', name: 'Запрос на встречу', icon: <FaHandshake size={24} className="mb-2 text-purple-600" />, guest_allowed: true };
        }
        if (!currentType) return null;

        return (
            <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-3">
                    {currentType.icon} <span>{currentType.name}</span>
                </h3>

                {isGuest ? (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Повестка / тема встречи</label>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full mt-1 input" required autoFocus />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Дата</label>
                                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full mt-1 input" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Время</label>
                                <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full mt-1 input" required />
                            </div>
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Место</label>
                                <input type="text" placeholder="Напр., онлайн" value={location} onChange={e => setLocation(e.target.value)} className="w-full mt-1 input" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Длительность</label>
                                <input type="text" placeholder="Напр., 1 час" value={duration} onChange={e => setDuration(e.target.value)} className="w-full mt-1 input" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Доп. информация / вопросы</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full mt-1 input" rows={3} />
                        </div>
                    </>
                ) : (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Название</label>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full mt-1 input" required autoFocus />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Подробное описание (опционально)</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full mt-1 input" rows={4} />
                        </div>
                    </>
                )}
                
                <div className="pt-2 flex justify-between items-center">
                    {!isGuest && !preselectedType && !parentEvent ? (
                        <button type="button" onClick={handleBack} className="flex items-center btn-secondary"><FaArrowLeft className="mr-2"/> Назад</button>
                    ) : <div />}
                    <button type="submit" disabled={loading} className="w-32 py-2 px-4 btn-primary flex justify-center items-center">
                        {loading ? <Spinner size="sm" /> : 'Добавить'}
                    </button>
                </div>
            </form>
        );
    }
    
    const availableEventTypes = eventTypes.filter(et => !isGuest || et.guest_allowed);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isGuest ? "Запрос на встречу" : "Добавить подзадачу"}>
            {step === 'select' && !isGuest ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {availableEventTypes.map(({ type, name, icon }) => (
                        <button key={type} onClick={() => handleSelectType(type)} className="flex flex-col items-center justify-center p-6 bg-gray-50 hover:bg-blue-100 rounded-lg text-center transition-colors">
                            {icon} <span className="font-semibold">{name}</span>
                        </button>
                    ))}
                </div>
            ) : renderForm()}
        </Modal>
    )
};

export default AddEventModal;
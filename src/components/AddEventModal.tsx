import React, { useState } from 'react';
import Modal from './ui/Modal';
import { PlanItem, PlanItemType } from '../types';
import { Spinner } from './ui/Spinner';
import { FaTasks, FaCalendarCheck, FaUsers, FaFileContract, FaBinoculars, FaArrowLeft, FaSitemap } from 'react-icons/fa';

interface AddEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddSubTask: (subTask: PlanItem) => void;
}

const eventTypes: { type: PlanItemType, name: string, icon: React.ReactNode }[] = [
    { type: 'task', name: 'Задача', icon: <FaTasks size={24} className="mb-2 text-gray-600" /> },
    { type: 'meeting', name: 'Встреча', icon: <FaCalendarCheck size={24} className="mb-2 text-purple-600" /> },
    { type: 'interview', name: 'Интервью', icon: <FaUsers size={24} className="mb-2 text-green-600" /> },
    { type: 'doc_review', name: 'Анализ документов', icon: <FaFileContract size={24} className="mb-2 text-blue-600" /> },
    { type: 'observation', name: 'Наблюдение', icon: <FaBinoculars size={24} className="mb-2 text-orange-600" /> },
    { type: 'process_analysis', name: 'Анализ процесса', icon: <FaSitemap size={24} className="mb-2 text-teal-600" /> },
];

const AddEventModal: React.FC<AddEventModalProps> = ({ isOpen, onClose, onAddSubTask }) => {
    const [step, setStep] = useState<'select' | 'form'>('select');
    const [itemType, setItemType] = useState<PlanItemType | null>(null);
    const [loading, setLoading] = useState(false);

    // Form states
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    const handleSelectType = (type: PlanItemType) => {
        setItemType(type);
        setStep('form');
    }
    
    const handleBack = () => {
        resetForm();
        setStep('select');
    }
    
    const handleClose = () => {
        resetForm();
        setStep('select');
        onClose();
    }
    
    const resetForm = () => {
        setTitle('');
        setDescription('');
        setItemType(null);
        setLoading(false);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemType || !title.trim()) return;
        setLoading(true);

        const newSubTask: PlanItem = {
            id: crypto.randomUUID(),
            title: title.trim(),
            description: description.trim(),
            completed: false,
            // Fix: Corrected the variable name from 'eventType' to 'itemType'.
            type: itemType,
        };
        
        onAddSubTask(newSubTask);
        setLoading(false);
        handleClose();
    };
    
    const renderForm = () => {
        if (!itemType) return null;
        const currentType = eventTypes.find(et => et.type === itemType);

        return (
            <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-3">{currentType?.icon}<span>Добавить: {currentType?.name}</span></h3>
                <div>
                    <label className="label">Название / Цель</label>
                    <textarea className="input" rows={2} value={title} onChange={e => setTitle(e.target.value)} required autoFocus/>
                </div>
                <div>
                    <label className="label">Описание (опционально)</label>
                    <textarea className="input" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                <div className="pt-2 flex justify-between items-center">
                    <button type="button" onClick={handleBack} className="flex items-center btn-secondary"><FaArrowLeft className="mr-2"/> Назад</button>
                    <button type="submit" disabled={loading} className="w-32 py-2 px-4 btn-primary flex justify-center items-center">
                        {loading ? <Spinner size="sm" /> : 'Добавить'}
                    </button>
                </div>
            </form>
        )
    }
    
    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Добавить подзадачу">
            {step === 'select' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {eventTypes.map(({ type, name, icon }) => (
                        <button key={type} onClick={() => handleSelectType(type)} className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-blue-100 rounded-lg text-center transition-colors">
                            {icon}
                            <span className="font-semibold text-sm">{name}</span>
                        </button>
                    ))}
                </div>
            ) : (
                renderForm()
            )}
        </Modal>
    )
};

export default AddEventModal;
import React, { useState } from 'react';
import Modal from './ui/Modal';
import { PlanItem, PlanItemType, ContactPerson, Project } from '../types';
import { Spinner } from './ui/Spinner';
import { FaTasks, FaCalendarCheck, FaUsers, FaFileContract, FaBinoculars, FaArrowLeft, FaSitemap, FaTimes } from 'react-icons/fa';
import AddContactModal from './AddContactModal';

interface AddEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddSubTask: (subTask: PlanItem) => void;
    contacts: ContactPerson[];
    project: Project;
    onContactsUpdate: () => void;
}

const eventTypes: { type: PlanItemType, name: string, icon: React.ReactNode }[] = [
    { type: 'task', name: 'Задача', icon: <FaTasks size={24} className="mb-2 text-gray-600" /> },
    { type: 'meeting', name: 'Встреча', icon: <FaCalendarCheck size={24} className="mb-2 text-purple-600" /> },
    { type: 'interview', name: 'Интервью', icon: <FaUsers size={24} className="mb-2 text-green-600" /> },
    { type: 'doc_review', name: 'Анализ документов', icon: <FaFileContract size={24} className="mb-2 text-blue-600" /> },
    { type: 'observation', name: 'Наблюдение', icon: <FaBinoculars size={24} className="mb-2 text-orange-600" /> },
    { type: 'process_analysis', name: 'Анализ процесса', icon: <FaSitemap size={24} className="mb-2 text-teal-600" /> },
];

const AddEventModal: React.FC<AddEventModalProps> = ({ isOpen, onClose, onAddSubTask, contacts, project, onContactsUpdate }) => {
    const [step, setStep] = useState<'select' | 'form'>('select');
    const [itemType, setItemType] = useState<PlanItemType | null>(null);
    const [loading, setLoading] = useState(false);
    const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);

    // Form states
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [contactIds, setContactIds] = useState<string[]>([]);

    const handleSelectType = (type: PlanItemType) => {
        setItemType(type);
        setStep('form');
    }
    
    const handleBack = () => { resetForm(); setStep('select'); }
    const handleClose = () => { resetForm(); setStep('select'); onClose(); }
    
    const resetForm = () => {
        setTitle(''); setDescription(''); setItemType(null); setLoading(false); setContactIds([]);
    }
    
    const handleContactToggle = (contactId: string) => {
      if (contactId === '__add_new__') {
        setIsAddContactModalOpen(true);
        return;
      }
      setContactIds(prev => prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemType || !title.trim()) return;
        setLoading(true);

        const newSubTask: PlanItem = {
            id: crypto.randomUUID(),
            title: title.trim(),
            description: description.trim(),
            completed: false,
            type: itemType,
            data: { contact_ids: contactIds }
        };
        
        onAddSubTask(newSubTask);
        setLoading(false);
        handleClose();
    };
    
    const renderForm = () => {
        if (!itemType) return null;
        const currentType = eventTypes.find(et => et.type === itemType);
        const selectedContacts = contacts.filter(c => contactIds.includes(c.id));

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
                 <div>
                    <label className="label">Участники (опционально)</label>
                    <select onChange={e => handleContactToggle(e.target.value)} className="input" value="">
                        <option value="" disabled>-- Выберите или добавьте --</option>
                        {contacts.filter(c => !contactIds.includes(c.id)).map(c => <option key={c.id} value={c.id}>{c.name} ({c.role})</option>)}
                        <option value="__add_new__" className="font-bold text-blue-600">+ Добавить новый контакт</option>
                    </select>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {selectedContacts.map(c => <div key={c.id} className="flex items-center gap-2 bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">{c.name}<button type="button" onClick={() => handleContactToggle(c.id)}><FaTimes size={10}/></button></div>)}
                    </div>
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
      <>
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
        <AddContactModal
            isOpen={isAddContactModalOpen}
            onClose={() => setIsAddContactModalOpen(false)}
            project={project}
            onContactAdded={(newContact) => {
                onContactsUpdate();
                handleContactToggle(newContact.id);
                setIsAddContactModalOpen(false);
            }}
        />
      </>
    )
};

export default AddEventModal;
// src/components/AddPlanItemModal.tsx
import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import { Week, PlanItem, PlanItemType, Profile, ContactPerson, Project, Plan } from '../types';
import { FaTasks, FaCalendarCheck, FaUsers, FaFileContract, FaBinoculars, FaClock, FaMapMarkerAlt, FaUsers as FaUsersIcon, FaAlignLeft, FaSitemap, FaTimes } from 'react-icons/fa';
import { Spinner } from './ui/Spinner';
import * as googleApiService from '../services/googleApiService';
import AddContactModal from './AddContactModal';

interface AddPlanItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdatePlan: (plan: Plan) => void;
  week: Week;
  date: string;
  contacts: ContactPerson[];
  project: Project | null;
  onContactsUpdate: () => void;
  profile: Profile | null;
  providerToken: string | null;
}

const eventTypes: { type: PlanItemType, name: string, icon: React.ReactNode }[] = [
    { type: 'task', name: 'Задача', icon: <FaTasks size={24} className="mb-2 text-gray-600" /> },
    { type: 'meeting', name: 'Встреча', icon: <FaCalendarCheck size={24} className="mb-2 text-purple-600" /> },
    { type: 'interview', name: 'Интервью', icon: <FaUsers size={24} className="mb-2 text-green-600" /> },
    { type: 'doc_review', name: 'Анализ документов', icon: <FaFileContract size={24} className="mb-2 text-blue-600" /> },
    { type: 'observation', name: 'Наблюдение', icon: <FaBinoculars size={24} className="mb-2 text-orange-600" /> },
    { type: 'process_analysis', name: 'Анализ процесса', icon: <FaSitemap size={24} className="mb-2 text-teal-600" /> },
];

const AddPlanItemModal: React.FC<AddPlanItemModalProps> = ({ isOpen, onClose, onUpdatePlan, week, date: initialDate, contacts, project, onContactsUpdate, profile, providerToken }) => {
  const [step, setStep] = useState<'select' | 'form'>('select');
  const [itemType, setItemType] = useState<PlanItemType | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [contactIds, setContactIds] = useState<string[]>([]);
  const [addToCalendar, setAddToCalendar] = useState(true);

   useEffect(() => {
    if (time) {
      const startTime = new Date(`${date}T${time}`);
      startTime.setHours(startTime.getHours() + 1);
      const newEndTime = startTime.toTimeString().substring(0, 5);
      setEndTime(newEndTime);
    }
  }, [time, date]);

  useEffect(() => {
    if(initialDate) setDate(initialDate);
  }, [initialDate, isOpen]);

  const handleSelectType = (type: PlanItemType) => {
    setItemType(type);
    setStep('form');
  };

  const handleBack = () => { resetForm(); setStep('select'); };
  const handleClose = () => { resetForm(); setStep('select'); onClose(); };
  
  const resetForm = () => {
      setItemType(null); setTitle(''); setDescription(''); setTime(''); setEndTime('');
      setLocation(''); setContactIds([]); setLoading(false);
      setDate(initialDate || new Date().toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !itemType) return;
    setLoading(true);

    const useDate = ['meeting', 'interview'].includes(itemType);
    const itemDate = useDate ? date : initialDate;

    const newItem: PlanItem = {
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      completed: false,
      type: itemType,
      data: { 
        contact_ids: contactIds,
        ...(useDate && { date: itemDate })
      }
    };

    if (itemType === 'meeting') {
      const linkedContacts = contacts.filter(c => contactIds.includes(c.id));
      const attendees = linkedContacts
        .map(c => c.emails?.[0])
        .filter((email): email is string => !!email && email.trim() !== '')
        .map(email => ({ email }));

      newItem.data = { ...newItem.data, time, endTime, location, participants: attendees.map(a => a.email) };

      if (addToCalendar && providerToken && profile?.google_calendar_id && time && endTime) {
        try {
            const eventDetails = {
                summary: newItem.title, description: newItem.description || '', location,
                start: { dateTime: new Date(`${itemDate}T${time}`).toISOString(), timeZone: 'Europe/Moscow' },
                end: { dateTime: new Date(`${itemDate}T${endTime}`).toISOString(), timeZone: 'Europe/Moscow' },
                attendees,
            };
            const calEvent = await googleApiService.createCalendarEvent(providerToken, profile.google_calendar_id, eventDetails);
            newItem.data!.google_calendar_event_id = calEvent.id;
        } catch (error: any) {
            console.error("Failed to create calendar event:", error);
            alert(`Задача создана, но не удалось добавить событие в Google Календарь. Ошибка: ${error.message}`);
        }
      }
    } else if (itemType === 'interview') {
      newItem.data = { ...newItem.data, time: time };
    }
    
    const newPlan = { ...week.plan };
    if (!newPlan[itemDate]) {
        newPlan[itemDate] = { tasks: [] };
    }
    newPlan[itemDate].tasks.push(newItem);
  
    onUpdatePlan(newPlan);
    setLoading(false);
    handleClose();
  };
  
  const handleContactToggle = (contactId: string) => {
    if (contactId === '__add_new__') {
      setIsAddContactModalOpen(true);
      return;
    }
    setContactIds(prev => prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]);
  };

  const renderForm = () => {
    if (!itemType) return null;
    const currentType = eventTypes.find(et => et.type === itemType);
    const selectedContacts = contacts.filter(c => contactIds.includes(c.id));
    const isMeetingOrInterview = itemType === 'meeting' || itemType === 'interview';

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-3">{currentType?.icon}<span>Добавить: {currentType?.name}</span></h3>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Добавьте название" className="gcal-title-input" required autoFocus/>
            
            {isMeetingOrInterview && (
                <div className="flex items-center gap-4 text-slate-600">
                    <FaClock size={20} className="flex-shrink-0" />
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" />
                    <input type="time" value={time} onChange={e => setTime(e.target.value)} className="input w-32" required={itemType === 'meeting'} />
                    {itemType === 'meeting' && <><span>-</span><input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="input w-32" required /></>}
                </div>
            )}
            
            {itemType === 'meeting' && <div className="flex items-center gap-4 text-slate-600"><FaMapMarkerAlt size={20} className="flex-shrink-0" /><input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="input w-full" placeholder="Место или ссылка на конференцию"/></div>}
            
            <div className="flex items-start gap-4 text-slate-600">
                <FaUsersIcon size={20} className="flex-shrink-0 mt-2" />
                <div className="w-full">
                    <select onChange={e => handleContactToggle(e.target.value)} className="input" value="">
                        <option value="" disabled>-- Выберите или добавьте --</option>
                        {contacts.filter(c => !contactIds.includes(c.id)).map(c => <option key={c.id} value={c.id}>{c.name} ({c.role})</option>)}
                        <option value="__add_new__" className="font-bold text-blue-600">+ Добавить новый контакт</option>
                    </select>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {selectedContacts.map(c => <div key={c.id} className="flex items-center gap-2 bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">{c.name}<button type="button" onClick={() => handleContactToggle(c.id)}><FaTimes size={10}/></button></div>)}
                    </div>
                </div>
            </div>

            <div className="flex items-start gap-4 text-slate-600">
                <FaAlignLeft size={20} className="flex-shrink-0 mt-2" />
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="input w-full" rows={isMeetingOrInterview ? 4 : 8} placeholder="Добавьте описание или повестку" />
            </div>

             {itemType === 'meeting' && providerToken && profile?.google_calendar_id && (
                <div className="flex items-center">
                    <input id="addToGCal" type="checkbox" checked={addToCalendar} onChange={e => setAddToCalendar(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <label htmlFor="addToGCal" className="ml-2 block text-sm text-gray-900">Добавить в Google Календарь</label>
                </div>
             )}

            <div className="pt-4 flex justify-between">
                <button type="button" onClick={handleBack} className="btn-secondary">Назад</button>
                <button type="submit" disabled={loading} className="btn-primary w-32 flex justify-center">{loading ? <Spinner size="sm" /> : 'Сохранить'}</button>
            </div>
        </form>
    );
  }

  return (
    <>
    <Modal isOpen={isOpen} onClose={handleClose} title="Добавить задачу" size="lg">
      {step === 'select' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {eventTypes.map(({ type, name, icon }) => (
                <button key={type} onClick={() => handleSelectType(type)} className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-blue-100 rounded-lg text-center transition-colors">
                    {icon}<span className="font-semibold text-sm">{name}</span>
                </button>
            ))}
        </div>
      ) : renderForm()}
    </Modal>
    {project && (
      <AddContactModal 
        isOpen={isAddContactModalOpen}
        onClose={() => setIsAddContactModalOpen(false)}
        project={project}
        onContactAdded={(newContact) => {
          onContactsUpdate();
          setContactIds(prev => [...prev, newContact.id]);
          setIsAddContactModalOpen(false);
        }}
      />
    )}
    </>
  );
};

export default AddPlanItemModal;

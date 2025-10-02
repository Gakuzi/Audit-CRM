// src/components/AddPlanItemModal.tsx
import React, { useState } from 'react';
import Modal from './ui/Modal';
import { Week, PlanItem, Plan, PlanItemType, Project } from '../types';
import { FaTasks, FaCalendarCheck, FaUsers, FaFileContract, FaBinoculars, FaArrowLeft, FaGoogle } from 'react-icons/fa';
import { Spinner } from './ui/Spinner';
import * as googleApiService from '../services/googleApiService';

interface AddPlanItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdatePlan: (plan: any) => void;
  week: Week;
  date: string;
  project: Project;
  providerToken: string | null;
}

const eventTypes = [ { type: 'task' as PlanItemType, name: 'Задача', icon: <FaTasks/> }, { type: 'meeting' as PlanItemType, name: 'Встреча', icon: <FaCalendarCheck/> } ];

const AddPlanItemModal: React.FC<AddPlanItemModalProps> = ({ isOpen, onClose, onUpdatePlan, week, date, project, providerToken }) => {
  const [step, setStep] = useState<'select' | 'form'>('select');
  const [itemType, setItemType] = useState<PlanItemType | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMeetLoading, setIsMeetLoading] = useState(false);

  // Form states
  const [content, setContent] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [meetingAgenda, setMeetingAgenda] = useState('');
  const [meetingParticipants, setMeetingParticipants] = useState('');

  const resetForm = () => {
    setStep('select'); setItemType(null); setLoading(false); setIsMeetLoading(false);
    setContent(''); setMeetingTime(''); setMeetingLocation(''); setMeetingAgenda(''); setMeetingParticipants('');
  };
  
  const handleClose = () => { resetForm(); onClose(); };

  const handleBack = () => {
      resetForm();
      setStep('select');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !itemType) return;
    const newItem: PlanItem = {
      id: crypto.randomUUID(), title: content.trim(), completed: false, type: itemType, event_count: 0,
      data: itemType === 'meeting' ? { time: meetingTime, location: meetingLocation, agenda: meetingAgenda, participants: meetingParticipants.split('\n').filter(p => p.trim()) } : {}
    };
    const newPlan = { ...week.plan };
    if (!newPlan[date]) newPlan[date] = { tasks: [] };
    newPlan[date].tasks.push(newItem);
    onUpdatePlan(newPlan);
    handleClose();
  };

  const handleCreateMeetLink = async () => {
    if (!providerToken) return;
    setIsMeetLoading(true);
    try {
        const description = `Встреча по проекту: ${project.name}\nЗадача: ${content}\nПовестка: ${meetingAgenda}`;
        const { hangoutLink } = await googleApiService.createCalendarEvent(providerToken, `Аудит: ${content}`, description);
        setMeetingLocation(hangoutLink);
    } catch (error: any) {
        alert("Ошибка создания ссылки Google Meet: " + error.message);
    } finally {
        setIsMeetLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Добавить событие в план">
      {step === 'select' ? (
        <div className="grid grid-cols-2 gap-4">
          {eventTypes.map(({ type, name, icon }) => <button key={type} onClick={() => { setItemType(type); setStep('form'); }} className="flex flex-col items-center justify-center p-6 bg-gray-50 hover:bg-blue-100 rounded-lg text-center transition-colors">{React.cloneElement(icon, { size: 24, className: "mb-2" })}<span className="font-semibold text-sm">{name}</span></button>)}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-3">{eventTypes.find(et => et.type === itemType)?.icon}<span>{eventTypes.find(et => et.type === itemType)?.name}</span></h3>
            <div>
                <label className="block text-sm font-medium text-gray-700">{itemType === 'meeting' ? 'Тема встречи' : 'Название'}</label>
                <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full mt-1 input" rows={2} required autoFocus />
            </div>
            {itemType === 'meeting' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700">Время</label><input type="time" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} className="w-full mt-1 input" /></div>
                    <div><label className="block text-sm font-medium text-gray-700">Место</label><input type="text" value={meetingLocation} onChange={e => setMeetingLocation(e.target.value)} className="w-full mt-1 input" placeholder="Например, онлайн" /></div>
                </div>
                {providerToken && (
                    <div className="text-right -mt-2"><button type="button" onClick={handleCreateMeetLink} disabled={isMeetLoading} className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1.5">{isMeetLoading ? <Spinner size="sm"/> : <FaGoogle />}<span>Создать ссылку Google Meet</span></button></div>
                )}
                <div><label className="block text-sm font-medium text-gray-700">Повестка</label><input type="text" value={meetingAgenda} onChange={e => setMeetingAgenda(e.target.value)} className="w-full mt-1 input"/></div>
                <div><label className="block text-sm font-medium text-gray-700">Участники (с новой строки)</label><textarea value={meetingParticipants} onChange={e => setMeetingParticipants(e.target.value)} className="w-full mt-1 input" rows={3} /></div>
              </>
            )}
            <div className="pt-2 flex justify-between items-center">
                <button type="button" onClick={handleBack} className="flex items-center btn-secondary"><FaArrowLeft className="mr-2"/> Назад</button>
                <button type="submit" disabled={loading} className="w-32 py-2 px-4 btn-primary flex justify-center items-center">{loading ? <Spinner size="sm" /> : 'Добавить'}</button>
           </div>
        </form>
      )}
    </Modal>
  );
};

export default AddPlanItemModal;
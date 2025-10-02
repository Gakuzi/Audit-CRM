// src/components/EditPlanItemModal.tsx
import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import { PlanItem, Project } from '../types';
import { FaTasks, FaCalendarCheck, FaGoogle } from 'react-icons/fa';
import { Spinner } from './ui/Spinner';
import * as googleApiService from '../services/googleApiService';

interface EditPlanItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateItem: (item: PlanItem) => void;
  item: PlanItem;
  project: Project;
  providerToken: string | null;
}

const eventTypes = {
    task: { name: 'Задача', icon: <FaTasks/> },
    meeting: { name: 'Встреча', icon: <FaCalendarCheck/> },
};

const EditPlanItemModal: React.FC<EditPlanItemModalProps> = ({ isOpen, onClose, onUpdateItem, item, project, providerToken }) => {
  const [loading, setLoading] = useState(false);
  const [isMeetLoading, setIsMeetLoading] = useState(false);
  
  const [title, setTitle] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [meetingAgenda, setMeetingAgenda] = useState('');
  const [meetingParticipants, setMeetingParticipants] = useState('');

  useEffect(() => {
    if (item) {
        setTitle(item.title);
        if (item.type === 'meeting' && item.data) {
            setMeetingTime(item.data.time || '');
            setMeetingLocation(item.data.location || '');
            setMeetingAgenda(item.data.agenda || '');
            setMeetingParticipants(item.data.participants?.join('\n') || '');
        }
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const updatedItem: PlanItem = { ...item, title: title.trim() };
    if (item.type === 'meeting') {
      updatedItem.data = { ...item.data, time: meetingTime, location: meetingLocation, agenda: meetingAgenda, participants: meetingParticipants.split('\n').filter(p => p.trim()) };
    }
    onUpdateItem(updatedItem);
  };
  
  const handleCreateMeetLink = async () => {
    if (!providerToken) return;
    setIsMeetLoading(true);
    try {
        const description = `Встреча по проекту: ${project.name}\nЗадача: ${title}\nПовестка: ${meetingAgenda}`;
        const { hangoutLink } = await googleApiService.createCalendarEvent(providerToken, `Аудит: ${title}`, description);
        setMeetingLocation(hangoutLink);
    } catch (error: any) {
        alert("Ошибка создания ссылки Google Meet: " + error.message);
    } finally {
        setIsMeetLoading(false);
    }
  };

  if (!item) return null;
  const currentType = eventTypes[item.type as keyof typeof eventTypes] || eventTypes.task;

  return (
     <Modal isOpen={isOpen} onClose={onClose} title={`Редактировать: ${currentType.name}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-3">{React.cloneElement(currentType.icon, { size: 24 })}<span>{currentType.name}</span></h3>
            <div>
                <label className="block text-sm font-medium text-gray-700">{item.type === 'meeting' ? 'Тема встречи' : 'Название'}</label>
                <textarea value={title} onChange={(e) => setTitle(e.target.value)} className="w-full mt-1 input" rows={2} required autoFocus />
            </div>
            {item.type === 'meeting' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700">Время</label><input type="time" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} className="w-full mt-1 input" /></div>
                    <div><label className="block text-sm font-medium text-gray-700">Место</label><input type="text" value={meetingLocation} onChange={e => setMeetingLocation(e.target.value)} className="w-full mt-1 input" /></div>
                </div>
                {providerToken && (
                    <div className="text-right -mt-2"><button type="button" onClick={handleCreateMeetLink} disabled={isMeetLoading} className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1.5">{isMeetLoading ? <Spinner size="sm"/> : <FaGoogle />}<span>Создать ссылку Google Meet</span></button></div>
                )}
                <div><label className="block text-sm font-medium text-gray-700">Повестка</label><input type="text" value={meetingAgenda} onChange={e => setMeetingAgenda(e.target.value)} className="w-full mt-1 input"/></div>
                <div><label className="block text-sm font-medium text-gray-700">Участники (с новой строки)</label><textarea value={meetingParticipants} onChange={e => setMeetingParticipants(e.target.value)} className="w-full mt-1 input" rows={3} /></div>
              </>
            )}
            <div className="pt-2 flex justify-end items-center space-x-2">
                <button type="button" onClick={onClose} className="btn-secondary">Отмена</button>
                <button type="submit" disabled={loading} className="w-32 py-2 px-4 btn-primary flex justify-center items-center">{loading ? <Spinner size="sm" /> : 'Сохранить'}</button>
           </div>
        </form>
    </Modal>
  );
};

export default EditPlanItemModal;
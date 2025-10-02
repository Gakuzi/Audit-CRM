import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import { PlanItem, PlanItemType, Profile } from '../types';
import { FaTasks, FaCalendarCheck, FaUsers, FaFileContract, FaBinoculars, FaSitemap, FaClock, FaMapMarkerAlt, FaUsers as FaUsersIcon, FaAlignLeft } from 'react-icons/fa';
import { Spinner } from './ui/Spinner';
import * as googleApiService from '../services/googleApiService';

interface EditPlanItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateItem: (item: PlanItem) => void;
  item: PlanItem;
  date: string;
  profile: Profile | null;
  providerToken: string | null;
}

const eventTypes: { [key in PlanItemType]: { name: string, icon: React.ReactNode } } = {
    task: { name: 'Задача', icon: <FaTasks size={24} className="text-gray-600" /> },
    meeting: { name: 'Встреча', icon: <FaCalendarCheck size={24} className="text-purple-600" /> },
    interview: { name: 'Интервью', icon: <FaUsers size={24} className="text-green-600" /> },
    doc_review: { name: 'Анализ документов', icon: <FaFileContract size={24} className="text-blue-600" /> },
    observation: { name: 'Наблюдение', icon: <FaBinoculars size={24} className="text-orange-600" /> },
    process_analysis: { name: 'Анализ процесса', icon: <FaSitemap size={24} className="text-teal-600" /> }
};

const EditPlanItemModal: React.FC<EditPlanItemModalProps> = ({ isOpen, onClose, onUpdateItem, item, date, profile, providerToken }) => {
  const [loading, setLoading] = useState(false);
  const [editedItem, setEditedItem] = useState<PlanItem>(item);

  useEffect(() => {
    if (isOpen) {
      setEditedItem(item);
    }
  }, [isOpen, item]);

  const handleChange = (field: keyof PlanItem, value: any) => {
    setEditedItem(prev => ({ ...prev, [field]: value }));
  };

  const handleDataChange = (field: keyof NonNullable<PlanItem['data']>, value: any) => {
    setEditedItem(prev => ({
      ...prev,
      data: { ...(prev.data || {}), [field]: value }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedItem.title.trim()) return;
    
    let finalItem = { ...editedItem };

    if (finalItem.type === 'meeting' && providerToken && profile?.google_calendar_id && finalItem.data?.time && finalItem.data?.endTime) {
      setLoading(true);
      try {
          const participantsList = finalItem.data.participants || [];
          const eventDetails = {
              summary: finalItem.title,
              description: finalItem.description || '',
              location: finalItem.data.location || '',
              start: { dateTime: new Date(`${date}T${finalItem.data.time}`).toISOString(), timeZone: 'Europe/Moscow' },
              end: { dateTime: new Date(`${date}T${finalItem.data.endTime}`).toISOString(), timeZone: 'Europe/Moscow' },
              attendees: participantsList.map(email => ({email}))
          };

          if (finalItem.data.google_calendar_event_id) {
              await googleApiService.updateCalendarEvent(providerToken, profile.google_calendar_id, finalItem.data.google_calendar_event_id, eventDetails);
          } else {
              const calEvent = await googleApiService.createCalendarEvent(providerToken, profile.google_calendar_id, eventDetails);
              finalItem = { ...finalItem, data: { ...finalItem.data, google_calendar_event_id: calEvent.id } };
          }
      } catch (error) {
          console.error("Failed to sync calendar event:", error);
          alert("Не удалось синхронизировать событие с Google Календарем.");
      } finally {
          setLoading(false);
      }
    }
    
    onUpdateItem(finalItem);
    onClose();
  };

  const currentType = editedItem ? eventTypes[editedItem.type] : null;

  const renderMeetingForm = () => (
      <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" value={editedItem.title} onChange={(e) => handleChange('title', e.target.value)} placeholder="Добавьте название" className="w-full text-xl border-0 border-b-2 border-gray-200 focus:ring-0 focus:border-blue-500 py-2" required autoFocus/>
          <div className="flex items-center gap-4 text-gray-600">
              <FaClock size={20} className="flex-shrink-0" />
              <input type="date" value={date} className="input bg-gray-100" readOnly disabled />
              <input type="time" value={editedItem.data?.time || ''} onChange={e => handleDataChange('time', e.target.value)} className="input w-32" required />
              <span>-</span>
              <input type="time" value={editedItem.data?.endTime || ''} onChange={e => handleDataChange('endTime', e.target.value)} className="input w-32" required />
          </div>
          <div className="flex items-center gap-4 text-gray-600">
              <FaMapMarkerAlt size={20} className="flex-shrink-0" />
              <input type="text" value={editedItem.data?.location || ''} onChange={e => handleDataChange('location', e.target.value)} className="input w-full" placeholder="Место или ссылка на конференцию"/>
          </div>
          <div className="flex items-start gap-4 text-gray-600">
              <FaUsersIcon size={20} className="flex-shrink-0 mt-2" />
              <textarea value={editedItem.data?.participants?.join('\n') || ''} onChange={e => handleDataChange('participants', e.target.value.split(/[\n,]+/))} className="input w-full" rows={3} placeholder="Добавьте участников по email..." />
          </div>
          <div className="flex items-start gap-4 text-gray-600">
              <FaAlignLeft size={20} className="flex-shrink-0 mt-2" />
              <textarea value={editedItem.description || ''} onChange={e => handleChange('description', e.target.value)} className="input w-full" rows={4} placeholder="Добавьте описание или повестку" />
          </div>
          <div className="pt-4 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="btn-secondary">Отмена</button>
              <button type="submit" disabled={loading} className="btn-primary w-32 flex justify-center">{loading ? <Spinner size="sm" /> : 'Сохранить'}</button>
          </div>
      </form>
  );

  const renderGenericForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-3">{currentType?.icon}<span>{currentType?.name}</span></h3>
        <div>
            <label className="label">Название / Цель</label>
            <textarea className="input" rows={2} value={editedItem.title} onChange={(e) => handleChange('title', e.target.value)} required autoFocus/>
        </div>
         {editedItem.type === 'interview' && (
            <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Опрашиваемый</label><input type="text" value={editedItem.data?.interviewee || ''} onChange={e => handleDataChange('interviewee', e.target.value)} className="input" /></div>
                <div><label className="label">Время</label><input type="time" value={editedItem.data?.time || ''} onChange={e => handleDataChange('time', e.target.value)} className="input" /></div>
            </div>
        )}
        <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">Отмена</button>
            <button type="submit" disabled={loading} className="w-32 flex justify-center btn-primary">{loading ? <Spinner size="sm" /> : 'Сохранить'}</button>
        </div>
    </form>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={item.type === 'meeting' ? '' : `Редактировать: ${currentType?.name || 'Задача'}`} size={item.type === 'meeting' ? 'lg' : 'md'}>
        {item.type === 'meeting' ? renderMeetingForm() : renderGenericForm()}
    </Modal>
  );
};

export default EditPlanItemModal;
import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import { PlanItem, PlanItemType, Profile, ContactPerson, Project } from '../types';
import { FaTasks, FaCalendarCheck, FaUsers, FaFileContract, FaBinoculars, FaSitemap, FaClock, FaMapMarkerAlt, FaUsers as FaUsersIcon, FaAlignLeft, FaTimes } from 'react-icons/fa';
import { Spinner } from './ui/Spinner';
import * as googleApiService from '../services/googleApiService';
import AddContactModal from './AddContactModal';

interface EditPlanItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateItem: (item: PlanItem) => void;
  item: PlanItem;
  date: string;
  profile: Profile | null;
  providerToken: string | null;
  contacts: ContactPerson[];
  project: Project | null;
  onContactsUpdate: () => void;
}

const eventTypes: { [key in PlanItemType]: { name: string, icon: React.ReactNode } } = {
    task: { name: 'Задача', icon: <FaTasks size={24} className="text-gray-600" /> },
    meeting: { name: 'Встреча', icon: <FaCalendarCheck size={24} className="text-purple-600" /> },
    interview: { name: 'Интервью', icon: <FaUsers size={24} className="text-green-600" /> },
    doc_review: { name: 'Анализ документов', icon: <FaFileContract size={24} className="text-blue-600" /> },
    observation: { name: 'Наблюдение', icon: <FaBinoculars size={24} className="text-orange-600" /> },
    process_analysis: { name: 'Анализ процесса', icon: <FaSitemap size={24} className="text-teal-600" /> }
};

const EditPlanItemModal: React.FC<EditPlanItemModalProps> = ({ isOpen, onClose, onUpdateItem, item, date, profile, providerToken, contacts, project, onContactsUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [editedItem, setEditedItem] = useState<PlanItem>(item);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);

  useEffect(() => { if (isOpen) { setEditedItem(item); } }, [isOpen, item]);

  const handleDataChange = (field: keyof NonNullable<PlanItem['data']>, value: any) => {
    setEditedItem(prev => ({ ...prev, data: { ...(prev.data || {}), [field]: value } }));
  };

  const handleContactToggle = (contactId: string) => {
    if (contactId === '__add_new__') {
      setIsAddContactModalOpen(true);
      return;
    }
    const currentIds = editedItem.data?.contact_ids || [];
    const newIds = currentIds.includes(contactId) ? currentIds.filter(id => id !== contactId) : [...currentIds, contactId];
    handleDataChange('contact_ids', newIds);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedItem.title.trim()) return;
    setLoading(true);
    let finalItem = { ...editedItem };

    if (finalItem.type === 'meeting' && providerToken && profile?.google_calendar_id && finalItem.data?.time && finalItem.data?.endTime) {
      try {
          const linkedContacts = contacts.filter(c => finalItem.data?.contact_ids?.includes(c.id));
          const eventDetails = {
              summary: finalItem.title, description: finalItem.description || '', location: finalItem.data.location || '',
              start: { dateTime: new Date(`${date}T${finalItem.data.time}`).toISOString(), timeZone: 'Europe/Moscow' },
              end: { dateTime: new Date(`${date}T${finalItem.data.endTime}`).toISOString(), timeZone: 'Europe/Moscow' },
              attendees: linkedContacts.map(c => ({email: c.email}))
          };
          if (finalItem.data.google_calendar_event_id) {
              await googleApiService.updateCalendarEvent(providerToken, profile.google_calendar_id, finalItem.data.google_calendar_event_id, eventDetails);
          } else {
              const calEvent = await googleApiService.createCalendarEvent(providerToken, profile.google_calendar_id, eventDetails);
              finalItem = { ...finalItem, data: { ...finalItem.data, google_calendar_event_id: calEvent.id } };
          }
      } catch (error) { console.error("Failed to sync calendar event:", error); alert("Не удалось синхронизировать событие с Google Календарем."); }
    }
    onUpdateItem(finalItem);
    setLoading(false);
    onClose();
  };

  const currentType = editedItem ? eventTypes[editedItem.type] : null;
  const selectedContacts = contacts.filter(c => editedItem.data?.contact_ids?.includes(c.id));

  const renderMeetingForm = () => (
      <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" value={editedItem.title} onChange={e => setEditedItem({...editedItem, title: e.target.value})} placeholder="Добавьте название" className="gcal-title-input" required autoFocus/>
          <div className="flex items-center gap-4 text-slate-600">
              <FaClock size={20} className="flex-shrink-0" />
              <input type="date" value={date} className="input bg-slate-100" readOnly disabled />
              <input type="time" value={editedItem.data?.time || ''} onChange={e => handleDataChange('time', e.target.value)} className="input w-32" required />
              <span>-</span>
              <input type="time" value={editedItem.data?.endTime || ''} onChange={e => handleDataChange('endTime', e.target.value)} className="input w-32" required />
          </div>
          <div className="flex items-center gap-4 text-slate-600"><FaMapMarkerAlt size={20} className="flex-shrink-0" /><input type="text" value={editedItem.data?.location || ''} onChange={e => handleDataChange('location', e.target.value)} className="input w-full" placeholder="Место или ссылка"/></div>
          <div className="flex items-start gap-4 text-slate-600">
              <FaUsersIcon size={20} className="flex-shrink-0 mt-2" />
              <div className="w-full">
                  <select onChange={e => handleContactToggle(e.target.value)} className="input" value="">
                      <option value="" disabled>-- Выберите или добавьте --</option>
                      {contacts.filter(c => !editedItem.data?.contact_ids?.includes(c.id)).map(c => <option key={c.id} value={c.id}>{c.name} ({c.role})</option>)}
                      <option value="__add_new__" className="font-bold text-blue-600">+ Добавить новый контакт</option>
                  </select>
                  <div className="flex flex-wrap gap-2 mt-2">
                      {selectedContacts.map(c => <div key={c.id} className="flex items-center gap-2 bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">{c.name}<button type="button" onClick={() => handleContactToggle(c.id)}><FaTimes size={10}/></button></div>)}
                  </div>
              </div>
          </div>
          <div className="flex items-start gap-4 text-slate-600"><FaAlignLeft size={20} className="flex-shrink-0 mt-2" /><textarea value={editedItem.description || ''} onChange={e => setEditedItem({...editedItem, description: e.target.value})} className="input w-full" rows={4} placeholder="Описание или повестка" /></div>
          <div className="pt-4 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="btn-secondary">Отмена</button>
              <button type="submit" disabled={loading} className="btn-primary w-32 flex justify-center">{loading ? <Spinner size="sm" /> : 'Сохранить'}</button>
          </div>
      </form>
  );

  const renderGenericForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-3">{currentType?.icon}<span>{currentType?.name}</span></h3>
        <div><label className="label">Название / Цель</label><textarea className="input" rows={2} value={editedItem.title} onChange={(e) => setEditedItem({...editedItem, title: e.target.value})} required autoFocus/></div>
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
    <>
    <Modal isOpen={isOpen} onClose={onClose} title={item.type === 'meeting' ? '' : `Редактировать: ${currentType?.name || 'Задача'}`} size={item.type === 'meeting' ? 'lg' : 'md'}>
        {item.type === 'meeting' ? renderMeetingForm() : renderGenericForm()}
    </Modal>
    {project && (
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
    )}
    </>
  );
};

export default EditPlanItemModal;
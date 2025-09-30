
import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import { PlanItem, PlanItemType } from '../types';
import { FaTasks, FaCalendarCheck, FaUsers, FaFileContract, FaBinoculars } from 'react-icons/fa';
import { Spinner } from './ui/Spinner';

interface EditPlanItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateItem: (item: PlanItem) => void;
  item: PlanItem;
}

const eventTypes: { [key in PlanItemType]: { name: string, icon: React.ReactNode } } = {
    task: { name: 'Задача', icon: <FaTasks size={24} className="text-gray-600" /> },
    meeting: { name: 'Встреча', icon: <FaCalendarCheck size={24} className="text-purple-600" /> },
    interview: { name: 'Интервью', icon: <FaUsers size={24} className="text-green-600" /> },
    doc_review: { name: 'Анализ документов', icon: <FaFileContract size={24} className="text-blue-600" /> },
    observation: { name: 'Наблюдение', icon: <FaBinoculars size={24} className="text-orange-600" /> },
};


const EditPlanItemModal: React.FC<EditPlanItemModalProps> = ({ isOpen, onClose, onUpdateItem, item }) => {
  const [loading, setLoading] = useState(false);

  // Form states
  const [content, setContent] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [meetingAgenda, setMeetingAgenda] = useState('');
  const [meetingParticipants, setMeetingParticipants] = useState('');

  // Fallback for items created before the 'type' property existed. This prevents crashes.
  const itemTypeWithFallback = item?.type || 'task';

  useEffect(() => {
    if (item) {
        setContent(item.content);
        if (itemTypeWithFallback === 'meeting' && item.data) {
            setMeetingTime(item.data.time || '');
            setMeetingLocation(item.data.location || '');
            setMeetingAgenda(item.data.agenda || '');
            setMeetingParticipants(item.data.participants?.join('\n') || '');
        }
    }
  }, [item, itemTypeWithFallback]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      const updatedItem: PlanItem = {
        ...item,
        type: itemTypeWithFallback, // Ensure type is set on the updated object
        content: content.trim(),
      };

      if (itemTypeWithFallback === 'meeting') {
        updatedItem.data = {
            ...item.data,
            time: meetingTime,
            location: meetingLocation,
            agenda: meetingAgenda,
            participants: meetingParticipants.split('\n').filter(p => p.trim() !== ''),
        };
      }
      
      onUpdateItem(updatedItem);
    }
  };

  if (!item) return null;
  const currentType = eventTypes[itemTypeWithFallback];

  return (
     <Modal isOpen={isOpen} onClose={onClose} title={`Редактировать: ${currentType.name}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-3">
                {currentType?.icon}
                <span>{currentType?.name}</span>
            </h3>
            
            <div>
                <label htmlFor="editItemContent" className="block text-sm font-medium text-gray-700">{itemTypeWithFallback === 'meeting' ? 'Тема встречи' : 'Описание'}</label>
                <textarea
                  id="editItemContent"
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                  rows={2}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  autoFocus
                />
            </div>
            {itemTypeWithFallback === 'meeting' && (
              <>
                <div>
                  <label htmlFor="editMeetingAgenda" className="block text-sm font-medium text-gray-700">Повестка</label>
                  <input id="editMeetingAgenda" type="text" value={meetingAgenda} onChange={e => setMeetingAgenda(e.target.value)} className="w-full mt-1 input"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                         <label htmlFor="editMeetingTime" className="block text-sm font-medium text-gray-700">Время</label>
                         <input id="editMeetingTime" type="time" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} className="w-full mt-1 input" />
                    </div>
                     <div>
                         <label htmlFor="editMeetingLocation" className="block text-sm font-medium text-gray-700">Место</label>
                         <input id="editMeetingLocation" type="text" value={meetingLocation} onChange={e => setMeetingLocation(e.target.value)} className="w-full mt-1 input" />
                    </div>
                </div>
                 <div>
                  <label htmlFor="editMeetingParticipants" className="block text-sm font-medium text-gray-700">Участники (каждый с новой строки)</label>
                  <textarea id="editMeetingParticipants" value={meetingParticipants} onChange={e => setMeetingParticipants(e.target.value)} className="w-full mt-1 input" rows={3} />
                </div>
              </>
            )}

            <div className="pt-2 flex justify-end items-center space-x-2">
                <button type="button" onClick={onClose} className="btn-secondary">Отмена</button>
                <button type="submit" disabled={loading} className="w-32 py-2 px-4 btn-primary flex justify-center items-center">
                   {loading ? <Spinner size="sm" /> : 'Сохранить'}
               </button>
           </div>
        </form>
    </Modal>
  );
};

export default EditPlanItemModal;

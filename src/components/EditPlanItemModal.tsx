import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import { PlanItem, PlanItemType } from '../types';
import { FaTasks, FaCalendarCheck, FaUsers, FaFileContract, FaBinoculars, FaSitemap } from 'react-icons/fa';
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
    process_analysis: { name: 'Анализ процесса', icon: <FaSitemap size={24} className="text-teal-600" /> }
};

const EditPlanItemModal: React.FC<EditPlanItemModalProps> = ({ isOpen, onClose, onUpdateItem, item }) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editedItem.title.trim()) {
      onUpdateItem(editedItem);
      onClose();
    }
  };

  const currentType = eventTypes[editedItem.type];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Редактировать: ${currentType?.name || 'Задача'}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-3">
                {currentType?.icon}
                <span>{currentType?.name}</span>
            </h3>
            
            <div>
                <label htmlFor="itemTitleEdit" className="block text-sm font-medium text-gray-700">{editedItem.type === 'meeting' ? 'Тема встречи' : 'Название / Цель'}</label>
                <textarea
                  id="itemTitleEdit"
                  className="w-full mt-1 input"
                  rows={2}
                  value={editedItem.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  required
                  autoFocus
                />
            </div>
            {editedItem.type === 'meeting' && (
              <>
                <div>
                  <label htmlFor="meetingAgendaEdit" className="block text-sm font-medium text-gray-700">Повестка</label>
                  <input id="meetingAgendaEdit" type="text" value={editedItem.data?.agenda || ''} onChange={e => handleDataChange('agenda', e.target.value)} className="w-full mt-1 input" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                         <label htmlFor="meetingTimeEdit" className="block text-sm font-medium text-gray-700">Время</label>
                         <input id="meetingTimeEdit" type="time" value={editedItem.data?.time || ''} onChange={e => handleDataChange('time', e.target.value)} className="w-full mt-1 input" />
                    </div>
                     <div>
                         <label htmlFor="meetingLocationEdit" className="block text-sm font-medium text-gray-700">Место</label>
                         <input id="meetingLocationEdit" type="text" value={editedItem.data?.location || ''} onChange={e => handleDataChange('location', e.target.value)} className="w-full mt-1 input" />
                    </div>
                </div>
                 <div>
                  <label htmlFor="meetingParticipantsEdit" className="block text-sm font-medium text-gray-700">Участники (каждый с новой строки)</label>
                  <textarea id="meetingParticipantsEdit" value={editedItem.data?.participants?.join('\n') || ''} onChange={e => handleDataChange('participants', e.target.value.split('\n'))} className="w-full mt-1 input" rows={3} />
                </div>
              </>
            )}
             {editedItem.type === 'interview' && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                         <label htmlFor="intervieweeEdit" className="block text-sm font-medium text-gray-700">Опрашиваемый</label>
                         <input id="intervieweeEdit" type="text" value={editedItem.data?.interviewee || ''} onChange={e => handleDataChange('interviewee', e.target.value)} className="w-full mt-1 input" />
                    </div>
                     <div>
                         <label htmlFor="interviewTimeEdit" className="block text-sm font-medium text-gray-700">Время</label>
                         <input id="interviewTimeEdit" type="time" value={editedItem.data?.time || ''} onChange={e => handleDataChange('time', e.target.value)} className="w-full mt-1 input" />
                    </div>
                </div>
            )}

            <div className="pt-2 flex justify-end items-center gap-2">
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

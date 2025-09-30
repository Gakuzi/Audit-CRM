import React, { useState } from 'react';
import Modal from './ui/Modal';
import { Week, PlanItem, Plan, PlanItemType } from '../types';
import { FaTasks, FaCalendarCheck, FaUsers, FaFileContract, FaBinoculars, FaArrowLeft } from 'react-icons/fa';
import { Spinner } from './ui/Spinner';

interface AddPlanItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdatePlan: (plan: any) => void;
  week: Week;
  date: string;
}

const eventTypes: { type: PlanItemType, name: string, icon: React.ReactNode }[] = [
    { type: 'task', name: 'Задача', icon: <FaTasks size={24} className="mb-2 text-gray-600" /> },
    { type: 'meeting', name: 'Встреча', icon: <FaCalendarCheck size={24} className="mb-2 text-purple-600" /> },
    { type: 'interview', name: 'Интервью', icon: <FaUsers size={24} className="mb-2 text-green-600" /> },
    { type: 'doc_review', name: 'Анализ документов', icon: <FaFileContract size={24} className="mb-2 text-blue-600" /> },
    { type: 'observation', name: 'Наблюдение', icon: <FaBinoculars size={24} className="mb-2 text-orange-600" /> },
];

const AddPlanItemModal: React.FC<AddPlanItemModalProps> = ({ isOpen, onClose, onUpdatePlan, week, date }) => {
  const [step, setStep] = useState<'select' | 'form'>('select');
  const [itemType, setItemType] = useState<PlanItemType | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [content, setContent] = useState('');
  // Meeting
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [meetingAgenda, setMeetingAgenda] = useState('');
  const [meetingParticipants, setMeetingParticipants] = useState('');
  // Interview
  const [interviewee, setInterviewee] = useState('');
  const [interviewTime, setInterviewTime] = useState('');


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
      setItemType(null);
      setContent('');
      setMeetingTime('');
      setMeetingLocation('');
      setMeetingAgenda('');
      setMeetingParticipants('');
      setInterviewee('');
      setInterviewTime('');
      setLoading(false);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim() && itemType) {
      const newItem: PlanItem = {
        id: crypto.randomUUID(),
        content: content.trim(),
        completed: false,
        type: itemType,
        event_count: 0,
        data: {}
      };

      if (itemType === 'meeting') {
        newItem.data = {
            time: meetingTime,
            location: meetingLocation,
            agenda: meetingAgenda,
            participants: meetingParticipants.split('\n').filter(p => p.trim() !== ''),
        };
      } else if (itemType === 'interview') {
        newItem.data = {
            interviewee: interviewee,
            time: interviewTime,
        };
      }
      
      const newPlan = { ...week.plan };
      if (!newPlan[date]) {
          newPlan[date] = { tasks: [] };
      }
      newPlan[date].tasks.push(newItem);
      
      onUpdatePlan(newPlan);
      handleClose();
    }
  };

  const renderForm = () => {
    if (!itemType) return null;
    const currentType = eventTypes.find(et => et.type === itemType);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-3">
                {currentType?.icon}
                <span>Добавить: {currentType?.name}</span>
            </h3>
            
            <div>
                <label htmlFor="itemContent" className="block text-sm font-medium text-gray-700">{itemType === 'meeting' ? 'Тема встречи' : 'Цель / Описание'}</label>
                <textarea
                  id="itemContent"
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                  rows={2}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Опишите событие или задачу..."
                  required
                  autoFocus
                />
            </div>
            {itemType === 'meeting' && (
              <>
                <div>
                  <label htmlFor="meetingAgenda" className="block text-sm font-medium text-gray-700">Повестка</label>
                  <input id="meetingAgenda" type="text" value={meetingAgenda} onChange={e => setMeetingAgenda(e.target.value)} className="w-full mt-1 input" placeholder="Ключевые вопросы для обсуждения"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                         <label htmlFor="meetingTime" className="block text-sm font-medium text-gray-700">Время</label>
                         <input id="meetingTime" type="time" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} className="w-full mt-1 input" />
                    </div>
                     <div>
                         <label htmlFor="meetingLocation" className="block text-sm font-medium text-gray-700">Место</label>
                         <input id="meetingLocation" type="text" value={meetingLocation} onChange={e => setMeetingLocation(e.target.value)} className="w-full mt-1 input" placeholder="Например, онлайн" />
                    </div>
                </div>
                 <div>
                  <label htmlFor="meetingParticipants" className="block text-sm font-medium text-gray-700">Участники (каждый с новой строки)</label>
                  <textarea id="meetingParticipants" value={meetingParticipants} onChange={e => setMeetingParticipants(e.target.value)} className="w-full mt-1 input" rows={3} />
                </div>
              </>
            )}
             {itemType === 'interview' && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                         <label htmlFor="interviewee" className="block text-sm font-medium text-gray-700">Опрашиваемый (опц.)</label>
                         <input id="interviewee" type="text" value={interviewee} onChange={e => setInterviewee(e.target.value)} className="w-full mt-1 input" placeholder="Напр., Главный бухгалтер" />
                    </div>
                     <div>
                         <label htmlFor="interviewTime" className="block text-sm font-medium text-gray-700">Время (опц.)</label>
                         <input id="interviewTime" type="time" value={interviewTime} onChange={e => setInterviewTime(e.target.value)} className="w-full mt-1 input" />
                    </div>
                </div>
            )}


            <div className="pt-2 flex justify-between items-center">
                <button type="button" onClick={handleBack} className="flex items-center btn-secondary"><FaArrowLeft className="mr-2"/> Назад</button>
                <button type="submit" disabled={loading} className="w-32 py-2 px-4 btn-primary flex justify-center items-center">
                   {loading ? <Spinner size="sm" /> : 'Добавить'}
               </button>
           </div>
        </form>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Добавить событие в план">
      {step === 'select' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {eventTypes.map(({ type, name, icon }) => (
                <button key={type} onClick={() => handleSelectType(type)} className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-blue-100 rounded-lg text-center transition-colors">
                    {icon}
                    <span className="font-semibold text-sm">{name}</span>
                </button>
            ))}
        </div>
      ) : renderForm()}
    </Modal>
  );
};

export default AddPlanItemModal;
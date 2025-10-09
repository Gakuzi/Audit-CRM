import React, { useState } from 'react';
import Modal from './ui/Modal';
import { Plan } from '../types';
import { generateStagePlan } from '../services/geminiService';
import { FaBrain } from 'react-icons/fa';
import { Spinner } from './ui/Spinner';
import AiChatModal from './AiChatModal';

interface AddWeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWeek: (title: string, description: string, startDate: string, endDate: string, plan: Plan) => void;
}

const AddWeekModal: React.FC<AddWeekModalProps> = ({ isOpen, onClose, onAddWeek }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [plan, setPlan] = useState<Plan>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);


  const handleAiPlanGeneration = async () => {
      if (!title || !description || !startDate || !endDate) {
          alert("Пожалуйста, заполните название, описание и даты, чтобы сгенерировать план.");
          return;
      }
      setIsGenerating(true);
      setStatusText('Генерация детального плана этапа...');
      try {
          const generatedPlan = await generateStagePlan(title, description, startDate, endDate);
          setPlan(generatedPlan);
          setStatusText('План успешно сгенерирован!');
      } catch (error: any) {
          alert("Ошибка генерации плана: " + error.message);
          setStatusText('');
      } finally {
          setIsGenerating(false);
      }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && startDate && endDate) {
      if (new Date(endDate) < new Date(startDate)) {
        alert("Дата окончания не может быть раньше даты начала.");
        return;
      }
      const finalPlan = Object.keys(plan).length > 0 ? plan : generatePlanForDateRange(startDate, endDate);
      onAddWeek(title.trim(), description.trim(), startDate, endDate, finalPlan);
      handleClose();
    }
  };
  
  const generatePlanForDateRange = (start: string, end: string): Plan => {
      const emptyPlan: Plan = {};
      const currentDate = new Date(start + 'T00:00:00');
      const finalDate = new Date(end + 'T00:00:00');

      while(currentDate <= finalDate) {
          const dateString = currentDate.toISOString().split('T')[0];
          emptyPlan[dateString] = { tasks: [] };
          currentDate.setDate(currentDate.getDate() + 1);
      }
      return emptyPlan;
  }
  
  const handleClose = () => {
      setTitle(''); setDescription('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate(''); setPlan({}); setStatusText('');
      onClose();
  }

  return (
    <>
    <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Добавить новый этап"
        footer={<>
          <button type="button" onClick={handleClose} className="btn-secondary">Отмена</button>
          <button type="submit" form="add-week-form" className="btn-primary">Добавить</button>
        </>}
    >
      <form id="add-week-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
            <label htmlFor="weekTitle" className="label">Название этапа</label>
            <input id="weekTitle" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="Например, 'Этап 1: Сбор документов'" required autoFocus />
        </div>
         <div>
            <label htmlFor="weekDescription" className="label">Подробное описание / Цели этапа</label>
            <textarea id="weekDescription" value={description} onChange={(e) => setDescription(e.target.value)} className="input" rows={4} placeholder="Опишите, что должно быть достигнуто..." required />
            <button type="button" onClick={() => setIsChatModalOpen(true)} className="text-xs text-slate-900 hover:underline mt-1">Сгенерировать с помощью AI</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                 <label htmlFor="startDate" className="label">Дата начала</label>
                 <input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" required />
            </div>
            <div>
                 <label htmlFor="endDate" className="label">Дата окончания</label>
                 <input id="endDate" type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className="input" required />
            </div>
        </div>
        <div className="pt-2">
             {statusText && (
                <div className="text-center p-3 mb-2 bg-blue-50 text-blue-800 rounded-md flex items-center justify-center gap-3">
                    {isGenerating && <Spinner size="sm" />}
                    <p className="text-sm font-medium">{statusText}</p>
                </div>
            )}
             <button type="button" onClick={handleAiPlanGeneration} disabled={isGenerating} className="w-full flex justify-center items-center gap-2 btn-secondary">
                 {isGenerating ? 'Генерация...' : <><FaBrain /> Сгенерировать план с AI</>}
             </button>
             <p className="text-xs text-gray-500 mt-1 text-center">AI создаст детальный план на основе названия, описания и дат.</p>
        </div>
      </form>
    </Modal>
    <AiChatModal 
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        onConfirm={(generatedDesc) => { setDescription(generatedDesc); setIsChatModalOpen(false); }}
        initialContext={`Создай описание для этапа аудита с названием "${title}"`}
    />
    </>
  );
};

export default AddWeekModal;
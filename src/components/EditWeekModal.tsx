import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import { Week, Plan, Profile } from '../types';
import { supabase } from '../services/supabaseClient';
import { Spinner } from './ui/Spinner';
// Fix: Use relative path for service import.
import { generateStagePlan } from '../services/geminiService';
import { FaBrain } from 'react-icons/fa';
import AiChatModal from './AiChatModal';


interface EditWeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  week: Week;
  onUpdate: () => void;
  profile: Profile | null;
  providerToken: string | null;
}

const EditWeekModal: React.FC<EditWeekModalProps> = ({ isOpen, onClose, week, onUpdate, profile, providerToken }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [plan, setPlan] = useState<Plan>({});
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState('');
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);


  useEffect(() => {
    if (week) {
      setTitle(week.title);
      setDescription(week.description || '');
      setStartDate(week.start_date);
      setEndDate(week.end_date);
      setPlan(week.plan);
      setError('');
    }
  }, [week, isOpen]);
  
  const handleAiPlanGeneration = async () => {
      setError('');
      if (!title || !description || !startDate || !endDate) {
          alert("Пожалуйста, заполните название, описание и даты, чтобы сгенерировать план.");
          return;
      }
      if (new Date(endDate) < new Date(startDate)) {
        alert("Ошибка: Дата окончания не может быть раньше даты начала.");
        return;
      }
      if (!window.confirm("Это действие заменит текущий план для этого этапа (включая все задачи и события), а также сохранит все остальные изменения в этой форме. Вы уверены?")) return;
      
      setIsGenerating(true);
      setStatusText('Пересоздание плана с AI...');
      try {
          // 1. Delete existing events for this week
          const { error: deleteEventsError } = await supabase.from('events').delete().eq('week_id', week.id);
          if (deleteEventsError) throw deleteEventsError;

          // 2. Generate new plan
          const generatedPlan = await generateStagePlan(title, description, startDate, endDate);
          
          setStatusText('Сохранение нового плана...');
          // 3. Update the week with all new data
          const { error } = await supabase
            .from('weeks')
            .update({ 
                title, 
                description, 
                start_date: startDate, 
                end_date: endDate, 
                plan: generatedPlan 
            })
            .eq('id', week.id);
            
          if (error) throw error;

          onUpdate();
          onClose();

      } catch (err: any) {
            if (err.message.includes('503') || err.message.toLowerCase().includes('overloaded')) {
                setError('Сервер AI перегружен. Пожалуйста, попробуйте еще раз через несколько минут.');
            } else {
                setError("Ошибка при пересоздании плана: " + err.message);
            }
      } finally {
          setIsGenerating(false);
          setStatusText('');
      }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setStatusText('Сохранение изменений...');

    const { error } = await supabase
      .from('weeks')
      .update({ title, description, start_date: startDate, end_date: endDate, plan })
      .eq('id', week.id);

    if (error) {
      alert('Ошибка обновления: ' + error.message);
    } else {
      onUpdate();
      onClose();
    }
    setLoading(false);
    setStatusText('');
  };

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title="Редактировать этап">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-600 bg-red-100 p-3 rounded-md text-sm">{error}</p>}
        <div>
          <label htmlFor="editWeekTitle" className="block text-sm font-medium text-gray-700">Название этапа</label>
          <input id="editWeekTitle" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full mt-1 input" required />
        </div>
         <div>
            <label htmlFor="editWeekDescription" className="block text-sm font-medium text-gray-700">Подробное описание / Цели этапа</label>
            <textarea
              id="editWeekDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full mt-1 input"
              rows={4}
              placeholder="Опишите, что должно быть достигнуто в рамках этого этапа."
              required
            />
            <button type="button" onClick={() => setIsChatModalOpen(true)} className="text-xs text-blue-600 hover:underline mt-1">Сгенерировать с помощью AI чата</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                 <label htmlFor="editStartDate" className="block text-sm font-medium text-gray-700">Дата начала</label>
                 <input id="editStartDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full mt-1 input" required />
            </div>
            <div>
                 <label htmlFor="editEndDate" className="block text-sm font-medium text-gray-700">Дата окончания</label>
                 <input id="editEndDate" type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className="w-full mt-1 input" required />
            </div>
        </div>

        <div className="pt-2 border-t">
            { (isGenerating || (loading && statusText)) && (
                <div className="text-center p-3 mb-2 bg-blue-50 text-blue-700 rounded-md flex items-center justify-center gap-3">
                    <Spinner size="sm" />
                    <p className="text-sm font-medium">{statusText}</p>
                </div>
            )}
             <button
                    type="button"
                    onClick={handleAiPlanGeneration}
                    disabled={isGenerating || loading}
                    className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300"
                >
                     {isGenerating ? 'Генерация...' : <><FaBrain /> Пересоздать план с AI</>}
             </button>
        </div>

        <div className="mt-4 flex justify-end">
          <button type="button" onClick={onClose} className="mr-2 btn-secondary">Отмена</button>
          <button type="submit" disabled={loading || isGenerating} className="btn-primary w-28">
            {loading ? <Spinner size="sm" /> : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
    <AiChatModal 
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        onConfirm={(generatedDesc) => {
            setDescription(generatedDesc);
            setIsChatModalOpen(false);
        }}
        initialContext={`Переформулируй или дополни описание для этапа аудита "${title}":\n\n${description}`}
    />
    </>
  );
};

export default EditWeekModal;

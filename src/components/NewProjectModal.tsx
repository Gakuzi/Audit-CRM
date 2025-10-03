import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';
import Modal from './ui/Modal';
import { supabase } from '../services/supabaseClient';
import { generateAuditPlan } from '../services/geminiService';
import { Spinner } from './ui/Spinner';
import { ApprovalPeriod, ApprovalPeriodType } from '../types';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose, user }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [approvalPeriod, setApprovalPeriod] = useState<ApprovalPeriod>({ type: 'weekly', dayOfWeek: 1 });
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : new Date(start);
        if (!endDate) {
             end.setDate(end.getDate() + 27); // Default 4 weeks
        }

        if (end < start) {
            throw new Error('Дата окончания не может быть раньше даты начала.');
        }

        setStatusText('Генерация плана аудита с помощью AI...');
        const generatedData = await generateAuditPlan(name, description, startDate, endDate || end.toISOString().split('T')[0], approvalPeriod);

        setStatusText('Сохранение проекта...');
        const { data: projectData, error: projectError } = await supabase
            .from('projects').insert({
                user_id: user.id, name, description,
                start_date: startDate, end_date: endDate || null,
                approval_period: approvalPeriod,
            }).select().single();
        if (projectError) throw projectError;

        setStatusText('Сохранение этапов и задач...');
        const weeksToInsert = generatedData.weeks.map((week: any) => ({
            project_id: projectData.id, user_id: user.id,
            title: week.title, description: week.description,
            plan: week.plan, status: 'draft',
            start_date: week.start_date, end_date: week.end_date,
        }));

        const { error: weeksError } = await supabase.from('weeks').insert(weeksToInsert);
        if (weeksError) {
            await supabase.from('projects').delete().eq('id', projectData.id);
            throw weeksError;
        }
        handleClose();
    } catch (err: any) {
        if (err.message.includes('503') || err.message.toLowerCase().includes('overloaded')) {
            setError('Сервер AI перегружен. Пожалуйста, попробуйте еще раз через несколько минут.');
        } else {
            setError('Ошибка при создании проекта: ' + err.message);
        }
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };
  
  const handleClose = () => {
      setName(''); setDescription('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate(''); setApprovalPeriod({ type: 'weekly', dayOfWeek: 1 });
      setError(''); setLoading(false); setStatusText('');
      onClose();
  }

  const handlePeriodTypeChange = (type: ApprovalPeriodType) => {
      if (type === 'weekly') {
          setApprovalPeriod({ type: 'weekly', dayOfWeek: 1 });
      } else if (type === 'daily') {
          setApprovalPeriod({ type: 'daily', interval: 1 });
      }
  };

  return (
    <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Создать новый план аудита"
        footer={<>
            <button type="button" onClick={handleClose} disabled={loading} className="btn-secondary">Отмена</button>
            <button type="submit" form="new-project-form" disabled={loading} className="btn-primary w-32 flex justify-center items-center">
                {loading ? <Spinner size="sm" /> : 'Создать'}
            </button>
        </>}
    >
      <form id="new-project-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-600 bg-red-100 p-3 rounded-md text-sm">{error}</p>}
        {loading && (
            <div className="text-center p-4 bg-blue-50 text-blue-700 rounded-md flex items-center justify-center gap-3">
                <Spinner size="sm" />
                <p className="text-sm font-medium">{statusText}</p>
            </div>
        )}
        <div>
          <label htmlFor="projectName" className="label">Название проекта</label>
          <input id="projectName" type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Например, 'Аудит ООО Ромашка'" required disabled={loading}/>
        </div>
        <div>
          <label htmlFor="projectDesc" className="label">Описание / Цели</label>
          <textarea id="projectDesc" value={description} onChange={(e) => setDescription(e.target.value)} className="input" rows={3} placeholder="Опишите основные цели и задачи аудита" required disabled={loading}/>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="startDate" className="label">Дата начала</label>
                <input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" required disabled={loading}/>
            </div>
            <div>
                <label htmlFor="endDate" className="label">Дата окончания (опционально)</label>
                <input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" min={startDate} disabled={loading}/>
            </div>
        </div>
        <div>
            <label className="label">Период отчетности</label>
            <div className="mt-1 grid grid-cols-2 gap-2 items-center">
                <select value={approvalPeriod.type} onChange={e => handlePeriodTypeChange(e.target.value as ApprovalPeriodType)} className="input bg-white" disabled={loading}>
                    <option value="weekly">Еженедельно</option>
                    <option value="daily">Каждые N дней</option>
                </select>
                {approvalPeriod.type === 'weekly' && (
                    <select value={approvalPeriod.dayOfWeek} onChange={e => setApprovalPeriod({ ...approvalPeriod, dayOfWeek: parseInt(e.target.value) })} className="input bg-white" disabled={loading}>
                        <option value={1}>по понедельникам</option>
                        <option value={2}>по вторникам</option>
                        <option value={3}>по средам</option>
                        <option value={4}>по четвергам</option>
                        <option value={5}>по пятницам</option>
                        <option value={6}>по субботам</option>
                        <option value={0}>по воскресеньям</option>
                    </select>
                )}
                {approvalPeriod.type === 'daily' && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm">Каждые</span>
                        <input type="number" min="1" value={approvalPeriod.interval} onChange={e => setApprovalPeriod({ ...approvalPeriod, interval: parseInt(e.target.value) || 1 })} className="input w-16" disabled={loading} />
                        <span className="text-sm">дн.</span>
                    </div>
                )}
            </div>
        </div>
        <p className="text-xs text-gray-500 text-center">План аудита будет автоматически сгенерирован с помощью AI на основе введенных данных.</p>
      </form>
    </Modal>
  );
};

export default NewProjectModal;



import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';
import Modal from './ui/Modal';
import { supabase } from '../services/supabaseClient';
// Fix: Use relative path for service import.
import { generateAuditPlan } from '../services/geminiService';
import { Spinner } from './ui/Spinner';
// Fix: Use relative path for type import.
import { ApprovalPeriod } from '../types';

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
  const [approvalPeriod, setApprovalPeriod] = useState<ApprovalPeriod>('weekly');
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

        const durationInDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
        const durationInWeeks = Math.ceil(durationInDays / 7);

        // 1. Generate plan with AI
        setStatusText('Генерация плана аудита с помощью AI...');
        const generatedData = await generateAuditPlan(name, description, startDate, endDate || end.toISOString().split('T')[0], durationInWeeks, approvalPeriod);

        // 2. Insert project into Supabase
        setStatusText('Сохранение проекта...');
        const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .insert({
                user_id: user.id,
                name,
                description,
                start_date: startDate,
                end_date: endDate || null,
                approval_period: approvalPeriod,
            })
            .select()
            .single();

        if (projectError) throw projectError;

        // 3. Insert weeks for the new project
        setStatusText('Сохранение этапов и задач...');
        const weeksToInsert = generatedData.weeks.map((week: any) => ({
            project_id: projectData.id,
            user_id: user.id,
            title: week.title,
            description: week.description, // Added description
            plan: week.plan,
            status: 'draft',
            start_date: week.start_date,
            end_date: week.end_date,
        }));

        const { error: weeksError } = await supabase.from('weeks').insert(weeksToInsert);
        if (weeksError) {
             // Rollback project creation if weeks fail
            await supabase.from('projects').delete().eq('id', projectData.id);
            throw weeksError;
        }

        handleClose();

    } catch (err: any) {
      setError('Ошибка при создании проекта: ' + err.message);
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };
  
  const handleClose = () => {
      setName('');
      setDescription('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setApprovalPeriod('weekly');
      setError('');
      setLoading(false);
      setStatusText('');
      onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Создать новый план аудита">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-600 bg-red-100 p-3 rounded-md text-sm">{error}</p>}
        {loading && (
            <div className="text-center p-4 bg-blue-50 text-blue-700 rounded-md flex items-center justify-center gap-3">
                <Spinner size="sm" />
                <p className="text-sm font-medium">{statusText}</p>
            </div>
        )}
        <div>
          <label htmlFor="projectName" className="block text-sm font-medium text-gray-700">Название проекта</label>
          <input id="projectName" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 input" placeholder="Например, 'Аудит финансовой отчетности ООО Ромашка'" required disabled={loading}/>
        </div>
        <div>
          <label htmlFor="projectDesc" className="block text-sm font-medium text-gray-700">Описание / Цели</label>
          <textarea id="projectDesc" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full mt-1 input" rows={3} placeholder="Опишите основные цели и задачи аудита" required disabled={loading}/>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Дата начала</label>
                <input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full mt-1 input" required disabled={loading}/>
            </div>
            <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Дата окончания (опционально)</label>
                <input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full mt-1 input" min={startDate} disabled={loading}/>
            </div>
        </div>
        <div>
          <label htmlFor="approvalPeriod" className="block text-sm font-medium text-gray-700">Период отчетности</label>
          <select id="approvalPeriod" value={approvalPeriod} onChange={(e) => setApprovalPeriod(e.target.value as ApprovalPeriod)} className="w-full mt-1 input bg-white" disabled={loading}>
            <option value="weekly">Еженедельно</option>
            <option value="monthly">Ежемесячно</option>
          </select>
        </div>
        <p className="text-xs text-gray-500">План аудита будет автоматически сгенерирован с помощью AI на основе введенных данных.</p>
        <div className="pt-2 flex justify-end">
          <button type="button" onClick={handleClose} disabled={loading} className="mr-2 py-2 px-4 btn-secondary">Отмена</button>
          <button type="submit" disabled={loading} className="w-32 py-2 px-4 btn-primary flex justify-center items-center">
            {loading ? <Spinner size="sm" /> : 'Создать'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default NewProjectModal;
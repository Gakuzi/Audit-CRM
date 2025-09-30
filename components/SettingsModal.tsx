
import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
// Fix: Use relative path for type import.
import { Project, ApprovalPeriod } from '../types';
import { supabase } from '../services/supabaseClient';
// Fix: Use relative path for service import.
import { generateAuditPlan } from '../services/geminiService';
import { Spinner } from './ui/Spinner';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onProjectUpdate: () => void; // Callback to refresh data in AuditView
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, project, onProjectUpdate }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [approvalPeriod, setApprovalPeriod] = useState<ApprovalPeriod>('weekly');
    const [loading, setLoading] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (project) {
            setName(project.name);
            setDescription(project.description);
            setApprovalPeriod(project.approval_period);
        }
    }, [project]);
    
     const handleClose = () => {
        setError('');
        setStatusText('');
        setLoading(false);
        onClose();
    }

    const handleUpdateSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setStatusText('Сохранение настроек...');
        const { error } = await supabase
            .from('projects')
            .update({ name, description, approval_period: approvalPeriod })
            .eq('id', project.id);
        
        if (error) {
            setError('Ошибка сохранения: ' + error.message);
        } else {
            onProjectUpdate();
            handleClose();
        }
        setLoading(false);
        setStatusText('');
    };

    const handleRegeneratePlan = async () => {
        if (!window.confirm('Вы уверены? Это действие удалит все существующие недели, задачи и события и создаст новый план на основе данных из этой формы. Это действие необратимо.')) {
            return;
        }
        setLoading(true);
        setError('');
        try {
            setStatusText('Удаление старых событий...');
            // 1. Delete all existing events for the project
            const { error: deleteEventsError } = await supabase.from('events').delete().eq('project_id', project.id);
            if(deleteEventsError) throw deleteEventsError;

            setStatusText('Удаление старого плана...');
            // 2. Delete all existing weeks for the project (cascades to tasks)
            const { error: deleteError } = await supabase.from('weeks').delete().eq('project_id', project.id);
            if(deleteError) throw deleteError;
            
            // 3. Generate new plan
             const start = new Date(project.start_date);
             const end = project.end_date ? new Date(project.end_date) : new Date(start);
             if (!project.end_date) {
                  end.setDate(end.getDate() + 27); // Default 4 weeks
             }
             const durationInDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
             const durationInWeeks = Math.ceil(durationInDays / 7);

            setStatusText('Генерация нового плана с помощью AI...');
            const generatedData = await generateAuditPlan(name, description, project.start_date, project.end_date || '', durationInWeeks, approvalPeriod);

            // 4. Insert new weeks
            const weeksToInsert = generatedData.weeks.map((week: any) => ({
                project_id: project.id,
                user_id: project.user_id,
                title: week.title,
                description: week.description, // Added description
                plan: week.plan,
                status: 'draft',
                start_date: week.start_date,
                end_date: week.end_date,
            }));

            setStatusText('Сохранение нового плана...');
            const { error: weeksError } = await supabase.from('weeks').insert(weeksToInsert);
            if (weeksError) throw weeksError;

            onProjectUpdate();
            handleClose();

        } catch (err: any) {
            setError('Ошибка пересоздания плана: ' + err.message);
        } finally {
            setLoading(false);
            setStatusText('');
        }
    };


    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Настройки проекта">
            <form onSubmit={handleUpdateSettings} className="space-y-4">
                 {error && <p className="text-red-600 bg-red-100 p-3 rounded-md text-sm">{error}</p>}
                 {loading && statusText && (
                    <div className="text-center p-4 bg-blue-50 text-blue-700 rounded-md flex items-center justify-center gap-3">
                        <Spinner size="sm" />
                        <p className="text-sm font-medium">{statusText}</p>
                    </div>
                )}
                <div>
                    <label htmlFor="projectNameSettings" className="block text-sm font-medium text-gray-700">Название проекта</label>
                    <input id="projectNameSettings" type="text" value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 input" required disabled={loading} />
                </div>
                <div>
                    <label htmlFor="projectDescSettings" className="block text-sm font-medium text-gray-700">Описание / Цели</label>
                    <textarea id="projectDescSettings" value={description} onChange={e => setDescription(e.target.value)} className="w-full mt-1 input" rows={3} required disabled={loading} />
                </div>
                <div>
                    <label htmlFor="approvalPeriodSettings" className="block text-sm font-medium text-gray-700">Период отчетности</label>
                    <select id="approvalPeriodSettings" value={approvalPeriod} onChange={e => setApprovalPeriod(e.target.value as ApprovalPeriod)} className="w-full mt-1 input bg-white" disabled={loading}>
                        <option value="weekly">Еженедельно</option>
                        <option value="monthly">Ежемесячно</option>
                    </select>
                </div>
                <div className="pt-2 flex justify-end">
                    <button type="button" onClick={handleClose} className="mr-2 py-2 px-4 btn-secondary" disabled={loading}>Отмена</button>
                    <button type="submit" disabled={loading} className="py-2 px-4 btn-primary w-28">
                        {loading ? <Spinner size="sm" /> : 'Сохранить'}
                    </button>
                </div>
            </form>
             <div className="mt-6 pt-4 border-t border-red-200">
                <h4 className="text-md font-bold text-red-700">Опасная зона</h4>
                <p className="text-sm text-gray-600 mt-1">Это действие полностью заменит текущий план новым, сгенерированным AI на основе данных из формы выше.</p>
                <button
                    onClick={handleRegeneratePlan}
                    disabled={loading}
                    className="mt-2 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300"
                >
                     {loading ? <Spinner size="sm" /> : 'Пересоздать план с AI'}
                </button>
            </div>
        </Modal>
    );
};

export default SettingsModal;
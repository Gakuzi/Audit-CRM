import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import { Project, ApprovalPeriod, ApprovalPeriodType } from '../types';
import { supabase } from '../services/supabaseClient';
// Fix: Use relative path for service import.
import { generateAuditPlan } from '../services/geminiService';
import { Spinner } from './ui/Spinner';
import AiChatModal from './AiChatModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onProjectUpdate: () => void; // Callback to refresh data in AuditView
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, project, onProjectUpdate }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [approvalPeriod, setApprovalPeriod] = useState<ApprovalPeriod>({ type: 'weekly', interval: 1, dayOfWeek: 0 });
    const [loading, setLoading] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [error, setError] = useState('');
    const [isChatModalOpen, setIsChatModalOpen] = useState(false);

    useEffect(() => {
        if (project && isOpen) {
            setName(project.name);
            setDescription(project.description);
            setStartDate(project.start_date);
            setEndDate(project.end_date || '');
            // Handle old string format and new object format for backward compatibility
            if (typeof project.approval_period === 'string') {
                setApprovalPeriod({ type: 'weekly', interval: 1, dayOfWeek: 0 }); // Default for old data
            } else {
                setApprovalPeriod(project.approval_period);
            }
        }
    }, [project, isOpen]);

    const handlePeriodTypeChange = (type: ApprovalPeriodType) => {
        if (type === 'weekly') {
            setApprovalPeriod({ type: 'weekly', interval: 1, dayOfWeek: 0 });
        } else if (type === 'daily') {
            setApprovalPeriod({ type: 'daily', interval: 1 });
        }
    };
    
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
            .update({ 
                name, 
                description, 
                approval_period: approvalPeriod,
                start_date: startDate,
                end_date: endDate || null
            })
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
            const { error: deleteEventsError } = await supabase.from('events').delete().eq('project_id', project.id);
            if(deleteEventsError) throw deleteEventsError;

            setStatusText('Удаление старого плана...');
            const { error: deleteError } = await supabase.from('weeks').delete().eq('project_id', project.id);
            if(deleteError) throw deleteError;
            
            const finalEndDate = endDate || (() => {
                const start = new Date(startDate);
                start.setDate(start.getDate() + 27);
                return start.toISOString().split('T')[0];
            })();

            setStatusText('Генерация нового плана с помощью AI...');
            const generatedData = await generateAuditPlan(name, description, startDate, finalEndDate, approvalPeriod);

            const weeksToInsert = generatedData.weeks.map((week: any) => ({
                project_id: project.id,
                user_id: project.user_id,
                title: week.title,
                description: week.description,
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
            if (err.message.includes('503') || err.message.toLowerCase().includes('overloaded')) {
                setError('Сервер AI перегружен. Пожалуйста, попробуйте еще раз через несколько минут.');
            } else {
                setError('Ошибка пересоздания плана: ' + err.message);
            }
        } finally {
            setLoading(false);
            setStatusText('');
        }
    };


    return (
        <>
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
                    <button type="button" onClick={() => setIsChatModalOpen(true)} className="text-xs text-blue-600 hover:underline mt-1">
                        Сгенерировать с помощью AI чата
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="startDateSettings" className="block text-sm font-medium text-gray-700">Дата начала</label>
                        <input id="startDateSettings" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full mt-1 input" required disabled={loading}/>
                    </div>
                    <div>
                        <label htmlFor="endDateSettings" className="block text-sm font-medium text-gray-700">Дата окончания (опционально)</label>
                        <input id="endDateSettings" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full mt-1 input" min={startDate} disabled={loading}/>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Период отчетности</label>
                    <div className="mt-1 grid grid-cols-2 gap-2 items-center">
                        <select 
                            value={approvalPeriod.type} 
                            onChange={e => handlePeriodTypeChange(e.target.value as ApprovalPeriodType)} 
                            className="input bg-white"
                            disabled={loading}
                        >
                            <option value="weekly">Еженедельно</option>
                            <option value="daily">Каждые N дней</option>
                        </select>
                        {approvalPeriod.type === 'weekly' && (
                            <select 
                                value={approvalPeriod.dayOfWeek}
                                onChange={e => setApprovalPeriod({ ...approvalPeriod, dayOfWeek: parseInt(e.target.value) })}
                                className="input bg-white"
                                disabled={loading}
                            >
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
                                <input 
                                    type="number"
                                    min="1"
                                    value={approvalPeriod.interval}
                                    onChange={e => setApprovalPeriod({ ...approvalPeriod, interval: parseInt(e.target.value) || 1 })}
                                    className="input w-16"
                                    disabled={loading}
                                />
                                <span className="text-sm">дн.</span>
                            </div>
                        )}
                    </div>
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
                <p className="text-sm text-gray-600 mt-1">Это действие полностью заменит текущий план новым, сгенерированным AI на основе данных из этой формы.</p>
                <button
                    onClick={handleRegeneratePlan}
                    disabled={loading}
                    className="mt-2 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300"
                >
                     {loading ? <Spinner size="sm" /> : 'Пересоздать план с AI'}
                </button>
            </div>
        </Modal>
        <AiChatModal 
            isOpen={isChatModalOpen}
            onClose={() => setIsChatModalOpen(false)}
            onConfirm={(generatedDesc) => {
                setDescription(generatedDesc);
                setIsChatModalOpen(false);
            }}
            initialContext={`Создай описание для проекта аудита с названием "${name}"`}
        />
        </>
    );
};

export default SettingsModal;

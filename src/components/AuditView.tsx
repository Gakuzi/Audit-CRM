// src/components/AuditView.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { Project, Week, Plan, PlanItem, Profile, CompanyProfile } from '../types';
import { supabase, sendGuestSubTaskNotification } from '../services/supabaseClient';
import { Spinner } from './ui/Spinner';
import { FaArrowLeft, FaCog, FaPlus } from 'react-icons/fa';
import WeekCard from './WeekCard';
import SettingsModal from './SettingsModal';
import AddWeekModal from './AddWeekModal';
import TaskDetailView from './TaskDetailView';
import ConfirmationModal from './ConfirmationModal';
import AiReportModal from './AiReportModal';
import ApprovalShareModal from './ApprovalShareModal';

interface AuditViewProps {
  project: Project;
  user: User | null;
  profile: Profile | null;
  providerToken: string | null;
  onBack: () => void;
  isAuditor: boolean;
  isGuest: boolean;
  initialTaskId: string | null;
}

const AuditView: React.FC<AuditViewProps> = ({ project, user, profile, providerToken, onBack, isAuditor, isGuest, initialTaskId }) => {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAddWeekModalOpen, setIsAddWeekModalOpen] = useState(false);
  const [isAiReportModalOpen, setIsAiReportModalOpen] = useState(false);
  const [selectedWeekForReport, setSelectedWeekForReport] = useState<Week | null>(null);
  const [companyForReport, setCompanyForReport] = useState<CompanyProfile | null>(null);
  const [weekToShareForApproval, setWeekToShareForApproval] = useState<Week | null>(null);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<{ item: PlanItem; weekId: string; projectId: string; } | null>(null);
  const [weekToDelete, setWeekToDelete] = useState<Week | null>(null);

  const fetchWeeks = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const { data, error } = await supabase.from('weeks').select('*').eq('project_id', project.id).order('start_date', { ascending: true });
    if (error) console.error('Error fetching weeks:', error);
    else setWeeks((data || []).map(week => ({ ...week, plan: week.plan || {} })));
    if (showLoading) setLoading(false);
  }, [project.id]);

  useEffect(() => { fetchWeeks(); }, [fetchWeeks]);

  useEffect(() => {
    if (initialTaskId && weeks.length > 0 && !selectedTaskForDetail) {
        for (const week of weeks) {
            for (const date in week.plan) {
                const task = week.plan[date].tasks.find(t => t.id === initialTaskId);
                if (task) {
                    setSelectedTaskForDetail({ item: task, weekId: week.id, projectId: project.id });
                    return;
                }
            }
        }
    }
  }, [initialTaskId, weeks, project.id, selectedTaskForDetail]);
  
  useEffect(() => {
    const channel = supabase.channel(`public:weeks:project_id=eq.${project.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'weeks', filter: `project_id=eq.${project.id}` }, () => fetchWeeks(false)).subscribe();
    return () => { supabase.removeChannel(channel); }
  }, [project.id, fetchWeeks]);

  const handleUpdatePlan = async (weekId: string, newPlan: Plan) => {
    const { error } = await supabase.from('weeks').update({ plan: newPlan }).eq('id', weekId);
    if (error) alert('Ошибка обновления плана: ' + error.message);
    else fetchWeeks(false);
  };

  const handleUpdateTask = (weekId: string, updatedTask: PlanItem) => {
    const week = weeks.find(w => w.id === weekId);
    if (!week) return;
    const newPlan = JSON.parse(JSON.stringify(week.plan));
    const findAndUpdate = (tasks: PlanItem[]): boolean => {
        for (let i = 0; i < tasks.length; i++) {
            if (tasks[i].id === updatedTask.id) { tasks[i] = updatedTask; return true; }
            if (tasks[i].sub_tasks && findAndUpdate(tasks[i].sub_tasks!)) return true;
        }
        return false;
    }
    for (const date in newPlan) {
        if (newPlan[date].tasks && findAndUpdate(newPlan[date].tasks)) {
            handleUpdatePlan(weekId, newPlan);
            if (selectedTaskForDetail?.item.id === updatedTask.id) {
                setSelectedTaskForDetail(prev => prev ? {...prev, item: updatedTask} : null);
            }
            return;
        }
    }
  };
  
   const handleEventCountChange = async (weekId: string, taskId: string, change: 1 | -1) => {
        const week = weeks.find(w => w.id === weekId);
        if (!week) return;
        const newPlan = { ...week.plan };
        for (const date in newPlan) {
            const taskIndex = newPlan[date].tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                const currentCount = newPlan[date].tasks[taskIndex].event_count || 0;
                newPlan[date].tasks[taskIndex].event_count = Math.max(0, currentCount + change);
                setWeeks(current => current.map(w => w.id === weekId ? { ...w, plan: newPlan } : w));
                await supabase.from('weeks').update({ plan: newPlan }).eq('id', weekId);
                return;
            }
        }
    };

  const handleAddWeek = async (title: string, description: string, startDate: string, endDate: string, plan: Plan) => {
      if (!user) return;
      await supabase.from('weeks').insert({ project_id: project.id, user_id: user.id, title, description, start_date: startDate, end_date: endDate, status: 'draft', plan });
  }

  const handleDeleteWeek = async () => {
      if (!weekToDelete) return;
      await supabase.from('weeks').delete().eq('id', weekToDelete.id);
      setWeekToDelete(null);
  }

  const handleOpenReport = async (week: Week) => {
      const { data: companyData } = await supabase.from('company_profiles').select('*').eq('project_id', project.id).single();
      setCompanyForReport(companyData);
      setSelectedWeekForReport(week);
      setIsAiReportModalOpen(true);
  }

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <button onClick={onBack} className="flex items-center text-blue-600 hover:underline"><FaArrowLeft className="mr-2" /> Назад ко всем проектам</button>
        {isAuditor && (
            <div className="flex items-center space-x-2">
                <button onClick={() => setIsAddWeekModalOpen(true)} className="flex items-center btn-primary"><FaPlus className="mr-2" /> Добавить этап</button>
                <button onClick={() => setIsSettingsModalOpen(true)} className="p-3 btn-secondary leading-none"><FaCog/></button>
            </div>
        )}
      </div>
      
      <div className="space-y-6">
        {weeks.map(week => ( 
            <WeekCard 
                key={week.id} 
                week={week} 
                isAuditor={isAuditor} 
                isGuest={isGuest} 
                project={project} 
                providerToken={providerToken} 
                onUpdatePlan={(plan) => handleUpdatePlan(week.id, plan)} 
                onTaskSelect={(item) => setSelectedTaskForDetail({item, weekId: week.id, projectId: project.id})} 
                onDeleteRequest={() => setWeekToDelete(week)} 
                onUpdateRequest={() => fetchWeeks(false)} 
                onGenerateReport={() => handleOpenReport(week)} 
                onSentForApproval={setWeekToShareForApproval} 
            /> 
        ))}
        {weeks.length === 0 && (<div className="text-center py-16 bg-white rounded-lg shadow-md"><h3 className="text-xl font-semibold text-gray-700">Этапы аудита еще не созданы</h3>{isAuditor && <p className="text-gray-500 mt-2">Добавьте первый этап.</p>}</div>)}
      </div>

      {isAuditor && <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} project={project} onProjectUpdate={onBack} />}
      {isAuditor && <AddWeekModal isOpen={isAddWeekModalOpen} onClose={() => setIsAddWeekModalOpen(false)} onAddWeek={handleAddWeek} />}
      
       <TaskDetailView isOpen={!!selectedTaskForDetail} onClose={() => setSelectedTaskForDetail(null)} user={user} providerToken={providerToken} context={selectedTaskForDetail!} onEventCountChange={handleEventCountChange} onUpdateTask={handleUpdateTask} isGuest={isGuest} project={project} onSubTaskAdded={(parent, sub) => sendGuestSubTaskNotification(project, parent, sub, window.location.origin)} />
       <ConfirmationModal isOpen={!!weekToDelete} onClose={() => setWeekToDelete(null)} onConfirm={handleDeleteWeek} title="Удалить этап?" message={`Вы уверены, что хотите удалить этап "${weekToDelete?.title}"?`} />

       {selectedWeekForReport && isAuditor && <AiReportModal isOpen={isAiReportModalOpen} onClose={() => setSelectedWeekForReport(null)} week={selectedWeekForReport} project={project} auditor={profile} company={companyForReport} providerToken={providerToken} onUpdate={() => fetchWeeks(false)} />}
       {weekToShareForApproval && <ApprovalShareModal isOpen={!!weekToShareForApproval} onClose={() => setWeekToShareForApproval(null)} week={weekToShareForApproval} project={project} />}
    </div>
  );
};

export default AuditView;
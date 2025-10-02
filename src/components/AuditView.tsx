import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { Project, Week, Plan, PlanItem, Profile, CompanyProfile } from '../types';
import { supabase, sendGuestStatusChangeNotification } from '../services/supabaseClient';
import { Spinner } from './ui/Spinner';
import { FaArrowLeft, FaCog, FaShareAlt, FaPlus } from 'react-icons/fa';
import WeekCard from './WeekCard';
import SettingsModal from './SettingsModal';
import ShareModal from './ShareModal';
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
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAddWeekModalOpen, setIsAddWeekModalOpen] = useState(false);
  const [isAiReportModalOpen, setIsAiReportModalOpen] = useState(false);
  const [selectedWeekForReport, setSelectedWeekForReport] = useState<Week | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);

  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<{ item: PlanItem; weekId: string; projectId: string; } | null>(null);
  const [weekToDelete, setWeekToDelete] = useState<Week | null>(null);
  const [weekToShare, setWeekToShare] = useState<Week | null>(null);


  const fetchWeeks = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const { data, error } = await supabase
      .from('weeks')
      .select('*')
      .eq('project_id', project.id)
      .order('start_date', { ascending: true });

    if (error) {
      console.error('Error fetching weeks:', error);
    } else {
      setWeeks(data || []);
    }
    if (showLoading) setLoading(false);
  }, [project.id]);

  const fetchCompanyProfile = useCallback(async () => {
    const { data } = await supabase.from('company_profiles').select('*').eq('project_id', project.id).single();
    setCompanyProfile(data);
  }, [project.id]);

  useEffect(() => {
    fetchWeeks();
    fetchCompanyProfile();
  }, [fetchWeeks, fetchCompanyProfile]);

  useEffect(() => {
      if (initialTaskId && weeks.length > 0) {
          for (const week of weeks) {
              for (const date in week.plan) {
                  const task = week.plan[date]?.tasks?.find(t => t.id === initialTaskId);
                  if (task) {
                      setSelectedTaskForDetail({ item: task, weekId: week.id, projectId: project.id });
                      // Clear the task from the URL to avoid re-opening
                      const url = new URL(window.location.toString());
                      url.searchParams.delete('taskId');
                      window.history.replaceState({}, '', url.toString());
                      return;
                  }
              }
          }
      }
  }, [initialTaskId, weeks, project.id]);
  
  useEffect(() => {
    const channel = supabase.channel(`public:weeks:project_id=eq.${project.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weeks', filter: `project_id=eq.${project.id}` }, 
        () => fetchWeeks(false)
      )
      .subscribe();
    
    return () => {
        supabase.removeChannel(channel);
    }
  }, [project.id, fetchWeeks]);

  const handleUpdatePlan = async (weekId: string, newPlan: Plan) => {
    const { error } = await supabase.from('weeks').update({ plan: newPlan }).eq('id', weekId);
    if (error) {
      alert('Ошибка обновления плана: ' + error.message);
    }
  };

  const handleUpdateTask = async (weekId: string, updatedTask: PlanItem) => {
    const weekToUpdate = weeks.find(w => w.id === weekId);
    if (!weekToUpdate) return;

    let taskFound = false;
    const newPlan = JSON.parse(JSON.stringify(weekToUpdate.plan));

    for (const date in newPlan) {
        const day = newPlan[date];
        const taskIndex = day.tasks.findIndex((t: PlanItem) => t.id === updatedTask.id);
        if (taskIndex !== -1) {
            day.tasks[taskIndex] = updatedTask;
            taskFound = true;
            break;
        }
    }
    if (taskFound) {
        setWeeks(currentWeeks => currentWeeks.map(w => w.id === weekId ? { ...w, plan: newPlan } : w));
        const { error } = await supabase.from('weeks').update({ plan: newPlan }).eq('id', weekId);
        if(error) {
            alert("Ошибка синхронизации: " + error.message);
            fetchWeeks(false);
        }
    }
  };

  const handleSubTaskAdded = (parentTask: PlanItem, newSubTask: PlanItem) => {
      if (!selectedTaskForDetail) return;
      const updatedParentTask = { ...parentTask, sub_tasks: [...(parentTask.sub_tasks || []), newSubTask]};
      handleUpdateTask(selectedTaskForDetail.weekId, updatedParentTask);
      if (isGuest) {
          sendGuestSubTaskNotification(project, parentTask, newSubTask, window.location.origin);
      }
  };
  
   const handleEventCountChange = async (weekId: string, taskId: string, change: 1 | -1) => {
        const weekToUpdate = weeks.find(w => w.id === weekId);
        if (!weekToUpdate) return;

        let taskFound = false;
        const newPlan = { ...weekToUpdate.plan };

        for (const date in newPlan) {
            const day = newPlan[date];
            const taskIndex = day.tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                const currentCount = day.tasks[taskIndex].event_count || 0;
                day.tasks[taskIndex].event_count = Math.max(0, currentCount + change);
                taskFound = true;
                break;
            }
        }

        if (taskFound) {
            setWeeks(currentWeeks => currentWeeks.map(w => w.id === weekId ? { ...w, plan: newPlan } : w));
            const { error } = await supabase.from('weeks').update({ plan: newPlan }).eq('id', weekId);
            if(error) {
                alert("Ошибка синхронизации: " + error.message);
                fetchWeeks(false);
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

  const handleOpenReport = (week: Week) => {
      setSelectedWeekForReport(week);
      setIsAiReportModalOpen(true);
  }

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <button onClick={onBack} className="flex items-center text-blue-600 hover:underline">
          <FaArrowLeft className="mr-2" />
          Назад к проектам
        </button>
        <div className="flex items-center space-x-2">
          {isAuditor && <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 btn-secondary" title="Настройки проекта"><FaCog/></button>}
          {isAuditor && <button onClick={() => setIsShareModalOpen(true)} className="p-2 btn-secondary" title="Поделиться проектом"><FaShareAlt/></button>}
        </div>
      </div>
      
      {isAuditor && (
        <div className="flex justify-end mb-6">
            <button onClick={() => setIsAddWeekModalOpen(true)} className="flex items-center btn-primary"><FaPlus className="mr-2" /> Добавить этап</button>
        </div>
      )}

      <div className="space-y-6">
        {weeks.map(week => (
            <WeekCard 
              key={week.id} 
              week={week} 
              isAuditor={isAuditor}
              isGuest={isGuest}
              project={project}
              profile={profile}
              providerToken={providerToken}
              onUpdatePlan={(plan) => handleUpdatePlan(week.id, plan)}
              onTaskSelect={(item) => setSelectedTaskForDetail({item, weekId: week.id, projectId: project.id})}
              onDeleteRequest={() => setWeekToDelete(week)}
              onUpdateRequest={() => fetchWeeks(false)}
              onGenerateReport={() => handleOpenReport(week)}
              onSentForApproval={(w) => setWeekToShare(w)}
              onUpdateTask={(updatedTask) => handleUpdateTask(week.id, updatedTask)}
          />
        ))}
        {weeks.length === 0 && (
            <div className="text-center py-16 bg-white rounded-lg shadow-md">
              <h3 className="text-xl font-semibold text-gray-700">Этапы аудита еще не созданы</h3>
              {isAuditor && <p className="text-gray-500 mt-2">Добавьте первый этап, чтобы начать планирование.</p>}
            </div>
        )}
      </div>

      {isAuditor && <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} project={project} onProjectUpdate={onBack}/>}
      {isAuditor && <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} project={project}/>}
      {isAuditor && <AddWeekModal isOpen={isAddWeekModalOpen} onClose={() => setIsAddWeekModalOpen(false)} onAddWeek={handleAddWeek}/>}
      
      {selectedTaskForDetail && (
          <TaskDetailView 
              isOpen={!!selectedTaskForDetail}
              onClose={() => setSelectedTaskForDetail(null)}
              user={user}
              providerToken={providerToken}
              context={selectedTaskForDetail}
              onEventCountChange={handleEventCountChange}
              onUpdateTask={(updatedTask) => handleUpdateTask(selectedTaskForDetail.weekId, updatedTask)}
              isAuditor={isAuditor}
              isGuest={isGuest}
              project={project}
              onSubTaskAdded={handleSubTaskAdded}
          />
      )}

      <ConfirmationModal isOpen={!!weekToDelete} onClose={() => setWeekToDelete(null)} onConfirm={handleDeleteWeek} title="Удалить этап?" message={`Вы уверены, что хотите удалить этап "${weekToDelete?.title}" и все связанные с ним задачи?`}/>
      
      {weekToShare && <ApprovalShareModal isOpen={!!weekToShare} onClose={() => setWeekToShare(null)} project={project} week={weekToShare} />}
      
      {selectedWeekForReport && <AiReportModal isOpen={isAiReportModalOpen} onClose={() => {setIsAiReportModalOpen(false); setSelectedWeekForReport(null);}} week={selectedWeekForReport} project={project} auditor={profile} company={companyProfile} providerToken={providerToken} onUpdate={() => fetchWeeks(false)}/>}
    </div>
  );
};

export default AuditView;

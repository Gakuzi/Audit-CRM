// src/components/AuditView.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { Project, Week, Plan, PlanItem, Profile, CompanyProfile, ContactPerson } from '../types';
import { supabase, sendGuestSubTaskNotification } from '../services/supabaseClient';
import { Spinner } from './ui/Spinner';
import { FaCog, FaPlus, FaUsers } from 'react-icons/fa';
import WeekCard from './WeekCard';
import SettingsModal from './SettingsModal';
import AddWeekModal from './AddWeekModal';
import TaskDetailView from './TaskDetailView';
import ConfirmationModal from './ConfirmationModal';
import AiReportModal from './AiReportModal';
import CompanyProfileModal from './CompanyProfileModal';
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
  onContactClick: (contactId: string) => void;
}

const AuditView: React.FC<AuditViewProps> = ({ project, user, profile, providerToken, onBack, isAuditor, isGuest, initialTaskId, onContactClick }) => {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCompanyProfileModalOpen, setIsCompanyProfileModalOpen] = useState(false);
  
  const [isAddWeekModalOpen, setIsAddWeekModalOpen] = useState(false);
  const [isAiReportModalOpen, setIsAiReportModalOpen] = useState(false);
  const [selectedWeekForReport, setSelectedWeekForReport] = useState<Week | null>(null);
  const [weekToShareForApproval, setWeekToShareForApproval] = useState<Week | null>(null);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<{ item: PlanItem; weekId: string; } | null>(null);
  const [weekToDelete, setWeekToDelete] = useState<Week | null>(null);

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const weeksPromise = supabase
      .from('weeks')
      .select('*')
      .eq('project_id', project.id)
      .order('start_date', { ascending: true });
    
    const profilePromise = supabase
      .from('company_profiles')
      .select('*')
      .eq('project_id', project.id)
      .single();

    const [weeksResult, profileResult] = await Promise.all([weeksPromise, profilePromise]);

    if (weeksResult.error) {
      console.error('Error fetching weeks:', weeksResult.error);
    } else {
      setWeeks(weeksResult.data || []);
    }
    
    if (profileResult.error && profileResult.error.code !== 'PGRST116') {
      console.error('Error fetching company profile:', profileResult.error);
    } else {
      setCompanyProfile(profileResult.data);
    }

    if (showLoading) setLoading(false);
  }, [project.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleOpenTaskById = useCallback((taskId: string) => {
      for (const week of weeks) {
        for (const date in week.plan) {
          const task = week.plan[date]?.tasks?.find(t => t.id === taskId);
          if (task) {
            setSelectedTaskForDetail({ item: task, weekId: week.id });
            return;
          }
        }
      }
  }, [weeks]);

  useEffect(() => {
    if (initialTaskId && weeks.length > 0 && !selectedTaskForDetail) {
      handleOpenTaskById(initialTaskId);
      const url = new URL(window.location.href);
      url.searchParams.delete('taskId');
      window.history.replaceState({}, '', url.toString());
    }
  }, [initialTaskId, weeks, selectedTaskForDetail, handleOpenTaskById]);

  useEffect(() => {
    const channel = supabase.channel(`public:weeks:project_id=eq.${project.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weeks', filter: `project_id=eq.${project.id}` }, 
        () => fetchData(false)
      )
      .subscribe();
    const companyChannel = supabase.channel(`public:company_profiles:project_id=eq.${project.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'company_profiles', filter: `project_id=eq.${project.id}`},
        () => fetchData(false)
      )
      .subscribe();
    return () => { 
        supabase.removeChannel(channel); 
        supabase.removeChannel(companyChannel);
    }
  }, [project.id, fetchData]);
  
  const handleUpdatePlan = async (weekId: string, newPlan: Plan) => {
    const { error } = await supabase.from('weeks').update({ plan: newPlan }).eq('id', weekId);
    if (error) {
      alert('Ошибка обновления плана: ' + error.message);
    } else {
      fetchData(false);
    }
  };

  const handleUpdateTask = async (weekId: string, updatedTask: PlanItem) => {
    const weekToUpdate = weeks.find(w => w.id === weekId);
    if (!weekToUpdate) return;
    
    let taskFound = false;
    const newPlan = { ...weekToUpdate.plan };
    for (const date in newPlan) {
      const day = newPlan[date];
      const taskIndex = day.tasks.findIndex(t => t.id === updatedTask.id);
      if (taskIndex > -1) {
        day.tasks[taskIndex] = updatedTask;
        taskFound = true;
        break;
      }
    }

    if(taskFound) {
        await handleUpdatePlan(weekId, newPlan);
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
        fetchData(false);
      }
    }
  };

  const handleAddWeek = async (title: string, description: string, startDate: string, endDate: string, plan: Plan) => {
      if (!user) return;
      const { error } = await supabase.from('weeks').insert({
          project_id: project.id, user_id: user.id, title, description,
          start_date: startDate, end_date: endDate, status: 'draft', plan: plan
      });
      if (error) {
          alert("Ошибка добавления этапа: " + error.message);
      } else {
        fetchData(false);
      }
  };

  const handleDeleteWeek = async () => {
      if (!weekToDelete) return;
      const { error } = await supabase.from('weeks').delete().eq('id', weekToDelete.id);
      if (error) {
          alert('Ошибка удаления: ' + error.message);
      } else {
        fetchData(false);
      }
      setWeekToDelete(null);
  };

  const handleOpenReport = (week: Week) => {
      setSelectedWeekForReport(week);
      setIsAiReportModalOpen(true);
  };
  
  const handleContactsUpdate = useCallback(() => {
    fetchData(false);
  }, [fetchData]);

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
  
  const selectedWeekForDetail = selectedTaskForDetail ? weeks.find(w => w.id === selectedTaskForDetail.weekId) : null;

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <button onClick={() => setIsCompanyProfileModalOpen(true)} className="flex items-center gap-2 text-sm btn-secondary">
          <FaUsers /> Контакты компании
        </button>
        {isAuditor && (
            <div className="flex items-center space-x-2">
                <button onClick={() => setIsAddWeekModalOpen(true)} className="flex items-center btn-primary"><FaPlus className="mr-2" /> Добавить этап</button>
                <button onClick={() => setIsSettingsModalOpen(true)} className="p-3 btn-secondary leading-none"><FaCog/></button>
            </div>
        )}
      </div>
      
      <div className="space-y-6">
        {weeks.length > 0 ? weeks.map(week => ( 
            <WeekCard 
                key={week.id} week={week} isAuditor={isAuditor} isGuest={isGuest} project={project} profile={profile} companyProfile={companyProfile}
                providerToken={providerToken} onUpdatePlan={(plan) => handleUpdatePlan(week.id, plan)} 
                onTaskSelect={(item) => setSelectedTaskForDetail({item, weekId: week.id})} 
                onDeleteRequest={() => setWeekToDelete(week)} onUpdateRequest={() => fetchData(false)} onGenerateReport={() => handleOpenReport(week)} 
                onSentForApproval={setWeekToShareForApproval} onUpdateTask={handleUpdateTask} onContactClick={onContactClick}
                onContactsUpdate={handleContactsUpdate}
            /> 
        )) : (
            <div className="text-center py-16 bg-white rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-gray-700">Этапы аудита еще не созданы</h3>
                {isAuditor && <p className="text-gray-500 mt-2">Добавьте первый этап, чтобы начать планирование.</p>}
             </div>
        )}
      </div>

      {isAuditor && <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} project={project} onProjectUpdate={onBack} />}
      
      <CompanyProfileModal 
        isOpen={isCompanyProfileModalOpen} 
        onClose={() => setIsCompanyProfileModalOpen(false)} 
        project={project} 
        isAuditor={isAuditor}
        onContactSelect={(contactId) => {
          setIsCompanyProfileModalOpen(false);
          setTimeout(() => onContactClick(contactId), 150);
        }}
      />
      
       {isAuditor && <AddWeekModal isOpen={isAddWeekModalOpen} onClose={() => setIsAddWeekModalOpen(false)} onAddWeek={handleAddWeek} />}

       {selectedTaskForDetail && (
         <TaskDetailView 
            isOpen={!!selectedTaskForDetail} 
            onClose={() => setSelectedTaskForDetail(null)} 
            user={user} providerToken={providerToken} 
            context={{...selectedTaskForDetail, projectId: project.id}} 
            companyProfile={companyProfile} 
            onEventCountChange={handleEventCountChange} 
            onUpdateTask={handleUpdateTask} 
            isAuditor={isAuditor} 
            isGuest={isGuest} 
            project={project} 
            onSubTaskAdded={(parent, sub) => sendGuestSubTaskNotification(project, parent, sub, window.location.origin)} 
            week={selectedWeekForDetail ?? null}
            onContactClick={onContactClick}
            onContactsUpdate={handleContactsUpdate}
          />
       )}

       <ConfirmationModal 
          isOpen={!!weekToDelete}
          onClose={() => setWeekToDelete(null)}
          onConfirm={handleDeleteWeek}
          title="Удалить этап?"
          message={`Вы уверены, что хотите удалить этап "${weekToDelete?.title}" и все связанные с ним задачи?`}
       />

       {selectedWeekForReport && (
          <AiReportModal
            isOpen={isAiReportModalOpen}
            onClose={() => { setIsAiReportModalOpen(false); setSelectedWeekForReport(null); }}
            week={selectedWeekForReport} project={project}
            auditor={profile} company={companyProfile} providerToken={providerToken}
            onUpdate={() => fetchData(false)}
           />
       )}
       
       <ApprovalShareModal
            isOpen={!!weekToShareForApproval}
            onClose={() => setWeekToShareForApproval(null)}
            project={project}
            week={weekToShareForApproval}
        />
    </div>
  );
};

export default AuditView;
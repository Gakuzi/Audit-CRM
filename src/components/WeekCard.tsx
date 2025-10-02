import React, { useState, useEffect, useRef } from 'react';
import { Week, Plan, PlanItem, WeekStatus, Project, Profile } from '../types';
import { supabase, sendGuestStatusChangeNotification } from '../services/supabaseClient';
import { FaChevronDown, FaChevronUp, FaEdit, FaTrash, FaPlus, FaBrain, FaCheckCircle, FaCalendarAlt, FaPaperPlane } from 'react-icons/fa';
import DayPlanView from './DayPlanView';
import EditWeekModal from './EditWeekModal';
import AddDayModal from './AddDayModal';
import WeekStats from './WeekStats';
import WeekHistoryFeed from './WeekHistoryFeed';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface WeekCardProps {
  week: Week;
  isAuditor: boolean;
  isGuest: boolean;
  project: Project;
  profile: Profile | null;
  providerToken: string | null;
  onUpdatePlan: (plan: Plan) => void;
  onTaskSelect: (item: PlanItem) => void;
  onDeleteRequest: () => void;
  onUpdateRequest: () => void;
  onGenerateReport: () => void;
  onSentForApproval: (week: Week) => void;
  onUpdateTask: (weekId: string, updatedTask: PlanItem) => void;
}

const statusConfig: { [key in Week['status']]: { label: string; color: string; } } = {
    draft: { label: 'Черновик', color: 'bg-gray-200 text-gray-800' },
    pending_approval: { label: 'На согласовании', color: 'bg-yellow-200 text-yellow-800' },
    approved: { label: 'Согласовано', color: 'bg-green-200 text-green-800' },
    rejected: { label: 'Отклонено', color: 'bg-red-200 text-red-800' },
    completed: { label: 'Завершен', color: 'bg-blue-200 text-blue-800' },
};

const WeekCard: React.FC<WeekCardProps> = ({ week, isAuditor, isGuest, project, profile, providerToken, onUpdatePlan, onTaskSelect, onDeleteRequest, onUpdateRequest, onGenerateReport, onSentForApproval, onUpdateTask }) => {
  const isCurrentWeek = () => {
      const today = new Date();
      today.setHours(0,0,0,0);
      const startDate = new Date(week.start_date + 'T00:00:00');
      const endDate = new Date(week.end_date + 'T00:00:00');
      return today >= startDate && today <= endDate;
  };

  const [isExpanded, setIsExpanded] = useState(isCurrentWeek());
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddDayModalOpen, setIsAddDayModalOpen] = useState(false);
  const [rejectionComment, setRejectionComment] = useState(week.rejection_comment || '');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);


  const handleStatusChange = async (newStatus: Week['status']) => {
    const updateData: Partial<Week> = { status: newStatus };
    let reason: string | null = null;

    if (newStatus === 'rejected') {
        const comment = prompt("Пожалуйста, укажите причину отклонения:", rejectionComment || undefined);
        if (comment === null) return; // User cancelled prompt
        updateData.rejection_comment = comment;
        reason = comment;
        setRejectionComment(comment);
    } else {
        updateData.rejection_comment = null;
    }

    const { error } = await supabase.from('weeks').update(updateData).eq('id', week.id);
    if (error) {
      alert('Ошибка изменения статуса: ' + error.message);
    } else {
      if (isGuest && (newStatus === 'approved' || newStatus === 'rejected')) {
        const guestName = localStorage.getItem('guestName') || 'Гость';
        sendGuestStatusChangeNotification(project, week, newStatus, guestName, reason, window.location.origin);
      }
      if (newStatus === 'pending_approval') {
        onSentForApproval(week);
      }
      onUpdateRequest();
    }
  };

  const allTasks = Object.keys(week.plan).flatMap(date => week.plan[date]?.tasks || []);
  
  const handleUpdateTask = (updatedTask: PlanItem) => {
    const newPlan = JSON.parse(JSON.stringify(week.plan));
    for (const date in newPlan) {
        const taskIndex = newPlan[date].tasks.findIndex((t: PlanItem) => t.id === updatedTask.id);
        if (taskIndex > -1) {
            newPlan[date].tasks[taskIndex] = updatedTask;
            onUpdatePlan(newPlan);
            return;
        }
    }
  };

   // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getActionButtons = () => {
    const canComplete = isAuditor && allTasks.every(t => t.completed);
    switch (week.status) {
        case 'draft':
            return isAuditor && (
                <button 
                    onClick={() => handleStatusChange('pending_approval')} 
                    className="bg-blue-600 text-white font-bold py-2 px-5 rounded-full inline-flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-105"
                >
                    <FaPaperPlane />
                    Отправить на согласование
                </button>
            );
        case 'pending_approval':
            return isGuest && (
                <div className="flex gap-2">
                    <button onClick={() => handleStatusChange('rejected')} className="btn-secondary bg-red-500 text-white hover:bg-red-600">Отклонить</button>
                    <button onClick={() => handleStatusChange('approved')} className="btn-primary bg-green-600 hover:bg-green-700">Согласовать</button>
                </div>
            );
        case 'approved':
             return canComplete && <button onClick={() => handleStatusChange('completed')} className="btn-primary flex items-center gap-2"><FaCheckCircle/> Завершить этап</button>;
        case 'rejected':
             return isAuditor && <button onClick={() => handleStatusChange('draft')} className="btn-secondary">Вернуть в черновик</button>;
        case 'completed':
             return isAuditor && <button onClick={onGenerateReport} className="btn-primary bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"><FaBrain/> Отчет с AI</button>;
        default:
            return null;
    }
  }
  
  const descriptionNeedsTruncation = (week.description?.length || 0) > 150;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300">
      <header
        className="p-4 cursor-pointer border-b"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-start mb-3">
            <div className="flex-1 pr-4 min-w-0">
                <h2 className="text-xl font-bold text-gray-800 break-words">{week.title}</h2>
                 <div className="text-sm text-gray-500 mt-1">
                    <div className={`prose prose-sm max-w-none break-words ${!isDescriptionExpanded && descriptionNeedsTruncation ? 'line-clamp-3' : ''}`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{week.description || "Нет описания."}</ReactMarkdown>
                    </div>
                    {descriptionNeedsTruncation && (
                         <button 
                            onClick={(e) => { e.stopPropagation(); setIsDescriptionExpanded(!isDescriptionExpanded); }} 
                            className="text-xs text-blue-600 hover:underline mt-1 font-semibold"
                        >
                            {isDescriptionExpanded ? 'Свернуть' : 'Читать далее'}
                        </button>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-4">
                 {isAuditor && week.status === 'draft' && (
                     <>
                        <button onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }} title="Редактировать этап" className="p-2 text-gray-500 hover:text-blue-600"><FaEdit /></button>
                        <button onClick={(e) => { e.stopPropagation(); onDeleteRequest(); }} title="Удалить этап" className="p-2 text-gray-500 hover:text-red-600"><FaTrash /></button>
                     </>
                 )}
                <button className="p-2">
                    {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                </button>
            </div>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-600 flex-wrap gap-2">
           <div className="flex items-center gap-2">
                <FaCalendarAlt/>
                <span>{new Date(week.start_date + 'T00:00:00').toLocaleDateString()} - {new Date(week.end_date + 'T00:00:00').toLocaleDateString()}</span>
           </div>
           
            <div className="relative" ref={statusRef}>
                 <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isAuditor) setIsStatusDropdownOpen(prev => !prev);
                    }}
                    className={`px-3 py-1 font-semibold rounded-full ${statusConfig[week.status].color} ${isAuditor ? 'cursor-pointer hover:ring-2 ring-offset-1' : ''}`}
                    title={isAuditor ? "Изменить статус" : ""}
                 >
                    {statusConfig[week.status].label}
                </button>
                {isAuditor && isStatusDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white border rounded-md shadow-lg z-20">
                        {Object.keys(statusConfig).map(statusKey => (
                             <a
                                key={statusKey}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(statusKey as WeekStatus);
                                    setIsStatusDropdownOpen(false);
                                }}
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                            >
                                {statusConfig[statusKey as WeekStatus].label}
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </header>

      {isExpanded && (
        <div className="p-4 bg-gray-50/50">
            <WeekStats week={week} />
            {week.rejection_comment && week.status === 'rejected' && (
                <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-800">
                    <p className="font-bold">Причина отклонения:</p>
                    <p>{week.rejection_comment}</p>
                </div>
            )}
            
            <div className="mt-4">
              <DayPlanView 
                  week={week}
                  onUpdatePlan={onUpdatePlan}
                  onTaskSelect={onTaskSelect}
                  isAuditor={isAuditor}
                  onUpdateTask={(updatedTask) => onUpdateTask(week.id, updatedTask)}
                  profile={profile}
                  providerToken={providerToken}
              />
            </div>
            
            <div className="mt-6 pt-4 border-t flex justify-between items-center flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    {getActionButtons()}
                </div>
                {isAuditor && (week.status === 'draft' || week.status === 'approved') && (
                     <button onClick={() => setIsAddDayModalOpen(true)} className="flex items-center text-sm btn-secondary">
                        <FaPlus className="mr-2"/> Добавить день
                    </button>
                )}
            </div>

             <div className="mt-6">
                <WeekHistoryFeed weekId={week.id} onTaskSelect={onTaskSelect} allTasks={allTasks} />
            </div>

        </div>
      )}
      
      {isAuditor && (
          <>
            <EditWeekModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                week={week}
                onUpdate={onUpdateRequest}
            />
            <AddDayModal
                isOpen={isAddDayModalOpen}
                onClose={() => setIsAddDayModalOpen(false)}
                week={week}
                onUpdatePlan={onUpdatePlan}
            />
          </>
      )}

    </div>
  );
};

export default WeekCard;
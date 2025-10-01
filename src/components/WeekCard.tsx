import React, { useState, useEffect, useRef } from 'react';
import { Week, Plan, PlanItem, WeekStatus } from '../types';
import { supabase, sendGuestStatusChangeNotification } from '../services/supabaseClient';
import { FaChevronDown, FaChevronUp, FaEdit, FaTrash, FaPlus, FaBrain, FaCheckCircle, FaCalendarAlt, FaFileAlt, FaPaperPlane, FaArrowRight } from 'react-icons/fa';
import DayPlanView from './DayPlanView';
import EditWeekModal from './EditWeekModal';
import AddDayModal from './AddDayModal';
import WeekStats from './WeekStats';
import ConfirmationModal from './ConfirmationModal';
import WeekHistoryFeed from './WeekHistoryFeed';
import ReactMarkdown from 'react-markdown';
import { useSwipe } from '../hooks/useSwipe';

interface WeekCardProps {
  week: Week;
  isAuditor: boolean;
  isGuest: boolean;
  onRegister: () => void;
  onUpdatePlan: (plan: Plan) => void;
  onTaskSelect: (item: PlanItem) => void;
  onDeleteRequest: () => void;
  onUpdateRequest: () => void;
  onGenerateReport: () => void;
}

const statusConfig: { [key in Week['status']]: { label: string; color: string; } } = {
    draft: { label: 'Черновик', color: 'bg-gray-200 text-gray-800' },
    pending_approval: { label: 'Ожидает согласования', color: 'bg-yellow-200 text-yellow-800' },
    approved: { label: 'Согласовано', color: 'bg-green-200 text-green-800' },
    rejected: { label: 'Отклонено', color: 'bg-red-200 text-red-800' },
    completed: { label: 'Завершен', color: 'bg-blue-200 text-blue-800' },
};

const WeekCard: React.FC<WeekCardProps> = ({ week, isAuditor, isGuest, onRegister, onUpdatePlan, onTaskSelect, onDeleteRequest, onUpdateRequest, onGenerateReport }) => {
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
  const [showStatusChangeConfirm, setShowStatusChangeConfirm] = useState<WeekStatus | null>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  
  const getNextStatus = (): WeekStatus | null => {
    if (isAuditor) {
      switch(week.status) {
        case 'draft': return 'pending_approval';
        case 'rejected': return 'draft';
        case 'approved': return 'completed';
        default: return null;
      }
    } else { // Client or Guest
      if (week.status === 'pending_approval') return 'approved';
    }
    return null;
  };
  
  const handleSwipeRight = () => {
    const nextStatus = getNextStatus();
    if (nextStatus) {
      handleStatusChange(nextStatus);
    }
  };
  
  const { ref: swipeRef, style: swipeStyle } = useSwipe({ onSwipeRight: handleSwipeRight, revealWidth: 160 });

  const handleStatusChange = async (newStatus: Week['status'], bypassConfirmation = false) => {
    let guestName: string | null = null;
    let rejectionReason: string | null = null;

    if (isGuest && (newStatus === 'approved' || newStatus === 'rejected')) {
        guestName = localStorage.getItem('guestName');
        if (!guestName) {
            guestName = prompt('Пожалуйста, представьтесь (ваше имя будет видно в истории):', 'Гость');
            if (!guestName || guestName.trim() === '') return;
            localStorage.setItem('guestName', guestName);
        }
    }

    if (week.status === 'approved' && newStatus !== week.status && !bypassConfirmation && !isGuest) {
        setShowStatusChangeConfirm(newStatus);
        return;
    }
    
    const updateData: Partial<Week> = { status: newStatus };

    if (newStatus === 'rejected') {
        const comment = prompt("Пожалуйста, укажите причину отклонения:", rejectionComment);
        if (comment === null) return; // User cancelled prompt
        rejectionReason = comment;
        updateData.rejection_comment = comment;
        setRejectionComment(comment);
    } else if (week.rejection_comment) {
        updateData.rejection_comment = undefined;
    }

    // First, log the event if it's a guest action
    if (isGuest && guestName && (newStatus === 'approved' || newStatus === 'rejected')) {
        const firstDate = Object.keys(week.plan).sort()[0];
        const firstTaskId = week.plan[firstDate]?.tasks[0]?.id;

        if (!firstTaskId) {
            alert("Невозможно изменить статус: в плане нет ни одной задачи для привязки события.");
            return;
        }

        const statusText = newStatus === 'approved' ? 'Согласовано' : 'Отклонено';
        let eventContent = `### Статус этапа изменен\n**Новый статус:** ${statusText}\n**Кем:** ${guestName}`;
        if (rejectionReason) {
            eventContent += `\n**Причина:** ${rejectionReason}`;
        }
        
        const { error: eventError } = await supabase.from('events').insert({
            project_id: week.project_id,
            week_id: week.id,
            task_id: firstTaskId,
            user_id: week.user_id, // Attributed to auditor, but author_email shows guest
            author_email: guestName,
            type: 'comment',
            content: eventContent
        });
        
        if (eventError) {
             alert('Ошибка записи события изменения статуса: ' + eventError.message);
             return;
        }
    }

    // Then, update the week status
    const { data: updatedWeeks, error } = await supabase.from('weeks').update(updateData).eq('id', week.id).select().single();
    if (error) {
      alert('Ошибка изменения статуса: ' + error.message);
    } else {
        if (isGuest && guestName && (newStatus === 'approved' || newStatus === 'rejected')) {
            // Find the project to send notification
            const { data: project } = await supabase.from('projects').select('*').eq('id', week.project_id).single();
            if (project) {
                sendGuestStatusChangeNotification(project, updatedWeeks as Week, newStatus, guestName, rejectionReason, window.location.origin);
            }
        }
        onUpdateRequest();
    }
    setShowStatusChangeConfirm(null);
  };
  
  const allTasks = Object.keys(week.plan).flatMap(date => week.plan[date].tasks);
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(task => (task.event_count || 0) > 0).length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

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
            // Guest or Logged-in client can approve/reject
            return !isAuditor && (
                <div className="flex gap-2">
                    <button onClick={() => handleStatusChange('rejected')} className="btn-secondary bg-red-500 text-white hover:bg-red-600">Отклонить</button>
                    <button onClick={() => handleStatusChange('approved')} className="btn-primary bg-green-600 hover:bg-green-700">Согласовать</button>
                </div>
            );
        case 'approved':
             return isAuditor && <button onClick={() => handleStatusChange('completed')} className="btn-primary flex items-center gap-2"><FaCheckCircle/> Завершить этап</button>;
        case 'rejected':
             return isAuditor && <button onClick={() => handleStatusChange('draft')} className="btn-secondary">Вернуть в черновик</button>;
        case 'completed':
             return isAuditor && (
                week.report_content ? (
                    <button onClick={onGenerateReport} className="btn-primary bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2">
                        <FaFileAlt/> Показать отчет
                    </button>
                ) : (
                    <button onClick={onGenerateReport} className="btn-primary bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2">
                        <FaBrain/> Отчет с AI
                    </button>
                )
             );
        default:
            return null;
    }
  }
  
  const descriptionNeedsTruncation = (week.description?.length || 0) > 150;
  const nextStatus = getNextStatus();

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden touch-only">
      <div className="relative bg-gray-100 rounded-lg overflow-hidden">
         {/* Background Action for Swipe Right */}
         {nextStatus && (
            <div className="absolute inset-y-0 left-0 flex items-center bg-blue-500 text-white px-6">
                <FaArrowRight size={24} />
            </div>
         )}

         {/* Background Actions for Swipe Left */}
         {isAuditor && week.status === 'draft' && (
             <div className="absolute inset-y-0 right-0 flex items-center z-0">
                <button 
                    onClick={() => setIsEditModalOpen(true)}
                    className="h-full bg-blue-500 text-white px-6 flex flex-col items-center justify-center">
                    <FaEdit size={20}/>
                    <span className="text-xs mt-1">Править</span>
                </button>
                 <button 
                    onClick={onDeleteRequest}
                    className="h-full bg-red-500 text-white px-6 flex flex-col items-center justify-center">
                    <FaTrash size={20}/>
                     <span className="text-xs mt-1">Удалить</span>
                </button>
            </div>
         )}
          
        <div ref={swipeRef} style={swipeStyle} className="relative bg-white z-10 touch-pan-y">
          <header
            className="p-4 cursor-pointer border-b"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1 pr-4">
                    <h2 className="text-xl font-bold text-gray-800 truncate">{week.title}</h2>
                     <div className="text-sm text-gray-500 mt-1">
                        <div className={`prose prose-sm max-w-none ${!isDescriptionExpanded && descriptionNeedsTruncation ? 'line-clamp-3' : ''}`}>
                            <ReactMarkdown>{week.description || "Нет описания."}</ReactMarkdown>
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
                         <div className="hidden md:flex">
                            <button onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }} title="Редактировать этап" className="p-2 text-gray-500 hover:text-blue-600"><FaEdit /></button>
                            <button onClick={(e) => { e.stopPropagation(); onDeleteRequest(); }} title="Удалить этап" className="p-2 text-gray-500 hover:text-red-600"><FaTrash /></button>
                         </div>
                     )}
                    <button className="p-2">
                        {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                    </button>
                </div>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2 flex-wrap gap-2">
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
            <div>
                 <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
          </header>

          {isExpanded && (
            <div className="p-4 bg-gray-50/50">
                {week.rejection_comment && week.status === 'rejected' && (
                    <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-800">
                        <p className="font-bold">Причина отклонения:</p>
                        <p>{week.rejection_comment}</p>
                    </div>
                )}
                
                <DayPlanView 
                    week={week}
                    onUpdatePlan={onUpdatePlan}
                    onTaskSelect={onTaskSelect}
                    isAuditor={isAuditor}
                />
                
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

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <WeekStats week={week} />
                    </div>
                    <div className="lg:col-span-2">
                       <WeekHistoryFeed weekId={week.id} onTaskSelect={onTaskSelect} allTasks={allTasks} />
                    </div>
                </div>

            </div>
          )}
        </div>
      </div>
      
      <ConfirmationModal
        isOpen={!!showStatusChangeConfirm}
        onClose={() => setShowStatusChangeConfirm(null)}
        onConfirm={() => handleStatusChange(showStatusChangeConfirm!, true)}
        title="Изменить согласованный этап?"
        message="Этот этап уже был согласован. Внесение изменений в статус уведомит заказчика. Вы уверены, что хотите продолжить?"
      />

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
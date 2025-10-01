import React, { useState, useEffect, useRef } from 'react';
import { Week, Plan, PlanItem, WeekStatus, Project } from '../types';
import { supabase, sendGuestStatusChangeNotification } from '../services/supabaseClient';
import { FaChevronDown, FaChevronUp, FaEdit, FaTrash, FaPlus, FaBrain, FaCheckCircle, FaCalendarAlt, FaPaperPlane, FaCheck, FaBan } from 'react-icons/fa';
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
  project: Project;
  isAuditor: boolean;
  isGuest: boolean;
  onUpdatePlan: (plan: Plan) => void;
  onTaskSelect: (item: PlanItem) => void;
  onDeleteRequest: () => void;
  onUpdateRequest: () => void;
  onGenerateReport: () => void;
  onSentForApproval: (week: Week) => void;
}

const statusConfig: { [key in Week['status']]: { label: string; color: string; } } = {
    draft: { label: 'Черновик', color: 'bg-gray-200 text-gray-800' },
    pending_approval: { label: 'На согласовании', color: 'bg-yellow-200 text-yellow-800' },
    approved: { label: 'Согласовано', color: 'bg-green-200 text-green-800' },
    rejected: { label: 'Отклонено', color: 'bg-red-200 text-red-800' },
    completed: { label: 'Завершен', color: 'bg-blue-200 text-blue-800' },
};

const WeekCard: React.FC<WeekCardProps> = ({ project, week, isAuditor, isGuest, onUpdatePlan, onTaskSelect, onDeleteRequest, onUpdateRequest, onGenerateReport, onSentForApproval }) => {
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

  const swipeActionsEnabled = isGuest && week.status === 'pending_approval';

  const { ref, style } = useSwipe({
    onSwipeLeftAction: swipeActionsEnabled ? () => handleStatusChange('rejected') : undefined,
    onSwipeRightAction: swipeActionsEnabled ? () => handleStatusChange('approved') : undefined,
    leftRevealWidth: swipeActionsEnabled ? 80 : 0,
    rightRevealWidth: swipeActionsEnabled ? 80 : 0,
  });


  const handleStatusChange = async (newStatus: Week['status'], bypassConfirmation = false) => {
    let rejectionReason: string | null = null;

    if (isGuest && (newStatus === 'approved' || newStatus === 'rejected')) {
        let guestName = localStorage.getItem('guestName');
        if (!guestName) {
            guestName = prompt('Пожалуйста, представьтесь (ваше имя будет видно в истории изменений):', 'Гость');
            if (!guestName || guestName.trim() === '') return;
            localStorage.setItem('guestName', guestName);
        }
        
        if (newStatus === 'rejected') {
            rejectionReason = prompt("Пожалуйста, укажите причину отклонения:");
            if (rejectionReason === null) return;
        }
        
        const updateData: Partial<Week> = { status: newStatus, rejection_comment: rejectionReason };
        const { error } = await supabase.from('weeks').update(updateData).eq('id', week.id);
        if (error) {
            alert('Ошибка изменения статуса: ' + error.message);
        } else {
            sendGuestStatusChangeNotification(project, week, newStatus, guestName, rejectionReason, window.location.origin);
            onUpdateRequest();
        }
        setShowStatusChangeConfirm(null);
        return;
    }

    // Auditor logic below
    if (week.status === 'approved' && newStatus !== week.status && !bypassConfirmation && isAuditor) {
        setShowStatusChangeConfirm(newStatus);
        return;
    }
    
    const updateData: Partial<Week> = { status: newStatus };

    if (newStatus === 'rejected' && isAuditor) {
        const comment = prompt("Пожалуйста, укажите причину отклонения:", rejectionComment);
        if (comment === null) return; // User cancelled prompt
        updateData.rejection_comment = comment;
        setRejectionComment(comment);
    } else if (newStatus !== 'rejected' && week.rejection_comment) {
        updateData.rejection_comment = null;
    }

    const { error } = await supabase.from('weeks').update(updateData).eq('id', week.id);
    if (error) {
      alert('Ошибка изменения статуса: ' + error.message);
    } else {
      onUpdateRequest();
    }
    setShowStatusChangeConfirm(null);
  };
  
  const allTasks = Object.keys(week.plan).flatMap(date => week.plan[date].tasks);
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(task => (task.event_count || 0) > 0).length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

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
                    onClick={() => { handleStatusChange('pending_approval'); onSentForApproval(week); }} 
                    className="bg-blue-600 text-white font-bold py-2 px-5 rounded-full inline-flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-105"
                >
                    <FaPaperPlane />
                    Отправить на согласование
                </button>
            );
        case 'pending_approval':
            return isGuest && (
                <div className="flex gap-2">
                    <button onClick={() => handleStatusChange('rejected')} className="btn-secondary bg-red-500 text-white hover:bg-red-600 flex items-center gap-2"><FaBan /> Отклонить</button>
                    <button onClick={() => handleStatusChange('approved')} className="btn-primary bg-green-600 hover:bg-green-700 flex items-center gap-2"><FaCheck /> Согласовать</button>
                </div>
            );
        case 'approved':
             return isAuditor && <button onClick={() => handleStatusChange('completed')} className="btn-primary flex items-center gap-2"><FaCheckCircle/> Завершить этап</button>;
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
    <div className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 relative">
        {swipeActionsEnabled && (
            <>
                {/* Left side (revealed on swipe right) - Approve */}
                <div 
                    className="absolute top-0 left-0 h-full bg-green-500 flex items-center justify-center text-white z-0 w-20 cursor-pointer"
                    onClick={() => handleStatusChange('approved')}
                >
                    <div className="flex flex-col items-center">
                        <FaCheck size={24} />
                        <span className="text-xs mt-1 font-bold">Согласовать</span>
                    </div>
                </div>
                {/* Right side (revealed on swipe left) - Reject */}
                <div 
                    className="absolute top-0 right-0 h-full bg-red-500 flex items-center justify-center text-white z-0 w-20 cursor-pointer"
                    onClick={() => handleStatusChange('rejected')}
                >
                     <div className="flex flex-col items-center">
                        <FaBan size={24} />
                        <span className="text-xs mt-1 font-bold">Отклонить</span>
                    </div>
                </div>
            </>
        )}
        <div ref={ref} style={style} className="relative z-10 bg-white">
          <header
            className="p-4 cursor-pointer border-b"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1 pr-4 min-w-0">
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
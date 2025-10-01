import React, { useState, useEffect, useRef } from 'react';
import { Week, Plan, PlanItem, WeekStatus } from '../types';
import { supabase } from '../services/supabaseClient';
import { FaChevronDown, FaChevronUp, FaEdit, FaTrash, FaPlus, FaCheckCircle, FaCalendarAlt, FaPaperPlane, FaCheck, FaBan, FaUndo } from 'react-icons/fa';
import DayPlanView from './DayPlanView';
import EditWeekModal from './EditWeekModal';
import AddDayModal from './AddDayModal';
import WeekStats from './WeekStats';
import ConfirmationModal from './ConfirmationModal';
import WeekHistoryFeed from './WeekHistoryFeed';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSwipe } from '../hooks/useSwipe';

interface WeekCardProps {
  week: Week;
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

const getSwipeBgColorClass = (status: WeekStatus): string => {
    const colorMap = {
        draft: 'bg-gray-500',
        pending_approval: 'bg-yellow-500',
        approved: 'bg-green-500',
        rejected: 'bg-red-500',
        completed: 'bg-blue-500',
    };
    return colorMap[status];
};


const WeekCard: React.FC<WeekCardProps> = ({ week, isAuditor, isGuest, onUpdatePlan, onTaskSelect, onDeleteRequest, onUpdateRequest, onGenerateReport, onSentForApproval }) => {
  const headerRef = useRef<HTMLElement>(null);
  const [headerWidth, setHeaderWidth] = useState(0);

  useEffect(() => {
    const currentHeader = headerRef.current;
    if (currentHeader) {
      const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          setHeaderWidth(entry.contentRect.width);
        }
      });
      resizeObserver.observe(currentHeader);
      return () => resizeObserver.disconnect();
    }
  }, []);

  const isCurrentWeek = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
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

  const guestSwipeEnabled = isGuest && week.status === 'pending_approval';
  const auditorStatusChangeSwipeEnabled = isAuditor && ['draft', 'approved', 'rejected'].includes(week.status);
  const canEditOrDelete = isAuditor && week.status === 'draft';


  const auditorNextActionMap: Partial<Record<WeekStatus, { nextStatus: WeekStatus; label: string; icon: React.ReactNode }>> = {
    draft: { nextStatus: 'pending_approval', label: 'Отправить', icon: <FaPaperPlane size={24} /> },
    approved: { nextStatus: 'completed', label: 'Завершить', icon: <FaCheckCircle size={24} /> },
    rejected: { nextStatus: 'draft', label: 'В черновик', icon: <FaUndo size={24} /> },
  };

  const nextAuditorAction = auditorStatusChangeSwipeEnabled ? auditorNextActionMap[week.status] : null;

  const swipeIsAvailable = guestSwipeEnabled || auditorStatusChangeSwipeEnabled || canEditOrDelete;


  const handleSequentialStatusChange = () => {
    if (!isAuditor || !nextAuditorAction) return;
    
    if (week.status === 'draft' && nextAuditorAction.nextStatus === 'pending_approval') {
        onSentForApproval(week);
    } else {
        handleStatusChange(nextAuditorAction.nextStatus, true);
    }
  };

  const { ref, style } = useSwipe({
    onSwipeLeftAction: guestSwipeEnabled ? () => handleStatusChange('rejected') : undefined,
    onSwipeRightAction: guestSwipeEnabled ? () => handleStatusChange('approved') : (auditorStatusChangeSwipeEnabled ? handleSequentialStatusChange : undefined),
    leftRevealWidth: guestSwipeEnabled ? 80 : (auditorStatusChangeSwipeEnabled ? 80 : 0),
    rightRevealWidth: guestSwipeEnabled ? 80 : (canEditOrDelete ? 160 : 0),
  });


  const handleStatusChange = async (newStatus: Week['status'], bypassConfirmation = false) => {
    if (isGuest) {
      if (newStatus !== 'approved' && newStatus !== 'rejected') return;

      let guestName = localStorage.getItem('guestName');
      if (!guestName) {
        guestName = prompt('Пожалуйста, представьтесь (ваше имя будет видно в истории изменений):', 'Гость');
        if (!guestName || guestName.trim() === '') return;
        localStorage.setItem('guestName', guestName);
      }
      
      let reason: string | null = null;
      if (newStatus === 'rejected') {
        reason = prompt("Пожалуйста, укажите причину отклонения:");
        if (reason === null) return;
      }

      const { error } = await supabase.from('weeks').update({ status: newStatus, rejection_comment: reason }).eq('id', week.id);
      
      if (error) {
        alert('Ошибка изменения статуса: ' + error.message);
      } else {
        onUpdateRequest();
      }
      return;
    }

    if (week.status === 'approved' && newStatus !== week.status && !bypassConfirmation) {
        setShowStatusChangeConfirm(newStatus);
        return;
    }
    
    const updateData: Partial<Week> = { status: newStatus };

    if (newStatus === 'rejected') {
        const comment = prompt("Пожалуйста, укажите причину отклонения:", rejectionComment);
        if (comment === null) return;
        updateData.rejection_comment = comment;
        setRejectionComment(comment);
    } else if (week.rejection_comment) {
        updateData.rejection_comment = null;
    }


    const { error } = await supabase.from('weeks').update(updateData).eq('id', week.id);
    if (error) {
      alert('Ошибка изменения статуса: ' + error.message);
    } else {
      if (newStatus === 'pending_approval') {
        onSentForApproval(week);
      }
      onUpdateRequest();
    }
    setShowStatusChangeConfirm(null);
  };
  
  const allTasks = Object.values(week.plan).flatMap(date => date.tasks);
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

  const descriptionNeedsTruncation = (week.description?.length || 0) > 150;

  const HeaderContent = ({ variant }: { variant: 'dark' | 'light' }) => {
    const isLight = variant === 'light';
    const titleColor = isLight ? 'text-white' : 'text-gray-800';
    const descColor = isLight ? 'text-gray-200' : 'text-gray-500';
    const dateColor = isLight ? 'text-gray-100' : 'text-gray-600';
    const buttonColor = isLight ? 'text-white' : 'text-gray-500';
    const statusButtonClass = isLight
      ? 'bg-white/20 text-white backdrop-blur-sm border border-white/30'
      : statusConfig[week.status].color;

    return (
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 pr-4 min-w-0">
            <h2 className={`text-xl font-bold truncate ${titleColor}`}>{week.title}</h2>
            <div className={`text-sm mt-1 ${descColor}`}>
              <div className={`prose prose-sm max-w-none ${!isDescriptionExpanded && descriptionNeedsTruncation ? 'line-clamp-3' : ''} ${isLight ? 'prose-invert' : ''}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{week.description || "Нет описания."}</ReactMarkdown>
              </div>
              {descriptionNeedsTruncation && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsDescriptionExpanded(!isDescriptionExpanded); }} 
                  className={`text-xs ${isLight ? 'text-white/80 hover:text-white' : 'text-blue-600 hover:underline'} mt-1 font-semibold`}
                >
                  {isDescriptionExpanded ? 'Свернуть' : 'Читать далее'}
                </button>
              )}
            </div>
          </div>
          <div className={`flex items-center gap-4 ${buttonColor}`}>
            {canEditOrDelete && (
              <>
                <button onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }} title="Редактировать этап" className="p-2 hover:text-blue-400"><FaEdit /></button>
                <button onClick={(e) => { e.stopPropagation(); onDeleteRequest(); }} title="Удалить этап" className="p-2 hover:text-red-400"><FaTrash /></button>
              </>
            )}
            <button className="p-2">
              {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
            </button>
          </div>
        </div>
        <div className={`flex items-center justify-between text-sm flex-wrap gap-2 ${dateColor}`}>
          <div className="flex items-center gap-2">
            <FaCalendarAlt />
            <span>{new Date(week.start_date + 'T00:00:00').toLocaleDateString()} - {new Date(week.end_date + 'T00:00:00').toLocaleDateString()}</span>
          </div>
          <div className="relative" ref={statusRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isAuditor) setIsStatusDropdownOpen(prev => !prev);
              }}
              className={`px-3 py-1 font-semibold rounded-full ${statusButtonClass} ${isAuditor ? 'cursor-pointer' : ''}`}
              title={isAuditor ? "Изменить статус" : ""}
            >
              {statusConfig[week.status].label}
            </button>
            {isAuditor && isStatusDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white border rounded-md shadow-lg z-20">
                {Object.keys(statusConfig).map(statusKey => (
                  <a key={statusKey} onClick={(e) => { e.stopPropagation(); handleStatusChange(statusKey as WeekStatus); setIsStatusDropdownOpen(false); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                    {statusConfig[statusKey as WeekStatus].label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 relative">
      {guestSwipeEnabled && (
        <>
            <div className="absolute top-0 left-0 h-full bg-green-500 flex items-center justify-center text-white z-0 w-20 cursor-pointer touch-only" onClick={() => handleStatusChange('approved')}>
                <div className="flex flex-col items-center"><FaCheck size={24} /><span className="text-xs mt-1 font-bold">Согласовать</span></div>
            </div>
            <div className="absolute top-0 right-0 h-full bg-red-500 flex items-center justify-center text-white z-0 w-20 cursor-pointer touch-only" onClick={() => handleStatusChange('rejected')}>
                 <div className="flex flex-col items-center"><FaBan size={24} /><span className="text-xs mt-1 font-bold">Отклонить</span></div>
            </div>
        </>
      )}
      {auditorStatusChangeSwipeEnabled && nextAuditorAction && (
         <div className={`absolute top-0 left-0 h-full ${getSwipeBgColorClass(nextAuditorAction.nextStatus)} flex items-center justify-center text-white z-0 w-20 cursor-pointer touch-only`} onClick={handleSequentialStatusChange}>
            <div className="flex flex-col items-center text-center px-1">{nextAuditorAction.icon}<span className="text-xs mt-1 font-bold">{nextAuditorAction.label}</span></div>
        </div>
      )}
      {canEditOrDelete && (
        <div className="absolute top-0 right-0 h-full flex z-0 touch-only">
            <div onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }} className="w-20 bg-blue-500 text-white flex flex-col items-center justify-center cursor-pointer hover:bg-blue-600">
                <FaEdit size={20} /><span className="text-xs mt-1 font-bold">Изменить</span>
            </div>
            <div onClick={(e) => { e.stopPropagation(); onDeleteRequest(); }} className="w-20 bg-red-500 text-white flex flex-col items-center justify-center cursor-pointer hover:bg-red-600">
                <FaTrash size={20} /><span className="text-xs mt-1 font-bold">Удалить</span>
            </div>
        </div>
      )}

      <div ref={ref} style={style} className="relative z-10 bg-white">
        <header ref={headerRef} className="relative cursor-pointer bg-gray-200 overflow-hidden" onClick={() => setIsExpanded(!isExpanded)}>
          <HeaderContent variant="dark" />
          <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-600 overflow-hidden" style={{ width: `${progress}%`, transition: 'width 500ms ease' }}>
            {headerWidth > 0 && <div style={{ width: headerWidth }}><HeaderContent variant="light" /></div>}
          </div>
        </header>

        {swipeIsAvailable && !isExpanded && (
            <div className="md:hidden text-center text-xs text-gray-400 py-1 border-b bg-gray-50">
                ⟷ Смахните для действий
            </div>
        )}
        
        {isExpanded && (
          <div className="p-4 bg-gray-50/50">
            {week.rejection_comment && week.status === 'rejected' && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-800">
                <p className="font-bold">Причина отклонения:</p>
                <p>{week.rejection_comment}</p>
              </div>
            )}
            <DayPlanView week={week} onUpdatePlan={onUpdatePlan} onTaskSelect={onTaskSelect} isAuditor={isAuditor} />
            <div className="mt-6 pt-4 border-t flex justify-end items-center flex-wrap gap-2">
              {isAuditor && (week.status === 'draft' || week.status === 'approved') && (
                <button onClick={() => setIsAddDayModalOpen(true)} className="flex items-center text-sm btn-secondary">
                  <FaPlus className="mr-2"/> Добавить день
                </button>
              )}
            </div>
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1"><WeekStats week={week} /></div>
              <div className="lg:col-span-2"><WeekHistoryFeed weekId={week.id} onTaskSelect={onTaskSelect} allTasks={allTasks} /></div>
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
          <EditWeekModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} week={week} onUpdate={onUpdateRequest} />
          <AddDayModal isOpen={isAddDayModalOpen} onClose={() => setIsAddDayModalOpen(false)} week={week} onUpdatePlan={onUpdatePlan} />
        </>
      )}
    </div>
  );
};

export default WeekCard;

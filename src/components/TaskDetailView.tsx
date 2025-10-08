// src/components/TaskDetailView.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { Event, PlanItem, Project, Plan, Week } from '../types';
import EventItem from './EventItem';
import AddEventForm from './AddEventForm';
import { Spinner } from './ui/Spinner';
import { FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import AddSubTaskModal from './AddSubTaskModal';
import ConfirmationModal from './ConfirmationModal';
import EditEventModal from './EditEventModal';
import TaskSidebar from './TaskSidebar';

interface TaskDetailViewProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  context: { item: PlanItem; weekId: string; projectId: string; };
  onEventCountChange: (weekId: string, taskId: string, change: 1 | -1) => void;
  isGuest: boolean;
  project: Project;
  onSubTaskAdded: (parentTask: PlanItem, subTask: PlanItem) => void;
  week: Week | null;
  onUpdatePlan: (plan: Plan) => void;
}

const TaskDetailView: React.FC<TaskDetailViewProps> = ({ isOpen, onClose, user, context, onEventCountChange, isGuest, project, onSubTaskAdded, week, onUpdatePlan }) => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddSubTaskModalOpen, setIsAddSubTaskModalOpen] = useState(false);
    const [quotedEvent, setQuotedEvent] = useState<Event | null>(null);
    const feedRef = useRef<HTMLDivElement>(null);
    const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
    const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    
    const fetchEvents = useCallback(async (showLoading = true) => {
        if (!context) return;
        if (showLoading) setLoading(true);
        const { data, error } = await supabase.from('events').select('*, parent:events!parent_event_id(content, author_email)').eq('task_id', context.item.id).order('created_at', { ascending: true });
        if (error) console.error("Error fetching events:", error);
        else setEvents(data || []);
        if (showLoading) setLoading(false);
    }, [context]);

    useEffect(() => {
        if (isOpen) {
            fetchEvents();
        }
    }, [isOpen, fetchEvents]);
    
    useEffect(() => {
        if (!loading && feedRef.current) {
            feedRef.current.scrollTop = feedRef.current.scrollHeight;
        }
    }, [events, loading]);
    
    const handleNewEvent = () => {
        onEventCountChange(context.weekId, context.item.id, 1);
    };

    const handleUpdateEvent = async (content: string) => {
        if (!eventToEdit) return;
        const { error } = await supabase.from('events').update({ content }).eq('id', eventToEdit.id);
        if (error) throw error;
    };
    
    const handleDeleteEvent = async () => {
        if (!eventToDelete) return;
        await supabase.from('events').delete().eq('id', eventToDelete.id);
        onEventCountChange(context.weekId, context.item.id, -1);
        setEventToDelete(null);
    };

    useEffect(() => {
        if (!context) return;
        const channel = supabase.channel(`public:events:task_id=eq.${context.item.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `task_id=eq.${context.item.id}` }, () => fetchEvents(false))
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [context, fetchEvents]);
    
    const handleQuoteClick = (eventId: string) => {
        const element = document.getElementById(`event-${eventId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('highlight');
            setTimeout(() => element.classList.remove('highlight'), 1000);
        }
    };
    
    const handleAddSubTask = (subTask: PlanItem) => {
        if (!week) return;
        const newPlan = { ...week.plan };
        let parentTaskUpdated = false;

        for (const date in newPlan) {
            const day = newPlan[date];
            const taskIndex = day.tasks.findIndex(t => t.id === context.item.id);
            if (taskIndex > -1) {
                const parentTask = day.tasks[taskIndex];
                const newSubTasks = [...(parentTask.sub_tasks || []), { ...subTask, parent_task_id: parentTask.id }];
                day.tasks[taskIndex] = { ...parentTask, sub_tasks: newSubTasks };
                parentTaskUpdated = true;
                onSubTaskAdded(parentTask, subTask);
                break;
            }
        }
        if (parentTaskUpdated) {
            onUpdatePlan(newPlan);
        }
    };
    
    const handleNewAiEvent = async (event: Partial<Event>) => {
      const newEventPayload = {
        project_id: context.projectId,
        week_id: context.weekId,
        task_id: context.item.id,
        author_email: user?.email, // Post as the auditor
        user_id: user?.id,
        type: 'comment' as const,
        ...event,
      };

      const { error } = await supabase.from('events').insert(newEventPayload);

      if (error) {
        console.error("Error creating AI event:", error);
        alert("Не удалось создать ответ от AI.");
      } else {
        onEventCountChange(context.weekId, context.item.id, 1);
      }
    };

    if (!isOpen || !context || !project) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-40 flex justify-end animate-fade-in" onClick={onClose}>
            <style>{`.highlight { background-color: #eef2ff; transition: background-color 0.5s; } .animate-fade-in { animation: fadeIn 0.3s ease-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
            <div className="bg-white h-full w-full max-w-5xl shadow-xl flex flex-col lg:flex-row relative" onClick={(e) => e.stopPropagation()}>
                
                {!isSidebarCollapsed && (
                    <TaskSidebar 
                        task={context.item} 
                        events={events} 
                        isAuditor={!!user} 
                        isGuest={isGuest} 
                        onAddSubTask={() => setIsAddSubTaskModalOpen(true)} 
                        onNewAiEvent={handleNewAiEvent} 
                    />
                )}
                
                <div className="flex-1 flex flex-col min-w-0" style={{minHeight: 0}}>
                    <header className={`flex-shrink-0 h-12 ${!isSidebarCollapsed && 'lg:border-l'} flex justify-between items-center px-4`}>
                        <button 
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
                            className="p-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100 hidden lg:block"
                            aria-label={isSidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
                        >
                            {isSidebarCollapsed ? <FaChevronRight size={14} /> : <FaChevronLeft size={14} />}
                        </button>
                        <div className="lg:hidden flex-1" /> {/* This spacer pushes the close button to the right on mobile */}
                        <button 
                            onClick={onClose} 
                            className="p-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100"
                            aria-label="Close task details"
                        >
                            <FaTimes size={20} />
                        </button>
                    </header>
                    <main ref={feedRef} className="flex-1 overflow-y-auto p-4" style={{minHeight: 0}}>
                        {loading ? <div className="flex justify-center pt-10"><Spinner size="lg" /></div> : (
                            events.length > 0 ? (
                                <div className="divide-y divide-slate-200 -mx-4">
                                    {events.map(event => (
                                        <EventItem 
                                            key={event.id} 
                                            event={event}
                                            isGuest={isGuest}
                                            onReply={setQuotedEvent} 
                                            onQuoteClick={handleQuoteClick} 
                                            onDelete={(!!user && event.author_email === user?.email) || (isGuest && event.author_email === (localStorage.getItem('guestName') || 'Гость')) ? () => setEventToDelete(event) : undefined} 
                                            onEdit={(!!user && event.author_email === user?.email) || (isGuest && event.author_email === (localStorage.getItem('guestName') || 'Гость')) ? () => setEventToEdit(event) : undefined} 
                                        />
                                    ))}
                                </div>
                            ) : (<p className="text-sm text-slate-500 text-center pt-8">Событий нет. Начните обсуждение!</p>)
                        )}
                    </main>
                    <footer className={`flex-shrink-0 p-4 bg-slate-50 border-t ${!isSidebarCollapsed && 'lg:border-l'}`}>
                        <AddEventForm user={user} context={{...context, taskId: context.item.id}} quotedEvent={quotedEvent} onClearQuote={() => setQuotedEvent(null)} onNewEvent={handleNewEvent} project={project} isGuest={isGuest} onAddSubTaskRequest={() => setIsAddSubTaskModalOpen(true)} />
                    </footer>
                </div>
            </div>
            <AddSubTaskModal isOpen={isAddSubTaskModalOpen} onClose={() => setIsAddSubTaskModalOpen(false)} onAddSubTask={handleAddSubTask} />
            <ConfirmationModal isOpen={!!eventToDelete} onClose={() => setEventToDelete(null)} onConfirm={handleDeleteEvent} title="Удалить событие?" message="Вы уверены?" />
            {eventToEdit && <EditEventModal isOpen={!!eventToEdit} onClose={() => setEventToEdit(null)} event={eventToEdit} onUpdate={handleUpdateEvent} />}
        </div>
    );
};

export default TaskDetailView;
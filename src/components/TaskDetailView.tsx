// src/components/TaskDetailView.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { Event, PlanItem, Project, CompanyProfile, Week } from '../types';
import EventItem from './EventItem';
import AddEventForm from './AddEventForm';
import { Spinner } from './ui/Spinner';
import { FaTimes } from 'react-icons/fa';
import AddEventModal from './AddEventModal';
import ConfirmationModal from './ConfirmationModal';
import EditEventModal from './EditEventModal';
import TaskSidebar from './TaskSidebar';

interface TaskDetailViewProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  providerToken: string | null;
  context: { item: PlanItem; weekId: string; projectId: string; };
  companyProfile: CompanyProfile | null;
  onEventCountChange: (weekId: string, taskId: string, change: 1 | -1) => void;
  onUpdateTask: (weekId: string, updatedTask: PlanItem) => void;
  isAuditor: boolean;
  isGuest: boolean;
  project: Project;
  onSubTaskAdded: (parentTask: PlanItem, newSubTask: PlanItem) => void;
  week: Week | null;
  onContactClick: (contactId: string) => void;
  onContactsUpdate: () => void;
}

const TaskDetailView: React.FC<TaskDetailViewProps> = ({ isOpen, onClose, user, providerToken, context, companyProfile, onEventCountChange, onUpdateTask, isAuditor, isGuest, project, onSubTaskAdded, week, onContactClick, onContactsUpdate }) => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
    const [quotedEvent, setQuotedEvent] = useState<Event | null>(null);
    const feedRef = useRef<HTMLDivElement>(null);
    const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
    const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const contacts = companyProfile?.contacts || [];

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
            setIsDescriptionExpanded(false);
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

    const handleUpdateEvent = async (content: string, contactIds: string[]) => {
        if (!eventToEdit) return;
        const { error } = await supabase.from('events').update({ content, data: { ...eventToEdit.data, contact_ids: contactIds } }).eq('id', eventToEdit.id);
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
        const updatedTask = { ...context.item, sub_tasks: [...(context.item.sub_tasks || []), subTask] };
        onUpdateTask(context.weekId, updatedTask);
        if (isGuest) {
            onSubTaskAdded(context.item, subTask);
        }
    };
    
    const handleNewAiEvent = async (event: Partial<Event>) => {
      const newEventPayload = {
        project_id: context.projectId,
        week_id: context.weekId,
        task_id: context.item.id,
        author_email: 'AI Ассистент',
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

    if (!isOpen || !context) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-40 flex justify-end animate-fade-in">
            <style>{`.highlight { background-color: #eef2ff; transition: background-color 0.5s; } .animate-fade-in { animation: fadeIn 0.3s ease-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
            <div className="bg-white h-full w-full max-w-5xl shadow-xl flex flex-col lg:flex-row relative" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="lg:hidden absolute top-2 right-2 z-20 p-2 text-gray-500 hover:text-gray-800 rounded-full bg-white/50 hover:bg-white"><FaTimes size={20} /></button>
                <TaskSidebar 
                    task={context.item} 
                    events={events} 
                    project={project} 
                    isAuditor={isAuditor} 
                    isGuest={isGuest} 
                    onAddSubTask={() => setIsAddEventModalOpen(true)} 
                    onNewAiEvent={handleNewAiEvent} 
                    isDescriptionExpanded={isDescriptionExpanded} 
                    onToggleDescription={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    companyProfile={companyProfile}
                    onUpdateTask={(updatedTask) => onUpdateTask(context.weekId, updatedTask)}
                    week={week}
                    onContactClick={onContactClick}
                    onContactsUpdate={onContactsUpdate}
                />
                <div className="flex-1 flex flex-col min-w-0" style={{minHeight: 0}}>
                    <header className="flex-shrink-0 h-12 lg:border-l flex justify-end items-center pr-4">
                        <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100 hidden lg:block"><FaTimes size={20} /></button>
                    </header>
                    <main ref={feedRef} className="flex-1 overflow-y-auto p-4" style={{minHeight: 0}}>
                        {loading ? <div className="flex justify-center pt-10"><Spinner size="lg" /></div> : (
                            events.length > 0 ? (
                                <div className="divide-y divide-slate-200 -mx-4">
                                    {events.map(event => (
                                        <EventItem 
                                            key={event.id} 
                                            event={event} 
                                            contacts={contacts} 
                                            onReply={setQuotedEvent} 
                                            onQuoteClick={handleQuoteClick} 
                                            onDelete={(isAuditor || event.author_email === user?.email) ? () => setEventToDelete(event) : undefined} 
                                            onEdit={(isAuditor || event.author_email === user?.email) ? () => setEventToEdit(event) : undefined} 
                                            onContactClick={onContactClick}
                                        />
                                    ))}
                                </div>
                            ) : (<p className="text-sm text-slate-500 text-center pt-8">Событий нет. Начните обсуждение!</p>)
                        )}
                    </main>
                    <footer className="flex-shrink-0 p-4 bg-slate-50 border-t lg:border-l">
                        <AddEventForm user={user} providerToken={providerToken} context={{...context, taskId: context.item.id}} quotedEvent={quotedEvent} onClearQuote={() => setQuotedEvent(null)} onNewEvent={handleNewEvent} project={project} contacts={contacts} isGuest={isGuest} onAddSubTaskRequest={() => setIsAddEventModalOpen(true)} onContactsUpdate={onContactsUpdate} />
                    </footer>
                </div>
            </div>
            {(isAuditor || isGuest) && <AddEventModal isOpen={isAddEventModalOpen} onClose={() => setIsAddEventModalOpen(false)} onAddSubTask={handleAddSubTask} contacts={contacts} project={project} onContactsUpdate={onContactsUpdate} />}
            <ConfirmationModal isOpen={!!eventToDelete} onClose={() => setEventToDelete(null)} onConfirm={handleDeleteEvent} title="Удалить событие?" message="Вы уверены?" />
            {eventToEdit && <EditEventModal isOpen={!!eventToEdit} onClose={() => setEventToEdit(null)} event={eventToEdit} onUpdate={handleUpdateEvent} contacts={contacts} onContactsUpdate={onContactsUpdate} project={project} />}
        </div>
    );
};

export default TaskDetailView;
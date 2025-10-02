
// src/components/TaskDetailView.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { Event, PlanItem, Project } from '../types';
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
  onEventCountChange: (weekId: string, taskId: string, change: 1 | -1) => void;
  onUpdateTask: (weekId: string, updatedTask: PlanItem) => void;
  isAuditor: boolean;
  isGuest: boolean;
  project: Project;
  onSubTaskAdded: (parentTask: PlanItem, newSubTask: PlanItem) => void;
}

const TaskDetailView: React.FC<TaskDetailViewProps> = ({ isOpen, onClose, user, providerToken, context, onEventCountChange, onUpdateTask, isAuditor, isGuest, project, onSubTaskAdded }) => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
    const [addSubTaskType, setAddSubTaskType] = useState<PlanItem['type'] | undefined>(undefined);
    const [quotedEvent, setQuotedEvent] = useState<Event | null>(null);
    const feedRef = useRef<HTMLDivElement>(null);
    const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
    const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
    const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

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
    
    const handleNewEvent = (newEvent: Event) => {
        onEventCountChange(context.weekId, context.item.id, 1);
    };

    const handleUpdateEvent = async (content: string) => {
        if (!eventToEdit) return;
        const { error } = await supabase.from('events').update({ content }).eq('id', eventToEdit.id);
        if (error) throw error;
        setEvents(events.map(e => e.id === eventToEdit.id ? { ...e, content } : e));
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
        }
    };
    
    const handleAddSubTask = (subTask: PlanItem) => {
        const updatedTask = { ...context.item, sub_tasks: [...(context.item.sub_tasks || []), subTask] };
        onUpdateTask(context.weekId, updatedTask);
        if (isGuest) {
            onSubTaskAdded(context.item, subTask);
        }
    };

    if (!isOpen || !context) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-end">
            <style>{`.highlight { background-color: #eef2ff; transition: background-color 0.5s; }`}</style>
            <div className="bg-white h-full w-full max-w-5xl shadow-xl flex flex-col lg:flex-row">
                <TaskSidebar task={context.item} events={events} project={project} isAuditor={isAuditor} isGuest={isGuest} onAddSubTask={() => setIsAddEventModalOpen(true)} onNewAiEvent={handleNewEvent} isDescriptionExpanded={isDescriptionExpanded} onToggleDescription={() => setIsDescriptionExpanded(!isDescriptionExpanded)} />
                <div className="flex-1 flex flex-col min-w-0">
                    <header className="flex-shrink-0 flex justify-end items-center p-4 border-b lg:border-l">
                        <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100"><FaTimes size={20} /></button>
                    </header>
                    <main ref={feedRef} className="flex-1 overflow-y-auto p-4">
                        {loading ? <div className="flex justify-center pt-10"><Spinner size="lg" /></div> : (
                            events.length > 0 ? (
                                <div className="divide-y divide-gray-200">
                                    {events.map(event => (
                                        <EventItem key={event.id} event={event} onReply={setQuotedEvent} onQuoteClick={handleQuoteClick} onDelete={isAuditor ? () => setEventToDelete(event) : undefined} onEdit={isAuditor ? () => setEventToEdit(event) : undefined} isExpanded={event.id === expandedEventId} onToggleExpand={() => setExpandedEventId(prev => prev === event.id ? null : event.id)} />
                                    ))}
                                </div>
                            ) : (<p className="text-sm text-gray-500 text-center pt-8">Событий нет.</p>)
                        )}
                    </main>
                    <footer className="flex-shrink-0 p-4 bg-gray-50 border-t lg:border-l">
                        <AddEventForm user={user} providerToken={providerToken} context={context} quotedEvent={quotedEvent} onClearQuote={() => setQuotedEvent(null)} onNewEvent={handleNewEvent} project={project} isGuest={isGuest} onAddSubTaskRequest={() => setIsAddEventModalOpen(true)} />
                    </footer>
                </div>
            </div>
            {(isAuditor || isGuest) && <AddEventModal isOpen={isAddEventModalOpen} onClose={() => setIsAddEventModalOpen(false)} user={user} onAddSubTask={handleAddSubTask} parentItem={context.item} parentEvent={null} isGuest={isGuest} preselectedType={addSubTaskType} />}
            <ConfirmationModal isOpen={!!eventToDelete} onClose={() => setEventToDelete(null)} onConfirm={handleDeleteEvent} title="Удалить событие?" message="Вы уверены?" />
            {eventToEdit && <EditEventModal isOpen={!!eventToEdit} onClose={() => setEventToEdit(null)} event={eventToEdit} onUpdate={handleUpdateEvent} />}
        </div>
    );
};

export default TaskDetailView;

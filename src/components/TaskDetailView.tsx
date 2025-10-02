import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, sendGuestEventNotification } from '../services/supabaseClient';
import { Event, PlanItem, Project } from '../types';
import EventItem from './EventItem';
import AddEventForm from './AddEventForm';
import { Spinner } from './ui/Spinner';
import { FaTimes } from 'react-icons/fa';
import ConfirmationModal from './ConfirmationModal';
import EditEventModal from './EditEventModal';
import TaskSidebar from './TaskSidebar';
import AddEventModal from './AddEventModal';

interface TaskDetailViewProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  providerToken: string | null;
  context: { item: PlanItem; weekId: string; projectId: string; };
  onEventCountChange: (weekId: string, taskId: string, change: 1 | -1) => void;
  onUpdateTask: (weekId: string, updatedTask: PlanItem) => void;
  isGuest: boolean;
  project: Project;
  onSubTaskAdded: (parentTask: PlanItem, newSubTask: PlanItem) => void;
}

const TaskDetailView: React.FC<TaskDetailViewProps> = ({ isOpen, onClose, user, providerToken, context, onEventCountChange, onUpdateTask, isGuest, project, onSubTaskAdded }) => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddSubTaskModalOpen, setIsAddSubTaskModalOpen] = useState(false);
    const [quotedEvent, setQuotedEvent] = useState<Event | null>(null);
    const eventFeedRef = useRef<HTMLDivElement>(null);
    const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
    const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
    const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [preselectedSubTaskType, setPreselectedSubTaskType] = useState<PlanItem['type'] | undefined>(undefined);

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
        } else {
            setEvents([]); setLoading(true); setExpandedEventId(null);
        }
    }, [isOpen, fetchEvents]);

    const handleNewEvent = (newEvent: Event, isAiAssistant = false) => {
        if (!events.some(e => e.id === newEvent.id)) {
            setEvents(current => [...current, newEvent]);
            if (!isAiAssistant) onEventCountChange(context.weekId, context.item.id, 1);
            if (isGuest && !isAiAssistant) sendGuestEventNotification(project, context.item, newEvent, window.location.origin);
        }
    };

    const handleDeleteEvent = async () => {
        if (!eventToDelete) return;
        await supabase.from('events').delete().eq('id', eventToDelete.id);
        setEvents(current => current.filter(e => e.id !== eventToDelete.id));
        onEventCountChange(context.weekId, context.item.id, -1);
        setEventToDelete(null);
    };

    const handleUpdateEvent = async (newContent: string) => {
        if (!eventToEdit) return;
        const { data } = await supabase.from('events').update({ content: newContent }).eq('id', eventToEdit.id).select('*, parent:events!parent_event_id(content, author_email)').single();
        setEvents(current => current.map(e => e.id === eventToEdit.id ? data as Event : e));
        setEventToEdit(null);
    };

    const handleAddSubTask = (newSubTask: PlanItem) => {
        onUpdateTask(context.weekId, { ...context.item, sub_tasks: [...(context.item.sub_tasks || []), newSubTask] });
        onSubTaskAdded(context.item, newSubTask);
    };

    useEffect(() => {
        if (!context) return;
        const channel = supabase.channel(`public:events:task_id=eq.${context.item.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `task_id=eq.${context.item.id}` }, () => fetchEvents(false)).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [context, fetchEvents]);
    
    useEffect(() => { eventFeedRef.current?.scrollTo({ top: eventFeedRef.current.scrollHeight, behavior: 'smooth' }); }, [events]);
    
    const isAuditor = !!user && user.id === project.user_id;
    if (!isOpen || !context) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex flex-col slide-in-right">
            <div className="flex justify-end p-2 md:p-4"><button onClick={onClose} className="p-2 text-white bg-black bg-opacity-40 hover:bg-opacity-60 rounded-full"><FaTimes size={20} /></button></div>
            <div className="flex-1 flex flex-col lg:flex-row bg-white m-2 md:m-4 mt-0 rounded-lg shadow-xl overflow-hidden min-h-0">
                <TaskSidebar task={context.item} events={events} project={project} isAuditor={isAuditor} isGuest={isGuest} onAddSubTask={() => { setPreselectedSubTaskType(undefined); setIsAddSubTaskModalOpen(true); }} onNewAiEvent={(e) => handleNewEvent(e as Event, true)} isDescriptionExpanded={isDescriptionExpanded} onToggleDescription={() => setIsDescriptionExpanded(prev => !prev)} />
                <div className="flex-1 flex flex-col min-w-0 min-h-0">
                    <main ref={eventFeedRef} className="flex-1 overflow-y-auto p-4">
                        {loading ? <div className="flex justify-center pt-10"><Spinner size="lg" /></div> : (
                            events.length > 0 ? (
                                <div className="divide-y divide-gray-200">
                                    {events.map(event => <EventItem key={event.id} event={event} onReply={setQuotedEvent} onQuoteClick={(id) => { setExpandedEventId(id); document.getElementById(`event-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} onDelete={(user?.id === event.user_id || isAuditor) ? () => setEventToDelete(event) : undefined} onEdit={(user?.id === event.user_id) ? () => setEventToEdit(event) : undefined} isExpanded={event.id === expandedEventId} onToggleExpand={() => setExpandedEventId(p => p === event.id ? null : event.id)} />)}
                                </div>
                            ) : <p className="text-sm text-gray-500 text-center pt-8">Событий пока нет.</p>
                        )}
                    </main>
                    <footer className="p-4 bg-gray-50 border-t">
                        {(isAuditor || isGuest) ? <AddEventForm user={user} providerToken={providerToken} context={{ weekId: context.weekId, taskId: context.item.id, projectId: context.projectId }} quotedEvent={quotedEvent} onClearQuote={() => setQuotedEvent(null)} onNewEvent={handleNewEvent} project={project} isGuest={isGuest} onAddSubTaskRequest={(type) => { setPreselectedSubTaskType(type); setIsAddSubTaskModalOpen(true); }} /> : <p className="text-sm text-center text-gray-500">Войдите для участия в обсуждении.</p>}
                    </footer>
                </div>
            </div>
            <AddEventModal isOpen={isAddSubTaskModalOpen} onClose={() => setIsAddSubTaskModalOpen(false)} user={user} onAddSubTask={handleAddSubTask} parentItem={context.item} parentEvent={quotedEvent} isGuest={isGuest} preselectedType={preselectedSubTaskType} />
            <ConfirmationModal isOpen={!!eventToDelete} onClose={() => setEventToDelete(null)} onConfirm={handleDeleteEvent} title="Удалить событие?" message="Вы уверены?" />
            {eventToEdit && <EditEventModal isOpen={!!eventToEdit} onClose={() => setEventToEdit(null)} event={eventToEdit} onUpdate={handleUpdateEvent} />}
        </div>
    );
};

export default TaskDetailView;
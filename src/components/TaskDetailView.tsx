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
    const [isAddSubTaskModalOpen, setIsAddSubTaskModalOpen] = useState(false);
    const [quotedEvent, setQuotedEvent] = useState<Event | null>(null);
    const mainRef = useRef<HTMLElement>(null);
    const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
    const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
    const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(new Set());
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    const fetchEvents = useCallback(async (showLoading = true) => {
        if (!context) return;
        if (showLoading) setLoading(true);
        const { data, error } = await supabase
            .from('events')
            .select('*, parent:events!parent_event_id(content, author_email)')
            .eq('task_id', context.item.id)
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error("Error fetching events:", error);
        } else {
            setEvents(data || []);
        }
        if (showLoading) setLoading(false);
    }, [context]);

    useEffect(() => {
        if (isOpen) {
            fetchEvents();
            setIsDescriptionExpanded(false); // Reset on open
        }
    }, [isOpen, fetchEvents]);
    
    useEffect(() => {
        if (mainRef.current) {
            mainRef.current.scrollTop = mainRef.current.scrollHeight;
        }
    }, [events.length]);

    const handleNewEvent = (newEvent: Event) => {
        if (!events.some(e => e.id === newEvent.id)) {
            onEventCountChange(context.weekId, context.item.id, 1);
        }
    };

    const handleDeleteEvent = async () => {
        if (!eventToDelete) return;
        const { error } = await supabase.from('events').delete().eq('id', eventToDelete.id);
        if (error) {
            alert('Ошибка удаления события: ' + error.message);
        } else {
             onEventCountChange(context.weekId, context.item.id, -1);
             setEventToDelete(null);
        }
    };

    const handleUpdateEvent = async (newContent: string) => {
        if (!eventToEdit) return;
        const { data, error } = await supabase.from('events').update({ content: newContent }).eq('id', eventToEdit.id).select().single();
        if (error) {
            throw error;
        } else {
            setEvents(currentEvents => currentEvents.map(e => e.id === eventToEdit.id ? data as Event : e));
        }
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
            setTimeout(() => { element.classList.remove('highlight'); }, 2000);
        }
    };

    const handleAddSubTask = (subTask: PlanItem) => {
        const newSubTasks = [...(context.item.sub_tasks || []), subTask];
        onUpdateTask(context.weekId, { ...context.item, sub_tasks: newSubTasks });
        onSubTaskAdded(context.item, subTask);
    };

    const handleNewAiEvent = async (event: Partial<Event>) => {
        const newEvent = {
            ...event,
            project_id: project.id,
            week_id: context.weekId,
            task_id: context.item.id,
            user_id: user?.id || null,
            author_email: 'AI Ассистент',
            type: 'comment',
        } as Event;
        const { data, error } = await supabase.from('events').insert(newEvent).select().single();
        if(error) {
            console.error("Error creating AI event", error);
        }
    }
    
    if (!isOpen || !context) return null;

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 z-40 flex flex-col print-hidden">
            <style>{`.highlight { background-color: #eef2ff; transition: background-color 0.5s ease-in-out; }`}</style>
            <div className="bg-gray-100 m-2 md:m-4 lg:m-8 rounded-lg shadow-xl flex flex-col lg:flex-row flex-1 overflow-hidden">
                <TaskSidebar 
                    task={context.item}
                    events={events}
                    project={project}
                    isAuditor={isAuditor}
                    isGuest={isGuest}
                    onAddSubTask={() => setIsAddSubTaskModalOpen(true)}
                    onNewAiEvent={handleNewAiEvent}
                    isDescriptionExpanded={isDescriptionExpanded}
                    onToggleDescription={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                />
                
                <div className="flex-1 flex flex-col bg-white overflow-hidden">
                    <header className="flex justify-between items-center p-4 border-b">
                        <h2 className="text-xl font-bold text-gray-800">Обсуждение задачи</h2>
                        <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100"><FaTimes size={20} /></button>
                    </header>

                    <main ref={mainRef} className="flex-1 overflow-y-auto p-4 min-h-0">
                        {loading ? <div className="flex justify-center pt-10"><Spinner size="lg" /></div> : 
                            events.length > 0 ? (
                                <div className="divide-y divide-gray-200">
                                    {events.map(event => (
                                        <EventItem 
                                            key={event.id} 
                                            event={event} 
                                            onReply={setQuotedEvent}
                                            onQuoteClick={handleQuoteClick}
                                            onDelete={user?.id === event.user_id ? () => setEventToDelete(event) : undefined}
                                            onEdit={user?.id === event.user_id ? () => setEventToEdit(event) : undefined}
                                            isExpanded={expandedEventIds.has(event.id)}
                                            onToggleExpand={() => setExpandedEventIds(prev => {
                                                const newSet = new Set(prev);
                                                if (newSet.has(event.id)) newSet.delete(event.id);
                                                else newSet.add(event.id);
                                                return newSet;
                                            })}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 text-center pt-8">Событий пока нет. Начните обсуждение!</p>
                            )
                        }
                    </main>

                    <footer className="p-2 bg-gray-50 border-t">
                        <AddEventForm 
                            user={user} 
                            providerToken={providerToken}
                            context={{ weekId: context.weekId, taskId: context.item.id, projectId: context.projectId }} 
                            quotedEvent={quotedEvent}
                            onClearQuote={() => setQuotedEvent(null)}
                            onNewEvent={handleNewEvent}
                            onAddSubTaskRequest={() => setIsAddSubTaskModalOpen(true)}
                            project={project}
                            isGuest={isGuest}
                            isAuditor={isAuditor}
                        />
                    </footer>
                </div>
            </div>
            
            <AddEventModal isOpen={isAddSubTaskModalOpen} onClose={() => setIsAddSubTaskModalOpen(false)} onAddSubTask={handleAddSubTask} parentItem={context.item} parentEvent={null} isGuest={isGuest} />
            <ConfirmationModal isOpen={!!eventToDelete} onClose={() => setEventToDelete(null)} onConfirm={handleDeleteEvent} title="Удалить событие?" message="Вы уверены, что хотите удалить это событие? Действие необратимо." />
            {eventToEdit && <EditEventModal isOpen={!!eventToEdit} onClose={() => setEventToEdit(null)} event={eventToEdit} onUpdate={handleUpdateEvent} />}
        </div>
    );
};

export default TaskDetailView;
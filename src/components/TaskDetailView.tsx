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
import ReactMarkdown from 'react-markdown';
import EditEventModal from './EditEventModal';
import MeetingTools from './MeetingTools';
import InterviewTools from './InterviewTools';
import DocReviewTools from './DocReviewTools';
import ProcessAnalysisTools from './ProcessAnalysisTools';
import SubTaskItem from './SubTaskItem';
import AiActionBar from './AiActionBar';


interface TaskDetailViewProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  context: { item: PlanItem; weekId: string; projectId: string; };
  onEventCountChange: (weekId: string, taskId: string, change: 1 | -1) => void;
  // FIX: Add missing props to handle task updates, guest status, and project context.
  onUpdateTask: (weekId: string, updatedTask: PlanItem) => void;
  isGuest: boolean;
  project: Project;
  onSubTaskAdded: (parentTask: PlanItem, newSubTask: PlanItem) => void;
}

const TaskDetailView: React.FC<TaskDetailViewProps> = ({ isOpen, onClose, user, context, onEventCountChange, onUpdateTask, isGuest, project, onSubTaskAdded }) => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
    const [preselectedSubTaskType, setPreselectedSubTaskType] = useState<PlanItem['type'] | undefined>(undefined);
    const [quotedEvent, setQuotedEvent] = useState<Event | null>(null);
    const mainRef = useRef<HTMLElement>(null);
    const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
    const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

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
        }
    }, [isOpen, fetchEvents]);
    
    useEffect(() => {
        if (!loading && mainRef.current) {
            mainRef.current.scrollTo({ top: mainRef.current.scrollHeight, behavior: 'auto' });
        }
    }, [loading]);

    const handleNewEvent = (newEvent: Event) => {
        setEvents(currentEvents => {
            if (!currentEvents.some(e => e.id === newEvent.id)) {
                if (!isGuest) { // Don't double-count for guests as it's handled via subscription
                    onEventCountChange(context.weekId, context.item.id, 1);
                }
                return [...currentEvents, newEvent];
            }
            return currentEvents;
        });
        setTimeout(() => {
             mainRef.current?.scrollTo({ top: mainRef.current.scrollHeight, behavior: 'smooth' });
        }, 100)
    };

    const handleDeleteEvent = async () => {
        if (!eventToDelete) return;
        const eventIdToDelete = eventToDelete.id;

        const { error } = await supabase.from('events').delete().eq('id', eventIdToDelete);

        if (error) {
            alert('Ошибка удаления события: ' + error.message);
        } else {
             // Let the subscription handle the UI update to avoid race conditions.
             if (!isGuest) {
                onEventCountChange(context.weekId, context.item.id, -1);
             }
             setEventToDelete(null);
        }
    };
    
    const handleUpdateEvent = async (updatedContent: string) => {
        if (!eventToEdit) return;
        const { data, error } = await supabase
            .from('events')
            .update({ content: updatedContent })
            .eq('id', eventToEdit.id)
            .select('*, parent:events!parent_event_id(content, author_email)')
            .single();
        
        if (error) {
            alert('Ошибка обновления: ' + error.message);
        } else if (data) {
            setEvents(currentEvents => currentEvents.map(e => e.id === eventToEdit.id ? data : e));
            setEventToEdit(null);
        }
    };

    // FIX: Implement a handler for adding sub-tasks.
    const handleAddSubTask = (newSubTask: PlanItem) => {
        const parentTask = context.item;
        const updatedSubTasks = [...(parentTask.sub_tasks || []), newSubTask];
        const updatedTask = { ...parentTask, sub_tasks: updatedSubTasks };
        
        onUpdateTask(context.weekId, updatedTask);
        if (onSubTaskAdded) {
            onSubTaskAdded(parentTask, newSubTask);
        }
        setIsAddEventModalOpen(false);
    };

    useEffect(() => {
        if (!context) return;
        
        const channel = supabase.channel(`public:events:task_id=eq.${context.item.id}`);
        
        channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events', filter: `task_id=eq.${context.item.id}` }, 
            (payload) => {
                 setEvents(currentEvents => {
                    if (!currentEvents.some(e => e.id === payload.new.id)) {
                        onEventCountChange(context.weekId, context.item.id, 1);
                        return [...currentEvents, payload.new as Event];
                    }
                    return currentEvents;
                });
            })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events', filter: `task_id=eq.${context.item.id}`},
            (payload) => {
                // Fetch full event with parent data
                const fetchUpdatedEvent = async () => {
                    const { data } = await supabase.from('events').select('*, parent:events!parent_event_id(content, author_email)').eq('id', payload.new.id).single();
                    if (data) {
                        setEvents(currentEvents => currentEvents.map(e => e.id === payload.new.id ? data : e));
                    }
                }
                fetchUpdatedEvent();
            })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'events', filter: `task_id=eq.${context.item.id}` },
            (payload) => {
                 setEvents(currentEvents => currentEvents.filter(e => e.id !== payload.old.id));
                 onEventCountChange(context.weekId, context.item.id, -1);
            })
        .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [context, onEventCountChange]);
    
    const handleQuoteClick = (eventId: string) => {
        const element = document.getElementById(`event-${eventId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('highlight');
            setTimeout(() => {
                element.classList.remove('highlight');
            }, 1500);
        }
    };
    
    if (!isOpen || !context) return null;
    
    const isAuditor = !!(project && user && user.id === project.user_id);
    const descriptionText = context.item.description || '';
    const needsTruncation = descriptionText.length > 150;
    
    const renderToolbelt = () => {
        if (!user) return null; // No tools for guests
        switch(context.item.type) {
            case 'meeting':
                return <MeetingTools user={user} context={context} events={events} onNewEvent={handleNewEvent} />;
            case 'interview':
                return <InterviewTools user={user} context={context} events={events} onNewEvent={handleNewEvent} />;
            case 'doc_review':
                return <DocReviewTools user={user} context={context} onNewEvent={handleNewEvent} />;
            case 'process_analysis':
                return <ProcessAnalysisTools user={user} context={context} events={events} onNewEvent={handleNewEvent} />;
            default:
                return null;
        }
    }

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 z-40 flex flex-col">
            <style>{`
                .highlight {
                    background-color: #eef2ff; /* indigo-100 */
                    transition: background-color 0.5s ease-in-out;
                }
            `}</style>
            <div className="bg-white m-2 md:m-4 lg:m-8 rounded-lg shadow-xl flex flex-col flex-1 overflow-hidden">
                <header className="flex justify-between items-center p-4 border-b">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Обсуждение задачи</h2>
                        <div className="text-gray-600 prose prose-sm max-w-none">
                            <ReactMarkdown>{context.item.title}</ReactMarkdown>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100">
                        <FaTimes size={20} />
                    </button>
                </header>
                
                {renderToolbelt()}
                
                {descriptionText && (
                    <div className="p-4 border-b bg-gray-50 text-sm text-gray-700">
                        <div className={`prose prose-sm max-w-none ${!isDescriptionExpanded ? 'line-clamp-2 md:line-clamp-none' : ''}`}>
                            <ReactMarkdown>{descriptionText}</ReactMarkdown>
                        </div>
                         {needsTruncation && (
                            <button
                                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                className="text-sm text-blue-600 hover:underline mt-1 md:hidden"
                            >
                                {isDescriptionExpanded ? 'Свернуть' : 'Читать далее...'}
                            </button>
                        )}
                    </div>
                )}
                
                {context.item.sub_tasks && context.item.sub_tasks.length > 0 && (
                    <div className="p-4 border-b bg-gray-50">
                        <h4 className="text-sm font-semibold mb-2">Подзадачи:</h4>
                        <div className="space-y-2">
                            {context.item.sub_tasks.map(sub => <SubTaskItem key={sub.id} item={sub} />)}
                        </div>
                    </div>
                )}

                <main ref={mainRef} className="flex-1 overflow-y-auto p-4">
                     {loading ? <div className="flex justify-center pt-10"><Spinner size="lg" /></div> : (
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
                                        isExpanded={event.id === expandedEventId}
                                        onToggleExpand={() => setExpandedEventId(prevId => prevId === event.id ? null : event.id)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 text-center pt-8">Событий пока нет. Начните обсуждение!</p>
                        )
                    )}
                     {!loading && isAuditor && <AiActionBar task={context.item} events={events} onNewEvent={handleNewEvent} />}

                </main>

                <footer className="p-4 bg-gray-50 border-t">
                    {project ? (
                         <AddEventForm 
                            user={user} 
                            context={{ weekId: context.weekId, taskId: context.item.id, projectId: context.projectId }} 
                            quotedEvent={quotedEvent}
                            onClearQuote={() => setQuotedEvent(null)}
                            onNewEvent={handleNewEvent}
                            onAddStructuredEvent={() => {
                                setPreselectedSubTaskType(isGuest ? 'meeting' : undefined);
                                setIsAddEventModalOpen(true);
                            }}
                            project={project}
                            task={context.item}
                            isGuest={isGuest}
                        />
                    ) : (
                        <p className="text-sm text-center text-gray-500">Загрузка...</p>
                    )}
                </footer>
            </div>
            
            <AddEventModal
                isOpen={isAddEventModalOpen}
                onClose={() => setIsAddEventModalOpen(false)}
                user={user}
                onAddSubTask={handleAddSubTask}
                parentItem={context.item}
                parentEvent={quotedEvent}
                isGuest={isGuest}
                preselectedType={preselectedSubTaskType}
            />
            <ConfirmationModal
                isOpen={!!eventToDelete}
                onClose={() => setEventToDelete(null)}
                onConfirm={handleDeleteEvent}
                title="Удалить событие?"
                message={`Вы уверены, что хотите удалить это событие? Действие необратимо.`}
            />
            {eventToEdit && (
                 <EditEventModal 
                    isOpen={!!eventToEdit}
                    onClose={() => setEventToEdit(null)}
                    event={eventToEdit}
                    onUpdate={handleUpdateEvent}
                />
            )}
        </div>
    );
};

export default TaskDetailView;
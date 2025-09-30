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
import InterviewTools from './InterviewTools';
import MeetingTools from './MeetingTools';
import DocReviewTools from './DocReviewTools';
import ProcessAnalysisTools from './ProcessAnalysisTools';

interface TaskDetailViewProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  context: { item: PlanItem; weekId: string; projectId: string; };
  onEventCountChange: (weekId: string, taskId: string, change: 1 | -1) => void;
  isGuest: boolean;
  project: Project;
}

const TaskDetailView: React.FC<TaskDetailViewProps> = ({ isOpen, onClose, user, context, onEventCountChange, isGuest, project }) => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
    const [quotedEvent, setQuotedEvent] = useState<Event | null>(null);
    const mainRef = useRef<HTMLElement>(null);
    const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

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

    const handleNewEvent = (newEvent: Event) => {
        setEvents(currentEvents => {
            if (!currentEvents.some(e => e.id === newEvent.id)) {
                 onEventCountChange(context.weekId, context.item.id, 1);
                return [...currentEvents, newEvent];
            }
            return currentEvents;
        });
        // Scroll to bottom after new event is added
        setTimeout(() => {
            mainRef.current?.scrollTo({ top: mainRef.current.scrollHeight, behavior: 'smooth' });
        }, 100);
    };

    const handleDeleteEvent = async () => {
        if (!eventToDelete) return;
        const eventIdToDelete = eventToDelete.id;

        const { error } = await supabase.from('events').delete().eq('id', eventIdToDelete);

        if (error) {
            alert('Ошибка удаления события: ' + error.message);
        } else {
             setEvents(currentEvents => currentEvents.filter(e => e.id !== eventIdToDelete));
             onEventCountChange(context.weekId, context.item.id, -1);
             setEventToDelete(null);
        }
    };

    useEffect(() => {
        if (!context) return;
        
        const channel = supabase.channel(`public:events:task_id=eq.${context.item.id}`);
        
        channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events', filter: `task_id=eq.${context.item.id}` }, 
            (payload) => {
                 setEvents(currentEvents => {
                    if (!currentEvents.some(e => e.id === payload.new.id)) {
                        return [...currentEvents, payload.new as Event];
                    }
                    return currentEvents;
                });
            })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'events', filter: `task_id=eq.${context.item.id}` },
            (payload) => {
                 setEvents(currentEvents => currentEvents.filter(e => e.id !== payload.old.id));
            })
        .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [context]);
    
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
    
    const renderTaskTools = () => {
        if (!user) return null; // Tools are for auditors only
        
        const props = { user, context, events, onNewEvent };

        switch (context.item.type) {
            case 'interview':
                return <InterviewTools {...props} />;
            case 'meeting':
                return <MeetingTools {...props} />;
            case 'doc_review':
                return <DocReviewTools {...props} />;
            case 'process_analysis':
                return <ProcessAnalysisTools {...props} />;
            default:
                return null;
        }
    };

    if (!isOpen || !context) return null;

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 z-40 flex flex-col">
            <style>{`
                .highlight {
                    background-color: #eef2ff; /* indigo-100 */
                    transition: background-color 0.5s ease-in-out;
                }
            `}</style>
            <div className="bg-white m-2 md:m-4 lg:m-8 rounded-lg shadow-xl flex flex-col flex-1 overflow-hidden">
                <header className="flex justify-between items-start p-4 border-b">
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-800">Обсуждение задачи</h2>
                        <div className="text-gray-600 prose prose-sm max-w-none mt-1">
                            <ReactMarkdown>{context.item.content}</ReactMarkdown>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100 ml-4">
                        <FaTimes size={20} />
                    </button>
                </header>
                
                {renderTaskTools()}

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
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 text-center pt-8">Событий пока нет. Начните обсуждение!</p>
                        )
                    )}
                </main>

                <footer className="p-4 bg-gray-50 border-t">
                    {(user || isGuest) && project ? (
                         <AddEventForm 
                            user={user} 
                            context={{ weekId: context.weekId, taskId: context.item.id, projectId: context.projectId }} 
                            quotedEvent={quotedEvent}
                            onClearQuote={() => setQuotedEvent(null)}
                            onNewEvent={handleNewEvent}
                            onAddStructuredEvent={() => setIsAddEventModalOpen(true)}
                            project={project}
                            task={context.item}
                            isGuest={isGuest}
                        />
                    ) : (
                        <p className="text-sm text-center text-gray-500">Войдите, чтобы участвовать в обсуждении.</p>
                    )}
                </footer>
            </div>
            
             {(user || isGuest) && (
                <AddEventModal
                    isOpen={isAddEventModalOpen}
                    onClose={() => setIsAddEventModalOpen(false)}
                    user={user}
                    context={{ weekId: context.weekId, taskId: context.item.id, projectId: context.projectId }}
                    // Fix: Changed shorthand property to a proper key-value pair.
                    onNewEvent={handleNewEvent}
                    project={project}
                    task={context.item}
                    isGuest={isGuest}
                />
            )}
            <ConfirmationModal
                isOpen={!!eventToDelete}
                onClose={() => setEventToDelete(null)}
                onConfirm={handleDeleteEvent}
                title="Удалить событие?"
                message={`Вы уверены, что хотите удалить это событие? Действие необратимо.`}
            />
        </div>
    );
};

export default TaskDetailView;
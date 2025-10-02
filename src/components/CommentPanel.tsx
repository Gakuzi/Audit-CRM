import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { Event, Plan, PlanItem, Project } from '../types';
import EventItem from './EventItem';
import AddEventForm from './AddEventForm';
import { Spinner } from './ui/Spinner';
import { FaTimes, FaVideo } from 'react-icons/fa';
import AddMeetingModal from './AddMeetingModal';

interface CommentPanelProps {
  user: User | null;
  providerToken: string | null;
  context: { item: PlanItem; weekId: string; projectId: string; };
  onClose: () => void;
  onNewEvent: (event: Event) => void;
  project: Project;
  isGuest: boolean;
  onAddSubTaskRequest: () => void;
}

const CommentPanel: React.FC<CommentPanelProps> = ({ user, providerToken, context, onClose, onNewEvent, project, isGuest, onAddSubTaskRequest }) => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
    const [quotedEvent, setQuotedEvent] = useState<Event | null>(null);
    const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
    const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
    const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

    const fetchEvents = useCallback(async (showLoading = true) => {
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
    }, [context.item.id]);

    useEffect(() => {
        fetchEvents();

        const subscription = supabase.channel(`public:events:task_id=eq.${context.item.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `task_id=eq.${context.item.id}` }, () => fetchEvents(false))
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [context.item.id, fetchEvents]);

    const handleQuoteClick = (eventId: string) => {
        const element = document.getElementById(`event-${eventId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('highlight');
            setTimeout(() => element.classList.remove('highlight'), 1000);
        }
    };

    const isAuditor = user?.id === project.user_id;

    return (
        <aside className="bg-white rounded-lg shadow-lg p-4 sticky top-6 h-[calc(100vh-3rem)] flex flex-col">
             <style>{`.highlight { background-color: #eef2ff; transition: background-color 0.5s; }`}</style>
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Обсуждение</h3>
                    <p className="text-sm text-gray-600 truncate" title={context.item.title}>{context.item.title}</p>
                </div>
                <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800"><FaTimes /></button>
            </div>

            <div className="flex-grow overflow-y-auto py-2 pr-2 -mr-2">
                {loading ? <Spinner /> : (
                    events.length > 0 ? (
                        <div className="divide-y divide-gray-200">
                            {events.map(event => (
                                <EventItem 
                                    key={event.id} 
                                    event={event} 
                                    onReply={setQuotedEvent} 
                                    onQuoteClick={handleQuoteClick} 
                                    isExpanded={event.id === expandedEventId} 
                                    onToggleExpand={() => setExpandedEventId(prev => prev === event.id ? null : event.id)}
                                    onDelete={isAuditor ? () => setEventToDelete(event) : undefined}
                                    onEdit={isAuditor ? () => setEventToEdit(event) : undefined}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 text-center pt-8">Комментариев пока нет. Начните обсуждение!</p>
                    )
                )}
            </div>
            
            <div className="pt-2 border-t border-gray-200">
                <AddEventForm 
                    user={user} 
                    providerToken={providerToken}
                    context={context} 
                    quotedEvent={quotedEvent} 
                    onClearQuote={() => setQuotedEvent(null)} 
                    onNewEvent={onNewEvent}
                    project={project}
                    isGuest={isGuest}
                    onAddSubTaskRequest={onAddSubTaskRequest}
                />
            </div>

            {user && project && context.item && (
                <AddMeetingModal
                    isOpen={isMeetingModalOpen}
                    onClose={() => setIsMeetingModalOpen(false)}
                    context={context}
                    user={user}
                    project={project}
                    task={context.item}
                />
            )}
        </aside>
    );
};

export default CommentPanel;

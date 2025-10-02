

import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { Event, PlanItem, Project } from '../types';
import EventItem from './EventItem';
import AddEventForm from './AddEventForm';
import { Spinner } from './ui/Spinner';
import { FaTimes } from 'react-icons/fa';

interface CommentPanelProps {
  user: User | null;
  // Fix: Add project and task to props interface
  project: Project;
  task: PlanItem;
  // Fix: Let context be more specific
  context: { weekId: string; taskId: string; };
  onClose: () => void;
  // Fix: Add props for event count changes and new events
  onEventCountChange: (weekId: string, taskId: string, change: 1 | -1) => void;
  onNewEvent: (event: Event) => void;
}

const CommentPanel: React.FC<CommentPanelProps> = ({ user, project, task, context, onClose, onNewEvent }) => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [quotedEvent, setQuotedEvent] = useState<Event | null>(null);
    const [expandedEventId, setExpandedEventId] = useState<string | null>(null);


    const fetchEventsAndProject = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('events')
            .select('*, parent:events!parent_event_id(content, author_email)')
            .eq('task_id', context.taskId)
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error("Error fetching events:", error);
        } else {
            setEvents(data || []);
        }

        setLoading(false);
    }, [context.taskId]);

    useEffect(() => {
        fetchEventsAndProject();

        const subscription = supabase.channel(`public:events:task_id=eq.${context.taskId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `task_id=eq.${context.taskId}` }, fetchEventsAndProject)
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [context.taskId, fetchEventsAndProject]);

    const handleQuoteClick = (eventId: string) => {
        const element = document.getElementById(`event-${eventId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const isGuest = !user;

    return (
        <aside className="bg-white rounded-lg shadow-md p-4 sticky top-6 h-[calc(100vh-3rem)] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Обсуждение</h3>
                    <p className="text-sm text-gray-600 truncate" title={task.title}>{task.title}</p>
                </div>
                <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800"><FaTimes /></button>
            </div>

            <div className="flex-grow overflow-y-auto py-2">
                {loading ? <Spinner /> : (
                    events.length > 0 ? (
                        <div className="divide-y divide-gray-200">
                            {events.map(event => 
                                <EventItem 
                                    key={event.id} 
                                    event={event} 
                                    onReply={setQuotedEvent} 
                                    onQuoteClick={handleQuoteClick} 
                                    isExpanded={event.id === expandedEventId}
                                    onToggleExpand={() => setExpandedEventId(prev => prev === event.id ? null : event.id)}
                                />
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 text-center pt-8">Комментариев пока нет. Начните обсуждение!</p>
                    )
                )}
            </div>
            
            <div className="pt-2 border-t border-gray-200">
                 {(user || isGuest) && (
                    <AddEventForm 
                        user={user} 
                        context={{...context, projectId: project.id}} 
                        quotedEvent={quotedEvent} 
                        onClearQuote={() => setQuotedEvent(null)} 
                        onNewEvent={onNewEvent}
                        project={project}
                        isGuest={isGuest}
                    />
                 )}
            </div>
        </aside>
    );
};

export default CommentPanel;
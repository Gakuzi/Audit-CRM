import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { Event, Plan, PlanItem, Project, CompanyProfile } from '../types';
import EventItem from './EventItem';
import AddEventForm from './AddEventForm';
import { Spinner } from './ui/Spinner';
import { FaTimes, FaVideo } from 'react-icons/fa';
import AddMeetingModal from './AddMeetingModal';

interface CommentPanelProps {
  user: User | null;
  context: { weekId: string; taskId: string; taskContent: string };
  onClose: () => void;
}

const CommentPanel: React.FC<CommentPanelProps> = ({ user, context, onClose }) => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
    const [projectId, setProjectId] = useState<string | null>(null);
    const [project, setProject] = useState<Project | null>(null);
    const [task, setTask] = useState<PlanItem | null>(null);
    const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);

    const fetchEventsAndProject = useCallback(async () => {
        setLoading(true);
        const eventsPromise = supabase
            .from('events')
            .select('*')
            .eq('task_id', context.taskId)
            .order('created_at', { ascending: true });
        
        const weekPromise = supabase
            .from('weeks')
            .select('project_id, plan')
            .eq('id', context.weekId)
            .single();

        const [eventsResult, weekResult] = await Promise.all([eventsPromise, weekPromise]);
        
        if (eventsResult.error) {
            console.error("Error fetching events:", eventsResult.error);
        } else {
            setEvents(eventsResult.data || []);
        }
        
        if (weekResult.error) {
            console.error("Error fetching project_id from week:", weekResult.error);
        } else if (weekResult.data) {
            const fetchedProjectId = weekResult.data.project_id;
            setProjectId(fetchedProjectId);
            
            const plan: Plan = weekResult.data.plan;
            let foundTask: PlanItem | undefined;
            for (const date in plan) {
                if(plan[date]?.tasks) {
                    foundTask = plan[date].tasks.find(t => t.id === context.taskId);
                    if (foundTask) break;
                }
            }
            setTask(foundTask || {id: context.taskId, title: context.taskContent, completed: false, type: 'task'});
            
            if(fetchedProjectId) {
                const projectPromise = supabase.from('projects').select('*').eq('id', fetchedProjectId).single();
                const companyProfilePromise = supabase.from('company_profiles').select('*').eq('project_id', fetchedProjectId).single();
                const [projectResult, companyProfileResult] = await Promise.all([projectPromise, companyProfilePromise]);

                if (projectResult.error) {
                     console.error("Error fetching project:", projectResult.error);
                } else {
                     setProject(projectResult.data);
                }

                if (companyProfileResult.error && companyProfileResult.error.code !== 'PGRST116') {
                    console.error("Error fetching company profile:", companyProfileResult.error);
                } else {
                    setCompanyProfile(companyProfileResult.data);
                }
            }
        }

        setLoading(false);
    }, [context.taskId, context.weekId, context.taskContent]);

    useEffect(() => {
        fetchEventsAndProject();

        const subscription = supabase.channel(`public:events:task_id=eq.${context.taskId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `task_id=eq.${context.taskId}` }, fetchEventsAndProject)
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [context.taskId, fetchEventsAndProject]);

    const handleReply = (_event: Event) => {
        // Reply functionality is not implemented in this simplified panel.
        // The full-featured reply is in TaskDetailView.
    };

    const handleQuoteClick = (_eventId: string) => {
        // Quote click functionality is not implemented in this simplified panel.
    };

    const isGuest = !user;

    return (
        <aside className="bg-white rounded-lg shadow-md p-4 sticky top-6 h-[calc(100vh-3rem)] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Обсуждение</h3>
                    <p className="text-sm text-gray-600 truncate" title={context.taskContent}>{context.taskContent}</p>
                </div>
                <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800"><FaTimes /></button>
            </div>

            <div className="flex-grow overflow-y-auto py-2">
                {loading ? <Spinner /> : (
                    events.length > 0 ? (
                        <div className="divide-y divide-gray-200">
                            {events.map(event => <EventItem key={event.id} event={event} contacts={companyProfile?.contacts || []} onReply={handleReply} onQuoteClick={handleQuoteClick} isExpanded={false} onToggleExpand={()=>{}} />)}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 text-center pt-8">Комментариев пока нет. Начните обсуждение!</p>
                    )
                )}
            </div>
            
            <div className="pt-2 border-t border-gray-200">
                 {(user || isGuest) && (
                    <div className="flex items-center space-x-2 mb-2">
                         <button onClick={() => setIsMeetingModalOpen(true)} className="flex-1 flex items-center justify-center text-sm bg-purple-100 text-purple-700 hover:bg-purple-200 py-2 px-3 rounded-md">
                            <FaVideo className="mr-2"/> Запланировать встречу
                        </button>
                    </div>
                 )}
                {(user || isGuest) && projectId && project && task ? <AddEventForm user={user} providerToken={null} context={{...context, projectId, item: task}} quotedEvent={null} onClearQuote={() => {}} onNewEvent={() => {}} project={project} contacts={companyProfile?.contacts || []} isGuest={isGuest} onAddSubTaskRequest={() => {}} /> : <p className="text-sm text-center text-gray-500">Войдите, чтобы оставлять комментарии.</p>}
            </div>

            {(user || isGuest) && projectId && project && task && (
                <AddMeetingModal
                    isOpen={isMeetingModalOpen}
                    onClose={() => setIsMeetingModalOpen(false)}
                    context={{...context, projectId}}
                    user={user}
                    project={project}
                    task={task}
                />
            )}
        </aside>
    );
};

export default CommentPanel;
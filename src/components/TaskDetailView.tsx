import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { Event, PlanItem, Project } from '../types';
import { analyzeAudioRecording, analyzeDiagram, analyzeImageFromUrl, continueConversation, summarizeAndContinue } from '../services/geminiService';
import EventItem from './EventItem';
import AddEventForm from './AddEventForm';
import { Spinner } from './ui/Spinner';
import { FaTimes, FaEdit, FaSave, FaComments, FaBrain } from 'react-icons/fa';
import AddEventModal from './AddEventModal';
import ConfirmationModal from './ConfirmationModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import InterviewTools from './InterviewTools';
import MeetingTools from './MeetingTools';
import DocReviewTools from './DocReviewTools';
import ProcessAnalysisTools from './ProcessAnalysisTools';
import SubTaskItem from './SubTaskItem';

interface TaskDetailViewProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  context: { item: PlanItem; weekId: string; projectId: string; };
  onEventCountChange: (weekId: string, taskId: string, change: 1 | -1) => void;
  onUpdateTask: (weekId: string, updatedTask: PlanItem) => void;
  isGuest: boolean;
  project: Project;
  onSubTaskAdded: (parentTask: PlanItem, newSubTask: PlanItem) => void;
}

const TaskDetailView: React.FC<TaskDetailViewProps> = ({ isOpen, onClose, user, context, onEventCountChange, onUpdateTask, isGuest, project, onSubTaskAdded }) => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
    const [quotedEvent, setQuotedEvent] = useState<Event | null>(null);
    const mainRef = useRef<HTMLElement>(null);
    const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
    const [isAiThinking, setIsAiThinking] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState('');
    const [editedDescription, setEditedDescription] = useState('');
    const [analyzingEventId, setAnalyzingEventId] = useState<string | null>(null);
    const [parentEventForNewEvent, setParentEventForNewEvent] = useState<Event | null>(null);
    
    const isAuditor = !isGuest && user?.id === project.user_id;

    const handleOpenSubEventModal = (parentEvent: Event) => {
        setParentEventForNewEvent(parentEvent);
        setIsAddEventModalOpen(true);
    };

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
            setEditedTitle(context.item.title);
            setEditedDescription(context.item.description || '');
            setIsEditing(false);
        }
    }, [isOpen, fetchEvents, context]);

    const createAiReply = async (analysisText: string, parentEventId?: string) => {
        if (!user) return null;
        const { data, error } = await supabase.from('events').insert({
            project_id: context.projectId,
            week_id: context.weekId,
            task_id: context.item.id,
            user_id: user.id,
            author_email: 'AI Ассистент',
            type: 'comment',
            content: analysisText,
            parent_event_id: parentEventId
        }).select('*, parent:events!parent_event_id(content, author_email)').single();

        if (error) throw error;
        return data as Event;
    };
    
    const triggerAiContinuation = async (currentEvents: Event[]) => {
        setIsAiThinking(true);
        try {
            const aiResponseText = await continueConversation(context.item, currentEvents);
            const newAiEvent = await createAiReply(aiResponseText, currentEvents[currentEvents.length - 1].id);
            if (newAiEvent) {
                handleNewEvent(newAiEvent, false); // Add without re-triggering
            }
        } catch (err: any) {
            alert("Ошибка AI: " + err.message);
        } finally {
            setIsAiThinking(false);
        }
    };

    const handleNewEvent = (newEvent: Event, triggerAiCheck = true) => {
        const updatedEvents = [...events, newEvent];
        setEvents(updatedEvents);
        
        if (!isAiThinking) { // Don't increment count for AI's own reply
            onEventCountChange(context.weekId, context.item.id, 1);
        }
        
        setTimeout(() => {
            mainRef.current?.scrollTo({ top: mainRef.current.scrollHeight, behavior: 'smooth' });
        }, 100);

        if (triggerAiCheck) {
            const parentEvent = events.find(e => e.id === newEvent.parent_event_id);
            if (parentEvent && parentEvent.author_email === 'AI Ассистент' && newEvent.author_email !== 'AI Ассистент') {
                triggerAiContinuation(updatedEvents);
            }
        }
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
    
    const handleAiDiscussionTrigger = async () => {
        setIsAiThinking(true);
        try {
            const summaryText = await summarizeAndContinue(context.item, events);
            const newAiEvent = await createAiReply(summaryText);
            if (newAiEvent) {
                handleNewEvent(newAiEvent, false);
            }
        } catch (err: any) {
             alert("Ошибка AI: " + err.message);
        } finally {
            setIsAiThinking(false);
        }
    };


    const handleSave = () => {
        const updatedTask = {
            ...context.item,
            title: editedTitle,
            description: editedDescription,
        };
        onUpdateTask(context.weekId, updatedTask);
        setIsEditing(false);
    };

    const handleAddSubTask = (subTask: PlanItem) => {
        const updatedParentTask = {
            ...context.item,
            sub_tasks: [...(context.item.sub_tasks || []), subTask],
        };
        onUpdateTask(context.weekId, updatedParentTask);
        onSubTaskAdded(context.item, subTask);
    };

    const handleAnalyze = async (eventToAnalyze: Event) => {
        setAnalyzingEventId(eventToAnalyze.id);
        setIsAiThinking(true);
        try {
            let analysisResult = '';
            const imageFile = eventToAnalyze.data?.file_urls?.find(f => f.type?.startsWith('image/'));
            const audioFile = eventToAnalyze.data?.file_urls?.find(f => f.type?.startsWith('audio/'));
            const isDiagram = eventToAnalyze.content?.trim().startsWith('mindmap') || eventToAnalyze.content?.trim().startsWith('graph');

            if (imageFile) {
                analysisResult = await analyzeImageFromUrl(imageFile.url);
            } else if (audioFile) {
                const taskContext = `${context.item.title}\n\n${context.item.description || ''}`;
                analysisResult = await analyzeAudioRecording(taskContext, audioFile.name);
            } else if (isDiagram) {
                analysisResult = await analyzeDiagram(eventToAnalyze.content);
            } else {
                throw new Error("Нет контента для анализа.");
            }

            const aiEvent = await createAiReply(analysisResult, eventToAnalyze.id);
            if (aiEvent) handleNewEvent(aiEvent, false);

        } catch (err: any) {
            alert(`Ошибка анализа: ${err.message}`);
        } finally {
            setAnalyzingEventId(null);
            setIsAiThinking(false);
        }
    };

    useEffect(() => {
        if (!context) return;
        const channel = supabase.channel(`public:events:task_id=eq.${context.item.id}`);
        channel.on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `task_id=eq.${context.item.id}` }, 
            (payload) => {
                if (payload.eventType === 'INSERT') {
                     setEvents(current => current.find(e => e.id === payload.new.id) ? current : [...current, payload.new as Event]);
                } else if (payload.eventType === 'DELETE') {
                     setEvents(current => current.filter(e => e.id !== payload.old.id));
                }
            }
        ).subscribe();
        return () => { supabase.removeChannel(channel) };
    }, [context]);
    
    const handleQuoteClick = (eventId: string) => {
        const element = document.getElementById(`event-${eventId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('highlight');
            setTimeout(() => { element.classList.remove('highlight'); }, 1500);
        }
    };
    
    const renderTaskTools = () => {
        if (!isAuditor || !user) return null;
        const props = { user, context, events, onNewEvent: handleNewEvent };
        switch (context.item.type) {
            case 'interview': return <InterviewTools {...props} />;
            case 'meeting': return <MeetingTools {...props} />;
            case 'doc_review': return <DocReviewTools {...props} />;
            case 'process_analysis': return <ProcessAnalysisTools {...props} />;
            default: return null;
        }
    };

    if (!isOpen || !context) return null;

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 z-40 flex flex-col">
            <style>{`.highlight { background-color: #eef2ff; transition: background-color 0.5s ease-in-out; }`}</style>
            <div className="bg-white m-2 md:m-4 lg:m-8 rounded-lg shadow-xl flex flex-col flex-1 overflow-hidden">
                <header className="flex justify-between items-start p-4 border-b gap-4">
                    <div className="flex-1">
                        {isEditing && isAuditor ? (
                            <input 
                                type="text"
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                className="text-xl font-bold text-gray-800 w-full input"
                            />
                        ) : (
                             <div className="text-xl font-bold text-gray-800 prose">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{context.item.title}</ReactMarkdown>
                             </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {isAuditor && (
                            <>
                                {isEditing ? (
                                    <>
                                        <button onClick={() => setIsEditing(false)} className="btn-secondary px-3 py-1.5 text-xs">Отмена</button>
                                        <button onClick={handleSave} className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1"><FaSave /> Сохранить</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={handleAiDiscussionTrigger} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full hover:bg-gray-100" title="Обсудить с AI">
                                            <FaComments size={16} />
                                        </button>
                                        <button onClick={() => setIsEditing(true)} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100" title="Редактировать задачу">
                                            <FaEdit size={16} />
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                        <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100">
                            <FaTimes size={20} />
                        </button>
                    </div>
                </header>
                
                {renderTaskTools()}

                <main ref={mainRef} className="flex-1 overflow-y-auto p-4">
                     {isEditing && isAuditor ? (
                         <textarea
                            value={editedDescription}
                            onChange={(e) => setEditedDescription(e.target.value)}
                            className="w-full h-32 input mb-6"
                            placeholder="Подробное описание..."
                         />
                     ) : (
                        context.item.description && (
                            <div className="prose prose-sm mb-6 p-4 bg-gray-50 rounded-md border">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{context.item.description}</ReactMarkdown>
                            </div>
                        )
                     )}
                     
                     {context.item.sub_tasks && context.item.sub_tasks.length > 0 && (
                        <div className="mb-6">
                            <h4 className="text-sm font-bold text-gray-600 mb-2">Подзадачи</h4>
                            <div className="space-y-2">
                                {context.item.sub_tasks.map(sub => (
                                    <SubTaskItem key={sub.id} item={sub} />
                                ))}
                            </div>
                        </div>
                     )}

                     {loading ? <div className="flex justify-center pt-10"><Spinner size="lg" /></div> : (
                        <>
                            <div className="divide-y divide-gray-200">
                                {events.map(event => (
                                    <EventItem 
                                        key={event.id} 
                                        event={event} 
                                        onReply={setQuotedEvent}
                                        onQuoteClick={handleQuoteClick}
                                        onDelete={user?.id === event.user_id ? () => setEventToDelete(event) : undefined}
                                        onAnalyze={handleAnalyze}
                                        isAnalyzing={analyzingEventId === event.id}
                                        isAuditor={isAuditor}
                                        onAddSubEvent={isAuditor ? handleOpenSubEventModal : undefined}
                                    />
                                ))}
                            </div>
                             {isAiThinking && (
                                <div className="flex items-start space-x-3 py-4">
                                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                        <FaBrain className="text-indigo-500"/>
                                    </div>
                                    <div className="flex-1 pt-2">
                                        <Spinner size="sm" />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                     {!loading && events.length === 0 && !isEditing && (
                        <p className="text-sm text-gray-500 text-center pt-8">Событий пока нет. Начните обсуждение!</p>
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
                    onClose={() => {
                        setIsAddEventModalOpen(false);
                        setParentEventForNewEvent(null);
                    }}
                    user={user}
                    onAddSubTask={handleAddSubTask}
                    parentItem={context.item}
                    parentEvent={parentEventForNewEvent}
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
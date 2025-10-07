import React, { useState, useRef, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, sendGuestEventNotification } from '../services/supabaseClient';
import { Spinner } from './ui/Spinner';
import { Event, Project, PlanItem } from '../types';
import { FaTimes, FaPlus, FaPaperPlane, FaTasks } from 'react-icons/fa';

interface AddEventFormProps {
  user: User | null;
  providerToken: string | null;
  context: { weekId: string; taskId: string; projectId: string; };
  quotedEvent: Event | null;
  onClearQuote: () => void;
  onNewEvent: (event: Event) => void;
  project: Project;
  isGuest: boolean;
  onAddSubTaskRequest: () => void;
}

const AddEventForm: React.FC<AddEventFormProps> = ({ user, providerToken, context, quotedEvent, onClearQuote, onNewEvent, project, isGuest, onAddSubTaskRequest }) => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [content]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.from('events').insert({
                project_id: context.projectId,
                week_id: context.weekId,
                task_id: context.taskId,
                user_id: user ? user.id : null,
                author_email: user ? user.email : (localStorage.getItem('guestName') || 'Гость'),
                type: 'comment' as const,
                content: content.trim(),
                parent_event_id: quotedEvent?.id || null,
            }).select().single();

            if (error) throw error;
            
            if (data) {
                const newEvent = data as Event;
                onNewEvent(newEvent);
                // The task item is not available here, so we create a mock one for the notification
                const mockTask: PlanItem = { id: context.taskId, title: 'задаче', completed: false, type: 'task' };
                if (isGuest) {
                    sendGuestEventNotification(project, mockTask, newEvent, window.location.origin);
                }
                setContent(''); 
                onClearQuote();
            }
        } catch(err: any) {
            alert('Ошибка: ' + err.message);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="relative">
            <div className="bg-white p-2 rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500">
                {quotedEvent && (
                    <div className="p-2 mb-2 bg-gray-100 rounded-md text-sm relative border-l-4 border-blue-400">
                        <p className="font-semibold text-gray-700">Ответ на: {quotedEvent.author_email}</p>
                        <p className="truncate text-gray-600">{quotedEvent.content}</p>
                        <button onClick={onClearQuote} className="absolute top-1.5 right-1.5 p-1 rounded-full hover:bg-gray-200"><FaTimes size={12}/></button>
                    </div>
                )}
                <form onSubmit={handleSubmit} className="flex items-end gap-2">
                    <div className="relative">
                        <button type="button" onClick={onAddSubTaskRequest} className="action-btn flex-shrink-0">
                            <FaPlus />
                        </button>
                    </div>
                    <textarea ref={textareaRef} value={content} onChange={(e) => setContent(e.target.value)} rows={1} placeholder="Напишите комментарий..." disabled={loading} className="w-full p-2 border-0 focus:ring-0 resize-none bg-transparent textarea-autogrow" />
                    <button type="submit" disabled={loading || (!content.trim())} className="btn-primary p-2.5 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
                        {loading ? <Spinner size="sm" /> : <FaPaperPlane />}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddEventForm;

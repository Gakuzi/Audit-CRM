import React, { useState } from 'react';
import { PlanItem, Event } from '../types';
import { continueConversation, summarizeAndContinue } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';
import { Spinner } from './ui/Spinner';
import { FaComments, FaClipboardList } from 'react-icons/fa';

interface AiActionBarProps {
    task: PlanItem;
    events: Event[];
    onNewEvent: (event: Event) => void;
}

const AiActionBar: React.FC<AiActionBarProps> = ({ task, events, onNewEvent }) => {
    const [loading, setLoading] = useState<string | null>(null);

    const handleAiAction = async (action: 'continue' | 'summarize') => {
        setLoading(action);
        try {
            const aiResponseText = action === 'continue'
                ? await continueConversation(task, events)
                : await summarizeAndContinue(task, events);

            const latestEvent = events[events.length - 1];
            if (!latestEvent) throw new Error("Cannot continue conversation without any previous events.");

            const { data, error } = await supabase.from('events').insert({
                project_id: latestEvent.project_id,
                week_id: latestEvent.week_id,
                task_id: task.id,
                user_id: latestEvent.user_id, // Attributed to the last user, but authored by AI
                author_email: 'AI Ассистент',
                type: 'comment',
                content: aiResponseText,
            }).select().single();

            if (error) throw error;
            onNewEvent(data as Event);

        } catch (error: any) {
            alert(`Ошибка AI: ${error.message}`);
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="mt-4 pt-4 border-t border-dashed flex items-center justify-center gap-4">
            <button 
                onClick={() => handleAiAction('continue')} 
                disabled={!!loading || events.length === 0}
                className="btn-secondary flex items-center gap-2 text-sm"
                title={events.length === 0 ? "Начните диалог, чтобы AI мог его продолжить" : "Попросить AI продолжить диалог"}
            >
                {loading === 'continue' ? <Spinner size="sm" /> : <FaComments />}
                Продолжить диалог
            </button>
            <button 
                onClick={() => handleAiAction('summarize')} 
                disabled={!!loading || events.length < 2}
                className="btn-secondary flex items-center gap-2 text-sm"
                title={events.length < 2 ? "Нужно больше сообщений для анализа" : "Попросить AI подвести итог"}
            >
                {loading === 'summarize' ? <Spinner size="sm" /> : <FaClipboardList />}
                Суммаризировать
            </button>
        </div>
    );
};

export default AiActionBar;

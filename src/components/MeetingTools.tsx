import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Event, PlanItem } from '../types';
import { generateMeetingAgenda, summarizeDiscussion } from '../services/geminiService';
import { FaListAlt, FaClipboardCheck } from 'react-icons/fa';
import { Spinner } from './ui/Spinner';
import { supabase } from '../services/supabaseClient';

interface ToolProps {
    user: User;
    context: { item: PlanItem; weekId: string; projectId: string; };
    events: Event[];
    onNewEvent: (event: Event) => void;
}

const MeetingTools: React.FC<ToolProps> = ({ user, context, events, onNewEvent }) => {
    const [loading, setLoading] = useState<string | null>(null);

    const createNewEvent = async (content: string) => {
        const { data, error } = await supabase.from('events').insert({
            project_id: context.projectId,
            week_id: context.weekId,
            task_id: context.item.id,
            user_id: user.id,
            author_email: 'AI Ассистент',
            type: 'comment',
            content,
        }).select().single();

        if (error) throw error;
        onNewEvent(data as Event);
    };

    const handleGenerateAgenda = async () => {
        setLoading('agenda');
        try {
            // Fix: Use `title` and `description` from PlanItem instead of non-existent `content`.
            const taskContext = `${context.item.title}\n\n${context.item.description || ''}`;
            const agenda = await generateMeetingAgenda(taskContext);
            await createNewEvent(`**Сгенерированная повестка встречи:**\n\n${agenda}`);
        } catch (error: any) {
            alert("Ошибка генерации повестки: " + error.message);
        } finally {
            setLoading(null);
        }
    };
    
    const handleSummarize = async () => {
        setLoading('summary');
        try {
            // Fix: Use `title` and `description` from PlanItem instead of non-existent `content`.
            const taskContext = `${context.item.title}\n\n${context.item.description || ''}`;
            const summary = await summarizeDiscussion(taskContext, events);
            await createNewEvent(`**Резюме обсуждения (Meeting Minutes):**\n\n${summary}`);
        } catch (error: any) {
            alert("Ошибка суммирования: " + error.message);
        } finally {
            setLoading(null);
        }
    }

    return (
        <div className="p-3 border-b bg-gray-50 flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600 mr-2">Инструменты AI:</span>
            <button onClick={handleGenerateAgenda} disabled={!!loading} className="btn-secondary text-xs flex items-center justify-center gap-2">
                {loading === 'agenda' ? <Spinner size="sm" /> : <><FaListAlt /> Повестка</>}
            </button>
            <button onClick={handleSummarize} disabled={!!loading || events.length < 2} className="btn-secondary text-xs flex items-center justify-center gap-2" title={events.length < 2 ? "Нужно больше сообщений для анализа" : ""}>
                {loading === 'summary' ? <Spinner size="sm" /> : <><FaClipboardCheck /> Суммировать</>}
            </button>
        </div>
    );
};

export default MeetingTools;
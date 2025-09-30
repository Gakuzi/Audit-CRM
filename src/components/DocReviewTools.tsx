import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Event, PlanItem } from '../types';
import { generateDocReviewChecklist } from '../services/geminiService';
import { FaTasks } from 'react-icons/fa';
import { Spinner } from './ui/Spinner';
import { supabase } from '../services/supabaseClient';

interface ToolProps {
    user: User;
    context: { item: PlanItem; weekId: string; projectId: string; };
    onNewEvent: (event: Event) => void;
}

const DocReviewTools: React.FC<ToolProps> = ({ user, context, onNewEvent }) => {
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

    const handleGenerateChecklist = async () => {
        setLoading('checklist');
        try {
            // Fix: Use `title` and `description` from PlanItem instead of non-existent `content`.
            const taskContext = `${context.item.title}\n\n${context.item.description || ''}`;
            const checklist = await generateDocReviewChecklist(taskContext);
            await createNewEvent(`**Сгенерированный чек-лист для анализа документов:**\n\n${checklist}`);
        } catch (error: any) {
            alert("Ошибка генерации чек-листа: " + error.message);
        } finally {
            setLoading(null);
        }
    };
    
    return (
        <div className="p-3 border-b bg-gray-50 flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600 mr-2">Инструменты AI:</span>
            <button onClick={handleGenerateChecklist} disabled={!!loading} className="btn-secondary text-xs flex items-center justify-center gap-2">
                {loading === 'checklist' ? <Spinner size="sm" /> : <><FaTasks /> Чек-лист</>}
            </button>
        </div>
    );
};

export default DocReviewTools;
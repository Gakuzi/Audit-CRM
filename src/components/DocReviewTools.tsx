import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Event, PlanItem } from '../types';
import { generateDocReviewChecklist } from '../services/geminiService';
import { FaTasks, FaPencilAlt, FaBrain } from 'react-icons/fa';
import { Spinner } from './ui/Spinner';
import { supabase } from '../services/supabaseClient';
import ManualToolModal from './ManualToolModal';

interface ToolProps {
    user: User;
    context: { item: PlanItem; weekId: string; projectId: string; };
    onNewEvent: (event: Event) => void;
}

const DocReviewTools: React.FC<ToolProps> = ({ user, context, onNewEvent }) => {
    const [loading, setLoading] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const createNewEvent = async (content: string, author: string = 'AI Ассистент') => {
        const { data, error } = await supabase.from('events').insert({
            project_id: context.projectId,
            week_id: context.weekId,
            task_id: context.item.id,
            user_id: user.id,
            author_email: author,
            type: 'comment',
            content,
        }).select().single();

        if (error) throw error;
        onNewEvent(data as Event);
    };

    const handleManualSubmit = (content: string) => createNewEvent(content, user.email!);

    const modalConfig = {
        title: 'Добавить чек-лист',
        label: 'Введите пункты (поддерживается Markdown)',
        placeholder: '- [ ] Пункт 1\n- [ ] Пункт 2...',
        actionLabel: 'Добавить',
    };

    const handleGenerateChecklist = async () => {
        setLoading('checklist-ai');
        try {
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
        <div className="p-3 border-b bg-gray-50 flex flex-wrap items-center gap-x-6 gap-y-2">
             <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600">Вручную:</span>
                <button onClick={() => setIsModalOpen(true)} disabled={!!loading} className="btn-secondary text-xs flex items-center justify-center gap-1.5"><FaPencilAlt /> Чек-лист</button>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600">С помощью AI:</span>
                <button onClick={handleGenerateChecklist} disabled={!!loading} className="btn-secondary text-xs flex items-center justify-center gap-1.5">
                    {loading === 'checklist-ai' ? <Spinner size="sm" /> : <><FaBrain /> Чек-лист</>}
                </button>
            </div>
             <ManualToolModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleManualSubmit}
                config={modalConfig}
            />
        </div>
    );
};

export default DocReviewTools;

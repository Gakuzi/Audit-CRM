import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Event, PlanItem } from '../types';
// Fix: Use relative path for service import.
import { generateMeetingAgenda, summarizeDiscussion } from '../services/geminiService';
import { FaPencilAlt, FaBrain } from 'react-icons/fa';
import { Spinner } from './ui/Spinner';
import { supabase } from '../services/supabaseClient';
import ManualToolModal from './ManualToolModal';

interface ToolProps {
    user: User;
    context: { item: PlanItem; weekId: string; projectId: string; };
    events: Event[];
    onNewEvent: (event: Event) => void;
}

const MeetingTools: React.FC<ToolProps> = ({ user, context, events, onNewEvent }) => {
    const [loading, setLoading] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState<any>(null);

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

    const openModal = (type: 'agenda' | 'summary') => {
        if (type === 'agenda') {
            setModalConfig({
                title: 'Добавить повестку встречи',
                label: 'Введите пункты повестки (поддерживается Markdown)',
                placeholder: '1. Пункт 1\n2. Пункт 2...',
                actionLabel: 'Добавить',
            });
        } else {
            setModalConfig({
                title: 'Добавить резюме встречи (Meeting Minutes)',
                label: 'Опишите ключевые решения и следующие шаги',
                placeholder: '**Решения:**\n- ...\n\n**Задачи:**\n- ...',
                actionLabel: 'Добавить',
            });
        }
        setIsModalOpen(true);
    };


    const handleGenerateAgenda = async () => {
        setLoading('agenda-ai');
        try {
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
        setLoading('summary-ai');
        try {
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
        <div className="p-3 border-b bg-gray-50 flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600">Вручную:</span>
                <button onClick={() => openModal('agenda')} disabled={!!loading} className="btn-secondary text-xs flex items-center justify-center gap-1.5"><FaPencilAlt /> Повестка</button>
                <button onClick={() => openModal('summary')} disabled={!!loading} className="btn-secondary text-xs flex items-center justify-center gap-1.5"><FaPencilAlt /> Резюме</button>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600">С помощью AI:</span>
                <button onClick={handleGenerateAgenda} disabled={!!loading} className="btn-secondary text-xs flex items-center justify-center gap-1.5">
                    {loading === 'agenda-ai' ? <Spinner size="sm" /> : <><FaBrain /> Повестка</>}
                </button>
                <button onClick={handleSummarize} disabled={!!loading || events.length < 2} className="btn-secondary text-xs flex items-center justify-center gap-1.5" title={events.length < 2 ? "Нужно больше сообщений для анализа" : ""}>
                    {loading === 'summary-ai' ? <Spinner size="sm" /> : <><FaBrain /> Суммировать</>}
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

export default MeetingTools;
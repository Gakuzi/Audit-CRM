import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Event, PlanItem } from '../types';
import { generateInterviewQuestions, generateMindMapFromEvents } from '../services/geminiService';
import { FaQuestionCircle, FaBrain, FaPencilAlt } from 'react-icons/fa';
import { Spinner } from './ui/Spinner';
import { supabase } from '../services/supabaseClient';
import ManualToolModal from './ManualToolModal';

interface ToolProps {
    user: User;
    context: { item: PlanItem; weekId: string; projectId: string; };
    events: Event[];
    onNewEvent: (event: Event) => void;
}

const InterviewTools: React.FC<ToolProps> = ({ user, context, events, onNewEvent }) => {
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

    const openModal = (type: 'questions' | 'mindmap') => {
        if (type === 'questions') {
            setModalConfig({
                title: 'Добавить вопросы для интервью',
                label: 'Введите вопросы (поддерживается Markdown)',
                placeholder: '* Вопрос 1...\n* Вопрос 2...',
                actionLabel: 'Добавить',
            });
        } else {
            setModalConfig({
                title: 'Добавить Mind Map',
                label: 'Вставьте код в формате Mermaid',
                placeholder: 'mindmap\n  root((My Topic))\n    Topic 1\n    Topic 2',
                actionLabel: 'Добавить',
            });
        }
        setIsModalOpen(true);
    };

    const handleGenerateQuestions = async () => {
        setLoading('questions-ai');
        try {
            const taskContext = `${context.item.title}\n\n${context.item.description || ''}`;
            const questions = await generateInterviewQuestions(taskContext);
            await createNewEvent(`**Сгенерированные вопросы для интервью:**\n\n${questions}`);
        } catch (error: any) {
            alert("Ошибка генерации вопросов: " + error.message);
        } finally {
            setLoading(null);
        }
    };
    
    const handleGenerateMindMap = async () => {
        setLoading('mindmap-ai');
        try {
            const taskContext = `${context.item.title}\n\n${context.item.description || ''}`;
            const mindmap = await generateMindMapFromEvents(taskContext, events);
            await createNewEvent(mindmap);
        } catch (error: any) {
            alert("Ошибка генерации Mind Map: " + error.message);
        } finally {
            setLoading(null);
        }
    }

    return (
        <div className="p-3 border-b bg-gray-50 flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600">Вручную:</span>
                <button onClick={() => openModal('questions')} disabled={!!loading} className="btn-secondary text-xs flex items-center justify-center gap-1.5"><FaPencilAlt /> Вопросы</button>
                <button onClick={() => openModal('mindmap')} disabled={!!loading} className="btn-secondary text-xs flex items-center justify-center gap-1.5"><FaPencilAlt /> Mind Map</button>
            </div>
             <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600">С помощью AI:</span>
                <button onClick={handleGenerateQuestions} disabled={!!loading} className="btn-secondary text-xs flex items-center justify-center gap-1.5">
                    {loading === 'questions-ai' ? <Spinner size="sm" /> : <><FaBrain /> Вопросы</>}
                </button>
                <button onClick={handleGenerateMindMap} disabled={!!loading || events.length < 1} className="btn-secondary text-xs flex items-center justify-center gap-1.5" title={events.length < 1 ? "Нужно хотя бы одно событие для анализа" : ""}>
                    {loading === 'mindmap-ai' ? <Spinner size="sm" /> : <><FaBrain /> Mind Map</>}
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

export default InterviewTools;

import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Event, PlanItem } from '../types';
import { generateMindMapFromEvents, generateProcessFlowchart } from '../services/geminiService';
import { FaBrain, FaPencilAlt } from 'react-icons/fa';
import { Spinner } from './ui/Spinner';
import { supabase } from '../services/supabaseClient';
import ManualToolModal from './ManualToolModal';

interface ToolProps {
    user: User;
    context: { item: PlanItem; weekId: string; projectId: string; };
    events: Event[];
    onNewEvent: (event: Event) => void;
}

const ProcessAnalysisTools: React.FC<ToolProps> = ({ user, context, events, onNewEvent }) => {
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

    const openModal = (type: 'mindmap' | 'flowchart') => {
        if (type === 'mindmap') {
            setModalConfig({
                title: 'Добавить Mind Map',
                label: 'Вставьте код в формате Mermaid',
                placeholder: 'mindmap\n  root((...))\n    Topic 1\n    Topic 2',
                actionLabel: 'Добавить',
            });
        } else {
             setModalConfig({
                title: 'Добавить Блок-схему',
                label: 'Вставьте код в формате Mermaid',
                placeholder: 'graph TD\n    A[Start] --> B{Decision}\n    B --> C[Step 1]\n    B --> D[Step 2]',
                actionLabel: 'Добавить',
            });
        }
        setIsModalOpen(true);
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
    };

    const handleGenerateFlowchart = async () => {
        setLoading('flowchart-ai');
        try {
            const taskContext = `${context.item.title}\n\n${context.item.description || ''}`;
            const flowchart = await generateProcessFlowchart(taskContext, events);
            await createNewEvent(flowchart);
        } catch (error: any) {
            alert("Ошибка генерации блок-схемы: " + error.message);
        } finally {
            setLoading(null);
        }
    };
    
    return (
        <div className="p-3 border-b bg-gray-50 flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600">Вручную:</span>
                <button onClick={() => openModal('mindmap')} disabled={!!loading} className="btn-secondary text-xs flex items-center justify-center gap-1.5"><FaPencilAlt /> Mind Map</button>
                <button onClick={() => openModal('flowchart')} disabled={!!loading} className="btn-secondary text-xs flex items-center justify-center gap-1.5"><FaPencilAlt /> Блок-схема</button>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600">С помощью AI:</span>
                <button onClick={handleGenerateMindMap} disabled={!!loading || events.length < 1} className="btn-secondary text-xs flex items-center justify-center gap-1.5" title={events.length < 1 ? "Нужно хотя бы одно событие для анализа" : ""}>
                    {loading === 'mindmap-ai' ? <Spinner size="sm" /> : <><FaBrain /> Mind Map</>}
                </button>
                 <button onClick={handleGenerateFlowchart} disabled={!!loading || events.length < 1} className="btn-secondary text-xs flex items-center justify-center gap-1.5" title={events.length < 1 ? "Нужно хотя бы одно событие для анализа" : ""}>
                    {loading === 'flowchart-ai' ? <Spinner size="sm" /> : <><FaBrain /> Блок-схема</>}
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

export default ProcessAnalysisTools;
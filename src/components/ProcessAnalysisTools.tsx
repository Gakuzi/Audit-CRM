import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Event, PlanItem } from '../types';
import { generateMindMapFromEvents, generateProcessFlowchart } from '../services/geminiService';
import { FaBrain, FaProjectDiagram } from 'react-icons/fa';
import { Spinner } from './ui/Spinner';
import { supabase } from '../services/supabaseClient';

interface ToolProps {
    user: User;
    context: { item: PlanItem; weekId: string; projectId: string; };
    events: Event[];
    onNewEvent: (event: Event) => void;
}

const ProcessAnalysisTools: React.FC<ToolProps> = ({ user, context, events, onNewEvent }) => {
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

    const handleGenerateMindMap = async () => {
        setLoading('mindmap');
        try {
            const mindmap = await generateMindMapFromEvents(context.item.content, events);
            await createNewEvent(mindmap);
        } catch (error: any) {
            alert("Ошибка генерации Mind Map: " + error.message);
        } finally {
            setLoading(null);
        }
    };

    const handleGenerateFlowchart = async () => {
        setLoading('flowchart');
        try {
            const flowchart = await generateProcessFlowchart(context.item.content, events);
            await createNewEvent(flowchart);
        } catch (error: any) {
            alert("Ошибка генерации блок-схемы: " + error.message);
        } finally {
            setLoading(null);
        }
    };
    
    return (
        <div className="p-3 border-b bg-gray-50 flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600 mr-2">Инструменты AI:</span>
            <button onClick={handleGenerateMindMap} disabled={!!loading} className="btn-secondary text-xs flex items-center justify-center gap-2">
                {loading === 'mindmap' ? <Spinner size="sm" /> : <><FaBrain /> Mind Map</>}
            </button>
             <button onClick={handleGenerateFlowchart} disabled={!!loading} className="btn-secondary text-xs flex items-center justify-center gap-2">
                {loading === 'flowchart' ? <Spinner size="sm" /> : <><FaProjectDiagram /> Блок-схема</>}
            </button>
        </div>
    );
};

export default ProcessAnalysisTools;

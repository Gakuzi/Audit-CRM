
// src/components/TaskAiActions.tsx
import React, { useState } from 'react';
import { PlanItem, Event } from '../types';
import * as geminiService from '../services/geminiService';
import { Spinner } from './ui/Spinner';
import ManualToolModal from './ManualToolModal';
import { FaBrain, FaQuestion, FaListUl, FaProjectDiagram, FaFileInvoice, FaComments, FaSitemap } from 'react-icons/fa';

interface TaskAiActionsProps {
    task: PlanItem;
    events: Event[];
    onNewEvent: (event: Partial<Event>) => void;
}

const TaskAiActions: React.FC<TaskAiActionsProps> = ({ task, events, onNewEvent }) => {
    const [loading, setLoading] = useState<string | null>(null);
    const [manualToolConfig, setManualToolConfig] = useState<any>(null);

    const handleAction = async (action: () => Promise<string>, key: string, prefix = '') => {
        setLoading(key);
        try {
            const result = await action();
            onNewEvent({ content: `${prefix}\n\n${result}` });
        } catch (error: any) {
            alert("Ошибка AI: " + error.message);
        } finally {
            setLoading(null);
        }
    };
    
    const taskContext = `${task.title}\n${task.description || ''}`;

    const actions = {
        summarize: {
            label: 'Резюме',
            icon: <FaComments />,
            action: () => handleAction(() => geminiService.summarizeDiscussion(taskContext, events), 'summarize', '**Резюме обсуждения:**'),
            types: ['task', 'meeting', 'interview', 'doc_review', 'observation', 'process_analysis'],
        },
        questions: {
            label: 'Вопросы',
            icon: <FaQuestion />,
            action: () => handleAction(() => geminiService.generateInterviewQuestions(taskContext), 'questions', '**Предлагаемые вопросы для интервью:**'),
            types: ['interview'],
        },
        agenda: {
            label: 'Повестка',
            icon: <FaListUl />,
            action: () => handleAction(() => geminiService.generateMeetingAgenda(taskContext), 'agenda', '**Предлагаемая повестка встречи:**'),
            types: ['meeting'],
        },
        checklist: {
            label: 'Чек-лист',
            icon: <FaFileInvoice />,
            action: () => handleAction(() => geminiService.generateDocReviewChecklist(taskContext), 'checklist', '**Чек-лист для проверки документов:**'),
            types: ['doc_review'],
        },
        mindmap: {
            label: 'Mind Map',
            icon: <FaBrain />,
            action: () => handleAction(() => geminiService.generateMindMapFromEvents(taskContext, events), 'mindmap', '**Ментальная карта обсуждения (Mermaid):**'),
            types: ['task', 'meeting', 'interview', 'doc_review', 'observation', 'process_analysis'],
        },
        flowchart: {
            label: 'Блок-схема',
            icon: <FaSitemap />,
            action: () => handleAction(() => geminiService.generateProcessFlowchart(taskContext, events), 'flowchart', '**Блок-схема процесса (Mermaid):**'),
            types: ['process_analysis'],
        }
    };

    const availableActions = Object.entries(actions).filter(([, config]) => config.types.includes(task.type));

    return (
        <div className="p-4 border-t">
            <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Инструменты AI</h3>
            <div className="grid grid-cols-2 gap-2">
                {availableActions.map(([key, config]) => (
                    <button 
                        key={key}
                        onClick={config.action} 
                        disabled={!!loading}
                        className="btn-secondary text-xs px-2 py-2 flex items-center justify-center gap-2"
                    >
                        {loading === key ? <Spinner size="sm" /> : config.icon}
                        <span>{config.label}</span>
                    </button>
                ))}
            </div>
             <ManualToolModal
                isOpen={!!manualToolConfig}
                onClose={() => setManualToolConfig(null)}
                onSubmit={async (content) => {
                    if (manualToolConfig?.action) {
                        await handleAction(() => manualToolConfig.action(content), manualToolConfig.key, manualToolConfig.prefix);
                    }
                }}
                config={manualToolConfig}
            />
        </div>
    );
};

export default TaskAiActions;

import React, { useState } from 'react';
import { PlanItem, Event } from '../types';
import * as geminiService from '../services/geminiService';
import { Spinner } from './ui/Spinner';
import { FaBrain, FaQuestion, FaListUl, FaComments, FaSitemap, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import ManualToolModal from './ManualToolModal';

type AiTool = 'questions' | 'agenda' | 'summary' | 'checklist' | 'mindmap' | 'flowchart' | 'continue' | 'summarize-and-continue';

const TaskAiActions: React.FC<{
  task: PlanItem;
  events: Event[];
  onNewEvent: (event: Partial<Event>) => void;
}> = ({ task, events, onNewEvent }) => {
  const [loading, setLoading] = useState<AiTool | null>(null);
  const [isContinueModalOpen, setIsContinueModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleAiAction = async (tool: AiTool) => {
    if (tool === 'continue') {
        setIsContinueModalOpen(true);
        return;
    }

    setLoading(tool);
    try {
      let content = '';
      const taskContext = `Название: ${task.title}\nОписание: ${task.description || ''}`;
      
      switch (tool) {
        case 'questions': content = await geminiService.generateInterviewQuestions(taskContext); break;
        case 'agenda': content = await geminiService.generateMeetingAgenda(taskContext); break;
        case 'summary': content = await geminiService.summarizeDiscussion(taskContext, events); break;
        case 'checklist': content = await geminiService.generateDocReviewChecklist(taskContext); break;
        case 'mindmap': content = `\`\`\`mermaid\n${await geminiService.generateMindMapFromEvents(taskContext, events)}\n\`\`\``; break;
        case 'flowchart': content = `\`\`\`mermaid\n${await geminiService.generateProcessFlowchart(taskContext, events)}\n\`\`\``; break;
        case 'summarize-and-continue': content = await geminiService.summarizeAndContinue(task, events); break;
      }
      
      if (content) {
        onNewEvent({ type: 'comment', content });
      }
    } catch (error: any) {
      alert(`AI Error: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  const handleContinueSubmit = async (userQuery: string) => {
    setLoading('continue');
    try {
      const lastUserEvent = [...events].reverse().find(e => e.author_email !== 'AI Ассистент');
      const author = lastUserEvent?.author_email || 'User';
      const formattedQuery = `${author}:${userQuery}`;
      const content = await geminiService.continueConversation(task, events, formattedQuery);
      if (content) {
        onNewEvent({ type: 'comment', content });
      }
    } catch (error: any) {
        alert(`AI Error: ${error.message}`);
    } finally {
        setLoading(null);
    }
  };

  const tools: { label: string; icon: React.ReactNode; action: () => void; tool: AiTool; types: PlanItem['type'][] }[] = [
    { label: 'Вопросы для интервью', icon: <FaQuestion />, action: () => handleAiAction('questions'), tool: 'questions', types: ['interview'] },
    { label: 'Повестка встречи', icon: <FaListUl />, action: () => handleAiAction('agenda'), tool: 'agenda', types: ['meeting'] },
    { label: 'Резюме обсуждения', icon: <FaComments />, action: () => handleAiAction('summary'), tool: 'summary', types: ['meeting', 'interview'] },
    { label: 'Чек-лист для проверки', icon: <FaListUl />, action: () => handleAiAction('checklist'), tool: 'checklist', types: ['doc_review'] },
    { label: 'Mind Map обсуждения', icon: <FaBrain />, action: () => handleAiAction('mindmap'), tool: 'mindmap', types: ['task', 'interview', 'process_analysis'] },
    { label: 'Блок-схема процесса', icon: <FaSitemap />, action: () => handleAiAction('flowchart'), tool: 'flowchart', types: ['process_analysis'] },
  ];
  const generalTools = [
    { label: 'Продолжить диалог', icon: <FaComments />, action: () => handleAiAction('continue'), tool: 'continue' as AiTool, types: [] },
    { label: 'Подвести итог и предложить шаг', icon: <FaBrain />, action: () => handleAiAction('summarize-and-continue'), tool: 'summarize-and-continue' as AiTool, types: [] },
  ];

  const availableTools = tools.filter(t => t.types.includes(task.type));
  const finalTools = [...availableTools, ...(events.length > 0 ? generalTools : [])];

  if (finalTools.length === 0) {
      return null;
  }

  return (
    <div className="border-t">
        <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex justify-between items-center text-left p-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase">Инструменты AI</h3>
            {isExpanded ? <FaChevronUp className="text-slate-400" /> : <FaChevronDown className="text-slate-400" />}
        </button>
        {isExpanded && (
            <div className="flex flex-col gap-1 p-2 pt-0">
                {finalTools.map(t => (
                <button key={t.tool} onClick={t.action} disabled={!!loading} className="w-full text-left flex items-center p-2 rounded-md text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50">
                    <div className="w-6 text-center">{loading === t.tool ? <Spinner size="sm"/> : t.icon}</div>
                    <span className="ml-2">{t.label}</span>
                </button>
                ))}
            </div>
        )}
        <ManualToolModal
            isOpen={isContinueModalOpen}
            onClose={() => setIsContinueModalOpen(false)}
            onSubmit={handleContinueSubmit}
            config={{
                title: 'Продолжить диалог с AI',
                label: 'Ваш вопрос или сообщение:',
                placeholder: 'Например, "Какие риски ты видишь в этом процессе?"',
                actionLabel: 'Отправить',
            }}
        />
    </div>
  );
};
export default TaskAiActions;

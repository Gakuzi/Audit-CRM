import React, { useState } from 'react';
import { PlanItem, Event } from '../types';
import * as geminiService from '../services/geminiService';
import { Spinner } from './ui/Spinner';
import { FaBrain, FaQuestion, FaListUl, FaComments, FaSitemap } from 'react-icons/fa';

type AiTool = 'questions' | 'agenda' | 'summary' | 'checklist' | 'mindmap' | 'flowchart' | 'continue' | 'summarize-and-continue';

const TaskAiActions: React.FC<{
  task: PlanItem;
  events: Event[];
  onNewEvent: (event: Partial<Event>) => void;
}> = ({ task, events, onNewEvent }) => {
  const [loading, setLoading] = useState<AiTool | null>(null);

  const handleAiAction = async (tool: AiTool) => {
    setLoading(tool);
    try {
      let content = '';
      const taskContext = `Название: ${task.title}\nОписание: ${task.description || ''}`;
      
      switch (tool) {
        case 'questions': content = await geminiService.generateInterviewQuestions(taskContext); break;
        case 'agenda': content = await geminiService.generateMeetingAgenda(taskContext); break;
        case 'summary': content = await geminiService.summarizeDiscussion(taskContext, events); break;
        case 'checklist': content = await geminiService.generateDocReviewChecklist(taskContext); break;
        case 'mindmap': content = await geminiService.generateMindMapFromEvents(taskContext, events); break;
        case 'flowchart': content = await geminiService.generateProcessFlowchart(taskContext, events); break;
        case 'continue': content = await geminiService.continueConversation(task, events); break;
        case 'summarize-and-continue': content = await geminiService.summarizeAndContinue(task, events); break;
      }
      
      if (content) {
        onNewEvent({ type: 'comment', content, author_email: 'AI Ассистент' });
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
      return <p className="text-xs text-gray-500 italic p-2">Для этой задачи нет специфичных AI-инструментов.</p>;
  }

  return (
    <div className="flex flex-col gap-1 p-1">
      {finalTools.map(t => (
        <button key={t.tool} onClick={t.action} disabled={!!loading} className="w-full text-left flex items-center p-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50">
          <div className="w-6 text-center">{loading === t.tool ? <Spinner size="sm"/> : t.icon}</div>
          <span className="ml-2">{t.label}</span>
        </button>
      ))}
    </div>
  );
};
export default TaskAiActions;
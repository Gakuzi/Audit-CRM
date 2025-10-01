import React, { useState } from 'react';
import { PlanItem, Event } from '../types';
import * as geminiService from '../services/geminiService';
import { FaBrain, FaRegLightbulb, FaProjectDiagram, FaClipboardList, FaFileSignature, FaRoute } from 'react-icons/fa';
import { Spinner } from './ui/Spinner';
import AiChatModal from './AiChatModal'; 

interface TaskAiActionsProps {
  task: PlanItem;
  events: Event[];
  onNewEvent: (event: Partial<Event>) => void;
}

const TaskAiActions: React.FC<TaskAiActionsProps> = ({ task, events, onNewEvent }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [modalContent, setModalContent] = useState<string | null>(null);

  const handleAction = async (action: () => Promise<string>, loadingKey: string, titlePrefix: string) => {
    setLoading(loadingKey);
    try {
      const result = await action();
      onNewEvent({
        type: 'comment',
        author_email: 'AI Ассистент',
        content: `**${titlePrefix}**\n\n${result}`,
      });
    } catch (error: any) {
      alert(`Ошибка AI: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  const actions = {
    interview: [
      { id: 'questions', label: 'Вопросы для интервью', icon: <FaRegLightbulb />, action: () => handleAction(() => geminiService.generateInterviewQuestions(task.title), 'questions', 'Сгенерированные вопросы для интервью:') },
    ],
    meeting: [
      { id: 'agenda', label: 'Повестка встречи', icon: <FaClipboardList />, action: () => handleAction(() => geminiService.generateMeetingAgenda(task.title), 'agenda', 'Сгенерированная повестка встречи:') },
      { id: 'mindmap', label: 'Mind Map обсуждения', icon: <FaProjectDiagram />, action: () => handleAction(() => geminiService.generateMindMapFromEvents(task.title, events), 'mindmap', 'Mind Map обсуждения (Mermaid):') },
    ],
    doc_review: [
      { id: 'checklist', label: 'Чек-лист для проверки', icon: <FaFileSignature />, action: () => handleAction(() => geminiService.generateDocReviewChecklist(task.title), 'checklist', 'Сгенерированный чек-лист:') },
    ],
    process_analysis: [
      { id: 'flowchart', label: 'Блок-схема процесса', icon: <FaRoute />, action: () => handleAction(() => geminiService.generateProcessFlowchart(task.title, events), 'flowchart', 'Блок-схема процесса (Mermaid):') },
    ],
    common: [
      { id: 'summarize', label: 'Резюмировать и предложить шаг', icon: <FaBrain />, action: () => handleAction(() => geminiService.summarizeAndContinue(task, events), 'summarize', 'Резюме и следующий шаг:') },
    ],
  };

  const availableActions = actions[task.type as keyof typeof actions] || [];

  return (
    <div className="p-4 bg-gray-100 border-t">
      <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">AI-Инструменты</h3>
      <div className="space-y-2">
        {availableActions.map(action => (
          <button key={action.id} onClick={action.action} disabled={!!loading} className="w-full btn-secondary text-sm flex items-center justify-start gap-3">
            {loading === action.id ? <Spinner size="sm" /> : action.icon}
            <span>{action.label}</span>
          </button>
        ))}
        {actions.common.map(action => (
           <button key={action.id} onClick={action.action} disabled={!!loading} className="w-full btn-secondary text-sm flex items-center justify-start gap-3">
            {loading === action.id ? <Spinner size="sm" /> : action.icon}
            <span>{action.label}</span>
          </button>
        ))}
      </div>
       {modalContent && (
        <AiChatModal
          isOpen={!!modalContent}
          onClose={() => setModalContent(null)}
          onConfirm={() => {
            onNewEvent({ type: 'comment', content: modalContent });
            setModalContent(null);
          }}
          initialContext={modalContent}
        />
      )}
    </div>
  );
};

export default TaskAiActions;

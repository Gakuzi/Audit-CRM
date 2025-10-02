// src/components/TaskSidebar.tsx
import React from 'react';
import { PlanItem, Event } from '../types';
import TaskAiActions from './TaskAiActions';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

interface TaskSidebarProps {
  task: PlanItem;
  events: Event[];
  isAuditor: boolean;
  isGuest: boolean;
  onAddSubTask: () => void;
  onNewAiEvent: (event: Partial<Event>) => void;
  isDescriptionExpanded: boolean;
  onToggleDescription: () => void;
}

const TaskSidebar: React.FC<TaskSidebarProps> = ({ task, events, isAuditor, onNewAiEvent, isDescriptionExpanded, onToggleDescription }) => {
  
  const descriptionNeedsTruncation = (task.description?.length || 0) > 200;

  return (
    <aside className="w-full lg:w-1/3 lg:max-w-sm flex-shrink-0 bg-gray-50 border-r flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold text-gray-800 break-words">{task.title}</h2>
        {task.description && (
          <div className="mt-2 text-sm text-gray-600">
            <div className={`prose prose-sm max-w-none break-words ${!isDescriptionExpanded && descriptionNeedsTruncation ? 'line-clamp-4' : ''}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{task.description}</ReactMarkdown>
            </div>
            {descriptionNeedsTruncation && (
              <button onClick={onToggleDescription} className="text-xs text-blue-600 hover:underline mt-1 font-semibold flex items-center gap-1">
                {isDescriptionExpanded ? 'Свернуть' : 'Читать далее'}
                {isDescriptionExpanded ? <FaChevronUp /> : <FaChevronDown />}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isAuditor && <TaskAiActions task={task} events={events} onNewEvent={onNewAiEvent} />}
      </div>
    </aside>
  );
};

export default TaskSidebar;

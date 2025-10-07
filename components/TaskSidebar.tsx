// src/components/TaskSidebar.tsx
import React from 'react';
import { PlanItem, Event, Project } from '../types';
import SubTaskItem from './SubTaskItem';
import TaskAiActions from './TaskAiActions';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FaPlus, FaChevronDown, FaChevronUp } from 'react-icons/fa';

interface TaskSidebarProps {
  task: PlanItem;
  events: Event[];
  project: Project;
  isAuditor: boolean;
  isGuest: boolean;
  onAddSubTask: () => void;
  onNewAiEvent: (event: Partial<Event>) => void;
  isDescriptionExpanded: boolean;
  onToggleDescription: () => void;
}

const TaskSidebar: React.FC<TaskSidebarProps> = ({ task, events, project, isAuditor, isGuest, onAddSubTask, onNewAiEvent, isDescriptionExpanded, onToggleDescription }) => {
  
  const descriptionNeedsTruncation = (task.description?.length || 0) > 200;

  return (
    <aside className="w-full lg:w-1/3 lg:max-w-sm flex-shrink-0 bg-gray-50 border-r flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold text-gray-800">{task.title}</h2>
        {task.description && (
          <div className="mt-2 text-sm text-gray-600">
            <div className={`prose prose-sm max-w-none ${!isDescriptionExpanded && descriptionNeedsTruncation ? 'line-clamp-4' : ''}`}>
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
        {(task.sub_tasks && task.sub_tasks.length > 0) || isAuditor || isGuest ? (
          <div className="p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold text-gray-500 uppercase">Подзадачи</h3>
              {(isAuditor || isGuest) && (
                <button onClick={onAddSubTask} className="btn-secondary text-xs px-2 py-1 flex items-center gap-1">
                  <FaPlus /> Добавить
                </button>
              )}
            </div>
            <div className="space-y-2">
              {task.sub_tasks?.map(sub => <SubTaskItem key={sub.id} item={sub} />)}
              {(!task.sub_tasks || task.sub_tasks.length === 0) && <p className="text-xs text-gray-500 italic">Подзадач нет.</p>}
            </div>
          </div>
        ) : null}

        {isAuditor && <TaskAiActions task={task} events={events} onNewEvent={onNewAiEvent} />}
      </div>
    </aside>
  );
};

export default TaskSidebar;

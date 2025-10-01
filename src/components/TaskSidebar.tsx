import React from 'react';
import { PlanItem, Project, Event } from '../types';
import { FaPlus, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SubTaskItem from './SubTaskItem';
import TaskAiActions from './TaskAiActions';

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

const TaskSidebar: React.FC<TaskSidebarProps> = ({
  task,
  events,
  isAuditor,
  isGuest,
  onAddSubTask,
  onNewAiEvent,
  isDescriptionExpanded,
  onToggleDescription,
}) => {

  const descriptionNeedsTruncation = (task.description?.length || 0) > 200;

  return (
    <aside className="w-full lg:w-96 bg-gray-50 border-r flex flex-col h-full overflow-y-auto">
      <div className="p-4 flex-grow">
        <h3 className="text-lg font-bold text-gray-800">{task.title}</h3>
        {task.description && (
          <div className="mt-2 text-sm text-gray-600">
            <div className={`prose prose-sm max-w-none ${!isDescriptionExpanded ? 'line-clamp-5' : ''}`}>
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

        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-bold text-gray-500 uppercase">Подзадачи</h4>
            {(isAuditor || isGuest) && (
              <button onClick={onAddSubTask} className="btn-secondary text-xs flex items-center gap-1 !py-1 !px-2">
                <FaPlus /> Добавить
              </button>
            )}
          </div>
          <div className="space-y-2">
            {task.sub_tasks && task.sub_tasks.length > 0 ? (
              task.sub_tasks.map(sub => <SubTaskItem key={sub.id} item={sub} />)
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">Подзадач нет</p>
            )}
          </div>
        </div>
      </div>
      
      {isAuditor && <TaskAiActions task={task} events={events} onNewEvent={onNewAiEvent} />}
    </aside>
  );
};

export default TaskSidebar;

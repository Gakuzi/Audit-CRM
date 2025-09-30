import React from 'react';
import { Project } from '../types';
import { FaTrash, FaCalendarAlt } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';

interface ProjectCardProps {
  project: Project;
  onSelect: (project: Project) => void;
  onDelete?: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onSelect, onDelete }) => {
  
  const formatDate = (dateString?: string) => {
      if (!dateString) return 'Не указана';
      return new Date(dateString + 'T00:00:00').toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
      });
  }

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col">
      <div className="p-6 flex-grow cursor-pointer" onClick={() => onSelect(project)}>
        <h3 className="text-lg font-bold text-gray-800 mb-2 truncate">{project.name}</h3>
        <div className="text-gray-600 text-sm line-clamp-3 mb-4 prose prose-sm max-w-none">
          <ReactMarkdown>{project.description || "Нет описания."}</ReactMarkdown>
        </div>
        <div className="flex items-center text-xs text-gray-500">
          <FaCalendarAlt className="mr-2" />
          <span>{formatDate(project.start_date)}</span>
          {project.end_date && <span className="mx-1">&ndash;</span>}
          {project.end_date && <span>{formatDate(project.end_date)}</span>}
        </div>
      </div>
      <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-between items-center">
        <span className="text-xs text-gray-500">Создан: {formatDate(project.created_at)}</span>
        {onDelete && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-100"
            title="Удалить проект"
          >
            <FaTrash size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ProjectCard;

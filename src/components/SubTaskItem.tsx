import React from 'react';
import { PlanItem } from '../types';
import { FaTasks, FaCalendarCheck, FaUsers, FaFileContract, FaBinoculars, FaSitemap } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';

interface SubTaskItemProps {
  item: PlanItem;
}

const getIcon = (type: PlanItem['type']) => {
    switch(type) {
      case 'task': return <FaTasks className="text-gray-500" />;
      case 'meeting': return <FaCalendarCheck className="text-purple-500" />;
      case 'interview': return <FaUsers className="text-green-500" />;
      case 'doc_review': return <FaFileContract className="text-blue-500" />;
      case 'observation': return <FaBinoculars className="text-orange-500" />;
      case 'process_analysis': return <FaSitemap className="text-teal-500" />;
      default: return <FaTasks className="text-gray-500" />;
    }
}

const SubTaskItem: React.FC<SubTaskItemProps> = ({ item }) => {
  return (
    <div className="bg-white p-2.5 rounded-md border border-gray-200">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1 text-lg">{getIcon(item.type)}</div>
        <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">{item.title}</p>
            {item.description && (
                <div className="text-xs text-gray-600 prose prose-sm max-w-none">
                    <ReactMarkdown>{item.description}</ReactMarkdown>
                </div>
            )}
            {item.type === 'meeting' && item.data && (
                <div className="mt-2 text-xs text-gray-700 grid grid-cols-2 gap-x-4 gap-y-1">
                    {item.data.date && <div><strong>Дата:</strong> {new Date(item.data.date + 'T00:00:00').toLocaleDateString('ru-RU')}</div>}
                    {item.data.time && <div><strong>Время:</strong> {item.data.time}</div>}
                    {item.data.location && <div className="col-span-2"><strong>Место:</strong> {item.data.location}</div>}
                    {item.data.duration && <div><strong>Длительность:</strong> {item.data.duration}</div>}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SubTaskItem;

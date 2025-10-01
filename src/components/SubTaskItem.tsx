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
        </div>
      </div>
    </div>
  );
};

export default SubTaskItem;
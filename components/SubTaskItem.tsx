// src/components/SubTaskItem.tsx
import React from 'react';
import { PlanItem } from '../types';
import { FaTasks, FaCalendarCheck } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SubTaskItemProps {
    item: PlanItem;
}

const SubTaskItem: React.FC<SubTaskItemProps> = ({ item }) => {
    const getIcon = () => {
        switch (item.type) {
            case 'meeting': return <FaCalendarCheck className="text-purple-500" />;
            default: return <FaTasks className="text-gray-500" />;
        }
    };

    return (
        <div className={`flex items-start gap-3 p-2 rounded-md ${item.completed ? 'bg-green-100' : 'bg-gray-100'}`}>
            <div className="flex-shrink-0 mt-1">{getIcon()}</div>
            <div className="flex-1 min-w-0">
                <div className={`prose prose-sm max-w-none ${item.completed ? 'line-through text-gray-500' : ''}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.title}</ReactMarkdown>
                </div>
                {item.type === 'meeting' && item.data && (
                    <div className="text-xs text-gray-500 mt-1">
                        {item.data.date} {item.data.time}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubTaskItem;
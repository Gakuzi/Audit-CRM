// src/components/SubTaskItem.tsx
import React from 'react';
import { PlanItem, ContactPerson } from '../types';
import { FaTasks, FaCalendarCheck, FaUsers, FaFileContract, FaBinoculars, FaSitemap } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SubTaskItemProps {
    item: PlanItem;
    contacts: ContactPerson[];
    onToggleComplete: () => void;
    canToggle: boolean;
}

const getIcon = (type: PlanItem['type']) => {
    switch (type) {
        case 'meeting': return <FaCalendarCheck className="text-purple-500" />;
        case 'interview': return <FaUsers className="text-green-500" />;
        case 'doc_review': return <FaFileContract className="text-blue-500" />;
        case 'observation': return <FaBinoculars className="text-orange-500" />;
        case 'process_analysis': return <FaSitemap className="text-teal-500" />;
        default: return <FaTasks className="text-gray-500" />;
    }
};

const ContactPills: React.FC<{ contactIds?: string[], allContacts: ContactPerson[] }> = ({ contactIds, allContacts }) => {
    if (!contactIds || contactIds.length === 0) return null;
    const linkedContacts = allContacts.filter(c => contactIds.includes(c.id));
    if (linkedContacts.length === 0) return null;

    return (
        <div className="mt-2 flex flex-wrap gap-2">
            {linkedContacts.map(c => (
                <div key={c.id} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">{c.name}</div>
            ))}
        </div>
    );
};

const SubTaskItem: React.FC<SubTaskItemProps> = ({ item, contacts, onToggleComplete, canToggle }) => {
    return (
        <div className="flex items-start space-x-3 py-4 rounded -mx-4 px-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-xl">{getIcon(item.type)}</div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                    <p className={`text-sm font-medium text-gray-900 ${item.completed ? 'line-through text-gray-500' : ''}`}>{item.title}</p>
                    {canToggle && (
                         <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={onToggleComplete}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                    )}
                </div>
                 {item.description && (
                     <div className="mt-1 text-sm text-gray-700 prose prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.description}</ReactMarkdown>
                    </div>
                )}
                <ContactPills contactIds={item.data?.contact_ids} allContacts={contacts} />
            </div>
        </div>
    );
};

export default SubTaskItem;

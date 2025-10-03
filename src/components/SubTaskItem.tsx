// src/components/SubTaskItem.tsx
import React from 'react';
import { PlanItem, ContactPerson } from '../types';
import { FaTasks, FaCalendarCheck, FaUsers, FaFileContract, FaBinoculars, FaSitemap, FaEdit } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SubTaskItemProps {
    item: PlanItem;
    contacts: ContactPerson[];
    onToggleComplete: () => void;
    canToggle: boolean;
    onContactClick: (contactId: string) => void;
    onEdit?: () => void;
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

const ContactPills: React.FC<{ contactIds?: string[], allContacts: ContactPerson[], onContactClick: (contactId: string) => void }> = ({ contactIds, allContacts, onContactClick }) => {
    if (!contactIds || contactIds.length === 0) return null;
    const linkedContacts = allContacts.filter(c => contactIds.includes(c.id));
    if (linkedContacts.length === 0) return null;

    return (
        <div className="mt-2 flex flex-wrap gap-2">
            {linkedContacts.map(c => (
                <button key={c.id} onClick={() => onContactClick(c.id)} className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded-full hover:bg-slate-300">@{c.name}</button>
            ))}
        </div>
    );
};

const SubTaskItem: React.FC<SubTaskItemProps> = ({ item, contacts, onToggleComplete, canToggle, onContactClick, onEdit }) => {
    return (
        <div className="flex items-start space-x-3 py-2 group relative">
            {canToggle && (
                 <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={onToggleComplete}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer mt-1"
                />
            )}
            <div className="flex-shrink-0 h-5 w-5 flex items-center justify-center text-md mt-0.5">{getIcon(item.type)}</div>
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium text-slate-900 ${item.completed ? 'line-through text-slate-500' : ''}`}>{item.title}</p>
                 {item.description && (
                     <div className="mt-1 text-sm text-slate-700 prose prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.description}</ReactMarkdown>
                    </div>
                )}
                <ContactPills contactIds={item.data?.contact_ids} allContacts={contacts} onContactClick={onContactClick} />
            </div>
             {onEdit && (
                <button onClick={onEdit} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-500 hover:text-blue-600 rounded-md bg-slate-200/50">
                    <FaEdit size={12} />
                </button>
            )}
        </div>
    );
};

export default SubTaskItem;
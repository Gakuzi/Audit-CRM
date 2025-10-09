
import React from 'react';
import { PlanItem, ContactPerson } from '../types';
import { FaRegCommentDots, FaTasks, FaCalendarCheck, FaUsers, FaFileContract, FaBinoculars, FaClock, FaEdit, FaTrash, FaUser, FaSitemap } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface PlanItemCardProps {
  item: PlanItem;
  contacts: ContactPerson[];
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleComplete?: () => void;
  onContactClick: (contactId: string) => void;
  onParentTaskSelect?: (taskId: string) => void;
  parentTaskTitle?: string;
}

const PlanItemCard: React.FC<PlanItemCardProps> = ({ item, contacts, onSelect, onEdit, onDelete, onToggleComplete, onContactClick, onParentTaskSelect, parentTaskTitle }) => {
  
  const hasActions = onEdit && onDelete;

  const getIcon = () => {
    switch(item.type) {
      case 'task': return <FaTasks className="text-gray-500" />;
      case 'meeting': return <FaCalendarCheck className="text-purple-500" />;
      case 'interview': return <FaUsers className="text-green-500" />;
      case 'doc_review': return <FaFileContract className="text-blue-500" />;
      case 'observation': return <FaBinoculars className="text-orange-500" />;
      case 'process_analysis': return <FaSitemap className="text-teal-500" />;
      default: return <FaTasks className="text-gray-500" />;
    }
  };
  
  const handleActionClick = (e: React.MouseEvent, action: (() => void) | undefined) => {
      e.stopPropagation();
      action?.();
  };

  const linkedContacts = contacts.filter(c => item.data?.contact_ids?.includes(c.id));
  const subTaskProgress = () => {
      if (!item.sub_tasks || item.sub_tasks.length === 0) return null;
      const total = item.sub_tasks.length;
      const completed = item.sub_tasks.filter(st => st.completed).length;
      return (
        <div className="mt-2 flex items-center gap-2">
            <div className="w-full bg-slate-200 rounded-full h-1.5">
                <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${(completed/total)*100}%` }}></div>
            </div>
            <span className="text-xs text-slate-500 font-medium">{completed}/{total}</span>
        </div>
      );
  }

  return (
    <div 
      onClick={onSelect}
      className={`p-2.5 rounded-md shadow-sm border cursor-pointer transition-colors group relative ${item.completed ? 'bg-green-50/70 border-green-200' : 'bg-white border-slate-200 hover:bg-blue-50'}`}
    >
        {hasActions && (
             <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center bg-white/70 rounded-md">
                <button onClick={(e) => handleActionClick(e, onEdit)} className="p-1.5 text-slate-500 hover:text-blue-600"><FaEdit size={12} /></button>
                <button onClick={(e) => handleActionClick(e, onDelete)} className="p-1.5 text-slate-500 hover:text-red-600"><FaTrash size={12} /></button>
            </div>
        )}

      <div className="flex items-start gap-3">
        {onToggleComplete && (
            <div className="pt-1">
                <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={(e) => {
                        e.stopPropagation();
                        onToggleComplete();
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
            </div>
        )}
        <div className="flex-shrink-0 mt-1">{getIcon()}</div>
        <div className="flex-1 min-w-0 pr-2">
            {parentTaskTitle && item.parent_task_id && onParentTaskSelect && (
                 <button onClick={(e) => { e.stopPropagation(); onParentTaskSelect(item.parent_task_id!); }} className="flex items-center gap-1.5 text-xs text-slate-500 hover:underline mb-1">
                    <FaSitemap size={10} className="transform -rotate-90" />
                    <span className="truncate">{parentTaskTitle}</span>
                </button>
            )}
            <div className={`text-sm text-slate-800 prose prose-sm max-w-none line-clamp-2 ${item.completed ? 'line-through text-slate-500' : ''}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.title}</ReactMarkdown>
            </div>
            
            {(item.type === 'meeting' || item.type === 'interview') && item.data?.time && (
                <div className="flex items-center text-xs text-slate-500 mt-1">
                    <FaClock className="mr-1.5" />
                    <span>{item.data.time}</span>
                    {item.type === 'meeting' && item.data.location && <span className="ml-1 truncate">, {item.data.location}</span>}
                </div>
            )}
             {item.type === 'interview' && item.data?.interviewee && (
                <div className="flex items-center text-xs text-slate-500 mt-1">
                    <FaUser className="mr-1.5" />
                    <span className="truncate">{item.data.interviewee}</span>
                </div>
            )}
        </div>
        <div className="flex items-center space-x-1 text-slate-400 mt-1 flex-shrink-0">
             <FaRegCommentDots />
             <span className="text-xs font-medium">{item.event_count || 0}</span>
        </div>
      </div>
      {linkedContacts.length > 0 && (
          <div className="mt-2 pt-2 border-t flex items-center gap-2">
              {linkedContacts.slice(0, 3).map(contact => (
                  <button key={contact.id} title={contact.name} className="h-6 w-6 bg-blue-100 text-blue-700 text-xs font-bold rounded-full flex items-center justify-center hover:ring-2" onClick={(e) => { e.stopPropagation(); onContactClick(contact.id); }}>{contact.name.charAt(0)}</button>
              ))}
              {linkedContacts.length > 3 && <div className="text-xs text-slate-500">+{linkedContacts.length - 3}</div>}
          </div>
      )}
      {subTaskProgress()}
    </div>
  );
};

export default PlanItemCard;
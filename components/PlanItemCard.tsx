import React from 'react';
import { PlanItem } from '../types';
import { FaRegCommentDots, FaTasks, FaCalendarCheck, FaUsers, FaFileContract, FaBinoculars, FaClock, FaEdit, FaTrash, FaWhatsapp, FaTelegramPlane, FaUser } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';

interface PlanItemCardProps {
  item: PlanItem;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const PlanItemCard: React.FC<PlanItemCardProps> = ({ item, onSelect, onEdit, onDelete }) => {
  
  const getIcon = () => {
    switch(item.type) {
      case 'task': return <FaTasks className="text-gray-500" />;
      case 'meeting': return <FaCalendarCheck className="text-purple-500" />;
      case 'interview': return <FaUsers className="text-green-500" />;
      case 'doc_review': return <FaFileContract className="text-blue-500" />;
      case 'observation': return <FaBinoculars className="text-orange-500" />;
      default: return <FaTasks className="text-gray-500" />;
    }
  }
  
  const handleActionClick = (e: React.MouseEvent, action: (() => void) | undefined) => {
      e.stopPropagation();
      action?.();
  }

  const renderMeetingInvites = () => {
    if (item.type !== 'meeting' || !item.data?.participants || item.data.participants.length === 0) return null;
    
    const inviteText = `Приглашение на встречу: "${item.content}".\nВремя: ${item.data.time || 'не указано'}\nМесто: ${item.data.location || 'не указано'}\nПовестка: ${item.data.agenda || 'не указана'}`;

    return (
        <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-end space-x-2">
            <span className="text-xs text-gray-500">Пригласить:</span>
             <a 
                href={`https://wa.me/?text=${encodeURIComponent(inviteText)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-green-500 hover:text-green-700"
            >
                <FaWhatsapp />
            </a>
            <a 
                href={`https://t.me/share/url?url=&text=${encodeURIComponent(inviteText)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-sky-500 hover:text-sky-700"
            >
                <FaTelegramPlane />
            </a>
        </div>
    )
  }

  return (
    <div 
      onClick={onSelect}
      className="bg-white p-2.5 rounded-md shadow-sm border border-gray-200 cursor-pointer hover:bg-blue-50 transition-colors group relative"
    >
        {onEdit && onDelete && (
             <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center bg-white bg-opacity-70 rounded-md">
                <button onClick={(e) => handleActionClick(e, onEdit)} className="p-1.5 text-gray-500 hover:text-blue-600"><FaEdit size={12} /></button>
                <button onClick={(e) => handleActionClick(e, onDelete)} className="p-1.5 text-gray-500 hover:text-red-600"><FaTrash size={12} /></button>
            </div>
        )}

      <div className="flex justify-between items-start gap-2">
        <div className="flex-shrink-0 mt-1">{getIcon()}</div>
        <div className="flex-1 pr-6">
            <div className="text-sm text-gray-800 prose prose-sm max-w-none">
                <ReactMarkdown>{item.content}</ReactMarkdown>
            </div>
            {item.data?.agenda && 
                <div className="text-xs text-gray-500 mt-1 italic prose prose-xs max-w-none">
                    <ReactMarkdown children={`**Повестка:** ${item.data.agenda}`} />
                </div>
            }
            
            {(item.type === 'meeting' || item.type === 'interview') && item.data?.time && (
                <div className="flex items-center text-xs text-gray-500 mt-1">
                    <FaClock className="mr-1.5" />
                    <span>{item.data.time}</span>
                    {item.type === 'meeting' && item.data.location && <span className="ml-1">, {item.data.location}</span>}
                </div>
            )}
             {item.type === 'interview' && item.data?.interviewee && (
                <div className="flex items-center text-xs text-gray-500 mt-1">
                    <FaUser className="mr-1.5" />
                    <span>{item.data.interviewee}</span>
                </div>
            )}

        </div>
        <div className="flex items-center space-x-1 text-gray-400 mt-1 flex-shrink-0">
             <FaRegCommentDots />
             <span className="text-xs font-medium">{item.event_count || 0}</span>
        </div>
      </div>
      {renderMeetingInvites()}
    </div>
  );
};

export default PlanItemCard;

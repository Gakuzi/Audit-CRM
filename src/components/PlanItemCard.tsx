import React from 'react';
import { PlanItem } from '../types';
import { FaRegCommentDots, FaTasks, FaCalendarCheck, FaUsers, FaFileContract, FaBinoculars, FaClock, FaEdit, FaTrash, FaWhatsapp, FaTelegramPlane, FaUser, FaSitemap, FaCheck, FaUndo } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSwipe } from '../hooks/useSwipe';

interface PlanItemCardProps {
  item: PlanItem;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleComplete?: () => void;
}

const PlanItemCard: React.FC<PlanItemCardProps> = ({ item, onSelect, onEdit, onDelete, onToggleComplete }) => {
  
  const hasActions = onEdit && onDelete;
  const { ref, style } = useSwipe({ 
     onSwipeRightAction: onToggleComplete,
     rightRevealWidth: hasActions ? 128 : 0,
     leftRevealWidth: onToggleComplete ? 64 : 0,
  });

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
  }
  
  const handleActionClick = (e: React.MouseEvent, action: (() => void) | undefined) => {
      e.stopPropagation();
      action?.();
  }

  const renderMeetingInvites = () => {
    if (item.type !== 'meeting' || !item.data?.participants || item.data.participants.length === 0) return null;
    const inviteText = `Приглашение на встречу: "${item.title}".\nВремя: ${item.data.time || 'не указ.'}\nМесто: ${item.data.location || 'не указ.'}\nПовестка: ${item.data.agenda || 'не указ.'}`;
    return (
        <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-end space-x-2">
            <span className="text-xs text-gray-500">Пригласить:</span>
             <a href={`https://wa.me/?text=${encodeURIComponent(inviteText)}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-green-500 hover:text-green-700"><FaWhatsapp /></a>
            <a href={`https://t.me/share/url?url=&text=${encodeURIComponent(inviteText)}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-sky-500 hover:text-sky-700"><FaTelegramPlane /></a>
        </div>
    )
  }
  
  const subTaskProgress = item.sub_tasks ? (item.sub_tasks.filter(st => st.completed).length / item.sub_tasks.length) * 100 : 0;

  return (
    <div className="swipe-container">
       {onToggleComplete && (
           <div className="swipe-actions-left touch-only">
               <div className="swipe-action green">
                   {item.completed ? <FaUndo size={20} /> : <FaCheck size={20} />}
               </div>
           </div>
       )}
       {hasActions && (
          <div className="swipe-actions-right touch-only">
            <button onClick={(e) => handleActionClick(e, onEdit)} className="swipe-action blue"><FaEdit/></button>
            <button onClick={(e) => handleActionClick(e, onDelete)} className="swipe-action red"><FaTrash/></button>
          </div>
        )}
      <div ref={ref} style={style} onClick={onSelect} className={`swipe-content p-2.5 rounded-md shadow-sm border cursor-pointer transition-colors group relative ${item.completed ? 'bg-green-50/70 border-green-200' : 'bg-white border-gray-200'}`}>
          {hasActions && (
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-center bg-white bg-opacity-70 rounded-md">
                <button onClick={(e) => handleActionClick(e, onEdit)} className="p-1.5 text-gray-500 hover:text-blue-600"><FaEdit size={12} /></button>
                <button onClick={(e) => handleActionClick(e, onDelete)} className="p-1.5 text-gray-500 hover:text-red-600"><FaTrash size={12} /></button>
              </div>
          )}
          <div className="flex items-start gap-3">
            {onToggleComplete && (
              <div 
                className="flex items-center pt-1 flex-shrink-0" 
                onClick={e => e.stopPropagation()}
              >
                <input 
                  type="checkbox" 
                  checked={item.completed} 
                  onChange={onToggleComplete}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>
            )}
            <div className="flex-shrink-0 mt-1">{getIcon()}</div>
            <div className="flex-1 min-w-0 pr-2">
                <div className={`text-sm text-gray-800 prose prose-sm max-w-none line-clamp-2 ${item.completed ? 'line-through text-gray-600' : ''}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.title}</ReactMarkdown>
                </div>
                {item.description && (
                     <div className="text-xs text-gray-500 mt-1 prose prose-xs max-w-none line-clamp-2">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.description}</ReactMarkdown>
                    </div>
                )}
                {(item.type === 'meeting' || item.type === 'interview') && item.data?.time && (
                    <div className="flex items-center text-xs text-gray-500 mt-1"><FaClock className="mr-1.5" /><span>{item.data.time}</span>{item.type === 'meeting' && item.data.location && <span className="ml-1">, {item.data.location}</span>}</div>
                )}
                 {item.type === 'interview' && item.data?.interviewee && (
                    <div className="flex items-center text-xs text-gray-500 mt-1"><FaUser className="mr-1.5" /><span>{item.data.interviewee}</span></div>
                )}
            </div>
            <div className="flex items-center space-x-1 text-gray-400 mt-1 flex-shrink-0"><FaRegCommentDots /><span className="text-xs font-medium">{item.event_count || 0}</span></div>
          </div>
          {renderMeetingInvites()}
          {item.sub_tasks && item.sub_tasks.length > 0 && (
              <div className="mt-2 pt-2 border-t">
                  <div className="flex justify-between items-center text-xs text-gray-500">
                      <span className="flex items-center gap-1.5"><FaTasks size={10} /> {item.sub_tasks.filter(t => t.completed).length}/{item.sub_tasks.length}</span>
                      <span>{Math.round(subTaskProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-1"><div className="bg-blue-500 h-1 rounded-full" style={{ width: `${subTaskProgress}%` }}></div></div>
              </div>
          )}
      </div>
    </div>
  );
};

export default PlanItemCard;
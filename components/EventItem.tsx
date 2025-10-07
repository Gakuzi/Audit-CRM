import React from 'react';
import { Event } from '../types';
import { FaReply, FaTrash, FaEdit, FaRegComment, FaVideo, FaFileAlt, FaMicrophone, FaPaperclip, FaImage } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface EventItemProps {
  event: Event;
  onReply: (event: Event) => void;
  onQuoteClick: (eventId: string) => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

const getEventTypeIcon = (type: Event['type']) => {
    switch (type) {
        case 'meeting': return <FaVideo className="text-purple-500" />;
        case 'documentation_review': return <FaFileAlt className="text-blue-500" />;
        case 'interview': return <FaMicrophone className="text-red-500" />;
        default: return <FaRegComment className="text-gray-500" />;
    }
}

const EventAttachments: React.FC<{ files: { name: string, url: string, type?: string }[] }> = ({ files }) => (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {files.map(file => {
            const fileType = file.type || '';
            const isImage = fileType.startsWith('image/');
            if (isImage) return <a key={file.url} href={file.url} target="_blank" rel="noopener noreferrer"><img src={file.url} alt={file.name} className="rounded-lg max-h-48 w-full object-cover border" /></a>;
            if (fileType.startsWith('audio/')) return <div key={file.url} className="p-2 bg-gray-100 rounded-lg"><p className="text-xs truncate">{file.name}</p><audio src={file.url} controls className="w-full" /></div>;
            if (fileType.startsWith('video/')) return <div key={file.url} className="col-span-1 sm:col-span-2"><video src={file.url} controls className="rounded-lg w-full max-w-md mx-auto" /></div>;
            return <a key={file.url} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline p-2 bg-gray-100 rounded-lg"><FaFileAlt className="mr-2" /> <span className="truncate">{file.name}</span></a>;
        })}
    </div>
);

const EventItem: React.FC<EventItemProps> = ({ event, onReply, onQuoteClick, onDelete, onEdit }) => {
    
    return (
        <div id={`event-${event.id}`} className="flex items-start space-x-3 py-4 rounded -mx-4 px-4 transition-colors duration-300">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-xl">{getEventTypeIcon(event.type)}</div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-slate-900 truncate">{event.author_email || 'System'}</p>
                    <p className="text-xs text-slate-500 flex-shrink-0 ml-2">{new Date(event.created_at).toLocaleString('ru-RU')}</p>
                </div>
                
                <div>
                    {event.parent && event.parent_event_id && (
                        <div onClick={(e) => { e.stopPropagation(); onQuoteClick(event.parent_event_id!); }} className="mt-2 p-2 border-l-4 border-slate-300 bg-slate-100 text-sm text-slate-600 hover:bg-slate-200 cursor-pointer rounded">
                            <p className="font-semibold">{event.parent.author_email}</p>
                            <p className="line-clamp-2">{event.parent.content}</p>
                        </div>
                    )}

                    {event.content && (
                        <div className="mt-2 text-sm text-slate-800 prose prose-sm max-w-none">
                           <ReactMarkdown remarkPlugins={[remarkGfm]}>{event.content}</ReactMarkdown>
                        </div>
                    )}
                    
                    {event.data?.file_urls && <EventAttachments files={event.data.file_urls} />}
                </div>

                <div className="mt-2 flex items-center space-x-4">
                    <button onClick={() => onReply(event)} className="flex items-center text-xs text-slate-500 hover:text-blue-600 font-medium"><FaReply className="mr-1.5" /> Ответить</button>
                    {onEdit && <button onClick={onEdit} className="flex items-center text-xs text-slate-500 hover:text-green-600 font-medium"><FaEdit className="mr-1.5" /> Редакт.</button>}
                    {onDelete && <button onClick={onDelete} className="flex items-center text-xs text-slate-500 hover:text-red-600 font-medium"><FaTrash className="mr-1.5" /> Удалить</button>}
                </div>
            </div>
        </div>
    );
};

export default EventItem;
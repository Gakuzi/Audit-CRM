import React from 'react';
import { Event } from '../types';
import { FaRegComment, FaReply, FaTrash, FaBrain, FaShare } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Spinner } from './ui/Spinner';

interface EventItemProps {
  event: Event;
  onReply: (event: Event) => void;
  onQuoteClick: (eventId: string) => void;
  onDelete?: () => void;
  onAnalyze: (event: Event) => void;
  isAnalyzing: boolean;
  isAuditor: boolean;
  onAddSubEvent?: (event: Event) => void;
}

const renderAttachments = (files: { name: string, url: string, type?: string }[]) => {
    return (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {files.map(file => {
                const fileType = file.type || '';
                const isImage = fileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
                const isAudio = fileType.startsWith('audio/');
                const isVideo = fileType.startsWith('video/');

                if (isImage) {
                    return (
                        <a key={file.url} href={file.url} target="_blank" rel="noopener noreferrer" className="block">
                            <img src={file.url} alt={file.name} className="rounded-lg max-h-48 w-full object-cover border" />
                        </a>
                    );
                }
                if (isAudio) {
                    return (
                        <div key={file.url} className="p-2 bg-gray-100 rounded-lg">
                            <p className="text-xs text-gray-500 truncate">{file.name}</p>
                            <audio src={file.url} controls className="w-full" />
                        </div>
                    );
                }
                if (isVideo) {
                    return (
                         <div key={file.url} className="col-span-1 sm:col-span-2">
                            <video src={file.url} controls className="rounded-lg w-full max-w-md mx-auto" />
                         </div>
                    );
                }
                return (
                    <a key={file.url} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline p-2 bg-gray-100 rounded-lg">
                        <FaRegComment className="mr-2 flex-shrink-0" />
                        <span className="truncate">{file.name}</span>
                    </a>
                );
            })}
        </div>
    );
};


const EventItem: React.FC<EventItemProps> = ({ event, onReply, onQuoteClick, onDelete, onAnalyze, isAnalyzing, isAuditor, onAddSubEvent }) => {
    
    const canBeAnalyzed = isAuditor && (
        (event.data?.file_urls?.some(f => f.type?.startsWith('image/') || f.type?.startsWith('audio/'))) ||
        event.content?.trim().startsWith('mindmap') ||
        event.content?.trim().startsWith('graph')
    );

    return (
        <div id={`event-${event.id}`} className="flex items-start space-x-3 py-4 rounded -mx-4 px-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                {event.author_email === 'AI Ассистент' ? <FaBrain className="text-indigo-500" /> : <FaRegComment className="text-gray-500" />}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-gray-900">{event.author_email || 'System'}</p>
                    <p className="text-xs text-gray-500">
                        {new Date(event.created_at).toLocaleString('ru-RU')}
                    </p>
                </div>
                
                {event.parent && event.parent_event_id && (
                     <div 
                        onClick={() => onQuoteClick(event.parent_event_id!)}
                        className="mt-2 p-2 border-l-4 border-gray-300 bg-gray-100 text-sm text-gray-600 hover:bg-gray-200 cursor-pointer rounded"
                     >
                        <p className="font-semibold">{event.parent.author_email}</p>
                        <div className="prose prose-sm max-w-none line-clamp-2">
                           <ReactMarkdown remarkPlugins={[remarkGfm]}>{event.parent.content}</ReactMarkdown>
                        </div>
                     </div>
                )}

                {event.content && (
                    <div className="mt-2 text-sm text-gray-800 prose prose-sm">
                       <ReactMarkdown remarkPlugins={[remarkGfm]}>{event.content}</ReactMarkdown>
                    </div>
                )}
                
                {event.data?.file_urls && renderAttachments(event.data.file_urls)}

                <div className="mt-2 flex items-center space-x-4">
                    <button onClick={() => onReply(event)} className="flex items-center text-xs text-gray-500 hover:text-blue-600 font-medium">
                        <FaReply className="mr-1.5" /> Ответить
                    </button>
                     {onAddSubEvent && (
                        <button onClick={() => onAddSubEvent(event)} className="flex items-center text-xs text-gray-500 hover:text-indigo-600 font-medium">
                            <FaShare className="mr-1.5" /> Создать подзадачу
                        </button>
                    )}
                    {onDelete && (
                        <button onClick={onDelete} className="flex items-center text-xs text-gray-500 hover:text-red-600 font-medium">
                            <FaTrash className="mr-1.5" /> Удалить
                        </button>
                    )}
                    {canBeAnalyzed && (
                         <button onClick={() => onAnalyze(event)} disabled={isAnalyzing} className="flex items-center text-xs text-gray-500 hover:text-indigo-600 font-medium">
                            {isAnalyzing ? <><Spinner size="sm" /> Анализ...</> : <><FaBrain className="mr-1.5" /> Анализ с AI</>}
                         </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EventItem;
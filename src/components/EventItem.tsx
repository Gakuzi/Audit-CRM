import React, { useEffect, useRef } from 'react';
import { Event } from '../types';
import { FaRegComment, FaVideo, FaFileAlt, FaMicrophone, FaReply, FaUserFriends, FaClock, FaTrash, FaBrain } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';
import { Spinner } from './ui/Spinner';
import { useSwipe } from '../hooks/useSwipe';

interface EventItemProps {
  event: Event;
  onReply: (event: Event) => void;
  onQuoteClick: (eventId: string) => void;
  onDelete?: () => void;
  onAnalyze?: (event: Event) => void;
  isAnalyzing?: boolean;
  isAuditor?: boolean;
  onAddSubEvent?: (event: Event) => void;
}

mermaid.initialize({ startOnLoad: false, theme: 'neutral' });

const MermaidDiagram: React.FC<{ chart: string }> = ({ chart }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    useEffect(() => {
        const renderMermaid = async () => {
            if (ref.current && chart) {
                 // Clear previous state
                setSvg(null);
                setError(null);
                try {
                    const id = `mermaid-${crypto.randomUUID()}`;
                    const { svg } = await mermaid.render(id, chart);
                    setSvg(svg);
                } catch (e: any) {
                    console.error('Mermaid rendering error:', e);
                    setError(e.message || 'Ошибка рендеринга диаграммы.');
                }
            }
        };
        renderMermaid();
    }, [chart]);
    
    if (error) {
        return <pre className="text-red-500 text-xs bg-red-50 p-2 rounded">Ошибка диаграммы: {error}</pre>;
    }

    return svg ? <div dangerouslySetInnerHTML={{ __html: svg }} /> : <div ref={ref} className="p-4 flex justify-center items-center"><Spinner size="sm" /></div>;
};


const getEventTypeIcon = (event: Event) => {
    if (event.author_email === 'AI Ассистент') {
        return <FaBrain className="text-indigo-500" />;
    }
    switch (event.type) {
        case 'meeting':
            return <FaVideo className="text-purple-500" />;
        case 'documentation_review':
            return <FaFileAlt className="text-blue-500" />;
        case 'interview':
            return <FaMicrophone className="text-red-500" />;
        case 'comment':
        default:
            return <FaRegComment className="text-gray-500" />;
    }
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
                        <FaFileAlt className="mr-2 flex-shrink-0" />
                        <span className="truncate">{file.name}</span>
                    </a>
                );
            })}
        </div>
    );
};


const EventItem: React.FC<EventItemProps> = ({ event, onReply, onQuoteClick, onDelete, onAnalyze, isAnalyzing, isAuditor, onAddSubEvent }) => {
    
    const isMermaid = event.content?.trim().startsWith('mindmap') || event.content?.trim().startsWith('graph');
    const hasAnalyzableContent = (event.data?.file_urls && event.data.file_urls.length > 0) || isMermaid;
    const canReply = event.author_email !== 'AI Ассистент';
    const canAnalyze = isAuditor && onAnalyze && hasAnalyzableContent;

    const { ref: swipeRef, style: swipeStyle } = useSwipe({
        rightRevealWidth: canReply ? 80 : 0,
        leftRevealWidth: canAnalyze ? 80 : 0,
    });

    const renderEventDetails = () => {
        const eventData = event.data;
        if (!eventData) return null;

        if (eventData.file_urls && eventData.file_urls.length > 0) {
             return renderAttachments(eventData.file_urls);
        }

        if (event.type === 'meeting') {
            return (
                <div className="mt-2 space-y-2 text-sm">
                    {eventData.meeting_time && (
                        <div className="flex items-center text-gray-600">
                            <FaClock className="mr-2 flex-shrink-0" />
                            <span>{new Date(eventData.meeting_time).toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' })}</span>
                        </div>
                    )}
                    {eventData.participants && eventData.participants.length > 0 && (
                         <div className="flex items-start text-gray-600">
                            <FaUserFriends className="mr-2 mt-1 flex-shrink-0" />
                            <div>
                                <span className="font-medium">Участники:</span>
                                <ul className="list-disc list-inside">
                                    {eventData.participants.map((p, i) => <li key={i}>{p}</li>)}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        return null;
    }

    return (
        <div id={`event-${event.id}`} className="relative bg-white -mx-4 overflow-hidden">
            {/* Background Actions */}
            {canAnalyze && (
                <div className="absolute inset-y-0 left-0 flex items-center z-0 touch-only">
                    <button
                        onClick={() => onAnalyze && onAnalyze(event)}
                        className="h-full bg-indigo-500 text-white w-20 flex flex-col items-center justify-center"
                    >
                        {isAnalyzing ? <Spinner size="sm" color="border-white" /> : <FaBrain size={18}/>}
                        <span className="text-xs mt-1">Анализ</span>
                    </button>
                </div>
            )}
            {canReply && (
                <div className="absolute inset-y-0 right-0 flex items-center z-0 touch-only">
                    <button
                        onClick={() => onReply(event)}
                        className="h-full bg-blue-500 text-white w-20 flex flex-col items-center justify-center"
                    >
                        <FaReply size={18}/>
                        <span className="text-xs mt-1">Ответ</span>
                    </button>
                </div>
            )}

            {/* Main Content */}
            <div ref={swipeRef} style={swipeStyle} className="relative bg-white z-10 touch-pan-y">
                <div className="flex items-start space-x-3 py-4 px-4">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        {getEventTypeIcon(event)}
                    </div>
                    <div className="flex-1">
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
                                   <ReactMarkdown>{event.parent.content}</ReactMarkdown>
                                </div>
                             </div>
                        )}

                        {event.content && (
                            <div className="mt-2 text-sm text-gray-800 prose prose-sm max-w-none">
                                {isMermaid ? <MermaidDiagram chart={event.content} /> : <ReactMarkdown>{event.content}</ReactMarkdown>}
                            </div>
                        )}
                        
                        {renderEventDetails()}

                        <div className="mt-2 flex items-center space-x-4">
                            {canReply && (
                                <button onClick={() => onReply(event)} className="flex items-center text-xs text-gray-500 hover:text-blue-600 font-medium">
                                    <FaReply className="mr-1.5" /> Ответить
                                </button>
                            )}
                            {onAddSubEvent && (
                                <button onClick={() => onAddSubEvent(event)} className="flex items-center text-xs text-gray-500 hover:text-indigo-600 font-medium">
                                    <FaFileAlt className="mr-1.5" /> Вложить событие
                                </button>
                            )}
                            {onDelete && (
                                <button onClick={onDelete} className="flex items-center text-xs text-gray-500 hover:text-red-600 font-medium">
                                    <FaTrash className="mr-1.5" /> Удалить
                                </button>
                            )}
                            {canAnalyze && (
                                <button 
                                    onClick={() => onAnalyze(event)}
                                    disabled={isAnalyzing}
                                    className="flex items-center text-xs text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50"
                                >
                                    {isAnalyzing ? <Spinner size="sm" /> : <FaBrain className="mr-1.5" />}
                                    {isAnalyzing ? 'Анализ...' : 'Анализ с AI'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventItem;
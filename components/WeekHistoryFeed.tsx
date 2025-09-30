import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { Event, PlanItem } from '../types';
import { Spinner } from './ui/Spinner';
import { FaRegCommentDots, FaVideo, FaFileAlt, FaMicrophone, FaPaperclip } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';

interface WeekHistoryFeedProps {
    weekId: string;
    allTasks: PlanItem[];
    onTaskSelect: (item: PlanItem) => void;
}

const getEventTypeIcon = (type: Event['type']) => {
    switch (type) {
        case 'meeting':
            return <FaVideo className="text-purple-500" />;
        case 'documentation_review':
            return <FaFileAlt className="text-blue-500" />;
        case 'interview':
            return <FaMicrophone className="text-red-500" />;
        case 'comment':
        default:
            return <FaRegCommentDots className="text-gray-500" />;
    }
}


const WeekHistoryFeed: React.FC<WeekHistoryFeedProps> = ({ weekId, allTasks, onTaskSelect }) => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('week_id', weekId)
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error('Error fetching week events:', error);
        } else {
            setEvents(data || []);
        }
        setLoading(false);
    }, [weekId]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);
    
    const findTaskContent = (taskId: string) => {
        return allTasks.find(task => task.id === taskId)?.content;
    }

    if (loading) {
        return (
            <div className="bg-white rounded-lg p-4 h-full flex items-center justify-center">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg p-4">
             <h4 className="font-semibold text-gray-700 mb-3">Общая история этапа</h4>
             <div className="max-h-96 overflow-y-auto pr-2 space-y-4">
                {events.length > 0 ? (
                    events.map(event => (
                        <div key={event.id} className="flex items-start space-x-3 text-sm">
                             <div className="flex-shrink-0 mt-1 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                                {getEventTypeIcon(event.type)}
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-gray-500">
                                    {event.author_email} &bull; {new Date(event.created_at).toLocaleString('ru-RU')}
                                </p>
                                <p 
                                    onClick={() => {
                                        const task = allTasks.find(t => t.id === event.task_id);
                                        if (task) onTaskSelect(task);
                                    }}
                                    className="font-semibold text-blue-600 hover:underline cursor-pointer"
                                >
                                    {findTaskContent(event.task_id) || 'Задача не найдена'}
                                </p>
                                <div className="mt-1 text-gray-800 prose prose-sm max-w-none">
                                    <ReactMarkdown>{event.content || ''}</ReactMarkdown>
                                </div>
                                {event.data?.file_urls && event.data.file_urls.length > 0 && (
                                    <div className="mt-2">
                                        {event.data.file_urls.map(file => (
                                            <a key={file.url} href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs inline-flex items-center gap-1.5 text-blue-600 hover:underline bg-gray-100 px-2 py-1 rounded">
                                                <FaPaperclip />
                                                {file.name}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-gray-500 text-center py-8">Событий на этом этапе пока нет.</p>
                )}
             </div>
        </div>
    );
};

export default WeekHistoryFeed;

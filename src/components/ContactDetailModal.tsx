import React, { useState, useEffect, useRef } from 'react';
import Modal from './ui/Modal';
import { ContactPerson, Project, HistoryItem, Event, PlanItem } from '../types';
import { supabase } from '../services/supabaseClient';
import { Spinner } from './ui/Spinner';
import { FaPhone, FaEnvelope, FaWhatsapp, FaTelegramPlane, FaUser, FaRegCommentDots, FaTasks, FaCalendarCheck, FaUsers, FaFileContract, FaBinoculars, FaSitemap } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatPhoneForLink } from '../utils';

interface ContactDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: ContactPerson | null;
  project: Project | null;
  onTaskSelect: (taskId: string) => void;
}

const getIcon = (type: HistoryItem['type']) => {
    const iconClass = "mr-3 text-slate-500";
    switch(type) {
      case 'event': return <FaRegCommentDots className={iconClass} />;
      case 'task': return <FaTasks className={iconClass} />;
      case 'meeting': return <FaCalendarCheck className={iconClass} />;
      case 'interview': return <FaUsers className={iconClass} />;
      case 'doc_review': return <FaFileContract className={iconClass} />;
      case 'observation': return <FaBinoculars className={iconClass} />;
      case 'process_analysis': return <FaSitemap className={iconClass} />;
      default: return <FaTasks className={iconClass} />;
    }
}

const ContactDetailModal: React.FC<ContactDetailModalProps> = ({ isOpen, onClose, contact, project, onTaskSelect }) => {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const feedRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen || !contact || !project) return;

        const fetchHistory = async () => {
            setLoading(true);
            setHistory([]);
            
            const { data: events, error: eventsError } = await supabase
                .from('events')
                .select('*')
                .eq('project_id', project.id)
                .contains('data', JSON.stringify({ contact_ids: [contact.id] }));

            const { data: weeks, error: weeksError } = await supabase
                .from('weeks')
                .select('plan')
                .eq('project_id', project.id);
            
            if (eventsError || weeksError) {
                console.error("Error fetching history:", eventsError?.message || weeksError?.message);
                setLoading(false);
                return;
            }
            
            const allItems: HistoryItem[] = [];
            const allTasksMap = new Map<string, string>();

            (weeks || []).forEach((week: { plan: any }) => {
                if (!week.plan) return;
                for (const date in week.plan) {
                    (week.plan[date]?.tasks || []).forEach((task: PlanItem) => {
                        allTasksMap.set(task.id, task.title);
                        if (task.data?.contact_ids?.includes(contact.id)) {
                            allItems.push({
                                id: task.id,
                                type: task.type,
                                content: task.title,
                                date: date,
                                author: "Запланировано",
                                taskId: task.id,
                                taskTitle: task.title,
                            });
                        }
                    });
                }
            });
            
            (events || []).forEach((event: Event) => {
                allItems.push({
                    id: event.id,
                    type: 'event',
                    content: event.content,
                    date: event.created_at,
                    author: event.author_email,
                    taskId: event.task_id,
                    taskTitle: allTasksMap.get(event.task_id) || "Задача",
                });
            });

            allItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setHistory(allItems);
            setLoading(false);
        };

        fetchHistory();

    }, [isOpen, contact, project]);
    
    useEffect(() => {
        if (!loading && history.length > 0 && feedRef.current) {
            feedRef.current.scrollTop = feedRef.current.scrollHeight;
        }
    }, [loading, history]);

    if (!contact || !project) return null;

    const getTelegramLink = () => {
        const telegram = contact?.telegram || '';
        if (!telegram) return null;
        if (telegram.startsWith('@')) {
            return `https://t.me/${telegram.replace('@', '')}`;
        }
        return `https://t.me/+${formatPhoneForLink(telegram)}`;
    };

    const telegramLink = getTelegramLink();

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Карточка контакта" size="lg">
            <div className="flex flex-col sm:flex-row items-start gap-4 p-4 bg-slate-50 rounded-lg mb-4">
                <div className="flex-shrink-0 h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <FaUser className="text-blue-500 text-3xl" />
                </div>
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-800">{contact.name}</h3>
                    <p className="text-slate-600">{contact.role}</p>
                    <div className="mt-2 flex flex-col gap-1 text-sm">
                        {contact.emails?.map(email => <a key={email} href={`mailto:${email}`} className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600"><FaEnvelope /> {email}</a>)}
                        {contact.phones?.map(phone => <a key={phone} href={`tel:${phone}`} className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600"><FaPhone /> {phone}</a>)}
                    </div>
                </div>
                <div className="flex sm:flex-col items-center gap-2 pt-2">
                     {(contact.whatsapp || contact.phones?.[0]) && <a href={`https://wa.me/${formatPhoneForLink(contact.whatsapp || contact.phones?.[0])}`} target="_blank" rel="noopener noreferrer" className="action-btn text-green-500" title="WhatsApp"><FaWhatsapp /></a>}
                     {telegramLink && <a href={telegramLink} target="_blank" rel="noopener noreferrer" className="action-btn text-sky-500" title="Telegram"><FaTelegramPlane /></a>}
                </div>
            </div>
            
            <h4 className="font-semibold text-slate-700 mb-2">История взаимодействий</h4>
            <div ref={feedRef} className="h-80 overflow-y-auto bg-slate-50 rounded-lg p-2 border">
                {loading ? <div className="flex justify-center items-center h-full"><Spinner /></div> : (
                    history.length > 0 ? (
                        <div className="space-y-4">
                            {history.map(item => (
                                <div key={item.id} className="flex items-start gap-3">
                                    <div className="pt-1">{getIcon(item.type)}</div>
                                    <div className="flex-1">
                                        <p className="text-xs text-slate-500">
                                            {new Date(item.date).toLocaleString('ru-RU')}
                                            {item.author && ` • ${item.author}`}
                                        </p>
                                        <button onClick={() => { onTaskSelect(item.taskId); onClose(); }} className="text-sm font-semibold text-blue-600 hover:underline text-left">{item.taskTitle}</button>
                                        <div className="text-sm text-slate-800 prose prose-sm max-w-none">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.content}</ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-sm text-center text-slate-500 pt-8">Нет истории взаимодействий с этим контактом.</p>
                )}
            </div>
        </Modal>
    );
};

export default ContactDetailModal;
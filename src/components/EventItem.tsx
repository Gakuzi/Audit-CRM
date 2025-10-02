import React from 'react';
import { Event, ContactPerson } from '../types';
import { FaReply, FaTrash, FaEdit, FaRegComment, FaVideo, FaFileAlt, FaMicrophone, FaPaperclip, FaImage, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface EventItemProps {
  event: Event;
  contacts: ContactPerson[];
  onReply: (event: Event) => void;
  onQuoteClick: (eventId: string) => void;
  onDelete?: () => void;
  onEdit?: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const getEventTypeIcon = (type: Event['type']) => {
    switch (type) {
        case 'meeting': return <FaVideo className="text-purple-500" />;
        case 'documentation_review': return <FaFileAlt className="text-blue-500" />;
        case 'interview': return <FaMicrophone className="text-red-500" />;
        default: return <FaRegComment className="text-gray-500" />;
    }
}

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


const AttachmentSummary: React.FC<{ files: { name: string, url: string, type?: string }[] }> = ({ files }) => {
    if (!files || files.length === 0) return null;
    
    const counts = files.reduce((acc, file) => {
        const type = file.type || '';
        if (type.startsWith('image/')) acc.images++;
        else if (type.startsWith('audio/')) acc.audios++;
        else if (type.startsWith('video/')) acc.videos++;
        else acc.files++;
        return acc;
    }, { images: 0, audios: 0, videos: 0, files: 0 });

    return (
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
            {counts.images > 0 && <span className="flex items-center gap-1"><FaImage /> {counts.images}</span>}
            {counts.audios > 0 && <span className="flex items-center gap-1"><FaMicrophone /> {counts.audios}</span>}
            {counts.videos > 0 && <span className="flex items-center gap-1"><FaVideo /> {counts.videos}</span>}
            {counts.files > 0 && <span className="flex items-center gap-1"><FaPaperclip /> {counts.files}</span>}
        </div>
    );
};

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

const EventItem: React.FC<EventItemProps> = ({ event, contacts, onReply, onQuoteClick, onDelete, onEdit, isExpanded, onToggleExpand }) => {
    
    return (
        <div id={`event-${event.id}`} className="flex items-start space-x-3 py-4 rounded -mx-4 px-4 transition-colors duration-300">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-xl">{getEventTypeIcon(event.type)}</div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-gray-900 truncate">{event.author_email || 'System'}</p>
                    <p className="text-xs text-gray-500 flex-shrink-0 ml-2">{new Date(event.created_at).toLocaleString('ru-RU')}</p>
                </div>
                
                <div className="cursor-pointer" onClick={onToggleExpand}>
                    {event.parent && event.parent_event_id && (
                        <div onClick={(e) => { e.stopPropagation(); onQuoteClick(event.parent_event_id!); }} className="mt-2 p-2 border-l-4 border-gray-300 bg-gray-100 text-sm text-gray-600 hover:bg-gray-200 cursor-pointer rounded">
                            <p className="font-semibold">{event.parent.author_email}</p>
                            <p className="line-clamp-2">{event.parent.content}</p>
                        </div>
                    )}

                    {event.content && (
                        <div className={`mt-2 text-sm text-gray-800 prose prose-sm max-w-none ${!isExpanded ? 'line-clamp-2' : ''}`}>
                           <ReactMarkdown remarkPlugins={[remarkGfm]}>{event.content}</ReactMarkdown>
                        </div>
                    )}
                    
                    <ContactPills contactIds={event.data?.contact_ids} allContacts={contacts} />

                    {isExpanded && event.data?.file_urls && <EventAttachments files={event.data.file_urls} />}
                    {!isExpanded && event.data?.file_urls && <AttachmentSummary files={event.data.file_urls} />}
                </div>

                <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => onReply(event)} className="flex items-center text-xs text-gray-500 hover:text-blue-600 font-medium"><FaReply className="mr-1.5" /> Ответить</button>
                        {isExpanded && (
                            <>
                                {onEdit && <button onClick={onEdit} className="flex items-center text-xs text-gray-500 hover:text-green-600 font-medium"><FaEdit className="mr-1.5" /> Редакт.</button>}
                                {onDelete && <button onClick={onDelete} className="flex items-center text-xs text-gray-500 hover:text-red-600 font-medium"><FaTrash className="mr-1.5" /> Удалить</button>}
                            </>
                        )}
                    </div>
                     <button onClick={onToggleExpand} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1">
                        {isExpanded ? 'Свернуть' : 'Развернуть'}
                        {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EventItem;

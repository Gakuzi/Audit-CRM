import React, { useState, useRef, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, sendGuestEventNotification } from '../services/supabaseClient';
import { Spinner } from './ui/Spinner';
import { Event, Project, PlanItem, ContactPerson } from '../types';
import { FaTimes, FaPaperclip, FaGoogleDrive, FaCamera, FaLink, FaTasks, FaVideo, FaPlus, FaPaperPlane, FaUserPlus, FaFileAlt } from 'react-icons/fa';
import { FILE_SIZE_LIMIT } from '../constants';
import * as googleApiService from '../services/googleApiService';
import UploadToDriveModal from './UploadToDriveModal';
import AttachLinkModal from './AttachLinkModal';
import AudioRecorderModal from './AudioRecorderModal';
import { useGooglePicker } from '../hooks/useGooglePicker';
import AddContactModal from './AddContactModal';

interface AddEventFormProps {
  user: User | null;
  providerToken: string | null;
  context: { weekId: string; taskId: string; projectId: string; item: PlanItem };
  quotedEvent: Event | null;
  onClearQuote: () => void;
  onNewEvent: (event: Event) => void;
  project: Project;
  contacts: ContactPerson[];
  isGuest: boolean;
  onAddSubTaskRequest: () => void;
  onContactsUpdate: () => void;
}

const sanitizeFileName = (fileName: string): string => {
    return fileName.replace(/[^a-zA-Z0-9_.-]/g, '_').substring(0, 100);
};

const AddEventForm: React.FC<AddEventFormProps> = ({ user, providerToken, context, quotedEvent, onClearQuote, onNewEvent, project, contacts, isGuest, onAddSubTaskRequest, onContactsUpdate }) => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState<boolean | string>(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [filesToAttach, setFilesToAttach] = useState<File[]>([]);
    const [contactIds, setContactIds] = useState<string[]>([]);
    const [isContactSelectorOpen, setIsContactSelectorOpen] = useState(false);
    const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
    
    const [fileForDrive, setFileForDrive] = useState<File | null>(null);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const actionMenuRef = useRef<HTMLDivElement>(null);
    
    const onPickerSelect = (files: any[]) => {
        const links = files.map(file => `[${file.name}](${file.url})`).join('\n');
        setContent(prev => `${prev}\n${links}`.trim());
    };
    
    const { openPicker } = useGooglePicker({
        clientId: '228020662283-kuhv2h4k2t6d3e6i1fudsc918k9a9h2t.apps.googleusercontent.com',
        developerKey: process.env.GOOGLE_API_KEY || '',
        token: providerToken,
        onSelect: onPickerSelect,
    });


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
                setIsActionMenuOpen(false);
                setIsContactSelectorOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => { 
        if (textareaRef.current) { 
            textareaRef.current.style.height = 'auto'; 
            const maxHeight = 160; // Corresponds to max-h-40
            const scrollHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
        } 
    }, [content]);

    const uploadFiles = async (files: File[]) => {
        if (files.length === 0) return [];
        const uploadPromises = files.map(async file => {
            const sanitized = sanitizeFileName(file.name);
            const filePath = `${user ? user.id : 'guests'}/${context.taskId}/${Date.now()}-${sanitized}`;
            const { error } = await supabase.storage.from('audit-files').upload(filePath, file);
            if (error) throw error;
            const { data } = supabase.storage.from('audit-files').getPublicUrl(filePath);
            return { name: file.name, url: data.publicUrl, type: file.type };
        });
        return Promise.all(uploadPromises);
    };
    
    const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files) return;
        const selectedFiles = Array.from(event.target.files);
        const validFiles: File[] = [];
        for (const file of selectedFiles) {
            const currentFile = file as File;
            if (currentFile.size > FILE_SIZE_LIMIT) {
                if (providerToken) setFileForDrive(currentFile);
                else alert(`Файл "${currentFile.name}" слишком большой (>${FILE_SIZE_LIMIT/1024/1024}MB).`);
            } else {
                validFiles.push(currentFile);
            }
        }
        setFilesToAttach(prev => [...prev, ...validFiles]);
        event.target.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() && filesToAttach.length === 0) return;
        setLoading(true);
        try {
            const uploadedFiles = await uploadFiles(filesToAttach);
            const eventData: any = { file_urls: uploadedFiles };
            if (contactIds.length > 0) eventData.contact_ids = contactIds;

            const { data, error } = await supabase.from('events').insert({
                project_id: context.projectId, week_id: context.weekId, task_id: context.taskId,
                user_id: user ? user.id : null,
                author_email: user ? user.email : (localStorage.getItem('guestName') || 'Гость'),
                type: 'comment' as const, content: content.trim(),
                parent_event_id: quotedEvent?.id || null,
                data: uploadedFiles.length > 0 || contactIds.length > 0 ? eventData : null,
            }).select().single();

            if (error) throw error;
            if (data) {
                const newEvent = data as Event;
                onNewEvent(newEvent);
                if (isGuest) sendGuestEventNotification(project, context.item, newEvent, window.location.origin);
                setContent(''); setFilesToAttach([]); setContactIds([]); onClearQuote();
            }
        } catch(err: any) { alert('Ошибка: ' + err.message); } 
        finally { setLoading(false); }
    };

    const handleCreateGoogleFile = async (type: 'doc' | 'sheet') => {
        if (!providerToken) return;
        const defaultName = `${project.name} - ${context.item.title}`;
        const fileType = type === 'doc' ? 'документа' : 'таблицы';
        const fileName = prompt(`Введите название для нового ${fileType}:`, defaultName);
        if (!fileName) return;

        setLoading(`google-${type}`);
        try {
            let url = '';
            if (type === 'doc') {
                url = await googleApiService.createGoogleDoc(providerToken, fileName, `Файл создан для задачи: ${context.item.title}\nПроект: ${project.name}`);
            } else {
                url = await googleApiService.createGoogleSheet(providerToken, fileName);
            }
            setContent(prev => `${prev}\n[${fileName}](${url})`.trim());
            window.open(url, '_blank'); // Open the new document for editing
        } catch (error: any) {
            alert("Ошибка создания файла: " + error.message);
        } finally {
            setLoading(false);
        }
    };
    
    const handleAttachLink = (url: string) => { setContent(prev => `${prev}\n[Ссылка](${url})`.trim()); }

    const ActionButton = ({ icon, label, action, disabled = false, loadingState }: { icon: React.ReactNode, label: string, action: () => void, disabled?: boolean, loadingState?: boolean }) => (
        <button type="button" onClick={() => { if (!disabled && !loadingState) { action(); setIsActionMenuOpen(false); } }} className="w-full text-left flex items-center p-2 rounded-md text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50" disabled={disabled || loadingState}>
            <div className="w-6 text-center">{loadingState ? <Spinner size="sm"/> : icon}</div>
            <span className="ml-3">{label}</span>
        </button>
    );
    
    const selectedContacts = contacts.filter(c => contactIds.includes(c.id));

    return (
        <div className="relative" ref={actionMenuRef}>
            <input type="file" multiple ref={fileInputRef} onChange={handleFilesSelected} className="hidden" />
            <input type="file" accept="image/*" capture="environment" ref={imageInputRef} onChange={handleFilesSelected} className="hidden" />

            <div className="bg-white p-2 rounded-lg border border-slate-300 focus-within:ring-2 focus-within:ring-blue-500">
                {quotedEvent && (
                    <div className="p-2 mb-2 bg-slate-100 rounded-md text-sm relative border-l-4 border-blue-400">
                        <p className="font-semibold text-slate-700">Ответ на: {quotedEvent.author_email}</p>
                        <p className="truncate text-slate-600">{quotedEvent.content}</p>
                        <button onClick={onClearQuote} className="absolute top-1.5 right-1.5 p-1 rounded-full hover:bg-slate-200"><FaTimes size={12}/></button>
                    </div>
                )}
                <form onSubmit={handleSubmit} className="flex items-end gap-2">
                    <div className="relative">
                        <button type="button" onClick={() => setIsActionMenuOpen(p => !p)} className="action-btn flex-shrink-0"><FaPlus /></button>
                        {isActionMenuOpen && (
                             <div className="absolute bottom-full left-0 mb-2 w-60 bg-white rounded-lg shadow-lg border p-2 z-10">
                                <ActionButton icon={<FaPaperclip />} label="Файл с устройства" action={() => fileInputRef.current?.click()} />
                                <ActionButton icon={<FaCamera />} label="Сделать фото" action={() => imageInputRef.current?.click()} />
                                <ActionButton icon={<FaLink />} label="Прикрепить ссылку" action={() => setIsLinkModalOpen(true)} />
                                <ActionButton icon={<FaVideo />} label="Записать аудио" action={() => setIsAudioModalOpen(true)} />
                                {providerToken && <>
                                    <ActionButton icon={<FaGoogleDrive />} label="Файл с Google Drive" action={openPicker} />
                                    <div className="my-1 border-t"></div>
                                    <ActionButton icon={<FaFileAlt/>} label="Новый Google Doc" action={() => handleCreateGoogleFile('doc')} loadingState={loading === 'google-doc'} />
                                    <ActionButton icon={<FaFileAlt/>} label="Новая Google Sheet" action={() => handleCreateGoogleFile('sheet')} loadingState={loading === 'google-sheet'} />
                                </>}
                                <div className="my-1 border-t"></div>
                                <ActionButton icon={<FaTasks />} label="Добавить подзадачу" action={onAddSubTaskRequest} />
                            </div>
                        )}
                    </div>
                    <textarea ref={textareaRef} value={content} onChange={(e) => setContent(e.target.value)} rows={1} placeholder="Напишите комментарий..." disabled={!!loading} className="w-full p-2 border-0 focus:ring-0 resize-none bg-transparent max-h-40" />
                    <div className="relative">
                         <button type="button" onClick={() => setIsContactSelectorOpen(p => !p)} className="action-btn flex-shrink-0"><FaUserPlus /></button>
                         {isContactSelectorOpen && (
                            <div className="absolute bottom-full right-0 mb-2 w-64 bg-white rounded-lg shadow-lg border z-10 p-2 max-h-60 overflow-y-auto">
                                <p className="text-xs font-bold text-slate-500 px-2 pb-1">Отметить участников</p>
                                {contacts.map(c => (
                                    <label key={c.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-100 cursor-pointer">
                                        <input type="checkbox" checked={contactIds.includes(c.id)} onChange={() => setContactIds(p => p.includes(c.id) ? p.filter(id => id !== c.id) : [...p, c.id])} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
                                        <span className="text-sm">{c.name}</span>
                                    </label>
                                ))}
                                 <div className="border-t mt-1 pt-1">
                                    <button type="button" onClick={() => { setIsContactSelectorOpen(false); setIsAddContactModalOpen(true); }} className="w-full text-left flex items-center p-2 rounded-md text-sm text-blue-600 hover:bg-slate-100 font-semibold">
                                        <FaPlus className="mr-2"/> Добавить контакт
                                    </button>
                                </div>
                            </div>
                         )}
                    </div>
                    <button type="submit" disabled={!!loading || (!content.trim() && filesToAttach.length === 0)} className="btn-primary p-2.5 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
                        {loading === true ? <Spinner size="sm" /> : <FaPaperPlane />}
                    </button>
                </form>
            </div>
            {(filesToAttach.length > 0 || selectedContacts.length > 0) && (
                <div className="mt-2 flex flex-wrap gap-2">
                    {filesToAttach.map((file, i) => <div key={`f-${i}`} className="flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1 text-sm"><span className="truncate max-w-xs">{file.name}</span><button type="button" onClick={() => setFilesToAttach(f => f.filter((_, idx) => idx !== i))}><FaTimes size={12} /></button></div>)}
                    {selectedContacts.map(c => <div key={`c-${c.id}`} className="flex items-center gap-2 bg-blue-100 rounded-full px-3 py-1 text-sm"><span className="truncate max-w-xs">{c.name}</span><button type="button" onClick={() => setContactIds(p => p.filter(id => id !== c.id))}><FaTimes size={12} /></button></div>)}
                </div>
            )}
            
            {fileForDrive && providerToken && <UploadToDriveModal isOpen={!!fileForDrive} onClose={() => setFileForDrive(null)} file={fileForDrive} providerToken={providerToken} onUploadComplete={link => setContent(p => `${p}\n[${link.name}](${link.url})`)} />}
            <AttachLinkModal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} onAttach={handleAttachLink} />
            <AudioRecorderModal isOpen={isAudioModalOpen} onClose={() => setIsAudioModalOpen(false)} onSave={(files) => setFilesToAttach(prev => [...prev, ...files])} />
            <AddContactModal 
                isOpen={isAddContactModalOpen}
                onClose={() => setIsAddContactModalOpen(false)}
                project={project}
                onContactAdded={(newContact) => {
                    onContactsUpdate();
                    // Automatically select the newly added contact
                    setContactIds(prev => [...prev, newContact.id]);
                    setIsAddContactModalOpen(false);
                }}
            />
        </div>
    );
};

export default AddEventForm;
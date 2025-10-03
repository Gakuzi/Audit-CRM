import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import { Event, ContactPerson, Project } from '../types';
import { Spinner } from './ui/Spinner';
import AddContactModal from './AddContactModal';
import { FaTimes, FaUserPlus, FaPlus } from 'react-icons/fa';

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  onUpdate: (newContent: string, newContactIds: string[]) => Promise<void>;
  contacts: ContactPerson[];
  project: Project;
  onContactsUpdate: () => void;
}

const EditEventModal: React.FC<EditEventModalProps> = ({ isOpen, onClose, event, onUpdate, contacts, project, onContactsUpdate }) => {
  const [content, setContent] = useState('');
  const [contactIds, setContactIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [isContactSelectorOpen, setIsContactSelectorOpen] = useState(false);

  useEffect(() => {
    if (event) {
      setContent(event.content);
      setContactIds(event.data?.contact_ids || []);
    }
  }, [event, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    try {
        await onUpdate(content, contactIds);
        onClose();
    } catch (error: any) {
        alert("Ошибка обновления: " + error.message)
    } finally {
        setLoading(false);
    }
  };

  const selectedContacts = contacts.filter(c => contactIds.includes(c.id));

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title="Редактировать комментарий">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="eventContent" className="label">Текст комментария</label>
          <textarea id="eventContent" value={content} onChange={(e) => setContent(e.target.value)} className="w-full mt-1 input" rows={6} required autoFocus />
        </div>
         <div>
            <label className="label">Отмеченные участники</label>
            <div className="flex flex-wrap gap-2 mt-2 p-2 border rounded-md min-h-[40px]">
                {selectedContacts.map(c => (
                    <div key={c.id} className="flex items-center gap-2 bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">
                        {c.name}
                        <button type="button" onClick={() => setContactIds(p => p.filter(id => id !== c.id))}><FaTimes size={10}/></button>
                    </div>
                ))}
            </div>
             <div className="relative mt-2">
                 <button type="button" onClick={() => setIsContactSelectorOpen(p => !p)} className="flex items-center gap-2 text-sm btn-secondary"><FaUserPlus /> Добавить/удалить участника</button>
                 {isContactSelectorOpen && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border z-10 p-2 max-h-60 overflow-y-auto">
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
        </div>
        <div className="flex justify-end pt-2 gap-2">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>Отмена</button>
          <button type="submit" disabled={loading || !content.trim()} className="btn-primary w-32 flex justify-center">
            {loading ? <Spinner size="sm" /> : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
     <AddContactModal
        isOpen={isAddContactModalOpen}
        onClose={() => setIsAddContactModalOpen(false)}
        project={project}
        onContactAdded={(newContact) => {
            onContactsUpdate();
            setContactIds(prev => [...prev, newContact.id]);
            setIsAddContactModalOpen(false);
        }}
    />
    </>
  );
};

export default EditEventModal;
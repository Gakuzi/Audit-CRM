// src/components/EditSubTaskModal.tsx
import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import { PlanItem, ContactPerson, Project } from '../types';
import AddContactModal from './AddContactModal';
import { FaTimes } from 'react-icons/fa';

interface EditSubTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  subTask: PlanItem;
  onUpdate: (updatedSubTask: PlanItem) => void;
  contacts: ContactPerson[];
  project: Project;
  onContactsUpdate: () => void;
}

const EditSubTaskModal: React.FC<EditSubTaskModalProps> = ({ isOpen, onClose, subTask, onUpdate, contacts, project, onContactsUpdate }) => {
  const [editedTask, setEditedTask] = useState<PlanItem>(subTask);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEditedTask(subTask);
    }
  }, [isOpen, subTask]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedTask.title.trim()) return;
    onUpdate(editedTask);
    onClose();
  };

  const handleContactToggle = (contactId: string) => {
    if (contactId === '__add_new__') {
      setIsAddContactModalOpen(true);
      return;
    }
    const currentIds = editedTask.data?.contact_ids || [];
    const newIds = currentIds.includes(contactId) ? currentIds.filter(id => id !== contactId) : [...currentIds, contactId];
    setEditedTask(prev => ({ ...prev, data: { ...prev.data, contact_ids: newIds } }));
  };
  
  const selectedContacts = contacts.filter(c => editedTask.data?.contact_ids?.includes(c.id));

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Редактировать подзадачу"
        footer={<>
          <button type="button" onClick={onClose} className="btn-secondary">Отмена</button>
          <button type="submit" form="edit-subtask-form" className="btn-primary">Сохранить</button>
        </>}
      >
        <form id="edit-subtask-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Название</label>
            <textarea
              value={editedTask.title}
              onChange={e => setEditedTask({ ...editedTask, title: e.target.value })}
              className="input"
              rows={2}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label">Описание</label>
            <textarea
              value={editedTask.description || ''}
              onChange={e => setEditedTask({ ...editedTask, description: e.target.value })}
              className="input"
              rows={4}
            />
          </div>
          <div>
            <label className="label">Участники</label>
            <select onChange={e => handleContactToggle(e.target.value)} className="input" value="">
              <option value="" disabled>-- Выберите или добавьте --</option>
              {contacts.filter(c => !editedTask.data?.contact_ids?.includes(c.id)).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              <option value="__add_new__" className="font-bold text-blue-600">+ Добавить новый контакт</option>
            </select>
            <div className="flex flex-wrap gap-2 mt-2">
                {selectedContacts.map(c => (
                    <div key={c.id} className="flex items-center gap-2 bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">
                        {c.name}
                        <button type="button" onClick={() => handleContactToggle(c.id)}><FaTimes size={10}/></button>
                    </div>
                ))}
            </div>
          </div>
        </form>
      </Modal>
      <AddContactModal
        isOpen={isAddContactModalOpen}
        onClose={() => setIsAddContactModalOpen(false)}
        project={project}
        onContactAdded={(newContact) => {
            onContactsUpdate();
            // Automatically select the newly added contact
            handleContactToggle(newContact.id);
            setIsAddContactModalOpen(false);
        }}
      />
    </>
  );
};

export default EditSubTaskModal;
// src/components/AddContactModal.tsx
import React, { useState } from 'react';
import Modal from './ui/Modal';
import { Spinner } from './ui/Spinner';
import { supabase } from '../services/supabaseClient';
import { Project, ContactPerson } from '../types';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onContactAdded: (newContact: ContactPerson) => void;
}

const AddContactModal: React.FC<AddContactModalProps> = ({ isOpen, onClose, project, onContactAdded }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setName(''); setRole(''); setEmail(''); setPhone('');
    setError(''); setLoading(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim()) return;
    setLoading(true);
    setError('');

    try {
      const { data: companyProfile, error: fetchError } = await supabase
        .from('company_profiles')
        .select('contacts')
        .eq('project_id', project.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      const newContact: ContactPerson = {
        id: crypto.randomUUID(),
        name: name.trim(),
        role: role.trim(),
        email: email.trim(),
        phone: phone.trim(),
      };

      const existingContacts = companyProfile?.contacts || [];
      const updatedContacts = [...existingContacts, newContact];

      const { error: upsertError } = await supabase
        .from('company_profiles')
        .upsert({
          project_id: project.id,
          contacts: updatedContacts,
          company_name: project.name, // Ensure company_name is present
          updated_at: new Date().toISOString(),
        }, { onConflict: 'project_id' });

      if (upsertError) throw upsertError;

      onContactAdded(newContact);
      handleClose();
    } catch (err: any) {
      setError('Ошибка добавления контакта: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Добавить новый контакт"
      footer={<>
        <button type="button" onClick={handleClose} className="btn-secondary" disabled={loading}>Отмена</button>
        <button type="submit" form="add-contact-form" className="btn-primary" disabled={loading || !name.trim() || !role.trim()}>
          {loading ? <Spinner size="sm" /> : 'Добавить'}
        </button>
      </>}
    >
      <form id="add-contact-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div>
          <label className="label">ФИО</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" required autoFocus />
        </div>
        <div>
          <label className="label">Должность</label>
          <input type="text" value={role} onChange={e => setRole(e.target.value)} className="input" required />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Телефон</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="input" />
        </div>
      </form>
    </Modal>
  );
};

export default AddContactModal;

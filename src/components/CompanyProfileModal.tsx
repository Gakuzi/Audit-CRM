import React, { useState, useEffect, useCallback } from 'react';
import Modal from './ui/Modal';
import { Project, CompanyProfile, ContactPerson } from '../types';
import { supabase } from '../services/supabaseClient';
import { Spinner } from './ui/Spinner';
import { FaEdit, FaSave, FaTimes, FaPlus, FaTrash, FaPhone, FaEnvelope, FaWhatsapp, FaTelegramPlane } from 'react-icons/fa';

interface CompanyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  isAuditor: boolean;
}

const CompanyProfileModal: React.FC<CompanyProfileModalProps> = ({ isOpen, onClose, project, isAuditor }) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Partial<CompanyProfile>>({
      company_name: project.name,
      address: '',
      contacts: [],
  });
  const [isEditing, setIsEditing] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('project_id', project.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching company profile:', error);
    } else if (data) {
      setProfile(data);
    } else {
      // If no profile exists, initialize with project name
      setProfile({ company_name: project.name, address: '', contacts: [] });
    }
    setLoading(false);
  }, [project.id, project.name]);

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
      setIsEditing(false); // Reset editing state on open
    }
  }, [isOpen, fetchProfile]);
  
  const handleSave = async () => {
      setLoading(true);
      const profileToSave = {
          ...profile,
          project_id: project.id,
          updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from('company_profiles').upsert(profileToSave, { onConflict: 'project_id'});
      
      if (error) {
          alert("Ошибка сохранения: " + error.message);
      } else {
          setIsEditing(false);
      }
      setLoading(false);
  }

  const handleContactChange = (index: number, field: keyof ContactPerson, value: string) => {
      const newContacts = [...(profile.contacts || [])];
      newContacts[index] = { ...newContacts[index], [field]: value };
      setProfile(prev => ({ ...prev, contacts: newContacts }));
  };
  
  const addContact = () => {
      const newContact: ContactPerson = { id: crypto.randomUUID(), name: '', role: '', email: '', phone: '' };
      setProfile(prev => ({ ...prev, contacts: [...(prev.contacts || []), newContact] }));
  };

  const removeContact = (index: number) => {
      setProfile(prev => ({ ...prev, contacts: prev.contacts?.filter((_, i) => i !== index) }));
  }
  
  const ActionButton: React.FC<{ href: string, icon: React.ReactNode, colorClass: string, title: string }> = ({ href, icon, colorClass, title }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" title={title} className={`p-2 rounded-full hover:bg-gray-200 ${colorClass}`}>
        {icon}
    </a>
  );

  const renderView = () => (
      <div className="space-y-4">
          <div>
              <h4 className="text-sm font-semibold text-gray-500">Адрес</h4>
              <p>{profile.address || 'Не указан'}</p>
          </div>
          <div>
              <h4 className="text-sm font-semibold text-gray-500">Контактные лица</h4>
              {profile.contacts && profile.contacts.length > 0 ? (
                  <div className="mt-2 space-y-3">
                      {profile.contacts.map(contact => (
                           <div key={contact.id} className="p-3 border rounded-md">
                               <p className="font-bold">{contact.name} <span className="text-sm font-normal text-gray-600">- {contact.role}</span></p>
                               {contact.email && <p className="text-sm">Email: <a href={`mailto:${contact.email}`} className="text-blue-600">{contact.email}</a></p>}
                               {contact.phone && <p className="text-sm">Тел: <a href={`tel:${contact.phone}`} className="text-blue-600">{contact.phone}</a></p>}
                               <div className="mt-2 flex items-center space-x-2">
                                    {contact.phone && <ActionButton href={`tel:${contact.phone}`} icon={<FaPhone />} colorClass="text-gray-600" title="Позвонить" />}
                                    {contact.email && <ActionButton href={`mailto:${contact.email}`} icon={<FaEnvelope />} colorClass="text-blue-600" title="Написать Email" />}
                                    {contact.phone && <ActionButton href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`} icon={<FaWhatsapp />} colorClass="text-green-500" title="Написать в WhatsApp" />}
                                    {contact.email && <ActionButton href={`https://t.me/share/url?url=&text=Здравствуйте, ${contact.name}!`} icon={<FaTelegramPlane />} colorClass="text-sky-500" title="Написать в Telegram" />}
                               </div>
                           </div>
                      ))}
                  </div>
              ) : <p className="text-sm text-gray-500">Контакты не добавлены.</p>}
          </div>
      </div>
  );

  const renderEdit = () => (
      <div className="space-y-4">
          <div>
              <label className="block text-sm font-medium text-gray-700">Название компании</label>
              <input type="text" value={profile.company_name || ''} onChange={e => setProfile(p => ({ ...p, company_name: e.target.value }))} className="w-full mt-1 input"/>
          </div>
          <div>
              <label className="block text-sm font-medium text-gray-700">Адрес</label>
              <textarea value={profile.address || ''} onChange={e => setProfile(p => ({ ...p, address: e.target.value }))} className="w-full mt-1 input" rows={2}/>
          </div>
          <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Контактные лица</h4>
              <div className="space-y-3">
                {(profile.contacts || []).map((contact, index) => (
                    <div key={contact.id} className="p-3 border rounded-md bg-gray-50 relative">
                        <button type="button" onClick={() => removeContact(index)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500"><FaTrash size={12}/></button>
                        <div className="grid grid-cols-2 gap-2">
                             <input type="text" placeholder="ФИО" value={contact.name} onChange={e => handleContactChange(index, 'name', e.target.value)} className="input text-sm col-span-2"/>
                             <input type="text" placeholder="Должность" value={contact.role} onChange={e => handleContactChange(index, 'role', e.target.value)} className="input text-sm"/>
                             <input type="text" placeholder="Телефон" value={contact.phone} onChange={e => handleContactChange(index, 'phone', e.target.value)} className="input text-sm"/>
                             <input type="email" placeholder="Email" value={contact.email} onChange={e => handleContactChange(index, 'email', e.target.value)} className="input text-sm col-span-2"/>
                        </div>
                    </div>
                ))}
              </div>
              <button type="button" onClick={addContact} className="mt-3 text-sm flex items-center btn-secondary"><FaPlus className="mr-2"/> Добавить контакт</button>
          </div>
      </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={profile.company_name || 'Профиль компании'}>
        <div className="max-h-[70vh] overflow-y-auto pr-2">
            {loading ? <Spinner /> : (isEditing ? renderEdit() : renderView())}
        </div>
        {isAuditor && (
             <div className="mt-6 pt-4 border-t flex justify-end">
                {isEditing ? (
                    <div className="flex gap-2">
                        <button onClick={() => setIsEditing(false)} className="btn-secondary">Отмена</button>
                        <button onClick={handleSave} disabled={loading} className="btn-primary w-28 flex items-center justify-center gap-2">
                            {loading ? <Spinner size="sm"/> : <><FaSave/> Сохранить</>}
                        </button>
                    </div>
                ) : (
                    <button onClick={() => setIsEditing(true)} className="btn-primary flex items-center gap-2">
                        <FaEdit /> Редактировать
                    </button>
                )}
            </div>
        )}
    </Modal>
  );
};

export default CompanyProfileModal;

import React, { useState, useEffect, useCallback } from 'react';
import Modal from './ui/Modal';
import { Project, CompanyProfile, ContactPerson } from '../types';
import { supabase } from '../services/supabaseClient';
import { Spinner } from './ui/Spinner';
import { FaEdit, FaSave, FaPlus, FaTrash, FaPhone, FaEnvelope, FaWhatsapp, FaTelegramPlane, FaShareAlt, FaUser } from 'react-icons/fa';
import ApprovalShareModal from './ApprovalShareModal';

interface CompanyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  isAuditor: boolean;
}

const ContactCard: React.FC<{ contact: ContactPerson; onShare: () => void; isAuditor: boolean; }> = ({ contact, onShare, isAuditor }) => {
    return (
        <div className="p-3 border rounded-md bg-gray-50 flex gap-4">
            <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <FaUser className="text-blue-500 text-xl" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-bold text-gray-800 truncate">{contact.name}</p>
                        <p className="text-sm text-gray-600 truncate">{contact.role}</p>
                    </div>
                    {isAuditor && <button onClick={onShare} title="Поделиться доступом" className="action-btn text-blue-600"><FaShareAlt /></button>}
                </div>
                <div className="mt-2 flex items-center space-x-3">
                    {contact.phone && <a href={`tel:${contact.phone}`} className="action-btn" title={contact.phone}><FaPhone /></a>}
                    {contact.email && <a href={`mailto:${contact.email}`} className="action-btn" title={contact.email}><FaEnvelope /></a>}
                    {contact.whatsapp && <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="action-btn text-green-500" title="WhatsApp"><FaWhatsapp /></a>}
                    {contact.telegram && <a href={`https://t.me/${contact.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="action-btn text-sky-500" title="Telegram"><FaTelegramPlane /></a>}
                </div>
            </div>
        </div>
    );
};

const CompanyProfileModal: React.FC<CompanyProfileModalProps> = ({ isOpen, onClose, project, isAuditor }) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Partial<CompanyProfile>>({ company_name: project.name, address: '', contacts: [] });
  const [isEditing, setIsEditing] = useState(false);
  const [contactToShare, setContactToShare] = useState<ContactPerson | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('company_profiles').select('*').eq('project_id', project.id).single();
    if (error && error.code !== 'PGRST116') console.error('Error fetching company profile:', error);
    else if (data) setProfile(data);
    else setProfile({ company_name: project.name, address: '', contacts: [] });
    setLoading(false);
  }, [project.id, project.name]);

  useEffect(() => { if (isOpen) { fetchProfile(); setIsEditing(false); setSearchTerm(''); } }, [isOpen, fetchProfile]);
  
  const handleSave = async () => {
      setLoading(true);
      const profileToSave = { ...profile, project_id: project.id, updated_at: new Date().toISOString() };
      const { error } = await supabase.from('company_profiles').upsert(profileToSave, { onConflict: 'project_id'});
      if (error) alert("Ошибка сохранения: " + error.message);
      else setIsEditing(false);
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

  const filteredContacts = (profile.contacts || []).filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderView = () => (
      <div className="space-y-4">
          <div>
              <label className="label">Адрес</label>
              <p>{profile.address || 'Не указан'}</p>
          </div>
          <div>
              <label className="label">Контактные лица</label>
              <input type="text" placeholder="Поиск по контактам..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full input mt-1 mb-3" />
              {filteredContacts.length > 0 ? (
                  <div className="space-y-3">
                      {filteredContacts.map(contact => (
                           <ContactCard key={contact.id} contact={contact} onShare={() => setContactToShare(contact)} isAuditor={isAuditor}/>
                      ))}
                  </div>
              ) : <p className="text-sm text-gray-500 text-center py-4">Контакты не найдены.</p>}
          </div>
      </div>
  );

  const renderEdit = () => (
      <div className="space-y-4">
          <div>
              <label className="label">Название компании</label>
              <input type="text" value={profile.company_name || ''} onChange={e => setProfile(p => ({ ...p, company_name: e.target.value }))} className="w-full mt-1 input"/>
          </div>
          <div>
              <label className="label">Адрес</label>
              <textarea value={profile.address || ''} onChange={e => setProfile(p => ({ ...p, address: e.target.value }))} className="w-full mt-1 input" rows={2}/>
          </div>
          <div>
              <h4 className="label mb-2">Контактные лица</h4>
              <div className="space-y-3">
                {(profile.contacts || []).map((contact, index) => (
                    <div key={contact.id} className="p-3 border rounded-md bg-gray-50 relative">
                        <button type="button" onClick={() => removeContact(index)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500"><FaTrash size={12}/></button>
                        <div className="grid grid-cols-2 gap-2">
                             <input type="text" placeholder="ФИО" value={contact.name} onChange={e => handleContactChange(index, 'name', e.target.value)} className="input text-sm col-span-2"/>
                             <input type="text" placeholder="Должность" value={contact.role} onChange={e => handleContactChange(index, 'role', e.target.value)} className="input text-sm"/>
                             <input type="tel" placeholder="Телефон" value={contact.phone} onChange={e => handleContactChange(index, 'phone', e.target.value)} className="input text-sm"/>
                             <input type="email" placeholder="Email" value={contact.email} onChange={e => handleContactChange(index, 'email', e.target.value)} className="input text-sm col-span-2"/>
                             <input type="text" placeholder="WhatsApp (номер)" value={contact.whatsapp || ''} onChange={e => handleContactChange(index, 'whatsapp', e.target.value)} className="input text-sm" />
                             <input type="text" placeholder="Telegram (@username)" value={contact.telegram || ''} onChange={e => handleContactChange(index, 'telegram', e.target.value)} className="input text-sm" />
                        </div>
                    </div>
                ))}
              </div>
              <button type="button" onClick={addContact} className="mt-3 text-sm flex items-center btn-secondary"><FaPlus className="mr-2"/> Добавить контакт</button>
          </div>
      </div>
  );

  return (
    <>
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Редактирование профиля' : (profile.company_name || 'Профиль компании')}>
            <div className="min-h-[300px]">
                {loading ? <div className="flex justify-center items-center h-full"><Spinner /></div> : (isEditing ? renderEdit() : renderView())}
            </div>
            {isAuditor && (
                 <div className="mt-6 pt-4 border-t flex justify-end">
                    {isEditing ? (
                        <div className="flex gap-2">
                            <button onClick={() => { setIsEditing(false); fetchProfile(); }} className="btn-secondary">Отмена</button>
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
        {contactToShare && (
            <ApprovalShareModal
                isOpen={!!contactToShare}
                onClose={() => setContactToShare(null)}
                project={project}
                contact={contactToShare}
            />
        )}
    </>
  );
};

export default CompanyProfileModal;

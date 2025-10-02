import React, { useState, useEffect, useCallback } from 'react';
import Modal from './ui/Modal';
import { Project, CompanyProfile, ContactPerson, ContactMethod } from '../types';
import { supabase } from '../services/supabaseClient';
import { Spinner } from './ui/Spinner';
import { FaEdit, FaSave, FaPlus, FaTrash, FaPhone, FaEnvelope, FaWhatsapp, FaTelegramPlane, FaShareAlt } from 'react-icons/fa';

interface CompanyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  isAuditor: boolean;
}

const contactMethods: { value: ContactMethod, label: string }[] = [
    { value: 'telegram', label: 'Telegram' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Телефон' },
];

const formatPhoneNumberForLink = (phone: string | undefined): string => {
    if (!phone) return '';
    let digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && (digits.startsWith('8') || digits.startsWith('7'))) {
        digits = '7' + digits.substring(1);
    }
    return digits;
};


const CompanyProfileModal: React.FC<CompanyProfileModalProps> = ({ isOpen, onClose, project, isAuditor }) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Partial<CompanyProfile>>({
      company_name: project.name,
      address: '',
      contacts: [],
  });
  const [isEditing, setIsEditing] = useState(false);
  const [shareContact, setShareContact] = useState<ContactPerson | null>(null);

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
      setProfile({ company_name: project.name, address: '', contacts: [] });
    }
    setLoading(false);
  }, [project.id, project.name]);

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
      setIsEditing(false);
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

  const handleContactChange = (index: number, field: keyof ContactPerson, value: string | boolean) => {
      let newContacts = [...(profile.contacts || [])];
      
      if (field === 'priority_contact_method') {
          const newMethod = value === 'none' ? null : value as ContactMethod;
          newContacts = newContacts.map((contact, i) => ({
              ...contact,
              priority_contact_method: i === index ? newMethod : contact.priority_contact_method
          }));
      } else {
        const newContact = { ...newContacts[index], [field]: value };
        newContacts = newContacts.map((contact, i) => i === index ? newContact : contact);
      }
      
      setProfile(prev => ({ ...prev, contacts: newContacts }));
  };
  
  const addContact = () => {
      const newContact: ContactPerson = { id: crypto.randomUUID(), name: '', role: '', email: '', phone: '', telegram: '', whatsapp: '', priority_contact_method: null };
      setProfile(prev => ({ ...prev, contacts: [...(prev.contacts || []), newContact] }));
  };

  const removeContact = (index: number) => {
      setProfile(prev => ({ ...prev, contacts: prev.contacts?.filter((_, i) => i !== index) }));
  }
  
  const ActionButton: React.FC<{ href?: string, icon: React.ReactNode, colorClass: string, title: string, onClick?: () => void }> = ({ href, icon, colorClass, title, onClick }) => {
    if (href) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" title={title} className={`p-2 rounded-full hover:bg-gray-200 ${colorClass}`}>
                {icon}
            </a>
        );
    }
    return (
        <button onClick={onClick} title={title} className={`p-2 rounded-full hover:bg-gray-200 ${colorClass}`}>
            {icon}
        </button>
    );
  };

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
                      {profile.contacts.map(contact => {
                           const formattedPhone = formatPhoneNumberForLink(contact.phone);
                           const formattedWhatsapp = formatPhoneNumberForLink(contact.whatsapp || contact.phone);
                           return (
                               <div key={contact.id} className="p-3 border rounded-md relative">
                                   {contact.priority_contact_method && <span className="absolute top-2 right-2 text-xs bg-yellow-200 text-yellow-800 font-bold py-0.5 px-2 rounded-full">Приоритетный</span>}
                                   <p className="font-bold">{contact.name} <span className="text-sm font-normal text-gray-600">- {contact.role}</span></p>
                                   <div className="mt-2 flex items-center space-x-2">
                                        {formattedPhone && <ActionButton href={`tel:${formattedPhone}`} icon={<FaPhone />} colorClass="text-gray-600" title="Позвонить" />}
                                        {contact.email && <ActionButton href={`mailto:${contact.email}`} icon={<FaEnvelope />} colorClass="text-blue-600" title="Написать Email" />}
                                        {formattedWhatsapp && <ActionButton href={`https://wa.me/${formattedWhatsapp}`} icon={<FaWhatsapp />} colorClass="text-green-500" title="Написать в WhatsApp" />}
                                        {contact.telegram && <ActionButton href={`https://t.me/${contact.telegram.replace('@', '')}`} icon={<FaTelegramPlane />} colorClass="text-sky-500" title="Написать в Telegram" />}
                                        {isAuditor && <ActionButton onClick={() => setShareContact(contact)} icon={<FaShareAlt />} colorClass="text-gray-600" title="Поделиться персональной ссылкой" />}
                                   </div>
                               </div>
                           )
                       })}
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
                             <input type="text" placeholder="WhatsApp (с кодом)" value={contact.whatsapp || ''} onChange={e => handleContactChange(index, 'whatsapp', e.target.value)} className="input text-sm col-span-1"/>
                             <input type="text" placeholder="Telegram @username" value={contact.telegram || ''} onChange={e => handleContactChange(index, 'telegram', e.target.value)} className="input text-sm col-span-1"/>
                             <div className="col-span-2 mt-1">
                                <label htmlFor={`priority-method-${contact.id}`} className="text-xs font-medium text-gray-600">Приоритетный способ связи</label>
                                <select 
                                    id={`priority-method-${contact.id}`}
                                    value={contact.priority_contact_method || 'none'}
                                    onChange={e => handleContactChange(index, 'priority_contact_method', e.target.value)}
                                    className="w-full input text-sm mt-1"
                                >
                                    <option value="none">Нет</option>
                                    {contactMethods.map(method => (
                                        <option key={method.value} value={method.value}>{method.label}</option>
                                    ))}
                                </select>
                             </div>
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
        <Modal isOpen={isOpen} onClose={onClose} title={profile.company_name || 'Профиль компании'}>
            <div className="max-h-[70vh] overflow-y-auto pr-2">
                {loading ? <Spinner /> : (isEditing ? renderEdit() : renderView())}
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
        {shareContact && isAuditor && <ContactShareModal contact={shareContact} project={project} onClose={() => setShareContact(null)} />}
    </>
  );
};


// Inner modal for sharing specific contact link
interface ContactShareModalProps {
    contact: ContactPerson;
    project: Project;
    onClose: () => void;
}
const ContactShareModal: React.FC<ContactShareModalProps> = ({ contact, project, onClose }) => {
    const [copied, setCopied] = useState(false);
    const shareUrl = `${window.location.origin}${window.location.pathname}#/${project.id}?contactId=${contact.id}`;
    const shareText = `Здравствуйте, ${contact.name}!\n\nСсылка для гостевого доступа к аудиту «${project.name}».\n\nВНИМАНИЕ: Эта ссылка — как ключ от кабинета. Любой, у кого она есть, сможет комментировать и планировать встречи от вашего имени.\n\n${shareUrl}`;
    
    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Ссылка для ${contact.name}`}>
            <p className="text-sm text-gray-600 mb-4">Отправьте эту персональную ссылку. Пользователь будет автоматически идентифицирован в системе.</p>
             <div className="flex items-center space-x-2">
                <input type="text" readOnly value={shareUrl} className="w-full p-2 border rounded bg-gray-100" />
                <button onClick={handleCopy} className={`p-2 rounded-md text-white ${copied ? 'bg-green-500' : 'bg-blue-600 hover:bg-blue-700'}`}><FaShareAlt /></button>
            </div>
            {copied && <p className="text-xs text-green-600 mt-1">Ссылка скопирована!</p>}
             <div className="mt-4 pt-4 border-t flex items-center space-x-2">
                <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center py-2 px-4 rounded-md bg-green-500 text-white hover:bg-green-600"><FaWhatsapp className="mr-2" /> WhatsApp</a>
                <a href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center py-2 px-4 rounded-md bg-sky-500 text-white hover:bg-sky-600"><FaTelegramPlane className="mr-2" /> Telegram</a>
            </div>
        </Modal>
    )
}


export default CompanyProfileModal;
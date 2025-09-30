import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import Modal from './ui/Modal';
import { supabase } from '../services/supabaseClient';
import { Profile } from '../types';
import { Spinner } from './ui/Spinner';
import { FaQuestionCircle } from 'react-icons/fa';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSignOut: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user, onSignOut }) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [isHelpVisible, setIsHelpVisible] = useState(false);
  
  const getProfile = useCallback(async () => {
      setLoading(true);
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error && error.code !== 'PGRST116') {
          console.error(error);
      } else if (data) {
          setProfile(data);
      }
      setLoading(false);
  }, [user.id]);

  useEffect(() => {
    if (isOpen) {
        getProfile();
    }
  }, [isOpen, getProfile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      const updates = {
          id: user.id,
          full_name: profile.full_name,
          phone: profile.phone,
          whatsapp: profile.whatsapp,
          telegram: profile.telegram,
          telegram_bot_token: profile.telegram_bot_token,
          telegram_chat_id: profile.telegram_chat_id,
          updated_at: new Date(),
      };
      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) {
          alert('Ошибка обновления профиля: ' + error.message);
      } else {
          onClose();
      }
      setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setProfile({...profile, [e.target.name]: e.target.value});
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Настройки профиля">
      {loading ? <Spinner /> : (
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Email (нельзя изменить)</p>
              <p className="text-lg text-gray-800 bg-gray-100 p-2 rounded-md">{user.email}</p>
            </div>
             <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">ФИО</label>
              <input id="full_name" name="full_name" type="text" value={profile.full_name || ''} onChange={handleChange} className="w-full mt-1 input" />
            </div>
             <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Телефон</label>
              <input id="phone" name="phone" type="tel" value={profile.phone || ''} onChange={handleChange} className="w-full mt-1 input" placeholder="+79991234567" />
            </div>
            <div>
              <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700">WhatsApp</label>
              <input id="whatsapp" name="whatsapp" type="text" value={profile.whatsapp || ''} onChange={handleChange} className="w-full mt-1 input" placeholder="Номер телефона, привязанный к WhatsApp" />
            </div>
             <div>
              <label htmlFor="telegram" className="block text-sm font-medium text-gray-700">Telegram</label>
              <input id="telegram" name="telegram" type="text" value={profile.telegram || ''} onChange={handleChange} className="w-full mt-1 input" placeholder="@username" />
            </div>
            
            <div className="pt-4 mt-4 border-t">
                 <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">Уведомления в Telegram</h3>
                    <button type="button" onClick={() => setIsHelpVisible(!isHelpVisible)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm">
                        <FaQuestionCircle />
                        <span>Инструкция</span>
                    </button>
                 </div>
                 {isHelpVisible && (
                     <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700 space-y-3">
                         <p>Чтобы получать мгновенные уведомления о новых событиях в проектах, настройте своего Telegram-бота:</p>
                         <ol className="list-decimal list-inside space-y-2">
                             <li>
                                 <b>Получите токен бота:</b> Откройте Telegram, найдите бота <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline">@BotFather</a>, отправьте ему команду `/newbot`, следуйте инструкциям и скопируйте полученный токен API.
                                 <img src="https://i.imgur.com/s82Fv2N.png" alt="BotFather example" className="mt-1 rounded border"/>
                             </li>
                             <li>
                                 <b>Получите ID чата:</b> Найдите бота <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline">@userinfobot</a>, запустите его, и он сразу пришлет вам ваш `Id` (это и есть ID чата).
                                 <img src="https://i.imgur.com/fLg3gS8.png" alt="userinfobot example" className="mt-1 rounded border"/>
                             </li>
                              <li>
                                 <b>Важно:</b> После получения токена, найдите вашего созданного бота в поиске Telegram и нажмите "Start" или "Запустить", чтобы он мог отправлять вам сообщения.
                             </li>
                         </ol>
                     </div>
                 )}
                <div className="mt-4">
                    <label htmlFor="telegram_bot_token" className="block text-sm font-medium text-gray-700">Токен Telegram бота</label>
                    <textarea id="telegram_bot_token" name="telegram_bot_token" value={profile.telegram_bot_token || ''} onChange={handleChange} className="w-full mt-1 input" rows={2} placeholder="Вставьте сюда токен, полученный от @BotFather" />
                </div>
                 <div>
                    <label htmlFor="telegram_chat_id" className="block text-sm font-medium text-gray-700">ID чата</label>
                    <input id="telegram_chat_id" name="telegram_chat_id" type="text" value={profile.telegram_chat_id || ''} onChange={handleChange} className="w-full mt-1 input" placeholder="Вставьте сюда ID, полученный от @userinfobot" />
                </div>
            </div>

            <div className="pt-2 flex justify-between items-center">
                 <button type="submit" disabled={loading} className="py-2 px-4 btn-primary">
                    {loading ? <Spinner size="sm" /> : 'Сохранить'}
                </button>
                 <button type="button" onClick={onSignOut} className="py-2 px-4 btn-secondary bg-red-500 hover:bg-red-600 text-white">
                    Выйти
                </button>
            </div>
          </form>
      )}
    </Modal>
  );
};

export default ProfileModal;

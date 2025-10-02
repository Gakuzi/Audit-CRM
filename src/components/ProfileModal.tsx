// src/components/ProfileModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import Modal from './ui/Modal';
import { supabase } from '../services/supabaseClient';
import { Profile } from '../types';
import { Spinner } from './ui/Spinner';
import { FaQuestionCircle, FaGoogle } from 'react-icons/fa';

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
      if (error && error.code !== 'PGRST116') console.error(error);
      else if (data) setProfile(data);
      setLoading(false);
  }, [user.id]);

  useEffect(() => { if (isOpen) getProfile(); }, [isOpen, getProfile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      const { error } = await supabase.from('profiles').upsert({ id: user.id, ...profile, updated_at: new Date() });
      if (error) alert('Ошибка обновления профиля: ' + error.message);
      else onClose();
      setLoading(false);
  };

  const handleConnectGoogle = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            scopes: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/documents',
        },
    });
    setLoading(false);
  };
  
  const googleIdentity = user.identities?.find(id => id.provider === 'google');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Настройки профиля">
      {loading ? <Spinner /> : (
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Email (нельзя изменить)</p>
              <p className="text-lg bg-gray-100 p-2 rounded-md">{user.email}</p>
            </div>
             <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">ФИО</label>
              <input id="full_name" name="full_name" type="text" value={profile.full_name || ''} onChange={e => setProfile({...profile, full_name: e.target.value})} className="w-full mt-1 input" />
            </div>
            
            <div className="pt-4 mt-4 border-t">
                <h3 className="text-lg font-semibold text-gray-800">Интеграции</h3>
                <div className="mt-2 p-3 border rounded-md">
                    {googleIdentity ? (
                        <div className="flex items-center gap-3">
                            <FaGoogle className="text-green-500 text-xl"/>
                            <div>
                                <p className="font-semibold">Google Аккаунт подключен</p>
                                <p className="text-sm text-gray-600">{user.user_metadata.email}</p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <p className="text-sm mb-2">Подключите аккаунт Google для загрузки больших файлов, создания встреч и экспорта отчетов.</p>
                            <button type="button" onClick={handleConnectGoogle} className="w-full flex justify-center items-center gap-3 py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                                <FaGoogle /> Подключить Google Аккаунт
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-4 mt-4 border-t">
                 <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">Уведомления в Telegram</h3>
                    <button type="button" onClick={() => setIsHelpVisible(!isHelpVisible)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"><FaQuestionCircle /> Инструкция</button>
                 </div>
                 {isHelpVisible && (
                     <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700 space-y-2">
                         <p>Чтобы получать мгновенные уведомления, настройте Telegram-бота:</p>
                         <ol className="list-decimal list-inside space-y-1">
                             <li>Найдите <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600">@BotFather</a>, создайте нового бота (`/newbot`) и скопируйте токен.</li>
                             <li>Найдите <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600">@userinfobot</a>, запустите его и скопируйте ваш `Id` (ID чата).</li>
                             <li>Не забудьте запустить вашего созданного бота в Telegram, нажав "Start".</li>
                         </ol>
                     </div>
                 )}
                <div className="mt-4">
                    <label htmlFor="telegram_bot_token" className="block text-sm font-medium text-gray-700">Токен Telegram бота</label>
                    <textarea id="telegram_bot_token" name="telegram_bot_token" value={profile.telegram_bot_token || ''} onChange={e => setProfile({...profile, telegram_bot_token: e.target.value})} className="w-full mt-1 input" rows={2}/>
                </div>
                 <div>
                    <label htmlFor="telegram_chat_id" className="block text-sm font-medium text-gray-700">ID чата</label>
                    <input id="telegram_chat_id" name="telegram_chat_id" type="text" value={profile.telegram_chat_id || ''} onChange={e => setProfile({...profile, telegram_chat_id: e.target.value})} className="w-full mt-1 input" />
                </div>
            </div>

            <div className="pt-2 flex justify-between items-center">
                 <button type="submit" disabled={loading} className="py-2 px-4 btn-primary">{loading ? <Spinner size="sm" /> : 'Сохранить'}</button>
                 <button type="button" onClick={onSignOut} className="py-2 px-4 btn-secondary bg-red-500 hover:bg-red-600 text-white">Выйти</button>
            </div>
          </form>
      )}
    </Modal>
  );
};

export default ProfileModal;

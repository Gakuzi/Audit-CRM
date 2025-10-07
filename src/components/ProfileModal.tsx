import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import Modal from './ui/Modal';
import { supabase } from '../services/supabaseClient';
import { Profile } from '../types';
import { Spinner } from './ui/Spinner';
import { FaQuestionCircle, FaGoogle } from 'react-icons/fa';
import * as googleApiService from '../services/googleApiService';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSignOut: () => void;
  providerToken: string | null;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user, onSignOut, providerToken }) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [isHelpVisible, setIsHelpVisible] = useState(false);
  const [calendars, setCalendars] = useState<{ id: string, summary: string }[]>([]);
  const [calendarsLoading, setCalendarsLoading] = useState(false);
  
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

  const fetchCalendars = useCallback(async () => {
    if (providerToken) {
        setCalendarsLoading(true);
        try {
            const calendarList = await googleApiService.getCalendarList(providerToken);
            setCalendars(calendarList.map(c => ({ id: c.id, summary: c.summary })));
        } catch (error) {
            console.error("Failed to fetch Google Calendars:", error);
        } finally {
            setCalendarsLoading(false);
        }
    }
  }, [providerToken]);

  useEffect(() => {
    if (isOpen) {
        getProfile();
        fetchCalendars();
    }
  }, [isOpen, getProfile, fetchCalendars]);

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
          google_calendar_id: profile.google_calendar_id,
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setProfile({...profile, [e.target.name]: e.target.value});
  }

  const handleCreateCalendar = async () => {
      const calendarName = prompt("Введите название нового календаря:", `Аудит & Проект`);
      if (calendarName && providerToken) {
          setLoading(true);
          try {
              const newCalendar = await googleApiService.createCalendar(providerToken, calendarName);
              await fetchCalendars(); // Refresh list
              setProfile(p => ({ ...p, google_calendar_id: newCalendar.id }));
          } catch (error: any) {
              alert("Ошибка создания календаря: " + error.message);
          } finally {
              setLoading(false);
          }
      }
  };

  const handleLinkGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly',
        queryParams: {
            access_type: 'offline',
            prompt: 'consent select_account',
        }
      },
    });
    if (error) {
      alert('Ошибка подключения Google: ' + error.message);
    }
  };

  const isEmailProvider = user.app_metadata.provider === 'email';

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
                 <h3 className="text-lg font-semibold text-gray-800">Интеграции</h3>
                {isEmailProvider && !providerToken ? (
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">Подключите ваш Google аккаунт, чтобы использовать все возможности интеграции (Календарь, Документы, Диск).</p>
                        <button type="button" onClick={handleLinkGoogle} className="mt-2 w-full flex justify-center items-center gap-2 py-2 px-4 btn-secondary">
                            <FaGoogle /> Подключить Google
                        </button>
                    </div>
                ) : (
                 <div className="mt-2">
                    <label htmlFor="google_calendar_id" className="block text-sm font-medium text-gray-700">Google Calendar</label>
                    <div className="flex items-center gap-2 mt-1">
                        <select
                            id="google_calendar_id"
                            name="google_calendar_id"
                            value={profile.google_calendar_id || ''}
                            onChange={handleChange}
                            className="w-full input"
                            disabled={loading || calendarsLoading}
                        >
                            <option value="">{calendarsLoading ? 'Загрузка...' : 'Не выбрано'}</option>
                            {calendars.map(cal => (
                                <option key={cal.id} value={cal.id}>{cal.summary}</option>
                            ))}
                        </select>
                        <button type="button" onClick={handleCreateCalendar} className="btn-secondary" disabled={loading || calendarsLoading}>Создать</button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Выберите календарь для синхронизации встреч.</p>
                 </div>
                )}
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
// src/components/LoginModal.tsx
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import Modal from './ui/Modal';
import { Spinner } from './ui/Spinner';
import { FaGoogle } from 'react-icons/fa';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signIn' | 'signUp';
}

type AuthMode = 'signIn' | 'signUp';

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, initialMode = 'signIn' }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (mode === 'signIn') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setError(error.message === 'Invalid login credentials' ? 'Неверный email или пароль.' : error.message);
        }
    } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
            setError(error.message === 'User already registered' ? 'Пользователь с таким email уже существует.' : error.message);
        } else if (data.user && data.user.identities?.length === 0) {
            setError('Этот email уже используется. Попробуйте войти.');
        } 
        else {
            setMessage('Регистрация успешна! Пожалуйста, проверьте свою почту и подтвердите аккаунт.');
            setEmail('');
            setPassword('');
        }
    }
    setLoading(false);
  };
  
  const handleGoogleLogin = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            scopes: [
                'https://www.googleapis.com/auth/drive.file',
                'https://www.googleapis.com/auth/calendar.events',
                'https://www.googleapis.com/auth/documents'
            ].join(' '),
        },
    });
    setLoading(false);
  };

  const handleClose = () => {
      setEmail('');
      setPassword('');
      setError('');
      setMessage('');
      setMode(initialMode);
      onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={mode === 'signIn' ? 'Вход в систему' : 'Регистрация'}>
        <div className="mb-4 border-b border-gray-200">
            <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                <button onClick={() => setMode('signIn')} className={`${mode === 'signIn' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>Вход</button>
                <button onClick={() => setMode('signUp')} className={`${mode === 'signUp' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>Регистрация</button>
            </nav>
        </div>
      <div className="space-y-4">
        {message && <p className="text-green-600 bg-green-100 p-3 rounded-md text-sm">{message}</p>}
        {error && <p className="text-red-600 bg-red-100 p-3 rounded-md text-sm">{error}</p>}
        <form onSubmit={handleAuthAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mt-1 input" required disabled={loading} />
          </div>
          <div>
            <label htmlFor="password"  className="block text-sm font-medium text-gray-700">Пароль</label>
             <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mt-1 input" required minLength={6} disabled={loading} />
          </div>
          <div className="pt-2">
            <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 btn-primary">
              {loading ? <Spinner size="sm" /> : (mode === 'signIn' ? 'Войти' : 'Зарегистрироваться')}
            </button>
          </div>
        </form>
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-2 text-sm text-gray-500">или</span>
          </div>
        </div>
        <div>
          <button onClick={handleGoogleLogin} disabled={loading} className="w-full flex justify-center items-center gap-3 py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100">
            <FaGoogle /> Войти через Google
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default LoginModal;

import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import Modal from './ui/Modal';
import { Spinner } from './ui/Spinner';
import { FaGoogle } from 'react-icons/fa';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

type AuthMode = 'signIn' | 'signUp';

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, initialMode = 'signIn' }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
        setMode(initialMode);
    }
  }, [isOpen, initialMode]);

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
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly',
      },
    });
    if (error) setError('Ошибка входа через Google: ' + error.message);
  };
  
  const handleClose = () => {
      setEmail(''); setPassword(''); setError(''); setMessage('');
      setMode(initialMode);
      onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">{mode === 'signIn' ? 'Вход в систему' : 'Создание аккаунта'}</h2>
        <p className="mt-2 text-sm text-gray-600">
            {mode === 'signIn' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
            <button onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')} className="font-medium text-slate-900 hover:underline ml-1">
                {mode === 'signIn' ? 'Зарегистрируйтесь' : 'Войдите'}
            </button>
        </p>
      </div>
      <div className="mt-8 space-y-6">
        {message && <p className="text-green-600 bg-green-100 p-3 rounded-md text-sm">{message}</p>}
        {error && <p className="text-red-600 bg-red-100 p-3 rounded-md text-sm">{error}</p>}
        <form onSubmit={handleAuthAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" required disabled={loading} />
          </div>
          <div>
            <label htmlFor="password"  className="label">Пароль</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="••••••••" required minLength={6} disabled={loading} />
          </div>
          <div>
            <button type="submit" disabled={loading} className="w-full btn-primary">
              {loading ? <Spinner size="sm" color="border-white" /> : (mode === 'signIn' ? 'Войти' : 'Зарегистрироваться')}
            </button>
          </div>
        </form>
        <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-xs uppercase">или</span>
            <div className="flex-grow border-t border-slate-200"></div>
        </div>
         <div>
            <button type="button" onClick={handleGoogleLogin} className="w-full flex items-center justify-center btn-secondary">
                <FaGoogle className="mr-2" />
                {mode === 'signIn' ? 'Войти через Google' : 'Регистрация через Google'}
            </button>
        </div>
      </div>
    </Modal>
  );
};

export default LoginModal;
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import Modal from './ui/Modal';
import { Spinner } from './ui/Spinner';

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
        } else {
            // Success, onAuthStateChange in App.tsx will close the modal
        }
    } else { // signUp
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
  
  const handleClose = () => {
      setEmail('');
      setPassword('');
      setError('');
      setMessage('');
      setMode('signIn'); // Reset to default tab
      onClose();
  }

  const title = mode === 'signIn' ? 'Вход в систему' : 'Регистрация';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <div className="space-y-4">
        {message && <p className="text-green-600 bg-green-100 p-3 rounded-md text-sm">{message}</p>}
        {error && <p className="text-red-600 bg-red-100 p-3 rounded-md text-sm">{error}</p>}
        <form onSubmit={handleAuthAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm"
              placeholder="you@example.com"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="password"  className="block text-sm font-medium text-gray-700">Пароль</label>
             <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm"
              placeholder="••••••••"
              required
              minLength={6}
              disabled={loading}
            />
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? <Spinner size="sm" color="border-white" /> : (mode === 'signIn' ? 'Войти' : 'Зарегистрироваться')}
            </button>
          </div>
           {mode === 'signIn' && (
                <p className="text-center text-sm text-gray-600">
                    Нет аккаунта?{' '}
                    <button type="button" onClick={() => setMode('signUp')} className="font-medium text-blue-600 hover:text-blue-500">
                        Зарегистрируйтесь
                    </button>
                </p>
            )}
            {mode === 'signUp' && (
                 <p className="text-center text-sm text-gray-600">
                    Уже есть аккаунт?{' '}
                    <button type="button" onClick={() => setMode('signIn')} className="font-medium text-blue-600 hover:text-blue-500">
                        Войти
                    </button>
                </p>
            )}
        </form>
      </div>
    </Modal>
  );
};

export default LoginModal;
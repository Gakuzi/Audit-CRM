

import React, { useState } from 'react';
import Modal from './ui/Modal';
import { FaCopy, FaWhatsapp, FaTelegramPlane } from 'react-icons/fa';
import { Project } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, project }) => {
    const [copied, setCopied] = useState(false);
    
    const shareUrl = `${window.location.origin}${window.location.pathname}#/${project.id}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const shareText = `Здравствуйте!

Это специальная ссылка для доступа к проекту аудита "${project.name}".

Возможности по ссылке:
- Оставлять комментарии и прикреплять файлы к задачам.
- Планировать встречи с аудитором.

В целях конфиденциальности, пожалуйста, не передавайте эту ссылку третьим лицам. Для постоянного и безопасного доступа рекомендуем пройти регистрацию в приложении после перехода по ссылке.

${shareUrl}`;

    return (
    <Modal isOpen={isOpen} onClose={onClose} title="Поделиться проектом">
        <p className="text-sm text-gray-600 mb-4">Отправьте эту ссылку заказчику. Он сможет комментировать и планировать встречи, используя только эту ссылку.</p>
        <div className="flex items-center space-x-2">
            <input 
                type="text" 
                readOnly 
                value={shareUrl} 
                className="w-full p-2 border rounded bg-gray-100" 
            />
            <button 
                onClick={handleCopy}
                className={`p-2 rounded-md text-white ${copied ? 'bg-green-500' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
                <FaCopy />
            </button>
        </div>
        {copied && <p className="text-xs text-green-600 mt-1">Ссылка скопирована!</p>}

        <div className="mt-4 pt-4 border-t flex items-center space-x-2">
             <a 
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center py-2 px-4 rounded-md bg-green-500 text-white hover:bg-green-600"
            >
                <FaWhatsapp className="mr-2" /> WhatsApp
            </a>
            <a 
                href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center py-2 px-4 rounded-md bg-sky-500 text-white hover:bg-sky-600"
            >
                <FaTelegramPlane className="mr-2" /> Telegram
            </a>
        </div>
    </Modal>
  );
};

export default ShareModal;
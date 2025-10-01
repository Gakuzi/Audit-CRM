import React, { useState } from 'react';
import Modal from './ui/Modal';
import { FaCopy, FaWhatsapp, FaTelegramPlane } from 'react-icons/fa';
import { Project, Week } from '../types';

interface ApprovalShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  week: Week | null;
}

const ApprovalShareModal: React.FC<ApprovalShareModalProps> = ({ isOpen, onClose, project, week }) => {
    const [copied, setCopied] = useState(false);
    
    if (!week) return null;

    const projectUrl = `${window.location.origin}${window.location.pathname}#/${project.id}`;

    const shareText = `Здравствуйте!

Прошу вас согласовать этап аудита «${week.title}» в проекте «${project.name}».

Ссылка для просмотра и согласования:
${projectUrl}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(shareText).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(projectUrl)}&text=${encodeURIComponent(`Здравствуйте!\n\nПрошу вас согласовать этап аудита «${week.title}» в проекте «${project.name}».`)}`;


    return (
    <Modal isOpen={isOpen} onClose={onClose} title="Поделиться для согласования">
        <p className="text-sm text-gray-600 mb-4">Этап отправлен на согласование. Отправьте ссылку заказчику для утверждения.</p>
        
        <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Текст сообщения:</label>
            <div className="relative">
                 <textarea 
                    readOnly 
                    value={shareText} 
                    className="w-full p-2 border rounded bg-gray-100 resize-none"
                    rows={6}
                />
                <button 
                    onClick={handleCopy}
                    className={`absolute top-2 right-2 p-2 rounded-md text-white ${copied ? 'bg-green-500' : 'bg-blue-600 hover:bg-blue-700'}`}
                    title="Скопировать текст"
                >
                    <FaCopy />
                </button>
            </div>
        </div>
        {copied && <p className="text-xs text-green-600 mt-1">Текст скопирован!</p>}

        <div className="mt-4 pt-4 border-t flex items-center space-x-2">
             <a 
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center py-2 px-4 rounded-md bg-green-500 text-white hover:bg-green-600"
            >
                <FaWhatsapp className="mr-2" /> WhatsApp
            </a>
            <a 
                href={telegramUrl}
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

export default ApprovalShareModal;

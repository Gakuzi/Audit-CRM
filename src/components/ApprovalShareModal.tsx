import React, { useState } from 'react';
import Modal from './ui/Modal';
import { FaCopy, FaWhatsapp, FaTelegramPlane } from 'react-icons/fa';
import { Project, Week, ContactPerson } from '../types';

interface ApprovalShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  week?: Week | null;
  contact?: ContactPerson | null;
}

const ApprovalShareModal: React.FC<ApprovalShareModalProps> = ({ isOpen, onClose, project, week, contact }) => {
    const [copied, setCopied] = useState(false);
    
    if (!project || (!week && !contact)) return null;

    // Generate link and text based on context (week approval or contact invite)
    const isContactInvite = !!contact;
    const shareUrl = `${window.location.origin}${window.location.pathname}#/${project.id}${isContactInvite ? `?contactId=${contact.id}`: ''}`;
    
    const shareText = isContactInvite ?
`Здравствуйте, ${contact.name}!

Это персональная ссылка для доступа к аудиторскому проекту «${project.name}».
Используйте ее для общения с аудитором, комментирования и согласования этапов.

${shareUrl}`
:
`Здравствуйте!
Прошу вас согласовать этап аудита «${week?.title}» в проекте «${project.name}».
Ссылка для просмотра и согласования:
${shareUrl}`;


    const handleCopy = () => {
        navigator.clipboard.writeText(shareText).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    
    const telegramText = isContactInvite ? `Здравствуйте, ${contact.name}!\n\nПерсональная ссылка для доступа к аудиторскому проекту «${project.name}».` : `Здравствуйте!\n\nПрошу вас согласовать этап аудита «${week?.title}» в проекте «${project.name}».`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(telegramText)}`;
    const modalTitle = isContactInvite ? `Пригласить: ${contact.name}` : "Поделиться для согласования";


    return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
        <p className="text-sm text-gray-600 mb-4">{isContactInvite ? "Отправьте эту персональную ссылку контакту. По ней он получит гостевой доступ к проекту." : "Отправьте ссылку заказчику для утверждения."}</p>
        
        <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Текст сообщения:</label>
            <div className="relative">
                 <textarea 
                    readOnly 
                    value={shareText} 
                    className="w-full p-2 border rounded bg-gray-100 resize-none"
                    rows={8}
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

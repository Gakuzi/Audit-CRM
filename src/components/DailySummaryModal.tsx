import React from 'react';
import Modal from './ui/Modal';
import { Spinner } from './ui/Spinner';
import ReactMarkdown from 'react-markdown';
import { FaWhatsapp, FaTelegramPlane, FaPrint } from 'react-icons/fa';
import { Project } from '../types';

interface DailySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: string;
  loading: boolean;
  project: Project;
  date: string;
}

const DailySummaryModal: React.FC<DailySummaryModalProps> = ({ isOpen, onClose, summary, loading, project, date }) => {

    const formattedDate = date ? new Date(date + 'T00:00:00').toLocaleDateString('ru-RU') : '';
    const title = `Сводка за ${formattedDate}`;

    // A helper to strip markdown for sharing
    const stripMarkdown = (text: string) => {
        return text
            .replace(/###\s?/g, '')
            .replace(/##\s?/g, '')
            .replace(/#\s?/g, '')
            .replace(/\*\*/g, '*')
            .replace(/(\r\n|\n|\r)/gm, "\n"); // Normalize line breaks
    };

    const shareText = `*Сводка по проекту "${project.name}" за ${formattedDate}*\n\n${stripMarkdown(summary)}`;

    const handlePrint = () => {
        window.print();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="max-h-[60vh] overflow-y-auto pr-2 print-container">
                <div className="print-title-block hidden">
                    <h1>{title}</h1>
                    <p>Проект: «{project.name}»</p>
                </div>
                <div className="print-content">
                    {loading && <div className="no-print flex justify-center items-center h-48"><Spinner size="lg"/></div>}
                    {!loading && summary && <div className="prose prose-sm max-w-none"><ReactMarkdown>{summary}</ReactMarkdown></div>}
                </div>
            </div>
            {!loading && summary && (
                <div className="mt-4 pt-4 border-t flex justify-between items-center no-print">
                    <div className="flex items-center gap-2">
                         <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center gap-2"><FaWhatsapp /> WhatsApp</a>
                         <a href={`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center gap-2"><FaTelegramPlane /> Telegram</a>
                    </div>
                    <button onClick={handlePrint} className="btn-primary flex items-center gap-2"><FaPrint /> Печать/PDF</button>
                </div>
            )}
        </Modal>
    );
};

export default DailySummaryModal;

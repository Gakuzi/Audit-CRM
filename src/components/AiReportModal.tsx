import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import { Spinner } from './ui/Spinner';
import { Week, Project, Event, Profile, CompanyProfile } from '../types';
import { generateComprehensiveReport } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';
import ReactMarkdown from 'react-markdown';
import { FaSync, FaPrint, FaWhatsapp, FaTelegramPlane } from 'react-icons/fa';

interface AiReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    week: Week;
    project: Project;
    auditor: Profile | null;
    company: CompanyProfile | null;
    onUpdate: () => void;
}

const AiReportModal: React.FC<AiReportModalProps> = ({ isOpen, onClose, week, project, auditor, company, onUpdate }) => {
    const [report, setReport] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchAndGenerateReport = async () => {
        setLoading(true);
        setError('');
        setReport('');
        try {
            const { data, error: eventsError } = await supabase
                .from('events')
                .select('*')
                .eq('week_id', week.id);

            if (eventsError) throw eventsError;
            
            const events: Event[] = data || [];

            const generatedReport = await generateComprehensiveReport(week, project, events);
            setReport(generatedReport);

            const { error: updateError } = await supabase
              .from('weeks')
              .update({
                report_content: generatedReport,
                report_generated_at: new Date().toISOString()
              })
              .eq('id', week.id);
            
            if (updateError) throw updateError;

            onUpdate();

        } catch (err: any) {
            setError('Не удалось сгенерировать отчет: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            if (week.report_content && week.report_generated_at) {
                setReport(week.report_content);
                setLoading(false);
                setError('');
            } else {
                fetchAndGenerateReport();
            }
        }
    }, [isOpen, week]);

    const reportSummary = report.substring(0, 200) + '...';
    const shareText = `Отчет по этапу «${week.title}» в проекте «${project.name}»:\n\n${reportSummary}\n\nПодробнее по ссылке: ${window.location.href}`;
    const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(shareText)}`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`AI Отчет: ${week.title}`}>
            {/* === ON-SCREEN VIEW === */}
            <div className="no-print">
                <div className="max-h-[70vh] overflow-y-auto pr-2">
                    {loading && (
                        <div className="flex flex-col items-center justify-center h-48">
                            <Spinner size="lg" />
                            <p className="mt-4 text-gray-600">Анализирую данные и составляю отчет...</p>
                        </div>
                    )}
                    {error && (
                        <div className="p-4 bg-red-100 text-red-800 rounded-md">
                            <p className="font-bold">Произошла ошибка</p>
                            <p>{error}</p>
                        </div>
                    )}
                    {report && (
                        <div className="prose prose-sm max-w-none">
                            <ReactMarkdown>{report}</ReactMarkdown>
                        </div>
                    )}
                </div>
                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <div>
                        {week.report_generated_at && !loading && (
                            <p className="text-xs text-gray-500">
                                Сформирован: {new Date(week.report_generated_at).toLocaleString('ru-RU')}
                            </p>
                        )}
                        <p className="text-xs text-gray-500">Отчет сгенерирован с помощью Gemini</p>
                    </div>
                    <div className="flex items-center gap-1">
                        <a href={whatsappShareUrl} target="_blank" rel="noopener noreferrer" title="Поделиться в WhatsApp" className="p-2 text-gray-500 hover:text-green-500 rounded-full hover:bg-gray-100">
                            <FaWhatsapp size={18} />
                        </a>
                        <a href={telegramShareUrl} target="_blank" rel="noopener noreferrer" title="Поделиться в Telegram" className="p-2 text-gray-500 hover:text-sky-500 rounded-full hover:bg-gray-100">
                            <FaTelegramPlane size={18} />
                        </a>
                        <button onClick={() => window.print()} title="Печать / Сохранить в PDF" className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100">
                            <FaPrint size={18} />
                        </button>
                        <button onClick={fetchAndGenerateReport} disabled={loading} className="btn-secondary flex items-center gap-2 !py-1.5 !px-3 text-sm">
                            <FaSync className={loading ? 'animate-spin' : ''} />
                            {loading ? 'Генерация...' : 'Пересоздать'}
                        </button>
                    </div>
                </div>
            </div>

            {/* === PRINT-ONLY VIEW === */}
            {report && (
                <div className="print-container">
                    <div className="print-title-block">
                        <h1>Отчет по результатам этапа аудита</h1>
                        <h2 className="project-name">Проект: «{project.name}»</h2>
                        <p className="stage-name">Этап: «{week.title}»</p>
                        
                        <div className="details">
                            <div>
                                <p>Заказчик:</p>
                                <p>{company?.company_name || 'Не указано'}</p>
                            </div>
                            <div>
                                <p>Исполнитель (аудитор):</p>
                                <p>{auditor?.full_name || 'Не указано'}</p>
                            </div>
                            <div>
                                <p>Дата формирования отчета:</p>
                                <p>{new Date().toLocaleDateString('ru-RU')}</p>
                            </div>
                        </div>
                    </div>

                    <div className="print-content">
                        <ReactMarkdown>{report}</ReactMarkdown>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default AiReportModal;

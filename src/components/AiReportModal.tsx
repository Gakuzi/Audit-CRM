import React, { useState, useEffect, useCallback } from 'react';
import Modal from './ui/Modal';
import { Spinner } from './ui/Spinner';
import { Week, Project, Event } from '../types';
import { generateComprehensiveReport, generateProjectReport } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';
import ReactMarkdown from 'react-markdown';
import { FaSync, FaPrint, FaWhatsapp, FaTelegramPlane, FaCopy } from 'react-icons/fa';

interface AiReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    week: Week | null; // Nullable for project-wide report
    project: Project;
    scope: 'week' | 'project';
    onUpdateRequest: () => void;
}

const AiReportModal: React.FC<AiReportModalProps> = ({ isOpen, onClose, week, project, scope, onUpdateRequest }) => {
    const [report, setReport] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const fetchAndGenerateReport = useCallback(async () => {
        setLoading(true);
        setError('');
        setReport('');
        try {
            if (scope === 'week' && week) {
                const { data: events, error: eventsError } = await supabase
                    .from('events')
                    .select('*')
                    .eq('week_id', week.id);
                if (eventsError) throw eventsError;
                const generatedReport = await generateComprehensiveReport(week, project, events || []);
                setReport(generatedReport);

                // Save the generated report
                const { error: updateError } = await supabase
                    .from('weeks')
                    .update({ report_content: generatedReport, report_generated_at: new Date().toISOString() })
                    .eq('id', week.id);
                if (updateError) throw updateError;
                onUpdateRequest(); // Notify parent to refetch

            } else if (scope === 'project') {
                // Project-wide report generation remains ephemeral for now
                const { data: weeks, error: weeksError } = await supabase.from('weeks').select('*').eq('project_id', project.id);
                if (weeksError) throw weeksError;
                const { data: events, error: eventsError } = await supabase.from('events').select('*').eq('project_id', project.id);
                if (eventsError) throw eventsError;
                const generatedReport = await generateProjectReport(project, weeks || [], events || []);
                setReport(generatedReport);
            }
        } catch (err: any) {
            setError('Не удалось сгенерировать отчет: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [week, project, scope, onUpdateRequest]);


    useEffect(() => {
        if (isOpen) {
             // If report for the week already exists, show it. Otherwise, generate it.
            if (scope === 'week' && week?.report_content) {
                setReport(week.report_content);
                setLoading(false);
            } else {
                fetchAndGenerateReport();
            }
        }
    }, [isOpen, week, scope, fetchAndGenerateReport]);
    
    const stripMarkdown = (text: string) => {
        return text.replace(/###\s?/g, '').replace(/##\s?/g, '').replace(/#\s?/g, '').replace(/\*\*/g, '*').replace(/(\r\n|\n|\r)/gm, "\n");
    };
    
    const handleCopy = () => {
        navigator.clipboard.writeText(stripMarkdown(report)).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handlePrint = () => {
        window.print();
    };
    
    const title = scope === 'week' ? `Отчет: ${week?.title}` : `Сводный отчет по проекту`;
    const shareTitle = scope === 'week' ? `Отчет по этапу "${week?.title}"` : `Сводный отчет по проекту "${project.name}"`;
    const shareText = `${shareTitle}\n\n${stripMarkdown(report)}`;
    const shareUrl = window.location.href;


    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="print-container">
                 <div className="print-title-block hidden">
                    {scope === 'week' ? (
                        <>
                            <h1>Отчет по этапу аудита</h1>
                            <h2 className="stage-name">«{week?.title}»</h2>
                        </>
                    ) : (
                        <>
                            <h1>Сводный отчет по проекту</h1>
                            <h2 className="project-name">«{project.name}»</h2>
                        </>
                    )}
                </div>
                 {scope === 'week' && week?.report_generated_at && !loading && (
                    <p className="text-xs text-gray-500 mb-2 no-print">
                        Отчет создан: {new Date(week.report_generated_at).toLocaleString('ru-RU')}
                    </p>
                )}
                <div className="print-content">
                    {loading && (
                        <div className="no-print flex flex-col items-center justify-center h-48">
                            <Spinner size="lg" />
                            <p className="mt-4 text-gray-600">Анализирую данные и составляю отчет...</p>
                        </div>
                    )}
                    {error && (
                        <div className="no-print p-4 bg-red-100 text-red-800 rounded-md">
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
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between items-center no-print">
                 <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={handleCopy} className="btn-secondary flex items-center gap-2"><FaCopy /> {copied ? 'Готово!' : 'Копировать'}</button>
                    <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center gap-2"><FaWhatsapp /></a>
                    <a href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center gap-2"><FaTelegramPlane /></a>
                    <button onClick={handlePrint} disabled={loading} className="btn-secondary flex items-center gap-2"><FaPrint /> PDF</button>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchAndGenerateReport} disabled={loading} className="btn-primary flex items-center gap-2">
                        <FaSync className={loading ? 'animate-spin' : ''} />
                        {loading ? 'Генерация...' : 'Пересоздать'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default AiReportModal;


import React, { useState, useEffect, useCallback } from 'react';
import Modal from './ui/Modal';
import { Spinner } from './ui/Spinner';
import { Week, Project, Event } from '../types';
import { generateComprehensiveReport, generateProjectReport } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';
import ReactMarkdown from 'react-markdown';
import { FaSync, FaPrint } from 'react-icons/fa';

interface AiReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    week: Week | null; // Nullable for project-wide report
    project: Project;
    scope: 'week' | 'project';
}

const AiReportModal: React.FC<AiReportModalProps> = ({ isOpen, onClose, week, project, scope }) => {
    const [report, setReport] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
            } else if (scope === 'project') {
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
    }, [isOpen, week, project, scope]);


    useEffect(() => {
        if (isOpen) {
            fetchAndGenerateReport();
        }
    }, [isOpen, fetchAndGenerateReport]);

    const handlePrint = () => {
        window.print();
    };

    const title = scope === 'week' ? `AI Отчет: ${week?.title}` : `Сводный AI Отчет по проекту`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="max-h-[70vh] overflow-y-auto pr-2 print-container">
                 <div className="print-title-block">
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
                <p className="text-xs text-gray-500">Отчет сгенерирован с помощью Gemini</p>
                <div className="flex items-center gap-2">
                    <button onClick={handlePrint} disabled={loading} className="btn-secondary flex items-center gap-2"><FaPrint /> Печать/PDF</button>
                    <button onClick={fetchAndGenerateReport} disabled={loading} className="btn-secondary flex items-center gap-2">
                        <FaSync className={loading ? 'animate-spin' : ''} />
                        {loading ? 'Генерация...' : 'Пересоздать'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default AiReportModal;

import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import { Spinner } from './ui/Spinner';
import { Week, Project, Event } from '../types';
import { generateComprehensiveReport } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';
import ReactMarkdown from 'react-markdown';
import { FaSync } from 'react-icons/fa';

interface AiReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    week: Week;
    project: Project;
}

const AiReportModal: React.FC<AiReportModalProps> = ({ isOpen, onClose, week, project }) => {
    const [report, setReport] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchAndGenerateReport = async () => {
        setLoading(true);
        setError('');
        setReport('');
        try {
            // 1. Fetch events for the week
            const { data: events, error: eventsError } = await supabase
                .from('events')
                .select('*')
                .eq('week_id', week.id);

            if (eventsError) throw eventsError;

            // 2. Generate report
            const generatedReport = await generateComprehensiveReport(week, project, events || []);
            setReport(generatedReport);

        } catch (err: any) {
            setError('Не удалось сгенерировать отчет: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchAndGenerateReport();
        }
    }, [isOpen, week.id]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`AI Отчет: ${week.title}`}>
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
                <p className="text-xs text-gray-500">Отчет сгенерирован с помощью Gemini</p>
                <button onClick={fetchAndGenerateReport} disabled={loading} className="btn-secondary flex items-center gap-2">
                    <FaSync className={loading ? 'animate-spin' : ''} />
                    {loading ? 'Генерация...' : 'Пересоздать'}
                </button>
            </div>
        </Modal>
    );
};

export default AiReportModal;
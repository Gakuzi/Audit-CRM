// src/components/AiReportModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import Modal from './ui/Modal';
import { Spinner } from './ui/Spinner';
import { Week, Project, Event, Profile, CompanyProfile } from '../types';
import { generateComprehensiveReport } from '../services/geminiService';
import * as googleApiService from '../services/googleApiService';
import { supabase } from '../services/supabaseClient';
import ReactMarkdown from 'react-markdown';
import { FaSync, FaGoogle, FaPrint } from 'react-icons/fa';

interface AiReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    week: Week;
    project: Project;
    auditor: Profile | null;
    company: CompanyProfile | null;
    providerToken: string | null;
    onUpdate: () => void;
}

const AiReportModal: React.FC<AiReportModalProps> = ({ isOpen, onClose, week, project, auditor, company, providerToken, onUpdate }) => {
    const [report, setReport] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [exportSuccess, setExportSuccess] = useState('');

    const fetchAndGenerateReport = useCallback(async () => {
        setLoading(true);
        setError('');
        setReport('');
        setExportSuccess('');

        if (week.report_content && week.report_generated_at && (new Date().getTime() - new Date(week.report_generated_at).getTime()) < 3600000) {
            setReport(week.report_content);
            setLoading(false);
            return;
        }

        try {
            const { data: events, error: eventsError } = await supabase.from('events').select('*').eq('week_id', week.id);
            if (eventsError) throw eventsError;
            const generatedReport = await generateComprehensiveReport(week, project, events || []);
            setReport(generatedReport);

            const { error: updateError } = await supabase.from('weeks').update({ report_content: generatedReport, report_generated_at: new Date().toISOString() }).eq('id', week.id);
            if (updateError) console.error("Failed to cache report", updateError);
            else onUpdate();

        } catch (err: any) {
            setError('Не удалось сгенерировать отчет: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [isOpen, week, project, onUpdate]);

    useEffect(() => { if (isOpen) fetchAndGenerateReport(); }, [isOpen, fetchAndGenerateReport]);

    const handleExportToDocs = async () => {
        if (!providerToken || !report) return;
        setIsExporting(true);
        setExportSuccess('');
        try {
            const docTitle = `Отчет по аудиту: ${project.name} - ${week.title}`;
            const link = await googleApiService.createGoogleDoc(providerToken, docTitle, report);
            setExportSuccess(link);
        } catch (error: any) {
            alert("Ошибка экспорта: " + error.message);
        } finally {
            setIsExporting(false);
        }
    };
    
    const handlePrint = () => { window.print(); };

    return (
        <>
        <Modal isOpen={isOpen} onClose={onClose} title={`AI Отчет: ${week.title}`}>
            <div className="max-h-[70vh] overflow-y-auto pr-2 print-container">
                <div className="print-title-block">
                    <h1>Отчет по этапу аудита</h1>
                    <h2 className="stage-name">«{week.title}»</h2>
                    <p>по проекту</p>
                    <h2 className="project-name">«{project.name}»</h2>

                    <div className="details">
                        <div><p>Заказчик:</p><p>{company?.company_name || project.name}</p></div>
                        <div><p>Исполнитель:</p><p>{auditor?.full_name || 'Аудитор'}</p></div>
                        <div><p>Период этапа:</p><p>{new Date(week.start_date).toLocaleDateString()} - {new Date(week.end_date).toLocaleDateString()}</p></div>
                        <div><p>Дата отчета:</p><p>{new Date().toLocaleDateString()}</p></div>
                    </div>
                </div>

                <div className="print-content">
                    {loading && <div className="no-print flex flex-col items-center justify-center h-48"><Spinner size="lg" /><p>Анализ данных...</p></div>}
                    {error && <div className="no-print p-4 bg-red-100 text-red-800 rounded-md"><p>{error}</p></div>}
                    {report && <div className="prose prose-sm max-w-none"><ReactMarkdown>{report}</ReactMarkdown></div>}
                </div>
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between items-center no-print">
                <div className="space-x-2">
                    {providerToken && <button onClick={handleExportToDocs} disabled={loading || isExporting} className="btn-secondary flex items-center gap-2">{isExporting ? <Spinner size="sm"/> : <FaGoogle />} Docs</button>}
                    <button onClick={handlePrint} disabled={loading} className="btn-secondary flex items-center gap-2"><FaPrint /> Печать</button>
                </div>
                <button onClick={() => { setReport(''); fetchAndGenerateReport(); }} disabled={loading} className="btn-secondary flex items-center gap-2"><FaSync className={loading ? 'animate-spin' : ''} />{loading ? '...' : 'Пересоздать'}</button>
            </div>
            {exportSuccess && <div className="no-print mt-2 text-sm text-green-600">Экспорт успешен! <a href={exportSuccess} target="_blank" rel="noopener noreferrer" className="font-bold underline">Открыть документ</a>.</div>}
        </Modal>
        </>
    );
};

export default AiReportModal;

import React, { useState, useRef, useEffect } from 'react';
import { FaMicrophone, FaStop, FaSave } from 'react-icons/fa';
import { FiAlertTriangle } from 'react-icons/fi';
import { FILE_SIZE_LIMIT } from '../constants';
import { Spinner } from './ui/Spinner';

interface AudioRecorderProps {
    onSave: (blobs: Blob[]) => void;
    onClose: () => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onSave, onClose }) => {
    const [permission, setPermission] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const timerInterval = useRef<number | null>(null);
    const wakeLock = useRef<any>(null);
    const [wakeLockFailed, setWakeLockFailed] = useState(false);

    const recordedChunks = useRef<Blob[]>([]);
    const currentChunk = useRef<Blob[]>([]);
    const [savedChunkCount, setSavedChunkCount] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const getMicrophonePermission = async () => {
            if ("MediaRecorder" in window) {
                try {
                    const streamData = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                    setPermission(true);
                    setStream(streamData);
                } catch (err) {
                    alert(err instanceof Error ? err.message : "An unknown error occurred");
                    onClose();
                }
            } else {
                alert("The MediaRecorder API is not supported in your browser.");
                onClose();
            }
        };

        getMicrophonePermission();

        return () => {
            if (timerInterval.current) clearInterval(timerInterval.current);
            releaseWakeLock();
            stream?.getTracks().forEach(track => track.stop());
        }
    }, []);

    const acquireWakeLock = async () => {
        if ('wakeLock' in navigator) {
            try {
                wakeLock.current = await navigator.wakeLock.request('screen');
                setWakeLockFailed(false);
            } catch (err: any) {
                console.error(`Wake Lock failed: ${err.name}, ${err.message}`);
                setWakeLockFailed(true);
            }
        }
    };

    const releaseWakeLock = () => {
        if (wakeLock.current) {
            wakeLock.current.release();
            wakeLock.current = null;
        }
    };

    const startRecording = () => {
        if (!stream) return;
        acquireWakeLock();
        setIsRecording(true);
        setSavedChunkCount(0);
        recordedChunks.current = [];
        currentChunk.current = [];
        
        const media = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorder.current = media;
        
        mediaRecorder.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
                currentChunk.current.push(event.data);
                const tempBlob = new Blob(currentChunk.current, { type: 'audio/webm' });
                if (tempBlob.size >= FILE_SIZE_LIMIT) {
                    recordedChunks.current.push(tempBlob);
                    setSavedChunkCount(prev => prev + 1);
                    currentChunk.current = [];
                }
            }
        };

        mediaRecorder.current.onstop = () => {
            if (currentChunk.current.length > 0) {
                const finalBlob = new Blob(currentChunk.current, { type: 'audio/webm' });
                recordedChunks.current.push(finalBlob);
            }
            setIsSaving(true);
            setTimeout(() => { 
                onSave(recordedChunks.current);
                onClose();
            }, 500);
        };

        mediaRecorder.current.start(1000);

        setRecordingTime(0);
        timerInterval.current = window.setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    };

    const stopRecording = () => {
        if (mediaRecorder.current) mediaRecorder.current.stop();
        releaseWakeLock();
        setIsRecording(false);
        if(timerInterval.current) clearInterval(timerInterval.current);
    };
    
    const formatTime = (time: number) => `${Math.floor(time / 60).toString().padStart(2, '0')}:${(time % 60).toString().padStart(2, '0')}`;

    if (!permission) return <div className="text-center p-4 bg-yellow-100 text-yellow-800 rounded-md">Запрос доступа к микрофону...</div>
    if (isSaving) return <div className="flex flex-col items-center justify-center space-y-4 p-4 h-48"><Spinner size="lg" /><p>Сохранение...</p></div>;

    return (
        <div className="flex flex-col items-center space-y-4 p-4 border rounded-lg">
            {wakeLockFailed && isRecording && <div className="flex items-center gap-2 text-xs text-yellow-700 bg-yellow-100 p-2 rounded-md"><FiAlertTriangle /><span>Экран может погаснуть во время записи.</span></div>}
            <p className="text-2xl font-mono">{formatTime(recordingTime)}</p>
            {isRecording ? 
                <button type="button" onClick={stopRecording} className="flex items-center justify-center w-20 h-20 bg-red-500 text-white rounded-full animate-pulse"><FaStop size={32} /></button> : 
                <button type="button" onClick={startRecording} className="flex items-center justify-center w-20 h-20 bg-red-500 text-white rounded-full hover:bg-red-600"><FaMicrophone size={32} /></button>
            }
            <div className="text-center">
                <p className="text-sm text-gray-600">{isRecording ? 'Идет запись...' : 'Нажмите для начала'}</p>
                {savedChunkCount > 0 && <p className="text-xs text-blue-600 font-semibold mt-1">Сохранено частей: {savedChunkCount}</p>}
            </div>
             <div className="pt-4 flex justify-center space-x-4">
                <button type="button" onClick={onClose} className="btn-secondary">Отмена</button>
                {!isRecording && recordedChunks.current.length > 0 && <button type="button" onClick={() => onSave(recordedChunks.current)} className="btn-primary flex items-center gap-2"><FaSave /> Сохранить</button>}
            </div>
        </div>
    );
};

export default AudioRecorder;
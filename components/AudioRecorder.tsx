import React, { useState, useRef, useEffect } from 'react';
import { FaMicrophone, FaStop, FaPlay, FaSave, FaTrash } from 'react-icons/fa';
import { Spinner } from './ui/Spinner';
import { FiAlertTriangle } from 'react-icons/fi';

interface AudioRecorderProps {
    onSave: (blob: Blob, duration: number) => void;
    enableWakeLock?: boolean;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onSave, enableWakeLock = false }) => {
    const [permission, setPermission] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const [recordingStatus, setRecordingStatus] = useState<'inactive' | 'recording' | 'recorded'>('inactive');
    const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const timerInterval = useRef<number | null>(null);
    const wakeLock = useRef<any>(null); // WakeLockSentinel
    const [wakeLockFailed, setWakeLockFailed] = useState(false);

    const getMicrophonePermission = async () => {
        if ("MediaRecorder" in window) {
            try {
                const streamData = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                setPermission(true);
                setStream(streamData);
            } catch (err) {
                alert(err instanceof Error ? err.message : "An unknown error occurred");
            }
        } else {
            alert("The MediaRecorder API is not supported in your browser.");
        }
    };
    
    const acquireWakeLock = async () => {
        if (enableWakeLock && 'wakeLock' in navigator) {
            try {
                wakeLock.current = await navigator.wakeLock.request('screen');
                setWakeLockFailed(false); // Success
                console.log('Wake Lock is active!');
            } catch (err: any) {
                // Gracefully handle the error when the permission policy denies the request.
                if (err.name === 'NotAllowedError') {
                    console.warn('Wake Lock request was denied by the browser permissions policy.');
                    setWakeLockFailed(true);
                } else {
                    console.error(`Wake Lock failed: ${err.name}, ${err.message}`);
                }
            }
        }
    };

    const releaseWakeLock = () => {
        if (wakeLock.current) {
            wakeLock.current.release().then(() => {
                wakeLock.current = null;
                console.log('Wake Lock was released');
            });
        }
    };


    useEffect(() => {
        getMicrophonePermission();
        return () => {
            if (timerInterval.current) {
                clearInterval(timerInterval.current)
            }
            releaseWakeLock(); // Release lock on component unmount
        }
    }, []);

    const startRecording = () => {
        if (!stream) return;
        acquireWakeLock();
        setRecordingStatus('recording');
        const media = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorder.current = media;
        mediaRecorder.current.start();
        setAudioChunks([]);
        setRecordingTime(0);
        
        timerInterval.current = window.setInterval(() => {
            setRecordingTime(prev => prev + 1);
        }, 1000);

        mediaRecorder.current.ondataavailable = (event) => {
            if (typeof event.data === "undefined") return;
            if (event.data.size === 0) return;
            setAudioChunks((prev) => [...prev, event.data]);
        };
    };

    const stopRecording = () => {
        if (!mediaRecorder.current) return;
        releaseWakeLock();
        mediaRecorder.current.stop();
        if(timerInterval.current) clearInterval(timerInterval.current);
        
        mediaRecorder.current.onstop = () => {
            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            const url = URL.createObjectURL(blob);
            setAudioBlob(blob);
            setAudioUrl(url);
            setRecordingStatus('recorded');
            setAudioChunks([]);
        };
    };
    
    const handleSave = () => {
        if(audioBlob) {
            onSave(audioBlob, recordingTime);
            resetRecorder();
        }
    }
    
    const resetRecorder = () => {
        setRecordingStatus('inactive');
        setAudioUrl(null);
        setAudioBlob(null);
        setRecordingTime(0);
        setWakeLockFailed(false);
    }
    
    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60).toString().padStart(2, '0');
        const seconds = (time % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    }

    if (!permission) {
        return <div className="text-center p-4 bg-yellow-100 text-yellow-800 rounded-md">Запрос доступа к микрофону...</div>
    }

    return (
        <div className="flex flex-col items-center space-y-4 p-4 border rounded-lg">
            {wakeLockFailed && recordingStatus === 'recording' && (
                 <div className="flex items-center gap-2 text-xs text-yellow-700 bg-yellow-100 p-2 rounded-md">
                    <FiAlertTriangle />
                    <span>Не удалось заблокировать экран. Устройство может уснуть во время записи.</span>
                </div>
            )}
            <p className="text-lg font-mono">{formatTime(recordingTime)}</p>
            {recordingStatus === 'inactive' && (
                <button type="button" onClick={startRecording} className="flex items-center justify-center w-16 h-16 bg-red-500 text-white rounded-full hover:bg-red-600">
                    <FaMicrophone size={24} />
                </button>
            )}
            {recordingStatus === 'recording' && (
                <button type="button" onClick={stopRecording} className="flex items-center justify-center w-16 h-16 bg-red-500 text-white rounded-full animate-pulse">
                    <FaStop size={24} />
                </button>
            )}
            {recordingStatus === 'recorded' && audioUrl && (
                 <div className="w-full">
                    <audio src={audioUrl} controls className="w-full" />
                    <div className="flex justify-center space-x-4 mt-4">
                        <button type="button" onClick={resetRecorder} className="flex items-center py-2 px-4 btn-secondary bg-gray-200 hover:bg-gray-300">
                            <FaTrash className="mr-2" /> Удалить
                        </button>
                        <button type="button" onClick={handleSave} className="flex items-center py-2 px-4 btn-primary bg-blue-600 hover:bg-blue-700">
                            <FaSave className="mr-2" /> Прикрепить запись
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AudioRecorder;
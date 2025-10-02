import React from 'react';
import Modal from './ui/Modal';
import AudioRecorder from './AudioRecorder';

interface AudioRecorderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (files: File[]) => void;
}

const AudioRecorderModal: React.FC<AudioRecorderModalProps> = ({ isOpen, onClose, onSave }) => {
    
    const handleSave = (blobs: Blob[]) => {
        const timestamp = Date.now();
        const files = blobs.map((blob, index) => {
            return new File([blob], `audio-recording-${timestamp}-part-${index + 1}.webm`, { type: blob.type });
        });
        onSave(files);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Запись аудио">
            <AudioRecorder 
                onSave={handleSave}
                onClose={onClose}
            />
        </Modal>
    );
};

export default AudioRecorderModal;

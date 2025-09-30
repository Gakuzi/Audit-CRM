import React from 'react';
import Modal from './ui/Modal';
import AudioRecorder from './AudioRecorder';

interface AudioRecorderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (blob: Blob, duration: number) => void;
}

const AudioRecorderModal: React.FC<AudioRecorderModalProps> = ({ isOpen, onClose, onSave }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Запись аудио">
            <AudioRecorder onSave={(blob, duration) => {
                onSave(blob, duration);
                onClose();
            }} />
        </Modal>
    );
};

export default AudioRecorderModal;

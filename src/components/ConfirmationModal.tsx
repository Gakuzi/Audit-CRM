import React from 'react';
import Modal from './ui/Modal';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        footer={
            <>
                <button onClick={onClose} className="btn-secondary">Отмена</button>
                <button onClick={handleConfirm} className="btn-destructive">Подтвердить</button>
            </>
        }
    >
      <p className="text-sm text-gray-600">{message}</p>
    </Modal>
  );
};

export default ConfirmationModal;
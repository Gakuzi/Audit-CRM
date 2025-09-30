// Fix: Created a functional Modal component to resolve 'Cannot find name' errors.
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
        <div>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;

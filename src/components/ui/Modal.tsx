import React, { useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
  size?: 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title, size = 'md', footer }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <style>{`.animate-fade-in { animation: fadeIn 0.2s ease-out; } @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
      <div
        className={`bg-white rounded-lg shadow-xl w-full ${sizeClasses[size]} relative flex flex-col max-h-[90vh] animate-fade-in`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <header className="flex-shrink-0 flex justify-between items-center p-4 border-b border-slate-200">
            <h2 id="modal-title" className="text-lg font-semibold text-slate-800">{title}</h2>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100" aria-label="Close modal">
              <FaTimes/>
            </button>
          </header>
        )}
        <div className="p-6 flex-1 overflow-y-auto">
          {children}
        </div>
        {footer && (
            <footer className="flex-shrink-0 flex justify-end items-center gap-2 p-4 border-t border-slate-200 bg-slate-50 rounded-b-lg">
                {footer}
            </footer>
        )}
      </div>
    </div>
  );
};

export default Modal;
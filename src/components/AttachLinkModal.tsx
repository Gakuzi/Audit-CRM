import React, { useState } from 'react';
import Modal from './ui/Modal';

interface AttachLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAttach: (url: string) => void;
}

const AttachLinkModal: React.FC<AttachLinkModalProps> = ({ isOpen, onClose, onAttach }) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      try {
        // Basic validation
        new URL(url.trim());
        onAttach(url.trim());
        onClose();
      } catch (_) {
        alert('Пожалуйста, введите корректный URL.');
      }
    }
  };
  
  const handleClose = () => {
      setUrl('');
      onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Прикрепить ссылку">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="linkUrl" className="block text-sm font-medium text-gray-700">URL</label>
          <input
            id="linkUrl"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full mt-1 input"
            placeholder="https://example.com"
            required
            autoFocus
          />
        </div>
        <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={handleClose} className="btn-secondary">
                Отмена
            </button>
            <button type="submit" className="btn-primary" disabled={!url.trim()}>
                Прикрепить
            </button>
        </div>
      </form>
    </Modal>
  );
};

export default AttachLinkModal;
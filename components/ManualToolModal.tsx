import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import { Spinner } from './ui/Spinner';

interface ManualToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string) => Promise<void>;
  config: {
    title: string;
    label: string;
    placeholder: string;
    actionLabel: string;
  } | null;
}

const ManualToolModal: React.FC<ManualToolModalProps> = ({ isOpen, onClose, onSubmit, config }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setContent('');
      setLoading(false);
    }
  }, [isOpen]);

  if (!config) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    try {
      await onSubmit(content);
      onClose();
    } catch (error: any) {
      alert("Ошибка: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={config.title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="manual-content" className="block text-sm font-medium text-gray-700">{config.label}</label>
          <textarea
            id="manual-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full mt-1 input"
            rows={8}
            placeholder={config.placeholder}
            required
            autoFocus
          />
        </div>
        <div className="pt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
            Отмена
          </button>
          <button type="submit" className="btn-primary w-32" disabled={loading || !content.trim()}>
            {loading ? <Spinner size="sm" /> : config.actionLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ManualToolModal;

import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import { Event } from '../types';
import { Spinner } from './ui/Spinner';

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  onUpdate: (newContent: string) => Promise<void>;
}

const EditEventModal: React.FC<EditEventModalProps> = ({ isOpen, onClose, event, onUpdate }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (event) {
      setContent(event.content);
    }
  }, [event, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    try {
        await onUpdate(content);
        onClose();
    } catch (error: any) {
        alert("Ошибка обновления: " + error.message)
    } finally {
        setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Редактировать комментарий">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="eventContent" className="block text-sm font-medium text-gray-700">Текст комментария</label>
          <textarea
            id="eventContent"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full mt-1 input"
            rows={6}
            required
            autoFocus
          />
        </div>
        <div className="flex justify-end pt-2 gap-2">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>Отмена</button>
          <button type="submit" disabled={loading || !content.trim()} className="btn-primary w-32 flex justify-center">
            {loading ? <Spinner size="sm" /> : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditEventModal;

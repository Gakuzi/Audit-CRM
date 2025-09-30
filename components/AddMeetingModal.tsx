import React, { useState } from 'react';
import Modal from './ui/Modal';
import { supabase } from '../services/supabaseClient';
import { User } from '@supabase/supabase-js';
import { Spinner } from './ui/Spinner';


interface AddMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Fix: Added projectId to the context to ensure it can be saved with the event.
  context: { weekId: string; taskId: string; taskContent: string; projectId: string; };
  user: User | null;
}

const AddMeetingModal: React.FC<AddMeetingModalProps> = ({ isOpen, onClose, context, user }) => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !user) return;
        setLoading(true);

        // Fix: Added project_id to the insert statement to ensure data integrity.
        const { error } = await supabase.from('events').insert({
            project_id: context.projectId,
            week_id: context.weekId,
            task_id: context.taskId,
            user_id: user.id,
            author_email: user.email,
            type: 'meeting',
            content: content.trim(),
        });
        
        if (error) {
            alert('Не удалось назначить встречу: ' + error.message);
        } else {
            handleClose();
        }
        setLoading(false);
    }
    
    const handleClose = () => {
        setContent('');
        onClose();
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Запланировать встречу">
            <p className="text-sm text-gray-500 mb-2">По задаче:</p>
            <p className="text-sm font-semibold bg-gray-100 p-2 rounded-md mb-4">{context.taskContent}</p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="meetingContent" className="block text-sm font-medium text-gray-700">
                        Опишите цель встречи или задайте вопрос
                    </label>
                    <textarea
                        id="meetingContent"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm"
                        rows={4}
                        required
                        autoFocus
                    />
                </div>
                <div className="flex justify-end pt-2">
                     <button type="button" onClick={handleClose} className="mr-2 px-4 py-2 bg-gray-200 rounded-md">Отмена</button>
                     <button type="submit" disabled={loading} className="w-40 flex justify-center py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300">
                        {loading ? <Spinner size="sm" color="border-white" /> : 'Назначить встречу'}
                     </button>
                </div>
            </form>
        </Modal>
  );
};

export default AddMeetingModal;
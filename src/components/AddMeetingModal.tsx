import React, { useState } from 'react';
import Modal from './ui/Modal';
import { supabase } from '../services/supabaseClient';
import { User } from '@supabase/supabase-js';
import { Spinner } from './ui/Spinner';
import { Project, PlanItem } from '../types';

interface AddMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: { weekId: string; taskId: string; projectId: string; };
  user: User | null;
  project: Project;
  task: PlanItem;
}

const AddMeetingModal: React.FC<AddMeetingModalProps> = ({ isOpen, onClose, context, user, task }) => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !user) return;
        setLoading(true);

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
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Запланировать встречу"
            footer={<>
                <button type="button" onClick={handleClose} className="btn-secondary">Отмена</button>
                <button type="submit" form="add-meeting-form" disabled={loading} className="btn-primary w-40 flex justify-center">
                    {loading ? <Spinner size="sm" color="border-white" /> : 'Назначить встречу'}
                </button>
            </>}
        >
            <p className="text-sm text-gray-500 mb-2">По задаче:</p>
            <p className="text-sm font-semibold bg-slate-100 p-2 rounded-md mb-4">{task.title}</p>
            <form id="add-meeting-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="meetingContent" className="label">
                        Опишите цель встречи или задайте вопрос
                    </label>
                    <textarea id="meetingContent" value={content} onChange={(e) => setContent(e.target.value)} className="input" rows={4} required autoFocus />
                </div>
            </form>
        </Modal>
  );
};

export default AddMeetingModal;

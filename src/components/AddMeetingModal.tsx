import React, { useState } from 'react';
import Modal from './ui/Modal';
import { supabase, sendGuestEventNotification } from '../services/supabaseClient';
import { User } from '@supabase/supabase-js';
import { Spinner } from './ui/Spinner';
import { Project, PlanItem } from '../types';


interface AddMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: { weekId: string; taskId: string; taskContent: string; projectId: string; };
  user: User | null;
  project: Project;
  task: PlanItem;
}

const AddMeetingModal: React.FC<AddMeetingModalProps> = ({ isOpen, onClose, context, user, project, task }) => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        setLoading(true);

        try {
            let authorIdentifier = user ? user.email : localStorage.getItem('guestName');
            let isGuestSubmission = !user;

            if (!user && !authorIdentifier) {
                const guestName = prompt('Пожалуйста, представьтесь:', 'Гость');
                if (!guestName || guestName.trim() === '') {
                    setLoading(false);
                    return;
                }
                authorIdentifier = guestName;
                localStorage.setItem('guestName', guestName);
            }

            const { data, error } = await supabase.from('events').insert({
                project_id: context.projectId,
                week_id: context.weekId,
                task_id: context.taskId,
                user_id: user ? user.id : null,
                author_email: authorIdentifier,
                type: 'meeting',
                content: content.trim(),
            }).select().single();
            
            if (error) {
                throw error;
            } else {
                 if (isGuestSubmission && data) {
                    sendGuestEventNotification(project, task, data);
                }
                handleClose();
            }
        } catch(err: any) {
            alert('Не удалось назначить встречу: ' + err.message);
        } finally {
            setLoading(false);
        }
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
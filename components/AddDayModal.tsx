
import React, { useState } from 'react';
import Modal from './ui/Modal';
import { Week, Plan } from '../types';

interface AddDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  week: Week;
  onUpdatePlan: (plan: Plan) => void;
}

const AddDayModal: React.FC<AddDayModalProps> = ({ isOpen, onClose, week, onUpdatePlan }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (date) {
      const newPlan = { ...week.plan };
      if (!newPlan[date]) {
        newPlan[date] = { tasks: [] };
        onUpdatePlan(newPlan);
      } else {
        alert("Этот день уже существует в плане.");
      }
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Добавить день в этап "${week.title}"`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="dayDate" className="block text-sm font-medium text-gray-700">Выберите дату</label>
          <input
            id="dayDate"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full mt-1 input"
            required
          />
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">
            Отмена
          </button>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Добавить день
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddDayModal;

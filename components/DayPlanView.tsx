

import React, { useState } from 'react';
import { Week, Plan, PlanItem, Event, Project } from '../types';
import { FaPlus, FaTrash, FaBrain } from 'react-icons/fa';
import { DAY_NAMES } from '../constants';
import AddPlanItemModal from './AddPlanItemModal';
import PlanItemCard from './PlanItemCard';
import ConfirmationModal from './ConfirmationModal';
import EditPlanItemModal from './EditPlanItemModal';
import DailySummaryModal from './DailySummaryModal';
import { generateDailySummary } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';


interface DayPlanViewProps {
    week: Week;
    onUpdatePlan: (plan: Plan) => void;
    onTaskSelect: (item: PlanItem) => void;
    isAuditor: boolean;
    project: Project;
}

const DayPlanView: React.FC<DayPlanViewProps> = ({ week, onUpdatePlan, onTaskSelect, isAuditor, project }) => {
    const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const [itemToEdit, setItemToEdit] = useState<PlanItem | null>(null);
    const [itemToDelete, setItemToDelete] = useState<{ date: string; item: PlanItem } | null>(null);
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [summaryContent, setSummaryContent] = useState('');
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryDate, setSummaryDate] = useState('');
    
    // Determine if the plan can be modified (add, edit, delete tasks)
    const canEditPlan = isAuditor && week.status === 'draft';
    // Determine if new tasks can be added (e.g., in draft, pending, or approved states)
    const canAddTask = isAuditor && (week.status === 'draft' || week.status === 'approved' || week.status === 'pending_approval');


    const handleAddTaskClick = (date: string) => {
        setSelectedDate(date);
        setIsAddItemModalOpen(true);
    };

    const handleDeleteDay = (date: string) => {
        if (window.confirm(`Вы уверены, что хотите удалить ${date} и все задачи в этот день?`)) {
            const newPlan = { ...week.plan };
            delete newPlan[date];
            onUpdatePlan(newPlan);
        }
    }
    
    const handleUpdateItem = (updatedItem: PlanItem) => {
        const newPlan = { ...week.plan };
        let found = false;
        for (const date in newPlan) {
            const day = newPlan[date];
            const itemIndex = day.tasks.findIndex(t => t.id === updatedItem.id);
            if (itemIndex > -1) {
                day.tasks[itemIndex] = updatedItem;
                found = true;
                break;
            }
        }
        if (found) {
            onUpdatePlan(newPlan);
        }
        setItemToEdit(null);
    }
    
    const handleDeleteItem = () => {
        if (!itemToDelete) return;
        const { date, item } = itemToDelete;
        const newPlan = { ...week.plan };
        newPlan[date].tasks = newPlan[date].tasks.filter(t => t.id !== item.id);
        onUpdatePlan(newPlan);
        setItemToDelete(null);
    }
    
    const handleGenerateSummary = async (date: string) => {
        const tasksForDay = week.plan[date]?.tasks || [];
        if (tasksForDay.length === 0) {
            alert("На этот день нет задач для анализа.");
            return;
        }

        setSummaryDate(date);
        setIsSummaryModalOpen(true);
        setSummaryLoading(true);

        try {
            const taskIds = tasksForDay.map(t => t.id);
            const { data: events, error } = await supabase
                .from('events')
                .select('*')
                .in('task_id', taskIds);
            
            if (error) throw error;
            
            const summary = await generateDailySummary(date, tasksForDay, events as Event[]);
            setSummaryContent(summary);

        } catch (err: any) {
            setSummaryContent(`Ошибка генерации сводки: ${err.message}`);
        } finally {
            setSummaryLoading(false);
        }
    };


    const sortedDates = Object.keys(week.plan).sort();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedDates.map(date => {
                const dayPlan = week.plan[date];
                const dayDate = new Date(date + 'T00:00:00');
                const dayName = DAY_NAMES[dayDate.getDay()];
                
                return (
                    <div key={date} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-3">
                            <div>
                                <h4 className="font-bold">{dayName}</h4>
                                <p className="text-sm text-gray-500">{dayDate.toLocaleDateString('ru-RU')}</p>
                            </div>
                            <div className="flex items-center">
                                {isAuditor && <button onClick={() => handleGenerateSummary(date)} className="p-1 text-gray-400 hover:text-blue-500 mr-2" title="Сводка дня с AI"><FaBrain size={14}/></button>}
                                {canEditPlan && (
                                    <button onClick={() => handleDeleteDay(date)} className="p-1 text-gray-400 hover:text-red-500"><FaTrash size={12}/></button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            {dayPlan.tasks.map(item => (
                                <PlanItemCard 
                                    key={item.id} 
                                    item={item} 
                                    onSelect={() => onTaskSelect(item)}
                                    onEdit={canEditPlan ? () => setItemToEdit(item) : undefined}
                                    onDelete={canEditPlan ? () => setItemToDelete({ date, item }) : undefined}
                                />
                            ))}
                            {canAddTask && (
                                <button onClick={() => handleAddTaskClick(date)} className="w-full text-sm flex items-center justify-center p-2 border-2 border-dashed rounded-md text-gray-500 hover:bg-gray-100 hover:border-gray-400">
                                    <FaPlus className="mr-2" size={12}/> Добавить
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
             {isAddItemModalOpen && (
                <AddPlanItemModal
                    isOpen={isAddItemModalOpen}
                    onClose={() => setIsAddItemModalOpen(false)}
                    onUpdatePlan={onUpdatePlan}
                    week={week}
                    date={selectedDate}
                />
            )}
            {itemToEdit && (
                <EditPlanItemModal 
                    isOpen={!!itemToEdit}
                    onClose={() => setItemToEdit(null)}
                    item={itemToEdit}
                    onUpdateItem={handleUpdateItem}
                />
            )}
             <ConfirmationModal 
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={handleDeleteItem}
                title="Удалить задачу?"
                message="Вы уверены, что хотите удалить эту задачу из плана?"
             />
             <DailySummaryModal
                isOpen={isSummaryModalOpen}
                onClose={() => setIsSummaryModalOpen(false)}
                summary={summaryContent}
                loading={summaryLoading}
                project={project}
                date={summaryDate}
            />
        </div>
    );
};

export default DayPlanView;
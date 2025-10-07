
import React, { useState } from 'react';
import { Week, Plan, PlanItem, Event, Project, CompanyProfile, Profile } from '../types';
import { FaPlus, FaTrash, FaMagic } from 'react-icons/fa';
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
    companyProfile: CompanyProfile | null;
    profile: Profile | null;
    providerToken: string | null;
    onUpdateTask: (updatedTask: PlanItem) => void;
    onContactClick: (contactId: string) => void;
    onContactsUpdate: () => void;
}

const DayPlanView: React.FC<DayPlanViewProps> = ({ week, onUpdatePlan, onTaskSelect, isAuditor, project, companyProfile, profile, providerToken, onUpdateTask, onContactClick, onContactsUpdate }) => {
    const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const [itemToEdit, setItemToEdit] = useState<{ item: PlanItem; date: string } | null>(null);
    const [itemToDelete, setItemToDelete] = useState<{ date: string; item: PlanItem } | null>(null);
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [summaryContent, setSummaryContent] = useState('');
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryDate, setSummaryDate] = useState('');
    
    const canEditPlan = isAuditor && week.status === 'draft';
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
    };
    
    const handleUpdateItem = (updatedItem: PlanItem) => {
        onUpdateTask(updatedItem);
        setItemToEdit(null);
    };
    
    const handleDeleteItem = () => {
        if (!itemToDelete) return;
        const { date, item } = itemToDelete;
        const newPlan = { ...week.plan };
        newPlan[date].tasks = newPlan[date].tasks.filter(t => t.id !== item.id);
        onUpdatePlan(newPlan);
        setItemToDelete(null);
    };

    const handleToggleComplete = (itemToToggle: PlanItem) => {
        if (!isAuditor) return;
        const updatedItem = { ...itemToToggle, completed: !itemToToggle.completed };
        onUpdateTask(updatedItem);
    };
    
    const handleGenerateSummary = async (date: string) => {
        const tasksForDay = week.plan[date]?.tasks || [];
        setSummaryDate(date);
        setIsSummaryModalOpen(true);
        setSummaryLoading(true);
        setSummaryContent('');

        try {
            let events: Event[] = [];
            if (tasksForDay.length > 0) {
                const taskIds = tasksForDay.map(t => t.id);
                const { data, error } = await supabase.from('events').select('*').in('task_id', taskIds);
                if (error) throw error;
                events = data as Event[];
            }
            
            const summary = await generateDailySummary(date, tasksForDay, events);
            setSummaryContent(summary);
        } catch (err: any) {
            setSummaryContent(`### Ошибка генерации сводки\n\nНе удалось получить данные от AI.\n\n\`\`\`\n${err.message}\n\`\`\``);
        } finally {
            setSummaryLoading(false);
        }
    };

    const sortedDates = Object.keys(week.plan).sort();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedDates.map(date => {
                const dayPlan = week.plan[date];
                if (!dayPlan) return null;
                const dayDate = new Date(date + 'T00:00:00');
                const dayName = DAY_NAMES[dayDate.getDay()];
                
                return (
                    <div key={date} className="bg-slate-50 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-3">
                            <div>
                                <h4 className="font-bold">{dayName}</h4>
                                <p className="text-sm text-gray-500">{dayDate.toLocaleDateString('ru-RU')}</p>
                            </div>
                            <div className="flex items-center">
                                {isAuditor && <button onClick={() => handleGenerateSummary(date)} className="p-1 text-purple-600 hover:text-purple-800 mr-2" title="Сводка дня с AI"><FaMagic size={16}/></button>}
                                {canEditPlan && <button onClick={() => handleDeleteDay(date)} className="p-1 text-gray-400 hover:text-red-500"><FaTrash size={12}/></button>}
                            </div>
                        </div>
                        <div className="space-y-2">
                            {dayPlan.tasks.map(item => (
                                <PlanItemCard 
                                    key={item.id} 
                                    item={item} 
                                    contacts={companyProfile?.contacts || []}
                                    onSelect={() => onTaskSelect(item)}
                                    onEdit={canEditPlan ? () => setItemToEdit({ item, date }) : undefined}
                                    onDelete={canEditPlan ? () => setItemToDelete({ date, item }) : undefined}
                                    onToggleComplete={isAuditor ? () => handleToggleComplete(item) : undefined}
                                    onContactClick={onContactClick}
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
             <AddPlanItemModal
                isOpen={isAddItemModalOpen}
                onClose={() => setIsAddItemModalOpen(false)}
                onUpdatePlan={onUpdatePlan}
                week={week}
                date={selectedDate}
                contacts={companyProfile?.contacts || []}
                project={project}
                onContactsUpdate={onContactsUpdate}
                profile={profile}
                providerToken={providerToken}
            />
            {itemToEdit && (
                <EditPlanItemModal 
                    isOpen={!!itemToEdit}
                    onClose={() => setItemToEdit(null)}
                    item={itemToEdit.item}
                    date={itemToEdit.date}
                    onUpdateItem={handleUpdateItem}
                    profile={profile}
                    providerToken={providerToken}
                    contacts={companyProfile?.contacts || []}
                    project={project}
                    onContactsUpdate={onContactsUpdate}
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

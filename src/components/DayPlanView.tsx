import React, { useState } from 'react';
import { Week, Plan, PlanItem, Profile, CompanyProfile } from '../types';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { DAY_NAMES } from '../constants';
import AddPlanItemModal from './AddPlanItemModal';
import PlanItemCard from './PlanItemCard';
import ConfirmationModal from './ConfirmationModal';
import EditPlanItemModal from './EditPlanItemModal';
import * as googleApiService from '../services/googleApiService';


interface DayPlanViewProps {
    week: Week;
    companyProfile: CompanyProfile | null;
    onUpdatePlan: (plan: Plan) => void;
    onTaskSelect: (item: PlanItem) => void;
    isAuditor: boolean;
    onUpdateTask: (updatedTask: PlanItem) => void;
    profile: Profile | null;
    providerToken: string | null;
    onContactClick: (contactId: string) => void;
    onContactsUpdate: () => void;
}

const DayPlanView: React.FC<DayPlanViewProps> = ({ week, companyProfile, onUpdatePlan, onTaskSelect, isAuditor, onUpdateTask, profile, providerToken, onContactClick, onContactsUpdate }) => {
    const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const [itemToEdit, setItemToEdit] = useState<{ date: string; item: PlanItem } | null>(null);
    const [itemToDelete, setItemToDelete] = useState<{ date: string; item: PlanItem } | null>(null);
    
    const contacts = companyProfile?.contacts || [];

    const canEditPlan = isAuditor && week.status === 'draft';
    const canAddTask = isAuditor && (week.status === 'draft' || week.status === 'approved' || week.status === 'pending_approval');
    const canToggleComplete = isAuditor && (week.status === 'approved' || week.status === 'completed');

    const handleAddTaskClick = (date: string) => {
        setSelectedDate(date);
        setIsAddItemModalOpen(true);
    };

    const handleDeleteDay = async (date: string) => {
        if (window.confirm(`Вы уверены, что хотите удалить ${date} и все задачи в этот день?`)) {
            const dayTasks = week.plan[date]?.tasks || [];
            
            if(providerToken && profile?.google_calendar_id) {
                for(const task of dayTasks) {
                    if (task.data?.google_calendar_event_id) {
                        try {
                            await googleApiService.deleteCalendarEvent(providerToken, profile.google_calendar_id, task.data.google_calendar_event_id);
                        } catch (error) {
                            console.error("Failed to delete GCal event:", error);
                            alert("Не удалось удалить связанное событие в Google Календаре. Возможно, его придется удалить вручную.");
                        }
                    }
                }
            }

            const newPlan = { ...week.plan };
            delete newPlan[date];
            onUpdatePlan(newPlan);
        }
    }
    
    const handleUpdateItem = (updatedItem: PlanItem) => {
        onUpdateTask(updatedItem);
        setItemToEdit(null);
    }
    
    const handleDeleteItem = async () => {
        if (!itemToDelete) return;
        const { date, item } = itemToDelete;

        if(item.data?.google_calendar_event_id && providerToken && profile?.google_calendar_id) {
            try {
                await googleApiService.deleteCalendarEvent(providerToken, profile.google_calendar_id, item.data.google_calendar_event_id);
            } catch (error) {
                console.error("Failed to delete GCal event:", error);
                alert("Не удалось удалить связанное событие в Google Календаре. Возможно, его придется удалить вручную.");
            }
        }

        const newPlan = { ...week.plan };
        newPlan[date].tasks = newPlan[date].tasks.filter(t => t.id !== item.id);
        onUpdatePlan(newPlan);
        setItemToDelete(null);
    }

    const handleToggleComplete = (itemToToggle: PlanItem) => {
        const updatedItem = { ...itemToToggle, completed: !itemToToggle.completed };
        onUpdateTask(updatedItem);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.keys(week.plan).sort().map(date => {
                const dayPlan = week.plan[date];
                const dayDate = new Date(date + 'T00:00:00');
                const dayName = DAY_NAMES[dayDate.getDay()];
                
                return (
                    <div key={date} className="bg-white rounded-lg p-3 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                            <div>
                                <h4 className="font-bold">{dayName}</h4>
                                <p className="text-sm text-gray-500">{dayDate.toLocaleDateString('ru-RU')}</p>
                            </div>
                            {canEditPlan && (
                                <button onClick={() => handleDeleteDay(date)} className="p-1 text-gray-400 hover:text-red-500"><FaTrash size={12}/></button>
                            )}
                        </div>
                        <div className="space-y-2">
                            {(dayPlan.tasks || []).map(item => (
                                <PlanItemCard 
                                    key={item.id} 
                                    item={item} 
                                    contacts={contacts}
                                    onSelect={() => onTaskSelect(item)}
                                    onEdit={canEditPlan ? () => setItemToEdit({ date, item }) : undefined}
                                    onDelete={canEditPlan ? () => setItemToDelete({ date, item }) : undefined}
                                    onToggleComplete={canToggleComplete ? () => handleToggleComplete(item) : undefined}
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
            {isAddItemModalOpen && (
                <AddPlanItemModal
                    isOpen={isAddItemModalOpen}
                    onClose={() => setIsAddItemModalOpen(false)}
                    onUpdatePlan={onUpdatePlan}
                    week={week}
                    date={selectedDate}
                    profile={profile}
                    providerToken={providerToken}
                    contacts={contacts}
                    project={week.project_id ? { id: week.project_id } as any : null}
                    onContactsUpdate={onContactsUpdate}
                />
            )}
            {itemToEdit && (
                <EditPlanItemModal 
                    isOpen={!!itemToEdit}
                    onClose={() => setItemToEdit(null)}
                    item={itemToEdit.item}
                    date={itemToEdit.date}
                    onUpdateItem={handleUpdateItem}
                    profile={profile}
                    providerToken={providerToken}
                    contacts={contacts}
                    project={week.project_id ? { id: week.project_id } as any : null}
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
        </div>
    );
};

export default DayPlanView;
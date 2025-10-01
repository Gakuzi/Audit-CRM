import React from 'react';
import { Week } from '../types';
import { FaTasks, FaCheckCircle, FaRegCircle } from 'react-icons/fa';

interface WeekStatsProps {
    week: Week;
}

const WeekStats: React.FC<WeekStatsProps> = ({ week }) => {
    const allTasks = Object.values(week.plan).flatMap(date => date.tasks);
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(task => task.completed).length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Calculate color based on progress: yellow (hsl(48,...)) to green (hsl(120,...))
    const hue = 48 + (progress / 100) * (120 - 48);
    const progressColor = `hsl(${hue}, 85%, 45%)`;


    return (
        <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-700 mb-3">Статистика этапа</h4>
            <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center"><FaTasks className="mr-2 text-gray-500" /> Всего задач</span>
                    <span className="font-bold">{totalTasks}</span>
                </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center"><FaCheckCircle className="mr-2 text-green-500" /> Выполнено</span>
                    <span className="font-bold">{completedTasks}</span>
                </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center"><FaRegCircle className="mr-2 text-yellow-500" /> В работе</span>
                    <span className="font-bold">{totalTasks - completedTasks}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                        className="bg-blue-600 h-2.5 rounded-full transition-all" 
                        style={{ width: `${progress}%`, backgroundColor: progressColor }}
                    ></div>
                </div>
                 <p className="text-right text-sm font-bold text-gray-700">{progress}% Завершено</p>
            </div>
        </div>
    );
};

export default WeekStats;
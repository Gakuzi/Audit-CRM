
import React from 'react';
import { Week } from '../types';
import { FaTasks, FaCheckCircle, FaRegCircle } from 'react-icons/fa';

interface WeekStatsProps {
    week: Week;
}

const WeekStats: React.FC<WeekStatsProps> = ({ week }) => {
    // Fix: Use Object.keys with map to ensure proper type inference for day plans.
    const allTasks = Object.keys(week.plan).flatMap(date => week.plan[date].tasks);
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(task => (task.event_count || 0) > 0).length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return (
        <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-700 mb-3">Статистика этапа</h4>
            <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center"><FaTasks className="mr-2 text-gray-500" /> Всего задач</span>
                    <span className="font-bold">{totalTasks}</span>
                </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center"><FaCheckCircle className="mr-2 text-green-500" /> Выполнено (есть активность)</span>
                    <span className="font-bold">{completedTasks}</span>
                </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center"><FaRegCircle className="mr-2 text-yellow-500" /> В работе</span>
                    <span className="font-bold">{totalTasks - completedTasks}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
                 <p className="text-right text-sm font-bold text-gray-700">{progress}% Завершено</p>
            </div>
        </div>
    );
};

export default WeekStats;

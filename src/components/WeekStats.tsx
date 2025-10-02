import React, { useState } from 'react';
import { Week } from '../types';
import { FaTasks, FaCheckCircle, FaRegCircle, FaChevronDown, FaChevronUp } from 'react-icons/fa';

interface WeekStatsProps {
    week: Week;
}

const WeekStats: React.FC<WeekStatsProps> = ({ week }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const allTasks = Object.keys(week.plan).flatMap(date => week.plan[date]?.tasks || []);
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(task => task.completed).length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Calculate color based on progress: yellow (hsl(48,...)) to green (hsl(120,...))
    const hue = 48 + (progress / 100) * (120 - 48);
    const progressColor = `hsl(${hue}, 85%, 45%)`;


    return (
        <div className="bg-gray-50 rounded-lg p-4 mt-4">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                }}
                className="w-full flex justify-between items-center font-semibold text-gray-700"
            >
                <h4>Статистика этапа</h4>
                {isExpanded ? <FaChevronUp className="text-gray-500" /> : <FaChevronDown className="text-gray-500" />}
            </button>
            {isExpanded && (
                <div className="mt-3 space-y-3">
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
                            className="h-2.5 rounded-full transition-all" 
                            style={{ width: `${progress}%`, backgroundColor: progressColor }}
                        ></div>
                    </div>
                     <p className="text-right text-sm font-bold text-gray-700">{progress}% Завершено</p>
                </div>
            )}
        </div>
    );
};

export default WeekStats;
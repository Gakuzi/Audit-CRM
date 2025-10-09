import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { Project } from '../types';
import ProjectCard from './ProjectCard';
import NewProjectModal from './NewProjectModal';
import { Spinner } from './ui/Spinner';
import { FaPlus } from 'react-icons/fa';
import ConfirmationModal from './ConfirmationModal';


interface DashboardProps {
    user: User | null;
    onSelectProject: (project: Project) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onSelectProject }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);


    const fetchProjects = async () => {
        if (!user) {
            setLoading(false);
            return;
        };
        setLoading(true);
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Ошибка при загрузке проектов:', error.message);
        } else {
            setProjects(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchProjects();
        
        const channel = supabase.channel('public:projects');
        
        if (user) {
            const subscription = channel
                .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, fetchProjects)
                .subscribe();

            return () => {
                supabase.removeChannel(subscription);
            };
        } else {
            supabase.removeChannel(channel);
        }
    }, [user]);

    const handleDeleteProject = async () => {
        if (!projectToDelete) return;

        const { error } = await supabase.from('projects').delete().eq('id', projectToDelete.id);
        if (error) {
            alert('Ошибка при удалении проекта: ' + error.message);
        } else {
            setProjectToDelete(null);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
    }

    if (!user) {
        return (
            <div className="text-center py-16 bg-white rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-gray-700">Добро пожаловать в AuditFlow!</h3>
                <p className="text-gray-500 mt-2">Пожалуйста, войдите в систему, чтобы управлять вашими аудитами.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-end items-center mb-6">
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105"
                >
                    <FaPlus className="mr-2" />
                    Новый аудит
                </button>
            </div>
           
            {projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map(project => (
                        <ProjectCard 
                            key={project.id} 
                            project={project} 
                            onSelect={onSelectProject} 
                            onDelete={user?.id === project.user_id ? () => setProjectToDelete(project) : undefined}
                            isPublicView={false}
                            onLoginRequest={() => {}}
                         />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-white rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold text-gray-700">Аудитов пока нет!</h3>
                    <p className="text-gray-500 mt-2">Начните работу, создав новый план аудита.</p>
                     <button 
                        onClick={() => setIsModalOpen(true)}
                        className="mt-4 flex items-center mx-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
                    >
                       <FaPlus className="mr-2" />
                        Создать первый аудит
                    </button>
                </div>
            )}

            <NewProjectModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                user={user}
            />
            
            <ConfirmationModal
                isOpen={!!projectToDelete}
                onClose={() => setProjectToDelete(null)}
                onConfirm={handleDeleteProject}
                title="Подтвердить удаление"
                message={`Вы уверены, что хотите удалить проект "${projectToDelete?.name}"? Это действие необратимо.`}
            />
        </div>
    );
};

export default Dashboard;
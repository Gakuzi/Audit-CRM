import React from 'react';
import { User } from '@supabase/supabase-js';
import { FaUserCircle } from 'react-icons/fa';
import AuditorHeaderCard from './AuditorHeaderCard';
import CompanyHeaderCard from './CompanyHeaderCard';
import { Project, CompanyProfile, ContactPerson } from '../types';

interface HeaderProps {
    user: User | null;
    project: Project | null;
    companyProfile: CompanyProfile | null;
    isAuditor: boolean;
    isGuest: boolean;
    identifiedGuest: ContactPerson | null;
    onLogin: () => void;
    onProfile: () => void;
    onBack: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, project, companyProfile, isAuditor, isGuest, identifiedGuest, onLogin, onProfile, onBack }) => {
    
    const renderProjectContext = () => {
        if (!project) {
            return null;
        }
        if (isAuditor) {
            return <CompanyHeaderCard project={project} companyProfile={companyProfile} />;
        }
        return <AuditorHeaderCard auditorId={project.user_id} />;
    }

    return (
        <header className="bg-white shadow-md">
            <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={onBack}>
                        <img src="/logo.png" alt="АУДИТ & ПРОЕКТ logo" className="h-10 w-10" />
                        <h1 className="text-xl font-bold text-gray-800 hidden md:block">
                            АУДИТ & ПРОЕКТ
                        </h1>
                    </div>
                    
                    {project && (
                        <>
                            <div className="h-8 w-px bg-gray-200 hidden lg:block"></div>
                            {renderProjectContext()}
                        </>
                    )}
                </div>

                <div>
                    {identifiedGuest ? (
                         <span className="flex items-center text-gray-600">
                           <FaUserCircle className="mr-2 text-gray-400" size={24} />
                           <span className="font-medium">{identifiedGuest.name}</span>
                        </span>
                    ) : isGuest ? (
                        <span className="text-sm font-medium text-gray-600">Гостевой доступ</span>
                    ) : user ? (
                        <button onClick={onProfile} className="flex items-center text-gray-600 hover:text-blue-600">
                           <FaUserCircle className="mr-2" size={24} />
                           <span className="hidden sm:inline">{user.email}</span>
                        </button>
                    ) : (
                        <button onClick={onLogin} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                            Войти
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
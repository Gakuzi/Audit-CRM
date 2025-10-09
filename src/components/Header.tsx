import React from 'react';
import { User } from '@supabase/supabase-js';
import { FaUserCircle } from 'react-icons/fa';
import AuditorHeaderCard from './AuditorHeaderCard';
import CompanyHeaderCard from './CompanyHeaderCard';
import { Project, CompanyProfile, Profile } from '../types';

interface HeaderProps {
    user: User | null;
    profile: Profile | null;
    project: Project | null;
    companyProfile: CompanyProfile | null;
    isAuditor: boolean;
    onLogin: () => void;
    onProfile: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, profile, project, companyProfile, isAuditor, onLogin, onProfile }) => {
    
    const handleLogoClick = () => {
        if (user) {
            window.location.hash = ''; // Go to dashboard if logged in
        } else {
            onLogin(); // Open login modal if not
        }
    };

    const renderProjectContext = () => {
        if (!project) {
            return (
                 <button onClick={handleLogoClick} className="flex items-center gap-3 text-xl font-bold text-gray-800">
                    <img src="https://bwwyovaeqnfqqxjmfkir.supabase.co/storage/v1/object/public/avatars/logo.jpeg" alt="Логотип" className="h-8 w-8 rounded-md" />
                    <span>АУДИТ & ПРОЕКТ</span>
                </button>
            );
        }
        if (isAuditor) {
            // Fix: Pass required onContactSelect prop. This component doesn't have the logic, so we pass a no-op function.
            return <CompanyHeaderCard project={project} companyProfile={companyProfile} onContactSelect={() => {}} />;
        }
        return <AuditorHeaderCard auditorId={project.user_id} />;
    }

    return (
        <header className="bg-white shadow-md">
            <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                {renderProjectContext()}
                <div>
                    {user ? (
                        <button onClick={onProfile} className="flex items-center text-gray-600 hover:text-blue-600">
                           <FaUserCircle className="mr-2" size={24} />
                           <span className="hidden sm:inline">{profile?.full_name || user.email}</span>
                        </button>
                    ) : (
                        <button onClick={onLogin} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                            Войти / Регистрация
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;

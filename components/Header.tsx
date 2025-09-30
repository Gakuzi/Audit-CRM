import React from 'react';
import { User } from '@supabase/supabase-js';
import { FaUserCircle } from 'react-icons/fa';
import AuditorHeaderCard from './AuditorHeaderCard';
import CompanyHeaderCard from './CompanyHeaderCard';
import { Project, CompanyProfile } from '../types';

interface HeaderProps {
    user: User | null;
    project: Project | null;
    companyProfile: CompanyProfile | null;
    isAuditor: boolean;
    onLogin: () => void;
    onProfile: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, project, companyProfile, isAuditor, onLogin, onProfile }) => {
    
    const renderProjectContext = () => {
        if (!project) {
            return (
                 <h1 className="text-2xl font-bold text-gray-800">
                    <span role="img" aria-label="clipboard">📋</span> AuditFlow
                </h1>
            );
        }
        if (isAuditor) {
            return <CompanyHeaderCard project={project} companyProfile={companyProfile} />;
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

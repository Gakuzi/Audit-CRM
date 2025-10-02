import React from 'react';
import { User } from '@supabase/supabase-js';
import { FaUserCircle } from 'react-icons/fa';
import AuditorHeaderCard from './AuditorHeaderCard';
import CompanyHeaderCard from './CompanyHeaderCard';
import { Project, CompanyProfile, ContactPerson, Profile } from '../types';

interface HeaderProps {
    user: User | null;
    profile: Profile | null;
    project: Project | null;
    companyProfile: CompanyProfile | null;
    isAuditor: boolean;
    isGuest: boolean;
    identifiedGuest: ContactPerson | null;
    onLogin: () => void;
    onProfile: () => void;
    onBack: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, profile, project, companyProfile, isAuditor, isGuest, identifiedGuest, onLogin, onProfile, onBack }) => {
    
    const renderUserProfile = () => {
        if (identifiedGuest) {
            return (
                <span className="flex items-center text-gray-600">
                    <FaUserCircle className="mr-2 text-gray-400" size={24} />
                    <span className="font-medium">{identifiedGuest.name}</span>
                </span>
            );
        }
        if (isGuest) {
             return (
                <button onClick={onLogin} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    Войти
                </button>
            );
        }
        if (user) {
            return (
                <button onClick={onProfile} className="flex items-center text-gray-600 hover:text-blue-600">
                    <FaUserCircle className="mr-2" size={24} />
                    <span className="hidden sm:inline">
                        {profile?.full_name && profile.full_name.trim() !== '' ? profile.full_name : user.email}
                    </span>
                </button>
            );
        }
        return (
            <button onClick={onLogin} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                Войти
            </button>
        );
    }
    
    // Dashboard View
    if (!project) {
        return (
            <header className="bg-white shadow-md">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={onBack}>
                        <img src="https://bwwyovaeqnfqqxjmfkir.supabase.co/storage/v1/object/public/avatars/logo.jpeg" alt="АУДИТ & ПРОЕКТ logo" className="h-10 w-10" />
                        <h1 className="text-xl font-bold text-gray-800 hidden md:block">АУДИТ & ПРОЕКТ</h1>
                    </div>
                    <div>{renderUserProfile()}</div>
                </div>
            </header>
        );
    }
    
    // Project View
    return (
        <header className="bg-white shadow-md">
            <div className="container mx-auto px-4 py-3 grid grid-cols-2 md:grid-cols-3 items-center gap-4">
                {/* Left: Company */}
                <div className="flex justify-start">
                    <CompanyHeaderCard project={project} companyProfile={companyProfile} />
                </div>
                {/* Center: Logo */}
                <div className="hidden md:flex justify-center items-center gap-3 cursor-pointer" onClick={onBack}>
                    <img src="https://bwwyovaeqnfqqxjmfkir.supabase.co/storage/v1/object/public/avatars/logo.jpeg" alt="АУДИТ & ПРОЕКТ logo" className="h-10 w-10" />
                    <h1 className="text-xl font-bold text-gray-800">АУДИТ & ПРОЕКТ</h1>
                </div>
                {/* Right: Auditor Profile/Card */}
                <div className="flex justify-end col-start-2 md:col-start-auto">
                    {user && isAuditor ? (
                        <button onClick={onProfile} className="flex items-center text-gray-600 hover:text-blue-600 p-2 rounded-lg hover:bg-gray-100">
                           <FaUserCircle className="mr-2" size={24} />
                           <span className="hidden sm:inline font-semibold">
                               {profile?.full_name && profile.full_name.trim() !== '' ? profile.full_name : user.email}
                           </span>
                        </button>
                    ) : (
                        <AuditorHeaderCard auditorId={project.user_id} />
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;

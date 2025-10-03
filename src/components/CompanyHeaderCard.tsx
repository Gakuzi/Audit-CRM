import React, { useState } from 'react';
import { Project, CompanyProfile } from '../types';
import { FaBuilding, FaChevronDown } from 'react-icons/fa';
import CompanyProfileModal from './CompanyProfileModal';

interface CompanyHeaderCardProps {
    project: Project;
    companyProfile: CompanyProfile | null;
    onContactSelect: (contactId: string) => void;
}

const CompanyHeaderCard: React.FC<CompanyHeaderCardProps> = ({ project, companyProfile, onContactSelect }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const displayName = companyProfile?.company_name || project.name;

    return (
        <>
            <div className="relative">
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-3 text-left p-2 rounded-lg transition-colors hover:bg-slate-100"
                    aria-haspopup="true"
                    aria-expanded={isModalOpen}
                >
                    <FaBuilding className="text-blue-600 text-3xl flex-shrink-0" />
                    <div>
                        <span className="text-xs font-medium text-slate-500 block">Проект</span>
                        <div className="flex items-center gap-1.5">
                            <span className="text-base font-bold text-slate-800 truncate max-w-[200px]">{displayName}</span>
                            <FaChevronDown className={`transition-transform duration-200 text-slate-400 ${isModalOpen ? 'rotate-180' : ''}`} size={14} />
                        </div>
                    </div>
                </button>
            </div>
            <CompanyProfileModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                project={project}
                isAuditor={true}
                onContactSelect={(contactId) => {
                    setIsModalOpen(false);
                    setTimeout(() => onContactSelect(contactId), 150);
                }}
            />
        </>
    );
};

export default CompanyHeaderCard;
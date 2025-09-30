import React, { useState } from 'react';
import { Project, CompanyProfile } from '../types';
import { FaBuilding, FaChevronDown } from 'react-icons/fa';
import CompanyProfileModal from './CompanyProfileModal';

interface CompanyHeaderCardProps {
    project: Project;
    companyProfile: CompanyProfile | null;
}

const CompanyHeaderCard: React.FC<CompanyHeaderCardProps> = ({ project, companyProfile }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const displayName = companyProfile?.company_name || project.name;

    return (
        <>
            <div className="relative">
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center space-x-2 text-xl font-bold text-gray-800 cursor-pointer"
                >
                    <FaBuilding className="text-blue-600" />
                    <span className="truncate max-w-xs">{displayName}</span>
                    <FaChevronDown className="transition-transform duration-200" size={16} />
                </button>
            </div>
            <CompanyProfileModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                project={project}
                isAuditor={true} // This card is only shown to auditors
            />
        </>
    );
};

export default CompanyHeaderCard;


import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Profile } from '../types';
import { FaUserTie, FaEnvelope, FaPhone, FaWhatsapp, FaTelegramPlane, FaChevronDown } from 'react-icons/fa';

interface AuditorHeaderCardProps {
    auditorId: string;
}

const AuditorHeaderCard: React.FC<AuditorHeaderCardProps> = ({ auditorId }) => {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [email, setEmail] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    useEffect(() => {
        const fetchAuditorInfo = async () => {
            setLoading(true);
            
            const profilePromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', auditorId)
                .single();
            
            // This RPC function securely fetches the email from auth.users.
            const emailPromise = supabase.rpc('get_user_email', { user_id_input: auditorId });

            const [profileResult, emailResult] = await Promise.all([profilePromise, emailPromise]);

            if (profileResult.error && profileResult.error.code !== 'PGRST116') {
                console.error("Error fetching profile:", profileResult.error);
            } else {
                setProfile(profileResult.data);
            }

            if (emailResult.error) {
                console.error("Error fetching email:", emailResult.error);
            } else {
                setEmail(emailResult.data);
            }

            setLoading(false);
        };

        if (auditorId) {
            fetchAuditorInfo();
        }
    }, [auditorId]);

    if (loading) {
        return <div className="text-xl font-bold text-gray-800 animate-pulse">Загрузка...</div>;
    }

    const auditorName = profile?.full_name || 'Аудитор';

    return (
        <div className="relative">
            <button 
                onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                className="flex items-center space-x-2 text-xl font-bold text-gray-800 cursor-pointer"
            >
                <FaUserTie className="text-blue-600" />
                <span>{auditorName}</span>
                <FaChevronDown className={`transition-transform duration-200 ${isPopoverOpen ? 'rotate-180' : ''}`} size={16} />
            </button>
            
            {isPopoverOpen && (
                <div 
                    className="absolute top-full mt-2 w-72 bg-white rounded-lg shadow-xl p-4 z-50 border border-gray-200"
                    onMouseLeave={() => setIsPopoverOpen(false)}
                >
                    <h3 className="text-base font-bold text-gray-800 mb-3">Контактная информация</h3>
                    <div className="space-y-3">
                        {email && (
                            <a href={`mailto:${email}`} className="flex items-center text-sm text-blue-600 hover:underline">
                                <FaEnvelope className="mr-2" />
                                Написать на Email
                            </a>
                        )}
                        {profile?.phone && (
                            <a href={`tel:${profile.phone}`} className="flex items-center text-sm text-blue-600 hover:underline">
                                <FaPhone className="mr-2" />
                                {profile.phone}
                            </a>
                        )}
                         {profile?.whatsapp && (
                            <a href={`https://wa.me/${profile.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-green-600 hover:underline">
                                <FaWhatsapp className="mr-2" />
                                Написать в WhatsApp
                            </a>
                        )}
                         {profile?.telegram && (
                            <a href={`https://t.me/${profile.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-sky-600 hover:underline">
                                <FaTelegramPlane className="mr-2" />
                                Написать в Telegram
                            </a>
                        )}
                        {!email && !profile?.phone && !profile?.whatsapp && !profile?.telegram && (
                            <p className="text-sm text-gray-500">Контактные данные не указаны.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditorHeaderCard;

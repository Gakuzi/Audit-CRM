import { useState, useEffect, useCallback } from 'react';
import { supabase } from './services/supabaseClient';
import { User } from '@supabase/supabase-js';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import AuditView from './components/AuditView';
import LoginModal from './components/LoginModal';
import ProfileModal from './components/ProfileModal';
import { Project, CompanyProfile, Profile, ContactPerson } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [providerToken, setProviderToken] = useState<string | null>(null);

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalInitialMode, setLoginModalInitialMode] = useState<'signIn' | 'signUp'>('signIn');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  const [isGuest, setIsGuest] = useState(false);
  const [identifiedGuest, setIdentifiedGuest] = useState<ContactPerson | null>(null);
  const [initialTaskId, setInitialTaskId] = useState<string | null>(null);

  const fetchProfile = useCallback(async (userToFetch: User | null) => {
    if (userToFetch) {
      const { data } = await supabase.from('profiles').select('*').eq('id', userToFetch.id).single();
      setProfile(data as Profile);
    } else {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const sessionResponse = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setProviderToken(session?.provider_token || null);
      fetchProfile(session?.user ?? null);
      if (session?.user) {
        setIsLoginModalOpen(false);
        setIsGuest(false);
        localStorage.removeItem('guestToken');
        localStorage.removeItem('guestName');
      } else {
        const guestToken = localStorage.getItem('guestToken');
        const guestName = localStorage.getItem('guestName');
        if (guestToken && guestName) {
            setIsGuest(true);
        }
      }
    });

    return () => sessionResponse.data.subscription.unsubscribe();
  }, [fetchProfile]);

  useEffect(() => {
    const handleHashChange = async () => {
        // If it's an OAuth redirect, ignore it and let Supabase handle it.
        // It will set the session and then remove the hash, triggering hashchange again.
        if (window.location.hash.includes('access_token=') && window.location.hash.includes('provider_token=')) {
            return; 
        }

        const hash = window.location.hash.replace('#/', '');
        const [projectId, searchParams] = hash.split('?');
        const params = new URLSearchParams(searchParams || '');
        const contactId = params.get('contactId');
        const taskId = params.get('taskId');

        setInitialTaskId(taskId);

        if (projectId) {
            const { data: projectData, error: projectError } = await supabase.from('projects').select('*').eq('id', projectId).single();
            if (projectError) {
                console.error('Project not found:', projectError.message);
                window.location.hash = ''; return;
            }
            setSelectedProject(projectData);

            const { data: companyData } = await supabase.from('company_profiles').select('*').eq('project_id', projectId).single();
            setCompanyProfile(companyData);
            
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setIsGuest(true);
                if (contactId && companyData?.contacts) {
                    const contact = (companyData.contacts as ContactPerson[]).find(c => c.id === contactId);
                    if (contact) {
                        const guestToken = `${projectId}-${contactId}`;
                        localStorage.setItem('guestToken', guestToken);
                        localStorage.setItem('guestName', contact.name);
                        setIdentifiedGuest(contact);
                    }
                } else {
                    const guestToken = localStorage.getItem('guestToken');
                    const storedProjectId = guestToken?.split('-')[0];
                    if (guestToken && storedProjectId === projectId) {
                        const guestName = localStorage.getItem('guestName');
                        if (guestName) setIdentifiedGuest({ name: guestName } as ContactPerson);
                    } else {
                        setIdentifiedGuest(null);
                    }
                }
            } else {
                setIsGuest(false);
                setIdentifiedGuest(null);
            }
        } else {
            setSelectedProject(null);
            setCompanyProfile(null);
            setIsGuest(false);
            setIdentifiedGuest(null);
        }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);


  const handleBackToDashboard = () => {
    window.location.hash = '';
  };
  
  const handleSignOut = async () => {
      await supabase.auth.signOut();
      setIsProfileModalOpen(false);
      handleBackToDashboard();
  };
  
  const handleLoginRequest = (mode: 'signIn' | 'signUp' = 'signIn') => {
      setLoginModalInitialMode(mode);
      setIsLoginModalOpen(true);
  }
  
  const isAuditor = !!user && !!selectedProject && user.id === selectedProject.user_id;

  return (
    <div className="bg-gray-100 min-h-screen">
      <Header 
        user={user}
        profile={profile}
        project={selectedProject}
        companyProfile={companyProfile}
        isAuditor={isAuditor}
        isGuest={isGuest}
        identifiedGuest={identifiedGuest}
        onLogin={() => handleLoginRequest('signIn')}
        onProfile={() => setIsProfileModalOpen(true)}
        onBack={handleBackToDashboard}
      />
      <main className="container mx-auto p-4 md:p-6">
        {selectedProject ? (
          <AuditView 
            project={selectedProject} 
            user={user}
            profile={profile}
            providerToken={providerToken}
            onBack={handleBackToDashboard}
            isAuditor={isAuditor}
            isGuest={isGuest}
            initialTaskId={initialTaskId}
          />
        ) : (
          <Dashboard user={user} onSelectProject={(p) => window.location.hash = `/${p.id}`} onLoginRequest={handleLoginRequest} />
        )}
      </main>

      <LoginModal 
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        initialMode={loginModalInitialMode}
      />

      {user && (
          <ProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            user={user}
            onSignOut={handleSignOut}
            providerToken={providerToken}
          />
      )}
    </div>
  );
}

export default App;
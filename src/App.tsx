// src/App.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from './services/supabaseClient';
import { User, Session } from '@supabase/supabase-js';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import AuditView from './components/AuditView';
import LoginModal from './components/LoginModal';
import ProfileModal from './components/ProfileModal';
import { Project, CompanyProfile, Profile, ContactPerson } from './types';

function App() {
  const [, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [providerToken, setProviderToken] = useState<string | null>(null);

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  const [identifiedGuest, setIdentifiedGuest] = useState<ContactPerson | null>(null);
  const [initialTaskId, setInitialTaskId] = useState<string | null>(null);

  const fetchProfile = useCallback(async (user: User | null) => {
    if (!user) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (error && error.code !== 'PGRST116') console.error('Error fetching profile:', error);
    else setProfile(data);
  }, []);

  useEffect(() => {
    const handleSession = (session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);
        setProviderToken(session?.provider_token ?? null);
        fetchProfile(session?.user ?? null);
        if (session?.user) setIsLoginModalOpen(false);
        else {
            const guestSession = localStorage.getItem('guestSessionToken');
            if (!guestSession) {
                localStorage.removeItem('identifiedGuest');
                setIdentifiedGuest(null);
            }
        }
    }

    supabase.auth.getSession().then(({ data: { session } }) => handleSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => handleSession(session));
    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const handleHashChange = useCallback(async () => {
      const hash = window.location.hash.replace('#/', '');
      const [projectId, queryParams] = hash.split('?');
      const params = new URLSearchParams(queryParams);
      const contactId = params.get('contactId');
      const taskId = params.get('taskId');

      if (taskId) setInitialTaskId(taskId);
      else setInitialTaskId(null);

      if (projectId) {
          const { data, error } = await supabase.from('projects').select('*').eq('id', projectId).single();
          if (data) {
              setSelectedProject(data);
              const { data: companyData } = await supabase.from('company_profiles').select('*').eq('project_id', projectId).single();
              setCompanyProfile(companyData);

              // Guest identification logic
              if (contactId && companyData?.contacts) {
                  const guest = companyData.contacts.find((c: ContactPerson) => c.id === contactId);
                  if (guest) {
                      setIdentifiedGuest(guest);
                      localStorage.setItem('identifiedGuest', JSON.stringify(guest));
                      const guestSessionToken = crypto.randomUUID();
                      localStorage.setItem('guestSessionToken', guestSessionToken);
                  }
              } else if (!user) {
                  const storedGuest = localStorage.getItem('identifiedGuest');
                  if (storedGuest) setIdentifiedGuest(JSON.parse(storedGuest));
              }
          } else {
              if (error && error.code !== 'PGRST116') console.error('Project not found error:', error.message);
              window.location.hash = '';
          }
      } else {
          setSelectedProject(null);
          setCompanyProfile(null);
          setIdentifiedGuest(null);
          localStorage.removeItem('identifiedGuest');
      }
  }, [user]);

  useEffect(() => {
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [handleHashChange]);

  const handleBackToDashboard = () => { window.location.hash = ''; };
  
  const handleSignOut = async () => {
      await supabase.auth.signOut();
      setIsProfileModalOpen(false);
      handleBackToDashboard();
  };
  
  const isAuditor = !!user && !!selectedProject && user.id === selectedProject.user_id;
  const isGuest = !user;

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
        onLogin={() => setIsLoginModalOpen(true)}
        onProfile={() => setIsProfileModalOpen(true)}
        onBack={handleBackToDashboard}
      />
      <main className="container mx-auto p-4 md:p-6">
        {selectedProject ? (
          <AuditView 
            // Fix: Changed 'project' prop to use 'selectedProject' state variable to resolve 'Cannot find name' error.
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
          <Dashboard user={user} onSelectProject={(p) => window.location.hash = `/${p.id}`} onLoginRequest={() => setIsLoginModalOpen(true)} />
        )}
      </main>

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />

      {user && (
          <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} user={user} onSignOut={handleSignOut} />
      )}
    </div>
  );
}

export default App;
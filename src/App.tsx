import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './services/supabaseClient';
import { User } from '@supabase/supabase-js';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import AuditView from './components/AuditView';
import LoginModal from './components/LoginModal';
import ProfileModal from './components/ProfileModal';
import { Project, CompanyProfile, ContactPerson } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [identifiedGuest, setIdentifiedGuest] = useState<ContactPerson | null>(null);
  const [initialTaskId, setInitialTaskId] = useState<string | null>(null);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const findContactInProfile = (profile: CompanyProfile, contactId: string): ContactPerson | null => {
    return profile.contacts?.find(c => c.id === contactId) || null;
  };

  const handleGuestIdentification = useCallback(async (projectId: string, contactId: string | null) => {
    const { data: profile, error } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('project_id', projectId)
        .single();

    if (error || !profile) {
        console.error("Could not fetch company profile for guest ID.", error);
        localStorage.removeItem('guestSessionToken');
        setIdentifiedGuest(null);
        return;
    }

    let foundContact: ContactPerson | null = null;
    if (contactId) { // From URL param
        foundContact = findContactInProfile(profile, contactId);
        if (foundContact) {
            const token = crypto.randomUUID();
            localStorage.setItem('guestSessionToken', token);
            localStorage.setItem('guestContactId', contactId);
            localStorage.setItem('guestProjectId', projectId);
        }
    } else { // From localStorage
        const storedContactId = localStorage.getItem('guestContactId');
        const storedProjectId = localStorage.getItem('guestProjectId');
        if (storedContactId && storedProjectId === projectId) {
            foundContact = findContactInProfile(profile, storedContactId);
        }
    }
    
    if (foundContact) {
        setIdentifiedGuest(foundContact);
        localStorage.setItem('guestName', foundContact.name);
    } else {
        localStorage.clear();
        setIdentifiedGuest(null);
    }
  }, []);
  
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsLoginModalOpen(false);
        setIsGuest(false);
        setIdentifiedGuest(null);
        localStorage.clear();
      }
      // Guest status is handled by hash change
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleHashChange = async () => {
        const hash = window.location.hash.replace('#/', '');
        const [projectId, query] = hash.split('?');
        const params = new URLSearchParams(query);
        const contactId = params.get('contactId');
        const taskId = params.get('taskId');
        setInitialTaskId(taskId);

        const { data: { session } } = await supabase.auth.getSession();

        if (projectId) {
            if (!session) {
                setIsGuest(true);
                await handleGuestIdentification(projectId, contactId);
            } else {
                setIsGuest(false);
                setIdentifiedGuest(null);
            }

            const { data: projectData } = await supabase.from('projects').select('*').eq('id', projectId).single();
            if (projectData) {
              setSelectedProject(projectData);
              const { data: companyData } = await supabase.from('company_profiles').select('*').eq('project_id', projectId).single();
              setCompanyProfile(companyData);
            } else {
              window.location.hash = '';
            }
        } else {
            setSelectedProject(null);
            setCompanyProfile(null);
            setIsGuest(false);
            setIdentifiedGuest(null);
            setInitialTaskId(null);
        }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [handleGuestIdentification]);


  const handleSelectProject = (project: Project) => {
    window.location.hash = `/${project.id}`;
  };

  const handleBackToDashboard = () => {
    window.location.hash = '';
  };
  
  const handleSignOut = async () => {
      await supabase.auth.signOut();
      setIsProfileModalOpen(false);
      handleBackToDashboard();
  };
  
  const isAuditor = !!user && !!selectedProject && user.id === selectedProject.user_id;

  return (
    <div className="bg-gray-100 min-h-screen">
      <Header 
        user={user} 
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
            project={selectedProject} 
            user={user} 
            onBack={handleBackToDashboard}
            isAuditor={isAuditor}
            isGuest={isGuest}
            initialTaskId={initialTaskId}
          />
        ) : (
          <Dashboard user={user} onSelectProject={handleSelectProject} onLoginRequest={() => setIsLoginModalOpen(true)} />
        )}
      </main>

      <LoginModal 
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {user && (
          <ProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            user={user}
            onSignOut={handleSignOut}
          />
      )}
    </div>
  );
}

export default App;
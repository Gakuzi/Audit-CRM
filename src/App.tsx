import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './services/supabaseClient';
import { User } from '@supabase/supabase-js';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import AuditView from './components/AuditView';
import LoginModal from './components/LoginModal';
import ProfileModal from './components/ProfileModal';
import { Project, CompanyProfile, Profile } from './types';

function App() {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  const fetchProfile = useCallback(async (userToFetch: User | null) => {
    if (userToFetch) {
      const { data } = await supabase.from('profiles').select('*').eq('id', userToFetch.id).single();
      setProfile(data as Profile);
    } else {
      setProfile(null);
    }
  }, []);


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      fetchProfile(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      fetchProfile(session?.user ?? null);
      if (session?.user) {
        setIsLoginModalOpen(false);
      }
      
      // Save refresh token on initial sign-in
      if (_event === 'SIGNED_IN' && session?.provider_refresh_token) {
        await supabase
          .from('profiles')
          .update({ google_refresh_token: session.provider_refresh_token })
          .eq('id', session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // Simple hash-based routing
  useEffect(() => {
    const handleHashChange = async () => {
        const hash = window.location.hash.replace('#/', '');
        if (hash) {
            const projectPromise = supabase
                .from('projects')
                .select('*')
                .eq('id', hash)
                .single();
            
            const profilePromise = supabase
                .from('company_profiles')
                .select('*')
                .eq('project_id', hash)
                .single();

            const [projectResult, profileResult] = await Promise.all([projectPromise, profilePromise]);

            if (projectResult.data) {
                setSelectedProject(projectResult.data);
            } else {
                if (projectResult.error && projectResult.error.code !== 'PGRST116') {
                    console.error('Project not found error:', projectResult.error.message);
                }
                window.location.hash = ''; 
            }
            
            if (profileResult.data) {
                setCompanyProfile(profileResult.data);
            } else {
                setCompanyProfile(null); 
            }

        } else {
            setSelectedProject(null);
            setCompanyProfile(null);
        }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); 

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);


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
        profile={profile}
        project={selectedProject}
        companyProfile={companyProfile}
        isAuditor={isAuditor}
        onLogin={() => setIsLoginModalOpen(true)}
        onProfile={() => setIsProfileModalOpen(true)}
      />
      <main className="container mx-auto p-4 md:p-6">
        {selectedProject ? (
          <AuditView 
            project={selectedProject} 
            user={user} 
            onBack={handleBackToDashboard}
            isAuditor={isAuditor}
          />
        ) : (
          <Dashboard user={user} onSelectProject={handleSelectProject} />
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
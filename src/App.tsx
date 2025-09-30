import { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { User } from '@supabase/supabase-js';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
// Fix: Use relative path for component import.
import AuditView from './components/AuditView';
import LoginModal from './components/LoginModal';
import ProfileModal from './components/ProfileModal';
import { Project, CompanyProfile } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [initialTaskId, setInitialTaskId] = useState<string | null>(null);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalMode, setLoginModalMode] = useState<'signIn' | 'signUp'>('signIn');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    const checkSessionAndGuestStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      const hash = window.location.hash.replace('#/', '');
      if (hash && !session) {
        setIsGuest(true);
      } else {
        setIsGuest(false);
      }
    };

    checkSessionAndGuestStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsLoginModalOpen(false); // Close login modal on successful login
        setIsGuest(false); // A logged-in user is never a guest
      } else {
        // If user logs out, check if they are on a project page to enable guest mode
        const hash = window.location.hash.replace('#/', '');
        if (hash) {
          setIsGuest(true);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Simple hash-based routing
  useEffect(() => {
    const handleHashChange = async () => {
        const hash = window.location.hash.replace('#/', '');
        const [projectId, query] = hash.split('?');
        const params = new URLSearchParams(query);
        const taskId = params.get('taskId');
        setInitialTaskId(taskId);


        if (projectId) {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setIsGuest(true);
            }

            const projectPromise = supabase
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .single();
            
            const profilePromise = supabase
                .from('company_profiles')
                .select('*')
                .eq('project_id', projectId)
                .single();

            const [projectResult, profileResult] = await Promise.all([projectPromise, profilePromise]);

            if (projectResult.data) {
                setSelectedProject(projectResult.data);
            } else {
                if (projectResult.error && projectResult.error.code !== 'PGRST116') {
                    console.error('Project not found error:', projectResult.error.message);
                }
                window.location.hash = ''; // Clear hash if project not found
            }
            
            if (profileResult.data) {
                setCompanyProfile(profileResult.data);
            } else {
                setCompanyProfile(null); // Reset if no profile found for the project
            }

        } else {
            setSelectedProject(null);
            setCompanyProfile(null);
            setIsGuest(false);
            setInitialTaskId(null);
        }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Check on initial load

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

  const handleOpenLogin = () => {
    setLoginModalMode('signIn');
    setIsLoginModalOpen(true);
  };

  const handleOpenRegister = () => {
    setLoginModalMode('signUp');
    setIsLoginModalOpen(true);
  }
  
  const isAuditor = !!user && !!selectedProject && user.id === selectedProject.user_id;

  return (
    <div className="bg-gray-100 min-h-screen">
      <Header 
        user={user} 
        project={selectedProject}
        companyProfile={companyProfile}
        isAuditor={isAuditor}
        isGuest={isGuest}
        onLogin={handleOpenLogin}
        onProfile={() => setIsProfileModalOpen(true)}
      />
      <main className="container mx-auto p-4 md:p-6">
        {selectedProject ? (
          <AuditView 
            project={selectedProject} 
            user={user} 
            onBack={handleBackToDashboard}
            isAuditor={isAuditor}
            isGuest={isGuest}
            onRegister={handleOpenRegister}
            initialTaskId={initialTaskId}
          />
        ) : (
          <Dashboard user={user} onSelectProject={handleSelectProject} onLoginRequest={handleOpenLogin} />
        )}
      </main>

      <LoginModal 
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        initialMode={loginModalMode}
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

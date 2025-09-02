import React, { useState, useEffect, useRef } from 'react';
import { KanbanBoard } from './components/KanbanBoard';
import { CreateTaskModal } from './components/CreateTaskModal';
import { CreateProjectModal } from './components/CreateProjectModal';
import { ManageMembersModal } from './components/ManageMembersModal';
import { SunIcon, MoonIcon, BotMessageSquareIcon, PlusIcon, LayoutDashboardIcon, UsersIcon, ArrowLeftIcon, LoaderCircleIcon, MessageCircleIcon } from './components/Icons';
import { useAppState } from './hooks/useAppState';
import { DashboardPage } from './pages/DashboardPage';
import { ResourceManagementPage } from './pages/ResourceManagementPage';
import { LoginPage } from './pages/LoginPage';
import { User } from './types';
import { api } from './services/api';
import { Session } from '@supabase/supabase-js';
import { UserAvatar } from './components/UserAvatar';

type View = 'dashboard' | 'project' | 'resources';

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [view, setView] = useState<View>('dashboard');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [isCreateTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [isManageMembersModalOpen, setManageMembersModalOpen] = useState(false);
  const [projectForMemberManagementId, setProjectForMemberManagementId] = useState<string | null>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  const appState = useAppState(session?.user?.id);
  const { state, loading: appStateLoading, onDragEnd, updateTask, addSubtasks, addComment, addTask, deleteTask, addColumn, deleteColumn, addProject, updateProjectMembers, sendChatMessage } = appState;

  const activeProject = activeProjectId ? state.projects[activeProjectId] : null;
  const projectToManageMembers = projectForMemberManagementId ? state.projects[projectForMemberManagementId] : null;

  useEffect(() => {
    setAuthLoading(true);
    const subscription = api.auth.onAuthStateChange(async (session) => {
        setSession(session);
        if (session?.user) {
            const userProfile = await api.auth.getUserProfile(session.user.id);
            setCurrentUser(userProfile);
        } else {
            setCurrentUser(null);
        }
        setAuthLoading(false);
    });

    return () => {
        subscription.unsubscribe();
    };
}, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleLogout = async () => {
    await api.auth.signOut();
    setIsUserMenuOpen(false);
    setView('dashboard');
    setActiveProjectId(null);
  };

  const handleSelectProject = (projectId: string) => {
    setActiveProjectId(projectId);
    setView('project');
  };

  const handleBackToDashboard = () => {
    setActiveProjectId(null);
    setView('dashboard');
    setIsChatOpen(false); // Close chat when leaving project
  };

  const handleOpenManageMembersModal = (projectId: string) => {
    setProjectForMemberManagementId(projectId);
    setManageMembersModalOpen(true);
  };
  
  const handleCloseManageMembersModal = () => {
    setProjectForMemberManagementId(null);
    setManageMembersModalOpen(false);
  };
  
  const HeaderContent = () => {
    if (view === 'project' && activeProject) {
      return (
         <div className="flex items-center gap-3">
            <button onClick={handleBackToDashboard} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <ArrowLeftIcon className="w-6 h-6"/>
            </button>
            <BotMessageSquareIcon className="w-8 h-8 text-indigo-500" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {activeProject.name}
            </h1>
          </div>
      );
    }
     return (
        <div className="flex items-center gap-3">
            <BotMessageSquareIcon className="w-8 h-8 text-indigo-500" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Gemini Project Board
            </h1>
        </div>
     )
  };

  if (authLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
            <LoaderCircleIcon className="w-12 h-12 animate-spin text-indigo-500"/>
        </div>
    );
  }

  if (!session || !currentUser) {
    return <LoginPage />;
  }
  
  if (appStateLoading) {
     return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
            <LoaderCircleIcon className="w-12 h-12 animate-spin text-indigo-500"/>
            <p className="ml-4 text-lg font-semibold text-slate-700 dark:text-slate-300">Loading your board...</p>
        </div>
    );
  }


  return (
    <>
      <div className="min-h-screen font-sans text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 transition-colors duration-300">
        <header className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center sticky top-0 z-20 flex-wrap gap-4">
          <HeaderContent />

          <nav className="flex items-center gap-2 px-3 py-1.5 bg-slate-200/70 dark:bg-slate-800 rounded-full">
            <button onClick={() => setView('dashboard')} className={`px-3 py-1 text-sm font-semibold rounded-full flex items-center gap-2 ${view === 'dashboard' ? 'bg-white dark:bg-slate-700 shadow' : 'hover:bg-white/50 dark:hover:bg-slate-700/50'}`}><LayoutDashboardIcon className="w-4 h-4" /> Dashboard</button>
            <button onClick={() => setView('resources')} className={`px-3 py-1 text-sm font-semibold rounded-full flex items-center gap-2 ${view === 'resources' ? 'bg-white dark:bg-slate-700 shadow' : 'hover:bg-white/50 dark:hover:bg-slate-700/50'}`}><UsersIcon className="w-4 h-4" /> Resources</button>
          </nav>
          
          <div className="flex items-center gap-4">
            {view === 'project' && (
              <button
                onClick={() => setCreateTaskModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-all"
              >
                <PlusIcon className="w-5 h-5" />
                Create Task
              </button>
            )}
            {view === 'project' && (
              <button
                onClick={() => setIsChatOpen(prev => !prev)}
                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-all"
                aria-label="Toggle project chat"
              >
                <MessageCircleIcon className="w-6 h-6" />
              </button>
            )}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-all"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
            </button>
             <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(prev => !prev)}
                className="focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 rounded-full"
                aria-haspopup="true"
                aria-expanded={isUserMenuOpen}
              >
                <UserAvatar user={currentUser} className="w-9 h-9 ring-2 ring-white/50 dark:ring-slate-800/50" />
              </button>
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 py-1 z-30">
                  <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{currentUser.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{currentUser.role}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          {view === 'dashboard' && (
            <DashboardPage 
              projects={Object.values(state.projects)}
              users={state.users}
              onSelectProject={handleSelectProject}
              onCreateProject={() => setCreateProjectModalOpen(true)}
              onManageMembers={handleOpenManageMembersModal}
            />
          )}
          {view === 'project' && activeProject && (
            <KanbanBoard
              key={activeProject.id}
              boardData={activeProject.board}
              currentUser={currentUser}
              users={Object.values(state.users)}
              onDragEnd={(result) => onDragEnd(activeProject.id, result)}
              updateTask={(task) => updateTask(activeProject.id, task)}
              addSubtasks={(taskId, subtasks, creatorId) => addSubtasks(activeProject.id, taskId, subtasks, creatorId)}
              addComment={(taskId, commentText) => addComment(activeProject.id, taskId, commentText, currentUser)}
              deleteTask={(taskId, columnId) => deleteTask(activeProject.id, taskId, columnId)}
              addColumn={(title) => addColumn(activeProject.id, title)}
              deleteColumn={(columnId) => deleteColumn(activeProject.id, columnId)}
              isChatOpen={isChatOpen}
              onCloseChat={() => setIsChatOpen(false)}
              chatMessages={activeProject.chatMessages}
              onSendMessage={(text) => sendChatMessage(activeProject.id, text, currentUser.id)}
            />
          )}
          {view === 'resources' && (
              <ResourceManagementPage projects={state.projects} users={state.users} />
          )}
        </main>
      </div>
      {isCreateTaskModalOpen && activeProject && (
        <CreateTaskModal
          columns={Object.values(activeProject.board.columns)}
          users={Object.values(state.users)}
          onAddTask={async (taskData) => {
            await addTask(activeProject.id, taskData, currentUser.id);
            setCreateTaskModalOpen(false);
          }}
          onClose={() => setCreateTaskModalOpen(false)}
        />
      )}
       {isCreateProjectModalOpen && (
        <CreateProjectModal
          onAddProject={async (name, description) => {
            await addProject(name, description, currentUser.id);
            setCreateProjectModalOpen(false);
          }}
          onClose={() => setCreateProjectModalOpen(false)}
        />
      )}
      {isManageMembersModalOpen && projectToManageMembers && (
        <ManageMembersModal
            project={projectToManageMembers}
            allUsers={Object.values(state.users)}
            onClose={handleCloseManageMembersModal}
            onSave={async (memberIds) => {
                await updateProjectMembers(projectToManageMembers.id, memberIds);
                handleCloseManageMembersModal();
            }}
        />
      )}
    </>
  );
};

export default App;
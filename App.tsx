

import React, { useState, useEffect, useRef } from 'react';
import { KanbanBoard } from './components/KanbanBoard';
import { CreateTaskModal } from './components/CreateTaskModal';
import { CreateProjectModal } from './components/CreateProjectModal';
import { ManageMembersModal } from './components/ManageMembersModal';
import { SunIcon, MoonIcon, BotMessageSquareIcon, PlusIcon, LayoutDashboardIcon, UsersIcon, ArrowLeftIcon, LoaderCircleIcon, MessageCircleIcon, ClipboardListIcon, SearchIcon, MicrophoneIcon } from './components/Icons';
import { useAppState } from './hooks/useAppState';
import { DashboardPage } from './pages/DashboardPage';
import { ResourceManagementPage } from './pages/ResourceManagementPage';
import { TasksPage } from './pages/TasksPage';
import { LoginPage } from './pages/LoginPage';
import { User, Task, TaskPriority, NewTaskData } from './types';
import { api } from './services/api';
import { Session } from '@supabase/supabase-js';
import { UserAvatar } from './components/UserAvatar';
import { TaskDetailsModal } from './components/TaskDetailsModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { VoiceAssistantModal } from './components/VoiceAssistantModal';
import { interpretVoiceCommand, VoiceCommandAction } from './services/geminiService';
import { DropResult } from 'react-beautiful-dnd';

type View = 'dashboard' | 'project' | 'resources' | 'tasks';

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [view, setView] = useState<View>('dashboard');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [isCreateTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [isManageMembersModalOpen, setManageMembersModalOpen] = useState(false);
  const [projectForMemberManagementId, setProjectForMemberManagementId] = useState<string | null>(null);
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  const [isSearchModalOpen, setSearchModalOpen] = useState(false);
  const [isVoiceAssistantModalOpen, setVoiceAssistantModalOpen] = useState(false);

  const appState = useAppState(session?.user?.id, activeProjectId);
  const { state, loading: appStateLoading, onDragEnd, updateTask, addSubtasks, addComment, addTask, addAiTask, deleteTask, addColumn, deleteColumn, addProject, updateProjectMembers, sendChatMessage } = appState;

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
  
  // Effect to update the modal's task data when the global state changes
  useEffect(() => {
      if (selectedTask) {
          for (const project of Object.values(state.projects)) {
              if (project.board.tasks[selectedTask.id]) {
                  setSelectedTask(project.board.tasks[selectedTask.id]);
                  break;
              }
          }
      }
  }, [state.projects, selectedTask]);

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

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleCloseTaskModal = () => {
    setSelectedTask(null);
  };

  const findProjectForTask = (taskId: string) => {
    return Object.values(state.projects).find(p => p.board.tasks[taskId]);
  };

  const projectForSelectedTask = selectedTask ? findProjectForTask(selectedTask.id) : null;
  const projectMembersForModal = projectForSelectedTask
    ? projectForSelectedTask.members.map(id => state.users[id]).filter(Boolean)
    : [];

  const handleUpdateTask = async (updatedTaskData: Task) => {
    const project = findProjectForTask(updatedTaskData.id);
    if (project) {
        await updateTask(project.id, updatedTaskData);
    }
  };

  const handleAddSubtasks = async (taskId: string, subtasks: { title: string }[]) => {
      const project = findProjectForTask(taskId);
      if (project && currentUser) {
          await addSubtasks(project.id, taskId, subtasks, currentUser.id);
      }
  };

  const handleAddComment = async (taskId: string, commentText: string) => {
        const project = findProjectForTask(taskId);
        if (project && currentUser) {
            await addComment(project.id, taskId, commentText, currentUser);
        }
  };

  const handleVoiceCommand = async (command: string): Promise<string> => {
    if (!command.trim() || !currentUser) {
        return "Sorry, I didn't catch that.";
    }

    // Create a simplified context for the AI
    const context = {
        currentView: view,
        activeProject: activeProject ? { name: activeProject.name, id: activeProject.id } : null,
        projects: Object.values(state.projects).map(p => ({ name: p.name, id: p.id })),
        users: Object.values(state.users).map(u => ({ name: u.name, id: u.id })),
        columns: activeProject ? Object.values(activeProject.board.columns).map(c => ({ name: c.title, id: c.id })) : [],
        tasks: activeProject ? Object.values(activeProject.board.tasks).map(t => ({ title: t.title, id: t.id })) : [],
    };
    
    try {
        const result: VoiceCommandAction = await interpretVoiceCommand(command, context);

        switch (result.action) {
            case 'CREATE_TASK':
                if (!activeProject) {
                    return "You need to be in a project to create a task.";
                }
                const taskData: NewTaskData = {
                    title: result.params.title,
                    description: result.params.description || '',
                    priority: result.params.priority || TaskPriority.MEDIUM,
                    columnId: activeProject.board.columnOrder[0],
                };
                await addTask(activeProject.id, taskData, currentUser.id);
                return `OK, I've created the task "${result.params.title}".`;
            
            case 'MOVE_TASK':
                 if (!activeProject) return "You need to be in a project to move a task.";
                 
                 const taskToMove = Object.values(activeProject.board.tasks).find(t => t.title.toLowerCase() === result.params.taskTitle.toLowerCase());
                 const destColumn = Object.values(activeProject.board.columns).find(c => c.title.toLowerCase() === result.params.targetColumnName.toLowerCase());

                 if (!taskToMove) return `I couldn't find a task named "${result.params.taskTitle}".`;
                 if (!destColumn) return `I couldn't find a column named "${result.params.targetColumnName}".`;

                 const sourceColumn = Object.values(activeProject.board.columns).find(c => c.taskIds.includes(taskToMove.id));
                 if (!sourceColumn) return "I couldn't determine the task's current location.";

                 // FIX: Add `combine: null` to satisfy the DropResult type.
                 const dragResult: DropResult = {
                     draggableId: taskToMove.id,
                     source: { droppableId: sourceColumn.id, index: sourceColumn.taskIds.indexOf(taskToMove.id) },
                     destination: { droppableId: destColumn.id, index: destColumn.taskIds.length },
                     reason: 'DROP',
                     type: 'DEFAULT',
                     mode: 'FLUID',
                     combine: null,
                 };
                 await onDragEnd(activeProject.id, dragResult);
                 return `OK, I've moved "${taskToMove.title}" to ${destColumn.title}.`;

            case 'ASSIGN_TASK':
                if (!activeProject) return "You need to be in a project to assign a task.";

                const taskToAssign = Object.values(activeProject.board.tasks).find(t => t.title.toLowerCase() === result.params.taskTitle.toLowerCase());
                const userToAssign = Object.values(state.users).find(u => u.name.toLowerCase() === result.params.assigneeName.toLowerCase());
                
                if (!taskToAssign) return `I couldn't find a task named "${result.params.taskTitle}".`;
                if (!userToAssign) return `I couldn't find a user named "${result.params.assigneeName}".`;

                const updatedTask = { ...taskToAssign, assignee: userToAssign };
                await updateTask(activeProject.id, updatedTask);
                return `OK, I've assigned "${taskToAssign.title}" to ${userToAssign.name}.`;

            case 'NAVIGATE':
                const dest = result.params.destination.toLowerCase();
                if (['dashboard', 'tasks', 'resources'].includes(dest)) {
                    setView(dest as View);
                    return `Navigating to ${dest}.`;
                } else {
                    const projectToNav = Object.values(state.projects).find(p => p.name.toLowerCase() === dest);
                    if (projectToNav) {
                        handleSelectProject(projectToNav.id);
                        return `Opening project: ${projectToNav.name}.`;
                    }
                    return `I couldn't find a destination called "${dest}".`;
                }
            
            case 'UNKNOWN':
                 return `Sorry, I'm not sure how to help with that. (${result.params.reason})`
            
            default:
                return "Sorry, I didn't understand that command.";
        }
    } catch (error) {
        console.error("Error processing voice command:", error);
        return "I encountered an error trying to understand that.";
    }
};
  
  const HeaderContent = () => {
    if (view === 'project' && activeProject) {
      return (
         <div className="flex items-center gap-3">
            <button onClick={handleBackToDashboard} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
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
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
            <LoaderCircleIcon className="w-12 h-12 animate-spin text-indigo-500"/>
        </div>
    );
  }

  if (!session || !currentUser) {
    return <LoginPage />;
  }
  
  if (appStateLoading) {
     return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
            <LoaderCircleIcon className="w-12 h-12 animate-spin text-indigo-500"/>
            <p className="ml-4 text-lg font-semibold text-slate-700 dark:text-slate-300">Loading your board...</p>
        </div>
    );
  }


  return (
    <>
      <div className="min-h-screen font-sans text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-950 transition-colors duration-300">
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 p-4 flex justify-between items-center sticky top-0 z-20 flex-wrap gap-4">
          <HeaderContent />

          <nav className="flex items-center gap-2 px-3 py-1.5 bg-slate-200/70 dark:bg-slate-900 rounded-full">
            <button onClick={() => setView('dashboard')} className={`px-3 py-1 text-sm font-semibold rounded-full flex items-center gap-2 ${view === 'dashboard' ? 'bg-white dark:bg-slate-800 shadow' : 'hover:bg-white/50 dark:hover:bg-slate-800/50'}`}><LayoutDashboardIcon className="w-4 h-4" /> Dashboard</button>
            <button onClick={() => setView('tasks')} className={`px-3 py-1 text-sm font-semibold rounded-full flex items-center gap-2 ${view === 'tasks' ? 'bg-white dark:bg-slate-800 shadow' : 'hover:bg-white/50 dark:hover:bg-slate-800/50'}`}><ClipboardListIcon className="w-4 h-4" /> Tasks</button>
            <button onClick={() => setView('resources')} className={`px-3 py-1 text-sm font-semibold rounded-full flex items-center gap-2 ${view === 'resources' ? 'bg-white dark:bg-slate-800 shadow' : 'hover:bg-white/50 dark:hover:bg-slate-800/50'}`}><UsersIcon className="w-4 h-4" /> Resources</button>
          </nav>
          
          <div className="flex items-center gap-4">
            {view === 'project' && (
              <button
                onClick={() => setCreateTaskModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950 transition-all"
              >
                <PlusIcon className="w-5 h-5" />
                Create Task
              </button>
            )}
            {view === 'project' && (
              <button
                onClick={() => setIsChatOpen(prev => !prev)}
                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950 transition-all"
                aria-label="Toggle project chat"
              >
                <MessageCircleIcon className="w-6 h-6" />
              </button>
            )}
             <button
                onClick={() => setVoiceAssistantModalOpen(true)}
                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950 transition-all"
                aria-label="Voice Assistant"
            >
                <MicrophoneIcon className="w-6 h-6" />
            </button>
             <button
                onClick={() => setSearchModalOpen(true)}
                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950 transition-all"
                aria-label="Global Search"
            >
                <SearchIcon className="w-6 h-6" />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950 transition-all"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
            </button>
             <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(prev => !prev)}
                className="focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950 rounded-full"
                aria-haspopup="true"
                aria-expanded={isUserMenuOpen}
              >
                <UserAvatar user={currentUser} className="w-9 h-9 ring-2 ring-white/50 dark:ring-slate-900/50" />
              </button>
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 py-1 z-30">
                  <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{currentUser.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{currentUser.role}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
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
              projectId={activeProject.id}
              boardData={activeProject.board}
              currentUser={currentUser}
              users={Object.values(state.users)}
              onTaskClick={handleTaskClick}
              onDragEnd={(result) => onDragEnd(activeProject.id, result)}
              updateTask={(task) => updateTask(activeProject.id, task)}
              addSubtasks={(taskId, subtasks, creatorId) => addSubtasks(activeProject.id, taskId, subtasks, creatorId)}
              addComment={(taskId, commentText) => addComment(activeProject.id, taskId, commentText, currentUser)}
              addAiTask={(prompt) => addAiTask(activeProject.id, prompt)}
              deleteTask={(taskId, columnId) => deleteTask(activeProject.id, taskId, columnId)}
              addColumn={(title) => addColumn(activeProject.id, title)}
              deleteColumn={(columnId) => deleteColumn(activeProject.id, columnId)}
              isChatOpen={isChatOpen}
              onCloseChat={() => setIsChatOpen(false)}
              chatMessages={activeProject.chatMessages}
              onSendMessage={(text) => sendChatMessage(activeProject.id, text, currentUser)}
            />
          )}
          {view === 'tasks' && (
              <TasksPage
                projects={state.projects}
                users={state.users}
                currentUser={currentUser}
                onTaskClick={handleTaskClick}
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
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          currentUser={currentUser}
          users={Object.values(state.users)}
          projectMembers={projectMembersForModal}
          onClose={handleCloseTaskModal}
          onUpdateTask={handleUpdateTask}
          onAddSubtasks={handleAddSubtasks}
          onAddComment={handleAddComment}
        />
      )}
       {isSearchModalOpen && (
        <GlobalSearchModal
            isOpen={isSearchModalOpen}
            onClose={() => setSearchModalOpen(false)}
            projects={state.projects}
            users={state.users}
            onSelectProject={(projectId) => {
                handleSelectProject(projectId);
                setSearchModalOpen(false);
            }}
            onSelectTask={(task) => {
                handleTaskClick(task);
                setSearchModalOpen(false);
            }}
        />
      )}
      {isVoiceAssistantModalOpen && (
          <VoiceAssistantModal
            isOpen={isVoiceAssistantModalOpen}
            onClose={() => setVoiceAssistantModalOpen(false)}
            onCommand={handleVoiceCommand}
          />
      )}
    </>
  );
};

export default App;
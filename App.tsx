

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { KanbanBoard } from './components/KanbanBoard';
import { CreateTaskModal } from './components/CreateTaskModal';
import { CreateProjectModal } from './components/CreateProjectModal';
import { ManageMembersModal } from './components/ManageMembersModal';
import { BotMessageSquareIcon, PlusIcon, LayoutDashboardIcon, UsersIcon, ArrowLeftIcon, LoaderCircleIcon, MessageCircleIcon, ClipboardListIcon, SearchIcon, MicrophoneIcon, SettingsIcon } from './components/Icons';
import { useAppState } from './hooks/useAppState';
import { DashboardPage } from './pages/DashboardPage';
import { TasksPage } from './pages/TasksPage';
import { ResourceManagementPage } from './pages/ResourceManagementPage';
import { LoginPage } from './pages/LoginPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import CallbackPage from './pages/CallbackPage';
import { User, Task, TaskPriority, NewTaskData, Project, Notification, ChatMessage, ProjectLink } from './types';
import { api } from './services/api';
import { Session, RealtimeChannel, AuthChangeEvent } from '@supabase/supabase-js';
import { UserAvatar } from './components/UserAvatar';
import { TaskDetailsModal } from './components/TaskDetailsModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { VoiceAssistantModal } from './components/VoiceAssistantModal';
import { interpretVoiceCommand, VoiceCommandAction } from './services/geminiService';
import { DropResult } from 'react-beautiful-dnd';
import { ManageInviteLinksModal } from './components/ManageInviteLinksModal';
import { SettingsModal } from './components/SettingsModal';
import { NotificationToast } from './components/NotificationToast';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';


type View = 'dashboard' | 'project' | 'tasks' | 'resources' | 'privacy';

const App: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const [previousView, setPreviousView] = useState<View>('dashboard');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [isCreateTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [isManageMembersModalOpen, setManageMembersModalOpen] = useState(false);
  const [projectForMemberManagementId, setProjectForMemberManagementId] = useState<string | null>(null);
  const [isInviteModalOpen, setInviteModalOpen] = useState(false);
  const [projectForInvite, setProjectForInvite] = useState<Project | null>(null);
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [preAuthView, setPreAuthView] = useState<'login' | 'privacy'>('login');

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  const [isSearchModalOpen, setSearchModalOpen] = useState(false);
  const [isVoiceAssistantModalOpen, setVoiceAssistantModalOpen] = useState(false);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);

  // Feature Flags
  const [featureFlags, setFeatureFlags] = useState({
    ai: localStorage.getItem('aiFeaturesEnabled') !== 'false',
    voice: localStorage.getItem('voiceAssistantEnabled') !== 'false',
  });

  const handleFlagsChange = (newFlags: { ai: boolean, voice: boolean }) => {
    setFeatureFlags(newFlags);
    localStorage.setItem('aiFeaturesEnabled', String(newFlags.ai));
    localStorage.setItem('voiceAssistantEnabled', String(newFlags.voice));
  };
  
  // Real-time features
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const chatMessagesRef = useRef<ChatMessage[]>([]);
  const activeProjectIdRef = useRef<string | null>(null);

  const appState = useAppState(session?.user?.id, activeProjectId);
  // FIX: Destructure sendChatMessage and updateProjectMembers from appState to resolve reference errors.
  const { state, loading: appStateLoading, fetchData, onDragEnd, updateTask, addSubtasks, addComment, addTask, addAiTask, deleteTask, addColumn, deleteColumn, addProject, addProjectFromPlan, updateUserProfile, deleteProject, sendChatMessage, updateProjectMembers, addProjectLink, deleteProjectLink } = appState;

  const activeProject = activeProjectId ? state.projects[activeProjectId] : null;
  const projectToManageMembers = projectForMemberManagementId ? state.projects[projectForMemberManagementId] : null;

    useEffect(() => {
        setAuthLoading(true);
        const { data: { subscription } } = api.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
            // Handle password recovery event
            if (_event === 'PASSWORD_RECOVERY') {
                setIsResettingPassword(true);
                setAuthLoading(false); // Stop loading to show reset page
                return;
            } else if (_event !== 'INITIAL_SESSION') {
                setIsResettingPassword(false);
            }

            // Handle email confirmation redirect
            if (session?.user && window.location.pathname === '/callback') {
                window.location.replace('/');
                return; // Stop processing to allow redirect to happen
            }
            
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

    // Effect for Supabase Presence
    useEffect(() => {
      if (session?.user && api.realtime.isConfigured()) {
        const channel = api.realtime.getPresenceChannel();
        presenceChannelRef.current = channel;

        channel.on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState();
          // FIX: Type assertion to handle potential mismatch in Supabase presence state type inference.
          const userIds = Object.keys(presenceState).map(key => (presenceState[key][0] as any).user_id);
          setOnlineUsers(new Set(userIds));
        });

        channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ user_id: session.user.id, online_at: new Date().toISOString() });
          }
        });

        return () => {
          if (presenceChannelRef.current) {
            api.realtime.removeChannel(presenceChannelRef.current);
            presenceChannelRef.current = null;
          }
        };
      }
    }, [session]);
    
    // Effect for Chat Notifications
    const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
      const id = Date.now().toString();
      setNotifications(prev => [...prev, { ...notification, id }]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 5000);
    }, []);

    useEffect(() => {
      if (activeProject && currentUser && isChatOpen === false) {
          if (activeProjectIdRef.current !== activeProject.id) {
              chatMessagesRef.current = activeProject.chatMessages;
              activeProjectIdRef.current = activeProject.id;
              return;
          }

          const previousMessages = chatMessagesRef.current;
          const currentMessages = activeProject.chatMessages;

          if (currentMessages.length > previousMessages.length) {
              const newMessage = currentMessages[currentMessages.length - 1];
              if (newMessage.author.id !== currentUser.id && !previousMessages.some(m => m.id === newMessage.id)) {
                  addNotification({
                      author: newMessage.author,
                      message: newMessage.text,
                      project: activeProject
                  });
              }
          }
          chatMessagesRef.current = currentMessages;
      }
    }, [activeProject, currentUser, isChatOpen, addNotification]);


    // Effect to handle invite link from URL
    useEffect(() => {
        const handleInvite = async () => {
            const token = localStorage.getItem('project_invite_token') || (window.location.pathname.startsWith('/invite/') ? window.location.pathname.split('/invite/')[1] : null);

            if (token && currentUser) {
                localStorage.removeItem('project_invite_token'); // Clear token from storage
                try {
                    const joinedProject = await api.data.acceptInvite(token);
                    alert(`Successfully joined project: ${joinedProject.name}`);
                    await fetchData(); // Refresh data to include the new project
                    handleSelectProject(joinedProject.id);
                } catch (error) {
                    alert(`Failed to accept invite: ${error instanceof Error ? error.message : 'Unknown error'}`);
                } finally {
                    if (window.location.pathname.startsWith('/invite/')) {
                        window.history.replaceState({}, document.title, window.location.origin);
                    }
                }
            } else if (token && !currentUser) {
                // Not logged in, store token and wait for login
                localStorage.setItem('project_invite_token', token);
            }
        };

        handleInvite();
    }, [currentUser, fetchData]);

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

  const handleLogout = async () => {
    await api.auth.signOut();
    setIsUserMenuOpen(false);
    setView('dashboard');
    setActiveProjectId(null);
  };

  const handleSelectProject = useCallback((projectId: string) => {
    setActiveProjectId(projectId);
    setView('project');
  }, []);


  const handleBackToDashboard = useCallback(() => {
    setActiveProjectId(null);
    setView('dashboard');
    setIsChatOpen(false); // Close chat when leaving project
  }, []);

  const handleShowPrivacy = () => {
    setPreviousView(view);
    setView('privacy');
  };

  const handleBackFromPrivacy = () => {
      setView(previousView);
  };


  const handleOpenManageMembersModal = (projectId: string) => {
    setProjectForMemberManagementId(projectId);
    setManageMembersModalOpen(true);
  };
  
  const handleCloseManageMembersModal = () => {
    setProjectForMemberManagementId(null);
    setManageMembersModalOpen(false);
  };

  const handleOpenInviteModal = (project: Project) => {
    setProjectForInvite(project);
    setInviteModalOpen(true);
  };

  const handleCloseInviteModal = () => {
    setProjectForInvite(null);
    setInviteModalOpen(false);
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
        links: activeProject ? activeProject.links.map(l => ({ title: l.title })) : [],
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
            
             case 'OPEN_LINK':
                if (!activeProject) return "You need to be in a project to open a link.";
                const linkTitle = result.params.linkTitle.toLowerCase();
                const linkToOpen = activeProject.links.find(l => l.title.toLowerCase().includes(linkTitle));
                if (linkToOpen) {
                    window.open(linkToOpen.url, '_blank', 'noopener,noreferrer');
                    return `OK, opening "${linkToOpen.title}".`;
                }
                return `I couldn't find a link named "${result.params.linkTitle}".`;

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
  
    const handleResetSuccess = async () => {
        // Sign out the temporary session so the user can log in with their new password
        await api.auth.signOut();
        setIsResettingPassword(false);
    };

  const HeaderContent = () => {
    if (view === 'project' && activeProject) {
      return (
         <div className="flex items-center gap-3">
            <button onClick={handleBackToDashboard} className="p-2 rounded-full hover:bg-gray-800 transition-colors">
                <ArrowLeftIcon className="w-5 h-5"/>
            </button>
            <BotMessageSquareIcon className="w-7 h-7 text-gray-400" />
            <h1 className="text-xl font-bold tracking-tight text-white">
              {activeProject.name}
            </h1>
          </div>
      );
    }
     return (
        <div className="flex items-center gap-3">
            <BotMessageSquareIcon className="w-7 h-7 text-gray-400" />
            <h1 className="text-xl font-bold tracking-tight text-white">
              Gemini Project Board
            </h1>
        </div>
     )
  };

  if (window.location.pathname === '/callback') {
    return <CallbackPage />;
  }
  
  if (isResettingPassword) {
    return <ResetPasswordPage onResetSuccess={handleResetSuccess} />;
  }

  if (authLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#1C2326]">
            <LoaderCircleIcon className="w-10 h-10 animate-spin text-gray-400"/>
        </div>
    );
  }

  if (!session || !currentUser) {
    if (preAuthView === 'privacy') {
        return <PrivacyPolicyPage onBack={() => setPreAuthView('login')} />;
    }
    return <LoginPage onShowPrivacy={() => setPreAuthView('privacy')} />;
  }
  
  if (appStateLoading) {
     return (
        <div className="min-h-screen flex items-center justify-center bg-[#1C2326]">
            <LoaderCircleIcon className="w-10 h-10 animate-spin text-gray-400"/>
            <p className="ml-4 text-base font-semibold text-gray-400">Loading your board...</p>
        </div>
    );
  }

  if (view === 'privacy') {
    return <PrivacyPolicyPage onBack={handleBackFromPrivacy} />;
  }

  return (
    <>
      <div className="min-h-screen font-sans text-gray-300 bg-[#1C2326] transition-colors duration-300">
        <header className="bg-[#131C1B]/80 backdrop-blur-sm border-b border-gray-800 p-4 flex justify-between items-center sticky top-0 z-20 flex-wrap gap-4">
          <HeaderContent />

          <nav className="flex items-center gap-2 px-2 py-1 bg-[#1C2326] rounded-full">
            <button onClick={() => setView('dashboard')} className={`px-3 py-1 text-sm font-medium rounded-full flex items-center gap-2 ${view === 'dashboard' ? 'bg-gray-700 text-white shadow-sm' : 'hover:bg-gray-800/50'}`}><LayoutDashboardIcon className="w-4 h-4" /> Dashboard</button>
            <button onClick={() => setView('tasks')} className={`px-3 py-1 text-sm font-medium rounded-full flex items-center gap-2 ${view === 'tasks' ? 'bg-gray-700 text-white shadow-sm' : 'hover:bg-gray-800/50'}`}><ClipboardListIcon className="w-4 h-4" /> Tasks</button>
            <button onClick={() => setView('resources')} className={`px-3 py-1 text-sm font-medium rounded-full flex items-center gap-2 ${view === 'resources' ? 'bg-gray-700 text-white shadow-sm' : 'hover:bg-gray-800/50'}`}><UsersIcon className="w-4 h-4" /> Resources</button>
          </nav>
          
          <div className="flex items-center gap-2">
            {view === 'project' && (
              <button
                onClick={() => setCreateTaskModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-300 text-black text-sm font-semibold rounded-lg shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#1C2326] transition-all"
              >
                <PlusIcon className="w-4 h-4" />
                New Task
              </button>
            )}
            {view === 'project' && (
              <button
                onClick={() => setIsChatOpen(prev => !prev)}
                className="p-2 rounded-full text-gray-400 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#1C2326] transition-all"
                aria-label="Toggle project chat"
              >
                <MessageCircleIcon className="w-5 h-5" />
              </button>
            )}
            {featureFlags.voice && (
             <button
                onClick={() => setVoiceAssistantModalOpen(true)}
                className="p-2 rounded-full text-gray-400 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#1C2326] transition-all"
                aria-label="Voice Assistant"
            >
                <MicrophoneIcon className="w-5 h-5" />
            </button>
            )}
             <button
                onClick={() => setSearchModalOpen(true)}
                className="p-2 rounded-full text-gray-400 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#1C2326] transition-all"
                aria-label="Global Search"
            >
                <SearchIcon className="w-5 h-5" />
            </button>
             <button
                onClick={() => setSettingsModalOpen(true)}
                className="p-2 rounded-full text-gray-400 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#1C2326] transition-all"
                aria-label="Settings"
            >
                <SettingsIcon className="w-5 h-5" />
            </button>
             <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(prev => !prev)}
                className="focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#1C2326] rounded-full"
                aria-haspopup="true"
                aria-expanded={isUserMenuOpen}
              >
                <UserAvatar user={currentUser} className="w-8 h-8 ring-2 ring-white/20" isOnline={onlineUsers.has(currentUser.id)}/>
              </button>
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#131C1B] rounded-md shadow-lg ring-1 ring-black ring-opacity-5 py-1 z-30">
                  <div className="px-4 py-2 border-b border-gray-800">
                    <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
                    <p className="text-xs text-gray-400">{currentUser.role}</p>
                  </div>
                   <button
                    onClick={() => { setSettingsModalOpen(true); setIsUserMenuOpen(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800"
                  >
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="p-4 sm:p-6">
          {view === 'dashboard' && (
            <DashboardPage 
              projects={Object.values(state.projects)}
              users={state.users}
              onlineUsers={onlineUsers}
              onSelectProject={handleSelectProject}
              onCreateProject={() => setCreateProjectModalOpen(true)}
              onManageMembers={handleOpenManageMembersModal}
              onShareProject={handleOpenInviteModal}
              addProjectFromPlan={addProjectFromPlan}
            />
          )}
          {view === 'project' && activeProject && (
            <KanbanBoard
              key={activeProject.id}
              project={activeProject}
              currentUser={currentUser}
              users={Object.values(state.users)}
              onlineUsers={onlineUsers}
              aiFeaturesEnabled={featureFlags.ai}
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
              addProjectLink={(title, url) => addProjectLink(activeProject.id, title, url, currentUser.id)}
              deleteProjectLink={(linkId) => deleteProjectLink(linkId)}
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
            <ResourceManagementPage
              projects={state.projects}
              users={state.users}
              onlineUsers={onlineUsers}
              onTaskClick={handleTaskClick}
            />
          )}
        </main>
      </div>
       {isSettingsModalOpen && (
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
          currentUser={currentUser}
          onUpdateUser={updateUserProfile}
          featureFlags={featureFlags}
          onFlagsChange={handleFlagsChange}
          projects={Object.values(state.projects)}
          onDeleteProject={async (projectId) => {
            await deleteProject(projectId);
            if (activeProjectId === projectId) {
              handleBackToDashboard();
            }
          }}
          onShowPrivacy={() => {
            setSettingsModalOpen(false);
            handleShowPrivacy();
          }}
        />
      )}
      {isCreateTaskModalOpen && activeProject && (
        <CreateTaskModal
          columns={Object.values(activeProject.board.columns)}
          users={activeProject.members.map(id => state.users[id]).filter(Boolean)}
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
            onlineUsers={onlineUsers}
            onClose={handleCloseManageMembersModal}
            onSave={async (memberIds) => {
                await updateProjectMembers(projectToManageMembers.id, memberIds);
                handleCloseManageMembersModal();
            }}
        />
      )}
       {isInviteModalOpen && projectForInvite && (
        <ManageInviteLinksModal
            project={projectForInvite}
            currentUser={currentUser}
            onClose={handleCloseInviteModal}
        />
      )}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          currentUser={currentUser}
          users={Object.values(state.users)}
          projectMembers={projectMembersForModal}
          onlineUsers={onlineUsers}
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
      {featureFlags.voice && isVoiceAssistantModalOpen && (
          <VoiceAssistantModal
            isOpen={isVoiceAssistantModalOpen}
            onClose={() => setVoiceAssistantModalOpen(false)}
            onCommand={handleVoiceCommand}
          />
      )}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {notifications.map(notification => (
          <NotificationToast key={notification.id} notification={notification} />
        ))}
      </div>
    </>
  );
};

export default App;

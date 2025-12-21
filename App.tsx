
import React, { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext, ReactNode } from 'react';
import { KanbanBoard } from './components/KanbanBoard';
import { CreateTaskModal } from './components/CreateTaskModal';
import { CreateProjectModal } from './components/CreateProjectModal';
import { ManageMembersModal } from './components/ManageMembersModal';
import { AppLogo, BotMessageSquareIcon, PlusIcon, LayoutDashboardIcon, UsersIcon, ArrowLeftIcon, LoaderCircleIcon, MessageCircleIcon, ClipboardListIcon, SearchIcon, MicrophoneIcon, SettingsIcon, RotateCwIcon, LifeBuoyIcon, XIcon } from './components/Icons';
import { useAppState } from './hooks/useAppState';
import { DashboardPage } from './pages/DashboardPage';
import { TasksPage } from './pages/TasksPage';
import { ResourceManagementPage } from './pages/ResourceManagementPage';
import { LoginPage } from './pages/LoginPage';
import { LandingPage } from './components/LandingPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import CallbackPage from './pages/CallbackPage';
// FIX: Import `Column` type to be used in casting.
import { User, Task, TaskPriority, NewTaskData, Project, ChatMessage, FeedbackType, Column, Subtask, AiGeneratedTaskFromFile, Sprint, BugResponse } from './types';
import { api } from './services/api';
import { Session, RealtimeChannel } from '@supabase/supabase-js';
import { UserAvatar } from './components/UserAvatar';
import { TaskDetailsModal } from './components/TaskDetailsModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { VoiceAssistantModal } from './components/VoiceAssistantModal';
import { interpretVoiceCommand, VoiceCommandAction } from './services/geminiService';
import { DropResult } from 'react-beautiful-dnd';
import { ManageInviteLinksModal } from './components/ManageInviteLinksModal';
import { SettingsModal } from './components/SettingsModal';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { FeedbackFab } from './components/FeedbackFab';
import { FeedbackModal } from './components/FeedbackModal';
import { playReceiveSound, playNotificationSound, initAudio } from './utils/sound';

// --- Confirmation Modal ---
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  isConfirming?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', isConfirming = false }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#131C1B] rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-800 transition-colors">
            <XIcon className="w-6 h-6" />
          </button>
        </header>
        <div className="p-6">
          <div className="text-sm text-gray-300">{message}</div>
        </div>
        <footer className="p-4 bg-[#1C2326]/50 rounded-b-xl flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#131C1B] transition-all text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#131C1B] transition-all text-sm disabled:bg-red-400/50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isConfirming && <LoaderCircleIcon className="w-5 h-5 animate-spin" />}
            {isConfirming ? 'Confirming...' : confirmText}
          </button>
        </footer>
      </div>
    </div>
  );
};


type ConfirmationOptions = {
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  confirmText?: string;
};

const ConfirmationContext = createContext<(options: ConfirmationOptions) => void>(() => {});

export const useConfirmation = () => {
  return useContext(ConfirmationContext);
};

const ConfirmationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const requestConfirmation = (newOptions: ConfirmationOptions) => {
    setOptions(newOptions);
  };

  const handleClose = () => {
    if (isConfirming) return;
    setOptions(null);
  };

  const handleConfirm = async () => {
    if (options) {
      setIsConfirming(true);
      try {
        await Promise.resolve(options.onConfirm());
      } catch (e) {
        console.error("Confirmation callback error:", e);
      } finally {
        setIsConfirming(false);
        setOptions(null);
      }
    }
  };

  return (
    <ConfirmationContext.Provider value={requestConfirmation}>
      {children}
      <ConfirmationModal
        isOpen={!!options}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={options?.title || ''}
        message={options?.message || ''}
        confirmText={options?.confirmText}
        isConfirming={isConfirming}
      />
    </ConfirmationContext.Provider>
  );
};


type View = 'dashboard' | 'project' | 'tasks' | 'resources' | 'privacy';

const getLastReadTimestamp = (projectId: string, userId: string): string | null => {
  return localStorage.getItem(`lastReadTimestamp_${userId}_${projectId}`);
};

const setLastReadTimestamp = (projectId: string, userId: string, timestamp: string) => {
  localStorage.setItem(`lastReadTimestamp_${userId}_${projectId}`, timestamp);
};


const AppContent: React.FC = () => {
  const [locationHash, setLocationHash] = useState(window.location.hash);
  
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
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);


  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  const [isSearchModalOpen, setSearchModalOpen] = useState(false);
  const [isVoiceAssistantModalOpen, setVoiceAssistantModalOpen] = useState(false);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);
  const [isFeedbackModalOpen, setFeedbackModalOpen] = useState(false);


  // Navigation function using hash
  const navigate = useCallback((path: string) => {
      // Ensure path starts with a slash
      const safePath = path.startsWith('/') ? path : `/${path}`;
      window.location.hash = safePath;
  }, []);

  // Derive view and active project ID from the URL hash
  const { view, activeProjectId } = useMemo(() => {
    const path = (locationHash.startsWith('#') ? locationHash.substring(1) : locationHash).split('?')[0] || '/';


    if (path.startsWith('/projects/')) {
        const id = path.split('/')[2];
        return { view: 'project' as View, activeProjectId: id };
    }
    if (path === '/tasks') return { view: 'tasks' as View, activeProjectId: null };
    if (path === '/resources') return { view: 'resources' as View, activeProjectId: null };
    if (path === '/privacy') return { view: 'privacy' as View, activeProjectId: null };
    
    return { view: 'dashboard' as View, activeProjectId: null };
  }, [locationHash]);

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
  const chatMessagesRef = useRef<Record<string, ChatMessage[]>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const appState = useAppState(session, currentUser, activeProjectId);
  // FIX: Added `updateProjectMembers` to the destructuring to make it available in the component's scope.
  const { state, loading: appStateLoading, fetchData, onDragEnd, updateTask, addSubtasks, addComment, addTask, addAiTask, deleteTask, addColumn, deleteColumn, addProject, addProjectFromPlan, updateUserProfile, deleteProject, sendChatMessage, addProjectLink, deleteProjectLink, addBug, updateBug, deleteBug, addBugsBatch, deleteBugsBatch, updateProjectMembers, addTasksBatch, addSprint, updateSprint, deleteSprint, bulkUpdateTaskSprint, completeSprint, addFilterSegment, updateFilterSegment, deleteFilterSegment } = appState;

  const hasData = useMemo(() => Object.keys(state.projects).length > 0 || Object.keys(state.users).length > 0, [state]);

  const activeProject = activeProjectId ? state.projects[activeProjectId] : null;
  const projectToManageMembers = projectForMemberManagementId ? state.projects[projectForMemberManagementId] : null;

    // Listen to hash changes
    useEffect(() => {
        const onHashChange = () => {
            setLocationHash(window.location.hash);
        };
        window.addEventListener('hashchange', onHashChange);
        return () => {
            window.removeEventListener('hashchange', onHashChange);
        };
    }, []);

    useEffect(() => {
        // This effect helps prevent race conditions and issues with third-party libraries
        // like react-beautiful-dnd on initial load by ensuring the app is "settled"
        // before rendering complex, stateful components.
        const timer = setTimeout(() => setIsAppReady(true), 50); // Small delay is sufficient
        return () => clearTimeout(timer);
    }, []);

    // Effect 1: Manages the session object and the initial loading state.
    // It's responsible for making sure the "Restoring session..." screen ALWAYS goes away.
    useEffect(() => {
        setIsAuthLoading(true);

        // Check the initial session state when the app loads.
        api.auth.getSession()
            .then(({ data: { session } }) => {
                setSession(session);
            })
            .catch(err => {
                console.error("Error getting initial session:", err);
            })
            .finally(() => {
                setIsAuthLoading(false);
            });

        // Listen for any subsequent changes in auth state (login, logout, etc.).
        const { data: { subscription } } = api.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                setIsResettingPassword(true);
            } else if (isResettingPassword) {
                // Clear the flag on any other event if it was set.
                setIsResettingPassword(false);
            }
            setSession(session);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []); // Runs only once on mount.

    // Effect 2: Reacts to changes in the session to fetch the user's profile.
    // This keeps the profile data in sync with the auth session.
    useEffect(() => {
        // If there's a user object in the session, we need to ensure we have a profile.
        if (session?.user) {
            const resolveUserProfile = async () => {
                try {
                    let userProfile = await api.auth.getUserProfile(session.user.id);
                    // Self-healing: if a user is authenticated but has no profile, create one.
                    if (!userProfile) {
                        console.log("No user profile found, creating one.");
                        userProfile = await api.auth.createUserProfile(session.user!);
                    }
                    setCurrentUser(userProfile);
                } catch (error) {
                    console.error("Error resolving user profile:", error);
                    // If we can't get a profile for a valid session, something is wrong. Sign out.
                    api.auth.signOut();
                }
            };
            resolveUserProfile();
        } else {
            // If the session is null, there is no current user.
            setCurrentUser(null);
        }
    }, [session]); // This should only depend on `session`.

    // Effect for Supabase Presence
    useEffect(() => {
      if (session?.user && api.realtime.isConfigured()) {
        const channel = api.realtime.getPresenceChannel();
        presenceChannelRef.current = channel;

        channel.on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState();
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
    
    useEffect(() => {
      if (activeProject && currentUser) {
          const projectId = activeProject.id;
          const previousMessages = chatMessagesRef.current[projectId] || [];
          const currentMessages = activeProject.chatMessages;
  
          if (currentMessages.length > previousMessages.length) {
              const newMessages = currentMessages.filter(cm => !previousMessages.some(pm => pm.id === cm.id));
  
              newMessages.forEach(newMessage => {
                  if (newMessage.author.id !== currentUser.id) {
                      if (isChatOpen) {
                          playReceiveSound();
                      } else {
                          playNotificationSound();
                          setUnreadCounts(prev => ({
                              ...prev,
                              [projectId]: (prev[projectId] || 0) + 1,
                          }));
                      }
                  }
              });
          }
          chatMessagesRef.current[projectId] = currentMessages;
      }
    }, [activeProject, currentUser, isChatOpen]);

    // Effect to calculate initial unread counts from localStorage on data load
    useEffect(() => {
        if (!currentUser || Object.keys(state.projects).length === 0) return;

        const initialUnreadCounts: Record<string, number> = {};
        for (const project of Object.values(state.projects) as Project[]) {
            const lastRead = getLastReadTimestamp(project.id, currentUser.id);
            // Count messages that are not from the current user and are newer than the last read timestamp.
            const unreadCount = project.chatMessages.filter(
                msg => msg.author.id !== currentUser.id && new Date(msg.createdAt).getTime() > new Date(lastRead || 0).getTime()
            ).length;
            if (unreadCount > 0) {
                initialUnreadCounts[project.id] = unreadCount;
            }
        }
        setUnreadCounts(initialUnreadCounts);
    }, [state.projects, currentUser]);


    // Effect to handle invite link from URL
    useEffect(() => {
        const handleInvite = async () => {
            const token = localStorage.getItem('project_invite_token') || (window.location.pathname.startsWith('/invite/') ? window.location.pathname.split('/invite/')[1] : null);

            if (token && currentUser) {
                localStorage.removeItem('project_invite_token'); 
                try {
                    const joinedProject = await api.data.acceptInvite(token);
                    // Can't use alert, will just log.
                    console.log(`Successfully joined project: ${joinedProject.name}`);
                    // Force a full page reload by adding a query parameter. This ensures the new project
                    // data is fetched correctly and avoids race conditions where the database update from
                    // accepting the invite hasn't propagated before the app's state is re-fetched.
                    window.location.assign(`/?c=${Date.now()}#/projects/${joinedProject.id}`);
                } catch (error) {
                    console.error(`Failed to accept invite: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    if (window.location.pathname.startsWith('/invite/')) {
                       window.location.assign('/#/'); // Redirect home on failure
                    }
                }
            } else if (token && !currentUser) {
                localStorage.setItem('project_invite_token', token);
                if (window.location.pathname.startsWith('/invite/')) {
                    // Redirect to login page, the token is saved.
                    window.location.assign('/#/');
                }
            }
        };

        handleInvite();
    }, [currentUser]);

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
          // FIX: Cast Object.values to the correct type to avoid type inference issues.
          for (const project of Object.values(state.projects) as Project[]) {
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
    navigate('/');
  };

  const handleSelectProject = useCallback((projectId: string) => {
    navigate(`/projects/${projectId}`);
  }, [navigate]);


  const handleBackToDashboard = useCallback(() => {
    setIsChatOpen(false); 
    navigate('/');
  }, [navigate]);
  
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
    // FIX: Cast Object.values to the correct type to avoid type inference issues.
    return (Object.values(state.projects) as Project[]).find(p => p.board.tasks[taskId]);
  };

  const projectForSelectedTask = selectedTask ? findProjectForTask(selectedTask.id) : null;
  const projectMembersForModal = projectForSelectedTask
    ? projectForSelectedTask.members.map(id => state.users[id]).filter(Boolean)
    : [];
  
  const allProjectTagsForModal = useMemo(() => {
    if (!projectForSelectedTask) return [];
    const tags = new Set<string>();
    // FIX: Cast Object.values to the correct type to avoid type inference issues.
    (Object.values(projectForSelectedTask.board.tasks) as Task[]).forEach(task => {
        task.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [projectForSelectedTask]);

  const handleUpdateTask = async (updatedTaskData: Task) => {
    const project = findProjectForTask(updatedTaskData.id);
    if (project) {
        await updateTask(project.id, updatedTaskData);
    }
  };

  const handleAddSubtasks = async (taskId: string, subtasks: Partial<Subtask>[]) => {
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

    const context = {
        currentView: view,
        activeProject: activeProject ? { name: activeProject.name, id: activeProject.id } : null,
        // FIX: Cast Object.values results to avoid type errors.
        projects: (Object.values(state.projects) as Project[]).map(p => ({ name: p.name, id: p.id })),
        users: (Object.values(state.users) as User[]).map(u => ({ name: u.name, id: u.id })),
        columns: activeProject ? (Object.values(activeProject.board.columns) as Column[]).map(c => ({ name: c.title, id: c.id })) : [],
        tasks: activeProject ? (Object.values(activeProject.board.tasks) as Task[]).map(t => ({ title: t.title, id: t.id })) : [],
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
                 if (!result.params.taskTitle || !result.params.targetColumnName) {
                    return "I'm not sure which task to move or where to move it. Please be more specific.";
                 }
                 
                 // FIX: Cast Object.values results to avoid type errors.
                 const taskToMove = (Object.values(activeProject.board.tasks) as Task[]).find(t => t.title.toLowerCase() === result.params.taskTitle.toLowerCase());
                 const destColumn = (Object.values(activeProject.board.columns) as Column[]).find(c => c.title.toLowerCase() === result.params.targetColumnName.toLowerCase());

                 if (!taskToMove) return `I couldn't find a task named "${result.params.taskTitle}".`;
                 if (!destColumn) return `I couldn't find a column named "${result.params.targetColumnName}".`;

                 // FIX: Cast Object.values results to avoid type errors.
                 const sourceColumn = (Object.values(activeProject.board.columns) as Column[]).find(c => c.taskIds.includes(taskToMove.id));
                 if (!sourceColumn) return "I couldn't determine the task's current location.";

                 const dragResult: DropResult = {
                     draggableId: taskToMove.id,
                     source: { droppableId: sourceColumn.id, index: sourceColumn.taskIds.indexOf(taskToMove.id) },
                     // FIX: Use destColumn.id and default index 0 for the destination to fix missing variable errors.
                     destination: { droppableId: destColumn.id, index: 0 },
                     reason: 'DROP',
                     type: 'DEFAULT',
                     mode: 'FLUID',
                     combine: null,
                 };
                 await onDragEnd(activeProject.id, dragResult);
                 return `OK, I've moved "${taskToMove.title}" to ${destColumn.title}.`;

            case 'ASSIGN_TASK':
                if (!activeProject) return "You need to be in a project to assign a task.";
                if (!result.params.taskTitle || !result.params.assigneeName) {
                    return "I'm not sure which task to assign or who to assign it to. Please be more specific.";
                }
                // FIX: Cast Object.values results to avoid type errors.
                const taskToAssign = (Object.values(activeProject.board.tasks) as Task[]).find(t => t.title.toLowerCase() === result.params.taskTitle.toLowerCase());
                const userToAssign = (Object.values(state.users) as User[]).find(u => u.name.toLowerCase() === result.params.assigneeName.toLowerCase());
                
                if (!taskToAssign) return `I couldn't find a task named "${result.params.taskTitle}".`;
                if (!userToAssign) return `I couldn't find a user named "${result.params.assigneeName}".`;

                const updatedTask = { ...taskToAssign, assignee: userToAssign };
                await updateTask(activeProject.id, updatedTask);
                return `OK, I've assigned "${taskToAssign.title}" to ${userToAssign.name}.`;

            case 'NAVIGATE':
                if (!result.params.destination) {
                    return "I'm not sure where you want to go. Please specify a destination.";
                }
                const dest = result.params.destination.toLowerCase();
                if (dest === 'dashboard') { navigate('/'); return `Navigating to dashboard.`; }
                if (dest === 'tasks') { navigate('/tasks'); return `Navigating to tasks.`; }
                if (dest === 'resources') { navigate('/resources'); return `Navigating to resources.`; }
                if (dest === 'bugs') { navigate('/bugs'); return `Navigating to bug tracker.`; }
                
                // FIX: Cast Object.values results to avoid type errors.
                const projectToNav = (Object.values(state.projects) as Project[]).find(p => p.name.toLowerCase() === dest);
                if (projectToNav) {
                    navigate(`/projects/${projectToNav.id}`);
                    return `Opening project: ${projectToNav.name}.`;
                }
                return `I couldn't find a destination called "${result.params.destination}".`;
            
             case 'OPEN_LINK':
                if (!activeProject) return "You need to be in a project to open a link.";
                if (!result.params.linkTitle) {
                    return "I'm not sure which link you want to open. Please specify a title.";
                }
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
        // After password is successfully reset, sign out to force re-login.
        await api.auth.signOut();
        // The onAuthStateChange listener will handle setting the user/session to null,
        // and isResettingPassword is now handled within that listener as well.
    };
    
    const handleFeedbackSubmit = async (feedbackData: {
      type: FeedbackType;
      title: string;
      description: string;
      contextData: { url: string; userAgent: string; };
    }) => {
      if (!currentUser) {
        throw new Error("You must be logged in to submit feedback.");
      }
      await api.data.submitFeedback({ ...feedbackData, userId: currentUser.id });
    };

  const HeaderContent = () => {
    if (view === 'project' && activeProject) {
      return (
         <div className="flex items-center gap-3">
            <button onClick={handleBackToDashboard} className="p-2 rounded-full hover:bg-gray-800 transition-colors">
                <ArrowLeftIcon className="w-5 h-5"/>
            </button>
            <AppLogo className="w-7 h-7" />
            <h1 className="text-lg font-bold tracking-tight text-white">
              {activeProject.name}
            </h1>
          </div>
      );
    }
    if (view === 'privacy' && currentUser) {
        return (
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-gray-800 transition-colors" aria-label="Back to dashboard">
                    <ArrowLeftIcon className="w-5 h-5"/>
                </button>
                <h1 className="text-lg font-bold tracking-tight text-white">
                    Privacy Policy
                </h1>
            </div>
        );
    }
     return (
        <div className="flex items-center gap-3">
            <AppLogo className="w-7 h-7" />
            <h1 className="text-lg font-bold tracking-tight text-white">
              Graphynovus
            </h1>
        </div>
     )
  };

  const unreadCount = activeProjectId ? unreadCounts[activeProjectId] || 0 : 0;
  
  // This state prevents the login page from flashing on refresh for logged-in users.
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1C2326]">
        <LoaderCircleIcon className="w-10 h-10 animate-spin text-gray-400"/>
        <p className="ml-4 text-sm font-semibold text-gray-400">Restoring your session...</p>
      </div>
    );
  }

  if (window.location.pathname === '/callback') {
    return <CallbackPage />;
  }
  
  if (isResettingPassword) {
    return <ResetPasswordPage onResetSuccess={handleResetSuccess} />;
  }

  if (!session || !currentUser) {
    if (view === 'privacy') {
        return <PrivacyPolicyPage isEmbedded={false} onBack={() => navigate('/')} />;
    }
    return <LandingPage onShowPrivacy={() => navigate('/privacy')} />;
  }

  return (
    <>
      <div onClick={initAudio} className="min-h-screen font-sans text-gray-300 bg-[#1C2326] transition-colors duration-300">
        <header className="bg-[#131C1B]/80 backdrop-blur-sm border-b border-gray-800 p-4 flex justify-between items-center sticky top-0 z-30 flex-wrap gap-4">
          <HeaderContent />

          <nav className="flex items-center gap-2 px-2 py-1 bg-[#1C2326] rounded-full">
            <button onClick={() => navigate('/')} className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-2 ${view === 'dashboard' ? 'bg-gray-700 text-white shadow-sm' : 'hover:bg-gray-800/50'}`}><LayoutDashboardIcon className="w-4 h-4" /> Dashboard</button>
            <button onClick={() => navigate('/tasks')} className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-2 ${view === 'tasks' ? 'bg-gray-700 text-white shadow-sm' : 'hover:bg-gray-800/50'}`}><ClipboardListIcon className="w-4 h-4" /> Tasks</button>
            <button onClick={() => navigate('/resources')} className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-2 ${view === 'resources' ? 'bg-gray-700 text-white shadow-sm' : 'hover:bg-gray-800/50'}`}><UsersIcon className="w-4 h-4" /> Resources</button>
          </nav>
          
          <div className="flex items-center gap-2">
            {view === 'project' && (
              <button
                onClick={() => setCreateTaskModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-300 text-black text-xs font-semibold rounded-lg shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#1C2326] transition-all"
              >
                <PlusIcon className="w-4 h-4" />
                New Task
              </button>
            )}
            {view === 'project' && (
              <div className="relative">
                <button
                  onClick={() => {
                      const wasOpen = isChatOpen;
                      setIsChatOpen(!wasOpen);
                      if (!wasOpen && activeProjectId && activeProject && currentUser) {
                          setUnreadCounts(prev => ({ ...prev, [activeProjectId]: 0 }));
                          // Get the timestamp of the very last message in the chat
                          const latestMessage = activeProject.chatMessages.length > 0
                              ? activeProject.chatMessages[activeProject.chatMessages.length - 1]
                              : null;
                          // Store its timestamp, or the current time if no messages exist.
                          const timestampToStore = latestMessage ? latestMessage.createdAt : new Date().toISOString();
                          setLastReadTimestamp(activeProjectId, currentUser.id, timestampToStore);
                      }
                  }}
                  className="p-2 rounded-full text-gray-400 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#1C2326] transition-all"
                  aria-label="Toggle project chat"
                >
                  <MessageCircleIcon className="w-5 h-5" />
                </button>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white pointer-events-none">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
              </div>
            )}
            <button
                onClick={() => fetchData()}
                disabled={appStateLoading}
                className="p-2 rounded-full text-gray-400 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#1C2326] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Refresh data"
            >
                <RotateCwIcon className={`w-5 h-5 ${appStateLoading ? 'animate-spin' : ''}`} />
            </button>
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
                    <p className="text-xs font-medium text-white truncate">{currentUser.name}</p>
                    <p className="text-[11px] text-gray-400">{currentUser.role}</p>
                  </div>
                   <button
                    onClick={() => { setSettingsModalOpen(true); setIsUserMenuOpen(false); }}
                    className="block w-full text-left px-4 py-2 text-xs text-white hover:bg-gray-800"
                  >
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-xs text-white hover:bg-gray-800"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="p-4 sm:p-6">
          {appStateLoading && !hasData ? (
            <div className="flex items-center justify-center pt-20">
              <LoaderCircleIcon className="w-10 h-10 animate-spin text-gray-400"/>
              <p className="ml-4 text-sm font-semibold text-gray-400">Loading your data...</p>
            </div>
          ) : (
            <>
              {view === 'dashboard' && currentUser && (
                <DashboardPage 
                  projects={Object.values(state.projects)}
                  users={state.users}
                  currentUser={currentUser}
                  onlineUsers={onlineUsers}
                  onSelectProject={handleSelectProject}
                  onCreateProject={() => setCreateProjectModalOpen(true)}
                  onManageMembers={handleOpenManageMembersModal}
                  onShareProject={handleOpenInviteModal}
                  addProjectFromPlan={addProjectFromPlan}
                />
              )}
              {view === 'project' && activeProject && isAppReady && (
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
                  addBug={addBug}
                  updateBug={updateBug}
                  deleteBug={deleteBug}
                  // FIX: Wrap addBugsBatch to provide the active project's ID.
                  addBugsBatch={(bugs) => addBugsBatch(activeProject.id, bugs)}
                  deleteBugsBatch={deleteBugsBatch}
                  addTasksBatch={(tasks, sprintId) => addTasksBatch(activeProject.id, tasks, sprintId)}
                  addSprint={(sprintData) => addSprint(activeProject.id, sprintData)}
                  updateSprint={(sprintId, updates) => updateSprint(activeProject.id, sprintId, updates)}
                  deleteSprint={(sprintId) => deleteSprint(activeProject.id, sprintId)}
                  bulkUpdateTaskSprint={(taskIds, sprintId) => bulkUpdateTaskSprint(taskIds, sprintId)}
                  completeSprint={(sprintId, moveToSprintId) => completeSprint(sprintId, moveToSprintId)}
                  addFilterSegment={(name, filters) => addFilterSegment(activeProject.id, name, filters, currentUser.id)}
                  updateFilterSegment={(segmentId, updates) => updateFilterSegment(segmentId, updates)}
                  deleteFilterSegment={(segmentId) => deleteFilterSegment(segmentId)}
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
              {view === 'privacy' && (
                  <PrivacyPolicyPage isEmbedded={true} />
              )}
              {view === 'project' && !activeProject && (
                <div className="text-center pt-20 text-gray-400">
                  <h2 className="text-lg font-bold text-white">Project Not Found</h2>
                  <p className="mt-2">The project may have been deleted or you don't have access.</p>
                  <button 
                    onClick={handleBackToDashboard} 
                    className="mt-6 px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#1C2326] transition-all text-xs"
                  >
                    Go to Dashboard
                  </button>
                </div>
              )}
            </>
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
            navigate('/privacy');
          }}
        />
      )}
      {isCreateTaskModalOpen && activeProject && (
        <CreateTaskModal
          columns={Object.values(activeProject.board.columns)}
          users={activeProject.members.map(id => state.users[id]).filter(Boolean)}
          sprints={activeProject.sprints}
          onAddTask={async (taskData) => {
            await addTask(activeProject.id, taskData, currentUser.id);
            setCreateTaskModalOpen(false);
          }}
          // FIX: The type for new sprint data should not include properties that are auto-generated by the database, like `status`.
          onAddSprint={async (sprintData: Omit<Sprint, 'id' | 'projectId' | 'createdAt' | 'status' | 'isDefault'> & { isDefault?: boolean; }) => {
             return await addSprint(activeProject.id, sprintData);
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
      {selectedTask && projectForSelectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          currentUser={currentUser}
          users={Object.values(state.users)}
          projectMembers={projectMembersForModal}
          allProjectTags={allProjectTagsForModal}
          sprints={projectForSelectedTask.sprints}
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
                navigate(`/projects/${projectId}`);
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
      {view === 'dashboard' && !isChatOpen && <FeedbackFab onClick={() => setFeedbackModalOpen(true)} />}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        onSubmit={handleFeedbackSubmit}
      />
    </>
  );
};

const App: React.FC = () => {
  return (
    <ConfirmationProvider>
      <AppContent />
    </ConfirmationProvider>
  );
};

export default App;

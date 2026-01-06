
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { AppState, User, Project, Task, NewTaskData, Subtask, ChatMessage, TaskPriority, Bug, BugResponse, AiGeneratedTaskFromFile, Sprint, FilterSegment, FeedbackType } from './types';
import { useAppState } from './hooks/useAppState';
import { api } from './services/api';
import { LandingPage } from './components/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { KanbanBoard } from './components/KanbanBoard';
import { TasksPage } from './pages/TasksPage';
import { ResourceManagementPage } from './pages/ResourceManagementPage';
import { BugsPage } from './pages/BugsPage';
import { SettingsModal } from './components/SettingsModal';
import { CreateProjectModal } from './components/CreateProjectModal';
import { CreateTaskModal } from './components/CreateTaskModal';
import { TaskDetailsModal } from './components/TaskDetailsModal';
import { ManageMembersModal } from './components/ManageMembersModal';
import { ManageInviteLinksModal } from './components/ManageInviteLinksModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { VoiceAssistantModal } from './components/VoiceAssistantModal';
import { FeedbackFab } from './components/FeedbackFab';
import { FeedbackModal } from './components/FeedbackModal';
import { NotificationToast } from './components/NotificationToast';
import { AppLogo, SearchIcon, BotMessageSquareIcon, LogOutIcon, SettingsIcon, MessageSquareIcon, RotateCwIcon, ArrowLeftIcon } from './components/Icons';
import { Session } from '@supabase/supabase-js';
import { interpretVoiceCommand } from './services/geminiService';

// --- CONTEXT ---
interface ConfirmationContextType {
  confirm: (options: { title: string; message: React.ReactNode; onConfirm: () => void; confirmText?: string }) => void;
}
const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);
export const useConfirmation = () => {
  const context = useContext(ConfirmationContext);
  if (!context) throw new Error('useConfirmation must be used within a ConfirmationProvider');
  return context.confirm;
};

type View = 'dashboard' | 'tasks' | 'resources' | 'bugs';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isJoiningProject, setIsJoiningProject] = useState(false);
  
  // BYOK & Feature Flags
  const [featureFlags, setFeatureFlags] = useState({
    ai: localStorage.getItem('aiFeaturesEnabled') === 'true' && !!localStorage.getItem('user_gemini_api_key'),
    voice: localStorage.getItem('voiceAssistantEnabled') === 'true' && !!localStorage.getItem('user_gemini_api_key'),
  });

  const { state, loading, fetchData, onDragEnd, updateTask, addSubtasks, addComment, addAiTask, addTask, addTasksBatch, deleteTask, addColumn, deleteColumn, addProject, addProjectFromPlan, deleteProject, updateUserProfile, updateProjectMembers, sendChatMessage, addProjectLink, deleteProjectLink, addBug, updateBug, deleteBug, addBugsBatch, deleteBugsBatch, addSprint, updateSprint, deleteSprint, bulkUpdateTaskSprint, completeSprint, addFilterSegment, updateFilterSegment, deleteFilterSegment } = useAppState(session, currentUser, activeProjectId);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
  const [memberProjectId, setMemberProjectId] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareProject, setShareProject] = useState<Project | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<{ title: string; message: React.ReactNode; onConfirm: () => void; confirmText: string } | null>(null);

  useEffect(() => {
    api.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = api.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      api.auth.getUserProfile(session.user.id).then(profile => {
        if (profile) setCurrentUser(profile);
        else api.auth.createUserProfile(session.user).then(setCurrentUser);
      });
    } else {
      setCurrentUser(null);
    }
  }, [session]);

  // Invite Logic Effect
  useEffect(() => {
    const processInvite = async () => {
        if (currentUser && !isJoiningProject) {
            const token = localStorage.getItem('project_invite_token');
            if (token) {
                setIsJoiningProject(true);
                try {
                    console.log("Mesh: Accepting stored invite token...");
                    await api.data.acceptInvite(token);
                    localStorage.removeItem('project_invite_token');
                    await fetchData(true); // Re-sync entire mesh to show new project
                } catch (e) {
                    console.error("Mesh Error: Failed to join project node.", e);
                    localStorage.removeItem('project_invite_token');
                } finally {
                    setIsJoiningProject(false);
                }
            }
        }
    };
    processInvite();
  }, [currentUser, fetchData]);

  // Listen for link failure
  useEffect(() => {
    const handleLost = () => {
      setFeatureFlags({ ai: false, voice: false });
      localStorage.setItem('aiFeaturesEnabled', 'false');
    };
    window.addEventListener('neural-link-lost', handleLost);
    return () => window.removeEventListener('neural-link-lost', handleLost);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData(false); // Silent fetch
    setIsRefreshing(false);
  };

  const confirm = (options: { title: string; message: React.ReactNode; onConfirm: () => void; confirmText?: string }) => {
    setConfirmation({ ...options, confirmText: options.confirmText || 'Confirm', onConfirm: () => { options.onConfirm(); setConfirmation(null); } });
  };

  const handleLogoutClick = () => {
    confirm({
      title: 'Terminate Session',
      message: 'Are you sure you want to disconnect from the neural mesh? You will need to re-authenticate to access your node clusters.',
      confirmText: 'Logout',
      onConfirm: () => api.auth.signOut()
    });
  };

  const handleVoiceCommand = async (command: string) => {
    try {
      const result = await interpretVoiceCommand(command, { currentView, activeProjectId });
      return `Executed: ${result.action}`;
    } catch (e) {
      return "Neural link failed to interpret command.";
    }
  };

  if (!session || !currentUser) return <LandingPage onShowPrivacy={() => {}} />;
  
  // Only show full screen loader if we have NO data at all or are currently reconfiguring mesh
  if (isJoiningProject || (loading && Object.keys(state.projects).length === 0)) {
      return (
          <div className="min-h-screen bg-[#1C2326] flex flex-col items-center justify-center font-mono text-emerald-500 uppercase tracking-[0.3em] text-[10px]">
              <div className="w-12 h-12 mb-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              {isJoiningProject ? 'Reconfiguring Mesh Clusters...' : 'Initializing Neural Link...'}
          </div>
      );
  }

  const project = activeProjectId ? state.projects[activeProjectId] : null;

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      <div className="min-h-screen bg-[#1C2326] text-gray-100 flex flex-col font-sans selection:bg-emerald-500/30">
        
        {/* TOP NAVIGATION */}
        <nav className="h-16 border-b border-white/5 bg-[#131C1B]/80 backdrop-blur-xl sticky top-0 z-30 px-6 grid grid-cols-3 items-center">
          {/* LEFT: Branding & Active Project */}
          <div className="flex items-center gap-4">
            <button onClick={() => {setActiveProjectId(null); setCurrentView('dashboard');}} className="flex items-center gap-2.5 group flex-shrink-0">
              <AppLogo className="w-8 h-8 group-hover:scale-110 transition-transform" />
              <span className="font-black text-sm tracking-tighter uppercase hidden lg:block">Graphynovus</span>
            </button>
            
            {project && (
              <>
                <div className="h-4 w-px bg-white/10 mx-2" />
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {setActiveProjectId(null); setCurrentView('dashboard');}}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5 group/back"
                    title="Exit Project"
                  >
                    <ArrowLeftIcon className="w-3.5 h-3.5 group-hover/back:-translate-x-0.5 transition-transform" />
                    <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">Back</span>
                  </button>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black text-emerald-500/70 uppercase tracking-widest leading-none mb-1">Active Project</span>
                    <h1 className="text-xs font-bold text-white truncate max-w-[150px] sm:max-w-[200px] leading-none">{project.name}</h1>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* CENTER: Navigation Tabs */}
          <div className="flex justify-center">
            <div className="flex items-center gap-1 p-1 bg-black/20 rounded-xl border border-white/5">
              <button onClick={() => {setActiveProjectId(null); setCurrentView('dashboard');}} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${currentView === 'dashboard' && !activeProjectId ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}>Nodes</button>
              <button onClick={() => {setActiveProjectId(null); setCurrentView('tasks');}} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${currentView === 'tasks' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}>Tasks</button>
              <button onClick={() => {setActiveProjectId(null); setCurrentView('resources');}} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${currentView === 'resources' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}>Mesh</button>
            </div>
          </div>

          {/* RIGHT: Actions */}
          <div className="flex items-center justify-end gap-3">
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-2 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`}
              title="Sync Mesh"
            >
              <RotateCwIcon className="w-5 h-5" />
            </button>
            {activeProjectId && (
              <button 
                onClick={() => setIsChatOpen(!isChatOpen)} 
                className={`p-2 rounded-xl transition-all ${isChatOpen ? 'bg-white text-black shadow-lg shadow-white/5' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
              >
                <MessageSquareIcon className="w-5 h-5" />
              </button>
            )}
            {featureFlags.ai && (
              <button onClick={() => setIsVoiceOpen(true)} className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">
                <BotMessageSquareIcon className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => setIsSearchOpen(true)} className="p-2 text-gray-500 hover:text-white transition-colors">
              <SearchIcon className="w-5 h-5" />
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-500 hover:text-white transition-colors">
              <SettingsIcon className="w-5 h-5" />
            </button>
            <button onClick={handleLogoutClick} className="p-2 text-gray-500 hover:text-red-400 transition-colors">
              <LogOutIcon className="w-5 h-5" />
            </button>
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <main className="flex-grow p-6 overflow-x-hidden custom-scrollbar">
          {activeProjectId && project ? (
            <KanbanBoard 
              project={project} currentUser={currentUser} users={Object.values(state.users)} onlineUsers={onlineUsers} aiFeaturesEnabled={featureFlags.ai}
              onDragEnd={(r) => onDragEnd(project.id, r)} updateTask={(t) => updateTask(project.id, t)} addSubtasks={(tid, sts) => addSubtasks(project.id, tid, sts, currentUser.id)}
              addComment={(tid, text) => addComment(project.id, tid, text, currentUser)} addAiTask={(p) => addAiTask(project.id, p)}
              addTask={(td) => addTask(project.id, td, currentUser.id)} deleteTask={(tid, cid) => deleteTask(project.id, tid, cid)}
              addColumn={(t) => addColumn(project.id, t)} deleteColumn={(cid) => deleteColumn(project.id, cid)} isChatOpen={isChatOpen} onCloseChat={() => setIsChatOpen(false)} chatMessages={project.chatMessages}
              onSendMessage={(txt) => sendChatMessage(project.id, txt, currentUser)} onTaskClick={setSelectedTask} addProjectLink={(t, u) => addProjectLink(project.id, t, u, currentUser.id)}
              deleteProjectLink={deleteProjectLink} addBug={addBug} updateBug={updateBug} deleteBug={deleteBug} 
              addBugsBatch={(bugs) => addBugsBatch(project.id, bugs)} 
              deleteBugsBatch={deleteBugsBatch}
              addTasksBatch={(ts, sid) => addTasksBatch(project.id, ts, sid)} addSprint={(sd) => addSprint(project.id, sd)} updateSprint={(sid, up) => updateSprint(project.id, sid, up)}
              deleteSprint={(sid) => deleteSprint(project.id, sid)} bulkUpdateTaskSprint={bulkUpdateTaskSprint} completeSprint={completeSprint}
              addFilterSegment={(n, f) => addFilterSegment(project.id, n, f, currentUser.id)} updateFilterSegment={updateFilterSegment} deleteFilterSegment={deleteFilterSegment}
            />
          ) : currentView === 'dashboard' ? (
            <DashboardPage projects={Object.values(state.projects)} users={state.users} currentUser={currentUser} onlineUsers={onlineUsers} onSelectProject={setActiveProjectId} onCreateProject={() => setIsCreateProjectOpen(true)} onManageMembers={(id) => {setMemberProjectId(id); setIsManageMembersOpen(true);}} onShareProject={(p) => {setShareProject(p); setIsShareModalOpen(true);}} addProjectFromPlan={addProjectFromPlan} />
          ) : currentView === 'tasks' ? (
            <TasksPage projects={state.projects} users={state.users} currentUser={currentUser} onTaskClick={setSelectedTask} />
          ) : (
            <ResourceManagementPage projects={state.projects} users={state.users} onlineUsers={onlineUsers} onTaskClick={setSelectedTask} />
          )}
        </main>

        {/* MODALS & OVERLAYS */}
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} currentUser={currentUser} onUpdateUser={updateUserProfile} featureFlags={featureFlags} onFlagsChange={setFeatureFlags} projects={Object.values(state.projects)} onDeleteProject={deleteProject} onShowPrivacy={() => {}} />
        {isCreateProjectOpen && <CreateProjectModal onClose={() => setIsCreateProjectOpen(false)} onAddProject={(n, d) => addProject(n, d, currentUser.id)} />}
        {selectedTask && <TaskDetailsModal task={selectedTask} currentUser={currentUser} users={Object.values(state.users)} projectMembers={Object.values(state.users)} allProjectTags={[]} sprints={[]} onlineUsers={onlineUsers} onClose={() => setSelectedTask(null)} onUpdateTask={(t) => updateTask(activeProjectId!, t)} onAddSubtasks={(tid, sts) => addSubtasks(activeProjectId!, tid, sts, currentUser.id)} onAddComment={(tid, text) => addComment(activeProjectId!, tid, text, currentUser)} />}
        {isManageMembersOpen && memberProjectId && <ManageMembersModal project={state.projects[memberProjectId]} allUsers={Object.values(state.users)} onlineUsers={onlineUsers} onClose={() => setIsManageMembersOpen(false)} onSave={(mids) => updateProjectMembers(memberProjectId, mids)} />}
        {isShareModalOpen && shareProject && <ManageInviteLinksModal project={shareProject} currentUser={currentUser} onClose={() => setIsShareModalOpen(false)} />}
        <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} projects={state.projects} users={state.users} onSelectProject={setActiveProjectId} onSelectTask={setSelectedTask} />
        <VoiceAssistantModal isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} onCommand={handleVoiceCommand} />
        <FeedbackFab onClick={() => setIsFeedbackOpen(true)} />
        <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} onSubmit={async () => {}} />

        {/* CONFIRMATION OVERLAY */}
        {confirmation && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-[#131C1B] border border-gray-800 rounded-xl p-6 max-w-sm w-full shadow-2xl">
              <h2 className="text-white font-bold text-lg mb-2">{confirmation.title}</h2>
              <div className="text-gray-400 text-sm mb-6">{confirmation.message}</div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmation(null)} className="px-4 py-2 text-gray-400 hover:text-white text-sm font-semibold">Cancel</button>
                <button onClick={confirmation.onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700">{confirmation.confirmText}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ConfirmationContext.Provider>
  );
};

export default App;

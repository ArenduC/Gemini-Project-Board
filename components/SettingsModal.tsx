import React, { useState, FormEvent } from 'react';
import { User, Project } from '../types';
import { XIcon, TrashIcon, UserIcon, SettingsIcon, LayoutDashboardIcon } from './Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateUser: (updates: { name: string }) => Promise<void>;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  featureFlags: { ai: boolean, voice: boolean };
  onFlagsChange: (flags: { ai: boolean, voice: boolean }) => void;
  projects: Project[];
  onDeleteProject: (projectId: string) => Promise<void>;
}

type Tab = 'general' | 'profile' | 'projects';

const ToggleSwitch: React.FC<{ label: string, enabled: boolean, onChange: (enabled: boolean) => void }> = ({ label, enabled, onChange }) => (
    <div className="flex items-center justify-between">
        <span className="font-medium text-gray-800 dark:text-gray-200">{label}</span>
        <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => onChange(!enabled)}
            className={`${enabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900`}
        >
            <span
                aria-hidden="true"
                className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            />
        </button>
    </div>
);

const ProjectDangerZone: React.FC<{ project: Project; onDelete: () => Promise<void> }> = ({ project, onDelete }) => {
    const [confirmText, setConfirmText] = useState('');
    const isMatch = confirmText === project.name;

    const handleDelete = async () => {
        if (isMatch) {
            await onDelete();
        }
    }

    return (
        <div className="mt-4 p-4 border border-red-500/50 bg-red-50 dark:bg-red-900/10 rounded-lg">
            <h4 className="font-bold text-red-700 dark:text-red-400">Danger Zone</h4>
            <p className="text-xs text-red-600 dark:text-red-400/80 mt-1">
                Deleting a project is irreversible. It will permanently remove all associated tasks, columns, and data.
            </p>
            <div className="mt-3">
                <label htmlFor={`delete-${project.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    To confirm, type "<b>{project.name}</b>"
                </label>
                <input
                    id={`delete-${project.id}`}
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="mt-1 w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-sm"
                />
            </div>
            <button
                onClick={handleDelete}
                disabled={!isMatch}
                className="mt-3 w-full px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors text-sm"
            >
                Delete this project
            </button>
        </div>
    );
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, currentUser, onUpdateUser, isDarkMode, onToggleTheme,
  featureFlags, onFlagsChange, projects, onDeleteProject
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [userName, setUserName] = useState(currentUser.name);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  if (!isOpen) return null;
  
  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    if (userName.trim() === currentUser.name) return;
    setIsSavingProfile(true);
    await onUpdateUser({ name: userName.trim() });
    setIsSavingProfile(false);
  };
  
  const TabButton: React.FC<{ tabName: Tab; icon: React.ReactNode; children: React.ReactNode }> = ({ tabName, icon, children }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tabName ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'}`}
    >
      {icon}
      {children}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex" onClick={(e) => e.stopPropagation()}>
        {/* Sidebar */}
        <aside className="w-1/4 p-4 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <h2 className="text-lg font-bold mb-6">Settings</h2>
          <nav className="space-y-2">
            <TabButton tabName="general" icon={<SettingsIcon className="w-5 h-5" />}>General</TabButton>
            <TabButton tabName="profile" icon={<UserIcon className="w-5 h-5" />}>Profile</TabButton>
            <TabButton tabName="projects" icon={<LayoutDashboardIcon className="w-5 h-5" />}>Projects</TabButton>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="w-3/4 flex flex-col">
          <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-end items-center flex-shrink-0">
            <button onClick={onClose} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <XIcon className="w-6 h-6" />
            </button>
          </header>
          
          <div className="p-6 overflow-y-auto custom-scrollbar flex-grow">
            {activeTab === 'general' && (
              <div className="space-y-6">
                 <h3 className="text-xl font-bold">General Settings</h3>
                 <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg space-y-4">
                    <ToggleSwitch label="Dark Mode" enabled={isDarkMode} onChange={onToggleTheme} />
                    <ToggleSwitch label="Enable AI Features" enabled={featureFlags.ai} onChange={enabled => onFlagsChange({...featureFlags, ai: enabled})} />
                    <ToggleSwitch label="Enable Voice Assistant" enabled={featureFlags.voice} onChange={enabled => onFlagsChange({...featureFlags, voice: enabled})} />
                 </div>
              </div>
            )}
            
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold">Profile</h3>
                 <form onSubmit={handleProfileSave} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                        <input
                            id="name"
                            type="text"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            className="mt-1 w-full max-w-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-sm"
                        />
                    </div>
                     <div className="flex justify-start">
                        <button type="submit" disabled={isSavingProfile || userName === currentUser.name} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-indigo-400 text-sm">
                            {isSavingProfile ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                 </form>
              </div>
            )}

             {activeTab === 'projects' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold">Project Management</h3>
                <div className="space-y-4">
                    {projects.map(project => (
                        <div key={project.id} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <h4 className="font-semibold">{project.name}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{project.description}</p>
                            <ProjectDangerZone project={project} onDelete={() => onDeleteProject(project.id)} />
                        </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

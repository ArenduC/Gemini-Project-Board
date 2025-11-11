import React, { useState, FormEvent } from 'react';
import { User, Project } from '../types';
import { XIcon, TrashIcon, UserIcon, SettingsIcon, LayoutDashboardIcon } from './Icons';
import { useConfirmation } from '../App';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateUser: (updates: { name: string }) => Promise<void>;
  featureFlags: { ai: boolean, voice: boolean };
  onFlagsChange: (flags: { ai: boolean, voice: boolean }) => void;
  projects: Project[];
  onDeleteProject: (projectId: string) => Promise<void>;
  onShowPrivacy: () => void;
}

type Tab = 'general' | 'profile' | 'projects';

const ToggleSwitch: React.FC<{ label: string, enabled: boolean, onChange: (enabled: boolean) => void }> = ({ label, enabled, onChange }) => (
    <div className="flex items-center justify-between">
        <span className="font-medium text-white">{label}</span>
        <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => onChange(!enabled)}
            className={`${enabled ? 'bg-gray-600' : 'bg-gray-800'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#131C1B]`}
        >
            <span
                aria-hidden="true"
                className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            />
        </button>
    </div>
);

const ProjectDangerZone: React.FC<{ project: Project; onDelete: () => Promise<void> }> = ({ project, onDelete }) => {
    const requestConfirmation = useConfirmation();

    const handleDelete = () => {
        requestConfirmation({
            title: `Delete Project "${project.name}"`,
            message: (
                <>
                    <p>Are you sure you want to permanently delete this project? This action is irreversible and will delete all associated tasks, columns, and data.</p>
                    <p className="mt-2 font-semibold">This cannot be undone.</p>
                </>
            ),
            onConfirm: onDelete,
            confirmText: "Delete Project",
        });
    };

    return (
        <div className="mt-4 p-4 border border-red-500/50 bg-red-900/10 rounded-lg">
            <h4 className="font-bold text-red-400">Danger Zone</h4>
            <p className="text-xs text-red-400/80 mt-1">
                Deleting a project is irreversible.
            </p>
            <button
                onClick={handleDelete}
                className="mt-3 w-full px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors text-xs"
            >
                Delete this project
            </button>
        </div>
    );
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, currentUser, onUpdateUser,
  featureFlags, onFlagsChange, projects, onDeleteProject,
  onShowPrivacy,
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
      className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-colors ${activeTab === tabName ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50'}`}
    >
      {icon}
      {children}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#131C1B] rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex" onClick={(e) => e.stopPropagation()}>
        {/* Sidebar */}
        <aside className="w-1/4 p-4 border-r border-gray-800 flex flex-col">
          <h2 className="text-base font-bold mb-6 text-white">Settings</h2>
          <nav className="space-y-2">
            <TabButton tabName="general" icon={<SettingsIcon className="w-5 h-5" />}>General</TabButton>
            <TabButton tabName="profile" icon={<UserIcon className="w-5 h-5" />}>Profile</TabButton>
            <TabButton tabName="projects" icon={<LayoutDashboardIcon className="w-5 h-5" />}>Projects</TabButton>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="w-3/4 flex flex-col">
          <header className="p-4 border-b border-gray-800 flex justify-end items-center flex-shrink-0">
            <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-800 transition-colors">
              <XIcon className="w-6 h-6" />
            </button>
          </header>
          
          <div className="p-6 overflow-y-auto custom-scrollbar flex-grow">
            {activeTab === 'general' && (
              <div className="space-y-6">
                 <h3 className="text-lg font-bold text-white">General Settings</h3>
                 <div className="p-4 bg-gray-800/50 rounded-lg space-y-4">
                    <div className="flex items-center justify-between"><span className="font-medium text-white">Theme</span><span className="text-gray-400">Dark</span></div>
                    <ToggleSwitch label="Enable AI Features" enabled={featureFlags.ai} onChange={enabled => onFlagsChange({...featureFlags, ai: enabled})} />
                    <ToggleSwitch label="Enable Voice Assistant" enabled={featureFlags.voice} onChange={enabled => onFlagsChange({...featureFlags, voice: enabled})} />
                 </div>
                 <div className="p-4 bg-gray-800/50 rounded-lg">
                     <button onClick={onShowPrivacy} className="font-medium text-white hover:underline">
                        View Privacy Policy
                     </button>
                     <p className="text-xs text-gray-400 mt-1">Review our terms and how we handle your data.</p>
                </div>
              </div>
            )}
            
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-white">Profile</h3>
                 <form onSubmit={handleProfileSave} className="p-4 bg-gray-800/50 rounded-lg space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-xs font-medium text-white">Full Name</label>
                        <input
                            id="name"
                            type="text"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            className="mt-1 w-full max-w-sm px-3 py-2 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 bg-[#1C2326] text-white text-xs"
                        />
                    </div>
                     <div className="flex justify-start">
                        <button type="submit" disabled={isSavingProfile || userName === currentUser.name} className="px-4 py-2 bg-gray-300 text-black font-semibold rounded-lg shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-xs">
                            {isSavingProfile ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                 </form>
              </div>
            )}

             {activeTab === 'projects' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-white">Project Management</h3>
                <div className="space-y-4">
                    {projects.map(project => (
                        <div key={project.id} className="p-4 bg-gray-800/50 rounded-lg">
                            <h4 className="font-semibold text-white">{project.name}</h4>
                            <p className="text-sm text-gray-400">{project.description}</p>
                            {currentUser.id === project.creatorId && (
                                <ProjectDangerZone project={project} onDelete={() => onDeleteProject(project.id)} />
                            )}
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

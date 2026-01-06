
import React, { useState, FormEvent, useEffect } from 'react';
import { User, Project } from '../types';
import { XIcon, TrashIcon, UserIcon, SettingsIcon, LayoutDashboardIcon, SparklesIcon, ZapIcon, ShieldCheckIcon, LoaderCircleIcon, EyeIcon, EyeOffIcon } from './Icons';
import { useConfirmation } from '../App';
import { validateGeminiKey } from '../services/geminiService';

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

type Tab = 'general' | 'profile' | 'projects' | 'neural';

const ToggleSwitch: React.FC<{ label: string, enabled: boolean, onChange: (enabled: boolean) => void, disabled?: boolean }> = ({ label, enabled, onChange, disabled }) => (
    <div className={`flex items-center justify-between ${disabled ? 'opacity-50' : ''}`}>
        <span className="font-medium text-white">{label}</span>
        <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={disabled}
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

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, currentUser, onUpdateUser,
  featureFlags, onFlagsChange, projects, onDeleteProject,
  onShowPrivacy,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [userName, setUserName] = useState(currentUser.name);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // BYOK State
  const [apiKey, setApiKey] = useState(localStorage.getItem('user_gemini_api_key') || '');
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'none' | 'valid' | 'invalid'>(apiKey ? 'valid' : 'none');

  if (!isOpen) return null;
  
  const handleKeySave = async () => {
      if (!apiKey.trim()) {
          localStorage.removeItem('user_gemini_api_key');
          setKeyStatus('none');
          onFlagsChange({ ...featureFlags, ai: false, voice: false });
          return;
      }

      setIsValidating(true);
      const isValid = await validateGeminiKey(apiKey.trim());
      setIsValidating(false);

      if (isValid) {
          localStorage.setItem('user_gemini_api_key', apiKey.trim());
          setKeyStatus('valid');
          onFlagsChange({ ...featureFlags, ai: true, voice: true });
      } else {
          setKeyStatus('invalid');
          onFlagsChange({ ...featureFlags, ai: false, voice: false });
      }
  };

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
      <div className="bg-[#131C1B] rounded-lg shadow-2xl w-full max-w-3xl max-h-[80vh] flex" onClick={(e) => e.stopPropagation()}>
        <aside className="w-1/4 p-4 border-r border-gray-800 flex flex-col">
          <h2 className="text-base font-bold mb-6 text-white">Settings</h2>
          <nav className="space-y-2">
            <TabButton tabName="general" icon={<SettingsIcon className="w-5 h-5" />}>General</TabButton>
            <TabButton tabName="neural" icon={<SparklesIcon className="w-5 h-5 text-emerald-400" />}>Neural Link</TabButton>
            <TabButton tabName="profile" icon={<UserIcon className="w-5 h-5" />}>Profile</TabButton>
            <TabButton tabName="projects" icon={<LayoutDashboardIcon className="w-5 h-5" />}>Projects</TabButton>
          </nav>
        </aside>

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
                    <ToggleSwitch 
                        label="AI Generation" 
                        enabled={featureFlags.ai} 
                        disabled={keyStatus !== 'valid'}
                        onChange={enabled => onFlagsChange({...featureFlags, ai: enabled})} 
                    />
                    <ToggleSwitch 
                        label="Voice Assistant" 
                        enabled={featureFlags.voice} 
                        disabled={keyStatus !== 'valid'}
                        onChange={enabled => onFlagsChange({...featureFlags, voice: enabled})} 
                    />
                    {keyStatus !== 'valid' && (
                        <p className="text-[10px] text-red-400 uppercase font-bold tracking-widest animate-pulse">
                            Neural Link Offline: API Key required
                        </p>
                    )}
                 </div>
              </div>
            )}

            {activeTab === 'neural' && (
              <div className="space-y-6">
                 <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-emerald-400" />
                    Neural Interface Configuration
                 </h3>
                 <div className="p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-4">
                    <p className="text-xs text-gray-400 leading-relaxed font-medium">
                        To enable advanced synthesis, automated project planning, and the Neural Nexus, provide your <strong>Gemini API Key</strong>. Your key is stored locally in your browser and never leaves this domain.
                    </p>
                    
                    <div className="relative">
                        <input
                            type={showKey ? 'text' : 'password'}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter Gemini API Key..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 pr-12 transition-all"
                        />
                        <button 
                            onClick={() => setShowKey(!showKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                        >
                            {showKey ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                        </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {keyStatus === 'valid' ? (
                                <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Link Active
                                </div>
                            ) : keyStatus === 'invalid' ? (
                                <div className="flex items-center gap-2 text-red-400 text-[10px] font-black uppercase tracking-widest">
                                    <XIcon className="w-3 h-3" />
                                    Invalid Protocol
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                                    No Link Detected
                                </div>
                            )}
                        </div>
                        
                        <button 
                            onClick={handleKeySave}
                            disabled={isValidating}
                            className="flex items-center gap-2 px-5 py-2 bg-emerald-500 text-black font-black uppercase tracking-widest text-[10px] rounded-lg hover:bg-emerald-400 transition-all disabled:opacity-50"
                        >
                            {isValidating ? <LoaderCircleIcon className="w-3 h-3 animate-spin" /> : <ZapIcon className="w-3 h-3" />}
                            Sync Neural Link
                        </button>
                    </div>
                 </div>
                 <div className="px-1">
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-gray-500 hover:text-emerald-400 underline uppercase tracking-widest">
                        Get a Gemini API Key (Free)
                    </a>
                 </div>
              </div>
            )}
            
            {/* OTHER TABS UNCHANGED */}
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


import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import { Project, User, UserRole, ProjectInviteLink } from '../types';
import { api } from '../services/api';
import { XIcon, CopyIcon, PlusIcon, LoaderCircleIcon, ShieldCheckIcon } from './Icons';

interface ManageInviteLinksModalProps {
  project: Project;
  currentUser: User;
  onClose: () => void;
}

// FIX: Added 'title' to ToggleSwitch props to resolve "Property 'title' does not exist" type error.
const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; title?: string }> = ({ checked, onChange, disabled, title }) => {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            title={title}
            onClick={() => !disabled && onChange(!checked)}
            className={`${checked ? 'bg-gray-600' : 'bg-gray-800'} relative inline-flex h-6 w-11 flex-shrink-0 ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'} rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#131C1B]`}
            disabled={disabled}
        >
            <span
                aria-hidden="true"
                className={`${checked ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            />
        </button>
    );
};


export const ManageInviteLinksModal: React.FC<ManageInviteLinksModalProps> = ({ project, currentUser, onClose }) => {
    const [links, setLinks] = useState<ProjectInviteLink[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [newLinkRole, setNewLinkRole] = useState<UserRole>(UserRole.MEMBER);
    const [expiresIn, setExpiresIn] = useState<string>('never');
    const [isCreating, setIsCreating] = useState(false);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    const isCreator = useMemo(() => currentUser.id === project.creatorId, [currentUser.id, project.creatorId]);

    const fetchLinks = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const fetchedLinks = await api.data.getInviteLinksForProject(project.id);
            setLinks(fetchedLinks);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load invite links.';
            setError(errorMessage);
            console.error("Error fetching invite links:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLinks();
    }, [project.id]);

    const handleCreateLink = async (e: FormEvent) => {
        e.preventDefault();
        if (!isCreator) return;
        setIsCreating(true);
        try {
            const days = expiresIn === 'never' ? null : parseInt(expiresIn, 10);
            await api.data.createInviteLink(project.id, currentUser.id, newLinkRole, days);
            await fetchLinks(); // Refresh the list
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create link. Please try again.';
            alert(errorMessage);
            console.error("Error creating invite link:", err);
        } finally {
            setIsCreating(false);
        }
    };
    
    const handleToggleLink = async (link: ProjectInviteLink) => {
        if (!isCreator) return;
        try {
            setLinks(prev => prev.map(l => l.id === link.id ? { ...l, is_active: !l.is_active } : l));
            await api.data.updateInviteLink(link.id, { is_active: !link.is_active });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update link status.';
            alert(errorMessage);
            console.error("Error updating link status:", err);
            fetchLinks(); // Re-fetch to revert optimistic update on error
        }
    };

    const handleCopyLink = (token: string) => {
        const url = `${window.location.origin}/invite/${token}`;
        navigator.clipboard.writeText(url);
        setCopiedToken(token);
        setTimeout(() => setCopiedToken(null), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[#131C1B] rounded-xl shadow-2xl w-full max-w-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                             <ShieldCheckIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white leading-none">Access Propagation</h2>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Project Node: {project.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-800 transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </header>

                <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar space-y-6">
                    {/* Create Link Form - Only for Creator */}
                    {isCreator ? (
                        <div className="bg-[#1C2326]/50 p-5 rounded-xl border border-white/5 shadow-inner">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] mb-4 text-emerald-500/70">Initialize New Invite Node</h3>
                            <form onSubmit={handleCreateLink} className="flex flex-wrap items-end gap-4 text-sm">
                                <div className="flex-grow min-w-[150px]">
                                    <label htmlFor="role" className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Assigned Privilege</label>
                                    <select id="role" value={newLinkRole} onChange={e => setNewLinkRole(e.target.value as UserRole)} className="w-full px-3 py-2.5 border border-white/5 rounded-xl bg-black/40 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50">
                                        {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
                                    </select>
                                </div>
                                <div className="flex-grow min-w-[150px]">
                                    <label htmlFor="expires" className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Persistence Period</label>
                                    <select id="expires" value={expiresIn} onChange={e => setExpiresIn(e.target.value)} className="w-full px-3 py-2.5 border border-white/5 rounded-xl bg-black/40 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50">
                                        <option value="never">Infinite</option>
                                        <option value="1">24 Hours</option>
                                        <option value="7">7 Cycles</option>
                                        <option value="30">30 Cycles</option>
                                    </select>
                                </div>
                                <button type="submit" disabled={isCreating} className="px-6 h-[42px] bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all text-[10px] shadow-xl shadow-white/5 flex items-center gap-2 disabled:opacity-50">
                                    {isCreating ? <LoaderCircleIcon className="w-4 h-4 animate-spin" /> : <PlusIcon className="w-4 h-4" />}
                                    Synthesize
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                <ShieldCheckIcon className="w-4 h-4" />
                            </div>
                            <p className="text-xs text-blue-300 font-medium">
                                Protocol Restriction: Only the project creator can initialize new invite nodes. You may propogate existing active tokens.
                            </p>
                        </div>
                    )}

                    {/* Existing Links */}
                    <div>
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] mb-4 text-gray-500">Active Invite Nodes</h3>
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-600 font-mono text-[10px] uppercase tracking-widest">
                                <LoaderCircleIcon className="w-8 h-8 animate-spin mb-4" />
                                Synchronizing Array...
                            </div>
                        ) : null}
                        
                        {error ? <div className="text-center p-6 text-red-400 text-xs font-bold border border-red-500/20 bg-red-500/5 rounded-xl">{error}</div> : null}
                        
                        {!isLoading && !error && links.length === 0 && (
                            <div className="text-center p-12 bg-black/20 rounded-xl border border-dashed border-white/5">
                                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest italic">No active propagation nodes detected.</p>
                            </div>
                        )}
                        
                        <div className="space-y-3">
                            {links.map(link => (
                                <div key={link.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-wrap items-center justify-between gap-4 group hover:border-white/10 transition-all">
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-2">
                                            <div className="relative flex-grow max-w-sm">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={`${window.location.origin}/invite/${link.token}`}
                                                    className="w-full px-3 py-2 text-[11px] bg-black/40 border border-white/5 rounded-lg text-white font-mono"
                                                />
                                            </div>
                                            <button 
                                                onClick={() => handleCopyLink(link.token)} 
                                                className={`p-2.5 rounded-xl transition-all ${copiedToken === link.token ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
                                                title="Copy Node Link"
                                            >
                                                {copiedToken === link.token ? <LoaderCircleIcon className="w-4 h-4 animate-pulse" /> : <CopyIcon className="w-4 h-4" />}
                                            </button>
                                            {copiedToken === link.token && (
                                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest absolute -mt-10 ml-1 bg-[#131C1B] px-2 py-1 rounded border border-emerald-500/20 shadow-xl">Linked!</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 mt-3">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Privilege:</span>
                                                <span className="text-[9px] font-bold text-white bg-white/5 px-2 py-0.5 rounded-full">{link.role}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">TTL:</span>
                                                <span className="text-[9px] font-bold text-gray-400 font-mono">
                                                    {link.expires_at ? new Date(link.expires_at).toLocaleDateString() : 'PERSISTENT'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5 border-l border-white/5 pl-4 min-w-[100px]">
                                        <span className={`text-[8px] font-black uppercase tracking-widest ${link.is_active ? 'text-emerald-500' : 'text-gray-600'}`}>
                                            {link.is_active ? 'Broadcasting' : 'Muted'}
                                        </span>
                                        <ToggleSwitch 
                                            checked={link.is_active} 
                                            onChange={() => handleToggleLink(link)} 
                                            disabled={!isCreator}
                                            title={!isCreator ? "Only the creator can modulate node status" : "Toggle propagation"}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <footer className="p-4 border-t border-gray-800 flex justify-center bg-white/[0.01]">
                    <button type="button" onClick={onClose} className="px-8 py-2 text-gray-500 hover:text-white font-black uppercase tracking-[0.2em] text-[10px] transition-all">
                        Terminate Session
                    </button>
                </footer>
            </div>
        </div>
    );
};

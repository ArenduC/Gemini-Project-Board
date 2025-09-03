import React, { useState, useEffect, FormEvent } from 'react';
import { Project, User, UserRole, ProjectInviteLink } from '../types';
import { api } from '../services/api';
import { XIcon, CopyIcon, PlusIcon, LoaderCircleIcon } from './Icons';

interface ManageInviteLinksModalProps {
  project: Project;
  currentUser: User;
  onClose: () => void;
}

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => !disabled && onChange(!checked)}
            className={`${checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed`}
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
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
                <header className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold">Share Project</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{project.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </header>

                <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar space-y-6">
                    {/* Create Link Form */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-3">Create a new invite link</h3>
                        <form onSubmit={handleCreateLink} className="flex flex-wrap items-end gap-4">
                            <div>
                                <label htmlFor="role" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Default Role</label>
                                <select id="role" value={newLinkRole} onChange={e => setNewLinkRole(e.target.value as UserRole)} className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                    {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="expires" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Expires After</label>
                                <select id="expires" value={expiresIn} onChange={e => setExpiresIn(e.target.value)} className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option value="never">Never</option>
                                    <option value="1">1 Day</option>
                                    <option value="7">7 Days</option>
                                    <option value="30">30 Days</option>
                                </select>
                            </div>
                            <button type="submit" disabled={isCreating} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-indigo-400 flex items-center gap-2">
                                {isCreating ? <LoaderCircleIcon className="w-5 h-5 animate-spin" /> : <PlusIcon className="w-5 h-5" />}
                                Generate Link
                            </button>
                        </form>
                    </div>

                    {/* Existing Links */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3">Existing Links</h3>
                        {isLoading ? <div className="text-center p-4">Loading...</div> : null}
                        {error ? <div className="text-center p-4 text-red-500">{error}</div> : null}
                        {!isLoading && !error && links.length === 0 && (
                            <div className="text-center p-4 text-slate-500 dark:text-slate-400">No invite links created yet.</div>
                        )}
                        <div className="space-y-3">
                            {links.map(link => (
                                <div key={link.id} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-md flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                readOnly
                                                value={`${window.location.origin}/invite/${link.token}`}
                                                className="w-full sm:w-auto flex-grow px-2 py-1 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md"
                                            />
                                            <button onClick={() => handleCopyLink(link.token)} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md">
                                                <CopyIcon className="w-4 h-4" />
                                            </button>
                                            {copiedToken === link.token && <span className="text-sm text-green-600">Copied!</span>}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            Role: <strong>{link.role}</strong>
                                            <span className="mx-2">|</span>
                                            Expires: {link.expires_at ? new Date(link.expires_at).toLocaleDateString() : 'Never'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-sm font-medium ${link.is_active ? 'text-green-600' : 'text-slate-500'}`}>
                                            {link.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                        <ToggleSwitch checked={link.is_active} onChange={() => handleToggleLink(link)} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <footer className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700">
                        Done
                    </button>
                </footer>
            </div>
        </div>
    );
};
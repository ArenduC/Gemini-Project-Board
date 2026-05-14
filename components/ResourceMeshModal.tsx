
import React, { useState } from 'react';
import { Project, User, Task, TaskPriority } from '../types';
import { XIcon, PlusIcon, SparklesIcon, LinkIcon, GitHubIcon, FigmaIcon, TrashIcon, CopyIcon, CheckIcon, LoaderCircleIcon, ZapIcon, ActivityIcon, LayoutGridIcon } from './Icons';
import { UserActivityGraph } from './UserActivityGraph';
import { createPortal } from 'react-dom';
import { useConfirmation } from '../App';

interface ResourceMeshModalProps {
    isOpen: boolean;
    onClose: () => void;
    projects: Record<string, Project>;
    users: User[];
    onlineUsers: Set<string>;
    onTaskClick: (task: Task) => void;
    onAddTask: () => void;
    addProjectLink: (title: string, url: string) => Promise<void>;
    deleteProjectLink: (linkId: string) => Promise<void>;
}

export const ResourceMeshModal: React.FC<ResourceMeshModalProps> = ({ 
    isOpen, onClose, projects, users, onlineUsers, onTaskClick, onAddTask,
    addProjectLink, deleteProjectLink
}) => {
    const [activeTab, setActiveTab] = useState<'activity' | 'nodes'>('activity');
    const [linkTitle, setLinkTitle] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [isAddingLink, setIsAddingLink] = useState(false);
    const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
    const requestConfirmation = useConfirmation();

    if (!isOpen) return null;

    const mainProject = Object.values(projects)[0];
    const usersRecord = users.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
    }, {} as Record<string, User>);

    const getLinkIcon = (url: string) => {
        try {
            const domain = new URL(url).hostname;
            if (domain.includes('github.com')) return <GitHubIcon className="w-5 h-5 text-emerald-400" />;
            if (domain.includes('figma.com')) return <FigmaIcon className="w-5 h-5 text-emerald-400" />;
        } catch (e) {}
        return <LinkIcon className="w-5 h-5 text-emerald-400" />;
    };

    const handleAddLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!linkTitle.trim() || !linkUrl.trim()) return;
        setIsAddingLink(true);
        try {
            await addProjectLink(linkTitle, linkUrl);
            setLinkTitle('');
            setLinkUrl('');
        } finally {
            setIsAddingLink(false);
        }
    };

    const handleDeleteLink = (linkId: string, linkTitle: string) => {
        requestConfirmation({
            title: 'Sever Connection',
            message: <>Are you sure you want to disconnect <strong>"{linkTitle}"</strong> from the mesh?</>,
            onConfirm: () => deleteProjectLink(linkId),
            confirmText: 'Disconnect',
        });
    };

    const handleCopyLink = (url: string, id: string) => {
        navigator.clipboard.writeText(url);
        setCopiedLinkId(id);
        setTimeout(() => setCopiedLinkId(null), 2000);
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden p-0 sm:p-4">
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />
            <div className="relative w-full h-full max-w-7xl md:max-h-[90vh] bg-[#0A0F0E] border border-white/10 rounded-none md:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header Section */}
                <header className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-b from-white/5 to-transparent shrink-0">
                    <div className="flex items-center gap-5">
                        <div className="p-4 rounded-[1.5rem] bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 shadow-2xl shadow-emerald-500/10">
                            <ZapIcon className="w-8 h-8 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-[0.3em] text-white">Neural Resource Mesh</h2>
                            <div className="flex items-center gap-3 mt-1.5">
                                <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                    <span className="text-[9px] font-mono text-emerald-500 uppercase tracking-widest">Core Synchronized</span>
                                </div>
                                <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">•</span>
                                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Protocol v4.0.2</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5 mr-4">
                            <button 
                                onClick={() => setActiveTab('activity')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'activity' ? 'bg-white text-black shadow-xl shadow-white/5' : 'text-gray-500 hover:text-white'}`}
                            >
                                <LayoutGridIcon className="w-3.5 h-3.5" />
                                Activity Graph
                            </button>
                            <button 
                                onClick={() => setActiveTab('nodes')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'nodes' ? 'bg-white text-black shadow-xl shadow-white/5' : 'text-gray-500 hover:text-white'}`}
                            >
                                <LinkIcon className="w-3.5 h-3.5" />
                                Mesh Nodes {mainProject.links.length > 0 && `(${mainProject.links.length})`}
                            </button>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all hover:scale-110 active:scale-95"
                        >
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                </header>

                {/* Main Content Area */}
                <div className="flex-grow overflow-y-auto no-scrollbar p-6 md:p-10">
                    <div className="max-w-6xl mx-auto w-full h-full">
                        {activeTab === 'activity' ? (
                            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <section>
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                                                <ActivityIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Dynamic Activity Map</h3>
                                                <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mt-1">Real-time task velocity across all nodes</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={onAddTask}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-black font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/10 hover:scale-105 active:scale-95"
                                        >
                                            <PlusIcon className="w-4 h-4" />
                                            Provision Task
                                        </button>
                                    </div>
                                    <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-4 md:p-8">
                                        <UserActivityGraph 
                                            projects={projects}
                                            users={usersRecord}
                                            onlineUsers={onlineUsers}
                                            onTaskClick={(task) => {
                                                onTaskClick(task);
                                                onClose();
                                            }}
                                        />
                                    </div>
                                </section>
                            </div>
                        ) : (
                            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <section>
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                                                <LinkIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Resource Connectors</h3>
                                                <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mt-1">Managed endpoints and active mesh links</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                        {/* Node Management Form */}
                                        <div className="lg:col-span-4 space-y-6">
                                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center gap-2">
                                                    <PlusIcon className="w-3.5 h-3.5 text-emerald-400" />
                                                    Attach New Node
                                                </h4>
                                                <form onSubmit={handleAddLink} className="space-y-5">
                                                    <div className="space-y-2">
                                                        <label className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Asset Label</label>
                                                        <input 
                                                            type="text" value={linkTitle} onChange={e => setLinkTitle(e.target.value)}
                                                            placeholder="e.g. Master Control Panel"
                                                            className="w-full px-5 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-xs text-white placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all font-medium"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Endpoint URL</label>
                                                        <input 
                                                            type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                                                            placeholder="https://console.cloud.google.com"
                                                            className="w-full px-5 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-xs text-white placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all font-mono"
                                                            required
                                                        />
                                                    </div>
                                                    <button 
                                                        type="submit" 
                                                        disabled={isAddingLink}
                                                        className="w-full py-4 bg-white text-black font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2 text-[10px] disabled:opacity-50 group"
                                                    >
                                                        {isAddingLink ? <LoaderCircleIcon className="w-4 h-4 animate-spin" /> : <PlusIcon className="w-4 h-4 transition-transform group-hover:rotate-90" />}
                                                        Initialize Connection
                                                    </button>
                                                </form>
                                            </div>
                                            
                                            <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-4">
                                                <SparklesIcon className="w-5 h-5 text-blue-400 shrink-0" />
                                                <div>
                                                    <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Mesh Intelligence</h5>
                                                    <p className="text-[10px] text-blue-500/70 leading-relaxed font-medium capitalize">Disconnected nodes are purged from the network automatically. Ensure endpoint URLs are valid protocols.</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Connected Nodes List */}
                                        <div className="lg:col-span-8 space-y-4">
                                            {mainProject.links.length > 0 ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {mainProject.links.map((link) => (
                                                        <div key={link.id} className="group relative bg-[#131C1B]/50 border border-white/5 rounded-2xl p-5 flex items-center gap-5 hover:border-emerald-500/40 hover:bg-emerald-500/[0.02] transition-all shadow-xl">
                                                            <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center border border-white/10 group-hover:border-emerald-500/20 transition-all shadow-inner">
                                                                {getLinkIcon(link.url)}
                                                            </div>
                                                            <div className="flex-grow min-w-0">
                                                                <a 
                                                                    href={link.url} target="_blank" rel="noopener noreferrer"
                                                                    className="block font-black text-[11px] uppercase tracking-wider text-white hover:text-emerald-400 transition-colors truncate mb-1"
                                                                >
                                                                    {link.title}
                                                                </a>
                                                                <p className="text-[10px] font-mono text-gray-600 truncate opacity-60 group-hover:opacity-100 transition-opacity">
                                                                    {link.url}
                                                                </p>
                                                            </div>
                                                            <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                                                                <button 
                                                                    onClick={() => handleCopyLink(link.url, link.id)}
                                                                    className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-gray-500 hover:bg-white/10 hover:text-white transition-all shadow-xl"
                                                                    title="Copy Endpoint"
                                                                >
                                                                    {copiedLinkId === link.id ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : <CopyIcon className="w-3.5 h-3.5" />}
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteLink(link.id, link.title)}
                                                                    className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500/60 hover:bg-red-500/20 hover:text-red-400 transition-all shadow-xl"
                                                                    title="Disconnect Node"
                                                                >
                                                                    <TrashIcon className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="h-full min-h-[300px] flex flex-col items-center justify-center bg-white/[0.02] border border-dashed border-white/10 rounded-[2.5rem] p-10 text-center">
                                                    <div className="p-6 rounded-full bg-white/5 mb-6">
                                                        <LinkIcon className="w-10 h-10 text-gray-700" />
                                                    </div>
                                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-500 mb-2">Isolated Hub</h3>
                                                    <p className="text-[10px] font-mono text-gray-700 uppercase tracking-widest leading-relaxed max-w-xs">No external resources are currently interconnected with this neural branch.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Section */}
                <footer className="px-10 py-8 border-t border-white/5 bg-gradient-to-t from-white/5 to-transparent flex flex-col sm:flex-row justify-between items-center gap-6 shrink-0">
                    <div className="flex gap-10">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-gray-700 uppercase tracking-[0.3em] mb-2">Active Resources</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-black text-white">{users.length}</span>
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Neural Nodes</span>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-gray-700 uppercase tracking-[0.3em] mb-2">Mesh Density</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-black text-white">{mainProject.links.length}</span>
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Connectors</span>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-gray-700 uppercase tracking-[0.3em] mb-2">Network Health</span>
                            <div className="flex items-center gap-2">
                                <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ width: '94%' }} />
                                </div>
                                <span className="text-[10px] font-black text-emerald-500">94%</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="text-right flex flex-col items-end">
                        <p className="text-[10px] font-mono text-gray-700 uppercase tracking-widest mb-1 italic leading-none">Accessing Encrypted Sub-Route 19.x.a</p>
                        <p className="text-[10px] font-mono text-emerald-500/40 uppercase tracking-widest font-black leading-none">Secure Uplink Active</p>
                    </div>
                </footer>
            </div>
        </div>,
        document.body
    );
};


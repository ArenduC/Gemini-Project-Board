import React, { useState, FormEvent, ReactNode } from 'react';
import { Project } from '../types';
import { generateProjectLinks } from '../services/geminiService';
import { LinkIcon, GitHubIcon, FigmaIcon, PlusIcon, TrashIcon, SparklesIcon, LoaderCircleIcon, CopyIcon, CheckIcon } from './Icons';
import { useConfirmation } from '../App';

interface ProjectLinksManagerProps {
  project: Project;
  onAddLink: (title: string, url: string) => Promise<void>;
  onDeleteLink: (linkId: string) => Promise<void>;
}

const getLinkIcon = (url: string): ReactNode => {
    try {
        const domain = new URL(url).hostname;
        if (domain.includes('github.com')) return <GitHubIcon className="w-4 h-4 text-emerald-400" />;
        if (domain.includes('figma.com')) return <FigmaIcon className="w-4 h-4 text-emerald-400" />;
    } catch (e) {
        // Invalid URL, fallback to generic icon
    }
    return <LinkIcon className="w-4 h-4 text-emerald-400" />;
};

export const ProjectLinksManager: React.FC<ProjectLinksManagerProps> = ({ project, onAddLink, onDeleteLink }) => {
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
    const requestConfirmation = useConfirmation();

    const handleAddSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !url.trim()) return;
        setIsAdding(true);
        try {
            await onAddLink(title, url);
            setTitle('');
            setUrl('');
        } catch (error) {
            console.error("Failed to add link:", error);
        } finally {
            setIsAdding(false);
        }
    };

    const handleAiGenerate = async () => {
        setIsGenerating(true);
        try {
            const links = await generateProjectLinks(project.name, project.description);
            for (const link of links) {
                await onAddLink(link.title, link.url);
            }
        } catch (error) {
            console.error("Failed to generate links with AI:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyLink = (linkUrl: string, linkId: string) => {
        navigator.clipboard.writeText(linkUrl);
        setCopiedLinkId(linkId);
        setTimeout(() => setCopiedLinkId(null), 2000);
    };
    
    const handleDelete = (linkId: string, linkTitle: string) => {
      requestConfirmation({
        title: 'Delete Link',
        message: (
          <>
            Are you sure you want to delete the link <strong>"{linkTitle}"</strong>?
          </>
        ),
        onConfirm: () => onDeleteLink(linkId),
        confirmText: 'Delete',
      });
    };

    return (
        <div className="bg-[#131C1B]/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300">
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="w-full px-6 py-4 flex justify-between items-center hover:bg-white/[0.02] transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <LinkIcon className="w-4 h-4" />
                    </div>
                    <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-white/70 group-hover:text-white transition-colors">Neural Resource Mesh</h3>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{project.links.length} Connected</span>
                    <div className={`transform transition-transform duration-300 text-gray-500 ${isOpen ? 'rotate-180' : ''}`}>
                        <PlusIcon className="w-4 h-4" />
                    </div>
                </div>
            </button>

            {isOpen && (
                <div className="p-6 border-t border-white/5 space-y-6 animate-in slide-in-from-top-2 duration-300">
                    {project.links.length > 0 ? (
                        <div className="space-y-3">
                            {project.links.map(link => (
                                <div key={link.id} className="group relative bg-white/5 border border-white/5 rounded-xl p-3 flex items-center gap-4 hover:border-emerald-500/30 transition-all">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-black/20 flex items-center justify-center border border-white/5">
                                        {getLinkIcon(link.url)}
                                    </div>
                                    <div className="flex-grow min-w-0 pr-16">
                                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="block font-bold text-xs text-white hover:text-emerald-400 truncate transition-colors mb-0.5">
                                            {link.title}
                                        </a>
                                        <p className="text-[10px] text-gray-500 font-mono truncate opacity-60">
                                            {link.url}
                                        </p>
                                    </div>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleCopyLink(link.url, link.id)}
                                            className="p-2 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-all"
                                            title="Copy Link"
                                        >
                                            {copiedLinkId === link.id ? <CheckIcon className="w-4 h-4 text-emerald-400" /> : <CopyIcon className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(link.id, link.title)}
                                            className="p-2 rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
                                            title="Delete Link"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center bg-black/10 rounded-xl border border-dashed border-white/5">
                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">No active mesh links</p>
                        </div>
                    )}

                    <div className="pt-6 border-t border-white/5 space-y-4">
                        <form onSubmit={handleAddSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Asset Label</label>
                                <input
                                    type="text" value={title} onChange={e => setTitle(e.target.value)}
                                    placeholder="e.g. Protocol Documentation"
                                    className="w-full px-4 py-2.5 border border-white/5 rounded-xl bg-black/20 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                 <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Remote Endpoint</label>
                                <input
                                    type="url" value={url} onChange={e => setUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full px-4 py-2.5 border border-white/5 rounded-xl bg-black/20 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                                    required
                                />
                            </div>
                            <button type="submit" disabled={isAdding} className="h-10 px-6 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-[10px] shadow-xl shadow-white/5">
                                {isAdding ? <LoaderCircleIcon className="w-4 h-4 animate-spin"/> : <PlusIcon className="w-4 h-4"/>}
                                <span className="mt-0.5">Attach Node</span>
                            </button>
                        </form>
                         
                         <button
                            onClick={handleAiGenerate}
                            disabled={isGenerating}
                            className="w-full group h-10 flex items-center justify-center gap-3 px-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black uppercase tracking-[0.2em] rounded-xl hover:bg-emerald-500/20 disabled:opacity-50 transition-all text-[10px] shadow-lg shadow-emerald-500/5"
                        >
                            {isGenerating ? (
                                <LoaderCircleIcon className="w-4 h-4 animate-spin" />
                            ) : (
                                <SparklesIcon className="w-4 h-4 group-hover:animate-pulse" />
                            )}
                            <span className="mt-0.5">{isGenerating ? 'Synthesizing...' : 'Predict Resource Links'}</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
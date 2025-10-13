import React, { useState, FormEvent, ReactNode } from 'react';
import { Project } from '../types';
import { generateProjectLinks } from '../services/geminiService';
import { LinkIcon, GitHubIcon, FigmaIcon, PlusIcon, TrashIcon, SparklesIcon, LoaderCircleIcon, CopyIcon, CheckIcon } from './Icons';

interface ProjectLinksManagerProps {
  project: Project;
  onAddLink: (title: string, url: string) => Promise<void>;
  onDeleteLink: (linkId: string) => Promise<void>;
}

const getLinkIcon = (url: string): ReactNode => {
    try {
        const domain = new URL(url).hostname;
        if (domain.includes('github.com')) return <GitHubIcon className="w-5 h-5 text-gray-400" />;
        if (domain.includes('figma.com')) return <FigmaIcon className="w-5 h-5 text-gray-400" />;
    } catch (e) {
        // Invalid URL, fallback to generic icon
    }
    return <LinkIcon className="w-5 h-5 text-gray-400" />;
};

export const ProjectLinksManager: React.FC<ProjectLinksManagerProps> = ({ project, onAddLink, onDeleteLink }) => {
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

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
            alert("Could not add link. Please try again.");
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
            alert("Could not generate links. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyLink = (linkUrl: string, linkId: string) => {
        navigator.clipboard.writeText(linkUrl);
        setCopiedLinkId(linkId);
        setTimeout(() => setCopiedLinkId(null), 2000);
    };

    return (
        <div className="bg-[#131C1B]/50 border border-gray-800 rounded-xl">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full p-4 flex justify-between items-center">
                <h3 className="font-semibold text-base text-white">Project Links</h3>
                <span className="text-gray-400 transform transition-transform duration-200">{isOpen ? 'Hide' : 'Show'}</span>
            </button>
            {isOpen && (
                <div className="p-4 border-t border-gray-800 space-y-4">
                    {project.links.length > 0 ? (
                        <div className="space-y-2">
                            {project.links.map(link => (
                                <div key={link.id} className="group flex items-center gap-3 p-2 rounded-md hover:bg-gray-800/50">
                                    {getLinkIcon(link.url)}
                                    <div className="flex-grow">
                                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm text-white hover:underline">{link.title}</a>
                                        <p className="text-xs text-gray-500 truncate">{link.url}</p>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleCopyLink(link.url, link.id)}
                                            className="p-1.5 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white"
                                            aria-label="Copy link"
                                        >
                                            {copiedLinkId === link.id ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => onDeleteLink(link.id)}
                                            className="p-1.5 rounded-full text-gray-400 hover:bg-red-900/50 hover:text-red-400"
                                            aria-label="Delete link"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 text-center py-2">No links added yet.</p>
                    )}

                    <div className="pt-4 border-t border-gray-800/50 space-y-3">
                        <form onSubmit={handleAddSubmit} className="flex flex-col sm:flex-row gap-2 items-end">
                            <div className="flex-grow w-full">
                                <label className="text-xs text-gray-400">Title</label>
                                <input
                                    type="text" value={title} onChange={e => setTitle(e.target.value)}
                                    placeholder="e.g. GitHub Repo"
                                    className="w-full mt-1 px-3 py-1.5 border border-gray-700 rounded-md bg-[#1C2326] text-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
                                    required
                                />
                            </div>
                            <div className="flex-grow w-full">
                                 <label className="text-xs text-gray-400">URL</label>
                                <input
                                    type="url" value={url} onChange={e => setUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full mt-1 px-3 py-1.5 border border-gray-700 rounded-md bg-[#1C2326] text-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
                                    required
                                />
                            </div>
                            <button type="submit" disabled={isAdding} className="flex-shrink-0 w-full sm:w-auto px-3 py-1.5 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 disabled:opacity-50 flex items-center justify-center gap-2">
                                {isAdding ? <LoaderCircleIcon className="w-5 h-5 animate-spin"/> : <PlusIcon className="w-4 h-4"/>}
                                Add Link
                            </button>
                        </form>
                         <button
                            onClick={handleAiGenerate}
                            disabled={isGenerating}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-600/50 border border-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 transition-all text-sm"
                        >
                            {isGenerating ? (
                                <>
                                    <LoaderCircleIcon className="w-5 h-5 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-5 h-5" />
                                    Generate with AI
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
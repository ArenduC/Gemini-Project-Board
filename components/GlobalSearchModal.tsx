

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Project, Task, User } from '../types';
import { performGlobalSearch, SearchResponse } from '../services/geminiService';
import { XIcon, SearchIcon, LoaderCircleIcon, BotMessageSquareIcon, LayoutDashboardIcon, CheckSquareIcon, UserIcon } from './Icons';
import { UserAvatar } from './UserAvatar';

interface GlobalSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    projects: Record<string, Project>;
    users: Record<string, User>;
    onSelectProject: (projectId: string) => void;
    onSelectTask: (task: Task) => void;
}

const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, projects, users, onSelectProject, onSelectTask }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const debouncedQuery = useDebounce(query, 500);

    const allTasks = useMemo(() => {
        const taskMap: Record<string, Task> = {};
        Object.values(projects).forEach(p => {
            Object.assign(taskMap, p.board.tasks);
        });
        return taskMap;
    }, [projects]);

    const handleSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults(null);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const searchResults = await performGlobalSearch(searchQuery, projects, users);
            setResults(searchResults);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            setResults(null);
        } finally {
            setIsLoading(false);
        }
    }, [projects, users]);

    useEffect(() => {
        handleSearch(debouncedQuery);
    }, [debouncedQuery, handleSearch]);

    useEffect(() => {
        if (!isOpen) {
            // Reset state on close
            setQuery('');
            setResults(null);
            setError(null);
            setIsLoading(false);
        }
    }, [isOpen]);

    const hasResults = results && (results.projects.length > 0 || results.tasks.length > 0 || results.users.length > 0);

    return (
        <div 
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-start pt-20 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[70vh] flex flex-col transform transition-all duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-4">
                    <SearchIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search tasks, projects, users..."
                        className="w-full bg-transparent text-base focus:outline-none"
                        autoFocus
                    />
                    <button onClick={onClose} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </header>
                <div className="flex-grow overflow-y-auto custom-scrollbar p-2">
                    {isLoading && (
                        <div className="p-6 flex items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
                            <LoaderCircleIcon className="w-6 h-6 animate-spin" />
                            <span>Searching with AI...</span>
                        </div>
                    )}
                    {error && (
                         <div className="p-6 text-center text-red-500">
                            <p><strong>Search Failed</strong></p>
                            <p className="text-sm">{error}</p>
                        </div>
                    )}
                    {!isLoading && !error && debouncedQuery && !hasResults && (
                        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                            <p>No results found for "{debouncedQuery}"</p>
                        </div>
                    )}
                    {!isLoading && !error && !debouncedQuery && (
                        <div className="p-10 flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
                            <BotMessageSquareIcon className="w-12 h-12 mb-4"/>
                             <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">AI-Powered Global Search</h3>
                            <p className="max-w-md text-sm">Find anything across your projects. Try searching for a task ID, a project name, or ask a question like "urgent tasks assigned to Alice".</p>
                        </div>
                    )}
                    {results && (
                        <div className="space-y-4 p-2">
                            {results.projects.length > 0 && (
                                <div>
                                    <h3 className="px-3 py-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 flex items-center gap-2"><LayoutDashboardIcon className="w-4 h-4" /> Projects</h3>
                                    {results.projects.map(id => projects[id] && (
                                        <button key={id} onClick={() => onSelectProject(id)} className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-sm">
                                            {projects[id].name}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {results.tasks.length > 0 && (
                                <div>
                                    <h3 className="px-3 py-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 flex items-center gap-2"><CheckSquareIcon className="w-4 h-4" /> Tasks</h3>
                                    {results.tasks.map(id => allTasks[id] && (
                                        <button key={id} onClick={() => onSelectTask(allTasks[id])} className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-sm">
                                            {allTasks[id].title}
                                        </button>
                                    ))}
                                </div>
                            )}
                             {results.users.length > 0 && (
                                <div>
                                    <h3 className="px-3 py-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 flex items-center gap-2"><UserIcon className="w-4 h-4" /> Users</h3>
                                    {results.users.map(id => users[id] && (
                                        <div key={id} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm">
                                            <UserAvatar user={users[id]} className="w-7 h-7" />
                                            <span>{users[id].name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
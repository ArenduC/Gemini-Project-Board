import React, { useState, useEffect, useCallback, FormEvent, useMemo, useRef } from 'react';
import { Task, Subtask, User, TaskPriority, Sprint, TaskHistory } from '../types';
import { generateSubtasks as generateSubtasksFromApi } from '../services/geminiService';
import { XIcon, BotMessageSquareIcon, LoaderCircleIcon, SparklesIcon, CheckSquareIcon, MessageSquareIcon, PlusIcon, UserIcon, TagIcon, TrashIcon, HistoryIcon, CopyIcon, CheckIcon } from './Icons';
import { UserAvatar } from './UserAvatar';
import { useConfirmation } from '../App';
import { JsonSyntaxHighlighter } from './JsonSyntaxHighlighter';
import { api } from '../services/api';

interface TaskDetailsModalProps {
  task: Task;
  currentUser: User;
  users: User[];
  projectMembers: User[];
  allProjectTags: string[];
  sprints: Sprint[];
  onlineUsers: Set<string>;
  onClose: () => void;
  onUpdateTask: (task: Task) => Promise<void>;
  onUpdateSubtask: (taskId: string, subtaskId: string, updates: Partial<Subtask>) => Promise<void>;
  onDeleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  onAddSubtasks: (taskId: string, subtasks: Partial<Subtask>[]) => Promise<void>;
  onAddComment: (taskId: string, commentText: string) => Promise<void>;
  aiFeaturesEnabled: boolean;
}

type AIGenerationState = 'idle' | 'loading' | 'success' | 'error';

const CopyButton: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button 
            onClick={handleCopy} 
            className={`p-1.5 rounded-md hover:bg-gray-700 transition-colors ${className}`}
            title="Copy to clipboard"
        >
            {copied ? <CheckIcon className="w-3.5 h-3.5 text-green-500" /> : <CopyIcon className="w-3.5 h-3.5 text-gray-400" />}
        </button>
    );
};

const isJsonContent = (text: string): boolean => {
    if (!text) return false;
    const trimmed = text.trim();
    if (!((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']')))) {
        return false;
    }
    try {
        JSON.parse(trimmed);
        return true;
    } catch {
        return false;
    }
};

const EditableField: React.FC<{value: string, onSave: (value: string) => void, isTextArea?: boolean, textClassName: string, inputClassName: string, placeholder?: string, type?: string }> = 
  ({ value, onSave, isTextArea = false, textClassName, inputClassName, placeholder, type = 'text' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);

  const handleSave = () => {
    if (currentValue !== value) {
        onSave(isTextArea ? currentValue.trim() : currentValue);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isTextArea) {
        handleSave();
    } else if (e.key === 'Escape') {
        setCurrentValue(value);
        setIsEditing(false);
    }
  }
  
  useEffect(() => {
    setCurrentValue(value);
  }, [value]);


  if (isEditing) {
    const commonProps = {
        value: currentValue,
        onChange: (e: any) => setCurrentValue(e.target.value),
        onBlur: handleSave,
        onKeyDown: handleKeyDown,
        className: `w-full ${inputClassName}`,
        autoFocus: true,
        placeholder,
    }
    return isTextArea 
        ? <textarea {...commonProps} rows={4} /> 
        : <input type={type} {...commonProps} />;
  }
  
  if (isJsonContent(value)) {
      return (
          <div onClick={() => setIsEditing(true)} className="cursor-pointer group relative">
              <div className="absolute top-2 right-2 text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 bg-[#0D1117] px-1 rounded border border-gray-800 z-10">Click to edit</div>
              <JsonSyntaxHighlighter data={value} />
          </div>
      );
  }

  return <div onClick={() => setIsEditing(true)} className={`min-h-[24px] ${textClassName}`}>{value || <span className="text-gray-500">{placeholder}</span>}</div>;
}

interface ActivitySectionProps {
    task: Task;
    onAddComment: (taskId: string, text: string) => Promise<void>;
    currentUser: User;
    projectMembers: User[];
    onlineUsers: Set<string>;
    users: User[];
}

const ActivitySection: React.FC<ActivitySectionProps> = ({ task, onAddComment, currentUser, projectMembers, onlineUsers, users }) => {
    const [newComment, setNewComment] = useState("");
    const [showMentions, setShowMentions] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [fetchedHistory, setFetchedHistory] = useState<TaskHistory[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    // Load full history from the server immediately to ensure transparency
    const loadHistory = useCallback(async () => {
        setIsHistoryLoading(true);
        try {
            const history = await api.data.fetchTaskHistory(task.id);
            setFetchedHistory(history);
        } catch (e) {
            console.error("Neural history sync failed:", e);
        } finally {
            setIsHistoryLoading(false);
        }
    }, [task.id]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const filteredMembers = useMemo(() => {
        if (!mentionSearch) return projectMembers;
        return projectMembers.filter(member => 
            member.name.toLowerCase().includes(mentionSearch.toLowerCase())
        );
    }, [mentionSearch, projectMembers]);

    const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setNewComment(text);

        const cursorPos = e.target.selectionStart;
        const textToCursor = text.substring(0, cursorPos);
        
        const lastAt = textToCursor.lastIndexOf('@');
        if (lastAt === -1) {
            setShowMentions(false);
            return;
        }

        const potentialMention = textToCursor.substring(lastAt + 1);

        if (/\s/.test(potentialMention)) {
            setShowMentions(false);
            return;
        }

        setShowMentions(true);
        setMentionSearch(potentialMention);
        setActiveIndex(0);
    };

    const handleMentionSelect = (user: User) => {
        const text = newComment;
        const lastAt = text.lastIndexOf('@');
        
        if (lastAt !== -1) {
            const prefix = text.substring(0, lastAt);
            const suffix = text.substring(lastAt + 1 + mentionSearch.length);

            setNewComment(`${prefix}@${user.name} ${suffix.trimStart()}`);
            setShowMentions(false);
            textareaRef.current?.focus();
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showMentions && filteredMembers.length > 0) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((prevIndex) => (prevIndex + 1) % filteredMembers.length); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((prevIndex) => (prevIndex - 1 + filteredMembers.length) % filteredMembers.length); }
            else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); handleMentionSelect(filteredMembers[activeIndex]); }
            else if (e.key === 'Escape') { e.preventDefault(); setShowMentions(false); }
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(newComment.trim()){
            await onAddComment(task.id, newComment.trim());
            setNewComment("");
            loadHistory(); // Reload history after commenting
        }
    };

    const combinedFeed = useMemo(() => {
      const comments = (task.comments || []).map(c => ({ ...c, type: 'comment' as const }));
      
      // Use the fetched history as primary source of truth for full audit trails
      const combinedHistoryMap = new Map();
      (task.history || []).forEach(h => combinedHistoryMap.set(h.id, h));
      fetchedHistory.forEach(h => combinedHistoryMap.set(h.id, h));
      
      const history = Array.from(combinedHistoryMap.values()).map(h => ({ ...h, type: 'history' as const }));
      
      const feed = [...comments, ...history];
      return feed.sort((a, b) => {
          const dateA = new Date(a.createdAt || (a as any).created_at).getTime();
          const dateB = new Date(b.createdAt || (b as any).created_at).getTime();
          return dateB - dateA;
      });
    }, [task.comments, task.history, fetchedHistory]);

    const renderWithMentions = (text: string) => {
        const escapeRegex = (str: string) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const userNames = users.map(u => escapeRegex(u.name)).join('|');
        const regexParts = [];
        if (userNames) regexParts.push(`(@(${userNames})\\b)`);
        regexParts.push(`(https?:\\/\\/\\S+)`);
        const combinedRegex = new RegExp(regexParts.join('|'), 'g');
        const elements: React.ReactNode[] = [];
        let lastIndex = 0;
        let match;

        while ((match = combinedRegex.exec(text)) !== null) {
            let userName, url;
            if (userNames) { userName = match[2]; url = match[3]; } else { url = match[1]; }
            const fullMatch = match[0];
            const matchIndex = match.index;
            if (matchIndex > lastIndex) elements.push(text.substring(lastIndex, matchIndex));
            if (userName) elements.push(<strong key={matchIndex} className="bg-gray-500/30 text-white font-semibold rounded px-1 py-0.5">@{userName}</strong>);
            else if (url) elements.push(<a key={matchIndex} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline" onClick={(e) => e.stopPropagation()}>{url}</a>);
            lastIndex = matchIndex + fullMatch.length;
        }
        if (lastIndex < text.length) elements.push(text.substring(lastIndex));
        return <>{elements.length > 0 ? elements : text}</>;
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-semibold flex items-center gap-2 text-white">
                    <MessageSquareIcon className="w-5 h-5 text-emerald-400" /> 
                    Activity & Node Audit Trail
                </h3>
                <button 
                    onClick={loadHistory}
                    disabled={isHistoryLoading}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-emerald-400 transition-colors"
                    title="Refresh Audit Trail"
                >
                    <LoaderCircleIcon className={`w-4 h-4 ${isHistoryLoading ? 'animate-spin text-emerald-500' : ''}`} />
                </button>
            </div>
            
            <div className="flex items-start gap-3 mb-8">
                <UserAvatar user={currentUser} className="w-9 h-9 flex-shrink-0" isOnline={onlineUsers.has(currentUser.id)}/>
                <form onSubmit={handleSubmit} className="flex-grow">
                    <div className="relative">
                        <textarea 
                            ref={textareaRef}
                            value={newComment}
                            onChange={handleCommentChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Add a comment... Use @ to mention"
                            className="w-full px-4 py-3 border border-white/5 rounded-2xl shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-500/50 bg-[#1C2326] text-white text-xs leading-relaxed"
                            rows={2}
                        />
                        {showMentions && filteredMembers.length > 0 && (
                            <div className="absolute z-10 w-full bg-[#1C2326] border border-gray-700 rounded-xl shadow-2xl mt-2 max-h-48 overflow-y-auto custom-scrollbar">
                                <ul>
                                    {filteredMembers.map((user, index) => (
                                        <li 
                                            key={user.id}
                                            onClick={() => handleMentionSelect(user)}
                                            onMouseEnter={() => setActiveIndex(index)}
                                            className={`px-4 py-2.5 cursor-pointer flex items-center gap-3 ${index === activeIndex ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                        >
                                            <UserAvatar user={user} className="w-6 h-6 text-[8px] flex-shrink-0" isOnline={onlineUsers.has(user.id)} />
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-white">{user.name}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    {newComment.trim() && !showMentions && (
                        <div className="flex justify-end mt-3">
                            <button type="submit" className="px-6 py-2 bg-emerald-500 text-black font-black uppercase tracking-widest rounded-xl text-[10px] hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/10">
                                Broadcast Update
                            </button>
                        </div>
                    )}
                </form>
            </div>

            <div className="space-y-6">
                {combinedFeed.length > 0 ? combinedFeed.map(item => {
                  const author = item.type === 'comment' ? item.author : item.user;
                  const authorName = author?.name || (typeof (item as any).user_id === 'string' ? users.find(u => u.id === (item as any).user_id)?.name : 'System') || 'Neural Entity';
                  const isJson = item.type === 'comment' ? isJsonContent(item.text) : false;
                  const createdAt = item.createdAt || (item as any).created_at;

                  return (
                    <div key={`${item.type}-${item.id}`} className="flex items-start gap-4 group animate-in fade-in slide-in-from-left-2 duration-300">
                         <div className="flex-shrink-0 mt-1">
                            {item.type === 'comment' ? (
                                <UserAvatar user={author} className="w-9 h-9 ring-2 ring-white/5" isOnline={author ? onlineUsers.has(author.id) : false}/>
                            ) : (
                                <div className="w-9 h-9 flex items-center justify-center bg-white/5 rounded-full border border-white/5 text-gray-500 group-hover:text-emerald-500 group-hover:bg-emerald-500/10 transition-colors">
                                    <HistoryIcon className="w-4 h-4" />
                                </div>
                            )}
                         </div>
                         <div className="flex-grow min-w-0">
                            {item.type === 'comment' ? (
                                <>
                                    <div className="flex items-baseline gap-3 mb-1.5">
                                        <span className="font-bold text-sm text-white tracking-tight">{authorName}</span>
                                        <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">{new Date(createdAt).toLocaleString()}</span>
                                    </div>
                                    <div className="relative">
                                        {isJson ? (
                                            <div className="mt-1">
                                                <JsonSyntaxHighlighter data={item.text} />
                                            </div>
                                        ) : (
                                            <div className="bg-[#1C2326] p-4 rounded-2xl border border-white/5 relative overflow-hidden group/comment">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/20" />
                                                <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{renderWithMentions(item.text)}</p>
                                                <div className="absolute top-2 right-2 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                                                    <CopyButton text={item.text} className="bg-black/40 hover:bg-black/60 p-1.5 rounded-lg" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="py-1">
                                    <p className="text-xs text-gray-400 leading-relaxed">
                                        <span className="font-bold text-gray-300">{authorName}</span>
                                        {' '}
                                        <span className="text-gray-500 italic">{(item as any).changeDescription || (item as any).change_description}</span>
                                    </p>
                                    <span className="text-[9px] font-mono text-gray-700 uppercase tracking-widest block mt-1.5">
                                        {new Date(createdAt).toLocaleString()}
                                    </span>
                                </div>
                            )}
                         </div>
                    </div>
                  )
                }) : (
                    <div className="text-center py-16 opacity-30">
                         {isHistoryLoading ? (
                             <LoaderCircleIcon className="w-10 h-10 mx-auto mb-3 animate-spin text-gray-600" />
                         ) : (
                             <HistoryIcon className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                         )}
                         <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
                             {isHistoryLoading ? 'Synchronizing records...' : 'No activity logged in this node cluster.'}
                         </p>
                    </div>
                )}
            </div>
        </div>
    )
}


export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ task, currentUser, users, projectMembers, allProjectTags, sprints, onlineUsers, onClose, onUpdateTask, onUpdateSubtask, onDeleteSubtask, onAddSubtasks, onAddComment, aiFeaturesEnabled }) => {
  const [editedTask, setEditedTask] = useState<Task>(task);
  const [aiState, setAiState] = useState<AIGenerationState>('idle');
  const [aiError, setAiError] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskAssigneeId, setNewSubtaskAssigneeId] = useState('');
  const [newTag, setNewTag] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [isTagInputFocused, setIsTagInputFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const requestConfirmation = useConfirmation();

  const taskCreator = users.find(u => u.id === task.creatorId);

  useEffect(() => {
    setEditedTask(task);
  }, [task]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);
  
  const handleUpdateField = (field: keyof Task, value: any) => {
    const updatedTask = { ...editedTask, [field]: value };
    setEditedTask(updatedTask);
    onUpdateTask(updatedTask);
  };

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const assigneeId = e.target.value;
    const assignee = projectMembers.find(u => u.id === assigneeId);
    handleUpdateField('assignee', assignee);
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const priority = e.target.value as TaskPriority;
    handleUpdateField('priority', priority);
  };
  
  const handleSprintChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sprintId = e.target.value;
    handleUpdateField('sprintId', sprintId || null);
  };

  const handleSubtaskToggle = (subtaskId: string) => {
    const subtask = editedTask.subtasks.find(s => s.id === subtaskId);
    if (subtask) {
        onUpdateSubtask(editedTask.id, subtaskId, { completed: !subtask.completed });
    }
  };
  
  const handleSubtaskTitleChange = (subtaskId: string, newTitle: string) => {
    onUpdateSubtask(editedTask.id, subtaskId, { title: newTitle });
  };

  const handleGenerateSubtasks = useCallback(async () => {
    setAiState('loading');
    setAiError(null);
    try {
        const generated = await generateSubtasksFromApi(editedTask.title, editedTask.description);
        if (generated && generated.length > 0) {
            await onAddSubtasks(editedTask.id, generated.map(s => ({ title: s.title })));
        }
        setAiState('success');
    } catch(err) {
        setAiState('error');
        setAiError(err instanceof Error ? err.message : 'Neural link failure.');
    }
  }, [editedTask, onAddSubtasks]);

  const handleAddManualSubtask = async (e: FormEvent) => {
    e.preventDefault();
    if (newSubtaskTitle.trim()) {
        const newSubtask: Partial<Subtask> = { 
          title: newSubtaskTitle.trim(),
          assigneeId: newSubtaskAssigneeId || undefined,
        };
        await onAddSubtasks(editedTask.id, [newSubtask]);
        setNewSubtaskTitle('');
        setNewSubtaskAssigneeId('');
    }
  }

  const handleSubtaskAssigneeChange = (subtaskId: string, assigneeId: string) => {
    onUpdateSubtask(editedTask.id, subtaskId, { assigneeId: assigneeId || null });
  };

  const handleNewTagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewTag(value);
    if (value) {
        const filtered = allProjectTags.filter(
            tag => tag.toLowerCase().includes(value.toLowerCase()) && !editedTask.tags.includes(tag)
        );
        setTagSuggestions(filtered);
        setActiveSuggestionIndex(0);
    } else {
        setTagSuggestions([]);
    }
  };

  const addTag = (tagToAdd: string) => {
    if (tagToAdd && !editedTask.tags.includes(tagToAdd)) {
        const newTags = [...new Set([...editedTask.tags, tagToAdd.trim()])];
        handleUpdateField('tags', newTags);
        setNewTag('');
        setTagSuggestions([]);
    }
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isTagInputFocused && tagSuggestions.length > 0) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActiveSuggestionIndex(prev => (prev + 1) % tagSuggestions.length); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); setActiveSuggestionIndex(prev => (prev - 1 + tagSuggestions.length) % tagSuggestions.length); return; }
    }
    if (e.key === 'Enter') {
        e.preventDefault();
        let tagToAdd = newTag.trim();
        if (isTagInputFocused && tagSuggestions.length > 0 && tagSuggestions[activeSuggestionIndex]) {
            tagToAdd = tagSuggestions[activeSuggestionIndex];
        }
        addTag(tagToAdd);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
      const newTags = editedTask.tags.filter(tag => tag !== tagToRemove);
      handleUpdateField('tags', newTags);
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    const subtaskToDelete = editedTask.subtasks.find(s => s.id === subtaskId);
    if (subtaskToDelete) {
      requestConfirmation({
        title: 'Delete Subtask',
        message: <>Remove subtask <strong>"{subtaskToDelete.title}"</strong>?</>,
        onConfirm: () => {
          onDeleteSubtask(editedTask.id, subtaskId);
        },
        confirmText: 'Delete',
      });
    }
  };

  const completedSubtasks = (editedTask.subtasks || []).filter(st => st.completed).length;
  const totalSubtasks = (editedTask.subtasks || []).length;
  const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-[#131C1B] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-white/5 relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
        
        <header className="px-6 py-5 border-b border-white/5 flex justify-between items-center flex-shrink-0 bg-white/[0.02]">
            <div className="flex-grow mr-4 group flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/5 text-gray-500">
                    <CheckSquareIcon className="w-5 h-5" />
                </div>
                <div className="flex-grow">
                    <EditableField 
                        value={editedTask.title}
                        onSave={(newTitle) => handleUpdateField('title', newTitle)}
                        textClassName="text-xl font-black w-full cursor-pointer hover:text-emerald-400 rounded transition-colors text-white tracking-tight"
                        inputClassName="text-xl font-black p-1 rounded border-2 border-emerald-500/20 bg-black/40 focus:outline-none text-white w-full"
                        placeholder="Task Title"
                    />
                </div>
                <CopyButton text={editedTask.title} className="opacity-0 group-hover:opacity-100 flex-shrink-0" />
            </div>
            <button onClick={onClose} className="p-2.5 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-all">
                <XIcon className="w-6 h-6" />
            </button>
        </header>
        
        <div className="p-8 overflow-y-auto custom-scrollbar flex-grow space-y-10">
            <div className="flex flex-wrap items-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-2.5">
                    <UserIcon className="w-3 h-3 text-emerald-500" />
                    <span>Origin:</span>
                    {taskCreator ? (
                        <div className="flex items-center gap-2 bg-black/20 px-2 py-1 rounded-lg">
                            <UserAvatar user={taskCreator} className="w-5 h-5 text-[8px]" isOnline={onlineUsers.has(taskCreator.id)} />
                            <span className="text-white">{taskCreator.name}</span>
                        </div>
                    ) : (
                        <span className="text-white">External Node</span>
                    )}
                </div>
                <div className="flex items-center gap-2.5">
                    <HistoryIcon className="w-3 h-3 text-emerald-500" />
                    <span>Injected:</span>
                    <span className="text-white font-mono">{new Date(task.createdAt).toLocaleDateString()}</span>
                </div>
            </div>

            <section>
                <div className="flex items-center gap-2 mb-4">
                    <MessageSquareIcon className="w-4 h-4 text-emerald-500" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Contextual Data</h4>
                </div>
                <div className="group relative">
                    <EditableField 
                        value={editedTask.description}
                        onSave={(newDesc) => handleUpdateField('description', newDesc)}
                        isTextArea
                        textClassName="text-sm text-gray-300 w-full cursor-pointer hover:bg-white/5 rounded-xl p-4 -m-4 min-h-[80px] leading-relaxed border border-transparent hover:border-white/10"
                        inputClassName="text-sm p-4 rounded-xl border-2 border-emerald-500/20 bg-black/40 focus:outline-none text-white w-full shadow-inner"
                        placeholder="No context provided. Click to synthesize description..."
                    />
                    {!isJsonContent(editedTask.description) && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <CopyButton text={editedTask.description} className="bg-black/60 p-1.5 rounded-lg" />
                        </div>
                    )}
                </div>
            </section>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Assignee</label>
                    <div className="relative">
                        <select
                          value={editedTask.assignee?.id || ''}
                          onChange={handleAssigneeChange}
                          className="w-full pl-3 pr-10 py-2.5 border border-white/5 rounded-xl bg-white/5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 appearance-none font-bold"
                        >
                          <option value="">Unassigned</option>
                          {projectMembers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600">
                             <UserIcon className="w-4 h-4" />
                        </div>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Priority</label>
                    <select
                      value={editedTask.priority}
                      onChange={handlePriorityChange}
                      className="w-full px-3 py-2.5 border border-white/5 rounded-xl bg-white/5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 font-bold uppercase tracking-widest"
                    >
                      {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Active Sprint</label>
                    <select
                      value={editedTask.sprintId || ''}
                      onChange={handleSprintChange}
                      className="w-full px-3 py-2 border border-white/5 rounded-xl bg-white/5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 font-bold"
                    >
                      <option value="">Backlog</option>
                      {(sprints || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Due Cycle</label>
                    <div className="bg-white/5 border border-white/5 rounded-xl p-0.5">
                        <EditableField
                            value={editedTask.dueDate || ''}
                            onSave={(newDate) => handleUpdateField('dueDate', newDate)}
                            type="date"
                            textClassName="text-xs text-white font-bold text-center px-2 py-2 cursor-pointer hover:bg-white/5 rounded-lg"
                            inputClassName="text-xs p-1.5 rounded bg-black/40 border-emerald-500/20 focus:outline-none text-white text-center"
                            placeholder="Set Due Date"
                        />
                    </div>
                </div>
            </div>

             <section>
                <div className="flex items-center gap-2 mb-4">
                    <TagIcon className="w-4 h-4 text-emerald-500" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Node Tags</h4>
                </div>
                <div className="relative bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="flex flex-wrap gap-2 items-center">
                        {editedTask.tags.map(tag => (
                            <span key={tag} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-lg border border-emerald-500/20 transition-all hover:bg-emerald-500/20">
                                {tag}
                                <button onClick={() => handleRemoveTag(tag)} className="text-emerald-500/50 hover:text-emerald-400">
                                    <XIcon className="w-3.5 h-3.5"/>
                                </button>
                            </span>
                        ))}
                         <input 
                            type="text"
                            value={newTag}
                            onChange={handleNewTagChange}
                            onKeyDown={handleTagInputKeyDown}
                            onFocus={() => setIsTagInputFocused(true)}
                            onBlur={() => setTimeout(() => setIsTagInputFocused(false), 200)}
                            placeholder="+ Add Label..."
                            className="flex-grow px-2 py-1 text-xs font-bold uppercase tracking-widest bg-transparent focus:outline-none text-white placeholder-gray-600"
                        />
                    </div>
                     {isTagInputFocused && tagSuggestions.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 top-full mt-2 bg-[#1C2326] border border-white/10 rounded-xl shadow-2xl max-h-40 overflow-y-auto custom-scrollbar overflow-hidden">
                          {tagSuggestions.map((tag, index) => (
                              <button 
                                  key={tag}
                                  onClick={() => addTag(tag)}
                                  onMouseEnter={() => setActiveSuggestionIndex(index)}
                                  className={`w-full text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest ${index === activeSuggestionIndex ? 'bg-emerald-500 text-black' : 'text-white hover:bg-white/5'}`}
                              >
                                  {tag}
                              </button>
                          ))}
                      </div>
                    )}
                </div>
            </section>
          
          <section>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <CheckSquareIcon className="w-4 h-4 text-emerald-500" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Sub-Nodes</h4>
                </div>
                {totalSubtasks > 0 && (
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-emerald-500/70">{Math.round(progress)}% Complete</span>
                        <div className="w-32 bg-white/5 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-3 mb-6">
              {(editedTask.subtasks || []).map(subtask => {
                return (
                    <div key={subtask.id} className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl group border border-white/5 hover:border-white/10 transition-all">
                        <input
                            type="checkbox"
                            checked={subtask.completed}
                            onChange={() => handleSubtaskToggle(subtask.id)}
                            className="w-5 h-5 rounded-lg border-2 border-white/10 bg-black/40 text-emerald-500 focus:ring-emerald-500/50 flex-shrink-0 cursor-pointer"
                        />
                        <div className="flex-grow min-w-0">
                             <EditableField
                                value={subtask.title}
                                onSave={(newTitle) => handleSubtaskTitleChange(subtask.id, newTitle)}
                                textClassName={`text-sm font-medium ${subtask.completed ? 'line-through text-gray-600' : 'text-gray-200'} truncate`}
                                inputClassName="text-sm p-1 rounded bg-black/40 border-emerald-500/20 focus:outline-none text-white w-full"
                                placeholder="Edit sub-node..."
                            />
                        </div>
                        <div className="ml-auto flex items-center gap-2.5 opacity-40 group-hover:opacity-100 transition-opacity">
                            <select
                                value={subtask.assigneeId || ''}
                                onChange={(e) => handleSubtaskAssigneeChange(subtask.id, e.target.value)}
                                className="text-[9px] font-black uppercase tracking-widest bg-black/40 border border-white/5 text-white rounded-lg py-1 px-2 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                            >
                                <option value="">Auto</option>
                                {projectMembers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                            
                            <UserAvatar 
                                user={subtask.assignee}
                                className="w-6 h-6 text-[8px] flex-shrink-0" 
                                isOnline={subtask.assignee ? onlineUsers.has(subtask.assignee.id) : false}
                            />
                            
                            <button 
                                onClick={() => handleDeleteSubtask(subtask.id)}
                                className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
                            >
                                <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )
              })}
            </div>

            <form onSubmit={handleAddManualSubtask} className="flex flex-wrap items-center gap-3 bg-black/20 p-2 rounded-2xl border border-white/5">
                <input 
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="New Sub-Node Objective..."
                    className="flex-grow px-4 py-2 bg-transparent text-sm text-white focus:outline-none"
                />
                <div className="flex items-center gap-2">
                    <select
                        value={newSubtaskAssigneeId}
                        onChange={(e) => setNewSubtaskAssigneeId(e.target.value)}
                        className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-xl text-[10px] font-bold uppercase text-gray-400 focus:text-white transition-colors"
                    >
                        <option value="">Unassigned</option>
                        {projectMembers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <button type="submit" disabled={!newSubtaskTitle.trim()} className="p-2.5 bg-white text-black rounded-xl hover:bg-gray-200 transition-all disabled:opacity-30">
                        <PlusIcon className="w-4 h-4"/>
                    </button>
                </div>
            </form>

            {aiFeaturesEnabled && (
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-2xl mt-8 relative overflow-hidden group/ai">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/ai:opacity-10 transition-opacity">
                        <SparklesIcon className="w-16 h-16 text-emerald-400" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <SparklesIcon className="w-4 h-4 text-emerald-400 animate-pulse"/>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Neural Decomposition</h4>
                    </div>
                    <p className="text-xs text-emerald-400/60 mb-6 leading-relaxed">
                        AI will analyze task complexity and synthesize a hierarchy of granular sub-nodes.
                    </p>
                    <button
                        onClick={handleGenerateSubtasks}
                        disabled={aiState === 'loading'}
                        className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-emerald-500 text-black font-black uppercase tracking-[0.2em] rounded-xl shadow-xl shadow-emerald-500/10 hover:bg-emerald-400 transition-all text-[10px] disabled:opacity-50"
                    >
                    {aiState === 'loading' ? (
                        <>
                            <LoaderCircleIcon className="w-4 h-4 animate-spin" />
                            Generating Mesh...
                        </>
                    ) : (
                        <>
                            <BotMessageSquareIcon className="w-4 h-4" />
                            Synthesize Sub-Nodes
                        </>
                    )}
                    </button>
                    {aiState === 'error' && <p className="text-[10px] text-red-400 font-bold uppercase mt-3 tracking-widest text-center">{aiError}</p>}
                </div>
            )}
          </section>

          <div className="pt-10 border-t border-white/5">
            <ActivitySection 
                task={editedTask} 
                onAddComment={onAddComment} 
                currentUser={currentUser} 
                projectMembers={projectMembers} 
                onlineUsers={onlineUsers} 
                users={users} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};
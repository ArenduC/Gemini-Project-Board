import React, { useState, useEffect, useCallback, FormEvent, useMemo, useRef } from 'react';
import { Task, Subtask, User, TaskPriority, Sprint } from '../types';
import { generateSubtasks as generateSubtasksFromApi } from '../services/geminiService';
import { XIcon, BotMessageSquareIcon, LoaderCircleIcon, SparklesIcon, CheckSquareIcon, MessageSquareIcon, PlusIcon, UserIcon, TagIcon, TrashIcon, HistoryIcon, CopyIcon, CheckIcon } from './Icons';
import { UserAvatar } from './UserAvatar';
import { useConfirmation } from '../App';
import { JsonSyntaxHighlighter } from './JsonSyntaxHighlighter';

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
  onAddSubtasks: (taskId: string, subtasks: Partial<Subtask>[]) => Promise<void>;
  onAddComment: (taskId: string, commentText: string) => Promise<void>;
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
  
  // Custom rendering for read-only view if content is JSON
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
        }
    };

    const combinedFeed = useMemo(() => {
      const comments = task.comments.map(c => ({ ...c, type: 'comment' as const }));
      const history = task.history.map(h => ({ ...h, type: 'history' as const }));
      const feed = [...comments, ...history];
      feed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return feed;
    }, [task.comments, task.history]);

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
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-white"><MessageSquareIcon className="w-5 h-5" /> Activity</h3>
            <div className="flex items-start gap-3 mb-4">
                <UserAvatar user={currentUser} className="w-9 h-9 flex-shrink-0" isOnline={onlineUsers.has(currentUser.id)}/>
                <form onSubmit={handleSubmit} className="flex-grow">
                    <div className="relative">
                        <textarea 
                            ref={textareaRef}
                            value={newComment}
                            onChange={handleCommentChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Add a comment... Type @ to mention a user."
                            className="w-full px-3 py-2 border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 bg-[#1C2326] text-white text-sm"
                            rows={2}
                        />
                        {showMentions && filteredMembers.length > 0 && (
                            <div className="absolute z-10 w-full bg-[#1C2326] border border-gray-700 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto custom-scrollbar">
                                <ul>
                                    {filteredMembers.map((user, index) => (
                                        <li 
                                            key={user.id}
                                            onClick={() => handleMentionSelect(user)}
                                            onMouseEnter={() => setActiveIndex(index)}
                                            className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${index === activeIndex ? 'bg-gray-700' : 'hover:bg-gray-800/50'}`}
                                        >
                                            <UserAvatar user={user} className="w-6 h-6 text-xs flex-shrink-0" isOnline={onlineUsers.has(user.id)} />
                                            <span className="text-sm text-white">{user.name}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    {newComment && !showMentions && (
                        <button type="submit" className="mt-2 px-4 py-1.5 bg-gray-300 text-black font-semibold rounded-md text-sm hover:bg-gray-400">
                            Comment
                        </button>
                    )}
                </form>
            </div>
            <div className="space-y-4">
                {combinedFeed.map(item => {
                  const author = item.type === 'comment' ? item.author : item.user;
                  const isJson = item.type === 'comment' ? isJsonContent(item.text) : false;

                  return (
                    <div key={`${item.type}-${item.id}`} className="flex items-start gap-3 group">
                         {item.type === 'comment' ? (
                            <UserAvatar user={author} className="w-9 h-9 flex-shrink-0" isOnline={onlineUsers.has(author.id)}/>
                         ) : (
                            <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-[#1C2326] rounded-full">
                                <HistoryIcon className="w-5 h-5 text-gray-400" />
                            </div>
                         )}
                         <div className="flex-grow pt-1.5 relative w-full min-w-0">
                            {item.type === 'comment' ? (
                                <>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm text-white">{author.name}</span>
                                        <span className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</span>
                                    </div>
                                    <div className="relative">
                                        {isJson ? (
                                            <div className="mt-1">
                                                <JsonSyntaxHighlighter data={item.text} />
                                            </div>
                                        ) : (
                                            <>
                                                <p className="bg-[#1C2326] p-3 rounded-lg mt-1 whitespace-pre-wrap text-sm text-white">{renderWithMentions(item.text)}</p>
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                    <CopyButton text={item.text} className="bg-gray-800 hover:bg-gray-700 p-1" />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-gray-400">
                                    <span className="font-semibold text-white">{author.name}</span>
                                    {' '}
                                    {item.changeDescription}
                                    <span className="block text-xs mt-0.5">{new Date(item.createdAt).toLocaleString()}</span>
                                </p>
                            )}
                         </div>
                    </div>
                  )
                })}
            </div>
        </div>
    )
}


export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ task, currentUser, users, projectMembers, allProjectTags, sprints, onlineUsers, onClose, onUpdateTask, onAddSubtasks, onAddComment }) => {
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
    setEditedTask(task); // Sync with external updates
  }, [task]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
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
    const updatedSubtasks = editedTask.subtasks.map(subtask => 
      subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask
    );
    handleUpdateField('subtasks', updatedSubtasks);
  };
  
  const handleSubtaskTitleChange = (subtaskId: string, newTitle: string) => {
    const updatedSubtasks = editedTask.subtasks.map(subtask => 
      subtask.id === subtaskId ? { ...subtask, title: newTitle } : subtask
    );
    handleUpdateField('subtasks', updatedSubtasks);
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
        setAiError(err instanceof Error ? err.message : 'An unknown error occurred.');
        console.error("Error generating subtasks:", err);
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
    const newAssignee = projectMembers.find(u => u.id === assigneeId);

    const updatedSubtasks = editedTask.subtasks.map(subtask => {
        if (subtask.id === subtaskId) {
            return { 
                ...subtask, 
                assigneeId: newAssignee ? newAssignee.id : undefined,
                assignee: newAssignee || undefined,
            };
        }
        return subtask;
    });

    handleUpdateField('subtasks', updatedSubtasks);
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
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveSuggestionIndex(prev => (prev + 1) % tagSuggestions.length);
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveSuggestionIndex(prev => (prev - 1 + tagSuggestions.length) % tagSuggestions.length);
            return;
        }
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
        message: (
          <>
            Are you sure you want to delete the subtask <strong>"{subtaskToDelete.title}"</strong>?
          </>
        ),
        onConfirm: () => {
          const updatedSubtasks = editedTask.subtasks.filter(subtask => subtask.id !== subtaskId);
          handleUpdateField('subtasks', updatedSubtasks);
        },
        confirmText: 'Delete',
      });
    }
  };

  const completedSubtasks = editedTask.subtasks.filter(st => st.completed).length;
  const totalSubtasks = editedTask.subtasks.length;
  const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#131C1B] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-800 flex justify-between items-center flex-shrink-0">
            <div className="flex-grow mr-4 group flex items-center gap-2">
                <EditableField 
                    value={editedTask.title}
                    onSave={(newTitle) => handleUpdateField('title', newTitle)}
                    textClassName="text-lg font-bold w-full cursor-pointer hover:bg-gray-800/50 rounded p-1 -m-1 text-white"
                    inputClassName="text-lg font-bold p-1 rounded border-2 border-gray-500 bg-[#1C2326] focus:outline-none text-white"
                    placeholder="Enter a task title..."
                />
                <CopyButton text={editedTask.title} className="opacity-0 group-hover:opacity-100 flex-shrink-0" />
            </div>
            <div className="flex items-center gap-2">
                <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-800 transition-colors">
                    <XIcon className="w-6 h-6" />
                </button>
            </div>
        </header>
        
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
            <div className="flex items-center gap-2 text-xs text-gray-400">
                <UserIcon className="w-4 h-4" />
                <span>Created by</span>
                {taskCreator ? (
                    <>
                        <UserAvatar user={taskCreator} className="w-6 h-6 text-xs" isOnline={onlineUsers.has(taskCreator.id)} />
                        <span className="font-semibold text-white">{taskCreator.name}</span>
                    </>
                ) : (
                    <span className="font-semibold text-white">Unknown User</span>
                )}
                <span>on {new Date(task.createdAt).toLocaleDateString()}</span>
            </div>

            <div className="group relative">
                <EditableField 
                    value={editedTask.description}
                    onSave={(newDesc) => handleUpdateField('description', newDesc)}
                    isTextArea
                    textClassName="text-sm text-white w-full cursor-pointer hover:bg-gray-800/50 rounded p-2 -m-2 min-h-[50px]"
                    inputClassName="text-sm p-2 rounded border-2 border-gray-500 bg-[#1C2326] focus:outline-none text-white"
                    placeholder="Add a more detailed description..."
                />
                {!isJsonContent(editedTask.description) && (
                    <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <CopyButton text={editedTask.description} className="bg-[#1C2326]/80 p-1" />
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="modal-assignee" className="block text-sm font-medium text-white mb-1">Assignee</label>
                    <select
                      id="modal-assignee"
                      value={editedTask.assignee?.id || ''}
                      onChange={handleAssigneeChange}
                      className="w-full px-3 py-2 border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 bg-[#1C2326] text-white text-sm"
                    >
                      <option value="">Unassigned</option>
                      {projectMembers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="modal-priority" className="block text-sm font-medium text-white mb-1">Priority</label>
                    <select
                      id="modal-priority"
                      value={editedTask.priority}
                      onChange={handlePriorityChange}
                      className="w-full px-3 py-2 border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 bg-[#1C2326] text-white text-sm"
                    >
                      {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="modal-sprint" className="block text-sm font-medium text-white mb-1">Sprint</label>
                    <select
                      id="modal-sprint"
                      value={editedTask.sprintId || ''}
                      onChange={handleSprintChange}
                      className="w-full px-3 py-2 border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 bg-[#1C2326] text-white text-sm"
                    >
                      <option value="">No Sprint</option>
                      {(sprints || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-white mb-1">Due Date</label>
                    <EditableField
                        value={editedTask.dueDate || ''}
                        onSave={(newDate) => handleUpdateField('dueDate', newDate)}
                        type="date"
                        textClassName="text-sm text-white w-full cursor-pointer hover:bg-gray-800/50 rounded p-2 -m-2"
                        inputClassName="text-sm p-1.5 rounded border-2 border-gray-500 bg-[#1C2326] focus:outline-none text-white"
                        placeholder="No due date"
                    />
                </div>
            </div>

             <div>
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-white"><TagIcon className="w-5 h-5" /> Tags</h3>
                <div className="relative">
                    <div className="flex flex-wrap gap-2 items-center">
                        {editedTask.tags.map(tag => (
                            <span key={tag} className="flex items-center gap-1.5 text-xs font-medium bg-gray-800 text-gray-400 px-2.5 py-1 rounded-full">
                                {tag}
                                <button onClick={() => handleRemoveTag(tag)} className="text-gray-400 hover:text-white">
                                    <XIcon className="w-3 h-3"/>
                                </button>
                            </span>
                        ))}
                         <input 
                            type="text"
                            value={newTag}
                            onChange={handleNewTagChange}
                            onKeyDown={handleTagInputKeyDown}
                            onFocus={() => setIsTagInputFocused(true)}
                            onBlur={() => setTimeout(() => setIsTagInputFocused(false), 150)} // Delay to allow click on suggestion
                            placeholder="Add tag..."
                            className="flex-grow px-2 py-1 text-sm border-b-2 border-transparent focus:border-gray-500 bg-transparent focus:outline-none text-white"
                        />
                    </div>
                     {isTagInputFocused && tagSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full bg-[#1C2326] border border-gray-700 rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto custom-scrollbar">
                          <ul>
                              {tagSuggestions.map((tag, index) => (
                                  <li 
                                      key={tag}
                                      onClick={() => addTag(tag)}
                                      onMouseEnter={() => setActiveSuggestionIndex(index)}
                                      className={`px-3 py-2 cursor-pointer text-sm text-white ${index === activeSuggestionIndex ? 'bg-gray-700' : 'hover:bg-gray-800/50'}`}
                                  >
                                      {tag}
                                  </li>
                              ))}
                          </ul>
                      </div>
                    )}
                </div>
            </div>
          
          <div>
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-white"><CheckSquareIcon className="w-5 h-5" /> Subtasks</h3>
            {totalSubtasks > 0 && (
                <div className="mb-3">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="font-medium text-white">Progress</span>
                        <span className="font-semibold text-white">{completedSubtasks} / {totalSubtasks}</span>
                    </div>
                    <div className="w-full bg-[#1C2326] rounded-full h-2">
                        <div className="bg-gray-500 h-2 rounded-full transition-all duration-300 ease-in-out" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            )}
            <div className="space-y-2 mb-3">
              {editedTask.subtasks.map(subtask => {
                const subtaskCreator = users.find(u => u.id === subtask.creatorId);
                return (
                    <div key={subtask.id} className="flex items-center gap-3 bg-[#1C2326] p-2 rounded-md group">
                        <input
                            type="checkbox"
                            id={subtask.id}
                            checked={subtask.completed}
                            onChange={() => handleSubtaskToggle(subtask.id)}
                            className="w-4 h-4 rounded text-gray-500 bg-gray-700 border-gray-600 focus:ring-gray-500 flex-shrink-0"
                        />
                        <div className="flex-grow">
                             <EditableField
                                value={subtask.title}
                                onSave={(newTitle) => handleSubtaskTitleChange(subtask.id, newTitle)}
                                textClassName={`text-sm ${subtask.completed ? 'line-through text-gray-500' : 'text-white'} w-full cursor-pointer hover:bg-gray-800/50 rounded p-1 -m-1`}
                                inputClassName="text-sm p-1 rounded border-2 border-gray-500 bg-gray-800/50 focus:outline-none text-white"
                                placeholder="Enter a subtask title..."
                            />
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            <select
                                value={subtask.assigneeId || ''}
                                onChange={(e) => handleSubtaskAssigneeChange(subtask.id, e.target.value)}
                                className="text-xs bg-gray-700 border border-transparent hover:border-gray-600 text-white rounded py-1 px-2 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                title="Assign subtask"
                            >
                                <option value="" className="bg-gray-800 text-gray-400">Unassigned</option>
                                {projectMembers.map(u => <option key={u.id} value={u.id} className="bg-gray-800">{u.name}</option>)}
                            </select>
                            
                            <UserAvatar 
                                user={subtask.assignee}
                                className="w-6 h-6 text-xs flex-shrink-0" 
                                isOnline={subtask.assignee ? onlineUsers.has(subtask.assignee.id) : false}
                            />
                            
                            <UserAvatar 
                                user={subtaskCreator} 
                                className="w-6 h-6 text-xs flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" 
                                title={`Added by ${subtaskCreator?.name || 'Unknown'}`}
                                isOnline={subtaskCreator ? onlineUsers.has(subtaskCreator.id) : false}
                            />
                            <button 
                                onClick={() => handleDeleteSubtask(subtask.id)}
                                className="p-1 rounded-full text-gray-400 hover:bg-red-900/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Delete subtask"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )
              })}
            </div>

            <form onSubmit={handleAddManualSubtask} className="flex items-center gap-2">
                <input 
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Add a new subtask..."
                    className="flex-grow px-3 py-1.5 border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 bg-[#1C2326] text-white text-sm"
                />
                <select
                    value={newSubtaskAssigneeId}
                    onChange={(e) => setNewSubtaskAssigneeId(e.target.value)}
                    className="px-3 py-1.5 border border-gray-800 rounded-md bg-[#1C2326] text-white text-sm"
                >
                    <option value="">Assign to...</option>
                    {projectMembers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <button type="submit" className="p-2 bg-gray-600 text-white rounded-md hover:bg-gray-500" aria-label="Add subtask">
                    <PlusIcon className="w-5 h-5"/>
                </button>
            </form>

            <div className="bg-[#1C2326]/50 p-4 rounded-lg mt-6">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-white">
                <SparklesIcon className="w-5 h-5"/>
                AI Assistant
                </h4>
                <p className="text-xs text-gray-400 mb-4">
                Let Gemini help you break this task into smaller, actionable subtasks.
                </p>
                <button
                onClick={handleGenerateSubtasks}
                disabled={aiState === 'loading'}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#1C2326] disabled:bg-gray-500 disabled:cursor-not-allowed transition-all text-sm"
                >
                {aiState === 'loading' ? (
                    <>
                    <LoaderCircleIcon className="w-5 h-5 animate-spin" />
                    Generating...
                    </>
                ) : (
                    <>
                    <BotMessageSquareIcon className="w-5 h-5" />
                    Generate Subtasks with AI
                    </>
                )}
                </button>
                {aiState === 'error' && <p className="text-sm text-red-500 mt-2">{aiError}</p>}
            </div>
          </div>

          <hr className="border-gray-800" />
          
          <div className="p-6">
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
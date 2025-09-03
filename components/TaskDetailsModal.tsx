

import React, { useState, useEffect, useCallback, FormEvent, useMemo, useRef } from 'react';
import { Task, Subtask, User, TaskPriority } from '../types';
import { generateSubtasks as generateSubtasksFromApi } from '../services/geminiService';
import { XIcon, BotMessageSquareIcon, LoaderCircleIcon, SparklesIcon, CheckSquareIcon, MessageSquareIcon, PlusIcon, UserIcon, TagIcon, TrashIcon, HistoryIcon } from './Icons';
import { UserAvatar } from './UserAvatar';

interface TaskDetailsModalProps {
  task: Task;
  currentUser: User;
  users: User[];
  projectMembers: User[];
  onlineUsers: Set<string>;
  onClose: () => void;
  onUpdateTask: (task: Task) => Promise<void>;
  onAddSubtasks: (taskId: string, subtasks: { title: string }[]) => Promise<void>;
  onAddComment: (taskId: string, commentText: string) => Promise<void>;
}

type AIGenerationState = 'idle' | 'loading' | 'success' | 'error';

const EditableField: React.FC<{value: string, onSave: (value: string) => void, isTextArea?: boolean, textClassName: string, inputClassName: string, placeholder?: string }> = 
  ({ value, onSave, isTextArea = false, textClassName, inputClassName, placeholder }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);

  const handleSave = () => {
    if (currentValue.trim() !== value.trim()) {
      onSave(currentValue.trim());
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
        : <input type="text" {...commonProps} />;
  }
  return <div onClick={() => setIsEditing(true)} className={textClassName}>{value || <span className="text-gray-400">{placeholder}</span>}</div>;
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
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((prevIndex) => (prevIndex + 1) % filteredMembers.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((prevIndex) => (prevIndex - 1 + filteredMembers.length) % filteredMembers.length);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                handleMentionSelect(filteredMembers[activeIndex]);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setShowMentions(false);
            }
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
        const userNames = users.map(u => u.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
        if (!userNames) return text; 
    
        const mentionRegex = new RegExp(`@(${userNames})\\b`, 'g');
        const parts = text.split(mentionRegex);
    
        return parts.map((part, index) => {
            const isMention = index % 2 === 1;
            if (isMention) {
                return <strong key={index} className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold rounded px-1 py-0.5">@{part}</strong>;
            }
            return part;
        });
    };

    return (
        <div>
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2"><MessageSquareIcon className="w-5 h-5" /> Activity</h3>
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
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-sm"
                            rows={2}
                        />
                        {showMentions && filteredMembers.length > 0 && (
                            <div className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto custom-scrollbar">
                                <ul>
                                    {filteredMembers.map((user, index) => (
                                        <li 
                                            key={user.id}
                                            onClick={() => handleMentionSelect(user)}
                                            onMouseEnter={() => setActiveIndex(index)}
                                            className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${index === activeIndex ? 'bg-indigo-100 dark:bg-indigo-800' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                        >
                                            <UserAvatar user={user} className="w-6 h-6 text-xs flex-shrink-0" isOnline={onlineUsers.has(user.id)} />
                                            <span className="text-sm">{user.name}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    {newComment && !showMentions && (
                        <button type="submit" className="mt-2 px-4 py-1.5 bg-indigo-600 text-white font-semibold rounded-md text-sm hover:bg-indigo-700">
                            Comment
                        </button>
                    )}
                </form>
            </div>
            <div className="space-y-4">
                {combinedFeed.map(item => {
                  const author = item.type === 'comment' ? item.author : item.user;
                  return (
                    <div key={`${item.type}-${item.id}`} className="flex items-start gap-3">
                         {item.type === 'comment' ? (
                            <UserAvatar user={author} className="w-9 h-9 flex-shrink-0" isOnline={onlineUsers.has(author.id)}/>
                         ) : (
                            <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-gray-200 dark:bg-gray-800 rounded-full">
                                <HistoryIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </div>
                         )}
                         <div className="flex-grow pt-1.5">
                            {item.type === 'comment' ? (
                                <>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm">{author.name}</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(item.createdAt).toLocaleString()}</span>
                                    </div>
                                    <p className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg mt-1 whitespace-pre-wrap text-sm">{renderWithMentions(item.text)}</p>
                                </>
                            ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">{author.name}</span>
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


export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ task, currentUser, users, projectMembers, onlineUsers, onClose, onUpdateTask, onAddSubtasks, onAddComment }) => {
  const [editedTask, setEditedTask] = useState<Task>(task);
  const [aiState, setAiState] = useState<AIGenerationState>('idle');
  const [aiError, setAiError] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newTag, setNewTag] = useState('');

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
    const assignee = users.find(u => u.id === assigneeId);
    handleUpdateField('assignee', assignee);
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const priority = e.target.value as TaskPriority;
    handleUpdateField('priority', priority);
  };

  const handleSubtaskToggle = (subtaskId: string) => {
    const updatedSubtasks = editedTask.subtasks.map(subtask => 
      subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask
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
        await onAddSubtasks(editedTask.id, [{ title: newSubtaskTitle.trim() }]);
        setNewSubtaskTitle('');
    }
  }

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTag.trim()) {
        e.preventDefault();
        const newTags = [...new Set([...editedTask.tags, newTag.trim()])];
        handleUpdateField('tags', newTags);
        setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
      const newTags = editedTask.tags.filter(tag => tag !== tagToRemove);
      handleUpdateField('tags', newTags);
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    const updatedSubtasks = editedTask.subtasks.filter(subtask => subtask.id !== subtaskId);
    handleUpdateField('subtasks', updatedSubtasks);
  };

  const completedSubtasks = editedTask.subtasks.filter(st => st.completed).length;
  const totalSubtasks = editedTask.subtasks.length;
  const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center flex-shrink-0">
            <EditableField 
                value={editedTask.title}
                onSave={(newTitle) => handleUpdateField('title', newTitle)}
                textClassName="text-lg font-bold w-full cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded p-1 -m-1"
                inputClassName="text-lg font-bold p-1 rounded border-2 border-indigo-500 bg-white dark:bg-gray-800 focus:outline-none"
                placeholder="Enter a task title..."
            />
          <button onClick={onClose} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors ml-4">
            <XIcon className="w-6 h-6" />
          </button>
        </header>
        
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <UserIcon className="w-4 h-4" />
                <span>Created by</span>
                {taskCreator ? (
                    <>
                        <UserAvatar user={taskCreator} className="w-6 h-6 text-xs" isOnline={onlineUsers.has(taskCreator.id)} />
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{taskCreator.name}</span>
                    </>
                ) : (
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Unknown User</span>
                )}
                <span>on {new Date(task.createdAt).toLocaleDateString()}</span>
            </div>

            <EditableField 
                value={editedTask.description}
                onSave={(newDesc) => handleUpdateField('description', newDesc)}
                isTextArea
                textClassName="text-sm text-gray-600 dark:text-gray-300 w-full cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded p-2 -m-2 min-h-[50px]"
                inputClassName="text-sm p-2 rounded border-2 border-indigo-500 bg-white dark:bg-gray-800 focus:outline-none text-gray-600 dark:text-gray-300"
                placeholder="Add a more detailed description..."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="modal-assignee" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assignee</label>
                    <select
                      id="modal-assignee"
                      value={editedTask.assignee?.id || ''}
                      onChange={handleAssigneeChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-sm"
                    >
                      <option value="">Unassigned</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="modal-priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                    <select
                      id="modal-priority"
                      value={editedTask.priority}
                      onChange={handlePriorityChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-sm"
                    >
                      {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
            </div>

             <div>
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2"><TagIcon className="w-5 h-5" /> Tags</h3>
                <div className="flex flex-wrap gap-2 items-center">
                    {editedTask.tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full">
                            {tag}
                            <button onClick={() => handleRemoveTag(tag)} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">
                                <XIcon className="w-3 h-3"/>
                            </button>
                        </span>
                    ))}
                     <input 
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={handleAddTag}
                        placeholder="Add tag..."
                        className="flex-grow px-2 py-1 text-sm border-b-2 border-transparent focus:border-indigo-500 bg-transparent focus:outline-none"
                    />
                </div>
            </div>
          
          <div>
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2"><CheckSquareIcon className="w-5 h-5" /> Subtasks</h3>
            {totalSubtasks > 0 && (
                <div className="mb-3">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="font-medium text-gray-600 dark:text-gray-300">Progress</span>
                        <span className="font-semibold text-gray-700 dark:text-gray-200">{completedSubtasks} / {totalSubtasks}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-in-out" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            )}
            <div className="space-y-2 mb-3">
              {editedTask.subtasks.map(subtask => {
                const subtaskCreator = users.find(u => u.id === subtask.creatorId);
                return (
                    <div key={subtask.id} className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 p-2 rounded-md group">
                        <input
                            type="checkbox"
                            id={subtask.id}
                            checked={subtask.completed}
                            onChange={() => handleSubtaskToggle(subtask.id)}
                            className="w-4 h-4 rounded text-indigo-600 bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 focus:ring-indigo-500 flex-shrink-0"
                        />
                        <label htmlFor={subtask.id} className={`flex-grow text-sm ${subtask.completed ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>
                            {subtask.title}
                        </label>
                        <UserAvatar 
                          user={subtaskCreator} 
                          className="w-6 h-6 text-xs flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" 
                          title={`Added by ${subtaskCreator?.name || 'Unknown'}`}
                          isOnline={subtaskCreator ? onlineUsers.has(subtaskCreator.id) : false}
                        />
                        <button 
                            onClick={() => handleDeleteSubtask(subtask.id)}
                            className="ml-auto p-1 rounded-full text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Delete subtask"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
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
                    className="flex-grow px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-sm"
                />
                <button type="submit" className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700" aria-label="Add subtask">
                    <PlusIcon className="w-5 h-5"/>
                </button>
            </form>

            <div className="bg-indigo-50 dark:bg-indigo-950/30 p-4 rounded-lg mt-6">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-indigo-800 dark:text-indigo-200">
                <SparklesIcon className="w-5 h-5"/>
                AI Assistant
                </h4>
                <p className="text-xs text-indigo-700 dark:text-indigo-300 mb-4">
                Let Gemini help you break this task into smaller, actionable subtasks.
                </p>
                <button
                onClick={handleGenerateSubtasks}
                disabled={aiState === 'loading'}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all text-sm"
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

          <hr className="border-gray-200 dark:border-gray-800" />
          
          <div className="p-6">
            <ActivitySection task={editedTask} onAddComment={onAddComment} currentUser={currentUser} projectMembers={projectMembers} onlineUsers={onlineUsers} users={users} />
          </div>
        </div>
      </div>
    </div>
  );
};
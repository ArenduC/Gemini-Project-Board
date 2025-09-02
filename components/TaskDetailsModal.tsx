import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { Task, Subtask, User, TaskPriority } from '../types';
import { generateSubtasks as generateSubtasksFromApi } from '../services/geminiService';
import { XIcon, BotMessageSquareIcon, LoaderCircleIcon, SparklesIcon, CheckSquareIcon, MessageSquareIcon, PlusIcon, UserIcon, TagIcon, TrashIcon } from './Icons';

interface TaskDetailsModalProps {
  task: Task;
  currentUser: User;
  users: User[];
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
  return <div onClick={() => setIsEditing(true)} className={textClassName}>{value || <span className="text-slate-400">{placeholder}</span>}</div>;
}

const CommentSection: React.FC<{task: Task, onAddComment: (taskId: string, text: string) => Promise<void>, currentUser: User}> = ({ task, onAddComment, currentUser }) => {
    const [newComment, setNewComment] = useState("");
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(newComment.trim()){
            await onAddComment(task.id, newComment.trim());
            setNewComment("");
        }
    };

    return (
        <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><MessageSquareIcon className="w-5 h-5" /> Activity</h3>
            <div className="flex items-start gap-3 mb-4">
                <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-9 h-9 rounded-full"/>
                <form onSubmit={handleSubmit} className="flex-grow">
                    <textarea 
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700"
                        rows={2}
                    />
                    {newComment && (
                        <button type="submit" className="mt-2 px-4 py-1.5 bg-indigo-600 text-white font-semibold rounded-md text-sm hover:bg-indigo-700">
                            Comment
                        </button>
                    )}
                </form>
            </div>
            <div className="space-y-4">
                {task.comments.slice().reverse().map(comment => (
                    <div key={comment.id} className="flex items-start gap-3">
                         <img src={comment.author.avatarUrl} alt={comment.author.name} className="w-9 h-9 rounded-full"/>
                         <div className="flex-grow">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">{comment.author.name}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(comment.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="bg-slate-100 dark:bg-slate-700/50 p-3 rounded-lg mt-1">{comment.text}</p>
                         </div>
                    </div>
                ))}
            </div>
        </div>
    )
}


export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ task, currentUser, users, onClose, onUpdateTask, onAddSubtasks, onAddComment }) => {
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
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center flex-shrink-0">
            <EditableField 
                value={editedTask.title}
                onSave={(newTitle) => handleUpdateField('title', newTitle)}
                textClassName="text-xl font-bold w-full cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded p-1 -m-1"
                inputClassName="text-xl font-bold p-1 rounded border-2 border-indigo-500 bg-white dark:bg-slate-900 focus:outline-none"
                placeholder="Enter a task title..."
            />
          <button onClick={onClose} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ml-4">
            <XIcon className="w-6 h-6" />
          </button>
        </header>
        
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <UserIcon className="w-4 h-4" />
                <span>Created by</span>
                {taskCreator ? (
                    <>
                        <img src={taskCreator.avatarUrl} alt={taskCreator.name} className="w-6 h-6 rounded-full" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{taskCreator.name}</span>
                    </>
                ) : (
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Unknown User</span>
                )}
                <span>on {new Date(task.createdAt).toLocaleDateString()}</span>
            </div>

            <EditableField 
                value={editedTask.description}
                onSave={(newDesc) => handleUpdateField('description', newDesc)}
                isTextArea
                textClassName="text-slate-600 dark:text-slate-300 w-full cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded p-2 -m-2 min-h-[50px]"
                inputClassName="p-2 rounded border-2 border-indigo-500 bg-white dark:bg-slate-900 focus:outline-none text-slate-600 dark:text-slate-300"
                placeholder="Add a more detailed description..."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="modal-assignee" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assignee</label>
                    <select
                      id="modal-assignee"
                      value={editedTask.assignee?.id || ''}
                      onChange={handleAssigneeChange}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700"
                    >
                      <option value="">Unassigned</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="modal-priority" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                    <select
                      id="modal-priority"
                      value={editedTask.priority}
                      onChange={handlePriorityChange}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700"
                    >
                      {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
            </div>

             <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><TagIcon className="w-5 h-5" /> Tags</h3>
                <div className="flex flex-wrap gap-2 items-center">
                    {editedTask.tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1.5 text-sm font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-full">
                            {tag}
                            <button onClick={() => handleRemoveTag(tag)} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
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
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><CheckSquareIcon className="w-5 h-5" /> Subtasks</h3>
            {totalSubtasks > 0 && (
                <div className="mb-3">
                    <div className="flex justify-between items-center text-sm mb-1.5">
                        <span className="font-medium text-slate-600 dark:text-slate-300">Progress</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{completedSubtasks} / {totalSubtasks}</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                        <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            )}
            <div className="space-y-2 mb-3">
              {editedTask.subtasks.map(subtask => {
                const subtaskCreator = users.find(u => u.id === subtask.creatorId);
                return (
                    <div key={subtask.id} className="flex items-center gap-3 bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md group">
                        <input
                            type="checkbox"
                            id={subtask.id}
                            checked={subtask.completed}
                            onChange={() => handleSubtaskToggle(subtask.id)}
                            className="w-5 h-5 rounded text-indigo-600 bg-slate-300 dark:bg-slate-600 border-slate-400 dark:border-slate-500 focus:ring-indigo-500 flex-shrink-0"
                        />
                        <label htmlFor={subtask.id} className={`flex-grow ${subtask.completed ? 'line-through text-slate-500 dark:text-slate-400' : ''}`}>
                            {subtask.title}
                        </label>
                        {subtaskCreator ? (
                            <img src={subtaskCreator.avatarUrl} alt={subtaskCreator.name} className="w-6 h-6 rounded-full flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" title={`Added by ${subtaskCreator.name}`} />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" title="Added by an unknown user"></div>
                        )}
                        <button 
                            onClick={() => handleDeleteSubtask(subtask.id)}
                            className="ml-auto p-1 rounded-full text-slate-400 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
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
                    className="flex-grow px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700"
                />
                <button type="submit" className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700" aria-label="Add subtask">
                    <PlusIcon className="w-5 h-5"/>
                </button>
            </form>

            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg mt-6">
                <h4 className="text-md font-semibold mb-2 flex items-center gap-2 text-indigo-800 dark:text-indigo-200">
                <SparklesIcon className="w-5 h-5"/>
                AI Assistant
                </h4>
                <p className="text-sm text-indigo-700 dark:text-indigo-300 mb-4">
                Let Gemini help you break this task into smaller, actionable subtasks.
                </p>
                <button
                onClick={handleGenerateSubtasks}
                disabled={aiState === 'loading'}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all"
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

          <hr className="border-slate-200 dark:border-slate-700" />
          
          <div className="p-6">
            <CommentSection task={editedTask} onAddComment={onAddComment} currentUser={currentUser} />
          </div>
        </div>
      </div>
    </div>
  );
};
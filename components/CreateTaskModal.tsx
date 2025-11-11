import React, { useState, FormEvent, useMemo } from 'react';
import { TaskPriority, Column, NewTaskData, User, Sprint } from '../types';
import { XIcon, LoaderCircleIcon, PlusIcon } from './Icons';

interface CreateTaskModalProps {
  columns: Column[];
  users: User[];
  sprints: Sprint[];
  onClose: () => void;
  onAddTask: (taskData: NewTaskData) => Promise<void>;
  onAddSprint: (sprintData: Omit<Sprint, 'id' | 'projectId' | 'createdAt' | 'isDefault'> & { isDefault?: boolean }) => Promise<Sprint>;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ columns, users, sprints, onClose, onAddTask, onAddSprint }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [columnId, setColumnId] = useState<string>(columns[0]?.id || '');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const defaultSprintId = useMemo(() => {
    const defaultSprint = (sprints || []).find(s => s.isDefault);
    return defaultSprint ? defaultSprint.id : '';
  }, [sprints]);

  const [sprintId, setSprintId] = useState<string>(defaultSprintId);
  const [showNewSprintForm, setShowNewSprintForm] = useState(false);
  const [newSprintName, setNewSprintName] = useState('');
  const [isCreatingSprint, setIsCreatingSprint] = useState(false);


  const handleAddSprint = async () => {
    if (!newSprintName.trim()) return;
    setIsCreatingSprint(true);
    try {
        const newSprint = await onAddSprint({ name: newSprintName.trim(), goal: null, startDate: null, endDate: null });
        setSprintId(newSprint.id);
        setShowNewSprintForm(false);
        setNewSprintName('');
    } catch (err) {
        console.error("Failed to create sprint:", err);
    } finally {
        setIsCreatingSprint(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !columnId) {
        setError('Please fill in a title and select a column.');
        return;
    }
    setIsSaving(true);
    setError('');
    try {
        await onAddTask({
          title: title.trim(),
          description: description.trim(),
          priority,
          columnId,
          assigneeId: assigneeId || undefined,
          dueDate: dueDate || undefined,
          sprintId: sprintId || null,
        });
        onClose();
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred while creating the task.');
    } finally {
        setIsSaving(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#131C1B] rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">Create New Task</h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-800 transition-colors">
            <XIcon className="w-6 h-6" />
          </button>
        </header>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-white mb-1">Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 bg-[#1C2326] text-white text-sm"
              placeholder="e.g., Implement user authentication"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-white mb-1">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 bg-[#1C2326] text-white text-sm"
              placeholder="Add more details about the task..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sprint" className="block text-sm font-medium text-white mb-1">Sprint</label>
              <select
                id="sprint"
                value={sprintId}
                onChange={(e) => {
                    if (e.target.value === 'new') {
                        setShowNewSprintForm(true);
                    } else {
                        setSprintId(e.target.value);
                        setShowNewSprintForm(false);
                    }
                }}
                className="w-full px-3 py-2 border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 bg-[#1C2326] text-white text-sm"
              >
                <option value="">No Sprint</option>
                {(sprints || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                <option value="new" className="font-bold text-gray-300">Create New Sprint...</option>
              </select>
            </div>
             <div>
              <label htmlFor="column" className="block text-sm font-medium text-white mb-1">Column</label>
              <select
                id="column"
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 bg-[#1C2326] text-white text-sm"
              >
                {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
          </div>

          {showNewSprintForm && (
            <div className="p-3 bg-gray-800/50 rounded-md">
                <label htmlFor="new-sprint-name" className="block text-sm font-medium text-white mb-2">New Sprint Name</label>
                <div className="flex items-center gap-2">
                    <input
                        id="new-sprint-name"
                        type="text"
                        value={newSprintName}
                        onChange={(e) => setNewSprintName(e.target.value)}
                        placeholder="e.g., Q2 Polish"
                        className="flex-grow px-3 py-2 border border-gray-700 rounded-md bg-[#1C2326] text-white text-sm"
                    />
                    <button type="button" onClick={handleAddSprint} disabled={isCreatingSprint} className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 disabled:opacity-50 flex items-center gap-2">
                        {isCreatingSprint ? <LoaderCircleIcon className="w-5 h-5 animate-spin" /> : <PlusIcon className="w-5 h-5"/>}
                    </button>
                    <button type="button" onClick={() => setShowNewSprintForm(false)} className="p-2 text-gray-400 hover:text-white"><XIcon className="w-5 h-5"/></button>
                </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-white mb-1">Priority</label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 bg-[#1C2326] text-white text-sm"
              >
                {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="assignee" className="block text-sm font-medium text-white mb-1">Assignee</label>
              <select
                id="assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 bg-[#1C2326] text-white text-sm"
              >
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
           <div className="grid grid-cols-1">
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-white mb-1">Due Date</label>
              <input
                type="date"
                id="dueDate"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 bg-[#1C2326] text-white text-sm"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
           <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#131C1B] transition-all text-sm disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-gray-300 text-black font-semibold rounded-lg shadow-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#131C1B] transition-all text-sm disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center gap-2">
              {isSaving && <LoaderCircleIcon className="w-5 h-5 animate-spin"/>}
              {isSaving ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

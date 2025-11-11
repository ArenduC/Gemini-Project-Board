import React, { useState, FormEvent } from 'react';
import { Project, Sprint } from '../types';
import { PlusIcon, LoaderCircleIcon, StarIcon, TrashIcon, XIcon } from './Icons';
import { useConfirmation } from '../App';

interface SprintsPageProps {
    project: Project;
    onAddSprint: (sprintData: Omit<Sprint, 'id' | 'projectId' | 'createdAt' | 'isDefault'> & { isDefault?: boolean }) => Promise<Sprint>;
    onUpdateSprint: (sprintId: string, updates: Partial<Sprint>) => Promise<void>;
    onDeleteSprint: (sprintId: string) => Promise<void>;
}

const EditableField: React.FC<{
  value: string | null;
  onSave: (value: string) => void;
  isTextArea?: boolean;
  placeholder?: string;
  type?: string;
  className?: string;
}> = ({ value, onSave, isTextArea = false, placeholder, type = 'text', className = '' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value || '');

  const handleSave = () => {
    if (currentValue.trim() !== (value || '').trim()) {
      onSave(currentValue.trim());
    }
    setIsEditing(false);
  };
  
  if (isEditing) {
    return isTextArea ? (
        <textarea
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            onBlur={handleSave}
            placeholder={placeholder}
            className={`w-full bg-[#1C2326] border border-gray-700 rounded-md text-white text-xs p-2 ${className}`}
            rows={3}
            autoFocus
        />
    ) : (
        <input
            type={type}
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder={placeholder}
            className={`w-full bg-[#1C2326] border border-gray-700 rounded-md text-white p-2 ${className}`}
            autoFocus
        />
    );
  }
  
  return (
    <div onClick={() => setIsEditing(true)} className={`cursor-pointer hover:bg-gray-800/50 rounded-md p-2 -m-2 min-h-[36px] ${className}`}>
        {value || <span className="text-gray-500 italic">{placeholder}</span>}
    </div>
  )
};


export const SprintsPage: React.FC<SprintsPageProps> = ({ project, onAddSprint, onUpdateSprint, onDeleteSprint }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newSprintName, setNewSprintName] = useState('');
    const requestConfirmation = useConfirmation();

    const handleAddSprint = async (e: FormEvent) => {
        e.preventDefault();
        if (!newSprintName.trim()) return;
        setIsAdding(true);
        try {
            await onAddSprint({
                name: newSprintName.trim(),
                goal: null,
                startDate: null,
                endDate: null,
            });
            setNewSprintName('');
        } catch (error) {
            console.error("Failed to add sprint:", error);
            // In a real app, show a toast notification
        } finally {
            setIsAdding(false);
        }
    };
    
    const handleSetDefault = (sprint: Sprint) => {
        if (sprint.isDefault) return;
        requestConfirmation({
            title: "Set Default Sprint",
            message: <>Are you sure you want to set <strong>"{sprint.name}"</strong> as the default sprint for new tasks?</>,
            onConfirm: () => onUpdateSprint(sprint.id, { isDefault: true }),
            confirmText: "Set as Default"
        });
    };

    const handleDelete = (sprint: Sprint) => {
        requestConfirmation({
            title: "Delete Sprint",
            message: <>Are you sure you want to delete the sprint <strong>"{sprint.name}"</strong>? Tasks in this sprint will become unsprinted.</>,
            onConfirm: () => onDeleteSprint(sprint.id),
            confirmText: "Delete"
        });
    };
    
    return (
        <div className="max-w-4xl mx-auto">
            <h3 className="text-xl font-bold text-white mb-6">Sprints</h3>
            
            <div className="bg-[#131C1B] p-4 rounded-xl border border-gray-800 mb-6">
                <h4 className="font-semibold text-white mb-3">Create New Sprint</h4>
                <form onSubmit={handleAddSprint} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={newSprintName}
                        onChange={(e) => setNewSprintName(e.target.value)}
                        placeholder="e.g., March Frontend Polish"
                        className="flex-grow px-3 py-2 border border-gray-700 rounded-md bg-[#1C2326] text-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
                        required
                    />
                    <button type="submit" disabled={isAdding} className="px-4 py-2 bg-gray-300 text-black font-semibold rounded-lg shadow-sm hover:bg-gray-400 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center gap-2 text-sm">
                        {isAdding ? <LoaderCircleIcon className="w-5 h-5 animate-spin"/> : <PlusIcon className="w-5 h-5" />}
                        {isAdding ? 'Creating...' : 'Create'}
                    </button>
                </form>
            </div>

            <div className="space-y-4">
                {project.sprints.length > 0 ? project.sprints.map(sprint => (
                    <div key={sprint.id} className="bg-[#131C1B] p-4 rounded-xl border border-gray-800">
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex-grow space-y-3">
                                <EditableField
                                    value={sprint.name}
                                    onSave={(name) => onUpdateSprint(sprint.id, { name })}
                                    className="font-bold text-base text-white"
                                    placeholder="Sprint Name"
                                />
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <label className="block text-gray-400 mb-1">Start Date</label>
                                        <EditableField value={sprint.startDate} onSave={(startDate) => onUpdateSprint(sprint.id, { startDate })} type="date" className="text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 mb-1">End Date</label>
                                        <EditableField value={sprint.endDate} onSave={(endDate) => onUpdateSprint(sprint.id, { endDate })} type="date" className="text-white" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-gray-400 mb-1 text-xs">Goal</label>
                                    <EditableField value={sprint.goal} onSave={(goal) => onUpdateSprint(sprint.id, { goal })} isTextArea placeholder="Set a sprint goal..." className="text-white text-xs" />
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                <button
                                    onClick={() => handleSetDefault(sprint)}
                                    disabled={sprint.isDefault}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors disabled:cursor-not-allowed text-yellow-300 bg-yellow-900/30 hover:bg-yellow-900/60 disabled:bg-yellow-900/60 disabled:text-yellow-500"
                                >
                                    <StarIcon className={`w-4 h-4 ${sprint.isDefault ? 'fill-current' : ''}`} />
                                    {sprint.isDefault ? 'Default' : 'Set Default'}
                                </button>
                                <button
                                    onClick={() => handleDelete(sprint)}
                                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded-full"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-10 text-gray-500">
                        <p>No sprints created yet.</p>
                        <p className="text-xs mt-1">Create your first sprint to start organizing your work.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

import React, { useState, useMemo } from 'react';
// FIX: Import the `Column` type to use in component props.
import { Sprint, Task, Column } from '../types';
import { XIcon, LoaderCircleIcon, CheckSquareIcon } from './Icons';

interface CompleteSprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  sprint: Sprint;
  projectTasks: Task[];
  // FIX: Add projectColumns to props to determine task status.
  projectColumns: Record<string, Column>;
  projectSprints: Sprint[];
  onConfirm: (moveToSprintId: string | null) => Promise<void>;
}

export const CompleteSprintModal: React.FC<CompleteSprintModalProps> = ({ isOpen, onClose, sprint, projectTasks, projectColumns, projectSprints, onConfirm }) => {
  const [isSaving, setIsSaving] = useState(false);

  const { completedTasks, incompleteTasks } = useMemo(() => {
    const tasksInSprint = projectTasks.filter(t => t.sprintId === sprint.id);
    // FIX: Determine task status by checking which column it's in, as the `Task` type does not have a `status` property.
    // Cast Object.values to Column[] to avoid 'unknown' type errors.
    const doneColumn = (Object.values(projectColumns) as Column[]).find(c => c.title.toLowerCase() === 'done');
    const doneTaskIds = new Set(doneColumn?.taskIds || []);
    const completed = tasksInSprint.filter(t => doneTaskIds.has(t.id));
    const incomplete = tasksInSprint.filter(t => !doneTaskIds.has(t.id));
    return { completedTasks: completed, incompleteTasks: incomplete };
  }, [sprint, projectTasks, projectColumns]);

  const activeSprints = useMemo(() => {
    return projectSprints
      .filter(s => s.status === 'active' && s.id !== sprint.id)
      .sort((a, b) => new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime());
  }, [projectSprints, sprint.id]);

  const nextSprint = activeSprints[0] || null;

  const [moveAction, setMoveAction] = useState<'backlog' | 'next' | 'specific'>(nextSprint ? 'next' : 'backlog');
  const [specificSprintId, setSpecificSprintId] = useState<string>(activeSprints[0]?.id || '');

  const handleSubmit = async () => {
    setIsSaving(true);
    let moveToId: string | null = null;
    if (moveAction === 'next' && nextSprint) {
        moveToId = nextSprint.id;
    } else if (moveAction === 'specific') {
        moveToId = specificSprintId;
    }
    await onConfirm(moveToId);
    // Parent will close modal on success
    setIsSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#131C1B] rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-white">Complete Sprint</h2>
            <p className="text-sm text-gray-400">{sprint.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-800">
            <XIcon className="w-6 h-6" />
          </button>
        </header>
        <div className="p-6 space-y-6">
            <div className="text-center">
                <p className="text-sm text-gray-400">This sprint has:</p>
                <div className="flex justify-center gap-6 mt-2">
                    <div>
                        <p className="text-2xl font-bold text-green-400">{completedTasks.length}</p>
                        <p className="text-xs text-gray-400">Completed tasks</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-yellow-400">{incompleteTasks.length}</p>
                        <p className="text-xs text-gray-400">Incomplete tasks</p>
                    </div>
                </div>
            </div>

            {incompleteTasks.length > 0 && (
                <div className="space-y-3">
                    <p className="font-semibold text-white">What should happen to the {incompleteTasks.length} incomplete tasks?</p>
                    <div className="space-y-2 text-sm">
                        <label className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-md cursor-pointer">
                            <input type="radio" name="move-action" value="backlog" checked={moveAction === 'backlog'} onChange={() => setMoveAction('backlog')} className="w-4 h-4 text-gray-600 bg-gray-700 border-gray-600 focus:ring-gray-500" />
                            <span className="text-white">Move to Backlog (no sprint)</span>
                        </label>
                        {nextSprint && (
                            <label className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-md cursor-pointer">
                                <input type="radio" name="move-action" value="next" checked={moveAction === 'next'} onChange={() => setMoveAction('next')} className="w-4 h-4 text-gray-600 bg-gray-700 border-gray-600 focus:ring-gray-500" />
                                <span className="text-white">Move to next sprint: <span className="font-semibold">{nextSprint.name}</span></span>
                            </label>
                        )}
                        {activeSprints.length > 0 && (
                            <div className="p-3 bg-gray-800/50 rounded-md">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="radio" name="move-action" value="specific" checked={moveAction === 'specific'} onChange={() => setMoveAction('specific')} className="w-4 h-4 text-gray-600 bg-gray-700 border-gray-600 focus:ring-gray-500" />
                                    <span className="text-white">Move to sprint:</span>
                                </label>
                                <select 
                                    value={specificSprintId} 
                                    onChange={(e) => setSpecificSprintId(e.target.value)}
                                    onClick={() => setMoveAction('specific')}
                                    className="w-full mt-2 px-3 py-2 border border-gray-700 rounded-md bg-[#1C2326] text-white text-sm"
                                >
                                    {activeSprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
        <footer className="p-4 bg-[#1C2326]/50 rounded-b-xl flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-4 py-2 bg-gray-300 text-black font-semibold rounded-lg hover:bg-gray-400 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving && <LoaderCircleIcon className="w-5 h-5 animate-spin" />}
            <CheckSquareIcon className="w-5 h-5"/>
            Complete Sprint
          </button>
        </footer>
      </div>
    </div>
  );
};
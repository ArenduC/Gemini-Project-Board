import React, { useState, useMemo } from 'react';
import { Sprint } from '../types';
import { XIcon, LoaderCircleIcon, RocketIcon } from './Icons';

interface BulkUpdateSprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  sprints: Sprint[];
  onConfirm: (sprintId: string | null) => Promise<void>;
  taskCount: number;
}

export const BulkUpdateSprintModal: React.FC<BulkUpdateSprintModalProps> = ({ isOpen, onClose, sprints, onConfirm, taskCount }) => {
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const activeSprints = useMemo(() => sprints.filter(s => s.status === 'active'), [sprints]);

  const handleSubmit = async () => {
    setIsSaving(true);
    await onConfirm(selectedSprintId || null);
    setIsSaving(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#131C1B] rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <RocketIcon className="w-6 h-6" />
            Change Sprint
          </h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-800">
            <XIcon className="w-6 h-6" />
          </button>
        </header>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-300">
            Move <strong>{taskCount}</strong> selected task(s) to a different sprint.
          </p>
          <div>
            <label htmlFor="sprint-select-bulk" className="block text-sm font-medium text-white mb-1">
              New Sprint
            </label>
            <select
              id="sprint-select-bulk"
              value={selectedSprintId}
              onChange={(e) => setSelectedSprintId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-800 rounded-md bg-[#1C2326] text-white"
            >
              <option value="">Backlog (No Sprint)</option>
              {activeSprints.map(sprint => (
                <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
              ))}
            </select>
          </div>
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
            Move Tasks
          </button>
        </footer>
      </div>
    </div>
  );
};

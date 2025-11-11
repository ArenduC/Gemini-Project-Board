import React, { useState } from 'react';
import { XIcon, LoaderCircleIcon, BookmarkPlusIcon } from './Icons';

interface SaveViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}

export const SaveViewModal: React.FC<SaveViewModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    await onSave(name.trim());
    setIsSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#131C1B] rounded-xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BookmarkPlusIcon className="w-6 h-6" />
            Save View
          </h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-800">
            <XIcon className="w-6 h-6" />
          </button>
        </header>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="view-name" className="block text-sm font-medium text-white mb-1">
              View Name
            </label>
            <input
              id="view-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My High-Priority Tasks"
              className="w-full px-3 py-2 border border-gray-800 rounded-md bg-[#1C2326] text-white"
              required
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600">
              Cancel
            </button>
            <button type="submit" disabled={isSaving || !name.trim()} className="px-4 py-2 bg-gray-300 text-black font-semibold rounded-lg hover:bg-gray-400 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center gap-2">
              {isSaving && <LoaderCircleIcon className="w-5 h-5 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

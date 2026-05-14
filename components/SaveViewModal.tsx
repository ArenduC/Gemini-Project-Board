import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XIcon, LoaderCircleIcon, BookmarkPlusIcon, CheckIcon } from './Icons';

interface SaveViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}

export const SaveViewModal: React.FC<SaveViewModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Reset name when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    await onSave(name.trim());
    setIsSaving(false);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-[#131C1B] border border-white/10 rounded-2xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <header className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <h2 className="text-sm font-black text-white flex items-center gap-2.5 uppercase tracking-widest">
            <BookmarkPlusIcon className="w-5 h-5 text-emerald-400" />
            Save Current View
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
            <XIcon className="w-5 h-5" />
          </button>
        </header>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label htmlFor="view-name" className="block text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">
              Filter Alias
            </label>
            <input
              id="view-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Critical Bug Cluster"
              className="w-full px-4 py-3 border border-white/5 rounded-xl bg-[#1C2326] text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500/50 placeholder:text-gray-600 transition-all shadow-inner"
              required
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isSaving} 
              className="px-5 py-2.5 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
            >
              Abort
            </button>
            <button 
              type="submit" 
              disabled={isSaving || !name.trim()} 
              className="px-6 py-2.5 bg-emerald-500 text-black text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/10"
            >
              {isSaving ? <LoaderCircleIcon className="w-3.5 h-3.5 animate-spin" /> : <CheckIcon className="w-3.5 h-3.5" />}
              Committing View
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

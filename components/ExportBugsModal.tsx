
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Bug, User } from '../types';
import { XIcon, DownloadIcon, LoaderCircleIcon } from './Icons';
import { exportBugsToCsv } from '../utils/export';

interface ExportBugsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bugs: Bug[];
  projectName: string;
  users: Record<string, User>;
}

export const ExportBugsModal: React.FC<ExportBugsModalProps> = ({ 
  isOpen, 
  onClose, 
  bugs, 
  projectName, 
  users 
}) => {
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Small timeout to show spinner for feedback
      await new Promise(resolve => setTimeout(resolve, 600));
      exportBugsToCsv(bugs, projectName, users);
      onClose();
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#131C1B] rounded-2xl shadow-2xl w-full max-w-md border border-white/5 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <DownloadIcon className="w-5 h-5 text-emerald-500" />
            Export Bugs
          </h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-white/10 transition-colors">
            <XIcon className="w-5 h-5" />
          </button>
        </header>

        <div className="p-6 space-y-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
            <p className="text-sm text-emerald-400 font-medium">
              You are about to export <span className="text-white font-bold">{bugs.length}</span> bug reports from <span className="text-white font-bold">{projectName}</span>.
            </p>
          </div>
          
          <div className="text-gray-400 text-xs space-y-2">
            <p>The export will include:</p>
            <ul className="list-disc list-inside grid grid-cols-2 gap-1 text-[10px] uppercase font-bold tracking-wider">
              <li>Bug IDs</li>
              <li>Titles</li>
              <li>Statuses</li>
              <li>Priorities</li>
              <li>Assignees</li>
              <li>Created Dates</li>
            </ul>
          </div>
        </div>

        <footer className="p-4 bg-white/5 flex gap-3 justify-end rounded-b-2xl">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-white/5 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="px-6 py-2 bg-emerald-500 text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-400 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isExporting ? <LoaderCircleIcon className="w-4 h-4 animate-spin" /> : <DownloadIcon className="w-4 h-4" />}
            {isExporting ? 'Preparing...' : 'Confirm Export'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
};

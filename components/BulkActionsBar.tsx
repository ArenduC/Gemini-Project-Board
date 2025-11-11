import React from 'react';
import { XIcon, RocketIcon } from './Icons';

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  onChangeSprint: () => void;
}

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({ selectedCount, onClear, onChangeSprint }) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-[#131C1B] border border-gray-700 rounded-lg shadow-2xl flex items-center gap-4 px-4 py-2 text-sm text-white">
      <span className="font-semibold">{selectedCount} task(s) selected</span>
      <div className="w-px h-6 bg-gray-700"></div>
      <button onClick={onChangeSprint} className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-800 transition-colors">
        <RocketIcon className="w-4 h-4" />
        Change Sprint
      </button>
      <button onClick={onClear} className="p-2 rounded-full hover:bg-gray-800 transition-colors" aria-label="Clear selection">
        <XIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

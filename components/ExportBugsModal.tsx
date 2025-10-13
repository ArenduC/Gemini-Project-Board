import React, { useState } from 'react';
import { Bug, User } from '../types';
import { XIcon, DownloadIcon } from './Icons';
import { exportBugsToCsv } from '../utils/export';

interface ExportBugsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bugs: Bug[];
  projectName: string;
  users: User[];
}

export const ExportBugsModal: React.FC<ExportBugsModalProps> = ({ isOpen, onClose, bugs, projectName, users }) => {
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(today);

  if (!isOpen) return null;

  const handleExport = () => {
    const start = startDate ? new Date(startDate).getTime() : 0;
    // Set end date to the end of the day
    const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : new Date().getTime();

    if (start > end) {
      alert("Start date cannot be after end date.");
      return;
    }

    const filteredBugs = bugs.filter(bug => {
      const bugDate = new Date(bug.createdAt).getTime();
      return bugDate >= start && bugDate <= end;
    });

    if (filteredBugs.length === 0) {
      alert("No bugs found in the selected date range.");
      return;
    }
    
    // Flatten the users record into a map for export
    const usersMap = users.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
    }, {} as Record<string, User>);


    exportBugsToCsv(filteredBugs, projectName, usersMap);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#131C1B] rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">Export Bugs</h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-800"><XIcon className="w-6 h-6" /></button>
        </header>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-400">Select a date range to export bugs. If no start date is selected, it will export from the beginning.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-white mb-1">Start Date</label>
              <input
                type="date"
                id="start-date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-800 rounded-md bg-[#1C2326] text-white"
              />
            </div>
            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-white mb-1">End Date</label>
              <input
                type="date"
                id="end-date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-800 rounded-md bg-[#1C2326] text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600">Cancel</button>
            <button onClick={handleExport} className="px-4 py-2 bg-gray-300 text-black font-semibold rounded-lg hover:bg-gray-400 flex items-center gap-2">
                <DownloadIcon className="w-5 h-5" />
                Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

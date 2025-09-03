import React, { useState } from 'react';
import { Project, User } from '../types';
import { XIcon } from './Icons';
import { UserAvatar } from './UserAvatar';

interface ManageMembersModalProps {
  project: Project;
  allUsers: User[];
  onlineUsers: Set<string>;
  onClose: () => void;
  onSave: (memberIds: string[]) => Promise<void>;
}

export const ManageMembersModal: React.FC<ManageMembersModalProps> = ({ project, allUsers, onlineUsers, onClose, onSave }) => {
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set(project.members));

  const handleToggleMember = (userId: string) => {
    const newSelection = new Set(selectedMemberIds);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedMemberIds(newSelection);
  };

  const handleSave = () => {
    onSave(Array.from(selectedMemberIds));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#131C1B] rounded-xl shadow-2xl w-full max-w-md flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-white">Manage Members</h2>
            <p className="text-sm text-gray-400">{project.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-800 transition-colors">
            <XIcon className="w-6 h-6" />
          </button>
        </header>

        <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
          <h3 className="text-sm font-semibold text-white mb-2">Select members for this project</h3>
          <div className="space-y-2">
            {allUsers.map(user => (
              <label key={user.id} htmlFor={`user-${user.id}`} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-800/50 cursor-pointer">
                <input
                  type="checkbox"
                  id={`user-${user.id}`}
                  checked={selectedMemberIds.has(user.id)}
                  onChange={() => handleToggleMember(user.id)}
                  className="w-4 h-4 rounded text-gray-500 bg-gray-700 border-gray-600 focus:ring-gray-500"
                />
                <UserAvatar user={user} className="w-9 h-9" isOnline={onlineUsers.has(user.id)} />
                <span className="font-medium text-sm text-white">{user.name}</span>
              </label>
            ))}
          </div>
        </div>

        <footer className="p-4 border-t border-gray-800 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#131C1B] transition-all text-sm">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-gray-300 text-black font-semibold rounded-lg shadow-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#131C1B] transition-all text-sm">
            Save Changes
          </button>
        </footer>
      </div>
    </div>
  );
};
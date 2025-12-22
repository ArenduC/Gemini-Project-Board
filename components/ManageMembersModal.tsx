import React, { useState } from 'react';
import { Project, User } from '../types';
import { XIcon, TrashIcon, LoaderCircleIcon } from './Icons';
import { UserAvatar } from './UserAvatar';
import { useConfirmation } from '../App';

interface ManageMembersModalProps {
  project: Project;
  allUsers: User[];
  onlineUsers: Set<string>;
  onClose: () => void;
  onSave: (memberIds: string[]) => Promise<void>;
}

export const ManageMembersModal: React.FC<ManageMembersModalProps> = ({ project, allUsers, onlineUsers, onClose, onSave }) => {
  const [currentMemberIds, setCurrentMemberIds] = useState<string[]>(project.members);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const requestConfirmation = useConfirmation();

  const handleRemoveMember = (userIdToRemove: string) => {
    if (userIdToRemove === project.creatorId) {
        // This case should not be reachable as the button is disabled, but as a safeguard, we do nothing.
        console.warn("Attempted to remove the project creator.");
        return;
    }
    const userToRemove = allUsers.find(u => u.id === userIdToRemove);
    requestConfirmation({
      title: 'Remove Member',
      message: (
        <>
          Are you sure you want to remove <strong>{userToRemove?.name || 'this member'}</strong> from the project?
        </>
      ),
      onConfirm: () => {
        setCurrentMemberIds(current => current.filter(id => id !== userIdToRemove));
      },
      confirmText: 'Remove',
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    try {
        await onSave(currentMemberIds);
        onClose();
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred while saving members.');
    } finally {
        setIsSaving(false);
    }
  };

  const memberDetails = currentMemberIds
    .map(id => allUsers.find(u => u.id === id))
    .filter((u): u is User => !!u);


  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#131C1B] rounded-lg shadow-2xl w-full max-w-md flex flex-col" onClick={(e) => e.stopPropagation()}>
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
          <h3 className="text-sm font-semibold text-white mb-2">Current Members</h3>
          <p className="text-xs text-gray-400 mb-4">Add new members by sharing an invite link via the "Share" button on the dashboard.</p>
          <div className="space-y-2">
            {memberDetails.map(user => (
              <div key={user.id} className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-gray-800/50">
                <div className="flex items-center gap-3">
                  <UserAvatar user={user} className="w-9 h-9" isOnline={onlineUsers.has(user.id)} />
                  <div>
                    <span className="font-medium text-sm text-white">{user.name}</span>
                    {user.id === project.creatorId && (
                       <span className="text-xs text-gray-500 block">Creator</span>
                    )}
                  </div>
                </div>
                {user.id !== project.creatorId && (
                    <button
                        onClick={() => handleRemoveMember(user.id)}
                        className="p-2 rounded-md text-gray-400 hover:bg-red-900/50 hover:text-red-400 transition-colors"
                        aria-label={`Remove ${user.name}`}
                    >
                       <TrashIcon className="w-4 h-4" />
                    </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <footer className="p-4 border-t border-gray-800 flex justify-between items-center gap-3">
          {error && <p className="text-sm text-red-500 flex-grow">{error}</p>}
          <div className="flex justify-end gap-3 ml-auto">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#131C1B] transition-all text-sm disabled:opacity-50">
              Cancel
            </button>
            <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-gray-300 text-black font-semibold rounded-lg shadow-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#131C1B] transition-all text-sm disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center gap-2">
              {isSaving && <LoaderCircleIcon className="w-5 h-5 animate-spin" />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
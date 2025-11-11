import React from 'react';
// FIX: Import `Column` type to be used in casting.
import { Project, User, Column } from '../types';
import { UsersIcon, Share2Icon } from './Icons';
import { UserAvatar } from './UserAvatar';

interface ProjectListRowProps {
  project: Project;
  users: Record<string, User>;
  onlineUsers: Set<string>;
  onSelect: (projectId: string) => void;
  onManageMembers: (projectId: string) => void;
  onShare: () => void;
}

export const ProjectListRow: React.FC<ProjectListRowProps> = ({ project, users, onlineUsers, onSelect, onManageMembers, onShare }) => {
  const totalTasks = Object.keys(project.board.tasks).length;
  // FIX: Cast Object.values to the correct type to avoid type inference issues.
  const doneColumn = (Object.values(project.board.columns) as Column[]).find(c => c.title.toLowerCase() === 'done');
  const completedTasks = doneColumn ? doneColumn.taskIds.length : 0;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleManageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onManageMembers(project.id);
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare();
  };

  return (
    <div
      onClick={() => onSelect(project.id)}
      className="grid grid-cols-12 gap-4 items-center bg-[#131C1B] px-4 py-3 border-b border-gray-800 cursor-pointer hover:bg-gray-800 transition-colors duration-200"
    >
      {/* Project Name & Description */}
      <div className="col-span-4">
        <h3 className="font-bold text-white truncate text-xs">{project.name}</h3>
        <p className="text-xs text-gray-400 truncate">{project.description}</p>
      </div>

      {/* Progress Bar */}
      <div className="col-span-2">
        <div className="flex justify-between items-center text-xs mb-1 text-gray-400">
            <span>Progress</span>
            <span className="font-semibold">{progress}%</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-1.5">
            <div className="bg-gray-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      {/* Task Count */}
      <div className="col-span-2 text-center">
        <span className="font-semibold text-white text-xs">{completedTasks} / {totalTasks}</span>
        <span className="block text-[11px] text-gray-400">Tasks Done</span>
      </div>

      {/* Members */}
      <div className="col-span-2 flex items-center justify-end -space-x-2">
        {project.members.slice(0, 4).map(memberId => users[memberId] && (
          <UserAvatar
            key={memberId}
            user={users[memberId]}
            isOnline={onlineUsers.has(memberId)}
            className="w-8 h-8 rounded-full ring-2 ring-[#131C1B]"
            title={users[memberId].name}
          />
        ))}
        {project.members.length > 4 && (
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-semibold ring-2 ring-[#131C1B] text-white">
            +{project.members.length - 4}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="col-span-2 flex items-center justify-end gap-3">
        <button onClick={handleShareClick} className="flex items-center gap-1.5 text-xs font-semibold text-white hover:text-gray-300 hover:underline">
          <Share2Icon className="w-4 h-4" />
          Share
        </button>
        <button onClick={handleManageClick} className="flex items-center gap-1.5 text-xs font-semibold text-white hover:text-gray-300 hover:underline">
          <UsersIcon className="w-4 h-4" />
          Manage
        </button>
      </div>
    </div>
  );
};

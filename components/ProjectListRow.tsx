import React from 'react';
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
  const doneColumn = (Object.values(project.board.columns) as Column[]).find(c => c.title.toLowerCase() === 'done');
  const completedTasks = doneColumn ? doneColumn.taskIds.length : 0;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div
      onClick={() => onSelect(project.id)}
      className="grid grid-cols-12 gap-4 items-center px-6 py-4 border-b border-white/5 hover:bg-white/5 transition-all duration-300 group cursor-pointer"
    >
      <div className="col-span-4 min-w-0">
        <h3 className="font-bold text-white text-sm truncate group-hover:text-emerald-400 transition-colors">{project.name}</h3>
        <p className="text-xs text-gray-500 truncate mt-0.5">{project.description || 'No description provided.'}</p>
      </div>

      <div className="col-span-2">
        <div className="flex items-center gap-3">
            <div className="flex-grow bg-white/5 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-[10px] font-bold text-white min-w-[2.5rem] text-right">{progress}%</span>
        </div>
      </div>

      <div className="col-span-2 text-center">
        <span className="text-xs font-bold text-white">{completedTasks} <span className="text-gray-600">/ {totalTasks}</span></span>
        <span className="block text-[10px] uppercase tracking-widest text-gray-600 font-bold mt-0.5">Synced</span>
      </div>

      <div className="col-span-2 flex items-center justify-end -space-x-3">
        {project.members.slice(0, 4).map(id => users[id] && (
          <UserAvatar
            key={id}
            user={users[id]}
            isOnline={onlineUsers.has(id)}
            className="w-8 h-8 rounded-full ring-2 ring-[#131C1B]"
          />
        ))}
        {project.members.length > 4 && (
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold ring-2 ring-[#131C1B] text-gray-500">
            +{project.members.length - 4}
          </div>
        )}
      </div>

      <div className="col-span-2 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
        <button 
            onClick={(e) => { e.stopPropagation(); onShare(); }}
            className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5"
        >
          <Share2Icon className="w-4 h-4" />
        </button>
        <button 
            onClick={(e) => { e.stopPropagation(); onManageMembers(project.id); }}
            className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5"
        >
          <UsersIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
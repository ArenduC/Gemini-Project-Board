import React, { useMemo } from 'react';
import { Project, User, Column } from '../types';
import { UsersIcon, Share2Icon, SparklesIcon, VideoIcon } from './Icons';
import { UserAvatar } from './UserAvatar';

interface ProjectCardProps {
  project: Project;
  users: Record<string, User>;
  onlineUsers: Set<string>;
  onSelect: (projectId: string) => void;
  onManageMembers: (projectId: string) => void;
  onShare: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, users, onlineUsers, onSelect, onManageMembers, onShare }) => {
  // Defensive checks for nested board data
  const board = project.board;
  const tasks = board?.tasks || {};
  const columns = board?.columns || {};

  const totalTasks = Object.keys(tasks).length;
  const doneColumn = (Object.values(columns) as Column[]).find(c => c.title.toLowerCase() === 'done');
  const completedTasks = doneColumn ? doneColumn.taskIds.length : 0;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const creator = users[project.creatorId];

  const meetLink = useMemo(() => {
    return (project.links || []).find(link => link.url.includes('meet.google.com'));
  }, [project.links]);

  return (
    <div 
      onClick={() => onSelect(project.id)}
      className="group bg-[#131C1B]/60 rounded-xl p-4 border border-white/5 hover:border-white/20 hover:bg-[#1C2326]/80 shadow-2xl transition-all duration-500 cursor-pointer flex flex-col justify-between relative overflow-hidden"
    >
      <div className="absolute -top-10 -right-10 w-20 h-20 bg-white/5 blur-[30px] rounded-full group-hover:bg-white/10 transition-all duration-500" />
      
      <div className="mb-4">
        <div className="flex justify-between items-start mb-3">
            <div className="min-w-0 flex-grow">
                <h3 className="text-sm font-bold text-white tracking-tight truncate group-hover:text-emerald-400 transition-colors">{project.name}</h3>
                <p className="text-gray-500 text-[9px] mt-0.5 uppercase tracking-widest font-mono opacity-60">ID: {project.id.slice(0, 6)}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
                {meetLink && (
                  <a 
                    href={meetLink.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center w-7 h-7 bg-blue-600/20 border border-blue-600/30 text-blue-400 rounded-full hover:bg-blue-600/40 transition-all"
                  >
                    <VideoIcon className="w-3.5 h-3.5" />
                  </a>
                )}
                {creator && (
                    <UserAvatar 
                        user={creator} 
                        isOnline={onlineUsers.has(creator.id)}
                        className="w-7 h-7 ring-1 ring-white/10 shadow-lg text-[10px]"
                    />
                )}
            </div>
        </div>
        <p className="text-gray-400 text-[11px] leading-relaxed line-clamp-2 min-h-[1.5rem]">{project.description || 'No neural description provided.'}</p>
      </div>

      <div className="space-y-3">
        <div>
            <div className="flex justify-between items-end mb-1">
                <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Mesh Sync</span>
                <span className="text-[10px] font-bold text-white">{progress}%</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                <div 
                    className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full transition-all duration-1000 ease-out" 
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <div className="flex items-center -space-x-2">
                {(project.members || []).slice(0, 3).map(id => users[id] && (
                    <UserAvatar
                        key={id}
                        user={users[id]}
                        isOnline={onlineUsers.has(id)}
                        className="w-6 h-6 rounded-full ring-1 ring-[#131C1B] text-[8px]"
                    />
                ))}
                {(project.members || []).length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[8px] font-bold ring-1 ring-[#131C1B] text-gray-400">
                        +{(project.members || []).length - 3}
                    </div>
                )}
            </div>
            <div className="flex items-center gap-1.5">
                <button onClick={(e) => { e.stopPropagation(); onShare(); }} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all">
                    <Share2Icon className="w-3.5 h-3.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onManageMembers(project.id); }} className="px-3 py-1 rounded-lg text-[9px] font-bold text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-all">
                    Manage
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
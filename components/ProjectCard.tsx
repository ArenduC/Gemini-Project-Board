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
  const totalTasks = Object.keys(project.board.tasks).length;
  const doneColumn = (Object.values(project.board.columns) as Column[]).find(c => c.title.toLowerCase() === 'done');
  const completedTasks = doneColumn ? doneColumn.taskIds.length : 0;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const creator = users[project.creatorId];

  const meetLink = useMemo(() => {
    return project.links.find(link => link.url.includes('meet.google.com'));
  }, [project.links]);

  return (
    <div 
      onClick={() => onSelect(project.id)}
      className="group bg-[#131C1B]/60 rounded-[2rem] p-6 border border-white/5 hover:border-white/20 hover:bg-[#1C2326]/80 shadow-2xl transition-all duration-500 cursor-pointer flex flex-col justify-between relative overflow-hidden"
    >
      {/* Decorative Glow */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/5 blur-[40px] rounded-full group-hover:bg-white/10 transition-all duration-500" />
      
      <div>
        <div className="flex justify-between items-start mb-4">
            <div className="min-w-0 flex-grow">
                <h3 className="text-lg font-bold text-white tracking-tight truncate group-hover:text-emerald-400 transition-colors">{project.name}</h3>
                <p className="text-gray-500 text-xs mt-0.5 uppercase tracking-widest font-mono">ID: {project.id.slice(0, 8)}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                {meetLink && (
                  <a 
                    href={meetLink.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center w-9 h-9 bg-blue-600/20 border border-blue-600/30 text-blue-400 rounded-full hover:bg-blue-600/40 transition-all shadow-lg shadow-blue-500/10 animate-pulse"
                    title={`Join Live: ${meetLink.title}`}
                  >
                    <VideoIcon className="w-5 h-5" />
                  </a>
                )}
                {creator && (
                    <UserAvatar 
                        user={creator} 
                        isOnline={onlineUsers.has(creator.id)}
                        className="w-9 h-9 ring-2 ring-white/10 shadow-xl"
                    />
                )}
            </div>
        </div>
        <p className="text-gray-400 text-sm leading-relaxed mb-6 line-clamp-2 min-h-[2.5rem]">{project.description || 'No neural description provided.'}</p>
      </div>

      <div className="space-y-4">
        <div>
            <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Mesh Sync</span>
                <span className="text-xs font-bold text-white">{progress}%</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                <div 
                    className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <div className="flex items-center -space-x-3">
                {project.members.slice(0, 3).map(id => users[id] && (
                    <UserAvatar
                        key={id}
                        user={users[id]}
                        isOnline={onlineUsers.has(id)}
                        className="w-8 h-8 rounded-full ring-2 ring-[#131C1B]"
                    />
                ))}
                {project.members.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold ring-2 ring-[#131C1B] text-gray-400 backdrop-blur-md">
                        +{project.members.length - 3}
                    </div>
                )}
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={(e) => { e.stopPropagation(); onShare(); }}
                    className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                >
                    <Share2Icon className="w-4 h-4" />
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); onManageMembers(project.id); }}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
                >
                    Manage
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
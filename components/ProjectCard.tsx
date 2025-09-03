

import React from 'react';
import { Project, User } from '../types';
import { UsersIcon, Share2Icon } from './Icons';
import { UserAvatar } from './UserAvatar';

interface ProjectCardProps {
  project: Project;
  users: Record<string, User>;
  onSelect: (projectId: string) => void;
  onManageMembers: (projectId: string) => void;
  onShare: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, users, onSelect, onManageMembers, onShare }) => {
  const totalTasks = Object.keys(project.board.tasks).length;
  const doneColumn = Object.values(project.board.columns).find(c => c.title.toLowerCase() === 'done');
  const completedTasks = doneColumn ? doneColumn.taskIds.length : 0;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const creator = users[project.creatorId];

  const handleManageClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent card click from firing
    onManageMembers(project.id);
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare();
  };


  return (
    <div 
      onClick={() => onSelect(project.id)}
      className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 p-6 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
    >
      <div>
        <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{project.name}</h3>
            {creator && (
                 <UserAvatar 
                    user={creator} 
                    className="w-8 h-8 ring-2 ring-white dark:ring-gray-900 text-sm"
                    title={`Created by ${creator.name}`}
                 />
            )}
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 h-10 overflow-hidden">{project.description}</p>
      </div>
      <div>
        <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            <span>{completedTasks} / {totalTasks} tasks completed</span>
        </div>
      </div>
       <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex justify-between items-center">
              <div className="flex items-center -space-x-2">
                  {project.members.slice(0, 4).map(memberId => users[memberId] && (
                      <UserAvatar
                          key={memberId}
                          user={users[memberId]}
                          className="w-8 h-8 rounded-full ring-2 ring-white dark:ring-gray-900"
                          title={users[memberId].name}
                      />
                  ))}
                  {project.members.length > 4 && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold ring-2 ring-white dark:ring-gray-900">
                          +{project.members.length - 4}
                      </div>
                  )}
              </div>
               <div className="flex items-center gap-4">
                  <button onClick={handleShareClick} className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                      <Share2Icon className="w-4 h-4" />
                      Share
                  </button>
                  <button onClick={handleManageClick} className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                      <UsersIcon className="w-4 h-4" />
                      Manage
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};
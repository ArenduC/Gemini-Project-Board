import React from 'react';
import { AugmentedTask, Task, User, TaskPriority } from '../types';
import { UserAvatar } from './UserAvatar';

interface TaskListRowProps {
  task: AugmentedTask;
  onClick: (task: Task) => void;
  users: Record<string, User>;
}

const priorityStyles: Record<TaskPriority, string> = {
  [TaskPriority.URGENT]: 'bg-red-500/10 text-red-400 border-red-500/20 font-bold',
  [TaskPriority.HIGH]: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  [TaskPriority.MEDIUM]: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  [TaskPriority.LOW]: 'bg-white/5 text-gray-500 border-white/5',
};


export const TaskListRow: React.FC<TaskListRowProps> = ({ task, onClick, users }) => {
  const { title, projectName, assignee, priority, columnName } = task;

  const getStatusStyle = (status: string): string => {
    const lowerCaseStatus = (status || '').toLowerCase();
    if (lowerCaseStatus.includes('done') || lowerCaseStatus.includes('resolved') || lowerCaseStatus.includes('closed') || lowerCaseStatus.includes('complete')) {
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
    if (lowerCaseStatus.includes('progress') || lowerCaseStatus.includes('review') || lowerCaseStatus.includes('testing')) {
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
    return 'bg-white/5 text-gray-400 border-white/5'; 
  };
  
  return (
    <div
      onClick={() => onClick(task)}
      className="grid grid-cols-12 gap-4 items-center bg-transparent px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/[0.03] transition-all duration-300 group"
    >
      <div className="col-span-4 font-bold text-white text-[11px] group-hover:text-emerald-400 group-hover:translate-x-1 transition-all truncate">{title}</div>
      <div className="col-span-2 text-[9px] text-gray-500 font-mono tracking-wider truncate uppercase">{projectName}</div>
      <div className="col-span-2">
        <div className={`inline-flex items-center text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${priorityStyles[priority]}`}>
            {priority}
        </div>
      </div>
      <div className="col-span-2">
        <div className={`inline-flex items-center text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${getStatusStyle(columnName)}`}>
            {columnName}
        </div>
      </div>
      <div className="col-span-2 flex justify-end">
        <div className="flex items-center gap-2 bg-white/5 rounded-md p-0.5 pr-2">
            <UserAvatar
                user={assignee}
                className="w-5 h-5 ring-1 ring-white/10 group-hover:scale-110 transition-transform"
                title={assignee ? `Assigned to ${assignee.name}` : "Unassigned"}
            />
            <span className="text-[9px] text-gray-500 truncate max-w-[60px]">{assignee?.name || '---'}</span>
        </div>
      </div>
    </div>
  );
};
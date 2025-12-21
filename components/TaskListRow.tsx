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
  [TaskPriority.LOW]: 'bg-gray-500/10 text-gray-400 border-white/5',
};


export const TaskListRow: React.FC<TaskListRowProps> = ({ task, onClick, users }) => {
  const { title, projectName, assignee, priority, columnName } = task;
  
  return (
    <div
      onClick={() => onClick(task)}
      className="grid grid-cols-12 gap-4 items-center bg-transparent px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-all duration-300 group"
    >
      <div className="col-span-4 font-bold text-white text-sm group-hover:text-emerald-400 transition-colors truncate">{title}</div>
      <div className="col-span-2 text-xs text-gray-500 font-mono truncate">{projectName}</div>
      <div className="col-span-2">
        <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${priorityStyles[priority]}`}>
            {priority}
        </div>
      </div>
      <div className="col-span-2">
        <span className="text-[10px] font-bold uppercase tracking-widest bg-white/5 text-gray-400 px-2 py-1 rounded-lg border border-white/5">
            {columnName}
        </span>
      </div>
      <div className="col-span-2 flex justify-end">
        <UserAvatar
          user={assignee}
          className="w-9 h-9 rounded-full ring-2 ring-white/10 shadow-lg group-hover:scale-110 transition-transform"
          title={assignee ? `Assigned to ${assignee.name}` : "Unassigned"}
        />
      </div>
    </div>
  );
};
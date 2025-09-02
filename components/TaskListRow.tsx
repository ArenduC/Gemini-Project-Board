import React from 'react';
import { AugmentedTask, Task, User, TaskPriority } from '../types';
import { UserAvatar } from './UserAvatar';

interface TaskListRowProps {
  task: AugmentedTask;
  onClick: (task: Task) => void;
  users: Record<string, User>;
}

const priorityStyles: Record<TaskPriority, { bg: string, text: string, dot: string }> = {
  [TaskPriority.LOW]: { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-700 dark:text-green-300', dot: 'bg-green-500' },
  [TaskPriority.MEDIUM]: { bg: 'bg-yellow-100 dark:bg-yellow-900/50', text: 'text-yellow-700 dark:text-yellow-300', dot: 'bg-yellow-500' },
  [TaskPriority.HIGH]: { bg: 'bg-orange-100 dark:bg-orange-900/50', text: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' },
  [TaskPriority.URGENT]: { bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
};

export const TaskListRow: React.FC<TaskListRowProps> = ({ task, onClick, users }) => {
  const { title, projectName, assignee, priority, columnName } = task;
  
  return (
    <div
      onClick={() => onClick(task)}
      className="grid grid-cols-12 gap-4 items-center bg-white dark:bg-slate-900 px-4 py-3 border-b border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-200 text-sm"
    >
      <div className="col-span-4 font-semibold text-slate-800 dark:text-slate-200">{title}</div>
      <div className="col-span-2 text-slate-600 dark:text-slate-400">{projectName}</div>
      <div className="col-span-2">
        <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${priorityStyles[priority].bg} ${priorityStyles[priority].text}`}>
            <span className={`w-2 h-2 rounded-full ${priorityStyles[priority].dot}`}></span>
            {priority}
        </div>
      </div>
      <div className="col-span-2">
        <span className="text-sm font-medium bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-full">
            {columnName}
        </span>
      </div>
      <div className="col-span-2 flex justify-end">
        <UserAvatar
          user={assignee}
          className="w-8 h-8 rounded-full ring-2 ring-white dark:ring-slate-900"
          title={assignee ? `Assigned to ${assignee.name}` : "Unassigned"}
        />
      </div>
    </div>
  );
};
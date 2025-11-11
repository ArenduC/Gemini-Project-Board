import React from 'react';
import { AugmentedTask, Task, User, TaskPriority } from '../types';
import { UserAvatar } from './UserAvatar';

interface TaskListRowProps {
  task: AugmentedTask;
  onClick: (task: Task) => void;
  users: Record<string, User>;
}

const priorityStyles: Record<TaskPriority, string> = {
  [TaskPriority.URGENT]: 'bg-gray-200 text-black font-bold',
  [TaskPriority.HIGH]: 'bg-gray-400 text-black',
  [TaskPriority.MEDIUM]: 'bg-gray-600 text-white',
  [TaskPriority.LOW]: 'bg-gray-800 text-gray-400',
};


export const TaskListRow: React.FC<TaskListRowProps> = ({ task, onClick, users }) => {
  const { title, projectName, assignee, priority, columnName } = task;
  
  return (
    <div
      onClick={() => onClick(task)}
      className="grid grid-cols-12 gap-4 items-center bg-[#131C1B] px-4 py-3 border-b border-gray-800 cursor-pointer hover:bg-gray-800 transition-colors duration-200 text-xs"
    >
      <div className="col-span-4 font-semibold text-white">{title}</div>
      <div className="col-span-2 text-gray-400">{projectName}</div>
      <div className="col-span-2">
        <div className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${priorityStyles[priority]}`}>
            {priority}
        </div>
      </div>
      <div className="col-span-2">
        <span className="text-[11px] font-medium bg-gray-800 text-gray-400 px-2 py-1 rounded-full">
            {columnName}
        </span>
      </div>
      <div className="col-span-2 flex justify-end">
        <UserAvatar
          user={assignee}
          className="w-8 h-8 rounded-full ring-2 ring-[#131C1B]"
          title={assignee ? `Assigned to ${assignee.name}` : "Unassigned"}
        />
      </div>
    </div>
  );
};

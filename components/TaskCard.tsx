import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Task, TaskPriority } from '../types';
import { CheckSquareIcon, TrashIcon } from './Icons';
import { UserAvatar } from './UserAvatar';

interface TaskCardProps {
  task: Task;
  index: number;
  onClick: () => void;
  onDelete: () => Promise<void>;
}

const priorityStyles: Record<TaskPriority, { bg: string, text: string, dot: string }> = {
  [TaskPriority.LOW]: { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-700 dark:text-green-300', dot: 'bg-green-500' },
  [TaskPriority.MEDIUM]: { bg: 'bg-yellow-100 dark:bg-yellow-900/50', text: 'text-yellow-700 dark:text-yellow-300', dot: 'bg-yellow-500' },
  [TaskPriority.HIGH]: { bg: 'bg-orange-100 dark:bg-orange-900/50', text: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' },
  [TaskPriority.URGENT]: { bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, index, onClick, onDelete }) => {
  const completedSubtasks = task.subtasks.filter(st => st.completed).length;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`relative group bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-md border border-slate-200 dark:border-slate-700 mb-4 p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-200 transform hover:-translate-y-1 ${
            snapshot.isDragging ? 'shadow-lg dark:shadow-xl scale-105' : ''
          }`}
        >
          <button
            onClick={handleDelete}
            className="absolute top-2 right-2 p-1.5 rounded-full text-slate-400 bg-white/50 dark:bg-slate-800/50 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all z-10"
            aria-label="Delete task"
          >
            <TrashIcon className="w-4 h-4"/>
          </button>

          <div className="flex justify-between items-start mb-2">
            <h4 className="font-semibold text-slate-800 dark:text-slate-100 leading-snug pr-8">{task.title}</h4>
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-4">
            <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${priorityStyles[task.priority].bg} ${priorityStyles[task.priority].text}`}>
              <span className={`w-2 h-2 rounded-full ${priorityStyles[task.priority].dot}`}></span>
              {task.priority}
            </div>
            {task.tags.map(tag => (
              <span key={tag} className="text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
          
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-3">
              {task.subtasks.length > 0 && (
                <div className="flex items-center gap-1 text-sm" title={`${completedSubtasks}/${task.subtasks.length} subtasks completed`}>
                  <CheckSquareIcon className="w-4 h-4" />
                  <span>{completedSubtasks}/{task.subtasks.length}</span>
                </div>
              )}
            </div>

            {task.assignee && (
              <UserAvatar 
                user={task.assignee} 
                className="w-7 h-7 ring-2 ring-white dark:ring-slate-800 text-xs"
                title={`Assigned to ${task.assignee.name}`}
              />
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};
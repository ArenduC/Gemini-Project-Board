import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Task, TaskPriority } from '../types';
import { CheckSquareIcon, TrashIcon } from './Icons';
import { UserAvatar } from './UserAvatar';

interface TaskCardProps {
  task: Task;
  index: number;
  isOnline: boolean;
  onClick: () => void;
  onDelete: () => Promise<void>;
}

const priorityStyles: Record<TaskPriority, string> = {
  [TaskPriority.URGENT]: 'bg-gray-200 text-black font-bold',
  [TaskPriority.HIGH]: 'bg-gray-400 text-black',
  [TaskPriority.MEDIUM]: 'bg-gray-600 text-white',
  [TaskPriority.LOW]: 'bg-gray-800 text-gray-400',
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, index, isOnline, onClick, onDelete }) => {
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
          className={`relative group bg-[#131C1B] rounded-lg shadow-md border border-transparent mb-4 p-4 cursor-pointer hover:bg-gray-800 transition-all duration-200 transform hover:-translate-y-1 ${
            snapshot.isDragging ? 'shadow-2xl scale-105 ring-2 ring-gray-500' : ''
          }`}
        >
          <button
            onClick={handleDelete}
            className="absolute top-2 right-2 p-1.5 rounded-full text-gray-400 bg-gray-800/50 hover:bg-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all z-10"
            aria-label="Delete task"
          >
            <TrashIcon className="w-4 h-4"/>
          </button>

          <div className="flex justify-between items-start mb-2">
            <h4 className="font-semibold text-sm text-white leading-snug pr-8">{task.title}</h4>
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-4">
            <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${priorityStyles[task.priority]}`}>
              {task.priority}
            </div>
            {task.tags.map(tag => (
              <span key={tag} className="text-xs font-medium bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
          
          <div className="flex justify-between items-center text-gray-400">
            <div className="flex items-center gap-3">
              {task.subtasks.length > 0 && (
                <div className="flex items-center gap-1 text-xs" title={`${completedSubtasks}/${task.subtasks.length} subtasks completed`}>
                  <CheckSquareIcon className="w-4 h-4" />
                  <span>{completedSubtasks}/{task.subtasks.length}</span>
                </div>
              )}
            </div>

            {task.assignee && (
              <UserAvatar 
                user={task.assignee} 
                isOnline={isOnline}
                className="w-7 h-7 ring-2 ring-[#131C1B] text-xs"
                title={`Assigned to ${task.assignee.name}`}
              />
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};
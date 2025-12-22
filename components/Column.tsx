import React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import { Column as ColumnType, Task, User, Sprint } from '../types';
import { TaskCard } from './TaskCard';
import { TrashIcon } from './Icons';
import { useConfirmation } from '../App';

interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  sprints: Sprint[];
  users: User[];
  onlineUsers: Set<string>;
  selectedTaskIds: Set<string>;
  onTaskClick: (task: Task, e: React.MouseEvent) => void;
  deleteTask: (taskId: string, columnId: string) => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;
  dragHandleProps?: any;
}

export const Column: React.FC<ColumnProps> = ({ column, tasks, sprints, users, onlineUsers, onTaskClick, deleteTask, deleteColumn, selectedTaskIds, dragHandleProps }) => {
  const requestConfirmation = useConfirmation();

  const handleDelete = () => {
    requestConfirmation({
      title: 'Delete Column',
      message: (
        <>
          Are you sure you want to delete the column <strong>"{column.title}"</strong>? The column must be empty before it can be deleted. This action cannot be undone.
        </>
      ),
      onConfirm: () => deleteColumn(column.id),
      confirmText: 'Delete',
    });
  };

  return (
    <div className="bg-[#1C2326] rounded-lg flex flex-col max-h-[calc(100vh-12rem)]">
      <div 
        {...dragHandleProps}
        className="p-4 border-b border-gray-800 sticky top-0 bg-[#1C2326] backdrop-blur-sm rounded-t-lg z-10 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-white">
            <span>{column.title}</span>
            <span className="text-xs font-medium bg-gray-700 text-white rounded-full px-2 py-0.5">
              {tasks.length}
            </span>
          </h3>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-md text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-colors"
            aria-label="Delete column"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      <Droppable droppableId={column.id} type="task">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-grow p-4 overflow-y-auto custom-scrollbar transition-colors duration-200 ${
              snapshot.isDraggingOver ? 'bg-gray-900/50' : ''
            }`}
          >
            {tasks.map((task, index) => {
              const sprint = task.sprintId ? (sprints || []).find(s => s.id === task.sprintId) : undefined;
              return (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  index={index}
                  sprintName={sprint?.name}
                  isOnline={task.assignee ? onlineUsers.has(task.assignee.id) : false}
                  isSelected={selectedTaskIds.has(task.id)}
                  onClick={(e) => onTaskClick(task, e)}
                  onDelete={() => deleteTask(task.id, column.id)}
                />
              )
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};
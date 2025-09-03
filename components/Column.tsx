import React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import { Column as ColumnType, Task } from '../types';
import { TaskCard } from './TaskCard';
import { TrashIcon } from './Icons';

interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  deleteTask: (taskId: string, columnId: string) => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;
}

export const Column: React.FC<ColumnProps> = ({ column, tasks, onTaskClick, deleteTask, deleteColumn }) => {
  return (
    <div className="bg-gray-100 dark:bg-gray-900 rounded-xl flex flex-col max-h-[calc(100vh-12rem)]">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-gray-100 dark:bg-gray-900 backdrop-blur-sm rounded-t-xl z-10">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <span>{column.title}</span>
            <span className="text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full px-2 py-0.5">
              {tasks.length}
            </span>
          </h3>
          <button
            onClick={() => deleteColumn(column.id)}
            className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-300/80 dark:hover:bg-gray-800/80 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            aria-label="Delete column"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-grow p-4 overflow-y-auto custom-scrollbar transition-colors duration-200 ${
              snapshot.isDraggingOver ? 'bg-indigo-100/50 dark:bg-indigo-950/30' : ''
            }`}
          >
            {tasks.map((task, index) => (
              <TaskCard 
                key={task.id} 
                task={task} 
                index={index} 
                onClick={() => onTaskClick(task)}
                onDelete={() => deleteTask(task.id, column.id)}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};
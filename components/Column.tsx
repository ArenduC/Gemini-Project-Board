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
    <div className="bg-slate-200/50 dark:bg-slate-800/50 rounded-xl flex flex-col max-h-[calc(100vh-12rem)]">
      <div className="p-4 border-b border-slate-300 dark:border-slate-700 sticky top-0 bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-t-xl z-10">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>{column.title}</span>
            <span className="text-sm font-medium bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full px-2.5 py-0.5">
              {tasks.length}
            </span>
          </h3>
          <button
            onClick={() => deleteColumn(column.id)}
            className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-300/80 dark:hover:bg-slate-700/80 hover:text-red-500 dark:hover:text-red-400 transition-colors"
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
              snapshot.isDraggingOver ? 'bg-indigo-100/30 dark:bg-indigo-900/20' : ''
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

import React from 'react';
import { BoardData, User, Task, Column as ColumnType } from '../types';
import { UserAvatar } from './UserAvatar';

const statusColors: Record<string, { dot: string, text: string }> = {
    'To Do': { dot: 'bg-gray-400 dark:bg-gray-500', text: 'text-gray-500 dark:text-gray-400' },
    'In Progress': { dot: 'bg-blue-500', text: 'text-blue-500 dark:text-blue-400' },
    'Done': { dot: 'bg-green-500', text: 'text-green-600 dark:text-green-400' },
    'default': { dot: 'bg-gray-400 dark:bg-gray-500', text: 'text-gray-500 dark:text-gray-400' },
};

interface TaskTreeProps {
    task: Task;
    column: ColumnType | undefined;
    users: User[];
    onTaskClick: (task: Task) => void;
}

const TaskTree: React.FC<TaskTreeProps> = ({ task, column, users, onTaskClick }) => {
    const status = column?.title || 'Uncategorized';
    const colorInfo = statusColors[status] || statusColors.default;

    return (
        <div>
            {/* Main Task Node */}
            <div 
                className="flex items-center gap-4 bg-white dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/80 transition-colors"
                onClick={() => onTaskClick(task)}
            >
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full ${colorInfo.dot}`}></div>
                </div>
                <div className="flex-grow">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{task.title}</p>
                    <p className={`text-sm font-medium ${colorInfo.text}`}>{status}</p>
                </div>
                {task.assignee && <UserAvatar user={task.assignee} className="w-9 h-9 flex-shrink-0" />}
            </div>
            
            {/* Subtask List */}
            {task.subtasks.length > 0 && (
                <ul className="relative pt-2 pl-9">
                    {/* The main vertical connector line */}
                    <span className="absolute left-[11px] top-0 bottom-4 w-0.5 bg-gray-300 dark:bg-gray-600" aria-hidden="true"></span>
                    {task.subtasks.map((subtask) => (
                        <li key={subtask.id} className="relative py-2">
                            {/* The horizontal connector line */}
                            <span className="absolute left-[-25px] top-1/2 -translate-y-1/2 w-6 h-0.5 bg-gray-300 dark:bg-gray-600" aria-hidden="true"></span>
                            {/* Connector dot */}
                            <span className="absolute left-[-2px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" aria-hidden="true"></span>

                            <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200/80 dark:bg-gray-900/50 flex-shrink-0">
                                    <div className={`w-3 h-3 rounded-full ${subtask.completed ? statusColors['Done'].dot : statusColors['To Do'].dot}`}></div>
                                </div>
                                <p className={`flex-grow text-sm ${subtask.completed ? 'line-through text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>{subtask.title}</p>
                                {task.assignee && <UserAvatar user={task.assignee} className="w-7 h-7 flex-shrink-0 opacity-60" title={`Assigned to ${task.assignee.name}`}/>}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};


interface TaskGraphViewProps {
    boardData: BoardData;
    users: User[];
    onTaskClick: (task: Task) => void;
}

export const TaskGraphView: React.FC<TaskGraphViewProps> = ({ boardData, users, onTaskClick }) => {
    const tasksByColumn = boardData.columnOrder.map(colId => {
        const column = boardData.columns[colId];
        const tasks = column ? column.taskIds.map(taskId => boardData.tasks[taskId]).filter(Boolean) : [];
        return { column, tasks };
    }).filter(group => group.column); // Filter out groups with no column

    const totalTasks = tasksByColumn.reduce((sum, group) => sum + group.tasks.length, 0);

    return (
        <div className="bg-gray-100/50 dark:bg-gray-900/50 p-4 sm:p-6 rounded-lg">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                {tasksByColumn.map(({ column, tasks }) => (
                    <div key={column.id}>
                        <h3 className="text-base font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-200">
                           <span>{column.title}</span>
                           <span className="text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full px-2 py-0.5">
                               {tasks.length}
                           </span>
                        </h3>
                        <div className="space-y-6">
                           {tasks.map(task => (
                               <TaskTree 
                                   key={task.id} 
                                   task={task} 
                                   column={column} 
                                   users={users} 
                                   onTaskClick={onTaskClick}
                               />
                           ))}
                        </div>
                    </div>
                ))}
            </div>
            {totalTasks === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <p className="font-semibold">No tasks to display in the graph view.</p>
                    <p className="text-sm mt-1">Try creating some tasks or clearing your filters.</p>
                </div>
            )}
        </div>
    );
};

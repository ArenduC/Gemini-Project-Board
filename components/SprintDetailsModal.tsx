import React, { useMemo } from 'react';
import { Sprint, Task, User, Column } from '../types';
import { XIcon, CheckSquareIcon } from './Icons';
import { UserAvatar } from './UserAvatar';
import { SprintWorkloadChart } from './SprintWorkloadChart';

interface SprintDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sprint: Sprint;
  projectTasks: Record<string, Task>;
  projectColumns: Record<string, Column>;
  users: User[];
}

export const SprintDetailsModal: React.FC<SprintDetailsModalProps> = ({ isOpen, onClose, sprint, projectTasks, projectColumns, users }) => {

  const { tasksInSprint, tasksByStatus, completedCount, totalCount, progress } = useMemo(() => {
    // FIX: Explicitly cast Object.values results and add types to intermediate variables
    // to resolve type inference issues where properties were being accessed on 'unknown'.
    const tasks: Task[] = (Object.values(projectTasks) as Task[]).filter(t => t.sprintId === sprint.id);
    const byStatus: Record<string, Task[]> = {};
    
    const columns: Column[] = (Object.values(projectColumns) as Column[]);
    columns.forEach(col => {
        byStatus[col.title] = [];
    });

    tasks.forEach(task => {
        const column = columns.find(c => c.taskIds.includes(task.id));
        if (column && byStatus[column.title]) {
            byStatus[column.title].push(task);
        } else if (column) {
            byStatus[column.title] = [task];
        }
    });
    
    const doneColumn = columns.find(c => c.title.toLowerCase() === 'done');
    const completed = doneColumn && byStatus[doneColumn.title] ? byStatus[doneColumn.title].length : 0;
    const total = tasks.length;
    const prog = total > 0 ? (completed / total) * 100 : 0;

    return { tasksInSprint: tasks, tasksByStatus: byStatus, completedCount: completed, totalCount: total, progress: prog };
  }, [sprint, projectTasks, projectColumns]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#131C1B] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-800 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">{sprint.name}</h2>
            <p className="text-sm text-gray-400">
              {sprint.startDate && sprint.endDate
                ? `${new Date(sprint.startDate).toLocaleDateString()} - ${new Date(sprint.endDate).toLocaleDateString()}`
                : 'No dates set'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-800">
            <XIcon className="w-6 h-6" />
          </button>
        </header>
        <div className="p-6 overflow-y-auto custom-scrollbar flex-grow grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column - Details & Workload */}
            <div className="md:col-span-1 space-y-6">
                <div>
                    <h3 className="text-base font-semibold text-white mb-2">Sprint Goal</h3>
                    <p className="text-sm text-gray-300 italic">{sprint.goal || 'No goal set for this sprint.'}</p>
                </div>
                <div>
                    <h3 className="text-base font-semibold text-white mb-2">Progress</h3>
                    <div className="flex justify-between items-center text-sm mb-1.5">
                        <span className="font-medium text-white">Completed</span>
                        <span className="font-semibold text-white">{completedCount} / {totalCount}</span>
                    </div>
                    <div className="w-full bg-[#1C2326] rounded-full h-2.5">
                        <div className="bg-gray-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
                 <div>
                    <h3 className="text-base font-semibold text-white mb-3">Sprint Burndown</h3>
                    <SprintWorkloadChart tasks={tasksInSprint} users={users} />
                 </div>
            </div>
            {/* Right Column - Tasks */}
            <div className="md:col-span-2 space-y-4">
                 {/* FIX: Added explicit type annotation to map parameters to resolve type inference error. */}
                 {Object.entries(tasksByStatus).map(([status, tasks]: [string, Task[]]) => (
                    tasks.length > 0 && (
                        <div key={status}>
                            <h4 className="font-semibold text-sm text-white flex items-center gap-2 mb-2">
                                <span>{status}</span>
                                <span className="text-xs font-medium bg-gray-700 text-white rounded-full px-2 py-0.5">{tasks.length}</span>
                            </h4>
                            <div className="space-y-2">
                                {tasks.map(task => (
                                    <div key={task.id} className="bg-[#1C2326]/60 p-2 rounded-md flex justify-between items-center">
                                        <p className="text-sm text-white">{task.title}</p>
                                        <UserAvatar user={task.assignee} className="w-7 h-7 flex-shrink-0 text-xs" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                 ))}
                 {totalCount === 0 && (
                     <div className="text-center py-10 text-gray-500">
                        <CheckSquareIcon className="w-10 h-10 mx-auto mb-2"/>
                        <p>No tasks in this sprint.</p>
                    </div>
                 )}
            </div>
        </div>
      </div>
    </div>
  );
};
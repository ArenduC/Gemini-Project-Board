import React from 'react';
import { Project, Task, User, TaskPriority, Column } from '../types';
import { UserAvatar } from './UserAvatar';
import { DropResult } from 'react-beautiful-dnd';

interface TaskTableViewProps {
  project: Project;
  tasks: Task[];
  users: User[];
  onUpdateTask: (task: Task) => Promise<void>;
  onDragEnd: (result: DropResult) => Promise<void>;
  onTaskClick: (task: Task) => void;
}

const priorityStyles: Record<TaskPriority, string> = {
  [TaskPriority.URGENT]: 'bg-red-400 border-red-400 text-black',
  [TaskPriority.HIGH]: 'bg-yellow-400 border-yellow-400 text-black',
  [TaskPriority.MEDIUM]: 'bg-blue-400 border-blue-400 text-white',
  [TaskPriority.LOW]: 'bg-gray-500 border-gray-500 text-white',
};

export const TaskTableView: React.FC<TaskTableViewProps> = ({ project, tasks, users, onUpdateTask, onDragEnd, onTaskClick }) => {
  const projectMembers = project.members.map(id => users.find(u => u.id === id)).filter((u): u is User => !!u);
  // FIX: Cast Object.values to the correct type to avoid type inference issues.
  const columns = Object.values(project.board.columns) as Column[];

  const handleStatusChange = (task: Task, newColumnId: string) => {
    const sourceColumn = columns.find(c => c.taskIds.includes(task.id));
    if (!sourceColumn || sourceColumn.id === newColumnId) return;

    const sourceIndex = sourceColumn.taskIds.indexOf(task.id);
    const destinationColumn = columns.find(c => c.id === newColumnId);
    const destinationIndex = destinationColumn ? destinationColumn.taskIds.length : 0;

    const result: DropResult = {
      draggableId: task.id,
      source: { droppableId: sourceColumn.id, index: sourceIndex },
      destination: { droppableId: newColumnId, index: destinationIndex },
      reason: 'DROP',
      type: 'DEFAULT',
      mode: 'FLUID',
      combine: null,
    };
    onDragEnd(result);
  };

  const handleAssigneeChange = (task: Task, newAssigneeId: string) => {
    const newAssignee = newAssigneeId ? projectMembers.find(m => m.id === newAssigneeId) : undefined;
    onUpdateTask({ ...task, assignee: newAssignee });
  };

  const handlePriorityChange = (task: Task, newPriority: TaskPriority) => {
    onUpdateTask({ ...task, priority: newPriority });
  };

  const getTaskColumnId = (taskId: string): string | undefined => {
    return columns.find(c => c.taskIds.includes(taskId))?.id;
  };

  return (
    <div className="bg-[#131C1B] rounded-xl shadow-md border border-gray-800 overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-[#1C2326]/50">
          <tr className="text-xs">
            <th className="px-6 py-4 font-semibold text-white uppercase tracking-wider">Task</th>
            <th className="px-4 py-4 font-semibold text-white uppercase tracking-wider">Status</th>
            <th className="px-4 py-4 font-semibold text-white uppercase tracking-wider">Priority</th>
            <th className="px-6 py-4 font-semibold text-white uppercase tracking-wider">Assignee</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {tasks.map(task => {
            const currentColumnId = getTaskColumnId(task.id);
            return (
              <tr key={task.id} className="text-sm text-white hover:bg-gray-800/50">
                <td className="px-6 py-3">
                  <button onClick={() => onTaskClick(task)} className="font-medium hover:underline text-left">
                    {task.title}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={currentColumnId || ''}
                    onChange={e => handleStatusChange(task, e.target.value)}
                    className="bg-transparent border-none focus:ring-2 focus:ring-gray-500 rounded-md p-1 -m-1"
                  >
                    {columns.map(col => (
                      <option key={col.id} value={col.id} className="bg-[#1C2326]">{col.title}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={task.priority}
                    onChange={e => handlePriorityChange(task, e.target.value as TaskPriority)}
                    className={`bg-transparent border text-xs font-semibold rounded-full px-2 py-1 focus:ring-2 focus:ring-gray-500 ${priorityStyles[task.priority]}`}
                  >
                    {Object.values(TaskPriority).map(p => (
                      <option key={p} value={p} className="bg-[#1C2326] text-white font-normal">{p}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <UserAvatar user={task.assignee} className="w-7 h-7" />
                    <select
                      value={task.assignee?.id || ''}
                      onChange={e => handleAssigneeChange(task, e.target.value)}
                      className="bg-transparent border-none focus:ring-2 focus:ring-gray-500 rounded-md p-1 -m-1 max-w-[120px]"
                    >
                      <option value="" className="bg-[#1C2326]">Unassigned</option>
                      {projectMembers.map(m => (
                        <option key={m.id} value={m.id} className="bg-[#1C2326]">{m.name}</option>
                      ))}
                    </select>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {tasks.length === 0 && (
        <p className="text-center py-8 text-gray-500">No tasks match your current filters.</p>
      )}
    </div>
  );
};
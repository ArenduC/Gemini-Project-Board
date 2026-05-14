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

  const getStatusStyle = (columnId: string | undefined): string => {
    const column = columns.find(c => c.id === columnId);
    const title = (column?.title || '').toLowerCase();
    if (title.includes('done') || title.includes('complete')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (title.includes('progress') || title.includes('current')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (title.includes('review') || title.includes('verify')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    return 'bg-white/5 text-gray-400 border-white/5';
  };

  const priorityStyles: Record<TaskPriority, string> = {
    [TaskPriority.URGENT]: 'bg-red-500/10 text-red-400 border-red-500/20 font-bold',
    [TaskPriority.HIGH]: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    [TaskPriority.MEDIUM]: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    [TaskPriority.LOW]: 'bg-white/5 text-gray-500 border-white/5',
  };

  return (
    <div className="bg-[#131C1B]/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/5 overflow-hidden">
      <table className="w-full text-left table-fixed">
        <thead className="bg-white/5">
          <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
            <th className="px-6 py-4 w-auto">Task</th>
            <th className="px-6 py-4 w-40">Status</th>
            <th className="px-6 py-4 w-32">Priority</th>
            <th className="px-6 py-4 w-48">Assignee</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {tasks.map(task => {
            const currentColumnId = getTaskColumnId(task.id);
            return (
              <tr key={task.id} className="text-[11px] text-white hover:bg-white/[0.03] transition-all group">
                <td className="px-6 py-4 overflow-hidden">
                  <button onClick={() => onTaskClick(task)} className="font-bold text-white hover:text-emerald-400 transition-colors text-left truncate w-full">
                    {task.title}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <div className={`inline-flex items-center rounded-md border px-2 py-0.5 w-full ${getStatusStyle(currentColumnId)}`}>
                    <select
                      value={currentColumnId || ''}
                      onChange={e => handleStatusChange(task, e.target.value)}
                      className="bg-transparent border-none text-[8px] font-black uppercase tracking-widest focus:ring-0 p-0 w-full cursor-pointer appearance-none"
                    >
                      {columns.map(col => (
                        <option key={col.id} value={col.id} className="bg-[#1C2326]">{col.title}</option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="px-6 py-4">
                    <div className={`inline-block border rounded-md px-2 py-0.5 w-full ${priorityStyles[task.priority]}`}>
                    <select
                        value={task.priority}
                        onChange={e => handlePriorityChange(task, e.target.value as TaskPriority)}
                        className="bg-transparent border-none text-[8px] font-black uppercase tracking-widest focus:ring-0 p-0 w-full cursor-pointer appearance-none"
                    >
                        {Object.values(TaskPriority).map(p => (
                        <option key={p} value={p} className="bg-[#1C2326] text-white font-normal">{p}</option>
                        ))}
                    </select>
                    </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 bg-white/5 rounded-md p-1 pr-3">
                    <UserAvatar user={task.assignee} className="w-5 h-5 ring-1 ring-white/10" />
                    <select
                      value={task.assignee?.id || ''}
                      onChange={e => handleAssigneeChange(task, e.target.value)}
                      className="bg-transparent border-none text-[9px] text-gray-400 hover:text-white focus:ring-0 p-0 w-full cursor-pointer appearance-none truncate"
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
        <div className="text-center py-20 text-gray-600 font-mono text-xs italic uppercase tracking-widest">
            NO DATA IN MATRIX
        </div>
      )}
    </div>
  );
};
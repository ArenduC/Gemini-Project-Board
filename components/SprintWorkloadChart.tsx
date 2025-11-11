import React, { useMemo } from 'react';
import { Task, User } from '../types';
import { UserAvatar } from './UserAvatar';

interface SprintWorkloadChartProps {
  tasks: Task[];
  users: User[];
}

const colors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
];

export const SprintWorkloadChart: React.FC<SprintWorkloadChartProps> = ({ tasks, users }) => {
  const workload = useMemo(() => {
    const assigneeCounts: Record<string, number> = {};
    let unassignedCount = 0;

    tasks.forEach(task => {
      if (task.assignee?.id) {
        assigneeCounts[task.assignee.id] = (assigneeCounts[task.assignee.id] || 0) + 1;
      } else {
        unassignedCount++;
      }
    });
    
    const assignedWorkload = Object.entries(assigneeCounts)
      .map(([userId, count]) => ({
        user: users.find(u => u.id === userId),
        count,
      }))
      .filter(item => item.user)
      .sort((a, b) => b.count - a.count);

    if (unassignedCount > 0) {
        assignedWorkload.push({
            user: {id: 'unassigned', name: 'Unassigned', role: '' as any},
            count: unassignedCount
        });
    }

    return assignedWorkload;
  }, [tasks, users]);

  const maxCount = useMemo(() => Math.max(1, ...workload.map(item => item.count)), [workload]);

  if (workload.length === 0) {
    return <p className="text-xs text-center text-gray-500 py-4">No tasks to display in chart.</p>;
  }

  return (
    <div className="space-y-3 p-3 bg-[#1C2326] rounded-lg">
      {workload.map((item, index) => (
        <div key={item.user!.id} className="flex items-center gap-3">
          <UserAvatar user={item.user!.id === 'unassigned' ? null : item.user} className="w-8 h-8 text-xs flex-shrink-0" />
          <div className="flex-grow flex items-center gap-2">
            <div className="w-full bg-gray-700 rounded-full h-4">
              <div
                className={`h-4 rounded-full ${colors[index % colors.length]}`}
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              ></div>
            </div>
            <span className="font-semibold text-white text-sm w-8 text-right">{item.count}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

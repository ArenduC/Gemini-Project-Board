import React, { useMemo, useState } from 'react';
import { Project, User, Task } from '../types';
import { UserAvatar } from '../components/UserAvatar';
import { ListIcon, UsersIcon } from '../components/Icons';
import { UserActivityGraph } from '../components/UserActivityGraph';

interface ResourceManagementPageProps {
  projects: Record<string, Project>;
  users: Record<string, User>;
  onlineUsers: Set<string>;
  onTaskClick: (task: Task) => void;
}

export const ResourceManagementPage: React.FC<ResourceManagementPageProps> = ({ projects, users, onlineUsers, onTaskClick }) => {
    const [view, setView] = useState<'table' | 'graph'>('table');
    
    const userWorkload = useMemo(() => {
        const workload: Record<string, { assignedTasks: number, projects: Set<string> }> = {};
        
        Object.values(users).forEach(user => {
            workload[user.id] = { assignedTasks: 0, projects: new Set() };
        });

        Object.values(projects).forEach(project => {
            // Count tasks assigned to a user across all projects
            Object.values(project.board.tasks).forEach(task => {
                if(task.assignee && workload[task.assignee.id]) {
                    workload[task.assignee.id].assignedTasks++;
                }
            });

            // Add project to user's list if they are a member
            project.members.forEach(memberId => {
                if (workload[memberId]) {
                    workload[memberId].projects.add(project.name);
                }
            });
        });

        return workload;
    }, [projects, users]);

  return (
    <div>
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold">Team Activity</h2>
             <div className="flex items-center p-1 bg-gray-200 dark:bg-gray-800 rounded-lg">
                <button
                    onClick={() => setView('table')}
                    className={`p-2 rounded-md ${view === 'table' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'}`}
                    aria-label="Table View"
                    title="Table View"
                >
                    <ListIcon className="w-5 h-5" />
                </button>
                <button
                    onClick={() => setView('graph')}
                    className={`p-2 rounded-md ${view === 'graph' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'}`}
                    aria-label="Graph View"
                    title="Graph View"
                >
                    <UsersIcon className="w-5 h-5" />
                </button>
            </div>
        </div>

        {view === 'graph' ? (
            <UserActivityGraph projects={projects} users={users} onlineUsers={onlineUsers} onTaskClick={onTaskClick} />
        ) : (
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 dark:bg-gray-800/50">
                        <tr className="text-xs">
                            <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Team Member</th>
                            <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Role</th>
                            <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Assigned Tasks</th>
                            <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Active Projects</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {Object.values(users).map(user => (
                            <tr key={user.id} className="text-sm">
                                <td className="px-4 py-3 flex items-center gap-3">
                                    <UserAvatar user={user} className="w-8 h-8" isOnline={onlineUsers.has(user.id)} />
                                    <span className="font-medium">{user.name}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-base font-semibold">{userWorkload[user.id]?.assignedTasks || 0}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-2">
                                        {Array.from(userWorkload[user.id]?.projects || []).map(projectName => (
                                            <span key={projectName} className="text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
                                                {projectName}
                                            </span>
                                        ))}
                                        {(userWorkload[user.id]?.projects.size === 0) && (
                                            <span className="text-xs text-gray-400">Not in any projects</span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </div>
  );
};
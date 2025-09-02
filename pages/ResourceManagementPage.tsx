import React, { useMemo } from 'react';
import { Project, User } from '../types';
import { UserAvatar } from '../components/UserAvatar';

interface ResourceManagementPageProps {
  projects: Record<string, Project>;
  users: Record<string, User>;
}

export const ResourceManagementPage: React.FC<ResourceManagementPageProps> = ({ projects, users }) => {
    
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
        <h2 className="text-3xl font-bold mb-6">Resource Management</h2>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr className="text-sm">
                        <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Team Member</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Role</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Assigned Tasks</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Active Projects</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {Object.values(users).map(user => (
                        <tr key={user.id} className="text-sm">
                            <td className="px-4 py-3 flex items-center gap-3">
                                <UserAvatar user={user} className="w-8 h-8" />
                                <span className="font-medium">{user.name}</span>
                            </td>
                            <td className="px-4 py-3">
                                <span className="text-xs font-medium bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-full">
                                    {user.role}
                                </span>
                            </td>
                            <td className="px-4 py-3">
                                <span className="text-base font-semibold">{userWorkload[user.id]?.assignedTasks || 0}</span>
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                    {Array.from(userWorkload[user.id]?.projects || []).map(projectName => (
                                        <span key={projectName} className="text-xs font-medium bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-full">
                                            {projectName}
                                        </span>
                                    ))}
                                    {(userWorkload[user.id]?.projects.size === 0) && (
                                        <span className="text-xs text-slate-400">Not in any projects</span>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};
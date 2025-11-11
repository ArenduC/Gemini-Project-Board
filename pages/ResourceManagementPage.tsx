import React, { useMemo, useState } from 'react';
import { Project, User, Task } from '../types';
import { UserAvatar } from '../components/UserAvatar';
import { ListIcon, UsersIcon } from '../components/Icons';
import { UserActivityGraph } from '../components/UserActivityGraph';
import { Pagination } from '../components/Pagination';

interface ResourceManagementPageProps {
  projects: Record<string, Project>;
  users: Record<string, User>;
  onlineUsers: Set<string>;
  onTaskClick: (task: Task) => void;
}

export const ResourceManagementPage: React.FC<ResourceManagementPageProps> = ({ projects, users, onlineUsers, onTaskClick }) => {
    const [view, setView] = useState<'table' | 'graph'>('table');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    
    const userWorkload = useMemo(() => {
        const workload: Record<string, { assignedTasks: number, projects: Set<string> }> = {};
        
        // FIX: Cast Object.values to the correct type to avoid type inference issues.
        (Object.values(users) as User[]).forEach(user => {
            workload[user.id] = { assignedTasks: 0, projects: new Set() };
        });

        // FIX: Cast Object.values to the correct type to avoid type inference issues.
        (Object.values(projects) as Project[]).forEach(project => {
            // Count tasks assigned to a user across all projects
            // FIX: Cast Object.values to the correct type to avoid type inference issues.
            (Object.values(project.board.tasks) as Task[]).forEach(task => {
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
    
    // FIX: Cast Object.values to the correct type to avoid type inference issues.
    const usersList = Object.values(users) as User[];
    const totalPages = Math.ceil(usersList.length / ITEMS_PER_PAGE);
    const paginatedUsers = usersList.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );


  return (
    <div>
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <h2 className="text-xl font-bold text-white">Team Activity</h2>
             <div className="flex items-center p-1 bg-[#1C2326] rounded-lg">
                <button
                    onClick={() => setView('table')}
                    className={`p-2 rounded-md ${view === 'table' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-800/50'}`}
                    aria-label="Table View"
                    title="Table View"
                >
                    <ListIcon className="w-5 h-5" />
                </button>
                <button
                    onClick={() => setView('graph')}
                    className={`p-2 rounded-md ${view === 'graph' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-800/50'}`}
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
            <div>
                <div className="bg-[#131C1B] rounded-xl shadow-md border border-gray-800 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-[#1C2326]/50">
                            <tr className="text-xs">
                                <th className="px-4 py-3 font-semibold text-white uppercase tracking-wider">Team Member</th>
                                <th className="px-4 py-3 font-semibold text-white uppercase tracking-wider">Role</th>
                                <th className="px-4 py-3 font-semibold text-white uppercase tracking-wider">Assigned Tasks</th>
                                <th className="px-4 py-3 font-semibold text-white uppercase tracking-wider">Active Projects</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {paginatedUsers.map(user => (
                                <tr key={user.id} className="text-xs text-white">
                                    <td className="px-4 py-3 flex items-center gap-3">
                                        <UserAvatar user={user} className="w-8 h-8" isOnline={onlineUsers.has(user.id)} />
                                        <span className="font-medium">{user.name}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs font-medium bg-gray-800 text-gray-400 px-2 py-1 rounded-full">
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm font-semibold">{userWorkload[user.id]?.assignedTasks || 0}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-2">
                                            {Array.from(userWorkload[user.id]?.projects || []).map(projectName => (
                                                <span key={projectName} className="text-xs font-medium bg-gray-800 text-gray-400 px-2 py-1 rounded-full">
                                                    {projectName}
                                                </span>
                                            ))}
                                            {(userWorkload[user.id]?.projects.size === 0) && (
                                                <span className="text-xs text-gray-500">Not in any projects</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={ITEMS_PER_PAGE}
                    totalItems={usersList.length}
                />
            </div>
        )}
    </div>
  );
};

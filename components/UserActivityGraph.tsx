import React, { useMemo } from 'react';
import { Project, User, Task, BoardData } from '../types';
import { UserAvatar } from './UserAvatar';

const statusColors: Record<string, { dot: string, text: string }> = {
    'To Do': { dot: 'bg-gray-500', text: 'text-gray-400' },
    'In Progress': { dot: 'bg-blue-500', text: 'text-blue-400' },
    'Done': { dot: 'bg-green-500', text: 'text-green-400' },
    'default': { dot: 'bg-gray-500', text: 'text-gray-400' },
};

const getTaskStatus = (task: Task, board: BoardData): { name: string; colorInfo: { dot: string, text: string } } => {
    const column = Object.values(board.columns).find(c => c.taskIds.includes(task.id));
    const statusName = column?.title || 'Uncategorized';
    const colorInfo = statusColors[statusName] || statusColors.default;
    return { name: statusName, colorInfo };
};

interface UserActivityGraphProps {
    projects: Record<string, Project>;
    users: Record<string, User>;
    onlineUsers: Set<string>;
    onTaskClick: (task: Task) => void;
}

interface UserWorkload {
    user: User;
    projectWorkload: {
        project: Project;
        tasks: Task[];
    }[];
}

export const UserActivityGraph: React.FC<UserActivityGraphProps> = ({ projects, users, onlineUsers, onTaskClick }) => {
    const userWorkloads = useMemo((): UserWorkload[] => {
        return Object.values(users).map(user => {
            const projectWorkload = Object.values(projects)
                .map(project => {
                    const tasks = Object.values(project.board.tasks).filter(task => task.assignee?.id === user.id);
                    return { project, tasks };
                })
                .filter(workload => workload.tasks.length > 0); // Only include projects where user has tasks

            return { user, projectWorkload };
        });
    }, [projects, users]);

    return (
        <div className="space-y-8">
            {userWorkloads.map(({ user, projectWorkload }) => (
                <div key={user.id} className="p-4 bg-[#131C1B] rounded-xl border border-gray-800">
                    {/* User Node */}
                    <div className="flex items-center gap-4 mb-4">
                        <UserAvatar user={user} className="w-12 h-12 text-xl" isOnline={onlineUsers.has(user.id)} />
                        <div>
                            <h3 className="text-lg font-bold text-white">{user.name}</h3>
                            <p className="text-sm text-gray-400">{user.role}</p>
                        </div>
                    </div>
                    
                    {/* Projects & Tasks Tree */}
                    {projectWorkload.length > 0 ? (
                        <ul className="relative pl-6">
                             {/* The main vertical connector line */}
                            <span className="absolute left-[2px] top-4 bottom-4 w-0.5 bg-gray-800" aria-hidden="true"></span>
                            {projectWorkload.map(({ project, tasks }) => (
                                <li key={project.id} className="relative py-2">
                                     {/* The horizontal connector line */}
                                    <span className="absolute left-[-22px] top-4 -translate-y-1/2 w-6 h-0.5 bg-gray-800" aria-hidden="true"></span>
                                    {/* Connector dot */}
                                    <span className="absolute left-[2px] top-4 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gray-800" aria-hidden="true"></span>
                                    
                                    {/* Project Node */}
                                    <div className="mb-2">
                                        <h4 className="font-semibold text-white">{project.name}</h4>
                                    </div>
                                    
                                    {/* Tasks List */}
                                    <ul className="relative pt-2 pl-9">
                                        <span className="absolute left-[11px] top-0 bottom-4 w-0.5 bg-gray-800/50" aria-hidden="true"></span>
                                        {tasks.map(task => {
                                            const { name: statusName, colorInfo } = getTaskStatus(task, project.board);
                                            return (
                                                <li key={task.id} className="relative py-1.5">
                                                     <span className="absolute left-[-25px] top-1/2 -translate-y-1/2 w-6 h-0.5 bg-gray-800/50" aria-hidden="true"></span>
                                                     <span className="absolute left-[-2px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gray-800/50" aria-hidden="true"></span>
                                                    <div 
                                                        className="flex items-center gap-4 bg-[#1C2326]/60 p-2 rounded-md border border-gray-800/50 cursor-pointer hover:bg-[#1C2326] transition-colors"
                                                        onClick={() => onTaskClick(task)}
                                                    >
                                                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-800 flex-shrink-0">
                                                            <div className={`w-2.5 h-2.5 rounded-full ${colorInfo.dot}`}></div>
                                                        </div>
                                                        <p className="flex-grow text-sm text-white">{task.title}</p>
                                                        <p className={`text-xs font-medium ${colorInfo.text}`}>{statusName}</p>
                                                    </div>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="pl-6 text-sm text-gray-500">No tasks assigned to this user.</div>
                    )}
                </div>
            ))}
        </div>
    );
};
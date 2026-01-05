import React, { useMemo } from 'react';
import { Project, User, Task, BoardData, Bug } from '../types';
import { UserAvatar } from './UserAvatar';
import { CheckSquareIcon, LifeBuoyIcon } from './Icons';

const statusColors: Record<string, { dot: string, text: string, bg: string }> = {
    'To Do': { dot: 'bg-gray-500', text: 'text-gray-400', bg: 'bg-gray-500/10' },
    'In Progress': { dot: 'bg-blue-500', text: 'text-blue-400', bg: 'bg-blue-500/10' },
    'Done': { dot: 'bg-emerald-500', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    'default': { dot: 'bg-gray-500', text: 'text-gray-400', bg: 'bg-gray-500/10' },
};

const getTaskStatus = (task: Task, board: BoardData): { name: string; colorInfo: typeof statusColors['default']; isDone: boolean } => {
    if (!board || !board.columns) return { name: 'Unknown', colorInfo: statusColors.default, isDone: false };
    const column = Object.values(board.columns).find(c => c.taskIds.includes(task.id));
    const statusName = column?.title || 'Uncategorized';
    const colorInfo = statusColors[statusName] || statusColors.default;
    return { name: statusName, colorInfo, isDone: statusName.toLowerCase() === 'done' };
};

const getBugStatus = (bug: Bug): { name: string; colorInfo: typeof statusColors['default']; isDone: boolean } => {
    const status = bug.status || 'New';
    const isDone = status.toLowerCase().includes('done') || status.toLowerCase().includes('resolved');
    const colorInfo = isDone ? statusColors['Done'] : (status.toLowerCase().includes('progress') ? statusColors['In Progress'] : statusColors['To Do']);
    return { name: status, colorInfo, isDone };
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
        bugs: Bug[];
        solvedCount: number;
    }[];
}

export const UserActivityGraph: React.FC<UserActivityGraphProps> = ({ projects, users, onlineUsers, onTaskClick }) => {
    const userWorkloads = useMemo((): UserWorkload[] => {
        const uList = Object.values(users) as User[];
        const pList = Object.values(projects) as Project[];

        return uList.map(user => {
            const projectWorkload = pList
                .map(project => {
                    const tasks = project.board?.tasks ? (Object.values(project.board.tasks) as Task[]).filter(task => task.assignee?.id === user.id) : [];
                    const bugs = project.bugs ? (Object.values(project.bugs) as Bug[]).filter(bug => bug.assignee?.id === user.id) : [];
                    
                    const solvedTasks = tasks.filter(t => project.board ? getTaskStatus(t, project.board).isDone : false).length;
                    const solvedBugs = bugs.filter(b => getBugStatus(b).isDone).length;

                    return { project, tasks, bugs, solvedCount: solvedTasks + solvedBugs };
                })
                .filter(workload => workload.tasks.length > 0 || workload.bugs.length > 0);

            return { user, projectWorkload };
        }).filter(w => w.projectWorkload.length > 0);
    }, [projects, users]);

    return (
        <div className="space-y-12">
            {userWorkloads.map(({ user, projectWorkload }) => {
                return (
                    <div key={user.id} className="relative">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sticky top-0 bg-[#131C1B]/95 backdrop-blur-md py-3 z-10 border-b border-white/5">
                            <div className="flex items-center gap-4">
                                <UserAvatar user={user} className="w-14 h-14 text-xl ring-4 ring-white/5" isOnline={onlineUsers.has(user.id)} />
                                <div>
                                    <h3 className="text-lg font-bold text-white tracking-tight">{user.name}</h3>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{user.role}</span>
                                        <span className="w-1 h-1 rounded-full bg-gray-700" />
                                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                                            {projectWorkload.reduce((acc, p) => acc + p.solvedCount, 0)} Nodes Solved
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pl-4 border-l-2 border-white/5">
                            {projectWorkload.map(({ project, tasks, bugs }) => (
                                <div key={project.id} className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            {project.name}
                                        </h4>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">{tasks.length + bugs.length} Current Spike</span>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        {tasks.map(task => {
                                            const { name, colorInfo, isDone } = project.board ? getTaskStatus(task, project.board) : { name: 'Unknown', colorInfo: statusColors.default, isDone: false };
                                            return (
                                                <div 
                                                    key={task.id}
                                                    onClick={() => onTaskClick(task)}
                                                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer group/task
                                                        ${isDone ? 'bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/30' : 'bg-white/5 border-white/5 hover:border-white/10'}
                                                    `}
                                                >
                                                    <CheckSquareIcon className={`w-4 h-4 ${isDone ? 'text-emerald-500' : 'text-gray-600 group-hover/task:text-gray-400'}`} />
                                                    <p className={`flex-grow text-xs font-medium truncate ${isDone ? 'text-emerald-400/70 line-through' : 'text-white'}`}>
                                                        {task.title}
                                                    </p>
                                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${colorInfo.bg} ${colorInfo.text}`}>
                                                        {name}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                        {bugs.map(bug => {
                                            const { name, colorInfo, isDone } = getBugStatus(bug);
                                            return (
                                                <div 
                                                    key={bug.id}
                                                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer group/bug
                                                        ${isDone ? 'bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/30' : 'bg-red-500/5 border-red-500/10 hover:border-red-500/20'}
                                                    `}
                                                >
                                                    <LifeBuoyIcon className={`w-4 h-4 ${isDone ? 'text-emerald-500' : 'text-red-500/50 group-hover/bug:text-red-500'}`} />
                                                    <p className={`flex-grow text-xs font-medium truncate ${isDone ? 'text-emerald-400/70 line-through' : 'text-white'}`}>
                                                        <span className="font-mono text-[10px] text-gray-600 mr-2">{bug.bugNumber}</span>
                                                        {bug.title}
                                                    </p>
                                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${colorInfo.bg} ${colorInfo.text}`}>
                                                        {name}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
            {userWorkloads.length === 0 && (
                <div className="py-20 text-center text-gray-500">
                    <p className="font-bold">No effort matches the current strategic filter.</p>
                    <p className="text-xs mt-1">Adjust filters or search criteria to analyze resource nodes.</p>
                </div>
            )}
        </div>
    );
};
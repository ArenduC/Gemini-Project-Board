import React, { useMemo, useState, useEffect } from 'react';
import { Project, User, Task, Bug, TaskPriority } from '../types';
import { UserAvatar } from '../components/UserAvatar';
// FIX: Added SparklesIcon to the imports from Icons component.
import { UsersIcon, LayoutDashboardIcon, GitPullRequestIcon, ZapIcon, ClockIcon, FilterIcon, SearchIcon, XIcon, CheckSquareIcon, LifeBuoyIcon, TrendingUpIcon, SparklesIcon } from '../components/Icons';
import { UserActivityGraph } from '../components/UserActivityGraph';
import { ResourceNeuralGraph } from '../components/ResourceNeuralGraph';
import { Pagination } from '../components/Pagination';

interface ResourceManagementPageProps {
  projects: Record<string, Project>;
  users: Record<string, User>;
  onlineUsers: Set<string>;
  onTaskClick: (task: Task) => void;
}

const SummaryMetric: React.FC<{ icon: React.ReactNode; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => (
    <div className="p-6 rounded-[2rem] bg-[#131C1B] border border-white/5 shadow-xl transition-all hover:border-white/10 group">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-4 text-white group-hover:scale-110 transition-transform`}>
            {icon}
        </div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</p>
        <p className="text-3xl font-bold text-white mt-1 tracking-tight">{value}</p>
    </div>
);

const PriorityWeight: Record<TaskPriority, number> = {
    [TaskPriority.URGENT]: 4,
    [TaskPriority.HIGH]: 3,
    [TaskPriority.MEDIUM]: 2,
    [TaskPriority.LOW]: 1,
};

export const ResourceManagementPage: React.FC<ResourceManagementPageProps> = ({ projects, users, onlineUsers, onTaskClick }) => {
    const [view, setView] = useState<'table' | 'graph' | 'neural'>('neural');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
    const [selectedPriorities, setSelectedPriorities] = useState<Set<TaskPriority>>(new Set());
    const [showOnlySolved, setShowOnlySolved] = useState(false);

    const projectList = useMemo(() => Object.values(projects) as Project[], [projects]);
    const usersList = useMemo(() => Object.values(users) as User[], [users]);

    // Computed Filtered Data Mesh
    const filteredMesh = useMemo(() => {
        const stats: Record<string, { 
            assignedTasks: number, 
            completedTasks: number, 
            assignedBugs: number,
            completedBugs: number,
            projects: Set<string>,
            totalWeight: number,
            projectSpecificEffort: Record<string, { tasks: number, bugs: number, solved: number }>
        }> = {};
        
        usersList.forEach(user => {
            stats[user.id] = { 
                assignedTasks: 0, 
                completedTasks: 0, 
                assignedBugs: 0, 
                completedBugs: 0, 
                projects: new Set(), 
                totalWeight: 0,
                projectSpecificEffort: {}
            };
        });

        projectList.forEach(project => {
            if (selectedProjectIds.size > 0 && !selectedProjectIds.has(project.id)) return;

            const doneColumn = Object.values(project.board.columns).find(c => c.title.toLowerCase() === 'done');
            const doneIds = new Set(doneColumn?.taskIds || []);

            // Process Tasks
            Object.values(project.board.tasks).forEach(task => {
                if (selectedPriorities.size > 0 && !selectedPriorities.has(task.priority)) return;
                const isSolved = doneIds.has(task.id);
                if (showOnlySolved && !isSolved) return;

                if(task.assignee && stats[task.assignee.id]) {
                    const uStats = stats[task.assignee.id];
                    uStats.assignedTasks++;
                    if (isSolved) uStats.completedTasks++;
                    uStats.totalWeight += PriorityWeight[task.priority];
                    uStats.projects.add(project.id);

                    if (!uStats.projectSpecificEffort[project.id]) uStats.projectSpecificEffort[project.id] = { tasks: 0, bugs: 0, solved: 0 };
                    uStats.projectSpecificEffort[project.id].tasks++;
                    if (isSolved) uStats.projectSpecificEffort[project.id].solved++;
                }
            });

            // Process Bugs
            Object.values(project.bugs || {}).forEach(bug => {
                if (selectedPriorities.size > 0 && !selectedPriorities.has(bug.priority)) return;
                const isSolved = bug.status.toLowerCase().includes('done') || bug.status.toLowerCase().includes('resolved');
                if (showOnlySolved && !isSolved) return;

                if(bug.assignee && stats[bug.assignee.id]) {
                    const uStats = stats[bug.assignee.id];
                    uStats.assignedBugs++;
                    if (isSolved) uStats.completedBugs++;
                    uStats.totalWeight += PriorityWeight[bug.priority];
                    uStats.projects.add(project.id);

                    if (!uStats.projectSpecificEffort[project.id]) uStats.projectSpecificEffort[project.id] = { tasks: 0, bugs: 0, solved: 0 };
                    uStats.projectSpecificEffort[project.id].bugs++;
                    if (isSolved) uStats.projectSpecificEffort[project.id].solved++;
                }
            });
        });

        return stats;
    }, [projectList, usersList, selectedProjectIds, selectedPriorities, showOnlySolved]);

    const globalFilteredUsers = useMemo(() => {
        return usersList.filter(user => {
            const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                user.role.toLowerCase().includes(searchQuery.toLowerCase());
            const hasDataInScope = filteredMesh[user.id].assignedTasks > 0 || filteredMesh[user.id].assignedBugs > 0 || filteredMesh[user.id].projects.size > 0;
            return matchesSearch && (selectedProjectIds.size === 0 && selectedPriorities.size === 0 && !showOnlySolved ? true : hasDataInScope);
        });
    }, [usersList, searchQuery, filteredMesh, selectedProjectIds, selectedPriorities, showOnlySolved]);

    const paginatedUsers = globalFilteredUsers.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );

    const totalPages = Math.ceil(globalFilteredUsers.length / ITEMS_PER_PAGE);

    const toggleProject = (id: string) => {
        setSelectedProjectIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const togglePriority = (p: TaskPriority) => {
        setSelectedPriorities(prev => {
            const next = new Set(prev);
            if (next.has(p)) next.delete(p);
            else next.add(p);
            return next;
        });
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedProjectIds(new Set());
        setSelectedPriorities(new Set());
        setShowOnlySolved(false);
    };

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 pb-20">
        {/* Executive Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
                <h2 className="text-4xl font-bold text-white tracking-tight">Resource <span className="text-gray-500">Insights</span></h2>
                <p className="text-gray-500 text-sm mt-1">Strategic audit of mesh components and effort utilization.</p>
            </div>
            <div className="flex items-center p-1 bg-[#1C2326] rounded-2xl border border-white/5 shadow-inner">
                <button
                    onClick={() => setView('neural')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${view === 'neural' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    Neural Mesh
                </button>
                <button
                    onClick={() => setView('graph')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${view === 'graph' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    Effort Flow
                </button>
                <button
                    onClick={() => setView('table')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${view === 'table' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    Resource Audit
                </button>
            </div>
        </div>

        {/* Global Filter Bar */}
        <div className="p-4 bg-[#131C1B]/80 backdrop-blur-xl rounded-[2rem] border border-white/5 shadow-2xl flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/5 flex-grow max-w-xs">
                <SearchIcon className="w-4 h-4 text-gray-500" />
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search node or role..." 
                    className="bg-transparent border-none focus:outline-none text-xs text-white w-full" 
                />
            </div>

            <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mr-2">Mesh Focus</span>
                <div className="flex -space-x-2">
                    {projectList.slice(0, 5).map(p => (
                        <button 
                            key={p.id}
                            onClick={() => toggleProject(p.id)}
                            className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center text-[10px] font-bold
                                ${selectedProjectIds.has(p.id) ? 'bg-emerald-500 border-white text-black z-10 scale-110' : 'bg-gray-800 border-gray-700 text-gray-400 hover:z-10 hover:scale-105'}
                            `}
                            title={p.name}
                        >
                            {p.name.charAt(0)}
                        </button>
                    ))}
                    {projectList.length > 5 && (
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold border-2 border-transparent text-gray-500">
                            +{projectList.length - 5}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mr-2">Complexity</span>
                <div className="flex gap-1">
                    {[TaskPriority.URGENT, TaskPriority.HIGH, TaskPriority.MEDIUM].map(p => (
                        <button
                            key={p}
                            onClick={() => togglePriority(p)}
                            className={`px-3 py-1 rounded-full text-[9px] font-bold border transition-all
                                ${selectedPriorities.has(p) ? 'bg-white text-black border-white' : 'bg-transparent border-white/10 text-gray-500 hover:text-white'}
                            `}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            <button 
                onClick={() => setShowOnlySolved(!showOnlySolved)}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-[10px] font-bold uppercase tracking-widest transition-all
                    ${showOnlySolved ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'}
                `}
            >
                <CheckSquareIcon className="w-3 h-3" />
                Solved Only
            </button>

            {(searchQuery || selectedProjectIds.size > 0 || selectedPriorities.size > 0 || showOnlySolved) && (
                <button 
                    onClick={clearFilters}
                    className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                    title="Clear Filters"
                >
                    <XIcon className="w-5 h-5" />
                </button>
            )}
        </div>

        {/* Summary Cluster */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <SummaryMetric icon={<UsersIcon className="w-5 h-5" />} label="In-Scope Nodes" value={globalFilteredUsers.length} color="bg-blue-600" />
            <SummaryMetric icon={<LayoutDashboardIcon className="w-5 h-5" />} label="Hold Count" value={projectList.filter(p => selectedProjectIds.has(p.id) || selectedProjectIds.size === 0).length} color="bg-emerald-600" />
            <SummaryMetric icon={<TrendingUpIcon className="w-5 h-5" />} label="Effort Solved" value={Object.values(filteredMesh).reduce((acc, u) => acc + u.completedTasks + u.completedBugs, 0)} color="bg-purple-600" />
            <SummaryMetric icon={<ZapIcon className="w-5 h-5" />} label="Complexity Index" value={Object.values(filteredMesh).reduce((acc, u) => acc + u.totalWeight, 0)} color="bg-orange-600" />
        </div>

        {/* Main Content Hub */}
        <div className="grid grid-cols-12 gap-10">
            <div className="col-span-12 lg:col-span-8">
                {view === 'neural' && (
                    <ResourceNeuralGraph 
                        projects={Object.fromEntries(projectList.filter(p => selectedProjectIds.size === 0 || selectedProjectIds.has(p.id)).map(p => [p.id, p]))} 
                        users={Object.fromEntries(globalFilteredUsers.map(u => [u.id, u]))} 
                        onlineUsers={onlineUsers} 
                        onTaskClick={onTaskClick} 
                    />
                )}
                {view === 'graph' && (
                    <div className="p-6 bg-[#131C1B] rounded-[2rem] border border-white/5 shadow-2xl">
                        <UserActivityGraph projects={projects} users={users} onlineUsers={onlineUsers} onTaskClick={onTaskClick} />
                    </div>
                )}
                {view === 'table' && (
                    <div className="space-y-6">
                        <div className="bg-[#131C1B] rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
                            <table className="w-full text-left">
                                <thead className="bg-white/5">
                                    <tr className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500">
                                        <th className="px-6 py-5">Component</th>
                                        <th className="px-6 py-5">Effort Matrix</th>
                                        <th className="px-6 py-5">Weight</th>
                                        <th className="px-6 py-5">Mesh Holds</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {paginatedUsers.map(user => {
                                        const effort = filteredMesh[user.id];
                                        const solved = effort.completedTasks + effort.completedBugs;
                                        const total = effort.assignedTasks + effort.assignedBugs;
                                        const progress = total > 0 ? (solved / total) * 100 : 0;
                                        const avgComplexity = total > 0 ? (effort.totalWeight / total).toFixed(1) : '0.0';

                                        return (
                                            <tr key={user.id} className="text-sm text-white hover:bg-white/5 transition-all group">
                                                <td className="px-6 py-5 flex items-center gap-3">
                                                    <UserAvatar user={user} className="w-11 h-11 border border-white/10 ring-2 ring-white/5 group-hover:scale-105 transition-transform" isOnline={onlineUsers.has(user.id)} />
                                                    <div>
                                                        <p className="font-bold tracking-tight">{user.name}</p>
                                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{user.role}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-end">
                                                            <span className="text-[10px] font-bold text-gray-400">{solved} / {total} Solved</span>
                                                            <span className="text-[10px] font-mono text-emerald-400 font-bold">{progress.toFixed(0)}%</span>
                                                        </div>
                                                        <div className="w-40 bg-white/5 h-1.5 rounded-full overflow-hidden">
                                                            <div className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <span className="text-[9px] font-bold text-gray-600 uppercase flex items-center gap-1"><CheckSquareIcon className="w-2.5 h-2.5" /> {effort.completedTasks} Tasks</span>
                                                            <span className="text-[9px] font-bold text-gray-600 uppercase flex items-center gap-1"><LifeBuoyIcon className="w-2.5 h-2.5" /> {effort.completedBugs} Bugs</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <div className="inline-flex flex-col items-center">
                                                        <span className="text-lg font-bold tracking-tighter text-orange-400">{avgComplexity}</span>
                                                        <span className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">Complexity Index</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                                                        {Array.from(effort.projects).map(pId => (
                                                            <span key={pId} className="text-[8px] font-bold bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 truncate max-w-[80px]">
                                                                {projects[pId]?.name}
                                                            </span>
                                                        ))}
                                                        {effort.projects.size === 0 && <span className="text-[10px] text-gray-600 italic">No nodes held</span>}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={ITEMS_PER_PAGE} totalItems={globalFilteredUsers.length} />
                    </div>
                )}
            </div>

            {/* Sidebar Logic */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
                <div className="p-8 rounded-[2rem] bg-[#131C1B] border border-white/5 shadow-2xl">
                    <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-8 flex items-center gap-2">
                        Effort Distribution
                        <ZapIcon className="w-3 h-3 text-yellow-500 animate-pulse" />
                    </h4>
                    <div className="space-y-6">
                        {projectList.filter(p => selectedProjectIds.size === 0 || selectedProjectIds.has(p.id)).slice(0, 6).map(project => {
                            const projectTasks = Object.values(project.board.tasks);
                            const solved = projectTasks.filter(t => {
                                const doneCol = Object.values(project.board.columns).find(c => c.title.toLowerCase() === 'done');
                                return doneCol?.taskIds.includes(t.id);
                            }).length;
                            const total = projectTasks.length;
                            const saturation = total > 0 ? (solved / total) * 100 : 0;
                            
                            return (
                                <div key={project.id} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-white truncate max-w-[200px]">{project.name}</span>
                                        <span className="text-[10px] font-mono text-gray-500">{project.members.length} Nodes</span>
                                    </div>
                                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                        <div 
                                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.3)]" 
                                            style={{ width: `${saturation}%` }} 
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-8 rounded-[2rem] bg-gradient-to-br from-[#131C1B] to-[#0D1117] border border-white/10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <SparklesIcon className="w-32 h-32 text-white" />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-white/50 mb-4 flex items-center gap-2">
                        Strategic Velocity
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                    </h4>
                    <p className="text-[11px] text-gray-400 leading-relaxed italic z-10 relative">
                        {showOnlySolved 
                            ? "Audit view focuses on historical achievements and validated complex solutions." 
                            : "Current mesh load analysis identifies strategic bandwidth for upcoming neural sprints."}
                    </p>
                    <div className="mt-8 flex items-end justify-between z-10 relative">
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Mesh Efficiency</p>
                            <p className="text-4xl font-bold text-white tracking-tighter">
                                {Math.round(Object.values(filteredMesh).reduce((acc, u) => acc + (u.assignedTasks > 0 ? (u.completedTasks / u.assignedTasks) : 0), 0) / (globalFilteredUsers.length || 1) * 100)}%
                            </p>
                        </div>
                        <div className="text-right">
                             <TrendingUpIcon className="w-12 h-12 text-emerald-500/20" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
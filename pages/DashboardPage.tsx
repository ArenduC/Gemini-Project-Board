import React, { useState, useMemo, useEffect } from 'react';
import { Project, User, AiGeneratedProjectPlan, Task, Column } from '../types';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectListRow } from '../components/ProjectListRow';
import { PlusIcon, DownloadIcon, GridIcon, ListIcon, LayoutDashboardIcon, CalendarIcon, TrendingUpIcon, ClockIcon, SparklesIcon, CheckSquareIcon, ChevronLeftIcon, ChevronRightIcon, XIcon, UserIcon, ZapIcon } from '../components/Icons';
import { exportTasksToCsv } from '../utils/export';
import { ProjectDropzone } from '../components/ProjectDropzone';
import { ProjectConfirmationModal } from '../components/ProjectConfirmationModal';
import { generateProjectFromCsv } from '../services/geminiService';
import { Pagination } from '../components/Pagination';
import { UserAvatar } from '../components/UserAvatar';

interface DashboardPageProps {
  projects: Project[];
  users: Record<string, User>;
  currentUser: User;
  onlineUsers: Set<string>;
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
  onManageMembers: (projectId: string) => void;
  onShareProject: (project: Project) => void;
  addProjectFromPlan: (plan: AiGeneratedProjectPlan) => Promise<void>;
  aiFeaturesEnabled: boolean;
}

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number, trend?: string }> = ({ icon, label, value, trend }) => (
    <div className="p-4 rounded-xl bg-[#131C1B]/80 border border-white/5 shadow-xl backdrop-blur-md hover:border-white/20 transition-all group">
        <div className="flex justify-between items-start mb-2">
            <div className="p-2 rounded-xl bg-white/5 text-gray-400 group-hover:text-white transition-colors">
                {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: 'w-4 h-4' }) : icon}
            </div>
            {trend && <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">{trend}</span>}
        </div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-white mt-0.5">{value}</p>
    </div>
);

const DayActivityModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    date: Date; 
    tasks: Task[]; 
    projects: Project[];
    users: Record<string, User>;
    onlineUsers: Set<string>;
    onSelectProject: (id: string) => void;
}> = ({ isOpen, onClose, date, tasks, projects, users, onlineUsers, onSelectProject }) => {
    if (!isOpen) return null;

    const groupedByProject = useMemo(() => {
        const groups: Record<string, { project: Project; tasks: Task[] }> = {};
        tasks.forEach(task => {
            const project = projects.find(p => p.board?.tasks?.[task.id]);
            if (project) {
                if (!groups[project.id]) groups[project.id] = { project, tasks: [] };
                groups[project.id].tasks.push(task);
            }
        });
        return Object.values(groups);
    }, [tasks, projects]);

    const groupedByResource = useMemo(() => {
        const groups: Record<string, { user: User | null; tasks: Task[] }> = {};
        tasks.forEach(task => {
            const userId = task.assignee?.id || 'unassigned';
            if (!groups[userId]) {
                groups[userId] = { 
                    user: task.assignee ? users[task.assignee.id] : null, 
                    tasks: [] 
                };
            }
            groups[userId].tasks.push(task);
        });
        return Object.values(groups);
    }, [tasks, users]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-4xl bg-[#131C1B] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <header className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                            <ZapIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Activity Nexus</h2>
                            <p className="text-[10px] font-mono text-emerald-500/70 uppercase tracking-widest">{date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-all">
                        <XIcon className="w-6 h-6" />
                    </button>
                </header>

                <div className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-8">
                    {tasks.length === 0 ? (
                        <div className="py-20 text-center text-gray-600 font-mono text-[10px] uppercase tracking-[0.3em]">
                            NO NEURAL ACTIVITY DETECTED FOR THIS CYCLE
                        </div>
                    ) : (
                        <>
                            {/* Project-wise Breakdown */}
                            <section>
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <LayoutDashboardIcon className="w-3 h-3" /> Project Clusters
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {groupedByProject.map(({ project, tasks }) => (
                                        <div key={project.id} onClick={() => { onSelectProject(project.id); onClose(); }} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer group">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">{project.name}</h4>
                                                <span className="text-[9px] font-mono text-gray-500">{tasks.length} Nodes</span>
                                            </div>
                                            <div className="flex -space-x-2">
                                                {tasks.slice(0, 5).map(t => (
                                                    <div key={t.id} className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[8px] text-emerald-500 font-black">
                                                        {t.priority[0]}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Resource-wise Breakdown */}
                            <section>
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <UserIcon className="w-3 h-3" /> Resource Allocation
                                </h3>
                                <div className="space-y-2">
                                    {groupedByResource.map(({ user, tasks }) => (
                                        <div key={user?.id || 'unassigned'} className="p-3 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar user={user} className="w-8 h-8" isOnline={user ? onlineUsers.has(user.id) : false} />
                                                <span className="text-xs font-bold text-white">{user?.name || 'Unassigned Node'}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="text-[10px] font-mono text-white">{tasks.length} Syncs</p>
                                                    <p className="text-[8px] text-gray-500 uppercase font-bold tracking-widest">Load factor</p>
                                                </div>
                                                <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                                                    <div className="bg-blue-500 h-full" style={{ width: `${Math.min(tasks.length * 20, 100)}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Task-wise Breakdown */}
                            <section>
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <CheckSquareIcon className="w-3 h-3" /> Task Stream
                                </h3>
                                <div className="space-y-1">
                                    {tasks.map(task => (
                                        <div key={task.id} className="p-3 rounded-lg hover:bg-white/5 transition-colors border-b border-white/[0.02] flex items-center justify-between group/task">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-1.5 h-1.5 rounded-full ${task.priority === 'Urgent' ? 'bg-red-500 animate-pulse' : 'bg-gray-700'}`} />
                                                <span className="text-xs text-gray-300 font-medium group-hover/task:text-white transition-colors">{task.title}</span>
                                            </div>
                                            <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Node_{task.id.slice(0,4)}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </>
                    )}
                </div>

                <footer className="p-4 border-t border-white/5 bg-white/[0.01] flex justify-center">
                    <p className="text-[9px] font-mono text-gray-600 uppercase tracking-[0.3em]">Graphynovus Neural Audit System v3.0</p>
                </footer>
            </div>
        </div>
    );
};

const MiniCalendar: React.FC<{ tasks: Task[], onDayClick: (date: Date, tasks: Task[]) => void }> = ({ tasks, onDayClick }) => {
    const [viewDate, setViewDate] = useState(new Date());
    const currentMonth = viewDate.getMonth();
    const currentYear = viewDate.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

    const changeMonth = (delta: number) => {
        const nextDate = new Date(currentYear, currentMonth + delta, 1);
        setViewDate(nextDate);
    };

    const resetToToday = () => setViewDate(new Date());

    const engagementMap = useMemo(() => {
        const counts = new Map<number, Task[]>();
        tasks.forEach(t => {
            if (t.dueDate) {
                const d = new Date(t.dueDate);
                if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                    const day = d.getDate();
                    const existing = counts.get(day) || [];
                    counts.set(day, [...existing, t]);
                }
            }
        });
        return counts;
    }, [tasks, currentMonth, currentYear]);

    const maxEngagement = useMemo(() => {
        // FIX: Added explicit type annotation to 'list' to resolve "Property 'length' does not exist on type 'unknown'" error.
        const values = Array.from(engagementMap.values()).map((list: Task[]) => list.length);
        return values.length > 0 ? Math.max(...(values as number[])) : 1;
    }, [engagementMap]);

    const getEngagementStyle = (day: number) => {
        const dayTasks = engagementMap.get(day) || [];
        const count = dayTasks.length;
        if (count === 0) return 'text-gray-500 hover:bg-white/5';
        
        const ratio = count / maxEngagement;
        
        if (ratio >= 0.8) return 'bg-emerald-500 text-black font-black shadow-[0_0_12px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400/50';
        if (ratio >= 0.5) return 'bg-emerald-500/60 text-white font-bold border border-emerald-500/40';
        if (ratio >= 0.25) return 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/20';
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10';
    };

    return (
        <div className="p-4 rounded-xl bg-[#131C1B]/80 border border-white/5 shadow-xl backdrop-blur-md">
            <div className="flex justify-between items-center mb-4">
                <div className="flex flex-col">
                    <h4 className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">Flow Calendar</h4>
                    <button 
                        onClick={resetToToday}
                        className="text-[10px] font-bold text-white mt-0.5 hover:text-emerald-400 transition-colors text-left flex items-center gap-1.5"
                    >
                        {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        <div className="w-1 h-1 rounded-full bg-emerald-500/50" />
                    </button>
                </div>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => changeMonth(-1)}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-all"
                    >
                        <ChevronLeftIcon className="w-3.5 h-3.5" />
                    </button>
                    <button 
                        onClick={() => changeMonth(1)}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-all"
                    >
                        <ChevronRightIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-[9px] text-center mb-2 font-bold text-gray-600">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d} className="w-full">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {blanks.map(b => <div key={`b-${b}`} className="aspect-square" />)}
                {days.map(d => {
                    const today = new Date();
                    const isToday = d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                    const engagementClass = getEngagementStyle(d);
                    const dayTasks = engagementMap.get(d) || [];
                    
                    return (
                        <div 
                            key={d} 
                            onClick={() => onDayClick(new Date(currentYear, currentMonth, d), dayTasks)}
                            title={dayTasks.length > 0 ? `${dayTasks.length} engagement nodes` : undefined}
                            className={`aspect-square flex items-center justify-center rounded-lg text-[9px] transition-all duration-300 relative overflow-hidden cursor-pointer group
                                ${isToday ? 'ring-1 ring-white/60' : ''}
                                ${engagementClass}
                                hover:scale-110 hover:z-10`}
                        >
                            <span className="relative z-10">{d}</span>
                            {dayTasks.length > 0 && (
                                <div className="absolute inset-0 bg-emerald-400 opacity-0 group-hover:opacity-10 transition-opacity" />
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="mt-4 flex items-center justify-between px-1">
                <span className="text-[7px] font-bold text-gray-600 uppercase tracking-widest">Density Scale</span>
                <div className="flex gap-1">
                    {[0.2, 0.4, 0.6, 0.8, 1].map((level, i) => (
                        <div 
                            key={i} 
                            className="w-1.5 h-1.5 rounded-full bg-emerald-500" 
                            style={{ opacity: level * 0.9 }} 
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

const DeadlineTracker: React.FC<{ tasks: Task[], onTaskClick: (task: Task) => void }> = ({ tasks, onTaskClick }) => {
    const sortedDeadlines = useMemo(() => {
        return tasks
            .filter(t => t.dueDate)
            .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
            .slice(0, 4);
    }, [tasks]);

    return (
        <div className="p-4 rounded-xl bg-[#131C1B]/80 border border-white/5 shadow-xl backdrop-blur-md max-h-[300px] overflow-y-auto custom-scrollbar">
            <h4 className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-3">Deadlines</h4>
            <div className="space-y-2">
                {sortedDeadlines.length > 0 ? sortedDeadlines.map(t => (
                    <div 
                        key={t.id} 
                        onClick={() => onTaskClick(t)}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-all group"
                    >
                        <div className="w-1 h-6 rounded-full bg-gray-700 group-hover:bg-emerald-500 transition-colors" />
                        <div className="min-w-0 flex-grow">
                            <p className="text-[11px] font-bold text-white truncate">{t.title}</p>
                            <p className="text-[9px] text-gray-500 flex items-center gap-1">
                                <ClockIcon className="w-2.5 h-2.5" />
                                {new Date(t.dueDate!).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-4 text-[9px] text-gray-600 font-mono italic">No pending syncs.</div>
                )}
            </div>
        </div>
    );
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ projects, users, currentUser, onlineUsers, onSelectProject, onCreateProject, onManageMembers, onShareProject, addProjectFromPlan, aiFeaturesEnabled }) => {
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [generatedPlan, setGeneratedPlan] = useState<AiGeneratedProjectPlan | null>(null);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 8;

    // Day Activity Modal State
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [dayActivityTasks, setDayActivityTasks] = useState<Task[]>([]);

    // FIX: Added explicit type casting (as Task[]) to ensure Object.values returns typed results for flatMap, resolving potential type inference issues.
    const allTasks = useMemo(() => projects.flatMap(p => p.board?.tasks ? (Object.values(p.board.tasks) as Task[]) : []), [projects]);
    
    const activeTasks = useMemo(() => {
        return projects.flatMap(p => {
            if (!p.board?.columns || !p.board?.tasks) return [];
            
            const columns = Object.values(p.board.columns) as Column[];
            const doneColumn = columns.find(c => c.title.toLowerCase() === 'done');
            const doneTaskIds = new Set(doneColumn?.taskIds || []);
            
            const tasks = Object.values(p.board.tasks) as Task[];
            return tasks.filter(t => !doneTaskIds.has(t.id));
        });
    }, [projects]);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Morning';
        if (hour < 18) return 'Afternoon';
        return 'Evening';
    }, []);

    const sortedProjects = useMemo(() => {
        const affinityKey = `neural-affinity-${currentUser.id}`;
        let affinityMap: Record<string, number> = {};
        try {
            affinityMap = JSON.parse(localStorage.getItem(affinityKey) || '{}');
        } catch (e) {
            console.error("Affinity read error", e);
        }

        return [...projects].sort((a, b) => {
            const timeA = affinityMap[a.id] || new Date(a.createdAt).getTime();
            const timeB = affinityMap[b.id] || new Date(b.createdAt).getTime();
            return timeB - timeA;
        });
    }, [projects, currentUser.id]);

    const totalPages = Math.ceil(sortedProjects.length / ITEMS_PER_PAGE);
    const paginatedProjects = sortedProjects.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handleFileProcessed = async (csvContent: string) => {
        setIsAiProcessing(true);
        try {
            const plan = await generateProjectFromCsv(csvContent);
            setGeneratedPlan(plan);
        } catch (err) {
            alert(`AI Error: ${err instanceof Error ? err.message : "An unknown error occurred."}`);
        } finally {
            setIsAiProcessing(false);
        }
    };

    const handleDayClick = (date: Date, tasks: Task[]) => {
        setSelectedDate(date);
        setDayActivityTasks(tasks);
    };

    return (
        <div className="max-w-[1500px] mx-auto space-y-6 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] uppercase tracking-widest text-emerald-400 mb-2">
                        <SparklesIcon className="w-2.5 h-2.5" /> Mesh Online
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                        {greeting}, <span className="text-gray-500">{currentUser.name.split(' ')[0]}</span>
                    </h2>
                    <p className="text-gray-500 text-xs mt-0.5">{activeTasks.length} pending tasks across {projects.length} nodes.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onCreateProject} className="px-5 py-2 bg-white text-black font-bold rounded-lg hover:scale-105 transition-all flex items-center gap-2 text-xs shadow-xl shadow-white/5">
                        <PlusIcon className="w-4 h-4" /> New Node
                    </button>
                    <button onClick={() => exportTasksToCsv(projects, users)} className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-all">
                        <DownloadIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<LayoutDashboardIcon />} label="Nodes" value={projects.length} trend="+2%" />
                <StatCard icon={<CheckSquareIcon />} label="Mesh Tasks" value={activeTasks.length} />
                <StatCard icon={<TrendingUpIcon />} label="Team Flux" value={`${onlineUsers.size}/${Object.keys(users).length}`} trend="Live" />
                <StatCard icon={<ClockIcon />} label="Latency" value="< 10ms" />
            </div>

            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-9 space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">Project Canvas <span className="text-[10px] font-medium text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">{projects.length}</span></h3>
                        <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-lg border border-white/5">
                            <button onClick={() => setView('grid')} className={`p-1.5 rounded-md transition-all ${view === 'grid' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}><GridIcon className="w-3.5 h-3.5"/></button>
                            <button onClick={() => setView('list')} className={`p-1.5 rounded-md transition-all ${view === 'list' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}><ListIcon className="w-3.5 h-3.5"/></button>
                        </div>
                    </div>

                    {aiFeaturesEnabled && (
                        <ProjectDropzone onFileProcessed={handleFileProcessed} isLoading={isAiProcessing} />
                    )}

                    {projects.length === 0 ? (
                        <div className="py-16 text-center bg-[#131C1B]/40 rounded-xl border border-dashed border-white/5 backdrop-blur-sm">
                            <LayoutDashboardIcon className="mx-auto h-12 w-12 text-gray-700 mb-3" />
                            <h3 className="text-lg font-bold text-white">Mesh Empty</h3>
                            <button onClick={onCreateProject} className="mt-6 px-5 py-2 bg-white/10 border border-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition-all text-xs">Initialize Workflow</button>
                        </div>
                    ) : view === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {paginatedProjects.map((p, idx) => (
                                <div key={p.id} className="relative">
                                    {idx === 0 && currentPage === 1 && (
                                        <div className="absolute -top-2 -left-2 z-10 px-2 py-0.5 bg-emerald-500 text-black text-[8px] font-black uppercase tracking-widest rounded-md shadow-lg rotate-[-5deg] animate-bounce">
                                            Active Nexus
                                        </div>
                                    )}
                                    <ProjectCard project={p} users={users} onlineUsers={onlineUsers} onSelect={onSelectProject} onManageMembers={onManageMembers} onShare={() => onShareProject(p)} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-[#131C1B]/80 rounded-xl border border-white/5 overflow-hidden shadow-2xl backdrop-blur-xl">
                             <div className="grid grid-cols-12 gap-4 items-center px-5 py-3 border-b border-white/5 bg-white/5 text-[9px] uppercase tracking-[0.2em] font-bold text-gray-500">
                                <div className="col-span-4">Project Mesh</div>
                                <div className="col-span-2">Sync</div>
                                <div className="col-span-2 text-center">Load</div>
                                <div className="col-span-2 text-right">Team</div>
                                <div className="col-span-2"></div>
                            </div>
                            {paginatedProjects.map(p => (
                                <ProjectListRow key={p.id} project={p} users={users} onlineUsers={onlineUsers} onSelect={onSelectProject} onManageMembers={onManageMembers} onShare={() => onShareProject(p)} />
                            ))}
                        </div>
                    )}
                    
                    {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={ITEMS_PER_PAGE} totalItems={projects.length} />}
                </div>

                <div className="col-span-12 lg:col-span-3 space-y-4">
                    <MiniCalendar tasks={allTasks} onDayClick={handleDayClick} />
                    <DeadlineTracker tasks={activeTasks} onTaskClick={(task) => {
                        const parentProj = projects.find(p => p.board?.tasks?.[task.id]);
                        if (parentProj) onSelectProject(parentProj.id);
                    }} />
                    <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-violet-500/10 border border-white/10 shadow-2xl">
                        <h4 className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/50 mb-2 flex items-center gap-1.5">
                             Intelligence <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        </h4>
                        <p className="text-[10px] text-gray-400 leading-relaxed italic">
                            Analyzing velocity. Last sync {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
                        </p>
                    </div>
                </div>
            </div>

            {generatedPlan && <ProjectConfirmationModal plan={generatedPlan} onConfirm={async () => { await addProjectFromPlan(generatedPlan); setGeneratedPlan(null); }} onCancel={() => setGeneratedPlan(null)} />}
            
            {selectedDate && (
                <DayActivityModal 
                    isOpen={!!selectedDate} 
                    onClose={() => setSelectedDate(null)} 
                    date={selectedDate} 
                    tasks={dayActivityTasks} 
                    projects={projects}
                    users={users}
                    onlineUsers={onlineUsers}
                    onSelectProject={onSelectProject}
                />
            )}
        </div>
    );
};

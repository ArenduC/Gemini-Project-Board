import React, { useState, useMemo, useEffect } from 'react';
import { Project, User, AiGeneratedProjectPlan, Task, Column } from '../types';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectListRow } from '../components/ProjectListRow';
import { PlusIcon, DownloadIcon, GridIcon, ListIcon, LayoutDashboardIcon, CalendarIcon, TrendingUpIcon, ClockIcon, SparklesIcon, CheckSquareIcon } from '../components/Icons';
import { exportTasksToCsv } from '../utils/export';
import { ProjectDropzone } from '../components/ProjectDropzone';
import { ProjectConfirmationModal } from '../components/ProjectConfirmationModal';
import { generateProjectFromCsv } from '../services/geminiService';
import { Pagination } from '../components/Pagination';

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
}

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number, trend?: string }> = ({ icon, label, value, trend }) => (
    <div className="p-5 rounded-2xl bg-[#131C1B]/80 border border-white/5 shadow-xl backdrop-blur-md hover:border-white/20 transition-all group">
        <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 rounded-xl bg-white/5 text-gray-400 group-hover:text-white transition-colors">{icon}</div>
            {trend && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">{trend}</span>}
        </div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
);

const MiniCalendar: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

    const taskDates = useMemo(() => {
        const dates = new Set<string>();
        tasks.forEach(t => {
            if (t.dueDate) {
                const d = new Date(t.dueDate);
                if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                    dates.add(d.getDate().toString());
                }
            }
        });
        return dates;
    }, [tasks, currentMonth, currentYear]);

    return (
        <div className="p-5 rounded-2xl bg-[#131C1B]/80 border border-white/5 shadow-xl backdrop-blur-md">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500">Upcoming Flow</h4>
                <span className="text-xs font-semibold text-white">{today.toLocaleString('default', { month: 'long' })}</span>
            </div>
            <div className="grid grid-cols-7 gap-1 text-[10px] text-center mb-2 font-bold text-gray-600">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {blanks.map(b => <div key={`b-${b}`} className="aspect-square" />)}
                {days.map(d => {
                    const isToday = d === today.getDate();
                    const hasTask = taskDates.has(d.toString());
                    return (
                        <div key={d} className={`aspect-square flex items-center justify-center rounded-lg text-[10px] transition-all
                            ${isToday ? 'bg-white text-black font-bold scale-110 shadow-lg' : 
                              hasTask ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 
                              'text-gray-500 hover:bg-white/5'}`}>
                            {d}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const DeadlineTracker: React.FC<{ tasks: Task[], onTaskClick: (task: Task) => void }> = ({ tasks, onTaskClick }) => {
    const sortedDeadlines = useMemo(() => {
        return tasks
            .filter(t => t.dueDate)
            .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
            .slice(0, 5);
    }, [tasks]);

    return (
        <div className="p-5 rounded-2xl bg-[#131C1B]/80 border border-white/5 shadow-xl backdrop-blur-md">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Neural Deadlines</h4>
            <div className="space-y-4">
                {sortedDeadlines.length > 0 ? sortedDeadlines.map(t => (
                    <div 
                        key={t.id} 
                        onClick={() => onTaskClick(t)}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-all group"
                    >
                        <div className="w-1.5 h-8 rounded-full bg-gray-700 group-hover:bg-emerald-500 transition-colors" />
                        <div className="min-w-0 flex-grow">
                            <p className="text-xs font-bold text-white truncate">{t.title}</p>
                            <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                <ClockIcon className="w-3 h-3" />
                                {new Date(t.dueDate!).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-4 text-[10px] text-gray-600 font-mono italic">No pending synchronizations.</div>
                )}
            </div>
        </div>
    );
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ projects, users, currentUser, onlineUsers, onSelectProject, onCreateProject, onManageMembers, onShareProject, addProjectFromPlan }) => {
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [generatedPlan, setGeneratedPlan] = useState<AiGeneratedProjectPlan | null>(null);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const allTasks = useMemo(() => projects.flatMap(p => Object.values(p.board.tasks)), [projects]);
    const activeTasks = useMemo(() => {
        return projects.flatMap(p => {
            const doneColumn = Object.values(p.board.columns).find(c => c.title.toLowerCase() === 'done');
            const doneIds = new Set(doneColumn?.taskIds || []);
            return Object.values(p.board.tasks).filter(t => !doneIds.has(t.id));
        });
    }, [projects]);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Neural Morning';
        if (hour < 18) return 'Processing Afternoon';
        return 'System Evening';
    }, []);

    const sortedProjects = useMemo(() => {
        return [...projects].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [projects]);

    const totalPages = Math.ceil(sortedProjects.length / ITEMS_PER_PAGE);
    const paginatedProjects = sortedProjects.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

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

    return (
        <div className="max-w-[1600px] mx-auto space-y-10 pb-20">
            {/* Header / Welcome Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] uppercase tracking-widest text-emerald-400 mb-3 animate-pulse">
                        <SparklesIcon className="w-3 h-3" />
                        Mesh Online
                    </div>
                    <h2 className="text-4xl font-bold text-white tracking-tight">
                        {greeting}, <span className="text-gray-500">{currentUser.name.split(' ')[0]}</span>
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">You have {activeTasks.length} pending neural tasks across {projects.length} nodes.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onCreateProject}
                        className="px-6 py-3 bg-white text-black font-bold rounded-2xl hover:scale-105 transition-all flex items-center gap-2 shadow-2xl shadow-white/5 active:scale-95"
                    >
                        <PlusIcon className="w-5 h-5" />
                        New Node
                    </button>
                    <button
                        onClick={() => exportTasksToCsv(projects, users)}
                        className="p-3 bg-white/5 border border-white/10 rounded-2xl text-white hover:bg-white/10 transition-all"
                        title="Export Mesh Data"
                    >
                        <DownloadIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Metrics Cluster */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={<LayoutDashboardIcon className="w-5 h-5"/>} label="Active Nodes" value={projects.length} trend="+2%" />
                <StatCard icon={<CheckSquareIcon className="w-5 h-5"/>} label="Mesh Tasks" value={activeTasks.length} />
                <StatCard icon={<TrendingUpIcon className="w-5 h-5"/>} label="Team Flux" value={`${onlineUsers.size}/${Object.keys(users).length}`} trend="Live" />
                <StatCard icon={<ClockIcon className="w-5 h-5"/>} label="Sync Latency" value="< 10ms" />
            </div>

            {/* Main Content Hub */}
            <div className="grid grid-cols-12 gap-10">
                {/* Projects Canvas */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            Project Canvas
                            <span className="text-xs font-medium text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">{projects.length}</span>
                        </h3>
                        <div className="flex items-center gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                            <button onClick={() => setView('grid')} className={`p-1.5 rounded-lg transition-all ${view === 'grid' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}><GridIcon className="w-4 h-4"/></button>
                            <button onClick={() => setView('list')} className={`p-1.5 rounded-lg transition-all ${view === 'list' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}><ListIcon className="w-4 h-4"/></button>
                        </div>
                    </div>

                    <ProjectDropzone onFileProcessed={handleFileProcessed} isLoading={isAiProcessing} />

                    {projects.length === 0 ? (
                        <div className="py-24 text-center bg-[#131C1B]/40 rounded-[2.5rem] border border-dashed border-white/5 backdrop-blur-sm">
                            <LayoutDashboardIcon className="mx-auto h-16 w-16 text-gray-700 mb-4" />
                            <h3 className="text-xl font-bold text-white">Mesh Empty</h3>
                            <p className="text-gray-500 text-sm mt-1 max-w-xs mx-auto">Initialize your workspace by creating a project or importing a neural plan.</p>
                            <button onClick={onCreateProject} className="mt-8 px-6 py-2.5 bg-white/10 border border-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-all">Initialize Workflow</button>
                        </div>
                    ) : view === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {paginatedProjects.map(p => (
                                <ProjectCard 
                                    key={p.id} 
                                    project={p} 
                                    users={users} 
                                    onlineUsers={onlineUsers} 
                                    onSelect={onSelectProject} 
                                    onManageMembers={onManageMembers} 
                                    onShare={() => onShareProject(p)} 
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-[#131C1B]/80 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl backdrop-blur-xl">
                             <div className="grid grid-cols-12 gap-4 items-center px-6 py-4 border-b border-white/5 bg-white/5 text-[10px] uppercase tracking-widest font-bold text-gray-500">
                                <div className="col-span-4">Project Mesh</div>
                                <div className="col-span-2">Sync Progress</div>
                                <div className="col-span-2 text-center">Data Load</div>
                                <div className="col-span-2 text-right">Team Flux</div>
                                <div className="col-span-2"></div>
                            </div>
                            {paginatedProjects.map(p => (
                                <ProjectListRow key={p.id} project={p} users={users} onlineUsers={onlineUsers} onSelect={onSelectProject} onManageMembers={onManageMembers} onShare={() => onShareProject(p)} />
                            ))}
                        </div>
                    )}
                    
                    {totalPages > 1 && (
                        <Pagination 
                            currentPage={currentPage} 
                            totalPages={totalPages} 
                            onPageChange={setCurrentPage} 
                            itemsPerPage={ITEMS_PER_PAGE} 
                            totalItems={projects.length} 
                        />
                    )}
                </div>

                {/* Intelligence Sidepanel */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <MiniCalendar tasks={allTasks} />
                    <DeadlineTracker tasks={activeTasks} onTaskClick={(task) => {
                        // Assuming the app state or navigation can handle direct task lookup from dashboard
                        // In this version, we'll just log or you can implement logic to open the task project
                        console.log("Opening task node:", task.id);
                        const parentProj = projects.find(p => p.board.tasks[task.id]);
                        if (parentProj) onSelectProject(parentProj.id);
                    }} />
                    
                    {/* Activity Feed Placeholder */}
                    <div className="p-6 rounded-[2rem] bg-gradient-to-br from-emerald-500/10 to-violet-500/10 border border-white/10 shadow-2xl">
                        <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-white/50 mb-4 flex items-center gap-2">
                             Neural Intelligence
                             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        </h4>
                        <p className="text-[11px] text-gray-400 leading-relaxed italic">
                            Gemini is currently analyzing your mesh velocity. Sync complete in 24h.
                        </p>
                    </div>
                </div>
            </div>

            {generatedPlan && (
                <ProjectConfirmationModal
                    plan={generatedPlan}
                    onConfirm={async () => { await addProjectFromPlan(generatedPlan); setGeneratedPlan(null); }}
                    onCancel={() => setGeneratedPlan(null)}
                />
            )}
        </div>
    );
};
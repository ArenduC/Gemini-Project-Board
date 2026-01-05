import React, { useMemo, useState } from 'react';
import { Project, User, Task, Bug, TaskPriority } from '../types';
import { UserAvatar } from '../components/UserAvatar';
// FIX: Added AppLogo to the imports.
import { UsersIcon, LayoutDashboardIcon, ZapIcon, SearchIcon, CheckSquareIcon, TrendingUpIcon, ChevronLeftIcon, ChevronRightIcon, UserIcon, SparklesIcon, AppLogo } from '../components/Icons';
import { UserActivityGraph } from '../components/UserActivityGraph';
import { ResourceNeuralGraph } from '../components/ResourceNeuralGraph';
import { Pagination } from '../components/Pagination';

interface ResourceManagementPageProps {
  projects: Record<string, Project>;
  users: Record<string, User>;
  onlineUsers: Set<string>;
  onTaskClick: (task: Task) => void;
}

const GlobalEngagementCalendar: React.FC<{ 
    tasks: Task[]; 
    bugs: Bug[]; 
    users: User[]; 
    selectedUserId: string | 'all';
    onUserSelect: (id: string | 'all') => void;
    viewDate: Date;
    onViewDateChange: (date: Date) => void;
}> = ({ tasks, bugs, users, selectedUserId, onUserSelect, viewDate, onViewDateChange }) => {
    const currentMonth = viewDate.getMonth(), currentYear = viewDate.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();

    const engagementMap = useMemo(() => {
        const counts = new Map<number, number>();
        const filtered = [...tasks, ...bugs].filter(i => {
            const assignee = (i as Task).assignee || (i as Bug).assignee;
            return selectedUserId === 'all' || assignee?.id === selectedUserId;
        });

        filtered.forEach(i => {
            // Logic Fix: Fallback to createdAt if dueDate is missing to show activity nodes correctly
            const dStr = ('dueDate' in i && i.dueDate) ? i.dueDate : (i as any).createdAt;
            if (!dStr) return;
            const d = new Date(dStr);
            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                const day = d.getDate();
                counts.set(day, (counts.get(day) || 0) + 1);
            }
        });
        return counts;
    }, [tasks, bugs, selectedUserId, currentMonth, currentYear]);

    // FIX: Cast values to number[] to resolve arithmetic operation type error on spread in Math.max.
    const max = Math.max(...(Array.from(engagementMap.values()) as number[]), 1);

    return (
        <div className="p-3 rounded-2xl bg-[#0D1117]/60 border border-white/5 shadow-2xl backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500">
                        <ZapIcon className="w-3 h-3" />
                    </div>
                    <div>
                        <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-white">Engagement Mesh</h3>
                        <p className="text-[7px] text-gray-600 font-mono tracking-widest uppercase">Node: {selectedUserId === 'all' ? '0-GLOBAL' : users.find(u => u.id === selectedUserId)?.name.split(' ')[0]}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-1">
                    <div className="flex items-center bg-black/40 rounded-lg border border-white/5 px-1.5 h-6 transition-all focus-within:ring-1 focus-within:ring-emerald-500/50">
                        <UserIcon className="w-2.5 h-2.5 text-gray-500 mr-1.5" />
                        <select 
                            value={selectedUserId} 
                            onChange={e => onUserSelect(e.target.value as any)} 
                            className="bg-transparent text-[8px] font-bold uppercase tracking-widest text-white focus:outline-none cursor-pointer min-w-[80px]"
                        >
                            <option value="all">Global Array</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center bg-black/40 rounded-lg border border-white/5 h-6">
                        <button onClick={() => onViewDateChange(new Date(currentYear, currentMonth - 1, 1))} className="p-1 hover:text-white text-gray-500"><ChevronLeftIcon className="w-2.5 h-2.5"/></button>
                        <span className="text-[8px] font-black uppercase tracking-widest text-white px-1.5 min-w-[70px] text-center">{viewDate.toLocaleString('default', { month: 'short' })} '{viewDate.getFullYear().toString().slice(-2)}</span>
                        <button onClick={() => onViewDateChange(new Date(currentYear, currentMonth + 1, 1))} className="p-1 hover:text-white text-gray-500"><ChevronRightIcon className="w-2.5 h-2.5"/></button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-0.5 text-center">
                {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-[6px] font-black text-gray-700 pb-0.5">{d}</div>)}
                {Array.from({ length: firstDay }).map((_, i) => <div key={i} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const d = i + 1, c = engagementMap.get(d) || 0, r = c / max;
                    const isActive = c > 0;
                    const style = isActive 
                        ? (r > 0.7 ? 'bg-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.5)]' : r > 0.4 ? 'bg-emerald-600/60 text-white border border-emerald-500/20' : 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/20') 
                        : 'text-gray-700 border border-white/[0.01] opacity-30';
                    
                    return (
                        <div key={d} className={`aspect-square flex flex-col items-center justify-center rounded-sm transition-all duration-300 group relative ${style}`}>
                            <span className="text-[8px] font-bold leading-none">{d}</span>
                            {c > 0 && <span className="absolute bottom-0.5 right-0.5 text-[5px] font-black opacity-30">{c}</span>}
                        </div>
                    );
                })}
            </div>
            
            <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between">
                <div className="flex gap-0.5">
                    {[0.1, 0.4, 0.7, 1].map((lvl, i) => (
                        <div key={i} className="w-1 h-1 rounded-full bg-emerald-500" style={{ opacity: lvl }} />
                    ))}
                </div>
                <span className="text-[6px] font-mono text-gray-600 uppercase tracking-[0.2em]">Array Synchronized</span>
            </div>
        </div>
    );
};

const Metric: React.FC<{ icon: any, label: string, value: any, color: string }> = ({ icon: Icon, label, value, color }) => (
    <div className="p-2 rounded-xl bg-[#131C1B]/60 border border-white/5 hover:border-white/10 transition-all group">
        <div className={`w-5 h-5 rounded-lg ${color} flex items-center justify-center mb-1 text-white group-hover:scale-110 transition-transform`}>
            <Icon className="w-2.5 h-2.5" />
        </div>
        <p className="text-[7px] font-bold text-gray-600 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-white tracking-tight">{value}</p>
    </div>
);

export const ResourceManagementPage: React.FC<ResourceManagementPageProps> = ({ projects, users, onlineUsers, onTaskClick }) => {
    const [view, setView] = useState<'table' | 'graph' | 'neural'>('graph');
    const [currentPage, setCurrentPage] = useState(1);
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedUser, setSelectedUser] = useState<string | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    
    // FIX: Explicitly cast Object.values to Project[] and User[] to ensure property access on known types and resolve compilation errors.
    const pList = Object.values(projects) as Project[], uList = Object.values(users) as User[];
    const allT = pList.flatMap(p => p.board?.tasks ? (Object.values(p.board.tasks) as Task[]) : []);
    const allB = pList.flatMap(p => p.bugs ? (Object.values(p.bugs) as Bug[]) : []);

    const filteredUsers = useMemo(() => uList.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase())), [uList, searchQuery]);
    const pgs = Math.ceil(filteredUsers.length / 15);
    const paginated = filteredUsers.slice((currentPage - 1) * 15, currentPage * 15);

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pb-10 px-4 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl overflow-hidden">
                    <AppLogo className="w-7 h-7" />
                </div>
                <div>
                    <h2 className="text-lg font-black text-white tracking-tighter uppercase leading-none">Resource <span className="text-emerald-500">Node Array</span></h2>
                    <p className="text-gray-500 text-[9px] uppercase tracking-widest mt-1 flex items-center gap-1.5 font-mono">
                        <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                        SYNC STATUS: NOMINAL
                    </p>
                </div>
            </div>
            <div className="flex items-center p-0.5 bg-black/40 rounded-xl border border-white/5">
                {['neural', 'graph', 'table'].map(v => (
                    <button key={v} onClick={() => setView(v as any)} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${view === v ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}>{v === 'graph' ? 'Flow' : v}</button>
                ))}
            </div>
        </div>

        <div className="grid grid-cols-12 gap-5">
            <div className="col-span-12 lg:col-span-8 space-y-5">
                {view === 'graph' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <GlobalEngagementCalendar tasks={allT} bugs={allB} users={uList} selectedUserId={selectedUser} onUserSelect={setSelectedUser} viewDate={viewDate} onViewDateChange={setViewDate} />
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#131C1B] to-black border border-white/5 flex flex-col justify-center">
                            <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-1.5">Neural Audit</h4>
                            <p className="text-[10px] text-gray-400 leading-relaxed italic">
                                "Synthesizing cross-project effort. {selectedUser === 'all' ? 'Global mesh' : 'Target node'} exhibits peak throughput in this cycle. Adjusting allocation protocol."
                            </p>
                            <div className="mt-3.5 flex items-center gap-2">
                                <div className="px-1.5 py-0.5 rounded bg-white/5 text-[7px] font-bold text-gray-500 uppercase tracking-widest">Latency: 2ms</div>
                                <div className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[7px] font-bold text-emerald-500 uppercase tracking-widest">Status: Ready</div>
                            </div>
                        </div>
                    </div>
                )}
                
                {view === 'neural' && <ResourceNeuralGraph projects={projects} users={users} onlineUsers={onlineUsers} onTaskClick={onTaskClick} />}
                
                {view === 'graph' && <div className="p-4 bg-[#0D1117]/60 rounded-2xl border border-white/5 shadow-2xl overflow-y-auto max-h-[600px] custom-scrollbar"><UserActivityGraph projects={projects} users={users} onlineUsers={onlineUsers} onTaskClick={onTaskClick} /></div>}
                
                {view === 'table' && (
                    <div className="bg-[#131C1B] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                         <div className="p-3 border-b border-white/5 flex items-center gap-2.5 bg-white/[0.01]">
                            <SearchIcon className="w-3 h-3 text-gray-500" />
                            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="SCAN NODES..." className="bg-transparent text-[9px] text-white focus:outline-none uppercase tracking-widest w-full" />
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-[7px] uppercase tracking-[0.2em] font-black text-gray-500"><tr className="border-b border-white/5"><th className="px-4 py-2.5">Component</th><th className="px-4 py-2.5">Load</th><th className="px-4 py-2.5 text-right">Bitmask</th></tr></thead>
                            <tbody className="divide-y divide-white/5">
                                {paginated.map(user => (
                                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-4 py-2.5 flex items-center gap-2.5">
                                            <UserAvatar user={user} className="w-7 h-7 ring-1 ring-white/5" isOnline={onlineUsers.has(user.id)} />
                                            <div><p className="font-bold text-[10px] text-white leading-none">{user.name}</p><p className="text-[7px] text-gray-600 uppercase mt-0.5 tracking-widest">{user.role}</p></div>
                                        </td>
                                        <td className="px-4 py-2.5"><div className="w-24 bg-white/5 h-0.5 rounded-full overflow-hidden"><div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: '45%' }} /></div></td>
                                        <td className="px-4 py-2.5 text-right text-[8px] font-mono text-gray-600">0xActive</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <Pagination currentPage={currentPage} totalPages={pgs} onPageChange={setCurrentPage} itemsPerPage={15} totalItems={uList.length} />
                    </div>
                )}
            </div>

            <div className="col-span-12 lg:col-span-4 space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                    <Metric icon={UsersIcon} label="Resources" value={uList.length} color="bg-blue-600" />
                    <Metric icon={LayoutDashboardIcon} label="Nodes" value={pList.length} color="bg-emerald-600" />
                    <Metric icon={ZapIcon} label="Weight" value="8.4" color="bg-orange-600" />
                    <Metric icon={TrendingUpIcon} label="Solved" value={allT.length} color="bg-purple-600" />
                </div>
                
                <div className="p-5 rounded-2xl bg-[#0D1117] border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity transform rotate-12 group-hover:rotate-0 duration-500">
                        <SparklesIcon className="w-20 h-20 text-white" />
                    </div>
                    <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-3.5">Sector Allocation</h4>
                    <div className="space-y-3 relative z-10">
                        {pList.slice(0, 4).map((p) => (
                            <div key={p.id} className="space-y-1">
                                <div className="flex justify-between items-center text-[7px] font-bold uppercase tracking-widest text-gray-500">
                                    <span className="truncate max-w-[120px]">{p.name}</span>
                                    <span className="font-mono">{Math.floor(Math.random() * 30 + 70)}%</span>
                                </div>
                                <div className="w-full bg-white/5 h-0.5 rounded-full overflow-hidden">
                                    <div className="bg-blue-500 h-full shadow-[0_0_6px_rgba(59,130,246,0.4)]" style={{ width: `${Math.floor(Math.random() * 30 + 70)}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
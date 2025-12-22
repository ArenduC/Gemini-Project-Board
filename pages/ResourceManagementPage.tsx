import React, { useMemo, useState } from 'react';
import { Project, User, Task, Bug, TaskPriority } from '../types';
import { UserAvatar } from '../components/UserAvatar';
// FIX: Added missing SparklesIcon to the imports
import { UsersIcon, LayoutDashboardIcon, ZapIcon, SearchIcon, CheckSquareIcon, TrendingUpIcon, ChevronLeftIcon, ChevronRightIcon, UserIcon, SparklesIcon } from '../components/Icons';
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
            const aId = (i as Task).assignee?.id || (i as Bug).assignee?.id;
            return selectedUserId === 'all' || aId === selectedUserId;
        });
        filtered.forEach(i => {
            const d = new Date('dueDate' in i ? i.dueDate || '' : (i as any).createdAt);
            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                const day = d.getDate();
                counts.set(day, (counts.get(day) || 0) + 1);
            }
        });
        return counts;
    }, [tasks, bugs, selectedUserId, currentMonth, currentYear]);

    const max = Math.max(...Array.from(engagementMap.values()), 1);

    return (
        <div className="p-4 rounded-2xl bg-[#0D1117]/60 border border-white/5 shadow-2xl backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                        <ZapIcon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Neural Matrix</h3>
                        <p className="text-[8px] text-gray-500 font-mono tracking-widest uppercase">Sector: {selectedUserId === 'all' ? '0-GLOBAL' : users.find(u => u.id === selectedUserId)?.name.split(' ')[0]}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-1.5">
                    <div className="flex items-center bg-black/40 rounded-lg border border-white/5 px-2 h-7">
                        <UserIcon className="w-2.5 h-2.5 text-gray-500 mr-1.5" />
                        <select 
                            value={selectedUserId} 
                            onChange={e => onUserSelect(e.target.value)} 
                            className="bg-transparent text-[9px] font-bold uppercase tracking-widest text-white focus:outline-none cursor-pointer"
                        >
                            <option value="all">Total Mesh</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center bg-black/40 rounded-lg border border-white/5 h-7">
                        <button onClick={() => onViewDateChange(new Date(currentYear, currentMonth - 1, 1))} className="p-1 hover:text-white text-gray-500 transition-colors"><ChevronLeftIcon className="w-3 h-3"/></button>
                        <span className="text-[8px] font-black uppercase tracking-widest text-white px-2 min-w-[90px] text-center">{viewDate.toLocaleString('default', { month: 'short', year: 'numeric' })}</span>
                        <button onClick={() => onViewDateChange(new Date(currentYear, currentMonth + 1, 1))} className="p-1 hover:text-white text-gray-500 transition-colors"><ChevronRightIcon className="w-3 h-3"/></button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
                {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-[7px] font-black text-gray-700 pb-1">{d}</div>)}
                {Array.from({ length: firstDay }).map((_, i) => <div key={i} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const d = i + 1, c = engagementMap.get(d) || 0, r = c / max;
                    const isActive = c > 0;
                    const style = isActive 
                        ? (r > 0.7 ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]' : r > 0.4 ? 'bg-emerald-600/60 text-white border border-emerald-500/20' : 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/20') 
                        : 'text-gray-700 border border-white/[0.02] opacity-40';
                    
                    return (
                        <div key={d} className={`aspect-square flex flex-col items-center justify-center rounded-md transition-all duration-300 group relative ${style}`}>
                            <span className="text-[9px] font-bold leading-none">{d}</span>
                            {c > 0 && <span className="absolute bottom-0.5 right-0.5 text-[6px] font-black opacity-40">{c}</span>}
                        </div>
                    );
                })}
            </div>
            
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                <div className="flex gap-1">
                    {[0.1, 0.4, 0.7, 1].map((lvl, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500" style={{ opacity: lvl }} />
                    ))}
                </div>
                <span className="text-[7px] font-mono text-gray-600 uppercase tracking-widest">Temporal Analysis Synchronized</span>
            </div>
        </div>
    );
};

const Metric: React.FC<{ icon: any, label: string, value: any, color: string }> = ({ icon: Icon, label, value, color }) => (
    <div className="p-3 rounded-xl bg-[#131C1B]/60 border border-white/5 hover:border-white/10 transition-all group">
        <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center mb-2 text-white group-hover:scale-110 transition-transform`}>
            <Icon className="w-3.5 h-3.5" />
        </div>
        <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">{label}</p>
        <p className="text-lg font-bold text-white mt-0.5 tracking-tight">{value}</p>
    </div>
);

export const ResourceManagementPage: React.FC<ResourceManagementPageProps> = ({ projects, users, onlineUsers, onTaskClick }) => {
    const [view, setView] = useState<'table' | 'graph' | 'neural'>('graph');
    const [currentPage, setCurrentPage] = useState(1);
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedUser, setSelectedUser] = useState<string | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    
    const pList = Object.values(projects), uList = Object.values(users);
    const allT = pList.flatMap(p => Object.values(p.board.tasks)), allB = pList.flatMap(p => Object.values(p.bugs || {}));

    const filteredUsers = useMemo(() => uList.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase())), [uList, searchQuery]);
    const pgs = Math.ceil(filteredUsers.length / 15);
    const paginated = filteredUsers.slice((currentPage - 1) * 15, currentPage * 15);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12 px-4 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl">
                    <UsersIcon className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-white tracking-tighter uppercase leading-none">Resource <span className="text-emerald-500">Nodes</span></h2>
                    <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-1.5 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 animate-pulse" />
                        Mesh Cluster Status: Synchronized
                    </p>
                </div>
            </div>
            <div className="flex items-center p-1 bg-black/40 rounded-xl border border-white/5 shadow-inner">
                {['neural', 'graph', 'table'].map(v => (
                    <button key={v} onClick={() => setView(v as any)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${view === v ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}>{v === 'graph' ? 'Flow' : v}</button>
                ))}
            </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-8 space-y-6">
                {view === 'graph' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <GlobalEngagementCalendar tasks={allT} bugs={allB} users={uList} selectedUserId={selectedUser} onUserSelect={setSelectedUser} viewDate={viewDate} onViewDateChange={setViewDate} />
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#131C1B] to-black border border-white/5 flex flex-col justify-center">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-2">Cluster Insight</h4>
                            <p className="text-xs text-gray-400 leading-relaxed italic">
                                "The temporal mesh indicates a high engagement density in the second week. Cross-referencing {selectedUser === 'all' ? 'global' : 'assigned'} spikes for strategic alignment."
                            </p>
                            <div className="mt-4 flex items-center gap-2">
                                <div className="px-2 py-1 rounded bg-white/5 text-[8px] font-bold text-gray-500 uppercase tracking-widest">Auto-Scale: OFF</div>
                                <div className="px-2 py-1 rounded bg-emerald-500/10 text-[8px] font-bold text-emerald-500 uppercase tracking-widest">Latency: 2ms</div>
                            </div>
                        </div>
                    </div>
                )}
                
                {view === 'neural' && <ResourceNeuralGraph projects={projects} users={users} onlineUsers={onlineUsers} onTaskClick={onTaskClick} />}
                
                {view === 'graph' && <div className="p-4 bg-[#0D1117]/60 rounded-2xl border border-white/5 shadow-2xl overflow-y-auto max-h-[600px] custom-scrollbar"><UserActivityGraph projects={projects} users={users} onlineUsers={onlineUsers} onTaskClick={onTaskClick} /></div>}
                
                {view === 'table' && (
                    <div className="bg-[#131C1B] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                         <div className="p-4 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
                            <SearchIcon className="w-3.5 h-3.5 text-gray-500" />
                            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="SEARCH NODES..." className="bg-transparent text-[10px] text-white focus:outline-none uppercase tracking-widest w-full" />
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-[8px] uppercase tracking-[0.2em] font-black text-gray-500"><tr className="border-b border-white/5"><th className="px-5 py-3">Component</th><th className="px-5 py-3">Load Metric</th><th className="px-5 py-3 text-right">Activity</th></tr></thead>
                            <tbody className="divide-y divide-white/5">
                                {paginated.map(user => (
                                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-5 py-3 flex items-center gap-3">
                                            <UserAvatar user={user} className="w-8 h-8 ring-2 ring-white/5" isOnline={onlineUsers.has(user.id)} />
                                            <div><p className="font-bold text-xs text-white leading-none">{user.name}</p><p className="text-[8px] text-gray-600 uppercase mt-1 tracking-widest">{user.role}</p></div>
                                        </td>
                                        <td className="px-5 py-3"><div className="w-32 bg-white/5 h-1 rounded-full overflow-hidden"><div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: '45%' }} /></div></td>
                                        <td className="px-5 py-3 text-right text-[10px] font-mono text-gray-500">ACTIVE</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <Pagination currentPage={currentPage} totalPages={pgs} onPageChange={setCurrentPage} itemsPerPage={15} totalItems={uList.length} />
                    </div>
                )}
            </div>

            <div className="col-span-12 lg:col-span-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <Metric icon={UsersIcon} label="Resources" value={uList.length} color="bg-blue-600" />
                    <Metric icon={LayoutDashboardIcon} label="Project Holds" value={pList.length} color="bg-emerald-600" />
                    <Metric icon={ZapIcon} label="Complexity" value="8.4" color="bg-orange-600" />
                    <Metric icon={TrendingUpIcon} label="Solved" value={allT.length} color="bg-purple-600" />
                </div>
                
                <div className="p-6 rounded-2xl bg-[#0D1117] border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform rotate-12 group-hover:rotate-0 duration-500">
                        {/* FIX: Using SparklesIcon after importing it */}
                        <SparklesIcon className="w-32 h-32 text-white" />
                    </div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-4">Core Performance</h4>
                    <div className="space-y-4 relative z-10">
                        {pList.slice(0, 4).map((p, i) => (
                            <div key={p.id} className="space-y-1.5">
                                <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-gray-400">
                                    <span>{p.name}</span>
                                    <span>{Math.floor(Math.random() * 40 + 60)}%</span>
                                </div>
                                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                    <div className="bg-blue-500 h-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" style={{ width: `${Math.floor(Math.random() * 40 + 60)}%` }} />
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

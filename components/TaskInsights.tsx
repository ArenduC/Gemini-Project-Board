import React, { useMemo } from 'react';
import { AugmentedTask, TaskPriority } from '../types';
import { ZapIcon, TrendingUpIcon, LayoutDashboardIcon, CheckSquareIcon } from './Icons';

interface TaskInsightsProps {
  tasks: AugmentedTask[];
}

const InsightCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; colorClass: string; footer?: string }> = ({ title, value, icon, colorClass, footer }) => (
    <div className="bg-[#131C1B]/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all duration-500 min-h-[160px]">
        {/* Animated Scanning Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
        
        <div className={`absolute -top-10 -right-10 w-40 h-40 blur-[80px] opacity-10 group-hover:opacity-30 transition-all duration-700 rounded-full ${colorClass}`} />
        
        <div className="flex justify-between items-start z-10">
            <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] mb-2">{title}</p>
                <h4 className="text-4xl font-bold text-white tracking-tighter">{value}</h4>
            </div>
            <div className={`p-3 rounded-2xl bg-white/5 text-gray-300 group-hover:scale-110 group-hover:text-white transition-all duration-500`}>
                {icon}
            </div>
        </div>
        {footer && (
            <div className="mt-4 flex items-center gap-2 z-10">
                <div className={`w-1 h-1 rounded-full animate-pulse ${colorClass.replace('bg-', 'bg-opacity-100 bg-')}`} />
                <p className="text-[9px] text-gray-500 font-mono tracking-widest uppercase">{footer}</p>
            </div>
        )}
    </div>
);

const NeuralTimeline: React.FC<{ tasks: AugmentedTask[] }> = ({ tasks }) => {
    const chartData = useMemo(() => {
        const days = 14;
        const data = [];
        const now = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const count = tasks.filter(t => t.createdAt.split('T')[0] === dateStr).length;
            data.push({ label: date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), count });
        }
        
        const max = Math.max(...data.map(d => d.count), 5);
        const points = data.map((d, i) => `${(i / (days - 1)) * 100},${100 - (d.count / max) * 80}`).join(' ');
        const areaPoints = `0,100 ${points} 100,100`;
        
        return { data, max, points, areaPoints };
    }, [tasks]);

    return (
        <div className="bg-[#131C1B]/40 border border-white/5 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden h-full">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Neural Flux Timeline</h5>
                    <p className="text-xs text-gray-400 mt-1">Creation density across nodes</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 font-bold uppercase tracking-widest">
                    Live Telemetry
                </div>
            </div>
            
            <div className="relative h-48 w-full mt-4">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <path d={chartData.areaPoints} fill="url(#areaGradient)" className="transition-all duration-1000 ease-in-out" />
                    <polyline
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={chartData.points}
                        className="transition-all duration-1000 ease-in-out"
                        style={{ filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))' }}
                    />
                </svg>
                
                {/* X-Axis Labels */}
                <div className="flex justify-between mt-4">
                    {chartData.data.filter((_, i) => i % 3 === 0).map((d, i) => (
                        <span key={i} className="text-[8px] font-bold text-gray-600 uppercase tracking-tighter font-mono">
                            {d.label}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

const NeuralEquilibrium: React.FC<{ data: Record<string, number>, total: number }> = ({ data, total }) => {
    const segments = useMemo(() => {
        let cumulative = 0;
        const radius = 38;
        const circumference = 2 * Math.PI * radius;
        
        return Object.entries(data).map(([label, count], i) => {
            const percentage = (count / total) * 100;
            // Add a 2px gap between segments by reducing the strokeDasharray
            const strokeDasharray = `${((percentage * circumference) / 100) - 2} ${circumference}`;
            const offset = (cumulative * circumference) / 100;
            cumulative += percentage;
            
            const colors = ['stroke-emerald-400', 'stroke-blue-400', 'stroke-purple-400', 'stroke-orange-400', 'stroke-gray-500'];
            const glowColors = ['shadow-emerald-500/20', 'shadow-blue-500/20', 'shadow-purple-500/20', 'shadow-orange-500/20', 'shadow-gray-500/20'];
            return {
                label,
                count,
                strokeDasharray,
                offset: -offset,
                color: colors[i % colors.length],
                glow: glowColors[i % glowColors.length]
            };
        });
    }, [data, total]);

    return (
        <div className="bg-[#131C1B]/40 border border-white/5 rounded-[2rem] p-8 shadow-2xl flex flex-col items-center h-full relative group">
            <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-10 w-full text-center">Status Equilibrium</h5>
            
            <div className="relative w-40 h-40 mb-10">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="rgba(255,255,255,0.02)" strokeWidth="6" />
                    {segments.map((s, i) => (
                        <circle
                            key={i}
                            cx="50" cy="50" r="38"
                            fill="transparent"
                            className={`${s.color} transition-all duration-1000 ease-out hover:stroke-white cursor-help`}
                            strokeWidth="6"
                            strokeDasharray={s.strokeDasharray}
                            strokeDashoffset={s.offset}
                            strokeLinecap="round"
                        />
                    ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold text-white tracking-tighter">{total}</span>
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Nodes</span>
                </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-x-6 gap-y-3">
                {segments.map((s, i) => (
                    <div key={i} className="flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider truncate max-w-[80px]">{s.label}</span>
                            <span className="text-[10px] font-mono text-white">{s.count}</span>
                        </div>
                        <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full ${s.color.replace('stroke', 'bg')} opacity-50`} style={{ width: `${(s.count / total) * 100}%` }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const TaskInsights: React.FC<TaskInsightsProps> = ({ tasks }) => {
    const stats = useMemo(() => {
        const total = tasks.length;
        const urgent = tasks.filter(t => t.priority === TaskPriority.URGENT).length;
        const done = tasks.filter(t => t.columnName.toLowerCase() === 'done').length;
        const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
        
        const projectCounts: Record<string, number> = {};
        const statusCounts: Record<string, number> = {};

        tasks.forEach(t => {
            projectCounts[t.projectName] = (projectCounts[t.projectName] || 0) + 1;
            statusCounts[t.columnName] = (statusCounts[t.columnName] || 0) + 1;
        });

        const peakProject = Object.entries(projectCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || 'None';

        return { total, urgent, done, completionRate, peakProject, statusCounts };
    }, [tasks]);

    if (tasks.length === 0) return null;

    return (
        <div className="space-y-8 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
            {/* Primary Command Cluster */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <InsightCard 
                    title="Neural Load" 
                    value={stats.total} 
                    icon={<LayoutDashboardIcon className="w-6 h-6" />} 
                    colorClass="bg-blue-500" 
                    footer="Active Processing Nodes"
                />
                <InsightCard 
                    title="Mesh Sync" 
                    value={`${stats.completionRate}%`} 
                    icon={<TrendingUpIcon className="w-6 h-6" />} 
                    colorClass="bg-emerald-500" 
                    footer={`${stats.done} Successful Syncs`}
                />
                <InsightCard 
                    title="High Friction" 
                    value={stats.urgent} 
                    icon={<ZapIcon className="w-6 h-6" />} 
                    colorClass="bg-orange-500" 
                    footer="Critical Path Overload"
                />
                <InsightCard 
                    title="Active Nexus" 
                    value={stats.peakProject.length > 15 ? stats.peakProject.slice(0, 15) + '...' : stats.peakProject} 
                    icon={<CheckSquareIcon className="w-6 h-6" />} 
                    colorClass="bg-purple-500" 
                    footer="Highest Activity Sector"
                />
            </div>

            {/* Neural Analytics Surface */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                <div className="lg:col-span-2">
                    <NeuralTimeline tasks={tasks} />
                </div>
                <div className="lg:col-span-1">
                    <NeuralEquilibrium data={stats.statusCounts} total={stats.total} />
                </div>
            </div>
        </div>
    );
};
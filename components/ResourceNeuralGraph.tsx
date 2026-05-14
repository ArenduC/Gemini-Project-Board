
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Project, User, Task } from '../types';
import { ZoomInIcon, ZoomOutIcon, MaximizeIcon, LayoutDashboardIcon, UsersIcon, SearchIcon, XIcon } from './Icons';
import { UserAvatar } from './UserAvatar';

interface ResourceNeuralGraphProps {
  projects: Record<string, Project>;
  users: Record<string, User>;
  onlineUsers: Set<string>;
  onTaskClick: (task: Task) => void;
}

interface Node {
    id: string;
    type: 'project' | 'user';
    label: string;
    x: number;
    y: number;
    data: any;
}

interface Edge {
    source: string;
    target: string;
    weight: number; // Based on task count
}

export const ResourceNeuralGraph: React.FC<ResourceNeuralGraphProps> = ({ projects, users, onlineUsers }) => {
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });

    const graphData = useMemo(() => {
        const nodes: Node[] = [];
        const edges: Edge[] = [];
        const projectList = Object.values(projects) as Project[];
        const userList = Object.values(users) as User[];

        const centerX = 500;
        const centerY = 500;
        const projectRadius = 250;
        const userRadius = 450;

        projectList.forEach((p, i) => {
            const angle = (i / projectList.length) * 2 * Math.PI;
            nodes.push({
                id: p.id,
                type: 'project',
                label: p.name,
                x: centerX + projectRadius * Math.cos(angle),
                y: centerY + projectRadius * Math.sin(angle),
                data: p
            });
        });

        userList.forEach((u, i) => {
            const angle = (i / userList.length) * 2 * Math.PI;
            nodes.push({
                id: u.id,
                type: 'user',
                label: u.name,
                x: centerX + userRadius * Math.cos(angle + 0.5),
                y: centerY + userRadius * Math.sin(angle + 0.5),
                data: u
            });

            projectList.forEach(p => {
                const members = p.members || [];
                if (members.includes(u.id)) {
                    const tasks = p.board?.tasks ? (Object.values(p.board.tasks) as Task[]) : [];
                    const tasksInProject = tasks.filter(t => t.assignee?.id === u.id).length;
                    edges.push({
                        source: u.id,
                        target: p.id,
                        weight: tasksInProject + 1
                    });
                }
            });
        });

        return { nodes, edges };
    }, [projects, users]);

    const filteredSearchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        return graphData.nodes.filter(n => 
            n.label.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 5);
    }, [searchQuery, graphData.nodes]);

    const highlightedNodeIds = useMemo(() => {
        if (!searchQuery.trim()) return new Set<string>();
        return new Set(graphData.nodes
            .filter(n => n.label.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(n => n.id)
        );
    }, [searchQuery, graphData.nodes]);

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(prev => Math.min(Math.max(prev * delta, 0.2), 3));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0 && !(e.target as HTMLElement).closest('.search-ui')) {
            setIsDragging(true);
            dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            setOffset({
                x: e.clientX - dragStart.current.x,
                y: e.clientY - dragStart.current.y
            });
        }
    };

    const handleMouseUp = () => setIsDragging(false);

    const resetView = () => {
        setZoom(0.7);
        setOffset({ x: 0, y: 0 });
        setSearchQuery('');
    };

    const focusOnNode = (nodeId: string) => {
        const node = graphData.nodes.find(n => n.id === nodeId);
        if (node) {
            setZoom(1.5);
            setOffset({
                x: (500 - node.x) * 1.5,
                y: (500 - node.y) * 1.5
            });
            setHoveredNode(nodeId);
            setSearchQuery(node.label);
            setIsSearchFocused(false);
            setTimeout(() => setHoveredNode(null), 3000);
        }
    };

    useEffect(() => {
        resetView();
    }, []);

    return (
        <div className="relative w-full h-full bg-[#030708] rounded-3xl overflow-hidden group">
            {/* Background Neural Grid */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#10B981 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 to-transparent pointer-events-none" />

            {/* Top Bar Controls */}
            <div className="absolute top-8 left-8 z-20 flex items-start gap-5 pointer-events-none">
                <div className="flex flex-col gap-2.5 pointer-events-auto">
                    <button onClick={() => setZoom(z => Math.min(z + 0.2, 3))} className="p-3.5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl text-gray-500 hover:text-emerald-400 hover:bg-black/60 transition-all shadow-2xl group/btn"><ZoomInIcon className="w-5 h-5 group-hover/btn:scale-110 transition-transform"/></button>
                    <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.2))} className="p-3.5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl text-gray-500 hover:text-emerald-400 hover:bg-black/60 transition-all shadow-2xl group/btn"><ZoomOutIcon className="w-5 h-5 group-hover/btn:scale-110 transition-transform"/></button>
                    <button onClick={resetView} className="p-3.5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl text-gray-500 hover:text-emerald-400 hover:bg-black/60 transition-all shadow-2xl group/btn"><MaximizeIcon className="w-5 h-5 group-hover/btn:scale-110 transition-transform"/></button>
                </div>

                {/* Mesh Search Bar */}
                <div className="relative pointer-events-auto search-ui">
                    <div className={`flex items-center bg-black/40 backdrop-blur-3xl border rounded-2xl overflow-hidden transition-all duration-500 h-12 shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] ${isSearchFocused ? 'w-80 border-emerald-500/50 ring-4 ring-emerald-500/5' : 'w-64 border-white/10'}`}>
                        <div className="pl-5 pr-2 text-gray-500">
                            <SearchIcon className="w-4 h-4" />
                        </div>
                        <input 
                            type="text"
                            value={searchQuery}
                            onFocus={() => setIsSearchFocused(true)}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="TRACE NODE..."
                            className="bg-transparent border-none focus:outline-none text-[10px] text-white w-full uppercase tracking-widest font-black placeholder:text-gray-700"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="pr-5 pl-2 text-gray-500 hover:text-white transition-colors">
                                <XIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Search Suggestions */}
                    {isSearchFocused && filteredSearchResults.length > 0 && (
                        <div className="absolute top-full left-0 mt-3 w-80 bg-[#131C1B]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                            {filteredSearchResults.map(node => (
                                <button 
                                    key={node.id}
                                    onClick={() => focusOnNode(node.id)}
                                    className="w-full px-5 py-4 text-left hover:bg-emerald-500/5 transition-all flex items-center justify-between group/item border-b border-white/5 last:border-none"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 rounded-xl bg-white/5 text-gray-500 group-hover/item:text-emerald-400 group-hover/item:bg-emerald-500/10 transition-all">
                                            {node.type === 'project' ? <LayoutDashboardIcon className="w-4 h-4" /> : <UsersIcon className="w-4 h-4" />}
                                        </div>
                                        <span className="text-[11px] font-black uppercase tracking-widest text-white group-hover/item:text-emerald-400 transition-colors truncate">{node.label}</span>
                                    </div>
                                    <span className="text-[8px] font-mono text-gray-700 group-hover/item:text-emerald-500 transition-colors uppercase">0x{node.id.slice(0,4)}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="absolute top-8 right-8 z-10 text-right select-none">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Mesh Active</span>
                </div>
                <h4 className="text-xs font-black uppercase tracking-[0.3em] text-white/40 mb-1">Topology Stream</h4>
                <p className="text-[10px] text-gray-700 font-mono uppercase tracking-widest">Nodes: {graphData.nodes.length} • Edges: {graphData.edges.length}</p>
            </div>

            {hoveredNode && (
                 <div className="absolute bottom-8 right-8 z-10 p-5 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-500 scale-105">
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-2 px-1">Neural ID Recognition</p>
                    <div className="flex items-center gap-4 px-1 pb-1">
                        <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-widest">
                            {graphData.nodes.find(n => n.id === hoveredNode)?.label}
                        </div>
                        <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">Type: {graphData.nodes.find(n => n.id === hoveredNode)?.type}</span>
                    </div>
                 </div>
            )}

            <div 
                ref={containerRef}
                className="w-full h-full cursor-grab active:cursor-grabbing"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onClick={() => setIsSearchFocused(false)}
            >
                <svg width="100%" height="100%" viewBox="0 0 1000 1000" className="transition-transform duration-75 ease-out">
                    <g style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, transformOrigin: 'center' }}>
                        <defs>
                            <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="8" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                            <filter id="edgeGlow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="4" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                            <radialGradient id="nodeGradient" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="transparent" />
                            </radialGradient>
                        </defs>

                        {/* Edges */}
                        {graphData.edges.map((edge, i) => {
                            const source = graphData.nodes.find(n => n.id === edge.source)!;
                            const target = graphData.nodes.find(n => n.id === edge.target)!;
                            const isSearchActive = searchQuery.length > 0;
                            const isHighlighted = isSearchActive && (highlightedNodeIds.has(edge.source) || highlightedNodeIds.has(edge.target));
                            const isActive = hoveredNode === edge.source || hoveredNode === edge.target;
                            
                            return (
                                <g key={i}>
                                    <line 
                                        x1={source.x} y1={source.y}
                                        x2={target.x} y2={target.y}
                                        stroke={isActive || isHighlighted ? '#10B981' : '#1E293B'}
                                        strokeWidth={edge.weight * (isActive || isHighlighted ? 2.5 : 1)}
                                        strokeOpacity={isSearchActive ? (isHighlighted ? 0.9 : 0.05) : (isActive ? 0.9 : 0.15)}
                                        className="transition-all duration-500 ease-in-out"
                                        style={{ filter: isActive || isHighlighted ? 'url(#edgeGlow)' : 'none' }}
                                    />
                                    {(isActive || isHighlighted) && (
                                        <circle r="3" fill="#10B981">
                                            <animateMotion dur="2s" repeatCount="indefinite" path={`M ${source.x} ${source.y} L ${target.x} ${target.y}`} />
                                            <filter id="particleGlow"><feGaussianBlur stdDeviation="2"/></filter>
                                        </circle>
                                    )}
                                </g>
                            );
                        })}

                        {/* Nodes */}
                        {graphData.nodes.map(node => {
                            const isProject = node.type === 'project';
                            const isSearchActive = searchQuery.length > 0;
                            const isMatch = highlightedNodeIds.has(node.id);
                            const isActive = hoveredNode === node.id;
                            const isRelated = hoveredNode && graphData.edges.some(e => 
                                (e.source === node.id && e.target === hoveredNode) || 
                                (e.target === node.id && e.source === hoveredNode)
                            );

                            // Opacity logic
                            let nodeOpacity = 1;
                            if (isSearchActive && !isMatch) nodeOpacity = 0.15;
                            if (!isSearchActive && hoveredNode && !isActive && !isRelated) nodeOpacity = 0.15;

                            return (
                                <g 
                                    key={node.id} 
                                    onMouseEnter={() => setHoveredNode(node.id)}
                                    onMouseLeave={() => setHoveredNode(null)}
                                    onClick={(e) => { e.stopPropagation(); focusOnNode(node.id); }}
                                    className="cursor-pointer transition-all duration-700"
                                    style={{ opacity: nodeOpacity }}
                                >
                                    {(isActive || isMatch) && (
                                        <circle cx={node.x} cy={node.y} r={isProject ? 60 : 50} fill="url(#nodeGradient)" />
                                    )}
                                    
                                    <circle 
                                        cx={node.x} cy={node.y} 
                                        r={isProject ? 32 : 24}
                                        fill={isProject ? '#10B981' : '#1E293B'}
                                        fillOpacity={isActive || isMatch ? 0.2 : 0.05}
                                        stroke={isActive || isMatch ? '#10B981' : isRelated ? '#34D399' : '#1E293B'}
                                        strokeWidth={isActive || isMatch ? 4 : 2}
                                        className="transition-all duration-500"
                                        style={{ filter: isActive || isMatch ? 'url(#nodeGlow)' : 'none' }}
                                    />

                                    <circle 
                                        cx={node.x} cy={node.y} 
                                        r={isProject ? 24 : 18}
                                        fill={isProject ? '#10B981' : '#1E293B'}
                                        className="transition-all duration-500"
                                    />
                                    
                                    <foreignObject x={node.x - (isProject ? 12 : 9)} y={node.y - (isProject ? 12 : 9)} width={isProject ? 24 : 18} height={isProject ? 24 : 18}>
                                        <div className={`flex items-center justify-center transition-all duration-500 ${isActive || isMatch ? 'text-black scale-110' : 'text-white/80'}`}>
                                            {isProject ? <LayoutDashboardIcon className="w-full h-full" /> : <UsersIcon className="w-full h-full" />}
                                        </div>
                                    </foreignObject>

                                    <text 
                                        x={node.x} y={node.y + (isProject ? 65 : 55)}
                                        textAnchor="middle"
                                        className={`text-[13px] font-black uppercase tracking-[0.2em] fill-white pointer-events-none transition-all duration-500 ${isActive || isMatch ? 'opacity-100' : 'opacity-20'}`}
                                        style={{ filter: isActive || isMatch ? 'drop-shadow(0 0 8px rgba(16,185,129,0.5))' : 'none' }}
                                    >
                                        {node.label}
                                    </text>
                                    
                                    {isActive && (
                                        <text 
                                            x={node.x} y={node.y - 50}
                                            textAnchor="middle"
                                            className="text-[9px] font-mono fill-emerald-500 font-bold uppercase tracking-widest animate-bounce"
                                        >
                                            Linked Node
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                    </g>
                </svg>
            </div>
        </div>
    );
};

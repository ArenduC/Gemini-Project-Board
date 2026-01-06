
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
        <div className="relative w-full h-[600px] bg-[#0D1117] rounded-xl border border-white/5 overflow-hidden group">
            {/* Top Bar Controls */}
            <div className="absolute top-6 left-6 z-20 flex items-start gap-4 pointer-events-none">
                <div className="flex flex-col gap-2 pointer-events-auto">
                    <button onClick={() => setZoom(z => Math.min(z + 0.2, 3))} className="p-3 bg-[#1C2326] border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all shadow-xl"><ZoomInIcon className="w-5 h-5"/></button>
                    <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.2))} className="p-3 bg-[#1C2326] border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all shadow-xl"><ZoomOutIcon className="w-5 h-5"/></button>
                    <button onClick={resetView} className="p-3 bg-[#1C2326] border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all shadow-xl"><MaximizeIcon className="w-5 h-5"/></button>
                </div>

                {/* Mesh Search Bar */}
                <div className="relative pointer-events-auto search-ui">
                    <div className={`flex items-center bg-[#1C2326]/80 backdrop-blur-xl border rounded-xl overflow-hidden transition-all duration-300 w-64 h-11 shadow-2xl ${isSearchFocused ? 'border-emerald-500/50 ring-4 ring-emerald-500/10' : 'border-white/10'}`}>
                        <div className="pl-4 pr-2 text-gray-500">
                            <SearchIcon className="w-4 h-4" />
                        </div>
                        <input 
                            type="text"
                            value={searchQuery}
                            onFocus={() => setIsSearchFocused(true)}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Locate node..."
                            className="bg-transparent border-none focus:outline-none text-xs text-white w-full uppercase tracking-widest font-black"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="pr-4 pl-2 text-gray-500 hover:text-white transition-colors">
                                <XIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Search Suggestions */}
                    {isSearchFocused && filteredSearchResults.length > 0 && (
                        <div className="absolute top-full left-0 mt-2 w-64 bg-[#131C1B] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                            {filteredSearchResults.map(node => (
                                <button 
                                    key={node.id}
                                    onClick={() => focusOnNode(node.id)}
                                    className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center gap-3 border-b border-white/5 last:border-none"
                                >
                                    <div className="p-1.5 rounded-lg bg-white/5 text-gray-400">
                                        {node.type === 'project' ? <LayoutDashboardIcon className="w-3 h-3" /> : <UsersIcon className="w-3 h-3" />}
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white truncate">{node.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="absolute top-6 right-6 z-10 text-right">
                <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-1">Mesh Topology</h4>
                <p className="text-[10px] text-gray-600 font-mono uppercase">Nodes: {graphData.nodes.length} • Edges: {graphData.edges.length}</p>
            </div>

            {hoveredNode && (
                 <div className="absolute bottom-6 right-6 z-10 p-4 bg-[#131C1B]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl pointer-events-none animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Neural Identification</p>
                    <p className="text-sm font-bold text-white">
                        {graphData.nodes.find(n => n.id === hoveredNode)?.label}
                    </p>
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
                                <feGaussianBlur stdDeviation="6" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                            <filter id="edgeGlow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="3" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                        </defs>

                        {/* Edges */}
                        {graphData.edges.map((edge, i) => {
                            const source = graphData.nodes.find(n => n.id === edge.source)!;
                            const target = graphData.nodes.find(n => n.id === edge.target)!;
                            const isSearchActive = searchQuery.length > 0;
                            const isHighlighted = isSearchActive && (highlightedNodeIds.has(edge.source) || highlightedNodeIds.has(edge.target));
                            const isActive = hoveredNode === edge.source || hoveredNode === edge.target;
                            
                            return (
                                <line 
                                    key={i}
                                    x1={source.x} y1={source.y}
                                    x2={target.x} y2={target.y}
                                    stroke={isActive || isHighlighted ? '#10B981' : '#374151'}
                                    strokeWidth={edge.weight * (isActive || isHighlighted ? 2 : 1)}
                                    strokeOpacity={isSearchActive ? (isHighlighted ? 0.8 : 0.05) : (isActive ? 0.8 : 0.2)}
                                    className="transition-all duration-300"
                                    style={{ filter: isActive || isHighlighted ? 'url(#edgeGlow)' : 'none' }}
                                />
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
                            if (isSearchActive && !isMatch) nodeOpacity = 0.2;
                            if (!isSearchActive && hoveredNode && !isActive && !isRelated) nodeOpacity = 0.2;

                            return (
                                <g 
                                    key={node.id} 
                                    onMouseEnter={() => setHoveredNode(node.id)}
                                    onMouseLeave={() => setHoveredNode(null)}
                                    onClick={(e) => { e.stopPropagation(); focusOnNode(node.id); }}
                                    className="cursor-pointer transition-opacity duration-300"
                                    style={{ opacity: nodeOpacity }}
                                >
                                    <circle 
                                        cx={node.x} cy={node.y} 
                                        r={isProject ? 24 : 18}
                                        fill={isProject ? '#1C2326' : '#111827'}
                                        stroke={isActive || isMatch ? '#10B981' : isRelated ? '#34D399' : '#374151'}
                                        strokeWidth={isActive || isMatch ? 3 : 2}
                                        className="transition-all duration-300"
                                        style={{ filter: isActive || isMatch ? 'url(#nodeGlow)' : 'none' }}
                                    />
                                    
                                    <foreignObject x={node.x - (isProject ? 12 : 9)} y={node.y - (isProject ? 12 : 9)} width={isProject ? 24 : 18} height={isProject ? 24 : 18}>
                                        <div className={`flex items-center justify-center transition-colors duration-300 ${isActive || isMatch ? 'text-emerald-400' : 'text-gray-500'}`}>
                                            {isProject ? <LayoutDashboardIcon className="w-full h-full" /> : <UsersIcon className="w-full h-full" />}
                                        </div>
                                    </foreignObject>

                                    <text 
                                        x={node.x} y={node.y + (isProject ? 45 : 35)}
                                        textAnchor="middle"
                                        className={`text-[12px] font-black uppercase tracking-widest fill-white pointer-events-none transition-all duration-300 ${isActive || isMatch ? 'opacity-100 scale-110' : 'opacity-40'}`}
                                        style={{ filter: isActive || isMatch ? 'drop-shadow(0 0 4px rgba(16,185,129,0.5))' : 'none' }}
                                    >
                                        {node.label}
                                    </text>
                                </g>
                            );
                        })}
                    </g>
                </svg>
            </div>
        </div>
    );
};

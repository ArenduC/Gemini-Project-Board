import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Project, User, Task } from '../types';
import { ZoomInIcon, ZoomOutIcon, MaximizeIcon, LayoutDashboardIcon, UsersIcon } from './Icons';
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

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(prev => Math.min(Math.max(prev * delta, 0.2), 3));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0) {
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
    };

    useEffect(() => {
        resetView();
    }, []);

    return (
        <div className="relative w-full h-[600px] bg-[#0D1117] rounded-xl border border-white/5 overflow-hidden group">
            <div className="absolute top-6 left-6 z-10 flex flex-col gap-2">
                <button onClick={() => setZoom(z => Math.min(z + 0.2, 3))} className="p-3 bg-[#1C2326] border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all shadow-xl"><ZoomInIcon className="w-5 h-5"/></button>
                <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.2))} className="p-3 bg-[#1C2326] border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all shadow-xl"><ZoomOutIcon className="w-5 h-5"/></button>
                <button onClick={resetView} className="p-3 bg-[#1C2326] border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all shadow-xl"><MaximizeIcon className="w-5 h-5"/></button>
            </div>

            <div className="absolute top-6 right-6 z-10 text-right">
                <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-1">Mesh Topology</h4>
                <p className="text-[10px] text-gray-600 font-mono">DRAG TO PAN • SCROLL TO ZOOM</p>
            </div>

            {hoveredNode && (
                 <div className="absolute bottom-6 right-6 z-10 p-4 bg-[#131C1B]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl pointer-events-none animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Active Element</p>
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
            >
                <svg width="100%" height="100%" viewBox="0 0 1000 1000" className="transition-transform duration-75 ease-out">
                    <g style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, transformOrigin: 'center' }}>
                        <defs>
                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="3" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                        </defs>

                        {graphData.edges.map((edge, i) => {
                            const source = graphData.nodes.find(n => n.id === edge.source)!;
                            const target = graphData.nodes.find(n => n.id === edge.target)!;
                            const isActive = hoveredNode === edge.source || hoveredNode === edge.target;
                            
                            return (
                                <line 
                                    key={i}
                                    x1={source.x} y1={source.y}
                                    x2={target.x} y2={target.y}
                                    stroke={isActive ? '#10B981' : '#374151'}
                                    strokeWidth={edge.weight * (isActive ? 1.5 : 1)}
                                    strokeOpacity={isActive ? 0.8 : 0.2}
                                    className="transition-all duration-300"
                                    style={{ filter: isActive ? 'url(#glow)' : 'none' }}
                                />
                            );
                        })}

                        {graphData.nodes.map(node => {
                            const isProject = node.type === 'project';
                            const isActive = hoveredNode === node.id;
                            const isRelated = hoveredNode && graphData.edges.some(e => 
                                (e.source === node.id && e.target === hoveredNode) || 
                                (e.target === node.id && e.source === hoveredNode)
                            );

                            return (
                                <g 
                                    key={node.id} 
                                    onMouseEnter={() => setHoveredNode(node.id)}
                                    onMouseLeave={() => setHoveredNode(null)}
                                    className="cursor-pointer"
                                >
                                    <circle 
                                        cx={node.x} cy={node.y} 
                                        r={isProject ? 24 : 18}
                                        fill={isProject ? '#1C2326' : '#111827'}
                                        stroke={isActive ? '#10B981' : isRelated ? '#34D399' : '#374151'}
                                        strokeWidth={isActive ? 3 : 2}
                                        className="transition-all duration-300"
                                    />
                                    
                                    <foreignObject x={node.x - (isProject ? 12 : 9)} y={node.y - (isProject ? 12 : 9)} width={isProject ? 24 : 18} height={isProject ? 24 : 18}>
                                        <div className="flex items-center justify-center text-gray-500">
                                            {isProject ? <LayoutDashboardIcon className="w-full h-full" /> : <UsersIcon className="w-full h-full" />}
                                        </div>
                                    </foreignObject>

                                    <text 
                                        x={node.x} y={node.y + (isProject ? 45 : 35)}
                                        textAnchor="middle"
                                        className={`text-[12px] font-bold fill-white pointer-events-none transition-opacity duration-300 ${isActive || hoveredNode === null ? 'opacity-100' : 'opacity-20'}`}
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
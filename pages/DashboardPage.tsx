import React, { useState } from 'react';
import { Project, User } from '../types';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectListRow } from '../components/ProjectListRow';
import { PlusIcon, DownloadIcon, GridIcon, ListIcon } from '../components/Icons';
import { exportTasksToCsv } from '../utils/export';

interface DashboardPageProps {
  projects: Project[];
  users: Record<string, User>;
  onlineUsers: Set<string>;
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
  onManageMembers: (projectId: string) => void;
  onShareProject: (project: Project) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ projects, users, onlineUsers, onSelectProject, onCreateProject, onManageMembers, onShareProject }) => {
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const handleExport = () => {
    exportTasksToCsv(projects, users);
  };
  
  return (
    <div>
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold text-white">Projects Dashboard</h2>
            <div className="flex items-center gap-2">
                 {/* View Toggle */}
                <div className="flex items-center p-1 bg-[#1C2326] rounded-lg">
                    <button
                        onClick={() => setView('grid')}
                        className={`p-2 rounded-md ${view === 'grid' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-800/50'}`}
                        aria-label="Grid View"
                    >
                        <GridIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setView('list')}
                        className={`p-2 rounded-md ${view === 'list' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-800/50'}`}
                        aria-label="List View"
                    >
                        <ListIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Export Button */}
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 text-white font-semibold rounded-lg shadow-sm hover:bg-gray-700 transition-all text-sm"
                >
                    <DownloadIcon className="w-4 h-4"/>
                    <span>Export</span>
                </button>

                {/* Create Project Button */}
                <button
                  onClick={onCreateProject}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-black font-semibold rounded-lg shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#1C2326] transition-all text-sm"
                >
                  <PlusIcon className="w-4 h-4" />
                  New Project
                </button>
            </div>
        </div>

        {/* Conditional Rendering */}
        {view === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {projects.map(project => (
                    <ProjectCard 
                        key={project.id} 
                        project={project} 
                        users={users}
                        onlineUsers={onlineUsers}
                        onSelect={onSelectProject}
                        onManageMembers={onManageMembers}
                        onShare={() => onShareProject(project)} 
                    />
                ))}
            </div>
        ) : (
            <div className="bg-[#131C1B] rounded-lg shadow-md border border-gray-800 overflow-hidden">
                {/* List Header */}
                 <div className="grid grid-cols-12 gap-4 items-center px-4 py-2 border-b border-gray-800 bg-[#1C2326]/50">
                    <div className="col-span-4 font-semibold text-xs uppercase tracking-wider text-gray-400">Project</div>
                    <div className="col-span-2 font-semibold text-xs uppercase tracking-wider text-gray-400">Progress</div>
                    <div className="col-span-2 font-semibold text-xs uppercase tracking-wider text-gray-400 text-center">Status</div>
                    <div className="col-span-2 font-semibold text-xs uppercase tracking-wider text-gray-400 text-right">Members</div>
                    <div className="col-span-2"></div>
                </div>
                {projects.map(project => (
                    <ProjectListRow
                        key={project.id}
                        project={project}
                        users={users}
                        onlineUsers={onlineUsers}
                        onSelect={onSelectProject}
                        onManageMembers={onManageMembers}
                        onShare={() => onShareProject(project)}
                    />
                ))}
            </div>
        )}
    </div>
  );
};
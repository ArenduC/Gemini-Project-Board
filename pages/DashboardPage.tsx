import React, { useState } from 'react';
import { Project, User, AiGeneratedProjectPlan } from '../types';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectListRow } from '../components/ProjectListRow';
import { PlusIcon, DownloadIcon, GridIcon, ListIcon, LayoutDashboardIcon } from '../components/Icons';
import { exportTasksToCsv } from '../utils/export';
import { ProjectDropzone } from '../components/ProjectDropzone';
import { ProjectConfirmationModal } from '../components/ProjectConfirmationModal';
import { generateProjectFromCsv } from '../services/geminiService';
import { Pagination } from '../components/Pagination';

interface DashboardPageProps {
  projects: Project[];
  users: Record<string, User>;
  onlineUsers: Set<string>;
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
  onManageMembers: (projectId: string) => void;
  onShareProject: (project: Project) => void;
  addProjectFromPlan: (plan: AiGeneratedProjectPlan) => Promise<void>;
}

// Empty state component
const NoProjects: React.FC<{ onCreateProject: () => void }> = ({ onCreateProject }) => (
  <div className="text-center py-20 px-6 bg-[#131C1B] rounded-xl border border-dashed border-gray-800">
    <LayoutDashboardIcon className="mx-auto h-12 w-12 text-gray-500" />
    <h3 className="mt-4 text-lg font-semibold text-white">No Projects Yet</h3>
    <p className="mt-1 text-sm text-gray-400">
      Get started by creating your first project.
    </p>
    <div className="mt-6">
      <button
        onClick={onCreateProject}
        type="button"
        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-300 text-black font-semibold rounded-lg shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#1C2326] transition-all text-sm"
      >
        <PlusIcon className="w-4 h-4" />
        Create Project
      </button>
    </div>
  </div>
);


export const DashboardPage: React.FC<DashboardPageProps> = ({ projects, users, onlineUsers, onSelectProject, onCreateProject, onManageMembers, onShareProject, addProjectFromPlan }) => {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  
  const [generatedPlan, setGeneratedPlan] = useState<AiGeneratedProjectPlan | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const totalPages = Math.ceil(projects.length / ITEMS_PER_PAGE);
  const paginatedProjects = projects.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleFileProcessed = async (csvContent: string) => {
    setIsAiProcessing(true);
    try {
        const plan = await generateProjectFromCsv(csvContent);
        setGeneratedPlan(plan);
    } catch (err) {
        const message = err instanceof Error ? err.message : "An unknown error occurred.";
        alert(`AI Error: ${message}`);
    } finally {
        setIsAiProcessing(false);
    }
  };

  const handleConfirmProjectCreation = async () => {
    if (!generatedPlan) return;
    try {
        await addProjectFromPlan(generatedPlan);
        setGeneratedPlan(null); // Close modal on success
    } catch (err) {
        const message = err instanceof Error ? err.message : "Could not create project.";
        alert(`Error: ${message}`);
    }
  };

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
        
        <ProjectDropzone onFileProcessed={handleFileProcessed} isLoading={isAiProcessing} />

        {projects.length === 0 ? (
            <NoProjects onCreateProject={onCreateProject} />
        ) : (
            <>
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
                    <div>
                        <div className="bg-[#131C1B] rounded-lg shadow-md border border-gray-800 overflow-hidden">
                            {/* List Header */}
                             <div className="grid grid-cols-12 gap-4 items-center px-4 py-2 border-b border-gray-800 bg-[#1C2326]/50">
                                <div className="col-span-4 font-semibold text-xs uppercase tracking-wider text-gray-400">Project</div>
                                <div className="col-span-2 font-semibold text-xs uppercase tracking-wider text-gray-400">Progress</div>
                                <div className="col-span-2 font-semibold text-xs uppercase tracking-wider text-gray-400 text-center">Status</div>
                                <div className="col-span-2 font-semibold text-xs uppercase tracking-wider text-gray-400 text-right">Members</div>
                                <div className="col-span-2"></div>
                            </div>
                            {paginatedProjects.map(project => (
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
                        <Pagination
                          currentPage={currentPage}
                          totalPages={totalPages}
                          onPageChange={setCurrentPage}
                          itemsPerPage={ITEMS_PER_PAGE}
                          totalItems={projects.length}
                        />
                    </div>
                )}
            </>
        )}

        {generatedPlan && (
            <ProjectConfirmationModal
                plan={generatedPlan}
                onConfirm={handleConfirmProjectCreation}
                onCancel={() => setGeneratedPlan(null)}
            />
        )}
    </div>
  );
};
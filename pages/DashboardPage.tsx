
import React from 'react';
import { Project, User } from '../types';
import { ProjectCard } from '../components/ProjectCard';
import { PlusIcon } from '../components/Icons';

interface DashboardPageProps {
  projects: Project[];
  users: Record<string, User>;
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
  onManageMembers: (projectId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ projects, users, onSelectProject, onCreateProject, onManageMembers }) => {
  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold">Projects Dashboard</h2>
            <button
              onClick={onCreateProject}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-all"
            >
              <PlusIcon className="w-5 h-5" />
              Create New Project
            </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.map(project => (
                <ProjectCard 
                    key={project.id} 
                    project={project} 
                    users={users}
                    onSelect={onSelectProject}
                    onManageMembers={onManageMembers} 
                />
            ))}
        </div>
    </div>
  );
};

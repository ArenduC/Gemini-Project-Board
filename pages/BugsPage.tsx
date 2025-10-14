import React, { useState, useMemo } from 'react';
import { Project, User, Bug, TaskPriority } from '../types';
import { BugReporter } from '../components/BugReporter';
import { LifeBuoyIcon } from '../components/Icons';

interface BugsPageProps {
  projects: Record<string, Project>;
  users: User[];
  currentUser: User;
  addBug: (projectId: string, bugData: { title: string, description: string, priority: TaskPriority }) => Promise<void>;
  updateBug: (bugId: string, updates: Partial<Bug>) => Promise<void>;
  deleteBug: (bugId: string) => Promise<void>;
  addBugsBatch: (projectId: string, fileContent: string) => Promise<void>;
  deleteBugsBatch: (bugIds: string[]) => Promise<void>;
}

export const BugsPage: React.FC<BugsPageProps> = ({
  projects,
  users,
  currentUser,
  addBug,
  updateBug,
  deleteBug,
  addBugsBatch,
  deleteBugsBatch,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // FIX: Cast Object.values to the correct type to avoid type inference issues.
  const projectList = useMemo(() => (Object.values(projects) as Project[]).sort((a, b) => a.name.localeCompare(b.name)), [projects]);

  const selectedProject = useMemo(() => {
    if (selectedProjectId && projects[selectedProjectId]) {
      return projects[selectedProjectId];
    }
    // Set a default project if one exists to provide an initial view
    if (!selectedProjectId && projectList.length > 0) {
      setSelectedProjectId(projectList[0].id);
      return projectList[0];
    }
    return null;
  }, [selectedProjectId, projects, projectList]);

  const handleAddBugForProject = (bugData: { title: string, description: string, priority: TaskPriority }) => {
    if (!selectedProject) throw new Error("A project must be selected to add a bug.");
    return addBug(selectedProject.id, bugData);
  };

  const handleAddBugsBatchForProject = (fileContent: string) => {
    if (!selectedProject) throw new Error("A project must be selected to import bugs.");
    return addBugsBatch(selectedProject.id, fileContent);
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-white">Bug Tracker</h2>
        <div>
          <label htmlFor="project-select" className="block text-sm font-medium text-gray-400 mb-1">
            Select a Project
          </label>
          <select
            id="project-select"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 border border-gray-800 rounded-lg bg-[#131C1B] text-white focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
          >
            <option value="">-- View Bugs For --</option>
            {projectList.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedProject ? (
        <BugReporter
          project={selectedProject}
          users={users}
          currentUser={currentUser}
          onAddBug={handleAddBugForProject}
          onUpdateBug={updateBug}
          onDeleteBug={deleteBug}
          onAddBugsBatch={handleAddBugsBatchForProject}
          onDeleteBugsBatch={deleteBugsBatch}
        />
      ) : (
        <div className="text-center py-20 px-6 bg-[#131C1B] rounded-xl border border-dashed border-gray-800">
          <LifeBuoyIcon className="mx-auto h-12 w-12 text-gray-500" />
          <h3 className="mt-4 text-lg font-semibold text-white">{projectList.length > 0 ? 'Select a Project' : 'No Projects Found'}</h3>
          <p className="mt-1 text-sm text-gray-400">
            {projectList.length > 0 ? 'Please choose a project from the dropdown above to view and manage its bugs.' : 'You need to create a project before you can track bugs.'}
          </p>
        </div>
      )}
    </div>
  );
};
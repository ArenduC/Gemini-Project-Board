import React, { useState, useMemo } from 'react';
import { Project, User, Bug, TaskPriority, BugResponse } from '../types';
import { BugReporter } from '../components/BugReporter';
import { LifeBuoyIcon } from '../components/Icons';

interface BugsPageProps {
  projects: Record<string, Project>;
  users: User[];
  currentUser: User;
  addBug: (projectId: string, bugData: { title: string, description: string, priority: TaskPriority }) => Promise<void>;
  updateBug: (bugId: string, updates: Partial<Bug>) => Promise<void>;
  deleteBug: (bugId: string) => Promise<void>;
  addBugsBatch: (projectId: string, bugs: BugResponse[]) => Promise<void>;
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

  const handleAddBugsBatchForProject = (bugs: BugResponse[]) => {
    if (!selectedProject) throw new Error("A project must be selected to import bugs.");
    return addBugsBatch(selectedProject.id, bugs);
  };

  return (
    <div className="animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Bug <span className="text-gray-500">Tracker</span></h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5 font-black">Anomaly Detection & Management</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-grow sm:flex-grow-0 group">
             <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <LifeBuoyIcon className="w-3.5 h-3.5 text-gray-500 group-focus-within:text-emerald-500 transition-colors" />
             </div>
              <select
                id="project-select"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-8 py-2 bg-white/5 border border-white/5 rounded-xl text-white focus:outline-none focus:border-emerald-500/30 focus:bg-white/[0.08] text-[10px] uppercase font-black tracking-widest appearance-none transition-all cursor-pointer"
              >
                <option value="">-- VIEW PROJECT ANOMALIES --</option>
                {projectList.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name.toUpperCase()}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
              </div>
          </div>
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
        <div className="text-center py-24 bg-[#131C1B]/40 rounded-3xl border border-dashed border-white/5 transition-all hover:bg-white/[0.02]">
          <LifeBuoyIcon className="mx-auto h-16 w-16 text-gray-800 mb-4" />
          <h3 className="text-lg font-black text-white uppercase tracking-[0.2em]">Select Target Node</h3>
          <p className="mt-2 text-[10px] text-gray-500 uppercase tracking-widest max-w-sm mx-auto font-medium">
            {projectList.length > 0 ? 'Choose a project to synchronize its anomaly reporting stream.' : 'No active projects detected in the neural array.'}
          </p>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { Project, User, Task, CalendarEvent } from '../types';
import { CalendarIcon } from '../components/Icons';
import { CalendarView } from '../components/CalendarView';

interface CalendarPageProps {
  projects: Record<string, Project>;
  currentUser: User;
  onTaskClick: (task: Task) => void;
  addCalendarEvent: (eventData: Omit<CalendarEvent, 'id' | 'createdAt'>) => Promise<void>;
  updateCalendarEvent: (eventId: string, updates: Partial<CalendarEvent>) => Promise<void>;
  deleteCalendarEvent: (eventId: string) => Promise<void>;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({ projects, currentUser, onTaskClick, addCalendarEvent, updateCalendarEvent, deleteCalendarEvent }) => {
  // FIX: Cast Object.values to the correct type to avoid type inference issues.
  const projectList = useMemo(() => (Object.values(projects) as Project[]).sort((a, b) => a.name.localeCompare(b.name)), [projects]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectList[0]?.id || '');

  const selectedProject = projects[selectedProjectId];
  
  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-white">Calendar</h2>
        <div>
          <label htmlFor="project-select" className="block text-sm font-medium text-gray-400 mb-1">
            Showing calendar for
          </label>
          <select
            id="project-select"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 border border-gray-800 rounded-lg bg-[#131C1B] text-white focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
          >
            {projectList.length > 0 ? (
                projectList.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
            ) : (
                <option value="">No projects found</option>
            )}
          </select>
        </div>
      </div>

      {selectedProject ? (
        <CalendarView
          project={selectedProject}
          currentUser={currentUser}
          onTaskClick={onTaskClick}
          onAddEvent={addCalendarEvent}
          onUpdateEvent={updateCalendarEvent}
          onDeleteEvent={deleteCalendarEvent}
        />
      ) : (
        <div className="text-center py-20 px-6 bg-[#131C1B] rounded-xl border border-dashed border-gray-800">
          <CalendarIcon className="mx-auto h-12 w-12 text-gray-500" />
          <h3 className="mt-4 text-lg font-semibold text-white">
            {projectList.length > 0 ? 'Select a Project' : 'No Projects to Display'}
          </h3>
          <p className="mt-1 text-sm text-gray-400">
             {projectList.length > 0 ? 'Please choose a project from the dropdown to view its calendar.' : 'Create a project to start using the calendar feature.'}
          </p>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo, useEffect } from 'react';
import { Project, User, AugmentedTask, Task, FilterSegment } from '../types';
import { DownloadIcon } from '../components/Icons';
import { exportAugmentedTasksToCsv } from '../utils/export';
import { TaskListRow } from '../components/TaskListRow';
import { Filters } from '../components/Filters';

interface TasksPageProps {
  projects: Record<string, Project>;
  users: Record<string, User>;
  currentUser: User;
  onTaskClick: (task: Task) => void;
}

export const TasksPage: React.FC<TasksPageProps> = ({ projects, users, currentUser, onTaskClick }) => {
  const [viewMode, setViewMode] = useState<'all' | 'my'>('all');
  
  // Filtering state
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [segments, setSegments] = useState<FilterSegment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>('all');

  const storageKey = 'tasks-page-segments';

  useEffect(() => {
    try {
      const savedSegments = localStorage.getItem(storageKey);
      if (savedSegments) {
        setSegments(JSON.parse(savedSegments));
      }
    } catch (error) {
      console.error("Failed to load filter segments from localStorage", error);
    }
  }, [storageKey]);

  const saveSegmentsToStorage = (updatedSegments: FilterSegment[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedSegments));
    } catch (error) {
      console.error("Failed to save filter segments to localStorage", error);
    }
  };

  const handleAddSegment = (name: string) => {
    if (!name.trim()) return;

    const newSegment: FilterSegment = {
      id: Date.now().toString(),
      name: name.trim(),
      filters: { searchTerm, priorityFilter, assigneeFilter, statusFilter },
    };
    const updatedSegments = [...segments, newSegment];
    setSegments(updatedSegments);
    saveSegmentsToStorage(updatedSegments);
    setActiveSegmentId(newSegment.id);
  };

  const handleDeleteSegment = (segmentId: string) => {
    const updatedSegments = segments.filter(s => s.id !== segmentId);
    setSegments(updatedSegments);
    saveSegmentsToStorage(updatedSegments);
    if (activeSegmentId === segmentId) {
      handleClearFilters();
    }
  };

  const handleApplySegment = (segmentId: string | null) => {
    setActiveSegmentId(segmentId);
    if (segmentId === 'all' || segmentId === null) {
      setSearchTerm('');
      setPriorityFilter('');
      setAssigneeFilter('');
      setStatusFilter('');
    } else {
      const segment = segments.find(s => s.id === segmentId);
      if (segment) {
        setSearchTerm(segment.filters.searchTerm || '');
        setPriorityFilter(segment.filters.priorityFilter || '');
        setAssigneeFilter(segment.filters.assigneeFilter || '');
        setStatusFilter(segment.filters.statusFilter || '');
      }
    }
  };
  
  const handleClearFilters = () => {
    handleApplySegment('all');
  };

  const allTasks = useMemo((): AugmentedTask[] => {
    return Object.values(projects).flatMap(project =>
      Object.values(project.board.tasks).map(task => {
        const column = Object.values(project.board.columns).find(c => c.taskIds.includes(task.id));
        return {
          ...task,
          projectId: project.id,
          projectName: project.name,
          columnId: column?.id || '',
          columnName: column?.title || 'Uncategorized',
        };
      })
    );
  }, [projects]);

  const uniqueAssignees = useMemo(() => {
    const assignees = allTasks
      .map(task => task.assignee?.name)
      .filter((name): name is string => !!name);
    return [...new Set(assignees)];
  }, [allTasks]);

  const allStatuses = useMemo(() => {
    const statusSet = new Set<string>();
    Object.values(projects).forEach(project => {
      Object.values(project.board.columns).forEach(column => {
        statusSet.add(column.title);
      });
    });
    return Array.from(statusSet).sort();
  }, [projects]);


  const filteredTasks = useMemo(() => {
    let tasks = allTasks;
    if (viewMode === 'my') {
      tasks = tasks.filter(task => task.assignee?.id === currentUser.id);
    }
    
    if (searchTerm) {
      tasks = tasks.filter(task => 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (priorityFilter) {
      tasks = tasks.filter(task => task.priority === priorityFilter);
    }

    if (assigneeFilter) {
      tasks = tasks.filter(task => task.assignee?.name === assigneeFilter);
    }

    if (statusFilter) {
        tasks = tasks.filter(task => task.columnName === statusFilter);
    }

    return tasks;
  }, [allTasks, viewMode, currentUser.id, searchTerm, priorityFilter, assigneeFilter, statusFilter]);
  
  const handleExport = () => {
    exportAugmentedTasksToCsv(filteredTasks, users);
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold">Tasks</h2>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center p-1 bg-gray-200 dark:bg-gray-800 rounded-lg">
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md ${viewMode === 'all' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'hover:bg-white/50 dark:hover:bg-gray-700/50'}`}
            >
              All Tasks
            </button>
            <button
              onClick={() => setViewMode('my')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md ${viewMode === 'my' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'hover:bg-white/50 dark:hover:bg-gray-700/50'}`}
            >
              My Tasks
            </button>
          </div>
          {/* Export Button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-sm"
          >
            <DownloadIcon className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>
      
      <div className="mb-6">
        <Filters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
            assigneeFilter={assigneeFilter}
            setAssigneeFilter={setAssigneeFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            assignees={uniqueAssignees}
            statuses={allStatuses}
            segments={segments}
            activeSegmentId={activeSegmentId}
            currentFilters={{ searchTerm, priorityFilter, assigneeFilter, statusFilter }}
            onAddSegment={handleAddSegment}
            onDeleteSegment={handleDeleteSegment}
            onApplySegment={handleApplySegment}
            onClearFilters={handleClearFilters}
          />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* List Header */}
        <div className="grid grid-cols-12 gap-4 items-center px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800/50">
          <div className="col-span-4 font-semibold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Task</div>
          <div className="col-span-2 font-semibold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Project</div>
          <div className="col-span-2 font-semibold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Priority</div>
          <div className="col-span-2 font-semibold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</div>
          <div className="col-span-2 font-semibold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">Assignee</div>
        </div>
        {filteredTasks.length > 0 ? (
            filteredTasks.map(task => (
                <TaskListRow
                    key={task.id}
                    task={task}
                    onClick={onTaskClick}
                    users={users}
                />
            ))
        ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No tasks found for this view.
            </div>
        )}
      </div>
    </div>
  );
};
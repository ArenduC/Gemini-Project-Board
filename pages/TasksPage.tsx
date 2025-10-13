import React, { useState, useMemo, useEffect } from 'react';
// FIX: Import `Column` type to be used in casting.
import { Project, User, AugmentedTask, Task, FilterSegment, Column } from '../types';
import { DownloadIcon } from '../components/Icons';
import { exportAugmentedTasksToCsv } from '../utils/export';
import { TaskListRow } from '../components/TaskListRow';
import { Filters } from '../components/Filters';
import { Pagination } from '../components/Pagination';

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
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

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
    // FIX: Cast Object.values to the correct type to avoid type inference issues.
    return (Object.values(projects) as Project[]).flatMap(project =>
      // FIX: Cast Object.values to the correct type to avoid type inference issues.
      (Object.values(project.board.tasks) as Task[]).map(task => {
        // FIX: Cast Object.values to the correct type to avoid type inference issues.
        const column = (Object.values(project.board.columns) as Column[]).find(c => c.taskIds.includes(task.id));
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
    // FIX: Cast Object.values to the correct type to avoid type inference issues.
    (Object.values(projects) as Project[]).forEach(project => {
      // FIX: Cast Object.values to the correct type to avoid type inference issues.
      (Object.values(project.board.columns) as Column[]).forEach(column => {
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
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredTasks.length]);

  const totalPages = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE);
  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );


  const handleExport = () => {
    exportAugmentedTasksToCsv(filteredTasks, users);
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-white">Tasks</h2>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center p-1 bg-[#1C2326] rounded-lg">
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md ${viewMode === 'all' ? 'bg-gray-700 text-white shadow-sm' : 'hover:bg-gray-800/50 text-white'}`}
            >
              All Tasks
            </button>
            <button
              onClick={() => setViewMode('my')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md ${viewMode === 'my' ? 'bg-gray-700 text-white shadow-sm' : 'hover:bg-gray-800/50 text-white'}`}
            >
              My Tasks
            </button>
          </div>
          {/* Export Button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 text-white font-semibold rounded-lg shadow-sm hover:bg-gray-700 transition-all text-sm"
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

      <div className="bg-[#131C1B] rounded-lg shadow-md border border-gray-800 overflow-hidden">
        {/* List Header */}
        <div className="grid grid-cols-12 gap-4 items-center px-4 py-2 border-b border-gray-800 bg-[#1C2326]/50">
          <div className="col-span-4 font-semibold text-xs uppercase tracking-wider text-gray-400">Task</div>
          <div className="col-span-2 font-semibold text-xs uppercase tracking-wider text-gray-400">Project</div>
          <div className="col-span-2 font-semibold text-xs uppercase tracking-wider text-gray-400">Priority</div>
          <div className="col-span-2 font-semibold text-xs uppercase tracking-wider text-gray-400">Status</div>
          <div className="col-span-2 font-semibold text-xs uppercase tracking-wider text-gray-400 text-right">Assignee</div>
        </div>
        {paginatedTasks.length > 0 ? (
            paginatedTasks.map(task => (
                <TaskListRow
                    key={task.id}
                    task={task}
                    onClick={onTaskClick}
                    users={users}
                />
            ))
        ) : (
            <div className="p-8 text-center text-gray-400">
                No tasks found for this view.
            </div>
        )}
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        itemsPerPage={ITEMS_PER_PAGE}
        totalItems={filteredTasks.length}
      />
    </div>
  );
};

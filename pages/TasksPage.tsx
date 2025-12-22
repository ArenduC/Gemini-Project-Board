import React, { useState, useMemo, useEffect } from 'react';
import { Project, User, AugmentedTask, Task, FilterSegment, Column, Sprint } from '../types';
import { DownloadIcon } from '../components/Icons';
import { exportAugmentedTasksToCsv } from '../utils/export';
import { TaskListRow } from '../components/TaskListRow';
import { Filters } from '../components/Filters';
import { Pagination } from '../components/Pagination';
import { TaskInsights } from '../components/TaskInsights';

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
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [sprintFilter, setSprintFilter] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [relativeTimeValue, setRelativeTimeValue] = useState('');
  const [relativeTimeUnit, setRelativeTimeUnit] = useState<FilterSegment['filters']['relativeTimeUnit']>('hours');
  const [relativeTimeCondition, setRelativeTimeCondition] = useState<FilterSegment['filters']['relativeTimeCondition']>('within');
  const [segments, setSegments] = useState<FilterSegment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>('all');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

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

  const handleAddSegment = async (name: string, filters: FilterSegment['filters']) => {
    if (!name.trim()) return;

    const newSegment: FilterSegment = {
      id: Date.now().toString(),
      name: name.trim(),
      projectId: "global", 
      creatorId: currentUser.id,
      filters: filters,
    };
    const updatedSegments = [...segments, newSegment];
    setSegments(updatedSegments);
    saveSegmentsToStorage(updatedSegments);
    setActiveSegmentId(newSegment.id);
  };

  const handleDeleteSegment = async (segmentId: string) => {
    const updatedSegments = segments.filter(s => s.id !== segmentId);
    setSegments(updatedSegments);
    saveSegmentsToStorage(updatedSegments);
    if (activeSegmentId === segmentId) {
      handleClearFilters();
    }
  };

  const handleUpdateSegment = async (segmentId: string, updates: { name?: string, filters?: FilterSegment['filters'] }) => {
      const updatedSegments = segments.map(s => {
          if (s.id === segmentId) {
              return {
                  ...s,
                  name: updates.name ?? s.name,
                  filters: updates.filters ?? s.filters,
              };
          }
          return s;
      });
      setSegments(updatedSegments);
      saveSegmentsToStorage(updatedSegments);
  };

  const handleApplySegment = (segmentId: string | null) => {
    setActiveSegmentId(segmentId);
    if (segmentId === 'all' || segmentId === null) {
      setSearchTerm('');
      setPriorityFilter([]);
      setAssigneeFilter([]);
      setStatusFilter([]);
      setTagFilter([]);
      setSprintFilter([]);
      setStartDate('');
      setEndDate('');
      setRelativeTimeValue('');
      setRelativeTimeUnit('hours');
      setRelativeTimeCondition('within');
    } else {
      const segment = segments.find(s => s.id === segmentId);
      if (segment) {
        setSearchTerm(segment.filters.searchTerm || '');
        setPriorityFilter(segment.filters.priorityFilter || []);
        setAssigneeFilter(segment.filters.assigneeFilter || []);
        setStatusFilter(segment.filters.statusFilter || []);
        setTagFilter(segment.filters.tagFilter || []);
        setSprintFilter(segment.filters.sprintFilter || []);
        setStartDate(segment.filters.startDate || '');
        setEndDate(segment.filters.endDate || '');
        setRelativeTimeValue(segment.filters.relativeTimeValue || '');
        setRelativeTimeUnit(segment.filters.relativeTimeUnit || 'hours');
        setRelativeTimeCondition(segment.filters.relativeTimeCondition || 'within');
      }
    }
  };
  
  const handleClearFilters = () => {
    handleApplySegment('all');
  };

  const allTasks = useMemo((): AugmentedTask[] => {
    return (Object.values(projects) as Project[]).flatMap(project =>
      (Object.values(project.board.tasks) as Task[]).map(task => {
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
    (Object.values(projects) as Project[]).forEach(project => {
      (Object.values(project.board.columns) as Column[]).forEach(column => {
        statusSet.add(column.title);
      });
    });
    return Array.from(statusSet).sort();
  }, [projects]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    allTasks.forEach(task => {
        task.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [allTasks]);

  const allSprints = useMemo((): Sprint[] => {
    const sprints: Sprint[] = [];
    const sprintIds = new Set<string>();
    (Object.values(projects) as Project[]).forEach(project => {
        (project.sprints || []).forEach(sprint => {
            if (!sprintIds.has(sprint.id)) {
                sprints.push(sprint);
                sprintIds.add(sprint.id);
            }
        });
    });
    return sprints;
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

    if (priorityFilter.length > 0) {
      tasks = tasks.filter(task => priorityFilter.includes(task.priority));
    }

    if (assigneeFilter.length > 0) {
      tasks = tasks.filter(task => assigneeFilter.includes(task.assignee?.name || ''));
    }

    if (statusFilter.length > 0) {
        tasks = tasks.filter(task => statusFilter.includes(task.columnName));
    }

    if (tagFilter.length > 0) {
      tasks = tasks.filter(task => task.tags.some(tag => tagFilter.includes(tag)));
    }

    if (sprintFilter.length > 0) {
      tasks = tasks.filter(task => task.sprintId ? sprintFilter.includes(task.sprintId) : false);
    }

    if (startDate) {
      const start = new Date(startDate).setHours(0, 0, 0, 0);
      tasks = tasks.filter(task => new Date(task.createdAt).getTime() >= start);
    }
    if (endDate) {
      const end = new Date(endDate).setHours(23, 59, 59, 999);
      tasks = tasks.filter(task => new Date(task.createdAt).getTime() <= end);
    }
    
    if (relativeTimeValue && parseInt(relativeTimeValue, 10) > 0) {
        const now = new Date();
        const cutoff = new Date();
        const value = parseInt(relativeTimeValue, 10);

        switch(relativeTimeUnit) {
            case 'seconds': cutoff.setSeconds(now.getSeconds() - value); break;
            case 'minutes': cutoff.setMinutes(now.getMinutes() - value); break;
            case 'hours': cutoff.setHours(now.getHours() - value); break;
            case 'days': cutoff.setDate(now.getDate() - value); break;
            case 'months': cutoff.setMonth(now.getMonth() - value); break;
            case 'years': cutoff.setFullYear(now.getFullYear() - value); break;
        }
        
        if (relativeTimeCondition === 'within') {
            tasks = tasks.filter(task => new Date(task.createdAt).getTime() >= cutoff.getTime());
        } else { 
            tasks = tasks.filter(task => new Date(task.createdAt).getTime() < cutoff.getTime());
        }
    }

    return tasks;
  }, [allTasks, viewMode, currentUser.id, searchTerm, priorityFilter, assigneeFilter, statusFilter, tagFilter, sprintFilter, startDate, endDate, relativeTimeValue, relativeTimeUnit, relativeTimeCondition]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredTasks.length]);

  const totalPages = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE);
  const paginatedTasks = filteredTasks.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleExport = () => {
    exportAugmentedTasksToCsv(filteredTasks, users);
  };

  return (
    <div className="max-w-[1500px] mx-auto pb-12">
      <TaskInsights tasks={filteredTasks} />

      <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
        <h2 className="text-lg font-bold text-white">Neural Nodes</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-[#1C2326] rounded-lg">
            <button onClick={() => setViewMode('all')} className={`px-2.5 py-1 text-[10px] font-bold rounded-md ${viewMode === 'all' ? 'bg-gray-700 text-white' : 'hover:bg-gray-800/50 text-gray-400'}`}>
              Global
            </button>
            <button onClick={() => setViewMode('my')} className={`px-2.5 py-1 text-[10px] font-bold rounded-md ${viewMode === 'my' ? 'bg-gray-700 text-white' : 'hover:bg-gray-800/50 text-gray-400'}`}>
              Personal
            </button>
          </div>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 border border-gray-700 text-white font-bold rounded-lg hover:bg-gray-700 transition-all text-[10px]">
            <DownloadIcon className="w-3.5 h-3.5" /> <span>Export</span>
          </button>
        </div>
      </div>
      
      <div className="mb-4">
        <Filters
            projectId="all-tasks"
            currentUser={currentUser}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
            assigneeFilter={assigneeFilter}
            setAssigneeFilter={setAssigneeFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            tagFilter={tagFilter}
            setTagFilter={setTagFilter}
            sprintFilter={sprintFilter}
            setSprintFilter={setSprintFilter}
            sprints={allSprints}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            relativeTimeValue={relativeTimeValue}
            setRelativeTimeValue={setRelativeTimeValue}
            relativeTimeUnit={relativeTimeUnit}
            setRelativeTimeUnit={setRelativeTimeUnit}
            relativeTimeCondition={relativeTimeCondition}
            setRelativeTimeCondition={setRelativeTimeCondition}
            assignees={uniqueAssignees}
            statuses={allStatuses}
            tags={allTags}
            segments={segments}
            activeSegmentId={activeSegmentId}
            onAddSegment={handleAddSegment}
            onUpdateSegment={handleUpdateSegment}
            onDeleteSegment={handleDeleteSegment}
            onApplySegment={handleApplySegment}
            onClearFilters={handleClearFilters}
          />
      </div>

      <div className="bg-[#131C1B]/80 backdrop-blur-xl rounded-xl border border-white/5 overflow-hidden shadow-2xl">
        <div className="grid grid-cols-12 gap-4 items-center px-5 py-2.5 border-b border-white/5 bg-white/5">
          <div className="col-span-4 font-bold text-[9px] uppercase tracking-[0.2em] text-gray-500">Node Cluster</div>
          <div className="col-span-2 font-bold text-[9px] uppercase tracking-[0.2em] text-gray-500">Project Nexus</div>
          <div className="col-span-2 font-bold text-[9px] uppercase tracking-[0.2em] text-gray-500">Priority</div>
          <div className="col-span-2 font-bold text-[9px] uppercase tracking-[0.2em] text-gray-500">Status</div>
          <div className="col-span-2 font-bold text-[9px] uppercase tracking-[0.2em] text-gray-500 text-right">Resource</div>
        </div>
        <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
            {paginatedTasks.length > 0 ? (
                paginatedTasks.map(task => (
                    <TaskListRow key={task.id} task={task} onClick={onTaskClick} users={users} />
                ))
            ) : (
                <div className="p-16 text-center text-gray-500 font-mono text-xs italic">
                    NO NEURAL TASKS FOUND IN SCOPE
                </div>
            )}
        </div>
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={ITEMS_PER_PAGE} totalItems={filteredTasks.length} />
    </div>
  );
};
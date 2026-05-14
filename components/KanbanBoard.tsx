
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { DragDropContext, Draggable, DropResult } from 'react-beautiful-dnd';
import { StrictModeDroppable } from './StrictModeDroppable';
import { Column as ColumnType, BoardData, Task, Subtask, User, ChatMessage, FilterSegment, Project, Bug, TaskPriority, AiGeneratedTaskFromFile, Sprint, BugResponse, NewTaskData } from '../types';
import { Column } from './Column';
import { Filters } from './Filters';
import { PlusIcon, LayoutDashboardIcon, GitBranchIcon, TableIcon, LifeBuoyIcon, RocketIcon, DownloadIcon, XIcon, SparklesIcon, ZapIcon, LinkIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';
import { ProjectChat } from './ProjectChat';
import { AiTaskCreator } from './AiTaskCreator';
import { TaskGraphView } from './TaskGraphView';
import { ProjectLinksManager } from './ProjectLinksManager';
import { TaskTableView } from './TaskTableView';
import { BugReporter } from './BugReporter';
import { ResourceMeshModal } from './ResourceMeshModal';
import { Pagination } from './Pagination';
import { TaskImportDropzone } from './TaskImportDropzone';
import { generateTasksFromFile } from '../services/geminiService';
import { TaskConfirmationModal } from './TaskConfirmationModal';
import { SprintsPage } from './SprintsPage';
import { BulkActionsBar } from './BulkActionsBar';
import { UserAvatar } from './UserAvatar';
import { BulkUpdateSprintModal } from './BulkUpdateSprintModal';
import { CompleteSprintModal } from './CompleteSprintModal';
import { CreateTaskModal } from './CreateTaskModal';
import { exportAugmentedTasksToCsv } from '../utils/export';
import { AugmentedTask } from '../types';
import { useConfirmation } from '../App';


interface KanbanBoardProps {
  project: Project;
  currentUser: User;
  users: User[];
  onlineUsers: Set<string>;
  aiFeaturesEnabled: boolean;
  onDragEnd: (result: DropResult, filteredData?: BoardData) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  addSubtasks: (taskId: string, subtasks: Partial<Subtask>[], creatorId: string) => Promise<void>;
  addComment: (taskId: string, commentText: string) => Promise<void>;
  addAiTask: (prompt: string) => Promise<void>;
  addTask: (taskData: NewTaskData) => Promise<void>;
  deleteTask: (taskId: string, columnId: string) => Promise<void>;
  addColumn: (title: string) => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;
  isChatOpen: boolean;
  onCloseChat: () => void;
  chatMessages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  onTaskClick: (task: Task) => void;
  addProjectLink: (title: string, url: string) => Promise<void>;
  deleteProjectLink: (linkId: string) => Promise<void>;
  addBug: (projectId: string, bugData: { title: string, description: string, priority: TaskPriority }) => Promise<void>;
  updateBug: (bugId: string, updates: Partial<Bug>) => Promise<void>;
  deleteBug: (bugId: string) => Promise<void>;
  addBugsBatch: (bugs: BugResponse[]) => Promise<void>;
  deleteBugsBatch: (bugIds: string[]) => Promise<void>;
  addTasksBatch: (tasks: AiGeneratedTaskFromFile[], sprintId: string | null) => Promise<void>;
  addSprint: (sprintData: Omit<Sprint, 'id' | 'projectId' | 'createdAt' | 'status' | 'isDefault'> & { isDefault?: boolean }) => Promise<Sprint>;
  updateSprint: (sprintId: string, updates: Partial<Sprint>) => Promise<void>;
  deleteSprint: (sprintId: string) => Promise<void>;
  bulkUpdateTaskSprint: (taskIds: string[], sprintId: string | null) => Promise<void>;
  completeSprint: (sprintId: string, moveToSprintId: string | null) => Promise<void>;
  addFilterSegment: (name: string, filters: FilterSegment['filters']) => Promise<void>;
  updateFilterSegment: (segmentId: string, updates: { name?: string, filters?: FilterSegment['filters'] }) => Promise<void>;
  deleteFilterSegment: (segmentId: string) => Promise<void>;
}

const AddColumn: React.FC<{onAddColumn: (title: string) => void}> = ({ onAddColumn }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const handleSubmit = () => {
    if (title.trim()) {
      onAddColumn(title.trim());
      setTitle('');
      setIsEditing(false);
    }
  };
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isEditing &&
        formRef.current &&
        !formRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsEditing(false);
        setTitle('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing]);


  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsEditing(true)}
        className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all h-9"
      >
        <PlusIcon className="w-3.5 h-3.5" />
        Column
      </button>
      {isEditing && (
        <div ref={formRef} className="absolute top-full right-0 mt-2 p-3 bg-[#131C1B] border border-gray-800 rounded-xl shadow-2xl z-50 w-64">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Enter column title..."
            className="w-full p-2 border border-gray-700 rounded-lg bg-[#1C2326] focus:outline-none focus:ring-2 focus:ring-gray-500 text-white text-xs"
          />
          <div className="mt-2 flex items-center gap-2">
            <button onClick={handleSubmit} className="flex-grow py-1.5 bg-gray-300 text-black font-bold rounded-lg text-[10px] uppercase tracking-wider hover:bg-gray-400">Add</button>
            <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-gray-500 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

const SelectHeadersModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  headers: string[];
  onConfirm: (selectedHeaders: string[]) => void;
}> = ({ isOpen, onClose, headers, onConfirm }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const handleToggle = (header: string) => {
    setSelected(prev => {
      const newSet = new Set(prev);
      if (newSet.has(header)) {
        newSet.delete(header);
      } else {
        newSet.add(header);
      }
      return newSet;
    });
  };

  const handleSubmit = () => {
    onConfirm(Array.from(selected));
  };
  
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#131C1B] rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">Select Columns to Import</h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-800"><XIcon className="w-6 h-6" /></button>
        </header>
        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <p className="text-sm text-gray-400 mb-4">Choose which columns from your CSV to include in each task's description.</p>
          <div className="space-y-2">
            {headers.map((header, index) => (
              <label key={index} className="flex items-center gap-3 p-2 bg-gray-800/50 rounded-md cursor-pointer hover:bg-gray-800">
                <input type="checkbox" checked={selected.has(header)} onChange={() => handleToggle(header)} className="w-4 h-4 rounded text-gray-500 bg-gray-700 border-gray-600 focus:ring-gray-500" />
                <span className="text-sm text-white">{header}</span>
              </label>
            ))}
          </div>
        </div>
        <footer className="p-4 bg-[#1C2326]/50 rounded-b-xl flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600">Cancel</button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-gray-300 text-black font-semibold rounded-lg hover:bg-gray-400 flex items-center gap-2">
            Continue
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
};

const viewOptions = [
  { id: 'board', label: 'Board', icon: LayoutDashboardIcon },
  { id: 'table', label: 'Table', icon: TableIcon },
  { id: 'graph', label: 'Graph', icon: GitBranchIcon },
  { id: 'bugs', label: 'Bugs', icon: LifeBuoyIcon },
  { id: 'sprints', label: 'Sprints', icon: RocketIcon },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ 
    project, currentUser, users, onlineUsers, aiFeaturesEnabled, onDragEnd, 
    updateTask, addSubtasks, addComment, addAiTask, addTask, deleteTask, addColumn, 
    deleteColumn, isChatOpen, onCloseChat, chatMessages, onSendMessage, onTaskClick, 
    addProjectLink, deleteProjectLink, addBug, updateBug, deleteBug, addBugsBatch, deleteBugsBatch,
    addTasksBatch, addSprint, updateSprint, deleteSprint, bulkUpdateTaskSprint, completeSprint,
    addFilterSegment, updateFilterSegment, deleteFilterSegment
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);
  const [reporterFilter, setReporterFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [sprintFilter, setSprintFilter] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [relativeTimeValue, setRelativeTimeValue] = useState('');
  const [relativeTimeUnit, setRelativeTimeUnit] = useState<FilterSegment['filters']['relativeTimeUnit']>('hours');
  const [relativeTimeCondition, setRelativeTimeCondition] = useState<FilterSegment['filters']['relativeTimeCondition']>('within');
  
  const [projectView, setProjectView] = useState<'board' | 'table' | 'graph' | 'bugs' | 'sprints'>('board');
  const [tableCurrentPage, setTableCurrentPage] = useState(1);
  const TABLE_ITEMS_PER_PAGE = 15;
  
  const [initialBugSearch, setInitialBugSearch] = useState<string>('');

  const [activeSegmentId, setActiveSegmentId] = useState<string | null>('all');
  const [isResourceMeshModalOpen, setIsResourceMeshModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const boardData = project.board;
  const requestConfirmation = useConfirmation();

  const filteredBoardData: BoardData = useMemo(() => {
    const defaultBoard: BoardData = { tasks: {}, columns: {}, columnOrder: [] };
    if (!boardData?.tasks || !boardData?.columns) return defaultBoard;

    const taskIdToColumnIdMap = new Map<string, string>();
    const columns = boardData.columns || {};
    for (const column of Object.values(columns) as ColumnType[]) {
        if (column?.taskIds) {
            for (const taskId of column.taskIds) {
                taskIdToColumnIdMap.set(taskId, column.id);
            }
        }
    }

    const tasks = Object.values(boardData.tasks || {}) as Task[];
    let filteredTasks = tasks;

    if (searchTerm) {
      filteredTasks = filteredTasks.filter(task => 
        task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (priorityFilter.length > 0) {
      filteredTasks = filteredTasks.filter(task => priorityFilter.includes(task.priority));
    }

    if (assigneeFilter.length > 0) {
      filteredTasks = filteredTasks.filter(task => task.assignee?.id ? assigneeFilter.includes(task.assignee.id) : false);
    }

    if (reporterFilter.length > 0) {
      filteredTasks = filteredTasks.filter(task => reporterFilter.includes(task.creatorId));
    }
    
    if (statusFilter.length > 0) {
        filteredTasks = filteredTasks.filter(task => {
            const columnId = taskIdToColumnIdMap.get(task.id);
            if (!columnId) return false;
            const column = boardData.columns[columnId];
            return column && statusFilter.includes(column.title);
        });
    }

    if (tagFilter.length > 0) {
        filteredTasks = filteredTasks.filter(task => 
            task.tags && task.tags.some(tag => tagFilter.includes(tag))
        );
    }
    
    if (sprintFilter.length > 0) {
        filteredTasks = filteredTasks.filter(task => task.sprintId && sprintFilter.includes(task.sprintId));
    }

    if (startDate || endDate || relativeTimeValue) {
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        
        filteredTasks = filteredTasks.filter(task => {
            if (!task.updatedAt) return false;
            const taskDate = new Date(task.updatedAt);
            
            if (relativeTimeValue) {
                const now = new Date();
                const relativeNum = parseInt(relativeTimeValue);
                if (isNaN(relativeNum)) return true;
                
                let ms = 0;
                if (relativeTimeUnit === 'hours') ms = relativeNum * 3600000;
                else if (relativeTimeUnit === 'days') ms = relativeNum * 86400000;
                else if (relativeTimeUnit === 'months') ms = relativeNum * 2592000000;
                else if (relativeTimeUnit === 'years') ms = relativeNum * 31536000000;
                
                const boundary = new Date(now.getTime() - ms);
                if (relativeTimeCondition === 'within') return taskDate >= boundary;
                return taskDate < boundary;
            }

            if (start && taskDate < start) return false;
            if (end && taskDate > end) return false;
            return true;
        });
    }

    // Sort tasks within columns if needed, but here we rebuild the board
    const newTasks: Record<string, Task> = {};
    filteredTasks.forEach(task => {
        newTasks[task.id] = task;
    });

    const newColumns: Record<string, ColumnType> = {};
    const filteredTaskIds = new Set(filteredTasks.map(t => t.id));

    boardData.columnOrder.forEach(colId => {
        const col = boardData.columns[colId];
        newColumns[colId] = {
            ...col,
            taskIds: col.taskIds.filter(tid => filteredTaskIds.has(tid))
        };
    });

    return {
        ...boardData,
        tasks: newTasks,
        columns: newColumns
    };
  }, [boardData, searchTerm, priorityFilter, assigneeFilter, reporterFilter, statusFilter, tagFilter, sprintFilter, startDate, endDate, relativeTimeValue, relativeTimeUnit, relativeTimeCondition]);

  // FIX: Explicitly filter users to only those who are members of this project
  const projectMembers = useMemo(() => {
    return (project.members || []).map(id => users.find(u => u.id === id)).filter((u): u is User => !!u);
  }, [project.members, users]);

  const uniqueReporters = useMemo(() => {
    const tasks = boardData?.tasks ? Object.values(boardData.tasks) as Task[] : [];
    const creatorIds = Array.from(new Set(tasks.map(t => t.creatorId)));
    return creatorIds
      .map(id => users.find(u => u.id === id))
      .filter((u): u is User => !!u);
  }, [boardData?.tasks, users]);

  const handleDragEnd = useCallback((result: DropResult) => {
    onDragEnd(result, filteredBoardData);
  }, [onDragEnd, filteredBoardData]);
  const [copiedViewId, setCopiedViewId] = useState<string | null>(null);
  
  const [tasksToConfirm, setTasksToConfirm] = useState<AiGeneratedTaskFromFile[] | null>(null);
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isBulkSprintModalOpen, setBulkSprintModalOpen] = useState(false);
  const [isCompleteSprintModalOpen, setCompleteSprintModalOpen] = useState(false);
  const [sprintToComplete, setSprintToComplete] = useState<Sprint | null>(null);

  const [isSelectHeadersModalOpen, setIsSelectHeadersModalOpen] = useState(false);
  const [headersToSelect, setHeadersToSelect] = useState<string[]>([]);
  const [fileForProcessing, setFileForProcessing] = useState<{ content: string; mimeType: string; name: string; } | null>(null);
  
  // Bug specific triggers
  const [bugTrigger, setBugTrigger] = useState<{ type: 'create' | 'import' | 'export' | null }>({ type: null });

  // Modals state
  const [isAiNexusOpen, setIsAiNexusOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  
  const handleNavigateToBug = (bugNumber: string) => {
    setProjectView('bugs');
    setInitialBugSearch(bugNumber);
    onCloseChat();
  };

  const handleSetProjectView = (view: 'board' | 'table' | 'graph' | 'bugs' | 'sprints') => {
    if (view !== 'bugs') {
      setInitialBugSearch('');
    }
    setProjectView(view);
  };
  
  const applySegmentFilters = useCallback((segment: FilterSegment) => {
    setSearchTerm(segment.filters.searchTerm || '');
    setPriorityFilter(segment.filters.priorityFilter || []);
    setAssigneeFilter(segment.filters.assigneeFilter || []);
    setReporterFilter(segment.filters.reporterFilter || []);
    setStatusFilter(segment.filters.statusFilter || []);
    setTagFilter(segment.filters.tagFilter || []);
    setSprintFilter(segment.filters.sprintFilter || []);
    setStartDate(segment.filters.startDate || '');
    setEndDate(segment.filters.endDate || '');
    setRelativeTimeValue(segment.filters.relativeTimeValue || '');
    setRelativeTimeUnit(segment.filters.relativeTimeUnit || 'hours');
    setRelativeTimeCondition(segment.filters.relativeTimeCondition || 'within');
  }, []);

  // Handle shareable view links
  useEffect(() => {
    const hash = window.location.hash;
    const urlParams = new URLSearchParams(hash.split('?')[1]);
    const viewId = urlParams.get('view');

    if (viewId) {
        const segment = (project.filterSegments || []).find(s => s.id === viewId);
        if (segment) {
            applySegmentFilters(segment);
            setActiveSegmentId(segment.id);
        }
    }
  }, [project.filterSegments, applySegmentFilters]); 
  
  // Reset page when filters change
  useEffect(() => {
    setTableCurrentPage(1);
  }, [searchTerm, priorityFilter, assigneeFilter, statusFilter, tagFilter, sprintFilter, startDate, endDate, relativeTimeValue, relativeTimeUnit, relativeTimeCondition]);

  const handleApplySegment = (segmentId: string | null) => {
      setActiveSegmentId(segmentId);
      
      // Update URL hash to reflect the active view for sharing
      const currentPath = window.location.hash.split('?')[0];
      if (segmentId && segmentId !== 'all') {
          window.location.hash = `${currentPath}?view=${segmentId}`;
      } else {
          window.location.hash = currentPath;
      }

      if (segmentId === 'all' || segmentId === null) {
          setSearchTerm('');
          setPriorityFilter([]);
          setAssigneeFilter([]);
          setReporterFilter([]);
          setStatusFilter([]);
          setTagFilter([]);
          setSprintFilter([]);
          setStartDate('');
          setEndDate('');
          setRelativeTimeValue('');
          setRelativeTimeUnit('hours');
          setRelativeTimeCondition('within');
      } else {
          const segment = (project.filterSegments || []).find(s => s.id === segmentId);
          if (segment) {
            if (segment.name.toUpperCase() === 'NEURAL RESOURCE MESH') {
              setIsResourceMeshModalOpen(true);
              return;
            }
            applySegmentFilters(segment)
          }
      }
  };

  const handleCopyViewLink = (e: React.MouseEvent, segmentId: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}${window.location.hash}`;
    navigator.clipboard.writeText(url);
    setCopiedViewId(segmentId);
    setTimeout(() => setCopiedViewId(null), 2000);
  };

  const handleClearFilters = () => {
    handleApplySegment('all');
  }

  const handleDeleteSegmentConfirmation = (segment: FilterSegment) => {
    requestConfirmation({
        title: 'Delete Saved View',
        message: <>Are you sure you want to delete the saved view <strong>"{segment.name}"</strong>? This cannot be undone.</>,
        onConfirm: async () => {
            await deleteFilterSegment(segment.id);
            if (activeSegmentId === segment.id) {
                handleApplySegment('all');
            }
        },
        confirmText: 'Delete',
    });
  };

  const processFileWithAI = async (fileData: { content: string; mimeType: string }, headersToInclude: string[]) => {
    setIsAiParsing(true);
    try {
        const columnNames = project.board.columnOrder.map(id => project.board.columns[id]?.title || 'Unknown');
        const tasks = await generateTasksFromFile(fileData, columnNames, headersToInclude);
        if (tasks && tasks.length > 0) {
            setTasksToConfirm(tasks);
        } else {
            alert("AI could not find any tasks in the provided file.");
        }
    } catch (err) {
        alert(`AI Error: ${err instanceof Error ? err.message : "An unknown error occurred."}`);
    } finally {
        setIsAiParsing(false);
    }
  };

  const handleFileSelectedForImport = (fileData: { content: string; mimeType: string; name: string }) => {
    const isCsv = fileData.mimeType === 'text/csv' || fileData.name.toLowerCase().endsWith('.csv');

    if (isCsv && fileData.content) {
        try {
            const firstLine = fileData.content.split('\n')[0];
            const headers = firstLine.split(',').map(h => h.trim().replace(/"/g, ''));
            
            if (headers.length > 0 && headers[0]) {
                setHeadersToSelect(headers);
                setFileForProcessing(fileData);
                setIsSelectHeadersModalOpen(true);
                return;
            }
        } catch (e) {
            console.error("Could not parse headers from CSV file, processing as plain text.", e);
        }
    }
    
    processFileWithAI(fileData, []);
  };

  const handleConfirmTaskCreation = async (sprintId: string | null) => {
    if (!tasksToConfirm) return;
    await addTasksBatch(tasksToConfirm, sprintId);
    setTasksToConfirm(null); 
  };

  const handleTaskSelect = (task: Task, e?: React.MouseEvent) => {
    if (e?.ctrlKey || e?.metaKey) {
        setSelectedTaskIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(task.id)) {
                newSet.delete(task.id);
            } else {
                newSet.add(task.id);
            }
            return newSet;
        });
    } else {
        onTaskClick(task);
    }
  };

  const handleBulkUpdateSprint = async (sprintId: string | null) => {
    if (selectedTaskIds.size === 0) return;
    await bulkUpdateTaskSprint(Array.from(selectedTaskIds), sprintId);
    setSelectedTaskIds(new Set());
  };

  const handleOpenCompleteSprint = (sprint: Sprint) => {
    setSprintToComplete(sprint);
    setCompleteSprintModalOpen(true);
  };

  const handleConfirmCompleteSprint = async (moveToSprintId: string | null) => {
    if (!sprintToComplete) return;
    await completeSprint(sprintToComplete.id, moveToSprintId);
    setCompleteSprintModalOpen(false);
    setSprintToComplete(null);
  };

  const uniqueAssignees = useMemo(() => {
      if (!boardData?.tasks) return [];
      const assignees = (Object.values(boardData.tasks || {}) as Task[])
          .map(task => task.assignee)
          .filter((u): u is User => !!u);
      
      const unique = new Map<string, User>();
      assignees.forEach(u => unique.set(u.id, u));
      return Array.from(unique.values());
  }, [boardData?.tasks]);

  const uniqueStatuses = useMemo(() => {
      if (!boardData?.columns) return [];
      return [...new Set((Object.values(boardData.columns || {}) as ColumnType[]).map(c => c.title).filter(Boolean))];
  }, [boardData?.columns]);

  const uniqueTags = useMemo(() => {
    if (!boardData?.tasks) return [];
    const tags = new Set<string>();
    (Object.values(boardData.tasks || {}) as Task[]).forEach(task => {
        task.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [boardData?.tasks]);

  const filteredTasksForTable = useMemo(() => {
    if (!filteredBoardData?.columnOrder || !filteredBoardData?.columns || !filteredBoardData?.tasks) return [];
    return filteredBoardData.columnOrder.flatMap(columnId => {
        const column = filteredBoardData.columns[columnId];
        if (!column) return [];
        return column.taskIds.map(taskId => filteredBoardData.tasks[taskId]).filter(Boolean);
    });
  }, [filteredBoardData]);

  const tableTotalPages = Math.ceil(filteredTasksForTable.length / TABLE_ITEMS_PER_PAGE);
  const paginatedTasksForTable = filteredTasksForTable.slice(
    (tableCurrentPage - 1) * TABLE_ITEMS_PER_PAGE,
    tableCurrentPage * TABLE_ITEMS_PER_PAGE
  );

  const handleExport = () => {
    const augmentedTasks: AugmentedTask[] = filteredTasksForTable.map(task => {
        const columnsArray = project.board?.columns ? (Object.values(project.board.columns) as ColumnType[]) : [];
        const column = columnsArray.find(c => c.taskIds.includes(task.id));
        return {
            ...task,
            projectId: project.id,
            projectName: project.name,
            columnId: column?.id || '',
            columnName: column?.title || 'Uncategorized',
        };
    });

    const usersRecord = users.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
    }, {} as Record<string, User>);

    exportAugmentedTasksToCsv(augmentedTasks, usersRecord);
  };
  
  const currentFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (priorityFilter.length > 0) count++;
    if (assigneeFilter.length > 0) count++;
    if (reporterFilter.length > 0) count++;
    if (statusFilter.length > 0) count++;
    if (tagFilter.length > 0) count++;
    if (sprintFilter.length > 0) count++;
    if (startDate || endDate) count++;
    if (relativeTimeValue) count++;
    return count;
  }, [searchTerm, priorityFilter, assigneeFilter, statusFilter, tagFilter, sprintFilter, startDate, endDate, relativeTimeValue]);

  const activeBugsCount = useMemo(() => Object.keys(project.bugs || {}).length, [project.bugs]);

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Neural Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarCollapsed ? 80 : 288 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden lg:flex lg:fixed lg:left-6 lg:top-24 lg:bottom-6 flex-shrink-0 flex-col space-y-6 overflow-y-auto no-scrollbar z-20"
      >
        {/* Collapse Toggle */}
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-4 w-6 h-6 bg-emerald-500 text-black rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-30 border-none"
        >
          {isSidebarCollapsed ? <ChevronRightIcon className="w-3.5 h-3.5" /> : <ChevronLeftIcon className="w-3.5 h-3.5" />}
        </button>

        {/* View Switcher Sidebar Section */}
        <div className={`bg-[#1C2326]/50 backdrop-blur-sm border border-white/5 rounded-2xl flex-grow space-y-6 shadow-2xl transition-all flex flex-col ${isSidebarCollapsed ? 'p-2' : 'p-4'}`}>
          <div className="space-y-4">
            {!isSidebarCollapsed && <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 px-1">Navigation</h3>}
            <div className="space-y-2">
              {viewOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => handleSetProjectView(option.id)}
                  title={isSidebarCollapsed ? option.label : undefined}
                  className={`w-full relative flex items-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all group ${
                    isSidebarCollapsed ? 'justify-center h-12 w-12 mx-auto' : 'gap-3 px-3 py-2.5'
                  } ${
                    projectView === option.id 
                      ? 'bg-white text-black shadow-lg shadow-white/10' 
                      : 'text-gray-500 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <option.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${projectView === option.id ? 'text-black' : 'text-gray-500'}`} />
                  {!isSidebarCollapsed && <span className="flex-grow text-left">{option.label}</span>}
                  {option.id === 'bugs' && activeBugsCount > 0 && (
                      <span className={`bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md min-w-[15px] text-center ${isSidebarCollapsed ? 'absolute -top-1 -right-1 shadow-lg' : ''}`}>
                          {activeBugsCount}
                      </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className={`space-y-4 pt-4 border-t border-white/5 flex flex-col ${isSidebarCollapsed ? 'items-center' : ''}`}>
            {!isSidebarCollapsed && <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 px-1">Health Matrix</h3>}
            <div className={`grid gap-2 w-full ${isSidebarCollapsed ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <div className={`bg-white/5 rounded-xl border border-white/5 text-center flex flex-col items-center justify-center ${isSidebarCollapsed ? 'h-12 w-12 mx-auto' : 'p-3'}`}>
                  <p className="text-[7px] font-black text-gray-500 uppercase tracking-widest mb-0.5">{isSidebarCollapsed ? 'ITM' : 'Items'}</p>
                  <p className={`${isSidebarCollapsed ? 'text-[10px]' : 'text-sm'} font-black text-white`}>{Object.keys(project?.board?.tasks || {}).length}</p>
                </div>
                <div className={`bg-white/5 rounded-xl border border-white/5 text-center flex flex-col items-center justify-center ${isSidebarCollapsed ? 'h-12 w-12 mx-auto' : 'p-3'}`}>
                  <p className="text-[7px] font-black text-gray-500 uppercase tracking-widest mb-0.5">{isSidebarCollapsed ? 'BUG' : 'Bugs'}</p>
                  <p className={`${isSidebarCollapsed ? 'text-[10px]' : 'text-sm'} font-black text-white`}>{Object.keys(project.bugs || {}).length}</p>
                </div>
            </div>

            
            {!isSidebarCollapsed && (
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Active Velocity</span>
                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">88%</span>
                  </div>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ width: '88%' }}></div>
                  </div>
              </div>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t border-white/5">
            {!isSidebarCollapsed && <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 px-1">Network Hub</h3>}
            <button 
              onClick={() => setIsResourceMeshModalOpen(true)}
              title={isSidebarCollapsed ? "Resource Mesh" : undefined}
              className={`w-full flex items-center bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/20 transition-all group ${
                isSidebarCollapsed ? 'justify-center h-12' : 'gap-3 px-3 py-3'
              }`}
            >
              <ZapIcon className="w-5 h-5 animate-pulse" />
              {!isSidebarCollapsed && (
                <>
                  <span className="flex-grow text-left">Resource Mesh</span>
                  <span className="bg-emerald-500/20 text-emerald-400 text-[8px] font-black px-1.5 py-0.5 rounded-md min-w-[15px] text-center">
                      {project.links.length}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Mobile Sidebar (Fixed) */}
      <aside className="lg:hidden w-full flex-shrink-0 space-y-6 mb-6">
        <div className="bg-[#1C2326]/50 backdrop-blur-sm border border-white/5 rounded-2xl p-4 space-y-6">
          <div className="flex overflow-x-auto no-scrollbar gap-2">
              {viewOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => handleSetProjectView(option.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex-shrink-0 ${
                    projectView === option.id 
                      ? 'bg-white text-black shadow-lg shadow-white/10' 
                      : 'text-gray-500 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <option.icon className="w-3.5 h-3.5" />
                  {option.label}
                </button>
              ))}
          </div>
        </div>
      </aside>

      {/* Main content stage */}
      <motion.div 
        animate={{ 
          marginLeft: isSidebarCollapsed ? 112 : 336 
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="flex-grow min-w-0 w-full space-y-6"
      >
        {/* Row 1: Segment Tabs */}
        {!['bugs', 'sprints'].includes(projectView) && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 px-1">
            <button 
              onClick={() => handleApplySegment('all')} 
              className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.15em] rounded-full transition-all flex-shrink-0 ${activeSegmentId === 'all' ? 'bg-white text-black shadow-lg shadow-white/5' : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300'}`}
            >
              All Scope
            </button>
            {(project.filterSegments || []).map(segment => (
              <div key={segment.id} className="relative group flex-shrink-0">
                  <button 
                    onClick={() => handleApplySegment(segment.id)} 
                    className={`pl-3 ${activeSegmentId === segment.id ? 'pr-12' : 'pr-3'} py-1.5 text-[9px] font-black uppercase tracking-[0.15em] rounded-full transition-all ${activeSegmentId === segment.id ? 'bg-white text-black shadow-lg shadow-white/5' : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300'}`}
                  >
                    {segment.name}
                  </button>
                  {activeSegmentId === segment.id && (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                        <button 
                            onClick={(e) => handleCopyViewLink(e, segment.id)}
                            className="w-4 h-4 flex items-center justify-center text-black hover:text-emerald-600 transition-colors"
                            title="Copy shareable link"
                        >
                            {copiedViewId === segment.id ? <CheckIcon className="w-2.5 h-2.5" /> : <LinkIcon className="w-2.5 h-2.5" />}
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteSegmentConfirmation(segment); }}
                            className="w-4 h-4 flex items-center justify-center text-black hover:text-red-600 transition-colors"
                            title="Delete view"
                        >
                            <XIcon className="w-2.5 h-2.5" />
                        </button>
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}

        {/* Row 2: Unified Neural Control Bar */}
        <div className="bg-[#131C1B]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-2 flex flex-wrap items-center justify-between gap-3 shadow-2xl relative z-40">
          <div className="flex-grow flex items-center gap-3 min-w-0">
            {projectView === 'bugs' ? (
                <div className="flex items-center gap-2 px-3 h-8">
                    <LifeBuoyIcon className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Bug Tracker</h3>
                    <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md min-w-[18px] text-center animate-pulse">
                        {activeBugsCount}
                    </span>
                </div>
            ) : !['bugs', 'sprints'].includes(projectView) ? (
              <Filters
                projectId={project.id}
                currentUser={currentUser}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                priorityFilter={priorityFilter}
                setPriorityFilter={setPriorityFilter}
                assigneeFilter={assigneeFilter}
                setAssigneeFilter={setAssigneeFilter}
                reporterFilter={reporterFilter}
                setReporterFilter={setReporterFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                tagFilter={tagFilter}
                setTagFilter={setTagFilter}
                sprintFilter={sprintFilter}
                setSprintFilter={setSprintFilter}
                sprints={project.sprints || []}
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
                assigneeOptions={uniqueAssignees.map(u => ({ value: u.id, label: u.name }))}
                reporterOptions={uniqueReporters.map(u => ({ value: u.id, label: u.name }))}
                statuses={uniqueStatuses}
                tags={uniqueTags}
                segments={project.filterSegments}
                activeSegmentId={activeSegmentId}
                onAddSegment={addFilterSegment}
                onUpdateSegment={updateFilterSegment}
                onDeleteSegment={deleteFilterSegment}
                onApplySegment={handleApplySegment}
                onClearFilters={handleClearFilters}
              />
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {projectView === 'bugs' ? (

                <>
                  <button
                    onClick={() => setBugTrigger({ type: 'export' })}
                    className="flex items-center justify-center w-9 h-9 bg-white/5 border border-white/5 text-gray-500 rounded-xl hover:bg-white/10 hover:text-white transition-all shadow-xl"
                    title="Export bugs"
                  >
                    <DownloadIcon className="w-3.5 h-3.5" />
                  </button>
                  {aiFeaturesEnabled && (
                    <button
                        onClick={() => setBugTrigger({ type: 'import' })}
                        className="flex items-center gap-2 px-3 h-9 bg-white/5 border border-white/5 text-gray-400 rounded-xl hover:bg-white/10 hover:text-white transition-all shadow-xl text-[9px] font-black uppercase tracking-widest"
                    >
                        <SparklesIcon className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="hidden sm:inline">Import</span>
                    </button>
                  )}
                  <button
                    onClick={() => setBugTrigger({ type: 'create' })}
                    className="flex items-center gap-2 px-4 h-9 bg-white text-black rounded-xl hover:bg-gray-200 transition-all shadow-xl shadow-white/5 text-[9px] font-black uppercase tracking-widest"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Report Bug</span>
                  </button>
                </>
              ) : !['bugs', 'sprints'].includes(projectView) && (
                <>
                  <button
                    onClick={() => setIsCreateTaskOpen(true)}
                    className="flex items-center gap-2 px-4 h-9 bg-white text-black rounded-xl hover:bg-gray-200 transition-all shadow-xl shadow-white/5 text-[9px] font-black uppercase tracking-widest"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">New Task</span>
                  </button>

                  {aiFeaturesEnabled && (
                    <button
                        onClick={() => setIsAiNexusOpen(true)}
                        className="group flex items-center gap-2 px-3 h-9 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/20 transition-all shadow-xl text-[9px] font-black uppercase tracking-widest overflow-hidden relative"
                    >
                        <SparklesIcon className="w-3.5 h-3.5 animate-pulse" />
                        <span className="relative z-10 hidden sm:inline">Neural Nexus</span>
                        <span className="relative z-10 sm:hidden">AI</span>
                    </button>
                  )}
                  
                  <button
                    onClick={handleExport}
                    className="flex items-center justify-center w-9 h-9 bg-white/5 border border-white/5 text-gray-500 rounded-xl hover:bg-white/10 hover:text-white transition-all shadow-xl"
                    title="Export tasks"
                  >
                    <DownloadIcon className="w-3.5 h-3.5" />
                  </button>
                  
                  {projectView === 'board' && (
                    <AddColumn onAddColumn={addColumn} />
                  )}
                </>
              )}
            </div>
          </div>
        
          {projectView === 'bugs' ? (
            <BugReporter
                project={project}
                users={users}
                currentUser={currentUser}
                onAddBug={(bugData) => addBug(project.id, bugData)}
                onUpdateBug={updateBug}
                onDeleteBug={deleteBug}
                onAddBugsBatch={addBugsBatch}
                onDeleteBugsBatch={deleteBugsBatch}
                initialSearchTerm={initialBugSearch}
                trigger={bugTrigger}
                aiFeaturesEnabled={aiFeaturesEnabled}
                onTriggerComplete={() => setBugTrigger({ type: null })}
                hideReportButton={true}
            />
          ) : projectView === 'sprints' ? (
        <SprintsPage
            project={project}
            onAddSprint={addSprint}
            onUpdateSprint={updateSprint}
            onDeleteSprint={deleteSprint}
            onCompleteSprint={handleOpenCompleteSprint}
        />
      ) : projectView === 'board' ? (
        <DragDropContext onDragEnd={handleDragEnd}>
        <StrictModeDroppable droppableId="all-columns" direction="horizontal" type="column">
            {(provided) => (
                    <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="flex gap-6 items-start pb-4 -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto no-scrollbar"
                    >
                        {filteredBoardData.columnOrder.map((columnId, index) => {
                            const column = filteredBoardData.columns[columnId];
                            if (!column) return null;
                            const tasks = column.taskIds.map((taskId) => filteredBoardData.tasks[taskId]).filter(Boolean);
                            return (
                                <Draggable draggableId={column.id} index={index} key={column.id}>
                                    {(provided) => (
                                        <div 
                                            {...provided.draggableProps} 
                                            ref={provided.innerRef}
                                            className="w-72 flex-shrink-0"
                                        >
                                            <Column 
                                                column={column} 
                                                tasks={tasks}
                                                sprints={project.sprints}
                                                users={users}
                                                onlineUsers={onlineUsers}
                                                selectedTaskIds={selectedTaskIds}
                                                onTaskClick={handleTaskSelect}
                                                deleteTask={deleteTask}
                                                deleteColumn={deleteColumn}
                                                dragHandleProps={provided.dragHandleProps}
                                            />
                                        </div>
                                    )}
                                </Draggable>
                            );
                        })}
                        {provided.placeholder}
                    </div>
                )}
            </StrictModeDroppable>
        </DragDropContext>
      ) : projectView === 'table' ? (
        <>
          <TaskTableView
              project={project}
              tasks={paginatedTasksForTable}
              users={users}
              onUpdateTask={updateTask}
              onDragEnd={onDragEnd}
              onTaskClick={onTaskClick}
          />
           <Pagination
              currentPage={tableCurrentPage}
              totalPages={tableTotalPages}
              onPageChange={setTableCurrentPage}
              itemsPerPage={TABLE_ITEMS_PER_PAGE}
              totalItems={filteredTasksForTable.length}
          />
        </>
      ) : (
        <TaskGraphView boardData={filteredBoardData} users={users} onTaskClick={onTaskClick} />
      )}
      </motion.div>
    </div>
      
       {isChatOpen && (
        <ProjectChat 
            project={project}
            users={users}
            messages={chatMessages}
            currentUser={currentUser}
            onlineUsers={onlineUsers}
            onClose={onCloseChat}
            onSendMessage={onSendMessage}
            onNavigateToBug={handleNavigateToBug}
        />
      )}

      {isResourceMeshModalOpen && (
        <ResourceMeshModal
          isOpen={isResourceMeshModalOpen}
          onClose={() => setIsResourceMeshModalOpen(false)}
          projects={{ [project.id]: project }}
          users={users}
          onlineUsers={onlineUsers}
          onTaskClick={onTaskClick}
          onAddTask={() => {
            setIsResourceMeshModalOpen(false);
            setIsCreateTaskOpen(true);
          }}
          addProjectLink={addProjectLink}
          deleteProjectLink={deleteProjectLink}
        />
      )}

      {/* Neural Nexus AI Control Sidebar */}
      {isAiNexusOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto" onClick={() => setIsAiNexusOpen(false)} />
            <div className="absolute top-0 right-0 h-full w-full max-w-md bg-[#131C1B]/95 backdrop-blur-2xl border-l border-white/5 shadow-2xl pointer-events-auto flex flex-col transform transition-transform duration-500 ease-in-out">
                <header className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                            <SparklesIcon className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Neural Nexus</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                <p className="text-[9px] font-mono text-emerald-500/70 uppercase tracking-widest">System Latency: 4ms</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setIsAiNexusOpen(false)} className="p-2.5 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-all">
                        <XIcon className="w-6 h-6" />
                    </button>
                </header>

                <div className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-10">
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <ZapIcon className="w-4 h-4 text-emerald-400" />
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Generative Logic</h4>
                        </div>
                        <p className="text-xs text-gray-500 mb-4 leading-relaxed font-medium">Describe a complex node cluster or simple task. Gemini will synthesize the requirements into your workflow.</p>
                        <AiTaskCreator onGenerateTask={async (prompt) => { await addAiTask(prompt); setIsAiNexusOpen(false); }} />
                    </section>

                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <LayoutDashboardIcon className="w-4 h-4 text-emerald-400" />
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Mesh Import</h4>
                        </div>
                        <p className="text-xs text-gray-500 mb-4 leading-relaxed font-medium">Upload external data arrays (.csv, .txt, .pdf, .doc). Neural parsing will map content to project columns.</p>
                        <TaskImportDropzone onFileProcessed={(fd) => { handleFileSelectedForImport(fd); setIsAiNexusOpen(false); }} isLoading={isAiParsing} />
                    </section>

                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Core Capabilities</p>
                        <ul className="space-y-2">
                            {['Contextual reasoning', 'Automatic prioritization', 'Semantic column mapping', 'Subtask expansion'].map(cap => (
                                <li key={cap} className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500/50" />
                                    {cap}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <footer className="p-6 border-t border-white/5 text-center">
                    <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest italic">Authorized Session | User: {currentUser.name?.split(' ')[0] || 'Unknown'}</p>
                </footer>
            </div>
        </div>
      )}

      {isCreateTaskOpen && (
        <CreateTaskModal 
          columns={Object.values(project?.board?.columns || {})} 
          users={projectMembers} 
          sprints={project.sprints} 
          onClose={() => setIsCreateTaskOpen(false)} 
          onAddTask={addTask} 
          onAddSprint={addSprint} 
        />
      )}

      {isSelectHeadersModalOpen && fileForProcessing && (
          <SelectHeadersModal
              isOpen={isSelectHeadersModalOpen}
              headers={headersToSelect}
              onClose={() => setIsSelectHeadersModalOpen(false)}
              onConfirm={(selectedHeaders) => {
                  setIsSelectHeadersModalOpen(false);
                  processFileWithAI(fileForProcessing, selectedHeaders);
              }}
          />
      )}
      {tasksToConfirm && (
        <TaskConfirmationModal
            tasks={tasksToConfirm}
            sprints={project.sprints}
            onConfirm={handleConfirmTaskCreation}
            onCancel={() => setTasksToConfirm(null)}
        />
      )}
      {selectedTaskIds.size > 0 && (
        <BulkActionsBar
            selectedCount={selectedTaskIds.size}
            onClear={() => setSelectedTaskIds(new Set())}
            onChangeSprint={() => setBulkSprintModalOpen(true)}
        />
      )}
      <BulkUpdateSprintModal
        isOpen={isBulkSprintModalOpen}
        onClose={() => setBulkSprintModalOpen(false)}
        sprints={project.sprints}
        onConfirm={handleBulkUpdateSprint}
        taskCount={selectedTaskIds.size}
      />
      {sprintToComplete && (
          <CompleteSprintModal
            isOpen={isCompleteSprintModalOpen}
            onClose={() => { setCompleteSprintModalOpen(false); setSprintToComplete(null); }}
            sprint={sprintToComplete}
            projectTasks={Object.values(project?.board?.tasks || {})}
            projectColumns={project?.board?.columns || {}}
            projectSprints={project.sprints}
            onConfirm={handleConfirmCompleteSprint}
          />
      )}
    </>
  );
};

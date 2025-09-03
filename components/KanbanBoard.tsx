
import React, { useState, useMemo, useEffect } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import { Column as ColumnType, BoardData, Task, Subtask, User, ChatMessage, FilterSegment } from '../types';
import { Column } from './Column';
import { Filters } from './Filters';
import { PlusIcon, LayoutDashboardIcon, GitBranchIcon } from './Icons';
import { ProjectChat } from './ProjectChat';
import { AiTaskCreator } from './AiTaskCreator';
import { TaskGraphView } from './TaskGraphView';

interface KanbanBoardProps {
  projectId: string;
  boardData: BoardData;
  currentUser: User;
  users: User[];
  onDragEnd: (result: DropResult) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  addSubtasks: (taskId: string, subtasks: { title: string }[], creatorId: string) => Promise<void>;
  addComment: (taskId: string, commentText: string) => Promise<void>;
  addAiTask: (prompt: string) => Promise<void>;
  deleteTask: (taskId: string, columnId: string) => Promise<void>;
  addColumn: (title: string) => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;
  isChatOpen: boolean;
  onCloseChat: () => void;
  chatMessages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  onTaskClick: (task: Task) => void;
}

const AddColumn: React.FC<{onAddColumn: (title: string) => void}> = ({ onAddColumn }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');

  const handleSubmit = () => {
    if (title.trim()) {
      onAddColumn(title.trim());
      setTitle('');
      setIsEditing(false);
    }
  };

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="w-full flex items-center justify-start gap-2 p-3 rounded-xl bg-gray-200/50 dark:bg-gray-800/60 hover:bg-gray-300/70 dark:hover:bg-gray-700/70 text-gray-600 dark:text-gray-300 font-medium transition-colors"
      >
        <PlusIcon className="w-5 h-5" />
        Add another column
      </button>
    );
  }

  return (
    <div className="p-2 bg-gray-200 dark:bg-gray-800/80 rounded-xl">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        placeholder="Enter column title..."
        className="w-full p-2 border-2 border-indigo-500 rounded-lg bg-white dark:bg-gray-700 focus:outline-none"
      />
       <div className="mt-2 flex items-center gap-2">
        <button onClick={handleSubmit} className="px-4 py-1.5 bg-indigo-600 text-white font-semibold rounded-md text-sm hover:bg-indigo-700">Add column</button>
        <button onClick={() => setIsEditing(false)} className="px-2 py-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-md">Cancel</button>
      </div>
    </div>
  )
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ projectId, boardData, currentUser, users, onDragEnd, updateTask, addSubtasks, addComment, addAiTask, deleteTask, addColumn, deleteColumn, isChatOpen, onCloseChat, chatMessages, onSendMessage, onTaskClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [projectView, setProjectView] = useState<'board' | 'graph'>('board');

  const [segments, setSegments] = useState<FilterSegment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>('all');

  const storageKey = `project-segments-${projectId}`;

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
      filters: {
        searchTerm,
        priorityFilter,
        assigneeFilter,
        statusFilter,
      },
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

  useEffect(() => {
    const activeSegment = segments.find(s => s.id === activeSegmentId);
    if (activeSegmentId === 'all') {
        if (searchTerm || priorityFilter || assigneeFilter || statusFilter) {
            setActiveSegmentId(null);
        }
        return;
    }
    if (!activeSegment) {
        return;
    };
    
    const filtersMatch = 
        activeSegment.filters.searchTerm === searchTerm &&
        activeSegment.filters.priorityFilter === priorityFilter &&
        activeSegment.filters.assigneeFilter === assigneeFilter &&
        activeSegment.filters.statusFilter === statusFilter;

    if (!filtersMatch) {
        setActiveSegmentId(null);
    }
  }, [searchTerm, priorityFilter, assigneeFilter, statusFilter, segments, activeSegmentId]);
  
  const handleClearFilters = () => {
    handleApplySegment('all');
  }

  const filteredBoardData: BoardData = useMemo(() => {
    if (!boardData.tasks || !boardData.columns) return boardData;

    const taskIdToColumnIdMap = new Map<string, string>();
    for (const column of Object.values(boardData.columns)) {
        for (const taskId of column.taskIds) {
            taskIdToColumnIdMap.set(taskId, column.id);
        }
    }

    const tasks = Object.values(boardData.tasks);
    let filteredTasks = tasks;

    if (searchTerm) {
      filteredTasks = filteredTasks.filter(task => 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (priorityFilter) {
      filteredTasks = filteredTasks.filter(task => task.priority === priorityFilter);
    }

    if (assigneeFilter) {
      filteredTasks = filteredTasks.filter(task => task.assignee?.name === assigneeFilter);
    }
    
    if (statusFilter) {
        filteredTasks = filteredTasks.filter(task => {
            const columnId = taskIdToColumnIdMap.get(task.id);
            if (!columnId) return false;
            const column = boardData.columns[columnId];
            return column.title === statusFilter;
        });
    }

    const filteredTaskIds = new Set(filteredTasks.map(t => t.id));
    
    const newColumns = Object.fromEntries(
      Object.entries(boardData.columns).map(([columnId, column]) => [
        columnId,
        {
          ...column,
          taskIds: column.taskIds.filter(taskId => filteredTaskIds.has(taskId)),
        },
      ])
    );

    return {
      ...boardData,
      columns: newColumns,
      tasks: boardData.tasks, // Pass all tasks so details can still be looked up
    };
  }, [boardData, searchTerm, priorityFilter, assigneeFilter, statusFilter]);
  
  const uniqueAssignees = useMemo(() => {
      const assignees = Object.values(boardData.tasks)
          .map(task => task.assignee?.name)
          .filter((name): name is string => !!name);
      return [...new Set(assignees)];
  }, [boardData.tasks]);

  const uniqueStatuses = useMemo(() => {
      if (!boardData.columns) return [];
      return [...new Set(Object.values(boardData.columns).map(c => c.title))];
  }, [boardData.columns]);
  
  return (
    <>
      <div className="mb-6">
        <AiTaskCreator onGenerateTask={addAiTask} />
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
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
            statuses={uniqueStatuses}
            segments={segments}
            activeSegmentId={activeSegmentId}
            currentFilters={{ searchTerm, priorityFilter, assigneeFilter, statusFilter }}
            onAddSegment={handleAddSegment}
            onDeleteSegment={handleDeleteSegment}
            onApplySegment={handleApplySegment}
            onClearFilters={handleClearFilters}
          />
         <div className="flex-shrink-0">
            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 text-right">View</h4>
            <div className="flex items-center p-1 bg-gray-200 dark:bg-gray-800 rounded-lg">
                <button
                    onClick={() => setProjectView('board')}
                    className={`p-2 rounded-md ${projectView === 'board' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'}`}
                    aria-label="Board View"
                    title="Board View"
                >
                    <LayoutDashboardIcon className="w-5 h-5" />
                </button>
                <button
                    onClick={() => setProjectView('graph')}
                    className={`p-2 rounded-md ${projectView === 'graph' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'}`}
                    aria-label="Graph View"
                    title="Graph View"
                >
                    <GitBranchIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
      </div>
      
      {projectView === 'board' ? (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
            {filteredBoardData.columnOrder.map((columnId) => {
                const column = filteredBoardData.columns[columnId];
                if (!column) return null;
                const tasks = column.taskIds.map((taskId) => filteredBoardData.tasks[taskId]).filter(Boolean); // filter(Boolean) to remove undefined tasks
                return (
                <Column 
                    key={column.id} 
                    column={column} 
                    tasks={tasks} 
                    onTaskClick={onTaskClick}
                    deleteTask={deleteTask}
                    deleteColumn={deleteColumn}
                />
                );
            })}
            <div className="min-w-[280px]">
                <AddColumn onAddColumn={addColumn} />
            </div>
            </div>
        </DragDropContext>
      ) : (
        <TaskGraphView boardData={filteredBoardData} users={Object.values(users)} onTaskClick={onTaskClick} />
      )}
      
       {isChatOpen && (
        <ProjectChat 
            messages={chatMessages}
            currentUser={currentUser}
            onClose={onCloseChat}
            onSendMessage={onSendMessage}
        />
      )}
    </>
  );
};


import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  onlineUsers: Set<string>;
  aiFeaturesEnabled: boolean;
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
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#1C2326] transition-all"
      >
        <PlusIcon className="w-4 h-4" />
        Add Column
      </button>
      {isEditing && (
        <div ref={formRef} className="absolute top-full right-0 mt-2 p-2 bg-[#131C1B] border border-gray-800 rounded-xl shadow-lg z-20 w-64">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Enter column title..."
            className="w-full p-2 border-2 border-gray-600 rounded-lg bg-[#1C2326] focus:outline-none text-white text-sm"
          />
          <div className="mt-2 flex items-center gap-2">
            <button onClick={handleSubmit} className="px-4 py-1.5 bg-gray-300 text-black font-semibold rounded-md text-sm hover:bg-gray-400">Add</button>
            <button onClick={() => setIsEditing(false)} className="px-2 py-1.5 text-gray-400 hover:bg-gray-800 rounded-md text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ projectId, boardData, currentUser, users, onlineUsers, aiFeaturesEnabled, onDragEnd, updateTask, addSubtasks, addComment, addAiTask, deleteTask, addColumn, deleteColumn, isChatOpen, onCloseChat, chatMessages, onSendMessage, onTaskClick }) => {
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
      {aiFeaturesEnabled && (
      <div className="mb-6">
        <AiTaskCreator onGenerateTask={addAiTask} />
      </div>
      )}

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
         <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
                <h4 className="text-sm font-semibold text-gray-400 mb-2 text-right">View</h4>
                <div className="flex items-center p-1 bg-[#1C2326] rounded-lg">
                    <button
                        onClick={() => setProjectView('board')}
                        className={`p-2 rounded-md ${projectView === 'board' ? 'bg-gray-700 shadow-sm text-white' : 'text-gray-400 hover:bg-gray-800/50'}`}
                        aria-label="Board View"
                        title="Board View"
                    >
                        <LayoutDashboardIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setProjectView('graph')}
                        className={`p-2 rounded-md ${projectView === 'graph' ? 'bg-gray-700 shadow-sm text-white' : 'text-gray-400 hover:bg-gray-800/50'}`}
                        aria-label="Graph View"
                        title="Graph View"
                    >
                        <GitBranchIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
            {projectView === 'board' && (
                <div className="self-end">
                    <AddColumn onAddColumn={addColumn} />
                </div>
            )}
        </div>
      </div>
      
      {projectView === 'board' ? (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-6 items-start pb-4 -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto custom-scrollbar">
            {filteredBoardData.columnOrder.map((columnId) => {
                const column = filteredBoardData.columns[columnId];
                if (!column) return null;
                const tasks = column.taskIds.map((taskId) => filteredBoardData.tasks[taskId]).filter(Boolean); // filter(Boolean) to remove undefined tasks
                return (
                <div key={column.id} className="w-72 flex-shrink-0">
                    <Column 
                        column={column} 
                        tasks={tasks}
                        onlineUsers={onlineUsers}
                        onTaskClick={onTaskClick}
                        deleteTask={deleteTask}
                        deleteColumn={deleteColumn}
                    />
                </div>
                );
            })}
            </div>
        </DragDropContext>
      ) : (
        <TaskGraphView boardData={filteredBoardData} users={Object.values(users)} onTaskClick={onTaskClick} />
      )}
      
       {isChatOpen && (
        <ProjectChat 
            messages={chatMessages}
            currentUser={currentUser}
            onlineUsers={onlineUsers}
            onClose={onCloseChat}
            onSendMessage={onSendMessage}
        />
      )}
    </>
  );
};

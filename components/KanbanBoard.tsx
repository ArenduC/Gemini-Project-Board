import React, { useState, useMemo } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import { Column as ColumnType, BoardData, Task, Subtask, User, ChatMessage } from '../types';
import { Column } from './Column';
import { TaskDetailsModal } from './TaskDetailsModal';
import { Filters } from './Filters';
import { PlusIcon } from './Icons';
import { ProjectChat } from './ProjectChat';

interface KanbanBoardProps {
  boardData: BoardData;
  currentUser: User;
  users: User[];
  onDragEnd: (result: DropResult) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  addSubtasks: (taskId: string, subtasks: { title: string }[], creatorId: string) => Promise<void>;
  addComment: (taskId: string, commentText: string) => Promise<void>;
  deleteTask: (taskId: string, columnId: string) => Promise<void>;
  addColumn: (title: string) => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;
  isChatOpen: boolean;
  onCloseChat: () => void;
  chatMessages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
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
        className="w-full flex items-center justify-start gap-2 p-3 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 hover:bg-slate-300/70 dark:hover:bg-slate-700/70 text-slate-600 dark:text-slate-300 font-medium transition-colors"
      >
        <PlusIcon className="w-5 h-5" />
        Add another column
      </button>
    );
  }

  return (
    <div className="p-2 bg-slate-200 dark:bg-slate-800 rounded-xl">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        placeholder="Enter column title..."
        className="w-full p-2 border-2 border-indigo-500 rounded-lg bg-white dark:bg-slate-900 focus:outline-none"
      />
       <div className="mt-2 flex items-center gap-2">
        <button onClick={handleSubmit} className="px-4 py-1.5 bg-indigo-600 text-white font-semibold rounded-md text-sm hover:bg-indigo-700">Add column</button>
        <button onClick={() => setIsEditing(false)} className="px-2 py-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-md">Cancel</button>
      </div>
    </div>
  )
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ boardData, currentUser, users, onDragEnd, updateTask, addSubtasks, addComment, deleteTask, addColumn, deleteColumn, isChatOpen, onCloseChat, chatMessages, onSendMessage }) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('');

  const handleTaskClick = (task: Task) => setSelectedTask(task);
  const handleCloseModal = () => setSelectedTask(null);

  const filteredBoardData: BoardData = useMemo(() => {
    if (!boardData.tasks || !boardData.columns) return boardData;
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
  }, [boardData, searchTerm, priorityFilter, assigneeFilter]);
  
  const uniqueAssignees = useMemo(() => {
      const assignees = Object.values(boardData.tasks)
          .map(task => task.assignee?.name)
          .filter((name): name is string => !!name);
      return [...new Set(assignees)];
  }, [boardData.tasks]);
  
  return (
    <>
      <div className="mb-6">
        <Filters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
            assigneeFilter={assigneeFilter}
            setAssigneeFilter={setAssigneeFilter}
            assignees={uniqueAssignees}
          />
      </div>
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
                onTaskClick={handleTaskClick}
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
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          currentUser={currentUser}
          users={users}
          onClose={handleCloseModal}
          onUpdateTask={updateTask}
          onAddSubtasks={(taskId, subtasks) => addSubtasks(taskId, subtasks, currentUser.id)}
          onAddComment={addComment}
        />
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
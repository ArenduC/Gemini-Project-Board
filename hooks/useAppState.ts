import { useState, useEffect, useCallback } from 'react';
import { DropResult } from 'react-beautiful-dnd';
import { AppState, Task, NewTaskData, User } from '../types';
import { api } from '../services/api';

const initialState: AppState = {
  projects: {},
  users: {},
  projectOrder: [],
};

export const useAppState = (userId?: string) => {
  const [state, setState] = useState<AppState>(initialState);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!userId) {
        setLoading(false);
        setState(initialState);
        return;
    }
    
    setLoading(true);
    try {
        const { projects, users, projectOrder } = await api.data.fetchInitialData(userId);
        setState({ projects, users, projectOrder });
    } catch (error: any) {
        console.error('Failed to fetch initial data:', error.message || error);
        setState(initialState);
    } finally {
        setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Real-time subscriptions
  useEffect(() => {
    if (!userId) return;

    const changes = api.data.subscribeToChanges(fetchData);
    
    return () => {
        changes.unsubscribe();
    }
  }, [userId, fetchData]);


  const onDragEnd = useCallback(async (projectId: string, result: DropResult) => {
    const { destination, source, draggableId: taskId } = result;
    if (!destination) return;

    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    
    // Optimistic local state update
    const project = state.projects[projectId];
    const startCol = project.board.columns[source.droppableId];
    const endCol = project.board.columns[destination.droppableId];
    
    const newStartTaskIds = Array.from(startCol.taskIds);
    newStartTaskIds.splice(source.index, 1);
    
    let newEndTaskIds;
    if (startCol.id === endCol.id) {
        newEndTaskIds = newStartTaskIds;
    } else {
        newEndTaskIds = Array.from(endCol.taskIds);
    }
    newEndTaskIds.splice(destination.index, 0, taskId);

    const newState = { ...state };
    newState.projects[projectId].board.columns[startCol.id] = { ...startCol, taskIds: newStartTaskIds };
    newState.projects[projectId].board.columns[endCol.id] = { ...endCol, taskIds: newEndTaskIds };
    setState(newState);


    // Update database
    await api.data.moveTask(taskId, destination.droppableId, destination.index + 1);

  }, [state, setState]);
  
  const updateTask = useCallback(async (projectId: string, updatedTask: Task) => {
      await api.data.updateTask(updatedTask);
  }, []);

  const addSubtasks = useCallback(async (projectId: string, taskId: string, newSubtasksData: { title:string }[], creatorId: string) => {
    await api.data.addSubtasks(taskId, newSubtasksData, creatorId);
  }, []);


  const addComment = useCallback(async (projectId: string, taskId: string, commentText: string, author: User) => {
      await api.data.addComment(taskId, commentText, author.id);
  }, []);

  const addTask = useCallback(async (projectId: string, taskData: NewTaskData, creatorId: string) => {
    await api.data.addTask(taskData, creatorId);
  }, []);

  const deleteTask = useCallback(async (projectId: string, taskId: string, columnId: string) => {
    await api.data.deleteTask(taskId);
  }, []);

  const addColumn = useCallback(async (projectId: string, title: string) => {
      await api.data.addColumn(projectId, title);
  }, []);

  const deleteColumn = useCallback(async (projectId: string, columnId: string) => {
    await api.data.deleteColumn(columnId);
  }, []);

  const addProject = useCallback(async (name: string, description: string, creatorId: string) => {
    await api.data.addProject(name, description, creatorId);
  }, []);

  const updateProjectMembers = useCallback(async (projectId: string, memberIds: string[]) => {
      await api.data.updateProjectMembers(projectId, memberIds);
  }, []);

  return { state, loading, onDragEnd, updateTask, addSubtasks, addComment, addTask, deleteTask, addColumn, deleteColumn, addProject, updateProjectMembers };
};
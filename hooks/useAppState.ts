

import { useState, useEffect, useCallback } from 'react';
import { DropResult } from 'react-beautiful-dnd';
import { AppState, Task, NewTaskData, User, ChatMessage, TaskPriority } from '../types';
import { api } from '../services/api';
import { generateTaskFromPrompt } from '../services/geminiService';

const initialState: AppState = {
  projects: {},
  users: {},
  projectOrder: [],
};

export const useAppState = (userId?: string, activeProjectId?: string | null) => {
  const [state, setState] = useState<AppState>(initialState);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
        if(userId) {
            const user = await api.auth.getUserProfile(userId);
            setCurrentUser(user);
        } else {
            setCurrentUser(null);
        }
    };
    fetchUser();
  }, [userId]);

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
  
  // Real-time subscription for project chat
  useEffect(() => {
    if (!activeProjectId || !userId) return;

    const handleNewMessage = (payload: any) => {
      const newMessageData = payload.new;
      
      setState(prevState => {
        const author = prevState.users[newMessageData.author_id];
        if (!author) {
          console.warn("Received chat message from unknown user:", newMessageData.author_id);
          return prevState;
        }

        const project = prevState.projects[activeProjectId];
        if (!project) return prevState;
        
        const finalMessage: ChatMessage = {
            id: newMessageData.id,
            text: newMessageData.text,
            createdAt: newMessageData.created_at,
            author: author,
        };
        
        const isSender = author.id === userId;
        let newMessages;

        if (isSender) {
          // Find and replace the optimistic message
          const optimisticIndex = project.chatMessages.findIndex(m => m.id.startsWith('temp-') && m.text === finalMessage.text);
          if (optimisticIndex > -1) {
            newMessages = [...project.chatMessages];
            newMessages[optimisticIndex] = finalMessage;
          } else {
            // If optimistic message isn't found, just add if it's not already there
            if (project.chatMessages.some(m => m.id === finalMessage.id)) return prevState;
            newMessages = [...project.chatMessages, finalMessage];
          }
        } else {
          // For other users, just add the new message if it doesn't exist
          if (project.chatMessages.some(m => m.id === finalMessage.id)) return prevState;
          newMessages = [...project.chatMessages, finalMessage];
        }

        return {
            ...prevState,
            projects: {
                ...prevState.projects,
                [activeProjectId]: {
                    ...project,
                    chatMessages: newMessages.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
                }
            }
        };
      });
    };

    const subscription = api.data.subscribeToProjectChat(activeProjectId, handleNewMessage);

    return () => {
      subscription.unsubscribe();
    };
  }, [activeProjectId, userId]);


  const onDragEnd = useCallback(async (projectId: string, result: DropResult) => {
    const { destination, source, draggableId: taskId } = result;
    if (!destination || !currentUser) return;

    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    
    // Optimistic local state update for immediate UI feedback
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


    // Update database and re-fetch for consistency
    try {
        await api.data.moveTask(taskId, destination.droppableId, destination.index + 1, currentUser.id);
    } catch (error) {
        console.error("Error moving task:", error);
    } finally {
        // Always re-fetch to ensure UI is in sync with the database.
        // This also gracefully reverts the optimistic update on failure.
        await fetchData();
    }

  }, [state, setState, currentUser, fetchData]);
  
  const updateTask = useCallback(async (projectId: string, updatedTask: Task) => {
      if (!currentUser) return;
      await api.data.updateTask(updatedTask, currentUser.id);
      // For a full app, you might optimistically update state here too
      await fetchData();
  }, [fetchData, currentUser]);

  const addSubtasks = useCallback(async (projectId: string, taskId: string, newSubtasksData: { title:string }[], creatorId: string) => {
    await api.data.addSubtasks(taskId, newSubtasksData, creatorId);
    await fetchData();
  }, [fetchData]);


  const addComment = useCallback(async (projectId: string, taskId: string, commentText: string, author: User) => {
      await api.data.addComment(taskId, commentText, author.id);
      await fetchData();
  }, [fetchData]);

  const addTask = useCallback(async (projectId: string, taskData: NewTaskData, creatorId: string) => {
    await api.data.addTask(taskData, creatorId);
    await fetchData();
  }, [fetchData]);

  const addAiTask = useCallback(async (projectId: string, prompt: string) => {
    if (!currentUser) throw new Error("User must be logged in to create a task.");

    const project = state.projects[projectId];
    if (!project || project.board.columnOrder.length === 0) {
        throw new Error("Cannot add AI task to a project with no columns.");
    }

    const generatedData = await generateTaskFromPrompt(prompt);

    const taskData: NewTaskData = {
        title: generatedData.title,
        description: generatedData.description,
        priority: generatedData.priority,
        columnId: project.board.columnOrder[0], // Add to the first column
    };

    await api.data.addTask(taskData, currentUser.id);
    await fetchData();
  }, [fetchData, state.projects, currentUser]);


  const deleteTask = useCallback(async (projectId: string, taskId: string, columnId: string) => {
    await api.data.deleteTask(taskId);
    await fetchData();
  }, [fetchData]);

  const addColumn = useCallback(async (projectId: string, title: string) => {
      await api.data.addColumn(projectId, title);
      await fetchData();
  }, [fetchData]);

  const deleteColumn = useCallback(async (projectId: string, columnId: string) => {
    await api.data.deleteColumn(columnId);
    await fetchData();
  }, [fetchData]);

  const addProject = useCallback(async (name: string, description: string, creatorId: string) => {
    await api.data.addProject(name, description, creatorId);
    await fetchData();
  }, [fetchData]);

  const updateProjectMembers = useCallback(async (projectId: string, memberIds: string[]) => {
      await api.data.updateProjectMembers(projectId, memberIds);
      await fetchData();
  }, [fetchData]);
  
  const sendChatMessage = useCallback(async (projectId: string, text: string, author: User) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
        id: tempId,
        text,
        author,
        createdAt: new Date().toISOString(),
    };

    // Optimistic update
    setState(prevState => {
        const project = prevState.projects[projectId];
        if (!project) return prevState;
        return {
            ...prevState,
            projects: {
                ...prevState.projects,
                [projectId]: {
                    ...project,
                    chatMessages: [...project.chatMessages, optimisticMessage]
                }
            }
        }
    });

    try {
        await api.data.sendChatMessage(projectId, text, author.id);
    } catch (error) {
        // Revert on error
        console.error("Failed to send message, reverting:", error);
        setState(prevState => {
            const project = prevState.projects[projectId];
            if (!project) return prevState;
            return {
                ...prevState,
                projects: {
                    ...prevState.projects,
                    [projectId]: {
                        ...project,
                        chatMessages: project.chatMessages.filter(m => m.id !== tempId)
                    }
                }
            }
        });
    }
  }, []);

  return { state, loading, onDragEnd, updateTask, addSubtasks, addComment, addTask, addAiTask, deleteTask, addColumn, deleteColumn, addProject, updateProjectMembers, sendChatMessage };
};
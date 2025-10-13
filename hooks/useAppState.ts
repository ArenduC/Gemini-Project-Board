import { useState, useEffect, useCallback } from 'react';
import { DropResult } from 'react-beautiful-dnd';
import { AppState, Task, NewTaskData, User, ChatMessage, AiGeneratedProjectPlan, Bug, BugStatus, TaskPriority } from '../types';
import { api } from '../services/api';
import { generateTaskFromPrompt, generateBugsFromFile, BugResponse } from '../services/geminiService';
import { Session } from '@supabase/supabase-js';

const initialState: AppState = {
  projects: {},
  users: {},
  projectOrder: [],
};

export const useAppState = (session: Session | null, currentUser: User | null, activeProjectId?: string | null) => {
  const [state, setState] = useState<AppState>(initialState);
  const [loading, setLoading] = useState(true);
  const userId = session?.user?.id;

  const fetchData = useCallback(async () => {
    if (!userId) {
      setState(initialState);
      setLoading(true);
      return;
    }
    setLoading(true);
    try {
        const { projects, users, projectOrder } = await api.data.fetchInitialData(userId);
        const freshState = { projects, users, projectOrder };
        const cacheKey = `gemini-board-cache-${userId}`;
        
        try {
            localStorage.setItem(cacheKey, JSON.stringify(freshState));
        } catch (e) {
            console.warn("Could not save state to cache:", e);
        }
        
        setState(freshState);
    } catch (error) {
        console.error("An error occurred while fetching app data:", error);
    } finally {
        setLoading(false);
    }
  }, [userId]);
  
  // This effect orchestrates the entire data loading and caching lifecycle.
  useEffect(() => {
    if (!userId) {
      setState(initialState);
      setLoading(true);
      return;
    }
    
    // Step 1: Attempt to hydrate from cache for an instant UI.
    const cacheKey = `gemini-board-cache-${userId}`;
    const cachedStateJSON = localStorage.getItem(cacheKey);
    if (cachedStateJSON) {
      try {
        setState(JSON.parse(cachedStateJSON));
        setLoading(false); // Cache hit, hide data loading screen immediately.
      } catch (e) {
        console.warn("Failed to parse cached state, clearing it.", e);
        localStorage.removeItem(cacheKey);
      }
    }

    // Step 2: Always fetch fresh data from the server.
    fetchData();

  }, [userId, fetchData]);


  // Real-time subscription for project chat
  useEffect(() => {
    if (!activeProjectId || !session || !userId) return;
    const cacheKey = `gemini-board-cache-${userId}`;

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
            if (project.chatMessages.some(m => m.id === finalMessage.id)) return prevState;
            newMessages = [...project.chatMessages, finalMessage];
          }
        } else {
          if (project.chatMessages.some(m => m.id === finalMessage.id)) return prevState;
          newMessages = [...project.chatMessages, finalMessage];
        }

        const updatedState = {
            ...prevState,
            projects: {
                ...prevState.projects,
                [activeProjectId]: {
                    ...project,
                    chatMessages: newMessages.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
                }
            }
        };
        // Update cache with new message
        localStorage.setItem(cacheKey, JSON.stringify(updatedState));
        return updatedState;
      });
    };

    const subscription = api.data.subscribeToProjectChat(activeProjectId, handleNewMessage);

    return () => {
      subscription.unsubscribe();
    };
  }, [activeProjectId, session, userId]);


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
        await fetchData();
    }

  }, [state, currentUser, fetchData]);
  
  const updateTask = useCallback(async (projectId: string, updatedTask: Task) => {
      if (!currentUser) return;
      await api.data.updateTask(updatedTask, currentUser.id);
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

  const addProjectFromPlan = useCallback(async (plan: AiGeneratedProjectPlan) => {
    if (!currentUser) throw new Error("User must be logged in.");

    // 1. Create Project Shell
    const newProject = await api.data.createProjectShell(plan.name, plan.description, currentUser.id);

    // 2. Create Columns and Tasks
    for (const col of plan.columns) {
        const newColumn = await api.data.addColumn(newProject.id, col.title);
        if (newColumn) {
            for (const task of col.tasks) {
                const taskData: NewTaskData = {
                    title: task.title,
                    description: task.description,
                    priority: task.priority,
                    columnId: newColumn.id,
                };
                const newTask = await api.data.addTask(taskData, currentUser.id);
                if (newTask && task.subtasks && task.subtasks.length > 0) {
                    await api.data.addSubtasks(newTask.id, task.subtasks, currentUser.id);
                }
            }
        }
    }
    
    // 3. Refresh state
    await fetchData();
  }, [fetchData, currentUser]);

  const deleteProject = useCallback(async (projectId: string) => {
    await api.data.deleteProject(projectId);
    await fetchData();
  }, [fetchData]);

  const updateUserProfile = useCallback(async (updates: { name: string }) => {
    if (!userId) return;
    await api.auth.updateUserProfile(userId, updates);
    await fetchData();
  }, [fetchData, userId]);

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
        // We don't need to re-fetch here because the realtime subscription will update the state
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
  
  const addProjectLink = useCallback(async (projectId: string, title: string, url: string, creatorId: string) => {
    await api.data.addProjectLink(projectId, title, url, creatorId);
    await fetchData();
  }, [fetchData]);

  const deleteProjectLink = useCallback(async (linkId: string) => {
      await api.data.deleteProjectLink(linkId);
      await fetchData();
  }, [fetchData]);

  // Bug Management
  const addBug = useCallback(async (projectId: string, bugData: { title: string, description: string, priority: TaskPriority }) => {
    if (!currentUser) return;
    await api.data.addBug({
        ...bugData,
        projectId,
        status: BugStatus.NEW,
        reporterId: currentUser.id,
    });
    await fetchData();
  }, [fetchData, currentUser]);

  const addBugsBatch = useCallback(async (projectId: string, fileContent: string) => {
    if (!currentUser) return;
    const parsedBugs: BugResponse[] = await generateBugsFromFile(fileContent);
    if (parsedBugs.length > 0) {
        const bugsToCreate = parsedBugs.map(b => ({
            ...b,
            projectId,
            priority: TaskPriority.MEDIUM,
            status: BugStatus.NEW,
            reporterId: currentUser.id,
        }));
        await api.data.addBugsBatch(bugsToCreate);
        await fetchData();
    }
  }, [fetchData, currentUser]);

  const updateBug = useCallback(async (bugId: string, updates: Partial<Bug>) => {
    const { priority, status, assignee } = updates;
    await api.data.updateBug(bugId, {
        priority,
        status,
        assigneeId: assignee?.id ?? (assignee === undefined ? undefined : null), // Handle unassigning
    });
    await fetchData();
  }, [fetchData]);

  const deleteBug = useCallback(async (bugId: string) => {
    await api.data.deleteBug(bugId);
    await fetchData();
  }, [fetchData]);

  const deleteBugsBatch = useCallback(async (bugIds: string[]) => {
    await api.data.deleteBugsBatch(bugIds);
    await fetchData();
  }, [fetchData]);


  return { state, loading, fetchData, onDragEnd, updateTask, addSubtasks, addComment, addTask, addAiTask, deleteTask, addColumn, deleteColumn, addProject, addProjectFromPlan, deleteProject, updateUserProfile, updateProjectMembers, sendChatMessage, addProjectLink, deleteProjectLink, addBug, updateBug, deleteBug, addBugsBatch, deleteBugsBatch };
};
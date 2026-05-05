import { useState, useEffect, useCallback } from 'react';
import { DropResult } from 'react-beautiful-dnd';
import { AppState, Task, NewTaskData, User, ChatMessage, AiGeneratedProjectPlan, Bug, TaskPriority, Subtask, AiGeneratedTaskFromFile, Sprint, FilterSegment, BugResponse, Project, TaskHistory } from '../types';
import { api } from '../services/api';
import { generateTaskFromPrompt } from '../services/geminiService';
import { Session } from '@supabase/supabase-js';
import { playSentSound } from '../utils/sound';

const initialState: AppState = {
  projects: {},
  users: {},
  projectOrder: [],
};

export const useAppState = (session: Session | null, currentUser: User | null, activeProjectId?: string | null) => {
  const [state, setState] = useState<AppState>(initialState);
  const [loading, setLoading] = useState(true);
  const userId = session?.user?.id;

  const syncCache = (newState: AppState) => {
    if (!userId) return;
    const cacheKey = `gemini-board-cache-${userId}`;
    try {
        localStorage.setItem(cacheKey, JSON.stringify(newState));
    } catch (e) {
        console.warn("Could not sync cache:", e);
    }
  };

  const fetchData = useCallback(async (isInitial = false) => {
    if (!userId) {
      setState(initialState);
      setLoading(true);
      return;
    }
    
    if (isInitial) setLoading(true);

    try {
        const freshState = await api.data.fetchInitialData(userId);
        setState(freshState);
        syncCache(freshState);
    } catch (error: any) {
        console.error("An error occurred while fetching app data:", error);
        if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
            console.error("Network connectivity issue detected with Supabase.");
        }
        // Even on error, we stop loading so the UI can at least show cached data or empty state
        setLoading(false); 
    } finally {
        setLoading(false);
    }
  }, [userId]);
  
  useEffect(() => {
    if (!userId) {
      setState(initialState);
      setLoading(true);
      return;
    }
    
    const cacheKey = `gemini-board-cache-${userId}`;
    const cachedStateJSON = localStorage.getItem(cacheKey);
    if (cachedStateJSON) {
      try {
        setState(JSON.parse(cachedStateJSON));
        setLoading(false); 
      } catch (e) {
        localStorage.removeItem(cacheKey);
      }
    }
    fetchData(Object.keys(state.projects).length === 0);
  }, [userId, fetchData]);

  useEffect(() => {
    if (!activeProjectId || !session || !userId) return;

    const handleNewMessage = (payload: any) => {
      const newMessageData = payload.new;
      setState(prevState => {
        const author = prevState.users[newMessageData.author_id];
        if (!author) return prevState;
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

        const newState = {
            ...prevState,
            projects: {
                ...prevState.projects,
                [activeProjectId]: {
                    ...project,
                    chatMessages: newMessages.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
                    updatedAt: new Date().toISOString()
                }
            }
        };
        syncCache(newState);
        return newState;
      });
    };

    const subscription = api.data.subscribeToProjectChat(activeProjectId, handleNewMessage);
    return () => { subscription.unsubscribe(); };
  }, [activeProjectId, session, userId]);

  /**
   * Optimistically "touches" a project in the local state.
   * This forces the project to the top of sorted lists immediately.
   */
  const optimisticTouch = (projectId: string, taskId?: string) => {
      const now = new Date().toISOString();
      setState(prevState => {
          const project = prevState.projects[projectId];
          if (!project) return prevState;
          
          let updatedTasks = project.board.tasks;
          if (taskId && project.board.tasks[taskId]) {
              updatedTasks = {
                  ...project.board.tasks,
                  [taskId]: { ...project.board.tasks[taskId], updatedAt: now }
              };
          }

          const updatedState = {
              ...prevState,
              projects: {
                  ...prevState.projects,
                  [projectId]: { 
                      ...project, 
                      updatedAt: now,
                      board: { ...project.board, tasks: updatedTasks }
                  }
              }
          };
          syncCache(updatedState);
          return updatedState;
      });
      // Synchronize with server
      api.data.touchProject(projectId).catch(console.warn);
  };


  const onDragEnd = useCallback(async (projectId: string, result: DropResult, filteredBoardData?: BoardData) => {
    const { destination, source, draggableId, type } = result;
    if (!destination || !currentUser || !userId) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    
    const project = state.projects[projectId];
    if (!project) return;

    // Trigger immediate re-sequence on dashboard
    optimisticTouch(projectId, type !== 'column' ? draggableId : undefined);

    if (type === 'column') {
        const newColumnOrder = Array.from(project.board.columnOrder) as string[];
        newColumnOrder.splice(source.index, 1);
        newColumnOrder.splice(destination.index, 0, draggableId);

        setState(prevState => {
            const updatedState = {
                ...prevState,
                projects: {
                    ...prevState.projects,
                    [projectId]: {
                        ...prevState.projects[projectId],
                        board: { ...prevState.projects[projectId].board, columnOrder: newColumnOrder }
                    }
                }
            };
            syncCache(updatedState);
            return updatedState;
        });

        try {
            await api.data.updateColumnOrder(projectId, newColumnOrder);
        } catch (error) {
            await fetchData();
        }
        return;
    }

    const startCol = project.board.columns[source.droppableId];
    const endCol = project.board.columns[destination.droppableId];
    if (!startCol || !endCol) return;

    // Handle index translation if filtered data is provided
    let finalSourceIndex = source.index;
    let finalDestinationIndex = destination.index;

    if (filteredBoardData) {
        const filteredStartCol = filteredBoardData.columns[source.droppableId];
        const filteredEndCol = filteredBoardData.columns[destination.droppableId];

        if (filteredStartCol) {
            const taskId = filteredStartCol.taskIds[source.index];
            finalSourceIndex = startCol.taskIds.indexOf(taskId);
        }

        if (filteredEndCol) {
            if (destination.index >= filteredEndCol.taskIds.length) {
                // Moving to the very end of the visible tasks
                finalDestinationIndex = endCol.taskIds.length;
            } else {
                const targetTaskId = filteredEndCol.taskIds[destination.index];
                finalDestinationIndex = endCol.taskIds.indexOf(targetTaskId);
                // If we are moving within the same column and moving "down", 
                // the index might need adjustment if we remove the item from before it.
                // But splice handles this if we do it in order.
            }
        }
    }

    const newStartTaskIds = Array.from(startCol.taskIds);
    newStartTaskIds.splice(finalSourceIndex, 1);
    const newEndTaskIds = startCol.id === endCol.id ? newStartTaskIds : Array.from(endCol.taskIds);
    
    if (startCol.id !== endCol.id) {
        newEndTaskIds.splice(finalDestinationIndex, 0, draggableId);
    } else {
        // Adjust destination index for same-column move
        let adjustedDestIndex = finalDestinationIndex;
        // If we removed an item from BEFORE the destination, the destination index shifted
        // No, wait. splice(finalSourceIndex, 1) removes it.
        // If finalSourceIndex < finalDestinationIndex, the list shortened before the dest.
        // But if we used indexOf on the ORIGINAL list, then finalDestinationIndex is still correct for the original list.
        // Actually, if we use the same list for start and end, we just splice it in.
        newStartTaskIds.splice(adjustedDestIndex, 0, draggableId);
    }

    setState(prevState => {
      const updatedTask = prevState.projects[projectId].board.tasks[draggableId];
      if (!updatedTask) return prevState;

      // Add optimistic history entry for column change
      const newHistoryItem: TaskHistory = {
        id: `temp-hist-${Date.now()}`,
        user: currentUser,
        changeDescription: `moved task from "${startCol.title}" to "${endCol.title}"`,
        createdAt: new Date().toISOString()
      };

      const updatedColumns = {
        ...prevState.projects[projectId].board.columns,
        [startCol.id]: { ...startCol, taskIds: newStartTaskIds },
        [endCol.id]: { ...endCol, taskIds: newEndTaskIds }
      };

      const updatedState = {
        ...prevState,
        projects: {
          ...prevState.projects,
          [projectId]: { 
            ...prevState.projects[projectId], 
            board: { 
                ...prevState.projects[projectId].board, 
                columns: updatedColumns,
                tasks: {
                    ...prevState.projects[projectId].board.tasks,
                    [draggableId]: {
                        ...updatedTask,
                        history: [newHistoryItem, ...(updatedTask.history || [])]
                    }
                }
            } 
          }
        }
      };
      syncCache(updatedState);
      return updatedState;
    });

    try {
        await api.data.moveTask(draggableId, destination.droppableId, destination.index + 1, currentUser.id);
        setTimeout(() => fetchData(), 1200);
    } catch (error) {
        await fetchData();
    }
  }, [state, currentUser, userId, fetchData]);
  
  const updateTask = useCallback(async (projectId: string, updatedTask: Task) => {
      if (!currentUser) return;
      optimisticTouch(projectId, updatedTask.id);
      
      setState(prevState => {
        const project = prevState.projects[projectId];
        if (!project) return prevState;

        const existingTask = project.board.tasks[updatedTask.id];
        if (!existingTask) return prevState;

        // Detect specific changes for history
        const historyEntries: TaskHistory[] = [];
        const now = new Date().toISOString();

        if (existingTask.title !== updatedTask.title) {
            historyEntries.push({ id: `temp-h-${Date.now()}-1`, user: currentUser, createdAt: now, changeDescription: `changed title to "${updatedTask.title}"` });
        }
        if (existingTask.priority !== updatedTask.priority) {
            historyEntries.push({ id: `temp-h-${Date.now()}-2`, user: currentUser, createdAt: now, changeDescription: `changed priority to ${updatedTask.priority}` });
        }
        if (existingTask.assignee?.id !== updatedTask.assignee?.id) {
            historyEntries.push({ id: `temp-h-${Date.now()}-3`, user: currentUser, createdAt: now, changeDescription: `changed assignee to ${updatedTask.assignee?.name || 'Unassigned'}` });
        }
        if (existingTask.sprintId !== updatedTask.sprintId) {
            historyEntries.push({ id: `temp-h-${Date.now()}-4`, user: currentUser, createdAt: now, changeDescription: `updated node sprint assignment` });
        }

        const mergedTask = {
            ...existingTask,
            ...updatedTask,
            updatedAt: now,
            subtasks: updatedTask.subtasks && updatedTask.subtasks.length > 0 ? updatedTask.subtasks : (existingTask?.subtasks || []),
            comments: updatedTask.comments && updatedTask.comments.length > 0 ? updatedTask.comments : (existingTask?.comments || []),
            history: [...historyEntries, ...(existingTask?.history || [])],
        };

        const newState = {
            ...prevState,
            projects: {
                ...prevState.projects,
                [projectId]: {
                    ...project,
                    board: {
                        ...project.board,
                        tasks: {
                            ...project.board.tasks,
                            [updatedTask.id]: mergedTask
                        }
                    }
                }
            }
        };
        syncCache(newState);
        return newState;
      });

      try {
        await api.data.updateTask(updatedTask, currentUser.id, Object.values(state.users) as User[]);
        setTimeout(() => fetchData(), 1200);
      } catch (err) {
        await fetchData();
      }
  }, [fetchData, currentUser, state.users]);

  const addSubtasks = useCallback(async (projectId: string, taskId: string, newSubtasksData: Partial<Subtask>[], creatorId: string) => {
    optimisticTouch(projectId, taskId);
    setState(prevState => {
        const project = prevState.projects[projectId];
        if (!project || !project.board.tasks[taskId]) return prevState;
        
        const task = project.board.tasks[taskId];
        const tempSubtasks: Subtask[] = newSubtasksData.map((s, idx) => ({
            id: `temp-st-${Date.now()}-${idx}`,
            title: s.title || '',
            completed: !!s.completed,
            creatorId,
            createdAt: new Date().toISOString(),
            assigneeId: s.assigneeId
        }));

        // Add history entry for subtask creation
        const historyEntry: TaskHistory = {
            id: `temp-h-${Date.now()}-st`,
            user: currentUser!,
            createdAt: new Date().toISOString(),
            changeDescription: `added ${newSubtasksData.length} sub-node(s)`
        };

        const newState = {
            ...prevState,
            projects: {
                ...prevState.projects,
                [projectId]: {
                    ...project,
                    board: {
                        ...project.board,
                        tasks: {
                            ...project.board.tasks,
                            [taskId]: {
                                ...task,
                                subtasks: [...(task.subtasks || []), ...tempSubtasks],
                                history: [historyEntry, ...(task.history || [])],
                                updatedAt: new Date().toISOString()
                            }
                        }
                    }
                }
            }
        };
        syncCache(newState);
        return newState;
    });

    try {
        await api.data.addSubtasks(taskId, newSubtasksData, creatorId);
        setTimeout(() => fetchData(), 500);
    } catch (err) {
        await fetchData();
    }
  }, [fetchData, currentUser]);

  const updateSubtask = useCallback(async (projectId: string, taskId: string, subtaskId: string, updates: Partial<Subtask>) => {
    optimisticTouch(projectId, taskId);
    setState(prevState => {
        const project = prevState.projects[projectId];
        if (!project || !project.board.tasks[taskId]) return prevState;
        const task = project.board.tasks[taskId];
        const updatedSubtasks = task.subtasks.map(s => s.id === subtaskId ? { ...s, ...updates } : s);
        return {
            ...prevState,
            projects: {
                ...prevState.projects,
                [projectId]: {
                    ...project,
                    board: {
                        ...project.board,
                        tasks: {
                            ...project.board.tasks,
                            [taskId]: { ...task, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() }
                        }
                    }
                }
            }
        };
    });

    try {
        await api.data.updateSubtask(subtaskId, updates);
        setTimeout(() => fetchData(), 800);
    } catch (err) {
        await fetchData();
    }
  }, [fetchData]);

  const deleteSubtask = useCallback(async (projectId: string, taskId: string, subtaskId: string) => {
    optimisticTouch(projectId, taskId);
    setState(prevState => {
        const project = prevState.projects[projectId];
        if (!project || !project.board.tasks[taskId]) return prevState;
        const task = project.board.tasks[taskId];
        const updatedSubtasks = task.subtasks.filter(s => s.id !== subtaskId);
        return {
            ...prevState,
            projects: {
                ...prevState.projects,
                [projectId]: {
                    ...project,
                    board: {
                        ...project.board,
                        tasks: {
                            ...project.board.tasks,
                            [taskId]: { ...task, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() }
                        }
                    }
                }
            }
        };
    });

    try {
        await api.data.deleteSubtask(subtaskId);
        setTimeout(() => fetchData(), 800);
    } catch (err) {
        await fetchData();
    }
  }, [fetchData]);

  const addComment = useCallback(async (projectId: string, taskId: string, commentText: string, author: User) => {
      optimisticTouch(projectId, taskId);
      setState(prevState => {
        const project = prevState.projects[projectId];
        if (!project || !project.board.tasks[taskId]) return prevState;
        
        const task = project.board.tasks[taskId];
        const newCommentObj = {
            id: `temp-comment-${Date.now()}`,
            text: commentText,
            author,
            createdAt: new Date().toISOString()
        };

        const newState = {
            ...prevState,
            projects: {
                ...prevState.projects,
                [projectId]: {
                    ...project,
                    board: {
                        ...project.board,
                        tasks: {
                            ...project.board.tasks,
                            [taskId]: {
                                ...task,
                                comments: [newCommentObj, ...(task.comments || [])],
                                updatedAt: new Date().toISOString()
                            }
                        }
                    }
                }
            }
        };
        syncCache(newState);
        return newState;
      });

      try {
        await api.data.addComment(taskId, commentText, author.id);
        setTimeout(() => fetchData(), 500);
      } catch (err) {
        await fetchData();
      }
  }, [fetchData]);

  const addTask = useCallback(async (projectId: string, taskData: NewTaskData, creatorId: string) => {
    optimisticTouch(projectId);
    const newTask = await api.data.addTask(taskData, creatorId);
    if (newTask && currentUser) {
      await api.data.moveTask(newTask.id, taskData.columnId, 1, currentUser.id);
    }
    await fetchData();
  }, [fetchData, currentUser]);

  const addTasksBatch = useCallback(async (projectId: string, tasksToCreate: AiGeneratedTaskFromFile[], sprintId: string | null) => {
    if (!currentUser) return;
    const project = state.projects[projectId];
    if (!project) return;
    
    optimisticTouch(projectId);
    
    const columnMap = new Map<string, string>();
    for (const colId of project.board.columnOrder) {
        const col = project.board.columns[colId];
        if (col?.title) {
            columnMap.set(col.title.toLowerCase().trim(), col.id);
        }
    }
    
    const firstColumnId = project.board.columnOrder[0];
    const tasksData = tasksToCreate.map(task => {
        const statusKey = (task.status || '').toLowerCase().trim();
        return {
            title: task.title,
            description: task.description,
            priority: task.priority,
            column_id: columnMap.get(statusKey) || firstColumnId,
            creator_id: currentUser.id,
            sprint_id: sprintId, 
            tags: []
        };
    });

    if (tasksData.length > 0) {
        try {
            await api.data.addTasksBatch(tasksData);
            await fetchData();
        } catch (err) {
            await fetchData();
        }
    }
  }, [fetchData, currentUser, state.projects]);

  const addAiTask = useCallback(async (projectId: string, prompt: string) => {
    if (!currentUser) throw new Error("User must be logged in to create a task.");
    const project = state.projects[projectId];
    if (!project || project.board.columnOrder.length === 0) throw new Error("Cannot add AI task to a project with no columns.");

    optimisticTouch(projectId);
    const generatedData = await generateTaskFromPrompt(prompt);
    const taskData: NewTaskData = {
        title: generatedData.title,
        description: generatedData.description,
        priority: generatedData.priority,
        columnId: project.board.columnOrder[0], 
        dueDate: generatedData.dueDate,
    };

    const newTask = await api.data.addTask(taskData, currentUser.id);
    if (newTask) {
      await api.data.moveTask(newTask.id, taskData.columnId, 1, currentUser.id);
    }
    await fetchData();
  }, [fetchData, state.projects, currentUser]);


  const deleteTask = useCallback(async (projectId: string, taskId: string, columnId: string) => {
    optimisticTouch(projectId);
    setState(prevState => {
        const project = prevState.projects[projectId];
        if (!project) return prevState;
        
        const newTasks = { ...project.board.tasks };
        delete newTasks[taskId];

        const newColumns = { ...project.board.columns };
        if (newColumns[columnId]) {
            newColumns[columnId] = {
                ...newColumns[columnId],
                taskIds: newColumns[columnId].taskIds.filter(id => id !== taskId)
            };
        }

        const newState = {
            ...prevState,
            projects: {
                ...prevState.projects,
                [projectId]: {
                    ...project,
                    board: {
                        ...project.board,
                        tasks: newTasks,
                        columns: newColumns
                    }
                }
            }
        };
        syncCache(newState);
        return newState;
    });

    try {
        await api.data.deleteTask(taskId);
    } catch (err) {
        await fetchData();
    }
  }, [fetchData]);

  const addColumn = useCallback(async (projectId: string, title: string) => {
      optimisticTouch(projectId);
      await api.data.addColumn(projectId, title);
      await fetchData();
  }, [fetchData]);

  const deleteColumn = useCallback(async (projectId: string, columnId: string) => {
    optimisticTouch(projectId);
    await api.data.deleteColumn(columnId);
    await fetchData();
  }, [fetchData]);

  const addProject = useCallback(async (name: string, description: string, creatorId: string) => {
    await api.data.addProject(name, description, creatorId);
    await fetchData();
  }, [fetchData]);

  const addProjectFromPlan = useCallback(async (plan: AiGeneratedProjectPlan) => {
    if (!currentUser) throw new Error("User must be logged in.");
    const newProject = await api.data.createProjectShell(plan.name, plan.description, currentUser.id);

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
      optimisticTouch(projectId);
      await api.data.updateProjectMembers(projectId, memberIds);
      await fetchData();
  }, [fetchData]);
  
  const sendChatMessage = useCallback(async (projectId: string, text: string, author: User) => {
    playSentSound();
    optimisticTouch(projectId);
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
        id: tempId,
        text,
        author,
        createdAt: new Date().toISOString(),
    };

    setState(prevState => {
        const project = prevState.projects[projectId];
        if (!project) return prevState;
        const newState = {
            ...prevState,
            projects: {
                ...prevState.projects,
                [projectId]: {
                    ...project,
                    chatMessages: [...project.chatMessages, optimisticMessage],
                    updatedAt: new Date().toISOString()
                }
            }
        };
        syncCache(newState);
        return newState;
    });

    try {
        await api.data.sendChatMessage(projectId, text, author.id);
    } catch (error) {
        setState(prevState => {
            const project = prevState.projects[projectId];
            if (!project) return prevState;
            return {
                ...prevState,
                projects: {
                    ...prevState.projects,
                    [projectId]: { ...project, chatMessages: project.chatMessages.filter(m => m.id !== tempId) }
                }
            }
        });
    }
  }, []);
  
  const addProjectLink = useCallback(async (projectId: string, title: string, url: string, creatorId: string) => {
    optimisticTouch(projectId);
    await api.data.addProjectLink(projectId, title, url, creatorId);
    await fetchData();
  }, [fetchData]);

  const deleteProjectLink = useCallback(async (linkId: string) => {
      // FIX: Cast Object.values to Project[] to avoid unknown type errors when searching for the project containing the link.
      const projectEntry = (Object.values(state.projects) as Project[]).find(p => p.links.some(l => l.id === linkId));
      if (projectEntry) optimisticTouch(projectEntry.id);
      await api.data.deleteProjectLink(linkId);
      await fetchData();
  }, [fetchData, state.projects]);

  const addBug = useCallback(async (projectId: string, bugData: { title: string, description: string, priority: TaskPriority }) => {
    if (!currentUser) return;
    const project = state.projects[projectId];
    if (!project) return;
    optimisticTouch(projectId);
    const firstColumn = project.board.columns[project.board.columnOrder[0]];
    const initialStatus = firstColumn ? firstColumn.title : 'New';

    await api.data.addBug({
        ...bugData,
        projectId,
        status: initialStatus,
        reporterId: currentUser.id,
    });
    await fetchData();
  }, [fetchData, currentUser, state.projects]);

  const addBugsBatch = useCallback(async (projectId: string, parsedBugs: BugResponse[]) => {
    if (!currentUser) return;
    const project = state.projects[projectId];
     if (!project) return;
    optimisticTouch(projectId);
    const firstColumn = project.board.columns[project.board.columnOrder[0]];
    const initialStatus = firstColumn ? firstColumn.title : 'New';

    if (parsedBugs.length > 0) {
        const bugsToCreate = parsedBugs.map(b => ({
            title: b.title,
            description: b.description,
            project_id: projectId, 
            priority: TaskPriority.MEDIUM,
            status: initialStatus,
            reporter_id: currentUser.id, 
        }));
        await api.data.addBugsBatch(bugsToCreate);
        await fetchData();
    }
  }, [fetchData, currentUser, state.projects]);

  const updateBug = useCallback(async (bugId: string, updates: Partial<Bug>) => {
    const projectEntry = (Object.entries(state.projects) as [string, Project][]).find(([_, p]) => p.bugs && p.bugs[bugId]);
    if (projectEntry) optimisticTouch(projectEntry[0]);

    setState(prevState => {
        const projectEntryLocal = (Object.entries(prevState.projects) as [string, Project][]).find(([_, p]) => p.bugs && p.bugs[bugId]);
        if (!projectEntryLocal) return prevState;
        const [projectId, project] = projectEntryLocal;
        
        const newState = {
            ...prevState,
            projects: {
                ...prevState.projects,
                [projectId]: {
                    ...(project as Project),
                    bugs: {
                        ...(project as Project).bugs,
                        [bugId]: { ...(project as Project).bugs[bugId], ...updates }
                    },
                    updatedAt: new Date().toISOString()
                }
            }
        };
        syncCache(newState);
        return newState;
    });

    try {
        const { title, description, priority, status, assignee } = updates;
        await api.data.updateBug(bugId, {
            title,
            description,
            priority,
            status,
            assigneeId: assignee?.id ?? (assignee === undefined ? undefined : null), 
        });
    } catch (err) {
        await fetchData();
    }
  }, [fetchData, state.projects]);

  const deleteBug = useCallback(async (bugId: string) => {
    // FIX: Cast Object.values to Project[] to avoid unknown type errors when searching for the project containing the bug.
    const projectEntry = (Object.values(state.projects) as Project[]).find(p => p.bugs && p.bugs[bugId]);
    if (projectEntry) optimisticTouch(projectEntry.id);
    await api.data.deleteBug(bugId);
    await fetchData();
  }, [fetchData, state.projects]);

  const deleteBugsBatch = useCallback(async (bugIds: string[]) => {
    if (bugIds.length > 0) {
        // FIX: Cast Object.values to Project[] to avoid unknown type errors when searching for the project containing the bugs.
        const projectEntry = (Object.values(state.projects) as Project[]).find(p => p.bugs && p.bugs[bugIds[0]]);
        if (projectEntry) optimisticTouch(projectEntry.id);
    }
    await api.data.deleteBugsBatch(bugIds);
    await fetchData();
  }, [fetchData, state.projects]);

  const addSprint = useCallback(async (projectId: string, sprintData: Omit<Sprint, 'id' | 'projectId' | 'createdAt' | 'status' | 'isDefault'> & { isDefault?: boolean }): Promise<Sprint> => {
    optimisticTouch(projectId);
    const newSprint = await api.data.addSprint({ ...sprintData, projectId });
    await fetchData();
    return newSprint;
  }, [fetchData]);

  const updateSprint = useCallback(async (projectId: string, sprintId: string, updates: Partial<Sprint>) => {
    optimisticTouch(projectId);
    await api.data.updateSprint(sprintId, updates);
    await fetchData();
  }, [fetchData]);

  const deleteSprint = useCallback(async (projectId: string, sprintId: string) => {
    optimisticTouch(projectId);
    await api.data.deleteSprint(sprintId);
    await fetchData();
  }, [fetchData]);

  const bulkUpdateTaskSprint = useCallback(async (taskIds: string[], sprintId: string | null) => {
    if (taskIds.length > 0) {
        // FIX: Cast Object.values to Project[] to avoid unknown type errors when searching for the project containing the tasks.
        const projectEntry = (Object.values(state.projects) as Project[]).find(p => p.board.tasks[taskIds[0]]);
        if (projectEntry) optimisticTouch(projectEntry.id);
    }
    await api.data.bulkUpdateTaskSprint(taskIds, sprintId);
    await fetchData();
  }, [fetchData, state.projects]);

  const completeSprint = async (sprintId: string, moveToSprintId: string | null) => {
    // FIX: Cast Object.values to Project[] to avoid unknown type errors when searching for the project containing the sprint.
    const projectEntry = (Object.values(state.projects) as Project[]).find(p => p.sprints.some(s => s.id === sprintId));
    if (projectEntry) optimisticTouch(projectEntry.id);
    await api.data.completeSprint(sprintId, moveToSprintId);
    await fetchData();
  };

  const addFilterSegment = useCallback(async (projectId: string, name: string, filters: FilterSegment['filters'], creatorId: string) => {
    optimisticTouch(projectId);
    await api.data.addFilterSegment(projectId, name, filters, creatorId);
    await fetchData();
  }, [fetchData]);

  const updateFilterSegment = async (segmentId: string, updates: { name?: string, filters?: FilterSegment['filters'] }) => {
    // FIX: Cast Object.values to Project[] to avoid unknown type errors when searching for the project containing the filter segment.
    const projectEntry = (Object.values(state.projects) as Project[]).find(p => p.filterSegments.some(s => s.id === segmentId));
    if (projectEntry) optimisticTouch(projectEntry.id);
    await api.data.updateFilterSegment(segmentId, updates);
    await fetchData();
  };

  const deleteFilterSegment = useCallback(async (segmentId: string) => {
    // FIX: Cast Object.values to Project[] to avoid unknown type errors when searching for the project containing the filter segment.
    const projectEntry = (Object.values(state.projects) as Project[]).find(p => p.filterSegments.some(s => s.id === segmentId));
    if (projectEntry) optimisticTouch(projectEntry.id);
    await api.data.deleteFilterSegment(segmentId);
    await fetchData();
  }, [fetchData, state.projects]);


  return { state, loading, fetchData, onDragEnd, updateTask, addSubtasks, updateSubtask, deleteSubtask, addComment, addTask, addAiTask, deleteTask, addColumn, deleteColumn, addProject, addProjectFromPlan, deleteProject, updateUserProfile, updateProjectMembers, sendChatMessage, addProjectLink, deleteProjectLink, addBug, updateBug, deleteBug, addBugsBatch, deleteBugsBatch, addTasksBatch, addSprint, updateSprint, deleteSprint, bulkUpdateTaskSprint, completeSprint, addFilterSegment, updateFilterSegment, deleteFilterSegment };
};

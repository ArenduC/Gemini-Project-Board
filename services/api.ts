import { supabase } from './supabase';
import { User, Project, NewTaskData, Task, AppState, ChatMessage, ProjectInviteLink, UserRole, Subtask, Sprint, FilterSegment, BugResponse, Column, TaskHistory } from '../types';
import { Session, RealtimeChannel, AuthChangeEvent, User as SupabaseUser } from '@supabase/supabase-js';

/**
 * Helper to convert an array of objects with an 'id' property into a Record (dictionary).
 */
const arrayToRecord = <T extends { id: string }>(arr: T[]): Record<string, T> => {
    return arr.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
    }, {} as Record<string, T>);
};

// --- AUTH FUNCTIONS ---

const onAuthStateChange = (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
    return supabase.auth.onAuthStateChange(callback);
};

const getSession = async () => {
    return await supabase.auth.getSession();
};

const getUserProfile = async (userId: string): Promise<User | null> => {
    const { data: userProfile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
    if (error && error.code !== 'PGRST116') { 
        console.error("Error fetching user profile:", error.message || error);
        throw error; 
    }
    return userProfile as User;
};

const createUserProfile = async (supabaseUser: SupabaseUser): Promise<User> => {
    const name = supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'New User';
    
    const { data, error } = await supabase
        .from('users')
        .insert({
            id: supabaseUser.id,
            name,
            role: UserRole.MEMBER, 
            avatar_url: '' 
        })
        .select()
        .single();
    
    if (error) {
        console.error("Error creating user profile:", error);
        throw error;
    }
    
    return data as User;
};

const updateUserProfile = async (userId: string, updates: { name: string }): Promise<User> => {
    const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
    if (error) {
        console.error("Error updating user profile:", error.message || error);
        throw error;
    }
    return data as User;
};

const signOut = async () => {
    return await supabase.auth.signOut();
};

const signInWithPassword = async ({ email, password }: { email: string, password: string }) => {
    return await supabase.auth.signInWithPassword({ email, password });
};

const signUp = async ({ email, password, name }: { email: string, password: string, name: string }) => {
    return await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${window.location.origin}/callback`,
            data: {
                name: name,
            }
        }
    });
};

const sendPasswordResetEmail = async (email: string) => {
    return await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
    });
};

const resendConfirmationEmail = async (email: string) => {
    return await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
            emailRedirectTo: `${window.location.origin}/callback`,
        }
    });
};

const updateUserPassword = async (password: string) => {
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) {
        console.error("Error updating password:", error.message || error);
        throw error;
    }
    return data;
};

// --- REALTIME FUNCTIONS ---

const isConfigured = () => !!supabase.realtime;

const getPresenceChannel = () => {
    return supabase.channel('online-users', {
      config: {
        presence: {
          key: '', 
        },
      },
    });
};

const removeChannel = (channel: RealtimeChannel) => {
    supabase.removeChannel(channel);
};

// --- DATA FUNCTIONS ---

const logTaskHistory = async (taskId: string, userId: string, description: string) => {
    try {
        await supabase.from('task_history').insert({
            task_id: taskId,
            user_id: userId,
            change_description: description
        });
    } catch (e) {
        console.warn("Failed to log history:", e);
    }
};

const fetchTaskHistory = async (taskId: string): Promise<TaskHistory[]> => {
    const { data, error } = await supabase.rpc('get_task_history_v2', {
        task_id_param: taskId
    });
    if (error) {
        console.error("Error fetching task history:", error);
        return [];
    }
    return (data || []).map((row: any) => ({
        id: row.id,
        changeDescription: row.change_description,
        createdAt: row.created_at,
        user: {
            id: row.user_id,
            name: row.user_name || 'System',
            avatarUrl: row.user_avatar_url,
            role: UserRole.MEMBER
        }
    }));
};

const fetchInitialData = async (userId: string): Promise<AppState> => {
    const { data: rpcData, error } = await supabase.rpc('get_initial_data_for_user', {
        user_id_param: userId
    });

    if (error) {
        console.error("Error fetching initial data via RPC:", error);
        throw error;
    }

    if (!rpcData) {
        return { projects: {}, users: {}, projectOrder: [] };
    }

    const rawProjects = rpcData.projects || [];
    const usersData = rpcData.users || [];
    
    const processedProjects = rawProjects.map((p: any) => {
        let board = p.board;
        
        // --- DATA SANITY CHECK ---
        if (board && board.tasks) {
            Object.keys(board.tasks).forEach(taskId => {
                const task = board.tasks[taskId];
                if (!task.tags || !Array.isArray(task.tags)) {
                    task.tags = [];
                }
                if (!task.history) task.history = [];
            });
        }

        // --- COLUMNS ORDERING ---
        if (board && Array.isArray(board.columns)) {
            const columnsArray = board.columns as Column[];
            const columnsRecord = arrayToRecord(columnsArray);
            const columnOrder = columnsArray.map(c => c.id);
            
            board = {
                ...board,
                columns: columnsRecord,
                columnOrder: columnOrder
            };
        }
        
        return { 
            ...p, 
            board,
            filterSegments: p.filterSegments || [],
            bugs: p.bugs || {},
            bugOrder: p.bugOrder || [],
            members: p.members || [] 
        };
    }) as Project[];

    const usersRecord = arrayToRecord(usersData as User[]);
    const projectsRecord = arrayToRecord(processedProjects);
    const projectOrder = processedProjects.map((p: Project) => p.id);

    return {
        projects: projectsRecord,
        users: usersRecord,
        projectOrder,
    };
};

const subscribeToProjectChat = (projectId: string, callback: (payload: any) => void) => {
    const channel = supabase.channel(`project-chat-${projectId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'project_chats',
            filter: `project_id=eq.${projectId}`
        }, callback)
        .subscribe();
    return channel;
};

const moveTask = async (taskId: string, newColumnId: string, newPosition: number, actorId: string) => {
    const { error } = await supabase.rpc('move_task', {
        task_id: taskId,
        new_column_id: newColumnId,
        new_position: newPosition,
        actor_id: actorId
    });

    if (error) {
        console.error("Error moving task via RPC:", error.message);
        throw error;
    }
};

const updateColumnOrder = async (projectId: string, newOrder: string[]) => {
    const { error } = await supabase.rpc('update_column_order', { 
        target_project_id: projectId, 
        new_order_ids: newOrder 
    });
    if (error) {
        console.error("Error updating column order via RPC:", error.message);
        throw error;
    }
};

const updateTask = async (updatedTask: Task, actorId: string, allUsers: User[]) => {
    // Note: Use RPC with explicit casting handled on server
    const { error } = await supabase.rpc('update_task_v2', {
        task_id_param: updatedTask.id,
        title_param: updatedTask.title,
        description_param: updatedTask.description,
        priority_param: updatedTask.priority,
        assignee_id_param: updatedTask.assignee?.id || null,
        due_date_param: updatedTask.dueDate || null,
        sprint_id_param: updatedTask.sprintId || null,
        tags_param: updatedTask.tags || [],
        actor_id_param: actorId
    });

    if (error) {
        console.error("Supabase RPC error updating task:", error.message, error.code);
        throw error;
    }
};

const addSubtasks = async (taskId: string, subtasks: Partial<Subtask>[], creatorId: string) => {
    const rows = subtasks.map(s => ({
        task_id: taskId,
        title: s.title,
        creator_id: creatorId,
        assignee_id: s.assigneeId || null,
        completed: !!s.completed
    }));
    const { data, error } = await supabase.from('subtasks').insert(rows).select();
    if (error) throw error;
    await logTaskHistory(taskId, creatorId, `added ${subtasks.length} sub-nodes`);
    return data;
};

const updateSubtask = async (subtaskId: string, updates: Partial<Subtask>) => {
    const { error } = await supabase
        .from('subtasks')
        .update({
            title: updates.title,
            completed: updates.completed,
            assignee_id: updates.assigneeId === undefined ? undefined : (updates.assigneeId || null)
        })
        .eq('id', subtaskId);
    if (error) throw error;
};

const deleteSubtask = async (subtaskId: string) => {
    const { error } = await supabase.from('subtasks').delete().eq('id', subtaskId);
    if (error) throw error;
};

const addComment = async (taskId: string, text: string, authorId: string) => {
    await supabase.from('comments').insert({ task_id: taskId, author_id: authorId, text });
    await logTaskHistory(taskId, authorId, `added a comment: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);
};

const addTask = async (taskData: NewTaskData, creatorId: string) => {
    const { data, error } = await supabase.from('tasks').insert({
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        column_id: taskData.columnId,
        assignee_id: taskData.assigneeId || null,
        due_date: taskData.dueDate || null,
        sprint_id: taskData.sprintId || null,
        creator_id: creatorId,
        tags: [] 
    }).select().single();
    if (error) throw error;
    
    await logTaskHistory(data.id, creatorId, 'created the task node');
    return data;
};

const addTasksBatch = async (tasks: any[]) => {
    const { data, error } = await supabase.from('tasks').insert(tasks).select();
    if (error) throw error;
    
    if (data) {
        for (const task of data) {
            await logTaskHistory(task.id, task.creator_id, 'imported node via data stream');
        }
    }
    
    return data;
};

const deleteTask = async (taskId: string) => {
    await supabase.from('tasks').delete().eq('id', taskId);
};

const addColumn = async (projectId: string, title: string) => {
    const { data, error } = await supabase.from('columns').insert({ 
        project_id: projectId, 
        title,
        position: 999 
    }).select().single();
    if (error) throw error;
    return data;
};

const deleteColumn = async (columnId: string) => {
    await supabase.from('columns').delete().eq('id', columnId);
};

const addProject = async (name: string, description: string, creatorId: string) => {
    const { data: project, error: projectError } = await supabase.from('projects').insert({ name, description, creator_id: creatorId }).select().single();
    if (projectError) throw projectError;

    const { error: memberError } = await supabase.from('project_members').insert({ project_id: project.id, user_id: creatorId });
    if (memberError) {
        console.error("Warning: Could not add creator as initial member:", memberError);
    }

    await supabase.from('columns').insert([
        { project_id: project.id, title: 'To Do', position: 1 },
        { project_id: project.id, title: 'In Progress', position: 2 },
        { project_id: project.id, title: 'Done', position: 3 }
    ]);
    
    return project;
};

const createProjectShell = async (name: string, description: string, creatorId: string) => {
    const { data: project, error: projectError } = await supabase.from('projects').insert({ name, description, creator_id: creatorId }).select().single();
    if (projectError) throw projectError;

    await supabase.from('project_members').insert({ project_id: project.id, user_id: creatorId });

    return project;
};

const deleteProject = async (projectId: string) => {
    await supabase.from('projects').delete().eq('id', projectId);
};

const updateProjectMembers = async (projectId: string, memberIds: string[]) => {
    await supabase.from('project_members').delete().eq('project_id', projectId);
    await supabase.from('project_members').insert(memberIds.map(uid => ({ project_id: projectId, user_id: uid })));
};

const sendChatMessage = async (projectId: string, text: string, authorId: string) => {
    await supabase.from('project_chats').insert({ project_id: projectId, author_id: authorId, text });
};

const addProjectLink = async (projectId: string, title: string, url: string, creatorId: string) => {
    await supabase.from('project_links').insert({ project_id: projectId, title, url, creator_id: creatorId });
};

const deleteProjectLink = async (linkId: string) => {
    await supabase.from('project_links').delete().eq('id', linkId);
};

const addBug = async (bugData: any) => {
    await supabase.from('bugs').insert({
        project_id: bugData.projectId,
        title: bugData.title,
        description: bugData.description,
        priority: bugData.priority,
        status: bugData.status,
        reporter_id: bugData.reporterId,
        assignee_id: bugData.assigneeId || null
    });
};

const addBugsBatch = async (bugs: any[]) => {
    await supabase.from('bugs').insert(bugs);
};

const updateBug = async (bugId: string, updates: any) => {
    await supabase.from('bugs').update({
        title: updates.title,
        description: updates.description,
        priority: updates.priority,
        status: updates.status,
        assignee_id: updates.assigneeId
    }).eq('id', bugId);
};

const deleteBug = async (bugId: string) => {
    await supabase.from('bugs').delete().eq('id', bugId);
};

const deleteBugsBatch = async (bugIds: string[]) => {
    await supabase.from('bugs').delete().in('id', bugIds);
};

const addSprint = async (sprintData: any) => {
    const { data, error } = await supabase.from('sprints').insert({
        project_id: sprintData.projectId,
        name: sprintData.name,
        goal: sprintData.goal,
        start_date: sprintData.startDate,
        end_date: sprintData.endDate,
        is_default: !!sprintData.isDefault
    }).select().single();
    if (error) throw error;
    return data;
};

const updateSprint = async (sprintId: string, updates: any) => {
    await supabase.from('sprints').update({
        name: updates.name,
        goal: updates.goal,
        start_date: updates.startDate,
        end_date: updates.endDate,
        is_default: updates.isDefault,
        status: updates.status
    }).eq('id', sprintId);
};

const deleteSprint = async (sprintId: string) => {
    await supabase.from('sprints').delete().eq('id', sprintId);
};

const bulkUpdateTaskSprint = async (taskIds: string[], sprintId: string | null) => {
    await supabase.from('tasks').update({ sprint_id: sprintId }).in('id', taskIds);
};

const completeSprint = async (sprintId: string, moveToSprintId: string | null) => {
    await updateSprint(sprintId, { status: 'completed' });
    const { data: incompleteTasks } = await supabase.from('tasks')
        .select('id, columns(title)')
        .eq('sprint_id', sprintId);
    
    if (incompleteTasks) {
        const idsToMove = incompleteTasks
            .filter((t: any) => t.columns.title.toLowerCase() !== 'done')
            .map((t: any) => t.id);
        
        if (idsToMove.length > 0) {
            await bulkUpdateTaskSprint(idsToMove, moveToSprintId);
        }
    }
};

const addFilterSegment = async (projectId: string, name: string, filters: any, creatorId: string) => {
    await supabase.from('filter_segments').insert({ project_id: projectId, name, filters, creator_id: creatorId });
};

const updateFilterSegment = async (segmentId: string, updates: any) => {
    await supabase.from('filter_segments').update(updates).eq('id', segmentId);
};

const deleteFilterSegment = async (segmentId: string) => {
    await supabase.from('filter_segments').delete().eq('id', segmentId);
};

const acceptInvite = async (token: string) => {
    const { data, error } = await supabase.rpc('accept_project_invite', { token_param: token });
    if (error) throw error;
    return data;
};

const submitFeedback = async (feedbackData: any) => {
    await supabase.from('feedback').insert(feedbackData);
};

const getInviteLinksForProject = async (projectId: string) => {
    const { data, error } = await supabase.from('project_invites').select('*').eq('project_id', projectId);
    if (error) throw error;
    return data;
};

const createInviteLink = async (projectId: string, creatorId: string, role: UserRole, expiresDays: number | null) => {
    const expiresAt = expiresDays ? new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString() : null;
    await supabase.from('project_invites').insert({
        project_id: projectId,
        created_by: creatorId,
        role,
        expires_at: expiresAt,
        token: crypto.randomUUID()
    });
};

const updateInviteLink = async (linkId: string, updates: any) => {
    await supabase.from('project_invites').update(updates).eq('id', linkId);
};

/**
 * The central API object exported to the application.
 */
export const api = {
    auth: {
        onAuthStateChange,
        getSession,
        getUserProfile,
        createUserProfile,
        updateUserProfile,
        signOut,
        signInWithPassword,
        signUp,
        sendPasswordResetEmail,
        resendConfirmationEmail,
        updateUserPassword
    },
    realtime: {
        isConfigured,
        getPresenceChannel,
        removeChannel
    },
    data: {
        fetchInitialData,
        subscribeToProjectChat,
        moveTask,
        updateColumnOrder,
        updateTask,
        addSubtasks,
        updateSubtask,
        deleteSubtask,
        addComment,
        addTask,
        addTasksBatch,
        deleteTask,
        addColumn,
        deleteColumn,
        addProject,
        createProjectShell,
        deleteProject,
        updateProjectMembers,
        sendChatMessage,
        addProjectLink,
        deleteProjectLink,
        addBug,
        addBugsBatch,
        updateBug,
        deleteBug,
        deleteBugsBatch,
        addSprint,
        updateSprint,
        deleteSprint,
        bulkUpdateTaskSprint,
        completeSprint,
        addFilterSegment,
        updateFilterSegment,
        deleteFilterSegment,
        acceptInvite,
        submitFeedback,
        getInviteLinksForProject,
        createInviteLink,
        updateInviteLink,
        fetchTaskHistory
    }
};

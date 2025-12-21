import { supabase, Json } from './supabase';
import { User, Project, BoardData, NewTaskData, Task, AppState, ChatMessage, TaskHistory, ProjectInviteLink, UserRole, InviteAccessType, ProjectLink, Column, FeedbackType, Bug, TaskPriority, Subtask, Sprint, FilterSegment } from '../types';
import { Session, RealtimeChannel, AuthChangeEvent, User as SupabaseUser } from '@supabase/supabase-js';

// Helper to transform array from DB into the state's Record<string, T> format
const arrayToRecord = <T extends { id: string }>(arr: T[]): Record<string, T> => {
    return arr.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
    }, {} as Record<string, T>);
};

// --- AUTHENTICATION ---

// FIX: Updated function to correctly proxy the call to `supabase.auth.onAuthStateChange`.
// This resolves issues with both the return type for destructuring and the callback signature.
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
    if (error && error.code !== 'PGRST116') { // PGRST116: "exact one row not found" which is a valid case
        console.error("Error fetching user profile:", error.message || error);
        throw error; // Propagate auth errors to be handled by the caller
    }
    return userProfile as User;
};

const createUserProfile = async (supabaseUser: SupabaseUser): Promise<User> => {
    // Use name from signup metadata, fallback to a name derived from email.
    const name = supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'New User';
    
    const { data, error } = await supabase
        .from('users')
        .insert({
            id: supabaseUser.id,
            name,
            role: UserRole.MEMBER, // Assign a default role
            avatar_url: '' // Default avatar
        })
        .select()
        .single();
    
    if (error) {
        console.error("Error creating user profile:", error);
        // This could happen if RLS prevents insertion or if there's a race condition
        // where the profile was created by a trigger just now.
        // A more advanced implementation might re-fetch the profile here.
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


// --- REALTIME ---
// FIX: Renamed function to match its export key in the `api` object.
const isConfigured = () => supabase.realtime !== null;

const getPresenceChannel = () => {
    return supabase.channel('online-users', {
      config: {
        presence: {
          key: '', // a key is not needed for simple presence tracking
        },
      },
    });
};

const removeChannel = (channel: RealtimeChannel) => {
    supabase.removeChannel(channel);
};

// --- DATA FETCHING ---

const fetchInitialData = async (userId: string): Promise<Omit<AppState, 'projectOrder'> & {projectOrder: string[]}> => {
    // Call the new database function to get all data in a single, reliable call.
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

    // The RPC function returns data pre-formatted to match the app's state structure.
    const usersData = rpcData.users || [];
    const projectsData = rpcData.projects || [];
    
    const usersRecord = arrayToRecord(usersData as User[]);
    const projectsRecord = arrayToRecord(projectsData as Project[]);
    const projectOrder = projectsData.map((p: any) => p.id).sort((a: string, b: string) => a.localeCompare(b));

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

// --- DATA MUTATION ---

const moveTask = async (taskId: string, newColumnId: string, newPosition: number, actorId: string) => {
    const { data: taskData, error: fetchError } = await supabase
        .from('tasks')
        .select('column_id, column:columns(id, title)')
        .eq('id', taskId)
        .single();
    
    const { data: newColumnData, error: fetchNewColError } = await supabase
        .from('columns')
        .select('title')
        .eq('id', newColumnId)
        .single();

    if (!fetchError && !fetchNewColError && taskData) {
        if (taskData.column_id !== newColumnId && newColumnData) {
            const oldColumnName = (taskData as any).column?.title;
            const newColumnName = newColumnData.title;
            const change_description = `moved this task from '${oldColumnName || 'No Column'}' to '${newColumnName}'`;

            try {
                const { error: historyError } = await supabase.from('task_history').insert({
                    id: crypto.randomUUID(),
                    task_id: taskId,
                    user_id: actorId,
                    change_description,
                });
                if (historyError) {
                    console.warn("Could not log task move history:", historyError.message || historyError);
                }
            } catch (error) {
                console.warn("Error inserting into task_history:", error);
            }
        }
    }

    const { error } = await supabase.rpc('move_task', {
        task_id: taskId,
        new_column_id: newColumnId,
        new_position: newPosition
    });
    if (error) console.error("Error moving task:", (error as any).message || error);
};

const updateTask = async (updatedTask: Task, actorId: string, allUsers: User[]) => {
    // Fetch old task data for comparison to create history logs
    const { data: oldTaskDataResult, error: fetchError } = await supabase
        .from('tasks')
        .select('*, assignee:users!tasks_assignee_id_fkey(*), subtasks(*, assignee:users!subtasks_assignee_id_fkey(*))')
        .eq('id', updatedTask.id)
        .single();

    // FIX: Cast Supabase result to any to avoid "unknown" type errors when accessing properties.
    const oldTaskData = oldTaskDataResult as any;
    const historyItems: { task_id: string; user_id: string; change_description: string; }[] = [];

    if (fetchError) {
        console.warn("Error fetching old task for history logging:", fetchError.message || fetchError);
    } else {
        if (oldTaskData.title !== updatedTask.title) {
            historyItems.push({ task_id: updatedTask.id, user_id: actorId, change_description: `changed the title to "${updatedTask.title}"` });
        }
        if (oldTaskData.description !== updatedTask.description) {
            historyItems.push({ task_id: updatedTask.id, user_id: actorId, change_description: `updated the description` });
        }
        if (oldTaskData.priority !== updatedTask.priority) {
            historyItems.push({ task_id: updatedTask.id, user_id: actorId, change_description: `set the priority to ${updatedTask.priority}` });
        }
        if (oldTaskData.assignee?.id !== updatedTask.assignee?.id) {
            if (updatedTask.assignee) {
                historyItems.push({ task_id: updatedTask.id, user_id: actorId, change_description: `assigned this task to ${updatedTask.assignee.name}` });
            } else {
                historyItems.push({ task_id: updatedTask.id, user_id: actorId, change_description: `unassigned this task` });
            }
        }
        if (oldTaskData.due_date !== updatedTask.dueDate) {
            const dateDescription = updatedTask.dueDate ? `set the due date to ${new Date(updatedTask.dueDate).toLocaleDateString()}` : 'removed the due date';
            historyItems.push({ task_id: updatedTask.id, user_id: actorId, change_description: dateDescription });
        }
        // History for sprint change
        if (oldTaskData.sprint_id !== updatedTask.sprintId) {
            const { data: columnData } = await supabase.from('columns').select('project_id').eq('id', oldTaskData.column_id as string).single();
            // FIX: Ensure projectId is treated as a string to avoid type errors. Cast columnData to any to safely access project_id.
            const projectId = (columnData as any)?.project_id as string;
            if (projectId) {
                const { data: allSprintsResult } = await supabase.from('sprints').select('id, name').eq('project_id', projectId);
                // FIX: Cast result to any[] to avoid "unknown" type errors.
                const allSprints = allSprintsResult as any[] | null;
                const oldSprintName = allSprints?.find(s => s.id === oldTaskData.sprint_id)?.name;
                const newSprintName = allSprints?.find(s => s.id === updatedTask.sprintId)?.name;
                
                let change_description = '';
                if (newSprintName && oldSprintName) {
                     change_description = `moved this task from sprint "${oldSprintName}" to "${newSprintName}"`;
                } else if (newSprintName) {
                    change_description = `moved this task to sprint "${newSprintName}"`;
                } else if (oldSprintName) {
                    change_description = `removed this task from sprint "${oldSprintName}"`;
                }
    
                if (change_description) {
                    historyItems.push({ task_id: updatedTask.id, user_id: actorId, change_description });
                }
            }
        }


        // History for subtasks
        const oldSubtasks: Subtask[] = oldTaskData.subtasks || [];
        const newSubtasks = updatedTask.subtasks || [];
        
        // Deleted
        const subtasksDeleted = oldSubtasks.filter(os => !newSubtasks.some(ns => ns.id === os.id));
        subtasksDeleted.forEach(s => {
            historyItems.push({ task_id: updatedTask.id, user_id: actorId, change_description: `deleted subtask: "${s.title}"` });
        });
        
        oldSubtasks.forEach(os => {
            const matchingNew = newSubtasks.find(ns => ns.id === os.id);
            if (!matchingNew) return;

            // Renamed
            if (os.title !== matchingNew.title) {
                historyItems.push({ task_id: updatedTask.id, user_id: actorId, change_description: `renamed subtask from "${os.title}" to "${matchingNew.title}"` });
            }

            // Toggled completion
            if (os.completed !== matchingNew.completed) {
                const action = matchingNew.completed ? 'completed' : 'un-completed';
                historyItems.push({ task_id: updatedTask.id, user_id: actorId, change_description: `${action} subtask: "${matchingNew.title}"` });
            }

            // Assigned/Unassigned
            if (os.assigneeId !== matchingNew.assigneeId) {
                let changeDescription = '';
                if (matchingNew.assigneeId) {
                    const assigneeName = allUsers.find(u => u.id === matchingNew.assigneeId)?.name || 'a user';
                    changeDescription = `assigned subtask "${matchingNew.title}" to ${assigneeName}`;
                } else {
                    changeDescription = `unassigned subtask "${matchingNew.title}"`;
                }
                historyItems.push({ task_id: updatedTask.id, user_id: actorId, change_description: changeDescription });
            }
        });
        
        // History for tags
        const { data: oldTagData, error: tagFetchError } = await supabase
            .from('task_tags')
            .select('tags!inner(name)')
            .eq('task_id', updatedTask.id);

        if (!tagFetchError && oldTagData) {
            const oldTags: string[] = (oldTagData as any[]).map((item: any) => item.tags.name);
            const newTags = updatedTask.tags || [];

            const tagsAdded = newTags.filter(t => !oldTags.includes(t));
            const tagsRemoved = oldTags.filter(t => !newTags.includes(t));

            if (tagsAdded.length > 0) {
                historyItems.push({ task_id: updatedTask.id, user_id: actorId, change_description: `added tags: ${tagsAdded.join(', ')}` });
            }
            if (tagsRemoved.length > 0) {
                historyItems.push({ task_id: updatedTask.id, user_id: actorId, change_description: `removed tags: ${tagsRemoved.join(', ')}` });
            }
        }
    }

    if (historyItems.length > 0) {
        const { error: historyError } = await supabase.from('task_history').insert(historyItems);
        if (historyError) {
            console.warn("Could not log task update history:", historyError.message);
        }
    }
    
    // Perform the actual update on the tasks table
    const { error: taskUpdateError } = await supabase
      .from('tasks')
      .update({
        title: updatedTask.title,
        description: updatedTask.description,
        priority: updatedTask.priority,
        assignee_id: updatedTask.assignee?.id || null,
        due_date: updatedTask.dueDate || null,
        sprint_id: updatedTask.sprintId,
      })
      .eq('id', updatedTask.id);

    if (taskUpdateError) {
        console.error("Error updating task:", taskUpdateError);
        throw taskUpdateError;
    }

    // --- TAGS UPDATE LOGIC ---
    const tagNames = updatedTask.tags || [];

    // Delete existing associations first.
    const { error: deleteError } = await supabase.from('task_tags').delete().eq('task_id', updatedTask.id);
    if (deleteError) throw deleteError;

    if (tagNames.length > 0) {
        // Upsert tags to ensure they exist and get their IDs.
        const { data: upsertedTagsData, error: upsertTagsError } = await supabase.from('tags').upsert(
            tagNames.map(name => ({ name })),
            { onConflict: 'name' } as any
        ).select('id, name');

        if (upsertTagsError) throw upsertTagsError;
        if (!upsertedTagsData) throw new Error("Could not upsert tags.");

        const tagIdMap = new Map(upsertedTagsData.map(t => [t.name, t.id]));

        // Create new associations
        const newAssociations = tagNames.map(name => ({
            task_id: updatedTask.id,
            tag_id: tagIdMap.get(name) as string
        })).filter(assoc => assoc.tag_id);

        if (newAssociations.length > 0) {
            const { error: insertError } = await supabase.from('task_tags').insert(newAssociations);
            if (insertError) throw insertError;
        }
    }
    // --- END TAGS UPDATE LOGIC ---

    // Update subtasks
    if (updatedTask.subtasks) {
        const { data: currentSubtasks, error: fetchSubtasksError } = await supabase
            .from('subtasks')
            .select('id')
            .eq('task_id', updatedTask.id);

        if (fetchSubtasksError) {
            console.error("Error fetching current subtasks:", fetchSubtasksError);
            throw fetchSubtasksError;
        }

        const currentSubtaskIds = new Set((currentSubtasks as any[]).map(s => s.id));
        const updatedSubtaskIds = new Set(updatedTask.subtasks.map(s => s.id));
        const subtasksToDelete = Array.from(currentSubtaskIds).filter(id => !updatedSubtaskIds.has(id));

        if (subtasksToDelete.length > 0) {
            const { error: deleteSubtasksError } = await supabase
                .from('subtasks')
                .delete()
                .in('id', subtasksToDelete as string[]);
            
            if (deleteSubtasksError) {
                console.error("Error deleting subtasks:", deleteSubtasksError);
                throw deleteSubtasksError;
            }
        }

        if (updatedTask.subtasks.length > 0) {
            const { error: subtasksError } = await supabase.from('subtasks').upsert(
                updatedTask.subtasks.map(s => ({
                    id: s.id,
                    task_id: updatedTask.id,
                    title: s.title,
                    completed: s.completed,
                    creator_id: s.creatorId,
                    created_at: s.createdAt,
                    assignee_id: s.assigneeId || null,
                }))
            );
            if (subtasksError) {
                console.error("Error upserting subtasks:", subtasksError);
                throw subtasksError;
            }
        }
    }
};

const addTask = async (taskData: NewTaskData, creatorId: string): Promise<Task> => {
    const { data, error } = await supabase
        .from('tasks')
        .insert({
            title: taskData.title,
            description: taskData.description,
            priority: taskData.priority,
            column_id: taskData.columnId,
            assignee_id: taskData.assigneeId,
            creator_id: creatorId,
            due_date: taskData.dueDate,
            sprint_id: taskData.sprintId,
        })
        .select()
        .single();
    if (error) throw error;
    return data as Task;
};

const addTasksBatch = async (tasksData: (NewTaskData & { creator_id: string })[]): Promise<any[]> => {
    const tasksToInsert = tasksData.map(t => ({
        title: t.title,
        description: t.description,
        priority: t.priority,
        column_id: t.columnId,
        assignee_id: t.assigneeId,
        creator_id: t.creator_id,
        due_date: t.dueDate,
        sprint_id: t.sprintId,
    }));
    const { data, error } = await supabase.from('tasks').insert(tasksToInsert).select();
    if (error) throw error;
    return data;
};

const addSubtasks = async (taskId: string, subtasks: Partial<Subtask>[], creatorId: string) => {
    const subtasksToInsert = subtasks.map(s => ({
        task_id: taskId,
        title: s.title,
        creator_id: creatorId,
        assignee_id: s.assigneeId,
    }));
    const { error } = await supabase.from('subtasks').insert(subtasksToInsert);
    if (error) throw error;

    const historyItems = subtasks.map(s => ({
        task_id: taskId,
        user_id: creatorId,
        change_description: `added subtask: "${s.title}"`
    }));

    if (historyItems.length > 0) {
        const { error: historyError } = await supabase.from('task_history').insert(historyItems);
        if (historyError) {
            console.warn("Could not log subtask creation history:", historyError.message);
        }
    }
};

const addComment = async (taskId: string, text: string, authorId: string) => {
    const { error } = await supabase.from('comments').insert({
        task_id: taskId,
        text,
        author_id: authorId
    });
    if (error) throw error;
};

const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw error;
};

const addColumn = async (projectId: string, title: string) => {
    const { data, error } = await supabase.from('columns').insert({ project_id: projectId, title }).select().single();
    if (error) throw error;
    return data as Column;
};

const deleteColumn = async (columnId: string) => {
    const { error } = await supabase.from('columns').delete().eq('id', columnId);
    if (error) throw error;
};

const addProject = async (name: string, description: string, creatorId: string) => {
    const { data, error } = await supabase.rpc('create_new_project', {
        project_name: name,
        project_description: description,
        user_id: creatorId,
    });
    if (error) throw error;
    return data;
};

const createProjectShell = async (name: string, description: string, creatorId: string): Promise<Project> => {
     const { data, error } = await supabase
        .from('projects')
        .insert({ name, description, creator_id: creatorId })
        .select()
        .single();
    if (error) throw error;
    await supabase.from('project_members').insert({ project_id: data.id, user_id: creatorId });
    return data as Project;
};

const deleteProject = async (projectId: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw error;
};

const updateProjectMembers = async (projectId: string, memberIds: string[]) => {
    const { error } = await supabase.rpc('update_project_members', {
        p_id: projectId,
        member_ids: memberIds,
    });
    if (error) throw error;
};

const sendChatMessage = async (projectId: string, text: string, authorId: string) => {
    const { error } = await supabase.from('project_chats').insert({
        project_id: projectId,
        text,
        author_id: authorId,
    });
    if (error) throw error;
};

const addProjectLink = async (projectId: string, title: string, url: string, creatorId: string) => {
    const { error } = await supabase.from('project_links').insert({
        project_id: projectId,
        title,
        url,
        creator_id: creatorId
    });
    if (error) throw error;
};

const deleteProjectLink = async (linkId: string) => {
    const { error } = await supabase.from('project_links').delete().eq('id', linkId);
    if (error) throw error;
};

const addBug = async (bugData: Omit<Bug, 'id' | 'createdAt' | 'bugNumber' | 'position'> & { projectId: string }) => {
    const { error } = await supabase.from('bugs').insert({
        project_id: bugData.projectId,
        title: bugData.title,
        description: bugData.description,
        priority: bugData.priority,
        status: bugData.status,
        reporter_id: bugData.reporterId,
        assignee_id: bugData.assignee?.id,
    });
    if (error) throw error;
};

const addBugsBatch = async (bugsData: (Omit<Bug, 'id' | 'createdAt' | 'bugNumber' | 'position'> & { projectId: string })[]) => {
    const bugsToInsert = bugsData.map(b => ({
        project_id: b.projectId,
        title: b.title,
        description: b.description,
        priority: b.priority,
        status: b.status,
        reporter_id: b.reporterId,
        assignee_id: b.assignee?.id,
    }));
    const { error } = await supabase.from('bugs').insert(bugsToInsert);
    if (error) throw error;
};

const updateBug = async (bugId: string, updates: Partial<Omit<Bug, 'id' | 'assignee'> & { assigneeId?: string | null }>) => {
    const { assigneeId, ...otherUpdates } = updates;
    const dbUpdates: { [key: string]: any } = { ...otherUpdates };
    if (updates.hasOwnProperty('assigneeId')) {
        dbUpdates.assignee_id = assigneeId;
    }
    const { error } = await supabase.from('bugs').update(dbUpdates).eq('id', bugId);
    if (error) throw error;
};

const deleteBug = async (bugId: string) => {
    const { error } = await supabase.from('bugs').delete().eq('id', bugId);
    if (error) throw error;
};

const deleteBugsBatch = async (bugIds: string[]) => {
    const { error } = await supabase.from('bugs').delete().in('id', bugIds);
    if (error) throw error;
};

const getInviteLinksForProject = async (projectId: string): Promise<ProjectInviteLink[]> => {
    const { data, error } = await supabase
        .from('project_invites')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

const createInviteLink = async (projectId: string, creatorId: string, role: UserRole, expiresInDays: number | null): Promise<ProjectInviteLink> => {
    const { data, error } = await supabase.rpc('create_project_invite', {
        p_id: projectId,
        creator_id: creatorId,
        link_role: role,
        duration_days: expiresInDays
    });
    if (error) throw error;
    // A Supabase RPC call might return an array with a single item. This handles that case.
    const result = Array.isArray(data) ? data[0] : data;
    // The type of `result` from rpc is `any`, which we cast to `ProjectInviteLink` for safety.
    return result as ProjectInviteLink;
};

const updateInviteLink = async (linkId: string, updates: { is_active: boolean }): Promise<ProjectInviteLink> => {
    const { data, error } = await supabase
        .from('project_invites')
        .update(updates)
        .eq('id', linkId)
        .select()
        .single();
    if (error) throw error;
    return data;
};

const acceptInvite = async (token: string): Promise<{ id: string; name: string; }> => {
    const { data, error } = await supabase.rpc('accept_project_invite', { invite_token: token });
    if (error) throw error;
    if (!data) {
        throw new Error('Invite acceptance returned no data.');
    }
    
    if (typeof data === 'string') {
        return JSON.parse(data);
    }
    return data as { id: string, name: string };
};

const submitFeedback = async (feedbackData: {
    userId: string,
    type: FeedbackType,
    title: string,
    description: string,
    contextData: object
}) => {
    const { error } = await supabase.from('feedback').insert({
        user_id: feedbackData.userId,
        type: feedbackData.type,
        title: feedbackData.title,
        description: feedbackData.description,
        context_data: feedbackData.contextData,
    });
    if (error) throw error;
};

// FIX: Add sprint management functions
const addSprint = async (sprintData: {
    projectId: string;
    name: string;
    goal: string | null;
    startDate: string | null;
    endDate: string | null;
    isDefault?: boolean;
}): Promise<Sprint> => {
    const { data, error } = await supabase
        .from('sprints')
        .insert({
            project_id: sprintData.projectId,
            name: sprintData.name,
            goal: sprintData.goal,
            start_date: sprintData.startDate,
            end_date: sprintData.endDate,
            is_default: sprintData.isDefault,
        })
        .select()
        .single();
    if (error) throw error;
    return {
        id: data.id,
        projectId: data.project_id,
        name: data.name,
        startDate: data.start_date,
        endDate: data.end_date,
        goal: data.goal,
        isDefault: data.is_default,
        createdAt: data.created_at,
        status: data.status,
    } as Sprint;
};

const updateSprint = async (sprintId: string, updates: Partial<Sprint>): Promise<void> => {
    const dbUpdates: Record<string, any> = {};
    if (updates.hasOwnProperty('name')) dbUpdates.name = updates.name;
    if (updates.hasOwnProperty('goal')) dbUpdates.goal = updates.goal;
    if (updates.hasOwnProperty('startDate')) dbUpdates.start_date = updates.startDate;
    if (updates.hasOwnProperty('endDate')) dbUpdates.end_date = updates.endDate;
    if (updates.hasOwnProperty('isDefault')) dbUpdates.is_default = updates.isDefault;

    if (updates.isDefault === true) {
        const { data: sprint, error: fetchError } = await supabase.from('sprints').select('project_id').eq('id', sprintId).single();
        if (fetchError) throw fetchError;
        if (sprint) {
            const { error: unsetError } = await supabase
                .from('sprints')
                .update({ is_default: false })
                .eq('project_id', (sprint as any).project_id as string)
                .neq('id', sprintId);
            if (unsetError) throw unsetError;
        }
    }

    if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase.from('sprints').update(dbUpdates).eq('id', sprintId);
        if (error) throw error;
    }
};

const deleteSprint = async (sprintId: string): Promise<void> => {
    const { error } = await supabase.from('sprints').delete().eq('id', sprintId);
    if (error) throw error;
};

const bulkUpdateTaskSprint = async (taskIds: string[], sprintId: string | null) => {
    const { error } = await supabase
        .from('tasks')
        .update({ sprint_id: sprintId })
        .in('id', taskIds);
    if (error) throw error;
};

const completeSprint = async (sprintId: string, moveToSprintId: string | null) => {
    const { error } = await supabase.rpc('complete_sprint', {
        sprint_id_to_complete: sprintId,
        move_to_sprint_id: moveToSprintId,
    });
    if (error) throw error;
};

// FIX: Added missing functions for managing filter segments.
const addFilterSegment = async (projectId: string, name: string, filters: FilterSegment['filters'], creatorId: string) => {
    const { error } = await supabase.from('filter_segments').insert({
        project_id: projectId,
        name,
        filters,
        creator_id: creatorId,
    });
    if (error) throw error;
};

const updateFilterSegment = async (segmentId: string, updates: { name?: string, filters?: FilterSegment['filters'] }) => {
    const { error } = await supabase.from('filter_segments').update(updates).eq('id', segmentId);
    if (error) throw error;
};

const deleteFilterSegment = async (segmentId: string) => {
    const { error } = await supabase.from('filter_segments').delete().eq('id', segmentId);
    if (error) throw error;
};

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
    updateUserPassword,
  },
  realtime: {
    isConfigured,
    getPresenceChannel,
    removeChannel,
  },
  data: {
    fetchInitialData,
    subscribeToProjectChat,
    moveTask,
    updateTask,
    addTask,
    addTasksBatch,
    addSubtasks,
    addComment,
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
    getInviteLinksForProject,
    createInviteLink,
    updateInviteLink,
    acceptInvite,
    submitFeedback,
    addSprint,
    updateSprint,
    deleteSprint,
    bulkUpdateTaskSprint,
    completeSprint,
    addFilterSegment,
    updateFilterSegment,
    deleteFilterSegment,
  }
};
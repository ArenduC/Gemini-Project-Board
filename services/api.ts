
import { supabase } from './supabase';
import { User, Project, BoardData, NewTaskData, Task, AppState, ChatMessage, TaskHistory, ProjectInviteLink, UserRole, InviteAccessType, ProjectLink, Column } from '../types';
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

const getUserProfile = async (userId: string): Promise<User | null> => {
    const { data: userProfile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
    if (error) {
        console.error("Error fetching user profile:", error.message || error);
        return null;
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
    // Fetch project IDs for projects the user is a member of
    const { data: projectMembers, error: projectMembersError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId);
    if (projectMembersError) throw projectMembersError;
    const projectIds = projectMembers.map(pm => pm.project_id);

    // If the user isn't in any projects, just fetch their own profile
    if (projectIds.length === 0) {
        const { data: userProfile, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        if (userError) throw userError;
        return { projects: {}, users: { [userId]: userProfile as User }, projectOrder: [] };
    }

    // Since we have project IDs, get all members for these projects to fetch all relevant users
    const { data: allProjectMembers, error: allMembersError } = await supabase
        .from('project_members')
        .select('user_id')
        .in('project_id', projectIds);
    if (allMembersError) throw allMembersError;

    const allUserIdsInProjects = new Set(allProjectMembers.map(pm => pm.user_id));
    allUserIdsInProjects.add(userId); // Ensure the current user is included

    const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .in('id', Array.from(allUserIdsInProjects));
    if (usersError) throw usersError;
    const usersRecord = arrayToRecord(usersData as User[]);

    // Now fetch the full project data
    const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
            *,
            members:project_members(user_id),
            chat_messages:project_chats(*, author:users(*)),
            links:project_links(*),
            columns:columns(
                *,
                tasks(
                    *,
                    assignee:users!tasks_assignee_id_fkey(*),
                    subtasks(*),
                    comments(
                        *,
                        author:users(*)
                    ),
                    tags:task_tags(tags(name))
                )
            )
        `)
        .in('id', projectIds)
        .order('position', { foreignTable: 'columns' })
        .order('position', { foreignTable: 'columns.tasks' })
        .order('created_at', { foreignTable: 'chat_messages' })
        .order('created_at', { foreignTable: 'links' });


    if (projectsError) throw projectsError;

    // Transform the fetched data
    const projectsRecord: Record<string, Project> = {};
    const projectOrder = projectsData.map(p => p.id).sort();

    for (const p of projectsData) {
        const board: BoardData = {
            tasks: {},
            columns: {},
            columnOrder: [],
        };

        p.columns.forEach((c: any) => {
            const taskIds: string[] = [];
            c.tasks.forEach((t: any) => {
                taskIds.push(t.id);
                board.tasks[t.id] = {
                    ...t,
                    assignee: t.assignee,
                    tags: t.tags.map((tag: any) => tag.tags.name),
                    comments: t.comments.map((cmt: any) => ({
                        ...cmt,
                        author: cmt.author,
                    })) || [],
                    history: [], // Initialize history as empty; will be populated in a separate query
                    subtasks: t.subtasks || [],
                    createdAt: t.created_at,
                    creatorId: t.creator_id,
                };
            });
            board.columns[c.id] = { id: c.id, title: c.title, taskIds };
            board.columnOrder.push(c.id);
        });

        projectsRecord[p.id] = {
            id: p.id,
            name: p.name,
            description: p.description,
            members: p.members.map((m: any) => m.user_id),
            board,
            chatMessages: p.chat_messages.map((msg: any): ChatMessage => ({
                id: msg.id,
                text: msg.text,
                createdAt: msg.created_at,
                author: msg.author,
            })) || [],
            links: p.links.map((l: any): ProjectLink => ({
                id: l.id,
                title: l.title,
                url: l.url,
                projectId: l.project_id,
                creatorId: l.creator_id,
                createdAt: l.created_at,
            })) || [],
            creatorId: p.creator_id,
            createdAt: p.created_at,
        };
    }

    // Fetch history separately to avoid RLS issues with deep nesting
    const allTaskIds = Object.values(projectsRecord).flatMap(p => Object.keys(p.board.tasks));
    if (allTaskIds.length > 0) {
        const { data: tasksWithHistory, error: historyError } = await supabase
            .from('tasks')
            .select('id, history:task_history(*, user:users(*))')
            .in('id', allTaskIds)
            .order('created_at', { foreignTable: 'task_history', ascending: false });

        if (historyError) {
            console.warn(`Could not fetch task history. This might be because the 'task_history' table's security policies are too restrictive. Proceeding without history data.`, historyError);
        } else if (tasksWithHistory) {
            const historyMap = new Map<string, TaskHistory[]>();
            tasksWithHistory.forEach((task: any) => {
                const histories = (task.history || []).map((h: any): TaskHistory => ({
                    id: h.id,
                    user: h.user,
                    changeDescription: h.change_description,
                    createdAt: h.created_at,
                }));
                historyMap.set(task.id, histories);
            });

            // Merge history back into the projectsRecord
            for (const project of Object.values(projectsRecord)) {
                for (const taskId in project.board.tasks) {
                    if (historyMap.has(taskId)) {
                        project.board.tasks[taskId].history = historyMap.get(taskId)!;
                    }
                }
            }
        }
    }
    
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
    if (error) console.error("Error moving task:", error.message || error);
};

const updateTask = async (updatedTask: Task, actorId: string) => {
    // Fetch old task data for comparison to create history logs
    const { data: oldTaskData, error: fetchError } = await supabase
        .from('tasks')
        .select('*, assignee:users!tasks_assignee_id_fkey(*)') // FIX: Explicitly define relationship to resolve ambiguity
        .eq('id', updatedTask.id)
        .single();

    if (fetchError) {
        console.warn("Error fetching old task for history logging:", fetchError.message || fetchError);
    } else {
        const historyItems: { task_id: string; user_id: string; change_description: string; }[] = [];
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
        if (historyItems.length > 0) {
            const itemsWithIds = historyItems.map(item => ({ ...item, id: crypto.randomUUID() }));
            // FIX: Gracefully handle cases where the history table might be missing
            try {
                const { error: historyError } = await supabase.from('task_history').insert(itemsWithIds);
                if (historyError) console.warn("Could not log task update history:", historyError.message || historyError);
            } catch (error) {
                console.warn("Error inserting into task_history:", error);
            }
        }
    }

    // 1. Update the core task details
    const { error: taskUpdateError } = await supabase
      .from('tasks')
      .update({
          title: updatedTask.title,
          description: updatedTask.description,
          priority: updatedTask.priority,
          assignee_id: updatedTask.assignee?.id || null
      })
      .eq('id', updatedTask.id);
      
    if (taskUpdateError) console.error("Error updating task", taskUpdateError.message || taskUpdateError);

    // 2. Sync subtasks (handle updates and deletes)
    const { data: existingSubtasks, error: fetchSubtasksError } = await supabase
        .from('subtasks')
        .select('id')
        .eq('task_id', updatedTask.id);

    if (fetchSubtasksError) {
        console.error("Error fetching subtasks for sync:", fetchSubtasksError.message || fetchSubtasksError);
    } else {
        const existingSubtaskIds = new Set(existingSubtasks.map(s => s.id));
        const incomingSubtaskIds = new Set(updatedTask.subtasks.map(s => s.id));

        // Find and delete subtasks that are no longer present
        const subtasksToDelete = Array.from(existingSubtaskIds).filter(id => !incomingSubtaskIds.has(id));
        if (subtasksToDelete.length > 0) {
            const { error: deleteError } = await supabase
                .from('subtasks')
                .delete()
                .in('id', subtasksToDelete);
            if (deleteError) console.error("Error deleting subtasks:", deleteError.message || deleteError);
        }

        // Update existing subtasks
        for (const subtask of updatedTask.subtasks) {
            if (existingSubtaskIds.has(subtask.id)) {
                const { error: subtaskError } = await supabase
                    .from('subtasks')
                    .update({ completed: subtask.completed, title: subtask.title })
                    .eq('id', subtask.id);
                if (subtaskError) console.error("Error updating subtask", subtaskError.message || subtaskError);
            }
        }
    }


    // 3. Sync tags
    const { data: existingTaskTags, error: fetchTagsError } = await supabase
        .from('task_tags')
        .select('tags(id, name)')
        .eq('task_id', updatedTask.id);
    
    if (fetchTagsError) {
        console.error("Error fetching existing tags:", fetchTagsError.message || fetchTagsError);
        return;
    }
    
    const existingTags = existingTaskTags.map((t: any) => t.tags.name);
    const newTags = updatedTask.tags;

    const tagsToAdd = newTags.filter(t => !existingTags.includes(t));
    const tagsToRemove = existingTags.filter(t => !newTags.includes(t));

    // Remove old tags
    if (tagsToRemove.length > 0) {
        const tagsToRemoveData = existingTaskTags
            .filter((t: any) => tagsToRemove.includes(t.tags.name))
            .map((t: any) => t.tags.id);

        if (tagsToRemoveData.length > 0) {
            const { error: deleteError } = await supabase
                .from('task_tags')
                .delete()
                .eq('task_id', updatedTask.id)
                .in('tag_id', tagsToRemoveData);
            if (deleteError) console.error("Error removing tags from task", deleteError.message || deleteError);
        }
    }
    
    // Add new tags
    if (tagsToAdd.length > 0) {
        const { data: upsertedTags, error: upsertError } = await supabase
            .from('tags')
            .upsert(tagsToAdd.map(name => ({ name })), { onConflict: 'name' })
            .select('id, name');

        if (upsertError) {
            console.error("Error upserting new tags", upsertError.message || upsertError);
            return;
        }

        const taskTagRelations = upsertedTags
            .filter(tag => tagsToAdd.includes(tag.name))
            .map(tag => ({
                task_id: updatedTask.id,
                tag_id: tag.id
            }));
        
        if (taskTagRelations.length > 0) {
            const { error: insertError } = await supabase
                .from('task_tags')
                .insert(taskTagRelations);
            if (insertError) console.error("Error adding tags to task", insertError.message || insertError);
        }
    }
};

const addSubtasks = async (taskId: string, newSubtasksData: { title:string }[], creatorId: string) => {
    const subtasksToInsert = newSubtasksData.map(s => ({
        title: s.title,
        task_id: taskId,
        creator_id: creatorId,
        completed: false
    }));
    
    const { error } = await supabase.from('subtasks').insert(subtasksToInsert);
    if (error) console.error("Error adding subtasks", error.message || error);
};

const addComment = async (taskId: string, commentText: string, authorId: string) => {
    const { error } = await supabase.from('comments').insert({
      text: commentText,
      task_id: taskId,
      author_id: authorId,
    });
    if (error) console.error("Error adding comment", error.message || error);
};

const addTask = async (taskData: NewTaskData, creatorId: string): Promise<Task> => {
    const { data, error } = await supabase.from('tasks').insert({
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        column_id: taskData.columnId,
        creator_id: creatorId,
        assignee_id: taskData.assigneeId,
    }).select().single();

    if(error) {
        console.error("Error adding task", error.message || error);
        throw error;
    }
    return data as Task;
};

const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if(error) console.error("Error deleting task", error.message || error);
};

const addColumn = async (projectId: string, title: string): Promise<Column> => {
    const { data, error } = await supabase.from('columns').insert({
        title: title,
        project_id: projectId,
    }).select().single();
    if(error) {
        console.error("Error adding column", error.message || error);
        throw error;
    }
    return data as Column;
};

const deleteColumn = async (columnId: string) => {
    const { error } = await supabase.from('columns').delete().eq('id', columnId);
    if(error) console.error("Error deleting column", error.message || error);
};

const createProjectShell = async (name: string, description: string, creatorId: string): Promise<Project> => {
    const { data: project, error } = await supabase
        .from('projects')
        .insert({ name, description, creator_id: creatorId })
        .select()
        .single();
    if (error) {
        console.error("Error creating project shell", error.message || error);
        throw error;
    }

    const { error: memberError } = await supabase
        .from('project_members')
        .insert({ project_id: project.id, user_id: creatorId });
    if (memberError) {
        console.error("Error adding creator to project", memberError.message || memberError);
        throw memberError;
    }
    return project as Project;
}


const addProject = async (name: string, description: string, creatorId: string) => {
    const { data: project, error } = await supabase
        .from('projects')
        .insert({ name, description, creator_id: creatorId })
        .select()
        .single();
    if (error) {
        console.error("Error creating project", error.message || error);
        return;
    }

    // Add creator as a member
    const { error: memberError } = await supabase
        .from('project_members')
        .insert({ project_id: project.id, user_id: creatorId });
    if (memberError) console.error("Error adding creator to project", memberError.message || memberError);
    
    // Add default columns
    const columnsToAdd = [
        { project_id: project.id, title: 'To Do', position: 1 },
        { project_id: project.id, title: 'In Progress', position: 2 },
        { project_id: project.id, title: 'Done', position: 3 },
    ];
    const { error: columnsError } = await supabase.from('columns').insert(columnsToAdd);
    if (columnsError) console.error("Error adding default columns", columnsError.message || columnsError);
};

const deleteProject = async (projectId: string) => {
    // Assumes RLS and cascading deletes are set up in Supabase
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) {
        console.error("Error deleting project:", error.message || error);
        throw error;
    }
};

const updateProjectMembers = async (projectId: string, memberIds: string[]) => {
    const { error: deleteError } = await supabase.from('project_members').delete().eq('project_id', projectId);
    if(deleteError) {
        console.error("Error clearing project members", deleteError.message || deleteError);
        return;
    }
    const membersToInsert = memberIds.map(id => ({ project_id: projectId, user_id: id }));
    const { error: insertError } = await supabase.from('project_members').insert(membersToInsert);
    if(insertError) console.error("Error inserting new project members", insertError.message || insertError);
};

const sendChatMessage = async (projectId: string, text: string, authorId: string) => {
    const { error } = await supabase.from('project_chats').insert({
        project_id: projectId,
        text: text,
        author_id: authorId,
    });
    if (error) {
        console.error("Error sending chat message:", error.message || error);
        throw error;
    }
};

const getInviteLinksForProject = async (projectId: string): Promise<ProjectInviteLink[]> => {
    const { data, error } = await supabase
        .from('project_invites')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
    if (error) {
        console.error("Error fetching invite links:", error.message || error);
        throw error;
    }
    return data as ProjectInviteLink[];
};

const createInviteLink = async (
    projectId: string, 
    creatorId: string, 
    role: UserRole, 
    expiresInDays: number | null
): Promise<ProjectInviteLink> => {
    
    const expires_at = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString() : null;

    const { data, error } = await supabase
        .from('project_invites')
        .insert({
            project_id: projectId,
            created_by: creatorId,
            token: crypto.randomUUID(),
            role,
            expires_at,
            access_type: InviteAccessType.OPEN,
            is_active: true,
        })
        .select()
        .single();
    
    if (error) {
        console.error("Error creating invite link:", error.message || error);
        throw error;
    }
    return data as ProjectInviteLink;
};

const updateInviteLink = async (linkId: string, updates: Partial<{ is_active: boolean }>): Promise<ProjectInviteLink> => {
    const { data, error } = await supabase
        .from('project_invites')
        .update(updates)
        .eq('id', linkId)
        .select()
        .single();
    if (error) {
        console.error("Error updating invite link:", error.message || error);
        throw error;
    }
    return data as ProjectInviteLink;
};

const acceptInvite = async (token: string): Promise<Project> => {
    // This calls a Supabase RPC function that should handle the invite logic atomically.
    // The RPC function finds the invite, validates it, adds the user to the project,
    // increments usage, and returns the joined project's data.
    const { data, error } = await supabase.rpc('accept_project_invite', { invite_token: token });
    if (error) {
        console.error('Error accepting invite:', error.message || error);
        // FIX: The 'error' object from Supabase might be of an unknown type in some contexts.
        // Casting to 'Error' allows safely accessing the 'message' property for the Error constructor.
        throw new Error((error as Error).message || 'Could not join project. The link may be invalid or expired.');
    }
    // The RPC function is expected to return the full project data upon success.
    // This is a placeholder; a real implementation might need to fetch project details separately.
    if (!data || !data.id || !data.name) {
      throw new Error("Joined project but could not retrieve its details.");
    }
    return data as Project;
};

const addProjectLink = async (projectId: string, title: string, url: string, creatorId: string) => {
    const { error } = await supabase.from('project_links').insert({
        project_id: projectId,
        title,
        url,
        creator_id: creatorId,
    });
    if (error) {
        console.error("Error adding project link:", error.message || error);
        throw error;
    }
};

const deleteProjectLink = async (linkId: string) => {
    const { error } = await supabase.from('project_links').delete().eq('id', linkId);
    if (error) {
        console.error("Error deleting project link:", error.message || error);
        throw error;
    }
};


export const api = {
    auth: {
        onAuthStateChange,
        getUserProfile,
        createUserProfile,
        updateUserProfile,
        signOut,
        signInWithPassword,
        signUp,
        sendPasswordResetEmail,
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
        addSubtasks,
        addComment,
        addTask,
        deleteTask,
        addColumn,
        deleteColumn,
        addProject,
        createProjectShell,
        deleteProject,
        updateProjectMembers,
        sendChatMessage,
        getInviteLinksForProject,
        createInviteLink,
        updateInviteLink,
        acceptInvite,
        addProjectLink,
        deleteProjectLink,
    }
}

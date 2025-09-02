import { supabase } from './supabase';
import { User, Project, BoardData, NewTaskData, Task, AppState, ChatMessage } from '../types';
import { Session } from '@supabase/supabase-js';

// Helper to transform array from DB into the state's Record<string, T> format
const arrayToRecord = <T extends { id: string }>(arr: T[]): Record<string, T> => {
    return arr.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
    }, {} as Record<string, T>);
};

// --- AUTHENTICATION ---

const onAuthStateChange = (callback: (session: Session | null) => void) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        callback(session);
    });
    return subscription;
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
            emailRedirectTo: window.location.origin,
            data: {
                name: name,
            }
        }
    });
};


// --- DATA FETCHING ---

const fetchInitialData = async (userId: string): Promise<Omit<AppState, 'projectOrder'> & {projectOrder: string[]}> => {
    // Fetch all users first
    const { data: usersData, error: usersError } = await supabase.from('users').select('*');
    if (usersError) throw usersError;
    const usersRecord = arrayToRecord(usersData as User[]);

    // Fetch projects the user is a member of
    const { data: projectMembers, error: projectMembersError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId);

    if (projectMembersError) throw projectMembersError;

    const projectIds = projectMembers.map(pm => pm.project_id);
    
    if (projectIds.length === 0) {
        return { projects: {}, users: usersRecord, projectOrder: [] };
    }

    const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
            *,
            members:project_members(user_id),
            chat_messages:project_chats(*, author:users(*)),
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
        .order('created_at', { foreignTable: 'chat_messages' });

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
            creatorId: p.creator_id,
            createdAt: p.created_at,
        };
    }
    
    return {
        projects: projectsRecord,
        users: usersRecord,
        projectOrder,
    };
};

const subscribeToChanges = (callback: () => void) => {
     const changes = supabase.channel('any')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        console.log('Change received!', payload)
        callback();
      })
      .subscribe();
    return changes;
};

// --- DATA MUTATION ---

const moveTask = async (taskId: string, newColumnId: string, newPosition: number) => {
    const { error } = await supabase.rpc('move_task', {
        task_id: taskId,
        new_column_id: newColumnId,
        new_position: newPosition
    });
    if (error) console.error("Error moving task:", error.message || error);
};

const updateTask = async (updatedTask: Task) => {
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

const addTask = async (taskData: NewTaskData, creatorId: string) => {
    const { error } = await supabase.from('tasks').insert({
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        column_id: taskData.columnId,
        creator_id: creatorId,
        assignee_id: taskData.assigneeId,
    });
    if(error) console.error("Error adding task", error.message || error);
};

const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if(error) console.error("Error deleting task", error.message || error);
};

const addColumn = async (projectId: string, title: string) => {
    const { error } = await supabase.from('columns').insert({
        title: title,
        project_id: projectId,
    });
    if(error) console.error("Error adding column", error.message || error);
};

const deleteColumn = async (columnId: string) => {
    const { error } = await supabase.from('columns').delete().eq('id', columnId);
    if(error) console.error("Error deleting column", error.message || error);
};

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
    if (error) console.error("Error sending chat message:", error.message || error);
};

export const api = {
    auth: {
        onAuthStateChange,
        getUserProfile,
        signOut,
        signInWithPassword,
        signUp,
    },
    data: {
        fetchInitialData,
        subscribeToChanges,
        moveTask,
        updateTask,
        addSubtasks,
        addComment,
        addTask,
        deleteTask,
        addColumn,
        deleteColumn,
        addProject,
        updateProjectMembers,
        sendChatMessage,
    }
}
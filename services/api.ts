/*
================================================================================================
=== URGENT: MANUAL DATABASE FIX REQUIRED ===
================================================================================================

The error you are experiencing ("syntax error at or near '=>'") is because the
previous SQL script had incorrect syntax. My apologies.

This new script is corrected and will fix the issue. You MUST manually run this in your
Supabase project to clean up the database.

** HOW TO FIX: **
1.  Go to your Supabase project dashboard.
2.  In the left sidebar, click the "SQL Editor" icon (it looks like a database).
3.  Click "+ New query".
4.  Copy the ENTIRE script from "-- START OF SCRIPT --" to "-- END OF SCRIPT --" below.
5.  Paste the script into the Supabase SQL Editor.
6.  Click the "RUN" button.

This will delete all old, conflicting functions and create the single, correct version.

-- START OF SCRIPT --

-- Step 1: Clean up ALL old versions of the function to resolve conflicts.
-- This version uses the correct syntax and is safe to run multiple times.
DROP FUNCTION IF EXISTS public.accept_project_invite(uuid);
DROP FUNCTION IF EXISTS public.accept_project_invite(text, public.user_role);
DROP FUNCTION IF EXISTS public.accept_project_invite(text);


-- Step 2: Create the single, correct version of the function.
create or replace function accept_project_invite(invite_token text)
returns json
language plpgsql
security definer
as $$
declare
  invite_record public.project_invites;
  current_user_id uuid := auth.uid();
  member_count int;
  project_data json;
begin
  -- Find the invite link and lock it for update
  select * into invite_record from public.project_invites where token = invite_token for update;

  -- Validate the invite
  if invite_record is null then
    raise exception 'Invite token is invalid.';
  end if;

  if not invite_record.is_active then
    raise exception 'This invite link is no longer active.';
  end if;

  if invite_record.expires_at is not null and invite_record.expires_at < now() then
    raise exception 'This invite link has expired.';
  end if;

  if invite_record.max_uses is not null and invite_record.current_uses >= invite_record.max_uses then
    raise exception 'This invite link has reached its maximum number of uses.';
  end if;

  -- Check if user is already a member
  select count(*) into member_count from public.project_members where project_id = invite_record.project_id and user_id = current_user_id;
  if member_count > 0 then
    -- User is already a member. Silently succeed and return project data.
    select json_build_object('id', p.id, 'name', p.name) into project_data from public.projects p where id = invite_record.project_id;
    return project_data;
  end if;

  -- Add the user to the project.
  insert into public.project_members (project_id, user_id)
  values (invite_record.project_id, current_user_id);

  -- Update the invite link usage count
  update public.project_invites
  set current_uses = current_uses + 1
  where id = invite_record.id;
  
  -- Optionally, deactivate if max uses is reached.
  if invite_record.max_uses is not null and (invite_record.current_uses + 1) >= invite_record.max_uses then
    update public.project_invites
    set is_active = false
    where id = invite_record.id;
  end if;

  -- Return the joined project's data
  select json_build_object('id', p.id, 'name', p.name) into project_data from public.projects p where id = invite_record.project_id;
  
  if project_data is null then
    raise exception 'Could not find the project associated with this invite.';
  end if;
  
  return project_data;
end;
$$;

-- Step 3: Grant permission for authenticated users to call the function.
grant execute on function public.accept_project_invite(text) to authenticated;

-- END OF SCRIPT --

================================================================================================
The 'get_initial_data_for_user' function is also included below for completeness.
If you have issues with data loading, you can run this script as well.
================================================================================================

create or replace function get_initial_data_for_user(user_id_param uuid)
returns json
language plpgsql
security definer -- Important: Runs with the permissions of the function owner
as $$
declare
  user_project_ids uuid[];
  all_user_ids_in_projects uuid[];
  projects_json json;
  users_json json;
begin
  -- 1. Get all project IDs the user is a member of.
  select array_agg(project_id)
  into user_project_ids
  from public.project_members
  where user_id = user_id_param;

  -- 2. Return early if the user is not part of any projects.
  if user_project_ids is null or array_length(user_project_ids, 1) = 0 then
      select json_agg(json_build_object('id', u.id, 'name', u.name, 'avatarUrl', u.avatar_url, 'role', u.role)) into users_json from public.users u where id = user_id_param;
      return json_build_object('projects', '[]'::json, 'users', coalesce(users_json, '[]'::json));
  end if;

  -- 3. Get all unique user IDs from all of the user's projects.
  select array_agg(distinct pm.user_id)
  into all_user_ids_in_projects
  from public.project_members pm
  where pm.project_id = any(user_project_ids);

  -- 4. Fetch all relevant user profiles into a JSON array.
  select json_agg(json_build_object('id', u.id, 'name', u.name, 'avatarUrl', u.avatar_url, 'role', u.role))
  into users_json
  from public.users u
  where u.id = any(all_user_ids_in_projects);

  -- 5. Fetch and aggregate all project data into a JSON array.
  select json_agg(p_agg)
  into projects_json
  from (
    select
      p.id,
      p.name,
      p.description,
      p.creator_id as "creatorId",
      p.created_at as "createdAt",
      (select json_agg(pm.user_id) from public.project_members pm where pm.project_id = p.id) as "members",
      -- Aggregate board data (columns and tasks)
      (
        select json_build_object(
          'tasks', (select coalesce(json_object_agg(t.id, t_json), '{}'::json) from (select t_ext.id, t_ext.task_json as t_json from (
            select
              t.id,
              json_build_object(
                'id', t.id, 'title', t.title, 'description', t.description, 'priority', t.priority, 'dueDate', NULL, 'creatorId', t.creator_id, 'createdAt', t.created_at,
                'assignee', (select json_build_object('id', u.id, 'name', u.name, 'avatarUrl', u.avatar_url, 'role', u.role) from public.users u where u.id = t.assignee_id),
                'subtasks', (select coalesce(json_agg(s), '[]'::json) from (select st.id, st.title, st.completed, st.creator_id as "creatorId", st.created_at as "createdAt" from public.subtasks st where st.task_id = t.id) s),
                'comments', (select coalesce(json_agg(c order by c."createdAt" asc), '[]'::json) from (select cm.id, cm.text, cm.created_at as "createdAt", json_build_object('id', cu.id, 'name', cu.name, 'avatarUrl', cu.avatar_url, 'role', cu.role) as author from public.comments cm join public.users cu on cm.author_id = cu.id where cm.task_id = t.id) c),
                'history', (select coalesce(json_agg(h order by h."createdAt" desc), '[]'::json) from (select th.id, th.change_description as "changeDescription", th.created_at as "createdAt", json_build_object('id', hu.id, 'name', hu.name, 'avatarUrl', hu.avatar_url, 'role', hu.role) as user from public.task_history th join public.users hu on th.user_id = hu.id where th.task_id = t.id) h),
                'tags', (select coalesce(json_agg(tags.name), '[]'::json) from public.task_tags join public.tags on task_tags.tag_id = tags.id where task_tags.task_id = t.id)
              ) as task_json
            from public.tasks t where t.column_id in (select id from public.columns where project_id = p.id)
          ) as t_ext) as t),
          'columns', (select coalesce(json_object_agg(c.id, c_json), '{}'::json) from (select c_ext.id, c_ext.col_json as c_json from (
            select c.id, json_build_object('id', c.id, 'title', c.title, 'taskIds', (select coalesce(json_agg(t.id order by t.position), '[]'::json) from public.tasks t where t.column_id = c.id)) as col_json
            from public.columns c where c.project_id = p.id
          ) as c_ext) as c),
          'columnOrder', (select coalesce(json_agg(c.id order by c.position), '[]'::json) from public.columns c where c.project_id = p.id)
        )
      ) as "board",
      -- Aggregate other related data
      (select coalesce(json_agg(chat_msg order by "createdAt"), '[]'::json) from (select pc.id, pc.text, pc.created_at as "createdAt", json_build_object('id', au.id, 'name', au.name, 'avatarUrl', au.avatar_url, 'role', au.role) as author from public.project_chats pc join public.users au on pc.author_id = au.id where pc.project_id = p.id) chat_msg) as "chatMessages",
      (select coalesce(json_agg(l order by "createdAt"), '[]'::json) from (select pl.id, pl.title, pl.url, pl.project_id as "projectId", pl.creator_id as "creatorId", pl.created_at as "createdAt" from public.project_links pl where pl.project_id = p.id) l) as "links",
      (select coalesce(json_object_agg(b.id, b_json), '{}'::json) from (select b_ext.id, b_ext.bug_json as b_json from (select b.id, json_build_object('id', b.id, 'bugNumber', b.bug_number, 'title', b.title, 'description', b.description, 'priority', b.priority, 'status', b.status, 'reporterId', b.reporter_id, 'createdAt', b.created_at, 'position', b.position, 'assignee', (select json_build_object('id', bu.id, 'name', bu.name, 'avatarUrl', bu.avatar_url, 'role', bu.role) from public.users bu where bu.id = b.assignee_id)) as bug_json from public.bugs b where b.project_id = p.id) as b_ext) as b) as "bugs",
      (select coalesce(json_agg(b.id order by b.position), '[]'::json) from public.bugs b where b.project_id = p.id) as "bugOrder"
    from public.projects p
    where p.id = any(user_project_ids)
  ) p_agg;

  -- 6. Return the final combined JSON object.
  return json_build_object(
    'projects', coalesce(projects_json, '[]'::json),
    'users', coalesce(users_json, '[]'::json)
  );
end;
$$;

grant execute on function public.get_initial_data_for_user(uuid) to authenticated;
*/

import { supabase } from './supabase';
import { User, Project, BoardData, NewTaskData, Task, AppState, ChatMessage, TaskHistory, ProjectInviteLink, UserRole, InviteAccessType, ProjectLink, Column, FeedbackType, Bug, TaskPriority } from '../types';
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
    if (error) console.error("Error moving task:", error.message || error);
};

const updateTask = async (updatedTask: Task, actorId: string) => {
    // Fetch old task data for comparison to create history logs
    const { data: oldTaskData, error: fetchError } = await supabase
        .from('tasks')
        .select('*, assignee:users!tasks_assignee_id_fkey(*)') // FIX: Explicitly define relationship to resolve ambiguity
        .eq('id', updatedTask.id)
        .single();

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
        
        // History for tags
        const { data: oldTagData, error: tagFetchError } = await supabase
            .from('task_tags')
            .select('tags!inner(name)')
            .eq('task_id', updatedTask.id);

        if (!tagFetchError && oldTagData) {
            const oldTags: string[] = oldTagData.map((item: any) => item.tags.name);
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
        due_date: updatedTask.dueDate || null
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
            { onConflict: 'name' }
        ).select('id, name');

        if (upsertTagsError) throw upsertTagsError;
        if (!upsertedTagsData) throw new Error("Could not upsert tags.");

        const tagIdMap = new Map(upsertedTagsData.map(t => [t.name, t.id]));

        // Create new associations
        const newAssociations = tagNames.map(name => ({
            task_id: updatedTask.id,
            tag_id: tagIdMap.get(name)
        })).filter(assoc => assoc.tag_id);

        if (newAssociations.length > 0) {
            const { error: insertError } = await supabase.from('task_tags').insert(newAssociations);
            if (insertError) throw insertError;
        }
    }
    // --- END TAGS UPDATE LOGIC ---

    // Update subtasks
    if (updatedTask.subtasks) {
        const { error: subtasksError } = await supabase.from('subtasks').upsert(
            updatedTask.subtasks.map(s => ({
                id: s.id,
                task_id: updatedTask.id,
                title: s.title,
                completed: s.completed,
                creator_id: s.creatorId,
                created_at: s.createdAt,
            }))
        );
        if (subtasksError) {
            console.error("Error upserting subtasks:", subtasksError);
        }
    }
};

const addTask = async (taskData: NewTaskData, creatorId: string): Promise<Task> => {
    const { error, data } = await supabase
        .from('tasks')
        .insert({
            title: taskData.title,
            description: taskData.description,
            priority: taskData.priority,
            column_id: taskData.columnId,
            assignee_id: taskData.assigneeId,
            creator_id: creatorId,
            due_date: taskData.dueDate,
        })
        .select()
        .single();
    if (error) throw error;
    return data as Task;
};

const addSubtasks = async (taskId: string, subtasks: { title: string }[], creatorId: string) => {
    const subtasksToInsert = subtasks.map(s => ({
        task_id: taskId,
        title: s.title,
        creator_id: creatorId
    }));
    const { error } = await supabase.from('subtasks').insert(subtasksToInsert);
    if (error) throw error;
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
    return data;
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
    return data;
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
  }
};
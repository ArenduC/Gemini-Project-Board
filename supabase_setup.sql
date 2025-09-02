--
-- Toggles Realtime for the public schema
--
ALTER publication supabase_realtime ADD TABLE public.projects, public.columns, public.tasks, public.subtasks, public.comments, public.project_members, public.tags, public.task_tags;

--
-- Set up custom ENUM types
--
CREATE TYPE public.user_role AS ENUM (
    'Admin',
    'Manager',
    'Member'
);

CREATE TYPE public.task_priority AS ENUM (
    'Low',
    'Medium',
    'High',
    'Urgent'
);

--
-- USERS table
-- Note: This table is public but access is controlled by RLS.
-- It's linked to the auth.users table.
--
CREATE TABLE public.users (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    avatar_url character varying,
    role public.user_role DEFAULT 'Member'::public.user_role NOT NULL
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow user to update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

--
-- PROJECTS table
--
CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name character varying NOT NULL,
    description text,
    creator_id uuid NOT NULL REFERENCES public.users(id),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;


--
-- PROJECT_MEMBERS join table
--
CREATE TABLE public.project_members (
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, user_id)
);
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Security policies for projects and members
CREATE POLICY "Allow members to view their projects" ON public.projects FOR SELECT USING (
    id IN (
        SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
);
CREATE POLICY "Allow project creator to update" ON public.projects FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Allow project creator to delete" ON public.projects FOR DELETE USING (auth.uid() = creator_id);

CREATE POLICY "Allow members to view project members" ON public.project_members FOR SELECT USING (
    project_id IN (
        SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
);
CREATE POLICY "Allow creator to manage members" ON public.project_members FOR INSERT WITH CHECK (
    (SELECT creator_id FROM public.projects WHERE id = project_id) = auth.uid()
);
CREATE POLICY "Allow creator to remove members" ON public.project_members FOR DELETE USING (
    (SELECT creator_id FROM public.projects WHERE id = project_id) = auth.uid()
);

--
-- COLUMNS table
--
CREATE TABLE public.columns (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    title character varying NOT NULL,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    "position" integer
);
ALTER TABLE public.columns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow members to manage columns in their projects" ON public.columns FOR ALL USING (
    project_id IN (
        SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
);

-- Sequence for column position
CREATE SEQUENCE public.columns_position_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER TABLE public.columns ALTER COLUMN "position" SET DEFAULT nextval('public.columns_position_seq'::regclass);

--
-- TASKS table
--
CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    title character varying NOT NULL,
    description text,
    priority public.task_priority DEFAULT 'Medium'::public.task_priority,
    column_id uuid NOT NULL REFERENCES public.columns(id) ON DELETE CASCADE,
    creator_id uuid NOT NULL REFERENCES public.users(id),
    assignee_id uuid REFERENCES public.users(id),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    "position" integer
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow members to manage tasks in their projects" ON public.tasks FOR ALL USING (
    column_id IN (
        SELECT c.id FROM public.columns c JOIN public.project_members pm ON c.project_id = pm.project_id WHERE pm.user_id = auth.uid()
    )
);

-- Sequence for task position
CREATE SEQUENCE public.tasks_position_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER TABLE public.tasks ALTER COLUMN "position" SET DEFAULT nextval('public.tasks_position_seq'::regclass);


--
-- SUBTASKS table
--
CREATE TABLE public.subtasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    title character varying NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    creator_id uuid NOT NULL REFERENCES public.users(id),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow members to manage subtasks in their projects" ON public.subtasks FOR ALL USING (
    task_id IN (
        SELECT t.id FROM public.tasks t JOIN public.columns c ON t.column_id = c.id JOIN public.project_members pm ON c.project_id = pm.project_id WHERE pm.user_id = auth.uid()
    )
);

--
-- COMMENTS table
--
CREATE TABLE public.comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    text text NOT NULL,
    task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    author_id uuid NOT NULL REFERENCES public.users(id),
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow members to manage comments in their projects" ON public.comments FOR ALL USING (
    task_id IN (
        SELECT t.id FROM public.tasks t JOIN public.columns c ON t.column_id = c.id JOIN public.project_members pm ON c.project_id = pm.project_id WHERE pm.user_id = auth.uid()
    )
);
ALTER TABLE public.comments RENAME COLUMN "timestamp" TO "created_at";


--
-- TAGS and TASK_TAGS tables
--
CREATE TABLE public.tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name character varying NOT NULL UNIQUE
);
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to manage tags" ON public.tags FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE public.task_tags (
    task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow members to manage task_tags in their projects" ON public.task_tags FOR ALL USING (
    task_id IN (
        SELECT t.id FROM public.tasks t JOIN public.columns c ON t.column_id = c.id JOIN public.project_members pm ON c.project_id = pm.project_id WHERE pm.user_id = auth.uid()
    )
);

--
-- Stored Procedure to automatically create a user profile on signup
--
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, name, avatar_url, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'avatar_url',
    'Member'
  );
  RETURN new;
END;
$$;

-- Trigger to call the function on new user creation in auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

--
-- Stored Procedure for moving tasks within and between columns
--
CREATE OR REPLACE FUNCTION public.move_task(task_id uuid, new_column_id uuid, new_position integer)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  old_column_id uuid;
  old_position integer;
BEGIN
  -- Get old column and position
  SELECT column_id, "position" INTO old_column_id, old_position FROM public.tasks WHERE id = task_id;

  -- If task is not moving column, just re-order within the same column
  IF old_column_id = new_column_id THEN
    -- Shift tasks between old and new position
    IF new_position < old_position THEN
      UPDATE public.tasks
      SET "position" = "position" + 1
      WHERE column_id = new_column_id AND "position" >= new_position AND "position" < old_position;
    ELSE
      UPDATE public.tasks
      SET "position" = "position" - 1
      WHERE column_id = new_column_id AND "position" <= new_position AND "position" > old_position;
    END IF;
  
  -- If task is moving to a new column
  ELSE
    -- Decrement positions in old column
    UPDATE public.tasks
    SET "position" = "position" - 1
    WHERE column_id = old_column_id AND "position" > old_position;

    -- Increment positions in new column
    UPDATE public.tasks
    SET "position" = "position" + 1
    WHERE column_id = new_column_id AND "position" >= new_position;
  END IF;

  -- Finally, update the moved task
  UPDATE public.tasks
  SET column_id = new_column_id, "position" = new_position
  WHERE id = task_id;

END;
$$;


--
-- SEED DATA
-- Note: You'll need to create users in Supabase Auth first and get their UUIDs.
-- Or, sign up in the app and manually update their profiles if needed.
-- These are placeholder UUIDs. Replace them with your actual user UUIDs from auth.users.
--
DO $$
DECLARE
    -- Create users in Auth, then get their IDs here.
    -- For this script, we'll assume they are created and we are just adding profiles.
    -- In a real scenario, the handle_new_user trigger would do this.
    -- The password for all is `password123`.
    alice_id uuid := '8600acdc-a0da-4171-8979-3f339f291e5e';
    bob_id uuid   := '3a25e1a1-2f63-45a8-b0a7-8096f2a89327';
    charlie_id uuid := 'f454a7c0-77a8-4835-866a-2d4e6d3a8e9a';

    -- Project
    project_id uuid;

    -- Columns
    todo_col_id uuid;
    inprogress_col_id uuid;
    done_col_id uuid;

    -- Tasks
    task1_id uuid;
    task2_id uuid;
    task3_id uuid;

    -- Tags
    frontend_tag_id uuid;
    backend_tag_id uuid;
    design_tag_id uuid;
BEGIN
    -- Seed Users (assuming auth users exist)
    -- This step is for dev purposes; in production, the trigger handles this.
    INSERT INTO public.users (id, name, avatar_url, role) VALUES
    (alice_id, 'Alice', 'https://i.pravatar.cc/150?u=alice', 'Admin'),
    (bob_id, 'Bob', 'https://i.pravatar.cc/150?u=bob', 'Manager'),
    (charlie_id, 'Charlie', 'https://i.pravatar.cc/150?u=charlie', 'Member')
    ON CONFLICT (id) DO NOTHING;

    -- Seed Project
    INSERT INTO public.projects (name, description, creator_id) VALUES
    ('Apollo Launch Campaign', 'Comprehensive plan for the upcoming Apollo product launch, covering marketing, engineering, and design.', alice_id)
    RETURNING id INTO project_id;

    -- Seed Project Members
    INSERT INTO public.project_members (project_id, user_id) VALUES
    (project_id, alice_id),
    (project_id, bob_id),
    (project_id, charlie_id);

    -- Seed Columns
    INSERT INTO public.columns (project_id, title, "position") VALUES
    (project_id, 'To Do', 1),
    (project_id, 'In Progress', 2),
    (project_id, 'Done', 3)
    RETURNING id, id, id INTO todo_col_id, inprogress_col_id, done_col_id;
    -- Note: The above RETURNING is illustrative; you'd fetch them properly.
    -- For simplicity, let's select them back.
    SELECT id INTO todo_col_id FROM public.columns WHERE project_id = project_id AND title = 'To Do';
    SELECT id INTO inprogress_col_id FROM public.columns WHERE project_id = project_id AND title = 'In Progress';
    SELECT id INTO done_col_id FROM public.columns WHERE project_id = project_id AND title = 'Done';

    -- Seed Tags
    INSERT INTO public.tags (name) VALUES ('frontend'), ('backend'), ('design')
    RETURNING id, id, id INTO frontend_tag_id, backend_tag_id, design_tag_id;
    SELECT id INTO frontend_tag_id FROM public.tags WHERE name = 'frontend';
    SELECT id INTO backend_tag_id FROM public.tags WHERE name = 'backend';
    SELECT id INTO design_tag_id FROM public.tags WHERE name = 'design';

    -- Seed Tasks
    INSERT INTO public.tasks (title, description, priority, column_id, creator_id, assignee_id, "position") VALUES
    ('Design launch page mockups', 'Create high-fidelity mockups for the main product launch page. Focus on a clean, modern aesthetic.', 'High', todo_col_id, alice_id, charlie_id, 1),
    ('Develop user authentication API', 'Build out the REST endpoints for user signup, login, and password reset. Use JWT for session management.', 'Urgent', inprogress_col_id, bob_id, alice_id, 1),
    ('Set up CI/CD pipeline', 'Configure GitHub Actions to automatically test and deploy the application to the staging environment.', 'Medium', done_col_id, alice_id, bob_id, 1)
    RETURNING id, id, id INTO task1_id, task2_id, task3_id;
    SELECT id INTO task1_id FROM public.tasks WHERE title = 'Design launch page mockups';
    SELECT id INTO task2_id FROM public.tasks WHERE title = 'Develop user authentication API';
    SELECT id INTO task3_id FROM public.tasks WHERE title = 'Set up CI/CD pipeline';

    -- Seed Task Tags
    INSERT INTO public.task_tags (task_id, tag_id) VALUES
    (task1_id, design_tag_id),
    (task1_id, frontend_tag_id),
    (task2_id, backend_tag_id);

    -- Seed Subtasks
    INSERT INTO public.subtasks (title, completed, task_id, creator_id) VALUES
    ('Create wireframes', true, task1_id, alice_id),
    ('Choose color palette', false, task1_id, alice_id),
    ('Implement /register endpoint', true, task2_id, bob_id),
    ('Implement /login endpoint', true, task2_id, bob_id),
    ('Add password hashing', false, task2_id, bob_id);

    -- Seed Comments
    INSERT INTO public.comments (text, task_id, author_id) VALUES
    ('Great progress on this! Let''s sync up tomorrow to review the final design.', task1_id, bob_id),
    ('Remember to add rate limiting to the login endpoint to prevent brute-force attacks.', task2_id, alice_id);

END $$;
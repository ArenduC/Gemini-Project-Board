export enum UserRole {
  ADMIN = 'Admin',
  MANAGER = 'Manager',
  MEMBER = 'Member',
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  creatorId: string;
  createdAt: string;
}

export enum TaskPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  URGENT = 'Urgent'
}

export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
}

export interface Comment {
    id: string;
    author: User;
    text: string;
    createdAt: string;
}

export interface TaskHistory {
  id: string;
  user: User;
  changeDescription: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  assignee?: User;
  subtasks: Subtask[];
  tags: string[];
  comments: Comment[];
  history: TaskHistory[];
  creatorId: string;
  createdAt: string;
}

export interface Column {
  id:string;
  title: string;
  taskIds: string[];
}

export interface BoardData {
  tasks: Record<string, Task>;
  columns: Record<string, Column>;
  columnOrder: string[];
}

export type NewTaskData = {
  title: string;
  description: string;
  priority: TaskPriority;
  columnId: string;
  assigneeId?: string;
};

export interface ChatMessage {
  id: string;
  author: User;
  text: string;
  createdAt: string;
}

export interface ProjectLink {
  id: string;
  title: string;
  url: string;
  projectId: string;
  creatorId: string;
  createdAt: string;
}

export interface Bug {
  id: string;
  bugNumber: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: string;
  assignee?: User;
  reporterId: string;
  createdAt: string;
  position: number;
}


export interface Project {
  id: string;
  name: string;
  description: string;
  board: BoardData;
  members: string[];
  creatorId: string;
  createdAt: string;
  chatMessages: ChatMessage[];
  links: ProjectLink[];
  bugs: Record<string, Bug>;
  bugOrder: string[];
}

export interface AppState {
  projects: Record<string, Project>;
  users: Record<string, User>;
  projectOrder: string[];
}

export interface FilterSegment {
  id: string;
  name: string;
  filters: {
    searchTerm: string;
    priorityFilter: string;
    assigneeFilter: string;
    statusFilter: string;
  };
}

export interface AugmentedTask extends Task {
  projectId: string;
  projectName: string;
  columnId: string;
  columnName: string;
}

export enum InviteAccessType {
    OPEN = 'open',
}

export interface ProjectInviteLink {
  id: string;
  project_id: string;
  token: string;
  created_by: string;
  created_at: string;
  role: UserRole;
  access_type: InviteAccessType;
  expires_at: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
}

export interface Notification {
  id: string;
  author: User;
  message: string;
  project: Project;
}

// Types for AI-generated project from CSV
export interface AiGeneratedTask {
  title: string;
  description: string;
  priority: TaskPriority;
  subtasks: { title: string }[];
}

export interface AiGeneratedColumn {
  title: string;
  tasks: AiGeneratedTask[];
}

export interface AiGeneratedProjectPlan {
  name: string;
  description: string;
  columns: AiGeneratedColumn[];
}

export enum FeedbackType {
  BUG = 'Bug Report',
  FEATURE = 'Feature Request',
  GENERAL = 'General Feedback',
}

export interface Feedback {
  id: string;
  createdAt: string;
  userId: string;
  type: FeedbackType;
  title: string;
  description: string;
  contextData: {
    url: string;
    userAgent: string;
  };
  status: 'new' | 'seen' | 'in-progress' | 'done';
}
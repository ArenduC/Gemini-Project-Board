

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

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  assignee?: User;
  subtasks: Subtask[];
  tags: string[];
  comments: Comment[];
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

export interface Project {
  id: string;
  name: string;
  description: string;
  board: BoardData;
  members: string[];
  creatorId: string;
  createdAt: string;
  chatMessages: ChatMessage[];
}

export interface AppState {
  projects: Record<string, Project>;
  users: Record<string, User>;
  projectOrder: string[];
}
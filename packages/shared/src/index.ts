// ============================================================
// Enumerations
// ============================================================

export type UserRole = 'OWNER' | 'TEAM_LEAD' | 'DEVELOPER' | 'VIEWER';

export type ProjectStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_COMMENTED'
  | 'PROJECT_MEMBER_ADDED'
  | 'PROJECT_MEMBER_REMOVED'
  | 'NEW_MESSAGE'
  | 'TEAM_MEMBER_JOINED'
  | 'MENTION';

export type ActivityType =
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED'
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED'
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_ASSIGNED'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_COMPLETED'
  | 'TASK_DELETED'
  | 'COMMENT_ADDED'
  | 'FILE_UPLOADED';

// ============================================================
// User types
// ============================================================

export interface UserPublic {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  isOnline: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends UserPublic {
  projects: ProjectSummary[];
}

// ============================================================
// Team types
// ============================================================

export interface Team {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: UserRole;
  user: UserPublic;
  joinedAt: string;
}

// ============================================================
// Project types
// ============================================================

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project extends ProjectSummary {
  members: ProjectMember[];
  taskCounts: {
    total: number;
    todo: number;
    inProgress: number;
    inReview: number;
    done: number;
  };
}

export interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  role: UserRole;
  user: UserPublic;
  joinedAt: string;
}

// ============================================================
// Task types
// ============================================================

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  assigneeId: string | null;
  creatorId: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  assignee: UserPublic | null;
  creator: UserPublic;
  commentCount: number;
}

export interface TaskWithComments extends Task {
  comments: Comment[];
}

// ============================================================
// Comment types
// ============================================================

export interface Comment {
  id: string;
  content: string;
  taskId: string;
  userId: string;
  user: UserPublic;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Message types
// ============================================================

export interface Message {
  id: string;
  content: string;
  projectId: string;
  userId: string;
  user: UserPublic;
  createdAt: string;
}

// ============================================================
// Notification types
// ============================================================

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  isRead: boolean;
  userId: string;
  referenceId: string | null;
  referenceType: string | null;
  createdAt: string;
}

// ============================================================
// Activity types
// ============================================================

export interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  projectId: string;
  userId: string;
  user: UserPublic;
  createdAt: string;
}

// ============================================================
// File types
// ============================================================

export interface ProjectFile {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  projectId: string;
  uploadedById: string;
  uploadedBy: UserPublic;
  createdAt: string;
}

// ============================================================
// API response types
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================
// Auth types
// ============================================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: UserPublic;
  tokens: AuthTokens;
}

// ============================================================
// Dashboard types
// ============================================================

export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  pendingTasks: number;
  completedTasks: number;
  assignedTasks: number;
  recentActivity: Activity[];
  recentNotifications: Notification[];
}

// ============================================================
// Socket event types
// ============================================================

export interface SocketEvents {
  // Chat
  'message:send': { projectId: string; content: string };
  'message:received': Message;
  'message:typing': { projectId: string; userId: string; isTyping: boolean };

  // Notifications
  'notification:new': Notification;

  // Presence
  'user:online': { userId: string };
  'user:offline': { userId: string };

  // Task
  'task:updated': Task;
}

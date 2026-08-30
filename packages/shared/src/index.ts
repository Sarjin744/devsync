// ============================================================
// Enumerations
// ============================================================

export type TeamRole = 'OWNER' | 'MEMBER';

export type ProjectRole = 'OWNER' | 'TEAM_LEAD' | 'DEVELOPER' | 'VIEWER';

export type UserRole = ProjectRole; // Alias for backward compatibility

export type ProjectStatus = 'ACTIVE' | 'ARCHIVED';

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

// ============================================================
// User types
// ============================================================

export interface UserPublic {
  id: string;
  name: string;
  email: string;
  profileImage?: string | null;
  avatar?: string | null;
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
  role: TeamRole;
  user: UserPublic;
  createdAt: string;
}

// ============================================================
// Project types
// ============================================================

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  teamId: string | null;
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
  role: ProjectRole;
  user: UserPublic;
  createdAt: string;
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

export type TaskComment = Comment;

// ============================================================
// Message types
// ============================================================

export interface Message {
  id: string;
  content: string;
  projectId: string;
  senderId: string;
  sender?: UserPublic;
  user?: UserPublic;
  createdAt: string;
  updatedAt?: string;
}

// ============================================================
// Notification types
// ============================================================

export interface Notification {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  isRead: boolean;
  userId: string;
  createdAt: string;
}

// ============================================================
// Activity types
// ============================================================

export interface Activity {
  id: string;
  action: string;
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
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  projectId: string;
  uploadedById: string;
  uploadedBy?: UserPublic;
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
  'message:send': { projectId: string; content: string };
  'message:received': Message;
  'message:typing': { projectId: string; userId: string; isTyping: boolean };
  'notification:new': Notification;
  'user:online': { userId: string };
  'user:offline': { userId: string };
  'task:updated': Task;
}

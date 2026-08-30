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
  | 'TASK_DUE_SOON'
  | 'TASK_OVERDUE'
  | 'PROJECT_INVITATION'
  | 'PROJECT_MEMBER_ADDED'
  | 'PROJECT_MEMBER_REMOVED'
  | 'PROJECT_ROLE_CHANGED'
  | 'MENTION'
  | 'CHAT_MESSAGE'
  | 'TASK_COMMENTED'
  | 'NEW_MESSAGE'
  | 'TEAM_MEMBER_JOINED';

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
  teams?: Array<{
    id: string;
    role: TeamRole;
    team: { id: string; name: string };
  }>;
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

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';

export interface TeamInvitation {
  id: string;
  teamId: string;
  invitedById: string;
  invitedUserId: string;
  role: TeamRole;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  team?: Team;
  invitedBy?: UserPublic;
  invitedUser?: UserPublic;
}

export interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: TeamRole;
  user: UserPublic;
  createdAt: string;
}

export interface TeamDetails extends Team {
  owner: UserPublic;
  members: TeamMember[];
  memberCount: number;
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
  title: string;
  message: string;
  isRead: boolean;
  userId: string;
  projectId?: string | null;
  taskId?: string | null;
  actorId?: string | null;
  actor?: UserPublic | null;
  createdAt: string;
}

export interface NotificationPreferences {
  taskAssignments: boolean;
  taskUpdates: boolean;
  projectInvitations: boolean;
  mentions: boolean;
}

// ============================================================
// Activity types
// ============================================================

export type ActivityType =
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED'
  | 'PROJECT_ARCHIVED'
  | 'PROJECT_RESTORED'
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED'
  | 'MEMBER_ROLE_CHANGED'
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_ASSIGNED'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_PRIORITY_CHANGED'
  | 'TASK_COMPLETED'
  | 'CHAT_MESSAGE'
  | 'FILE_UPLOADED'
  | 'FILE_RENAMED'
  | 'FILE_DELETED';

export interface Activity {
  id: string;
  action: string;
  type?: string | null;
  description: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
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
  originalName: string;
  storageKey: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  size: number;
  url: string;
  description?: string | null;
  projectId: string;
  uploadedById: string;
  uploadedBy?: UserPublic;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// API response types
// ============================================================

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: PaginationMeta;
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
  'file:new': ProjectFile;
  'file:updated': ProjectFile;
  'file:deleted': { fileId: string; projectId: string };
}

// ============================================================
// Search types
// ============================================================

export type SearchResultType = 'PROJECT' | 'TASK' | 'USER' | 'MESSAGE' | 'FILE' | 'ACTIVITY';

export interface SearchResultItem {
  id: string;
  type: SearchResultType;
  title: string;
  description?: string | null;
  snippet?: string | null;
  project?: {
    id: string;
    name: string;
  } | null;
  metadata?: Record<string, unknown> | null;
  url: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SearchData {
  query: string;
  results: SearchResultItem[];
  pagination: PaginationMeta;
}

export interface SearchQuery {
  q: string;
  type?: 'all' | 'projects' | 'tasks' | 'users' | 'messages' | 'files' | 'activity';
  projectId?: string;
  page?: number;
  limit?: number;
}

// ============================================================
// Dashboard & Analytics types
// ============================================================

export type ProjectHealthStatus = 'HEALTHY' | 'AT_RISK' | 'CRITICAL';

export interface ProjectHealth {
  status: ProjectHealthStatus;
  label: string;
  score: number;
  reasons: string[];
}

export interface TaskDistribution {
  todo: number;
  inProgress: number;
  inReview: number;
  done: number;
  total: number;
  completionRate: number;
}

export interface PriorityDistribution {
  low: number;
  medium: number;
  high: number;
  urgent: number;
}

export interface MemberWorkload {
  userId: string;
  name: string;
  email: string;
  profileImage?: string | null;
  role: string;
  openTasks: number;
  completedTasks: number;
  overdueTasks: number;
  totalAssigned: number;
}

export interface ProductivityPoint {
  date: string;
  completedCount: number;
}

export interface ProjectDashboardData {
  project: {
    id: string;
    name: string;
    description?: string | null;
    status: string;
  };
  tasks: {
    total: number;
    open: number;
    todo: number;
    inProgress: number;
    inReview: number;
    done: number;
    completionRate: number;
    overdue: number;
    priorityDistribution: PriorityDistribution;
  };
  health: ProjectHealth;
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    dueDate: string;
    priority: string;
    status: string;
    assigneeName?: string | null;
  }>;
  recentActivity: Activity[];
}

export interface DashboardOverviewData {
  projects: number;
  openTasks: number;
  completedTasks: number;
  overdueTasks: number;
  upcomingTasks: number;
  projectSummaries: Array<{
    id: string;
    name: string;
    description?: string | null;
    status: string;
    totalTasks: number;
    openTasks: number;
    completedTasks: number;
    overdueTasks: number;
    completionRate: number;
    memberCount: number;
    health: ProjectHealth;
  }>;
  recentActivity: Activity[];
  recentNotifications: Notification[];
}

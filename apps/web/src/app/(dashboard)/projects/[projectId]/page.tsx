'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { formatDate, getInitials } from '@/lib/utils';
import {
  Users,
  Building2,
  Calendar,
  Archive,
  RotateCcw,
  Trash2,
  Edit2,
  X,
  Loader2,
  ArrowLeft,
  UserMinus,
  UserPlus,
  LogOut,
  FolderKanban,
  CheckCircle2,
  MessageSquare,
  FileText,
  Activity,
  Layers,
  Plus,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { ProjectChat } from '@/components/chat/ProjectChat';

interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: 'OWNER' | 'TEAM_LEAD' | 'DEVELOPER' | 'VIEWER';
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    profileImage: string | null;
    isOnline: boolean;
  };
}

interface TeamMemberItem {
  id: string;
  userId: string;
  role: 'OWNER' | 'MEMBER';
  user: {
    id: string;
    name: string;
    email: string;
    profileImage: string | null;
  };
}

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  projectId: string;
  creatorId: string;
  assigneeId: string | null;
  dueDate: string | null;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
  assignee: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  teamId: string | null;
  team: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  status: 'ACTIVE' | 'ARCHIVED';
  ownerId: string;
  role: 'OWNER' | 'TEAM_LEAD' | 'DEVELOPER' | 'VIEWER';
  owner: {
    id: string;
    name: string;
    email: string;
  };
  members: ProjectMember[];
  memberCount: number;
  taskCount: number;
  createdAt: string;
  updatedAt: string;
}

const KANBAN_COLUMNS: { status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'; label: string; color: string }[] = [
  { status: 'TODO', label: 'To Do', color: 'border-t-gray-400' },
  { status: 'IN_PROGRESS', label: 'In Progress', color: 'border-t-blue-500' },
  { status: 'IN_REVIEW', label: 'In Review', color: 'border-t-purple-500' },
  { status: 'DONE', label: 'Done', color: 'border-t-emerald-500' },
];

const PRIORITY_BADGES: Record<string, { bg: string; text: string }> = {
  CRITICAL: { bg: 'bg-red-50 text-red-700 border-red-200', text: 'Critical' },
  HIGH: { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'High' },
  MEDIUM: { bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'Medium' },
  LOW: { bg: 'bg-gray-50 text-gray-700 border-gray-200', text: 'Low' },
};

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.projectId;
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    'tasks' | 'overview' | 'members' | 'chat' | 'files' | 'activity'
  >('tasks');

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  // Form states - Project
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [selectedNewUserId, setSelectedNewUserId] = useState('');
  const [selectedNewRole, setSelectedNewRole] = useState<'OWNER' | 'TEAM_LEAD' | 'DEVELOPER' | 'VIEWER'>('DEVELOPER');

  // Form states - Task Creation
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  // Filters - Tasks
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');

  // Drag state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Project query
  const { data: project, isLoading, isError } = useQuery<ProjectData>({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/projects/${projectId}`);
      return res.data.data;
    },
  });

  // Tasks query
  const { data: tasksData, isLoading: tasksLoading } = useQuery<{
    tasks: TaskItem[];
  }>({
    queryKey: ['tasks', projectId, priorityFilter, assigneeFilter],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (priorityFilter !== 'ALL') p.append('priority', priorityFilter);
      if (assigneeFilter === 'ME' && user) p.append('assigneeId', user.id);
      else if (assigneeFilter !== 'ALL' && assigneeFilter !== 'ME') p.append('assigneeId', assigneeFilter);

      const res = await apiClient.get(`/api/projects/${projectId}/tasks?${p.toString()}&limit=100`);
      return { tasks: res.data.data };
    },
  });

  const tasks = tasksData?.tasks || [];

  // Team members query (for add member modal)
  const { data: teamMembers = [] } = useQuery<TeamMemberItem[]>({
    queryKey: ['teamMembers', project?.teamId],
    enabled: !!project?.teamId && showAddMemberModal,
    queryFn: async () => {
      const res = await apiClient.get(`/api/teams/${project?.teamId}/members`);
      return res.data.data;
    },
  });

  const isOwner = project?.ownerId === user?.id || project?.role === 'OWNER';
  const isLead = project?.role === 'TEAM_LEAD';
  const canManage = isOwner || isLead;

  // Project Mutations
  const updateMutation = useMutation({
    mutationFn: async (payload: { name?: string; description?: string }) => {
      const res = await apiClient.patch(`/api/projects/${projectId}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowEditModal(false);
      toast.success('Project details updated');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to update project');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/api/projects/${projectId}/archive`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Project archived');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to archive project');
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/api/projects/${projectId}/restore`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Project restored');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to restore project');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/api/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted');
      router.push('/projects');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to delete project');
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/api/projects/${projectId}/leave`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Left project');
      router.push('/projects');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to leave project');
    },
  });

  // Task Mutations
  const createTaskMutation = useMutation({
    mutationFn: async (payload: {
      title: string;
      description?: string;
      priority: string;
      assigneeId?: string;
      dueDate?: string;
    }) => {
      const res = await apiClient.post(`/api/projects/${projectId}/tasks`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      setShowCreateTaskModal(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskPriority('MEDIUM');
      setTaskAssigneeId('');
      setTaskDueDate('');
      toast.success('Task created successfully');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to create task');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const res = await apiClient.patch(`/api/tasks/${taskId}/status`, { status });
      return res.data.data;
    },
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', projectId] });
      const previous = queryClient.getQueryData(['tasks', projectId, priorityFilter, assigneeFilter]);
      queryClient.setQueryData(
        ['tasks', projectId, priorityFilter, assigneeFilter],
        (old: { tasks: TaskItem[] } | undefined) => {
          if (!old) return old;
          return {
            tasks: old.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
          };
        },
      );
      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['tasks', projectId, priorityFilter, assigneeFilter], context.previous);
      }
      toast.error('Failed to update task status');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await apiClient.delete(`/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      setSelectedTask(null);
      toast.success('Task deleted');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to delete task');
    },
  });

  // Member Mutations
  const addMemberMutation = useMutation({
    mutationFn: async (payload: { userId: string; role: string }) => {
      const res = await apiClient.post(`/api/projects/${projectId}/members`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setShowAddMemberModal(false);
      setSelectedNewUserId('');
      toast.success('Member added');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to add member');
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ memberUserId, role }: { memberUserId: string; role: string }) => {
      const res = await apiClient.patch(`/api/projects/${projectId}/members/${memberUserId}`, { role });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Role updated');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to update role');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberUserId: string) => {
      await apiClient.delete(`/api/projects/${projectId}/members/${memberUserId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Member removed');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to remove member');
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <h3 className="font-bold text-gray-900 text-lg mb-2">Project Not Found</h3>
        <p className="text-sm text-gray-500 mb-6">
          You may not have permission to view this project or it may have been deleted.
        </p>
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl"
        >
          <ArrowLeft size={16} /> Back to Projects
        </Link>
      </div>
    );
  }

  const availableTeamUsers = teamMembers.filter(
    (tm) => !project.members.some((pm) => pm.userId === tm.userId),
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition"
      >
        <ArrowLeft size={16} /> Back to Projects
      </Link>

      {/* Main Header Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:p-8 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              {project.status === 'ARCHIVED' ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full">
                  <Archive size={12} /> Archived
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full">
                  <CheckCircle2 size={12} /> Active
                </span>
              )}
              <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                Role: {project.role}
              </span>
            </div>

            <p className="text-sm text-gray-600 max-w-3xl">
              {project.description || 'No description provided.'}
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-gray-400">
              {project.team && (
                <span className="flex items-center gap-1 text-indigo-600 font-medium">
                  <Building2 size={13} /> {project.team.name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users size={13} /> {project.members.length} members
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={13} /> Created {formatDate(project.createdAt)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={() => setShowCreateTaskModal(true)}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm"
            >
              <Plus size={14} /> New Task
            </button>

            {canManage && (
              <button
                onClick={() => {
                  setEditName(project.name);
                  setEditDesc(project.description || '');
                  setShowEditModal(true);
                }}
                className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold px-3.5 py-2 rounded-xl transition"
              >
                <Edit2 size={14} /> Edit
              </button>
            )}

            {canManage && (
              project.status === 'ACTIVE' ? (
                <button
                  onClick={() => archiveMutation.mutate()}
                  disabled={archiveMutation.isPending}
                  className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold px-3.5 py-2 rounded-xl transition border border-amber-200"
                >
                  <Archive size={14} /> Archive
                </button>
              ) : (
                <button
                  onClick={() => restoreMutation.mutate()}
                  disabled={restoreMutation.isPending}
                  className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold px-3.5 py-2 rounded-xl transition border border-emerald-200"
                >
                  <RotateCcw size={14} /> Restore
                </button>
              )
            )}

            {isOwner && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold px-3.5 py-2 rounded-xl transition border border-red-200"
              >
                <Trash2 size={14} /> Delete
              </button>
            )}

            {!isOwner && (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to leave this project?')) {
                    leaveMutation.mutate();
                  }
                }}
                disabled={leaveMutation.isPending}
                className="inline-flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-semibold px-3.5 py-2 rounded-xl transition border border-gray-200"
              >
                <LogOut size={14} /> Leave
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 pt-4 border-t border-gray-100 overflow-x-auto">
          {[
            { key: 'tasks', label: 'Kanban Board', icon: Layers },
            { key: 'overview', label: 'Overview', icon: FolderKanban },
            { key: 'members', label: `Members (${project.members.length})`, icon: Users },
            { key: 'chat', label: 'Chat', icon: MessageSquare },
            { key: 'files', label: 'Files', icon: FileText },
            { key: 'activity', label: 'Activity', icon: Activity },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as typeof activeTab)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                activeTab === key
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── TAB 1: KANBAN BOARD ───────────────────────────────────── */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase">Priority:</span>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="text-xs font-medium px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase">Assignee:</span>
                <select
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="text-xs font-medium px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none"
                >
                  <option value="ALL">All Members</option>
                  <option value="ME">Assigned to Me</option>
                  {project.members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <span className="text-xs text-gray-400 font-medium">
              Total {tasks.length} task{tasks.length !== 1 ? 's' : ''} in view
            </span>
          </div>

          {/* Kanban Columns Grid */}
          {tasksLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-indigo-600" size={28} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {KANBAN_COLUMNS.map((col) => {
                const columnTasks = tasks.filter((t) => t.status === col.status);

                return (
                  <div
                    key={col.status}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedTaskId) {
                        updateStatusMutation.mutate({ taskId: draggedTaskId, status: col.status });
                        setDraggedTaskId(null);
                      }
                    }}
                    className={`bg-gray-50/80 rounded-2xl border border-gray-200/70 p-3.5 flex flex-col min-h-[500px] border-t-4 ${col.color}`}
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between px-1 py-1.5 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-gray-800 uppercase tracking-wider">
                          {col.label}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full">
                          {columnTasks.length}
                        </span>
                      </div>
                      <button
                        onClick={() => setShowCreateTaskModal(true)}
                        className="text-gray-400 hover:text-indigo-600"
                        title="Add task"
                      >
                        <Plus size={15} />
                      </button>
                    </div>

                    {/* Column Task Cards */}
                    <div className="space-y-3 flex-1 overflow-y-auto pr-0.5">
                      {columnTasks.map((task) => {
                        const priorityInfo = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.MEDIUM;

                        return (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={() => setDraggedTaskId(task.id)}
                            onClick={() => setSelectedTask(task)}
                            className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-xs hover:shadow-md hover:border-indigo-200 transition cursor-pointer group space-y-3"
                          >
                            {/* Priority + Overdue tags */}
                            <div className="flex items-center justify-between gap-1.5">
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${priorityInfo.bg}`}
                              >
                                {priorityInfo.text}
                              </span>

                              {task.isOverdue && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                                  <AlertTriangle size={10} /> Overdue
                                </span>
                              )}
                            </div>

                            {/* Title & description */}
                            <div>
                              <h4 className="font-semibold text-gray-900 text-sm group-hover:text-indigo-600 transition leading-snug">
                                {task.title}
                              </h4>
                              {task.description ? (
                                <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                                  {task.description}
                                </p>
                              ) : null}
                            </div>

                            {/* Card Footer: Assignee & Due date */}
                            <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                              <div className="flex items-center gap-1.5">
                                {task.assignee ? (
                                  <div
                                    className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center"
                                    title={`Assigned to ${task.assignee.name}`}
                                  >
                                    {getInitials(task.assignee.name)}
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-gray-400">Unassigned</span>
                                )}
                              </div>

                              {task.dueDate && (
                                <div className={`flex items-center gap-1 text-[11px] ${task.isOverdue ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                                  <Clock size={11} />
                                  {formatDate(task.dueDate)}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: OVERVIEW ────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 text-base mb-3">Project Description</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {project.description || 'No description has been added for this project yet.'}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 text-base mb-4">Project Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-3.5 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Status</p>
                  <p className="font-semibold text-gray-900">{project.status}</p>
                </div>
                <div className="p-3.5 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Parent Team</p>
                  <p className="font-semibold text-gray-900">
                    {project.team ? project.team.name : 'Personal Project'}
                  </p>
                </div>
                <div className="p-3.5 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Created At</p>
                  <p className="font-semibold text-gray-900">{formatDate(project.createdAt)}</p>
                </div>
                <div className="p-3.5 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Last Updated</p>
                  <p className="font-semibold text-gray-900">{formatDate(project.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 text-sm mb-4">Project Owner</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                  {getInitials(project.owner.name)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{project.owner.name}</p>
                  <p className="text-xs text-gray-500">{project.owner.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: MEMBERS ─────────────────────────────────────────── */}
      {activeTab === 'members' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900 text-lg">Project Members ({project.members.length})</h2>
              <p className="text-xs text-gray-500 mt-0.5">Manage permissions and team roles for this project</p>
            </div>
            {canManage && (
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-sm"
              >
                <UserPlus size={14} /> Add Member
              </button>
            )}
          </div>

          <div className="divide-y divide-gray-50">
            {project.members.map((member) => {
              const isMemberOwner = member.role === 'OWNER';
              const isSelf = member.userId === user?.id;

              return (
                <div
                  key={member.id}
                  className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-gray-50/50 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {member.user.profileImage ? (
                        <img
                          src={member.user.profileImage}
                          alt={member.user.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        getInitials(member.user.name)
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 text-sm">{member.user.name}</p>
                        {isSelf && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{member.user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {isOwner && !isMemberOwner ? (
                      <select
                        value={member.role}
                        onChange={(e) =>
                          changeRoleMutation.mutate({
                            memberUserId: member.userId,
                            role: e.target.value,
                          })
                        }
                        className="text-xs font-semibold px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="TEAM_LEAD">Team Lead</option>
                        <option value="DEVELOPER">Developer</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                    ) : (
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          isMemberOwner
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : member.role === 'TEAM_LEAD'
                            ? 'bg-purple-50 text-purple-700'
                            : member.role === 'DEVELOPER'
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {member.role}
                      </span>
                    )}

                    {canManage && !isMemberOwner && !isSelf && (
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${member.user.name} from project?`)) {
                            removeMemberMutation.mutate(member.userId);
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Remove member"
                      >
                        <UserMinus size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 4: CHAT ───────────────────────────────────────────── */}
      {activeTab === 'chat' && (
        <ProjectChat projectId={projectId} members={project.members} />
      )}

      {/* ─── TAB 5: FILES (Placeholder) ─────────────────────────────── */}
      {activeTab === 'files' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center max-w-md mx-auto shadow-sm">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText size={24} />
          </div>
          <h3 className="font-semibold text-gray-900 text-lg">Project Files & Attachments</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Multi-file uploading and asset management will be available in Stage 8.
          </p>
        </div>
      )}

      {/* ─── TAB 6: ACTIVITY (Placeholder) ──────────────────────────── */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center max-w-md mx-auto shadow-sm">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Activity size={24} />
          </div>
          <h3 className="font-semibold text-gray-900 text-lg">Project Activity Log</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Detailed project audit trails and audit logs will be available in Stage 9.
          </p>
        </div>
      )}

      {/* ─── CREATE TASK MODAL ──────────────────────────────────────── */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowCreateTaskModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Create Task</h3>
            <p className="text-xs text-gray-500 mb-4">Add a new item to this project Kanban board.</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!taskTitle.trim()) {
                  toast.error('Task title is required');
                  return;
                }
                createTaskMutation.mutate({
                  title: taskTitle.trim(),
                  description: taskDesc.trim() || undefined,
                  priority: taskPriority,
                  assigneeId: taskAssigneeId || undefined,
                  dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : undefined,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Build JWT auth verification"
                  className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Task details and acceptance criteria..."
                  className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) =>
                      setTaskPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')
                    }
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                    Assignee
                  </label>
                  <select
                    value={taskAssigneeId}
                    onChange={(e) => setTaskAssigneeId(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Unassigned</option>
                    {project.members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.user.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTaskModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTaskMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition shadow-sm"
                >
                  {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── TASK DETAIL MODAL ──────────────────────────────────────── */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 space-y-4">
            <button
              onClick={() => setSelectedTask(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                  PRIORITY_BADGES[selectedTask.priority]?.bg
                }`}
              >
                {selectedTask.priority}
              </span>
              <h3 className="text-lg font-bold text-gray-900 mt-2">{selectedTask.title}</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                {selectedTask.description || 'No description provided.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                <span className="text-gray-400 uppercase font-semibold text-[10px]">Status</span>
                <select
                  value={selectedTask.status}
                  onChange={(e) => {
                    updateStatusMutation.mutate({
                      taskId: selectedTask.id,
                      status: e.target.value,
                    });
                    setSelectedTask({
                      ...selectedTask,
                      status: e.target.value as typeof selectedTask.status,
                    });
                  }}
                  className="w-full text-xs font-semibold bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="DONE">Done</option>
                </select>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                <span className="text-gray-400 uppercase font-semibold text-[10px]">Assignee</span>
                <p className="font-semibold text-gray-800">
                  {selectedTask.assignee ? selectedTask.assignee.name : 'Unassigned'}
                </p>
              </div>

              {selectedTask.dueDate && (
                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <span className="text-gray-400 uppercase font-semibold text-[10px]">Due Date</span>
                  <p className={`font-semibold ${selectedTask.isOverdue ? 'text-red-600' : 'text-gray-800'}`}>
                    {formatDate(selectedTask.dueDate)} {selectedTask.isOverdue && '(Overdue)'}
                  </p>
                </div>
              )}

              <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                <span className="text-gray-400 uppercase font-semibold text-[10px]">Created At</span>
                <p className="font-semibold text-gray-800">{formatDate(selectedTask.createdAt)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <button
                onClick={() => {
                  if (confirm('Delete this task?')) {
                    deleteTaskMutation.mutate(selectedTask.id);
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition"
              >
                <Trash2 size={13} /> Delete Task
              </button>

              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT PROJECT MODAL ─────────────────────────────────────── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Edit Project</h3>
            <p className="text-xs text-gray-500 mb-5">Update project details and settings.</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate({ name: editName, description: editDesc });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ADD MEMBER MODAL ───────────────────────────────────────── */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowAddMemberModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <UserPlus size={18} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Add Project Member</h3>
            </div>
            <p className="text-xs text-gray-500 mb-5">
              Select a member from the parent team to add to this project.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!selectedNewUserId) {
                  toast.error('Please select a team member');
                  return;
                }
                addMemberMutation.mutate({
                  userId: selectedNewUserId,
                  role: selectedNewRole,
                });
              }}
              className="space-y-4"
            >
              {availableTeamUsers.length > 0 ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                    Team Member *
                  </label>
                  <select
                    value={selectedNewUserId}
                    onChange={(e) => setSelectedNewUserId(e.target.value)}
                    required
                    className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Select a member...</option>
                    {availableTeamUsers.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.user.name} ({m.user.email})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-xl">
                  All members from the parent team are already assigned to this project.
                </p>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Project Role *
                </label>
                <select
                  value={selectedNewRole}
                  onChange={(e) =>
                    setSelectedNewRole(
                      e.target.value as 'OWNER' | 'TEAM_LEAD' | 'DEVELOPER' | 'VIEWER',
                    )
                  }
                  className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="DEVELOPER">Developer (Work on tasks, comment, chat)</option>
                  <option value="TEAM_LEAD">Team Lead (Manage project & members)</option>
                  <option value="VIEWER">Viewer (Read-only access)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMemberMutation.isPending || availableTeamUsers.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition disabled:opacity-60"
                >
                  {addMemberMutation.isPending ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DELETE PROJECT MODAL ───────────────────────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
              <Trash2 size={20} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Delete Project</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to permanently delete <strong>{project.name}</strong>? All project data, tasks, and memberships will be removed. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition disabled:opacity-60"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

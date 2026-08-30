'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { cn, TASK_STATUS_COLORS, PRIORITY_COLORS, formatDate, getInitials } from '@/lib/utils';
import type { Project, Task } from '@devsync/shared';
import { Plus, Loader2, MessageSquare, Calendar, Flag } from 'lucide-react';
import Link from 'next/link';

const KANBAN_COLUMNS = [
  { status: 'TODO', label: 'To Do' },
  { status: 'IN_PROGRESS', label: 'In Progress' },
  { status: 'IN_REVIEW', label: 'In Review' },
  { status: 'DONE', label: 'Done' },
] as const;

function TaskCard({
  task,
  onStatusChange,
}: {
  task: Task;
  onStatusChange: (taskId: string, status: string) => void;
}) {
  const colors = TASK_STATUS_COLORS[task.status];
  const priorityColors = PRIORITY_COLORS[task.priority];

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold text-gray-900 leading-snug">{task.title}</h4>
        <span className={cn('text-xs px-1.5 py-0.5 rounded-md font-medium flex-shrink-0', priorityColors.bg, priorityColors.text)}>
          {task.priority}
        </span>
      </div>

      {task.description && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{task.description}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.assignee && (
            <div
              className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700"
              title={task.assignee.name}
            >
              {getInitials(task.assignee.name)}
            </div>
          )}
          {task.dueDate && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Calendar size={11} />
              {formatDate(task.dueDate)}
            </div>
          )}
        </div>
        {task.commentCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <MessageSquare size={11} />
            {task.commentCount}
          </div>
        )}
      </div>

      {/* Quick status change */}
      <select
        className="mt-3 w-full text-xs rounded-lg border border-gray-200 px-2 py-1 text-gray-600 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        value={task.status}
        onChange={(e) => onStatusChange(task.id, e.target.value)}
      >
        {KANBAN_COLUMNS.map(({ status, label }) => (
          <option key={status} value={status}>{label}</option>
        ))}
      </select>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'board' | 'members' | 'activity'>('board');

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/projects/${projectId}`);
      return res.data.data as Project;
    },
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/tasks?projectId=${projectId}`);
      return res.data.data as Task[];
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const res = await apiClient.patch(`/api/tasks/${taskId}/status`, { status });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      toast.success('Task status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  if (projectLoading) {
    return (
      <div className="p-8 flex items-center gap-3 text-gray-500">
        <Loader2 size={20} className="animate-spin" />
        Loading project...
      </div>
    );
  }

  const tasksByStatus = KANBAN_COLUMNS.map(({ status, label }) => ({
    status,
    label,
    tasks: tasks?.filter((t) => t.status === status) ?? [],
  }));

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-6 py-5 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
            <span className="text-indigo-700 font-bold">{project?.name.charAt(0)}</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{project?.name}</h1>
            {project?.description && (
              <p className="text-sm text-gray-500">{project.description}</p>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
            <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-medium">
              {project?.taskCounts.total ?? 0} tasks
            </span>
            <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium">
              {project?.members.length ?? 0} members
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {(['board', 'members', 'activity'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium transition capitalize',
                activeTab === tab
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-500 hover:bg-gray-50',
              )}
            >
              {tab}
            </button>
          ))}
          <Link
            href={`/projects/${projectId}/chat`}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition"
          >
            Chat
          </Link>
        </div>
      </div>

      {/* Kanban Board */}
      {activeTab === 'board' && (
        <div className="flex-1 overflow-x-auto p-6">
          {tasksLoading ? (
            <div className="flex items-center gap-3 text-gray-500">
              <Loader2 size={16} className="animate-spin" />
              Loading tasks...
            </div>
          ) : (
            <div className="flex gap-4 h-full min-w-max">
              {tasksByStatus.map(({ status, label, tasks: columnTasks }) => {
                const colors = TASK_STATUS_COLORS[status as keyof typeof TASK_STATUS_COLORS];
                return (
                  <div key={status} className="w-72 flex flex-col">
                    {/* Column header */}
                    <div className={cn('flex items-center justify-between px-3 py-2.5 rounded-xl mb-3', colors.bg)}>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-sm font-semibold', colors.text)}>{label}</span>
                        <span className={cn('text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center', colors.bg, colors.text)}>
                          {columnTasks.length}
                        </span>
                      </div>
                      <button className={cn('text-sm', colors.text)}>
                        <Plus size={16} />
                      </button>
                    </div>

                    {/* Tasks */}
                    <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                      {columnTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onStatusChange={(taskId, newStatus) =>
                            statusMutation.mutate({ taskId, status: newStatus })
                          }
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Members tab */}
      {activeTab === 'members' && (
        <div className="p-6 max-w-2xl">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Project Members</h2>
          <div className="space-y-2">
            {project?.members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700">
                  {getInitials(member.user.name)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{member.user.name}</p>
                  <p className="text-xs text-gray-500">{member.user.email}</p>
                </div>
                <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

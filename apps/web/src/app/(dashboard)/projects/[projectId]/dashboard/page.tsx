'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api';
import { formatRelative, getInitials } from '@/lib/utils';
import type {
  ProjectDashboardData,
  MemberWorkload,
  ProductivityPoint,
  ProjectHealthStatus,
} from '@devsync/shared';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Users,
  Activity,
  Calendar,
  CheckSquare,
  TrendingUp,
  Loader2,
  Layers,
  Flame,
} from 'lucide-react';
import Link from 'next/link';

const HEALTH_COLORS: Record<
  ProjectHealthStatus,
  { bg: string; text: string; border: string; dot: string; title: string }
> = {
  HEALTHY: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    title: 'Project is in healthy condition',
  },
  AT_RISK: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    title: 'Project has moderate overdue tasks',
  },
  CRITICAL: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
    title: 'Project has high overdue rate',
  },
};

export default function ProjectDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const [productivityRange, setProductivityRange] = useState<'7d' | '30d' | '90d'>('30d');

  // 1. Fetch Main Project Insights & Metrics
  const { data: dashboardData, isLoading: isDashboardLoading, isError } = useQuery<ProjectDashboardData>({
    queryKey: ['project-dashboard', projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/projects/${projectId}/dashboard`);
      return res.data.data as ProjectDashboardData;
    },
  });

  // 2. Fetch Team Workload
  const { data: workloadData, isLoading: isWorkloadLoading } = useQuery<{ members: MemberWorkload[] }>({
    queryKey: ['project-workload', projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/projects/${projectId}/dashboard/workload`);
      return res.data.data as { members: MemberWorkload[] };
    },
  });

  // 3. Fetch Productivity Trend
  const { data: productivityData, isLoading: isProductivityLoading } = useQuery<{
    range: string;
    trend: ProductivityPoint[];
  }>({
    queryKey: ['project-productivity', projectId, productivityRange],
    queryFn: async () => {
      const res = await apiClient.get(
        `/api/projects/${projectId}/dashboard/productivity?range=${productivityRange}`,
      );
      return res.data.data as { range: string; trend: ProductivityPoint[] };
    },
  });

  if (isDashboardLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  if (isError || !dashboardData) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle size={36} className="text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-gray-900">Failed to load project insights</h2>
        <p className="text-xs text-gray-500">You may not have permission to view this project dashboard.</p>
        <button
          onClick={() => router.push('/projects')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  const { project, tasks, health, upcomingDeadlines, recentActivity } = dashboardData;
  const healthConfig = HEALTH_COLORS[health.status] || HEALTH_COLORS.HEALTHY;
  const trendPoints = productivityData?.trend || [];
  const maxCompleted = Math.max(...trendPoints.map((p) => p.completedCount), 1);
  const totalPeriodCompleted = trendPoints.reduce((acc, p) => acc + p.completedCount, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-indigo-600 transition mb-1"
          >
            <ArrowLeft size={14} /> Back to Project
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{project.name}</h1>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${healthConfig.bg} ${healthConfig.text} ${healthConfig.border}`}
            >
              <span className={`w-2 h-2 rounded-full ${healthConfig.dot}`} />
              {health.label}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {health.reasons.join(' ')} (Health Score: {health.score}/100)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/projects/${projectId}?tab=kanban`}
            className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold shadow-2xs transition"
          >
            Open Kanban Board
          </Link>
        </div>
      </div>

      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold">Total Tasks</span>
            <Layers size={16} className="text-indigo-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{tasks.total}</p>
          <p className="text-[11px] text-gray-400 font-medium">{tasks.open} remaining open</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold">Completion Rate</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-emerald-600">{tasks.completionRate}%</p>
          <p className="text-[11px] text-gray-400 font-medium">{tasks.done} tasks completed</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold">Overdue Tasks</span>
            <AlertTriangle size={16} className={tasks.overdue > 0 ? 'text-rose-500' : 'text-gray-400'} />
          </div>
          <p className={`text-3xl font-bold ${tasks.overdue > 0 ? 'text-rose-600' : 'text-gray-900'}`}>
            {tasks.overdue}
          </p>
          <p className="text-[11px] text-gray-400 font-medium">Past designated deadline</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold">Project Members</span>
            <Users size={16} className="text-sky-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{workloadData?.members.length || 1}</p>
          <p className="text-[11px] text-gray-400 font-medium">Collaborating on project</p>
        </div>
      </div>

      {/* Row 2: Task Distribution & Priority Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Distribution Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-gray-900">Task Status Distribution</h3>
              <p className="text-xs text-gray-400 mt-0.5">Workflow stages across the project</p>
            </div>
            <span className="text-xs font-bold text-indigo-600">{tasks.total} Total</span>
          </div>

          {/* Stacked Progress Bar */}
          <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex">
            {tasks.total > 0 ? (
              <>
                <div
                  style={{ width: `${(tasks.todo / tasks.total) * 100}%` }}
                  className="bg-amber-400 h-full transition-all"
                  title={`Todo: ${tasks.todo}`}
                />
                <div
                  style={{ width: `${(tasks.inProgress / tasks.total) * 100}%` }}
                  className="bg-blue-500 h-full transition-all"
                  title={`In Progress: ${tasks.inProgress}`}
                />
                <div
                  style={{ width: `${(tasks.inReview / tasks.total) * 100}%` }}
                  className="bg-purple-500 h-full transition-all"
                  title={`In Review: ${tasks.inReview}`}
                />
                <div
                  style={{ width: `${(tasks.done / tasks.total) * 100}%` }}
                  className="bg-emerald-500 h-full transition-all"
                  title={`Done: ${tasks.done}`}
                />
              </>
            ) : (
              <div className="w-full h-full bg-gray-200" />
            )}
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-xl">
              <span className="text-[11px] font-bold text-amber-700 block">TODO</span>
              <span className="text-lg font-bold text-amber-900">{tasks.todo}</span>
            </div>
            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
              <span className="text-[11px] font-bold text-blue-700 block">IN PROGRESS</span>
              <span className="text-lg font-bold text-blue-900">{tasks.inProgress}</span>
            </div>
            <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-xl">
              <span className="text-[11px] font-bold text-purple-700 block">IN REVIEW</span>
              <span className="text-lg font-bold text-purple-900">{tasks.inReview}</span>
            </div>
            <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">
              <span className="text-[11px] font-bold text-emerald-700 block">DONE</span>
              <span className="text-lg font-bold text-emerald-900">{tasks.done}</span>
            </div>
          </div>
        </div>

        {/* Priority Breakdown Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-gray-900">Task Priority Breakdown</h3>
              <p className="text-xs text-gray-400 mt-0.5">Task urgency distribution</p>
            </div>
            <Flame size={18} className="text-amber-500" />
          </div>

          <div className="space-y-3 pt-1">
            {[
              { label: 'Critical / Urgent', count: tasks.priorityDistribution.urgent, color: 'bg-rose-500', text: 'text-rose-700' },
              { label: 'High Priority', count: tasks.priorityDistribution.high, color: 'bg-amber-500', text: 'text-amber-700' },
              { label: 'Medium Priority', count: tasks.priorityDistribution.medium, color: 'bg-blue-500', text: 'text-blue-700' },
              { label: 'Low Priority', count: tasks.priorityDistribution.low, color: 'bg-gray-400', text: 'text-gray-600' },
            ].map((p, idx) => {
              const percent = tasks.total > 0 ? Math.round((p.count / tasks.total) * 100) : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                    <span className={p.text}>{p.label}</span>
                    <span>
                      {p.count} <span className="text-gray-400 font-normal">({percent}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${p.color} rounded-full transition-all duration-300`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3: Productivity Trend (Interactive Chart) */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-600" />
              <h3 className="font-bold text-sm text-gray-900">Project Productivity Trend</h3>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Completed tasks per day • {totalPeriodCompleted} total in selected range
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl self-start sm:self-auto">
            {(['7d', '30d', '90d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setProductivityRange(r)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  productivityRange === r ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* Productivity Bar Visualizer */}
        {isProductivityLoading ? (
          <div className="h-44 flex items-center justify-center">
            <Loader2 className="animate-spin text-indigo-600" size={24} />
          </div>
        ) : trendPoints.length === 0 ? (
          <p className="text-xs text-gray-400 py-12 text-center">No task completion data recorded in this period.</p>
        ) : (
          <div className="space-y-2">
            <div className="h-36 flex items-end gap-1 sm:gap-1.5 pt-4 pb-2 border-b border-gray-100">
              {trendPoints.map((p, idx) => {
                const heightPercent = Math.max(6, Math.round((p.completedCount / maxCompleted) * 100));
                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative"
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute -top-7 hidden group-hover:flex items-center px-1.5 py-0.5 bg-gray-900 text-white text-[10px] font-bold rounded shadow-md whitespace-nowrap z-10">
                      {p.date}: {p.completedCount} done
                    </div>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-[18px] rounded-t-md transition-all ${
                        p.completedCount > 0
                          ? 'bg-indigo-600 group-hover:bg-indigo-700'
                          : 'bg-gray-100'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[10px] font-semibold text-gray-400 px-1">
              <span>{trendPoints[0]?.date}</span>
              <span>{trendPoints[trendPoints.length - 1]?.date}</span>
            </div>
          </div>
        )}
      </div>

      {/* Row 4: Team Workload & Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Workload */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-sky-600" />
              <h3 className="font-bold text-sm text-gray-900">Team Workload</h3>
            </div>
            <span className="text-xs text-gray-400">Assigned Tasks</span>
          </div>

          {isWorkloadLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="animate-spin text-indigo-600" size={24} />
            </div>
          ) : !workloadData?.members || workloadData.members.length === 0 ? (
            <p className="text-xs text-gray-400 py-8 text-center">No assigned members found.</p>
          ) : (
            <div className="space-y-4 divide-y divide-gray-50">
              {workloadData.members.map((member) => (
                <div key={member.userId} className="pt-3 first:pt-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {getInitials(member.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{member.name}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-semibold">{member.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className="text-gray-700">{member.openTasks} open</span>
                      {member.overdueTasks > 0 && (
                        <span className="text-rose-600 font-bold">({member.overdueTasks} overdue)</span>
                      )}
                      <span className="text-emerald-600">• {member.completedTasks} done</span>
                    </div>
                  </div>

                  {/* Visual workload bar */}
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                    {member.totalAssigned > 0 && (
                      <>
                        <div
                          style={{ width: `${(member.overdueTasks / member.totalAssigned) * 100}%` }}
                          className="bg-rose-500 h-full"
                        />
                        <div
                          style={{ width: `${((member.openTasks - member.overdueTasks) / member.totalAssigned) * 100}%` }}
                          className="bg-indigo-600 h-full"
                        />
                        <div
                          style={{ width: `${(member.completedTasks / member.totalAssigned) * 100}%` }}
                          className="bg-emerald-500 h-full"
                        />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-indigo-600" />
              <h3 className="font-bold text-sm text-gray-900">Upcoming Deadlines</h3>
            </div>
            <span className="text-xs text-gray-400">Next due tasks</span>
          </div>

          {upcomingDeadlines.length === 0 ? (
            <div className="py-12 text-center text-gray-400 space-y-1">
              <CheckSquare size={28} className="mx-auto text-gray-300" />
              <p className="text-xs font-medium">No upcoming deadlines.</p>
              <p className="text-[11px]">All active tasks have been addressed or have no due dates set.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {upcomingDeadlines.map((task) => (
                <div key={task.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{task.title}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Assigned: {task.assigneeName || 'Unassigned'} • Status: {task.status}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className="text-xs font-bold text-indigo-600 block">
                      {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                    <span className="text-[10px] font-semibold text-gray-400">
                      {formatRelative(task.dueDate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 5: Recent Activity */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-indigo-600" />
            <h3 className="font-bold text-sm text-gray-900">Project Activity Timeline</h3>
          </div>
          <Link
            href={`/projects/${projectId}?tab=activity`}
            className="text-xs text-indigo-600 font-semibold hover:underline"
          >
            View all activity
          </Link>
        </div>

        {recentActivity.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="py-3 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {activity.user?.name ? getInitials(activity.user.name) : 'DS'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-900 font-medium">
                    <span className="font-bold">{activity.user?.name || 'A project member'}</span>{' '}
                    {activity.description}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {formatRelative(activity.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 py-6 text-center">No activity recorded for this project yet.</p>
        )}
      </div>
    </div>
  );
}

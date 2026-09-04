'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatRelative, getInitials } from '@/lib/utils';
import { getSocket } from '@/lib/socket';
import type { DashboardOverviewData, ProjectHealthStatus } from '@devsync/shared';
import {
  FolderKanban,
  CheckSquare,
  Clock,
  Activity,
  TrendingUp,
  AlertCircle,
  Plus,
  Users,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

const HEALTH_COLORS: Record<
  ProjectHealthStatus,
  { bg: string; text: string; border: string; dot: string }
> = {
  HEALTHY: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  AT_RISK: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  CRITICAL: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
};

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  href,
  badge,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  href?: string;
  badge?: string;
}) {
  const content = (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition group h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon size={18} className="text-white" />
          </div>
          {badge ? (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-gray-100 text-gray-600 rounded-md">
              {badge}
            </span>
          ) : href ? (
            <TrendingUp size={14} className="text-gray-300 group-hover:text-indigo-600 transition" />
          ) : null}
        </div>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
      <p className="text-xs font-semibold text-gray-500 mt-2">{label}</p>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: stats, isLoading } = useQuery<DashboardOverviewData>({
    queryKey: ['dashboard-overview'],
    queryFn: async () => {
      const response = await apiClient.get('/api/dashboard/overview');
      return response.data.data as DashboardOverviewData;
    },
    refetchInterval: 30000,
  });

  // Real-Time Socket.IO update listener
  useEffect(() => {
    if (!user) return;
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('devsync_access_token') || ''
        : '';
    const socket = getSocket(token);

    if (!socket.connected) socket.connect();

    const handleDataChanged = () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    };

    socket.on('task:updated', handleDataChanged);
    socket.on('notification:new', handleDataChanged);

    return () => {
      socket.off('task:updated', handleDataChanged);
      socket.off('notification:new', handleDataChanged);
    };
  }, [user, queryClient]);

  const projects = stats?.projectSummaries || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Welcome back, {user?.name ? user.name.split(' ')[0] : 'there'} 👋
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Here is your project health, productivity metrics, and team activity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <Plus size={14} /> New Project
          </Link>
        </div>
      </div>

      {/* Top 4 Metric Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Projects"
          value={stats?.projects ?? 0}
          icon={FolderKanban}
          color="bg-indigo-600"
          href="/projects"
        />
        <StatCard
          label="Open Tasks"
          value={stats?.openTasks ?? 0}
          icon={Clock}
          color="bg-amber-500"
          href="/tasks"
        />
        <StatCard
          label="Completed Tasks"
          value={stats?.completedTasks ?? 0}
          icon={CheckSquare}
          color="bg-emerald-600"
          href="/tasks"
        />
        <StatCard
          label="Overdue Tasks"
          value={stats?.overdueTasks ?? 0}
          icon={AlertCircle}
          color="bg-rose-500"
          href="/tasks"
          badge={stats?.overdueTasks ? 'Attention' : undefined}
        />
      </div>

      {/* Project Summaries & Health Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Project Insights & Health</h2>
          <Link href="/projects" className="text-xs text-indigo-600 font-semibold hover:underline">
            View all projects
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 bg-white rounded-2xl border border-gray-100 animate-pulse p-6" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center space-y-2">
            <FolderKanban size={36} className="text-gray-300 mx-auto" />
            <h3 className="text-sm font-bold text-gray-900">No active projects</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Create or join a project to start tracking tasks, workload, and health metrics.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => {
              const healthConfig = HEALTH_COLORS[project.health.status] || HEALTH_COLORS.HEALTHY;

              return (
                <div
                  key={project.id}
                  className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition flex flex-col justify-between group space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm text-gray-900 group-hover:text-indigo-600 transition truncate">
                        {project.name}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${healthConfig.bg} ${healthConfig.text} ${healthConfig.border}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${healthConfig.dot}`} />
                        {project.health.status}
                      </span>
                    </div>

                    <p className="text-xs text-gray-400 line-clamp-2">
                      {project.description || 'No description provided'}
                    </p>
                  </div>

                  {/* Progress & Metrics */}
                  <div className="space-y-2 pt-2 border-t border-gray-50">
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
                      <span>Completion</span>
                      <span>{project.completionRate}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${project.completionRate}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium pt-1">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {project.openTasks} open
                      </span>
                      {project.overdueTasks > 0 && (
                        <span className="flex items-center gap-1 text-rose-600 font-bold">
                          <AlertTriangle size={12} /> {project.overdueTasks} overdue
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {project.memberCount} members
                      </span>
                    </div>
                  </div>

                  {/* Action Link to Project Dashboard */}
                  <Link
                    href={`/projects/${project.id}/dashboard`}
                    className="w-full flex items-center justify-center gap-1 py-2 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 text-gray-700 rounded-xl text-xs font-semibold transition"
                  >
                    <span>View Analytics</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Row: Recent Activity */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-indigo-600" />
            <h3 className="font-bold text-sm text-gray-900">Recent Team Activity</h3>
          </div>
          <span className="text-xs text-gray-400">Live feed</span>
        </div>

        {stats?.recentActivity && stats.recentActivity.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {stats.recentActivity.map((activity) => (
              <div key={activity.id} className="py-3 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {activity.user?.name ? getInitials(activity.user.name) : 'DS'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-900 font-medium">
                    <span className="font-bold">{activity.user?.name || 'A team member'}</span>{' '}
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
          <p className="text-xs text-gray-400 py-6 text-center">No recent activity logged yet.</p>
        )}
      </div>
    </div>
  );
}

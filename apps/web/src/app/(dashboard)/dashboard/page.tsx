'use client';

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatRelative, getInitials } from '@/lib/utils';
import type { DashboardStats } from '@devsync/shared';
import {
  FolderKanban,
  CheckSquare,
  Clock,
  Activity,
  TrendingUp,
  AlertCircle,
  Plus,
} from 'lucide-react';
import Link from 'next/link';

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  href,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  href?: string;
}) {
  const content = (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition group">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
        {href && (
          <TrendingUp
            size={14}
            className="text-gray-300 group-hover:text-indigo-400 transition"
          />
        )}
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await apiClient.get('/api/dashboard');
      return response.data.data as DashboardStats;
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64 mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Projects', value: stats?.totalProjects ?? 0, icon: FolderKanban, color: 'bg-indigo-500', href: '/projects' },
    { label: 'Active Projects', value: stats?.activeProjects ?? 0, icon: Activity, color: 'bg-emerald-500', href: '/projects' },
    { label: 'My Tasks', value: stats?.assignedTasks ?? 0, icon: CheckSquare, color: 'bg-amber-500', href: '/projects' },
    { label: 'Pending Tasks', value: stats?.pendingTasks ?? 0, icon: Clock, color: 'bg-blue-500' },
    { label: 'Completed', value: stats?.completedTasks ?? 0, icon: AlertCircle, color: 'bg-purple-500' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-sm text-gray-500">Good day,</p>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h1>
        </div>
        <Link
          href="/projects/new"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <Plus size={16} />
          New Project
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Activity</h2>
            <Activity size={16} className="text-gray-400" />
          </div>
          <div className="divide-y divide-gray-50">
            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.slice(0, 8).map((activity) => (
                <div key={activity.id} className="px-5 py-3.5 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 flex-shrink-0 mt-0.5">
                    {getInitials(activity.user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 leading-snug">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatRelative(activity.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-12 text-center">
                <Activity size={32} className="text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Notifications</h2>
            <Link href="/notifications" className="text-xs text-indigo-600 font-medium hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stats?.recentNotifications && stats.recentNotifications.length > 0 ? (
              stats.recentNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`px-5 py-3.5 flex items-start gap-3 ${!notif.isRead ? 'bg-indigo-50/40' : ''}`}
                >
                  {!notif.isRead && (
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0 mt-2" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 leading-snug">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatRelative(notif.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-12 text-center">
                <p className="text-sm text-gray-400">No notifications</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

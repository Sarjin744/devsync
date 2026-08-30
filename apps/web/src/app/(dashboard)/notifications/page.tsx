'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api';
import toast from 'react-hot-toast';
import { formatRelative } from '@/lib/utils';
import {
  Bell,
  Check,
  Trash2,
  CheckSquare,
  Users,
  MessageSquare,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  userId: string;
  projectId?: string | null;
  taskId?: string | null;
  actorId?: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  const { data, isLoading } = useQuery<{
    notifications: NotificationItem[];
    pagination?: { total: number };
  }>({
    queryKey: ['notifications', filter],
    queryFn: async () => {
      const url =
        filter === 'UNREAD'
          ? '/api/notifications?isRead=false&limit=50'
          : '/api/notifications?limit=50';
      const res = await apiClient.get(url);
      const payload = res.data.data;
      return {
        notifications: payload?.notifications || payload || [],
        pagination: payload?.pagination || res.data.pagination,
      };
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => apiClient.patch('/api/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/api/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification deleted');
    },
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED':
      case 'TASK_STATUS_CHANGED':
      case 'TASK_DUE_SOON':
      case 'TASK_OVERDUE':
        return <CheckSquare size={18} className="text-indigo-600" />;
      case 'PROJECT_INVITATION':
      case 'PROJECT_MEMBER_ADDED':
      case 'PROJECT_ROLE_CHANGED':
        return <Users size={18} className="text-emerald-600" />;
      case 'CHAT_MESSAGE':
      case 'NEW_MESSAGE':
        return <MessageSquare size={18} className="text-purple-600" />;
      default:
        return <Bell size={18} className="text-gray-500" />;
    }
  };

  const handleNotificationClick = (n: NotificationItem) => {
    if (!n.isRead) {
      markOneMutation.mutate(n.id);
    }
    if (n.projectId) {
      router.push(`/projects/${n.projectId}`);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            Stay updated with your tasks, project invitations, and team activity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter Pills */}
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === 'ALL'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('UNREAD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === 'UNREAD'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Unread
            </button>
          </div>

          <button
            onClick={() => markAllMutation.mutate()}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-700 rounded-xl text-xs font-semibold transition"
          >
            <Check size={14} />
            Mark all read
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      ) : notifications.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`p-4 px-6 flex items-start gap-4 hover:bg-gray-50/80 transition cursor-pointer group ${
                !n.isRead ? 'bg-indigo-50/20' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-2xl bg-white border border-gray-100 shadow-2xs flex items-center justify-center flex-shrink-0 mt-0.5">
                {getNotificationIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm ${
                        !n.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-800'
                      }`}
                    >
                      {n.title || 'DevSync Alert'}
                    </p>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 flex-shrink-0" />
                    )}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {formatRelative(n.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{n.message}</p>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0 mt-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate(n.id);
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition"
                  title="Delete notification"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bell size={24} />
          </div>
          <h3 className="font-bold text-gray-900 text-base">No notifications</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            {filter === 'UNREAD'
              ? 'You have read all of your notifications.'
              : 'You have no notifications yet. Activities and task assignments will appear here.'}
          </p>
        </div>
      )}
    </div>
  );
}

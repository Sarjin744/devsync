'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api';
import toast from 'react-hot-toast';
import { formatRelative } from '@/lib/utils';
import type { Notification } from '@devsync/shared';
import { Bell, Check } from 'lucide-react';

const TYPE_ICONS: Record<string, string> = {
  TASK_ASSIGNED: '📋',
  TASK_STATUS_CHANGED: '🔄',
  TASK_COMMENTED: '💬',
  PROJECT_MEMBER_ADDED: '👤',
  PROJECT_MEMBER_REMOVED: '🚫',
  NEW_MESSAGE: '✉️',
  TEAM_MEMBER_JOINED: '🎉',
  MENTION: '@',
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ items: Notification[] }>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get('/api/notifications?limit=50');
      return res.data.data as { items: Notification[] };
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

  const notifications = data?.items ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllMutation.mutate()}
            className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition"
          >
            <Check size={16} />
            Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-xl" />
          ))}
        </div>
      ) : notifications.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {notifications.map((notif, i) => (
            <div
              key={notif.id}
              onClick={() => !notif.isRead && markOneMutation.mutate(notif.id)}
              className={`flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition ${
                i !== 0 ? 'border-t border-gray-50' : ''
              } ${!notif.isRead ? 'bg-indigo-50/30' : ''}`}
            >
              <span className="text-xl mt-0.5">{TYPE_ICONS[notif.type] ?? '🔔'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 leading-snug">{notif.message}</p>
                <p className="text-xs text-gray-400 mt-1">{formatRelative(notif.createdAt)}</p>
              </div>
              {!notif.isRead && (
                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <Bell size={48} className="text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">No notifications</h3>
          <p className="text-gray-500 mt-1">You&apos;re all caught up!</p>
        </div>
      )}
    </div>
  );
}

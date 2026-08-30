'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';
import {
  Bell,
  CheckSquare,
  Users,
  MessageSquare,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

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

export function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. Fetch unread count
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await apiClient.get('/api/notifications/unread-count');
      return res.data.data?.count ?? 0;
    },
    refetchInterval: 30000,
  });

  const unreadCount = unreadData ?? 0;

  // 2. Fetch recent notifications
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: async () => {
      const res = await apiClient.get('/api/notifications?page=1&limit=8');
      const payload = res.data.data;
      return (payload?.notifications || payload || []) as NotificationItem[];
    },
    enabled: isOpen,
  });

  const notifications = notificationsData || [];

  // 3. Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // 4. Mark all read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiClient.patch('/api/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  // 5. Delete notification mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // 6. Socket.IO Real-Time Notification listener
  useEffect(() => {
    if (!user) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
    const socket = getSocket(token);

    if (!socket.connected) {
      socket.connect();
    }

    const onNewNotification = (notif: NotificationItem) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast((t) => (
        <div
          onClick={() => {
            toast.dismiss(t.id);
            if (notif.projectId) router.push(`/projects/${notif.projectId}`);
          }}
          className="flex items-start gap-3 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Bell size={16} />
          </div>
          <div>
            <p className="font-semibold text-xs text-gray-900">{notif.title || 'New Notification'}</p>
            <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">{notif.message}</p>
          </div>
        </div>
      ), { duration: 5000, position: 'top-right' });
    };

    const onCountUpdate = (data: { count: number }) => {
      queryClient.setQueryData(['notifications', 'unread-count'], data.count);
    };

    const onReadSync = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    socket.on('notification:new', onNewNotification);
    socket.on('notification:count', onCountUpdate);
    socket.on('notification:read', onReadSync);
    socket.on('notification:read-all', onReadSync);

    return () => {
      socket.off('notification:new', onNewNotification);
      socket.off('notification:count', onCountUpdate);
      socket.off('notification:read', onReadSync);
      socket.off('notification:read-all', onReadSync);
    };
  }, [user, queryClient, router]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED':
      case 'TASK_STATUS_CHANGED':
      case 'TASK_DUE_SOON':
      case 'TASK_OVERDUE':
        return <CheckSquare size={16} className="text-indigo-600" />;
      case 'PROJECT_INVITATION':
      case 'PROJECT_MEMBER_ADDED':
      case 'PROJECT_ROLE_CHANGED':
        return <Users size={16} className="text-emerald-600" />;
      case 'CHAT_MESSAGE':
      case 'NEW_MESSAGE':
        return <MessageSquare size={16} className="text-purple-600" />;
      default:
        return <Bell size={16} className="text-gray-500" />;
    }
  };

  const handleNotificationClick = (n: NotificationItem) => {
    if (!n.isRead) {
      markReadMutation.mutate(n.id);
    }
    setIsOpen(false);
    if (n.projectId) {
      router.push(`/projects/${n.projectId}`);
    } else {
      router.push('/notifications');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition focus:outline-none"
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-in zoom-in">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Panel Header */}
          <div className="p-4 px-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-2">
                  <Bell size={18} />
                </div>
                <p className="text-xs font-semibold text-gray-700">No notifications</p>
                <p className="text-[11px] text-gray-400 mt-0.5">You are completely up to date!</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3.5 px-5 flex items-start gap-3.5 hover:bg-gray-50 transition cursor-pointer group ${
                    !n.isRead ? 'bg-indigo-50/30' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-white border border-gray-100 shadow-2xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    {getNotificationIcon(n.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs truncate ${
                          !n.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-700'
                        }`}
                      >
                        {n.title || 'DevSync Alert'}
                      </p>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">
                        {new Date(n.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{n.message}</p>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0 mt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(n.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 rounded transition"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Panel Footer */}
          <div className="p-3 border-t border-gray-100 bg-gray-50/50 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition inline-flex items-center gap-1.5"
            >
              View all notifications <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

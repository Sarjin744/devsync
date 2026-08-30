'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api';
import { formatRelative, getInitials } from '@/lib/utils';
import {
  Activity as ActivityIcon,
  CheckCircle2,
  Layers,
  Plus,
  RefreshCw,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  Archive,
  RotateCcw,
  Loader2,
} from 'lucide-react';

interface ActivityUser {
  id: string;
  name: string;
  email: string;
  profileImage: string | null;
}

interface ActivityItem {
  id: string;
  action: string;
  type: string;
  description: string;
  entityType?: string | null;
  entityId?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
  projectId: string;
  userId: string;
  createdAt: string;
  user: ActivityUser;
}

export function ProjectActivityTimeline({ projectId }: { projectId: string }) {
  const [filter, setFilter] = useState<'ALL' | 'TASK_CREATED' | 'TASK_STATUS_CHANGED' | 'MEMBER_ADDED'>('ALL');
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useQuery<{
    activities: ActivityItem[];
    pagination?: { total: number; totalPages: number; page: number };
  }>({
    queryKey: ['project-activity', projectId, filter, page],
    queryFn: async () => {
      const typeParam = filter !== 'ALL' ? `&type=${filter}` : '';
      const res = await apiClient.get(
        `/api/projects/${projectId}/activity?page=${page}&limit=30${typeParam}`,
      );
      const payload = res.data.data;
      return {
        activities: payload?.activities || payload || [],
        pagination: payload?.pagination || res.data.pagination,
      };
    },
  });

  const activities = data?.activities ?? [];
  const pagination = data?.pagination;

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'TASK_CREATED':
        return <Plus size={14} className="text-indigo-600" />;
      case 'TASK_STATUS_CHANGED':
        return <RefreshCw size={14} className="text-amber-600" />;
      case 'TASK_COMPLETED':
        return <CheckCircle2 size={14} className="text-emerald-600" />;
      case 'TASK_ASSIGNED':
        return <UserCheck size={14} className="text-blue-600" />;
      case 'MEMBER_ADDED':
        return <UserPlus size={14} className="text-emerald-600" />;
      case 'MEMBER_REMOVED':
        return <UserMinus size={14} className="text-rose-600" />;
      case 'MEMBER_ROLE_CHANGED':
        return <Users size={14} className="text-purple-600" />;
      case 'PROJECT_CREATED':
        return <Layers size={14} className="text-indigo-600" />;
      case 'PROJECT_ARCHIVED':
        return <Archive size={14} className="text-gray-500" />;
      case 'PROJECT_RESTORED':
        return <RotateCcw size={14} className="text-emerald-600" />;
      default:
        return <ActivityIcon size={14} className="text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Activity Filter Header */}
      <div className="bg-white p-4 px-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ActivityIcon size={18} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900">Project Activity Timeline</h3>
            <p className="text-xs text-gray-400">Chronological history of project changes and events</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 p-1 rounded-xl">
          {[
            { key: 'ALL', label: 'All Activity' },
            { key: 'TASK_CREATED', label: 'Tasks Created' },
            { key: 'TASK_STATUS_CHANGED', label: 'Status Updates' },
            { key: 'MEMBER_ADDED', label: 'Members' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                setFilter(key as typeof filter);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === key
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="animate-spin text-indigo-600" size={28} />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <ActivityIcon size={22} />
            </div>
            <h4 className="font-bold text-gray-900 text-sm">No activity recorded yet</h4>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              Project actions such as task creation, assignment, and status updates will be logged here.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-gray-100">
            {activities.map((item) => (
              <div key={item.id} className="relative flex items-start gap-4 group">
                {/* Node icon */}
                <div className="absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 rounded-full bg-white border-2 border-indigo-100 flex items-center justify-center shadow-xs group-hover:border-indigo-400 transition">
                  {getActivityIcon(item.action)}
                </div>

                {/* Actor Avatar */}
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  {getInitials(item.user.name)}
                </div>

                {/* Event Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-xs text-gray-900">{item.user.name}</span>
                    <span className="text-xs text-gray-600">{item.description}</span>
                    <span className="text-[10px] text-gray-400 font-medium ml-auto">
                      {formatRelative(item.createdAt)}
                    </span>
                  </div>

                  {/* Structured metadata badges if present */}
                  {item.metadata && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {item.metadata.fromStatus && item.metadata.toStatus && (
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-lg">
                          <span className="text-gray-500">{item.metadata.fromStatus}</span>
                          <span className="text-gray-400">→</span>
                          <span className="text-indigo-600">{item.metadata.toStatus}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isFetching}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages || isFetching}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

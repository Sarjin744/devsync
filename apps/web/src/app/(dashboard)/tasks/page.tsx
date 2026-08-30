'use client';

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api';
import { formatDate } from '@/lib/utils';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  FolderKanban,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

interface MyTaskItem {
  id: string;
  title: string;
  description: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  projectId: string;
  dueDate: string | null;
  isOverdue: boolean;
  createdAt: string;
  project?: {
    id: string;
    name: string;
  };
}

const KANBAN_SECTIONS: { status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'; label: string; color: string }[] = [
  { status: 'TODO', label: 'To Do', color: 'bg-gray-100 text-gray-800' },
  { status: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  { status: 'IN_REVIEW', label: 'In Review', color: 'bg-purple-100 text-purple-800' },
  { status: 'DONE', label: 'Done', color: 'bg-emerald-100 text-emerald-800' },
];

const PRIORITY_BADGES: Record<string, string> = {
  CRITICAL: 'bg-red-50 text-red-700 border-red-200',
  HIGH: 'bg-amber-50 text-amber-700 border-amber-200',
  MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
  LOW: 'bg-gray-50 text-gray-700 border-gray-200',
};

export default function MyTasksPage() {
  const { data: tasks = [], isLoading } = useQuery<MyTaskItem[]>({
    queryKey: ['my-tasks'],
    queryFn: async () => {
      const res = await apiClient.get('/api/tasks/my');
      return res.data.data;
    },
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Assigned Tasks</h1>
          <p className="text-sm text-gray-500 mt-1">
            Overview of all engineering tasks assigned to you across projects
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center max-w-md mx-auto shadow-sm">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckSquare size={24} />
          </div>
          <h3 className="font-semibold text-gray-900 text-lg">No tasks assigned</h3>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            You do not have any active tasks assigned right now. Check your projects for open items.
          </p>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm"
          >
            <FolderKanban size={16} /> View Projects
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {KANBAN_SECTIONS.map((sec) => {
            const sectionTasks = tasks.filter((t) => t.status === sec.status);

            return (
              <div key={sec.status} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-50">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sec.color}`}>
                    {sec.label}
                  </span>
                  <span className="text-xs font-semibold text-gray-400">
                    {sectionTasks.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {sectionTasks.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">No tasks</p>
                  ) : (
                    sectionTasks.map((task) => (
                      <Link
                        key={task.id}
                        href={`/projects/${task.projectId}`}
                        className="block bg-gray-50/70 hover:bg-white rounded-xl border border-gray-100 hover:border-indigo-100 p-3.5 shadow-xs hover:shadow-sm transition group space-y-2"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                              PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.MEDIUM
                            }`}
                          >
                            {task.priority}
                          </span>

                          {task.isOverdue && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-red-600 bg-red-50 px-1 py-0.5 rounded border border-red-200">
                              <AlertTriangle size={9} /> Overdue
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs font-semibold text-gray-900 group-hover:text-indigo-600 transition leading-snug">
                          {task.title}
                        </h4>

                        {task.project && (
                          <div className="flex items-center gap-1 text-[11px] text-gray-500 pt-1">
                            <FolderKanban size={11} className="text-gray-400" />
                            <span className="truncate">{task.project.name}</span>
                          </div>
                        )}

                        {task.dueDate && (
                          <div className={`flex items-center gap-1 text-[10px] ${task.isOverdue ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                            <Clock size={10} />
                            {formatDate(task.dueDate)}
                          </div>
                        )}
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

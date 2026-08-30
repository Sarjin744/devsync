'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';
import {
  Plus,
  FolderKanban,
  Archive,
  Loader2,
  Users,
  Building2,
  Filter,
  CheckCircle2,
  X,
} from 'lucide-react';

interface TeamOption {
  id: string;
  name: string;
}

interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  teamId: string | null;
  team: { id: string; name: string } | null;
  status: 'ACTIVE' | 'ARCHIVED';
  ownerId: string;
  role: 'OWNER' | 'TEAM_LEAD' | 'DEVELOPER' | 'VIEWER';
  owner: {
    id: string;
    name: string;
    email: string;
  };
  memberCount: number;
  taskCount: number;
  createdAt: string;
  updatedAt: string;
}

function NewProjectModal({
  teams,
  onClose,
}: {
  teams: TeamOption[];
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [teamId, setTeamId] = useState<string>(teams[0]?.id || '');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; teamId?: string }) => {
      const res = await apiClient.post('/api/projects', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created successfully!');
      onClose();
    },
    onError: (error: { response?: { data?: { error?: string } } }) => {
      toast.error(error.response?.data?.error ?? 'Failed to create project');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    mutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      teamId: teamId || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Create New Project</h2>
          <p className="text-xs text-gray-500 mb-5">
            Initialize a project for task management, code collaboration, and team communication.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                Project Name *
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Next-Gen Mobile Client"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {teams.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Parent Team
                </label>
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">No team (Personal)</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                Description <span className="text-gray-400 font-normal lowercase">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this project focused on?"
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition flex items-center justify-center gap-2 shadow-sm"
              >
                {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
                Create Project
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');

  // Fetch teams for filtering & creation
  const { data: teams = [] } = useQuery<TeamOption[]>({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await apiClient.get('/api/teams');
      return res.data.data;
    },
  });

  const { data: projects = [], isLoading } = useQuery<ProjectItem[]>({
    queryKey: ['projects', statusFilter, selectedTeam],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (selectedTeam !== 'ALL') params.append('teamId', selectedTeam);
      const res = await apiClient.get(`/api/projects?${params.toString()}`);
      return res.data.data as ProjectItem[];
    },
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your development projects, member assignments, and engineering workflows
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm self-start sm:self-auto"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Status filters */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-50 rounded-xl border border-gray-100 self-start">
          {(['ACTIVE', 'ALL', 'ARCHIVED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === status
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {status === 'ACTIVE' ? 'Active' : status === 'ARCHIVED' ? 'Archived' : 'All Projects'}
            </button>
          ))}
        </div>

        {/* Team filter dropdown */}
        {teams.length > 0 && (
          <div className="flex items-center gap-2 self-start md:self-auto">
            <Filter size={15} className="text-gray-400" />
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-white border border-gray-100 rounded-2xl p-6 animate-pulse">
              <div className="w-10 h-10 bg-gray-100 rounded-xl mb-4" />
              <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-full mb-4" />
              <div className="h-4 bg-gray-100 rounded w-1/3 mt-6" />
            </div>
          ))}
        </div>
      ) : projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:border-indigo-100 transition group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                    {project.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {project.status === 'ARCHIVED' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                        <Archive size={11} /> Archived
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">
                        <CheckCircle2 size={11} /> Active
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="font-bold text-gray-900 text-lg group-hover:text-indigo-600 transition">
                  {project.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {project.description || 'No description provided.'}
                </p>

                {project.team && (
                  <div className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 bg-gray-50 border border-gray-100 rounded-lg text-xs font-medium text-gray-600">
                    <Building2 size={12} className="text-gray-400" />
                    <span>{project.team.name}</span>
                  </div>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-1.5">
                  <Users size={14} />
                  <span>
                    {project.memberCount} {project.memberCount === 1 ? 'member' : 'members'}
                  </span>
                </div>
                <span>Updated {formatDate(project.updatedAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center max-w-md mx-auto">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FolderKanban size={24} />
          </div>
          <h3 className="font-semibold text-gray-900 text-lg">No projects found</h3>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            {statusFilter === 'ARCHIVED'
              ? 'There are no archived projects matching your filters.'
              : 'Get started by creating your first project for your team.'}
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm"
          >
            <Plus size={16} />
            Create Project
          </button>
        </div>
      )}

      {showModal && <NewProjectModal teams={teams} onClose={() => setShowModal(false)} />}
    </div>
  );
}

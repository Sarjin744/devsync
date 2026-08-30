'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { getInitials } from '@/lib/utils';
import { Users, Plus, ShieldCheck, ChevronRight, X, Loader2 } from 'lucide-react';

interface TeamItem {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  role: 'OWNER' | 'MEMBER';
  memberCount: number;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export default function TeamsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [description, setDescription] = useState('');

  const { data: teams = [], isLoading } = useQuery<TeamItem[]>({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await apiClient.get('/api/teams');
      return res.data.data;
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: async (payload: { name: string; description?: string }) => {
      const res = await apiClient.post('/api/teams', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setShowCreateModal(false);
      setTeamName('');
      setDescription('');
      toast.success('Team created successfully');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to create team');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      toast.error('Team name is required');
      return;
    }
    createTeamMutation.mutate({
      name: teamName.trim(),
      description: description.trim() || undefined,
    });
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and collaborate with your engineering teams</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm self-start sm:self-auto"
        >
          <Plus size={16} />
          Create Team
        </button>
      </div>

      {/* Teams Grid / List */}
      {isLoading ? (
        <div className="flex justify-center items-center py-24">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
      ) : teams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center max-w-md mx-auto">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users size={24} />
          </div>
          <h3 className="font-semibold text-gray-900 text-lg">No teams yet</h3>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            You are not part of any team. Create your first team or wait for an invitation.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
          >
            <Plus size={16} />
            Create Team
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teams.map((team) => {
            const isOwner = team.ownerId === user?.id || team.role === 'OWNER';
            return (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:border-indigo-100 transition flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                      {getInitials(team.name)}
                    </div>
                    {isOwner ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                        <ShieldCheck size={12} />
                        Owner
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full">
                        Member
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-gray-900 text-lg group-hover:text-indigo-600 transition">
                    {team.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                    {team.description || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-5 mt-5 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <Users size={14} />
                    <span>
                      {team.memberCount} {team.memberCount === 1 ? 'member' : 'members'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                    View Team <ChevronRight size={14} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold text-gray-900 mb-1">Create New Team</h3>
            <p className="text-xs text-gray-500 mb-5">Create a team to collaborate with developers on projects.</p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Team Name *
                </label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Backend Platform"
                  className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is the mission or focus of this team?"
                  className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTeamMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition disabled:opacity-60"
                >
                  {createTeamMutation.isPending ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

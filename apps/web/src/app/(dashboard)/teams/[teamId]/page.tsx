'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { formatDate, getInitials } from '@/lib/utils';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Trash2,
  Edit2,
  X,
  Loader2,
  ArrowLeft,
  UserMinus,
  Mail,
} from 'lucide-react';
import Link from 'next/link';

interface Member {
  id: string;
  userId: string;
  role: 'OWNER' | 'MEMBER';
  user: {
    id: string;
    name: string;
    email: string;
    profileImage: string | null;
    isOnline: boolean;
  };
  createdAt: string;
}

interface TeamData {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  memberCount: number;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  members: Member[];
  createdAt: string;
}

export default function TeamDetailsPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const resolvedParams = use(params);
  const teamId = resolvedParams.teamId;
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  const { data: team, isLoading, isError } = useQuery<TeamData>({
    queryKey: ['team', teamId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/teams/${teamId}`);
      return res.data.data;
    },
  });

  const isOwner = team?.ownerId === user?.id;

  // Edit Team
  const updateTeamMutation = useMutation({
    mutationFn: async (payload: { name?: string; description?: string }) => {
      const res = await apiClient.patch(`/api/teams/${teamId}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setShowEditModal(false);
      toast.success('Team details updated');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to update team');
    },
  });

  // Delete Team
  const deleteTeamMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/api/teams/${teamId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Team deleted');
      router.push('/teams');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to delete team');
    },
  });

  // Invite User
  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiClient.post(`/api/teams/${teamId}/invitations`, { email });
      return res.data;
    },
    onSuccess: () => {
      setShowInviteModal(false);
      setInviteEmail('');
      toast.success('Invitation sent successfully');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to send invitation');
    },
  });

  // Change Role
  const changeRoleMutation = useMutation({
    mutationFn: async ({ memberUserId, role }: { memberUserId: string; role: 'OWNER' | 'MEMBER' }) => {
      const res = await apiClient.patch(`/api/teams/${teamId}/members/${memberUserId}`, { role });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      toast.success('Member role updated');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to update role');
    },
  });

  // Remove Member
  const removeMemberMutation = useMutation({
    mutationFn: async (memberUserId: string) => {
      await apiClient.delete(`/api/teams/${teamId}/members/${memberUserId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      toast.success('Member removed from team');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to remove member');
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  if (isError || !team) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <h3 className="font-bold text-gray-900 text-lg mb-2">Team Not Found</h3>
        <p className="text-sm text-gray-500 mb-6">
          You may not have permission to view this team or it may have been deleted.
        </p>
        <Link
          href="/teams"
          className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl"
        >
          <ArrowLeft size={16} /> Back to Teams
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        href="/teams"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition"
      >
        <ArrowLeft size={16} /> Back to Teams
      </Link>

      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:p-8 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
            {isOwner && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                <ShieldCheck size={12} />
                Owner
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 max-w-2xl">
            {team.description || 'No description provided.'}
          </p>
          <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Users size={14} /> {team.members.length} {team.members.length === 1 ? 'member' : 'members'}
            </span>
            <span>Created {formatDate(team.createdAt)}</span>
          </div>
        </div>

        {/* Owner actions */}
        {isOwner && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setEditName(team.name);
                setEditDesc(team.description || '');
                setShowEditModal(true);
              }}
              className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold px-4 py-2.5 rounded-xl transition"
            >
              <Edit2 size={15} /> Edit Team
            </button>
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm"
            >
              <UserPlus size={15} /> Invite Member
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold px-4 py-2.5 rounded-xl transition border border-red-200"
            >
              <Trash2 size={15} /> Delete Team
            </button>
          </div>
        )}
      </div>

      {/* Members Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-lg">Team Members ({team.members.length})</h2>
          {isOwner && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="text-sm font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1.5"
            >
              <UserPlus size={15} /> Invite More
            </button>
          )}
        </div>

        <div className="divide-y divide-gray-50">
          {team.members.map((member) => {
            const isMemberOwner = member.role === 'OWNER';
            const isSelf = member.userId === user?.id;

            return (
              <div
                key={member.id}
                className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-gray-50/50 transition"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {member.user.profileImage ? (
                      <img
                        src={member.user.profileImage}
                        alt={member.user.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      getInitials(member.user.name)
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm">{member.user.name}</p>
                      {isSelf && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{member.user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  {/* Role selection for OWNER */}
                  {isOwner && !isSelf ? (
                    <select
                      value={member.role}
                      onChange={(e) =>
                        changeRoleMutation.mutate({
                          memberUserId: member.userId,
                          role: e.target.value as 'OWNER' | 'MEMBER',
                        })
                      }
                      className="text-xs font-semibold px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="MEMBER">Member</option>
                      <option value="OWNER">Owner</option>
                    </select>
                  ) : (
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        isMemberOwner
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {member.role}
                    </span>
                  )}

                  {/* Remove button */}
                  {isOwner && !isSelf && (
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${member.user.name} from the team?`)) {
                          removeMemberMutation.mutate(member.userId);
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Remove member"
                    >
                      <UserMinus size={16} />
                    </button>
                  )}

                  {/* Member can leave */}
                  {!isOwner && isSelf && (
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to leave this team?')) {
                          removeMemberMutation.mutate(member.userId);
                          router.push('/teams');
                        }
                      }}
                      className="text-xs font-semibold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-xl border border-red-200 transition"
                    >
                      Leave Team
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Team Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Edit Team</h3>
            <p className="text-xs text-gray-500 mb-5">Update team name and description.</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateTeamMutation.mutate({ name: editName, description: editDesc });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Team Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateTeamMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowInviteModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Mail size={18} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Invite Member</h3>
            </div>
            <p className="text-xs text-gray-500 mb-5">
              Send an invitation to a registered user by email to join {team.name}.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!inviteEmail.trim()) {
                  toast.error('Email is required');
                  return;
                }
                inviteMutation.mutate(inviteEmail.trim());
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  User Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="developer@company.com"
                  className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition disabled:opacity-60"
                >
                  {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Team Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
              <Trash2 size={20} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Delete Team</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to permanently delete <strong>{team.name}</strong>? All team memberships will be removed. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteTeamMutation.mutate()}
                disabled={deleteTeamMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition disabled:opacity-60"
              >
                {deleteTeamMutation.isPending ? 'Deleting...' : 'Yes, Delete Team'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

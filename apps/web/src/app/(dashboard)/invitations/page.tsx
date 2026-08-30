'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';
import { Mail, Check, X, Users, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Invitation {
  id: string;
  teamId: string;
  role: 'OWNER' | 'MEMBER';
  status: string;
  expiresAt: string;
  createdAt: string;
  team: {
    id: string;
    name: string;
    description: string | null;
    memberCount: number;
    owner: {
      name: string;
      email: string;
    };
  };
  invitedBy: {
    name: string;
    email: string;
  };
}

export default function InvitationsPage() {
  const queryClient = useQueryClient();

  const { data: invitations = [], isLoading } = useQuery<Invitation[]>({
    queryKey: ['invitations'],
    queryFn: async () => {
      const res = await apiClient.get('/api/invitations');
      return res.data.data;
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const res = await apiClient.post(`/api/invitations/${invitationId}/accept`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Invitation accepted! You have joined the team.');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to accept invitation');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const res = await apiClient.post(`/api/invitations/${invitationId}/reject`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success('Invitation rejected');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to reject invitation');
    },
  });

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team Invitations</h1>
        <p className="text-sm text-gray-500 mt-1">Pending invitations to join collaboration teams</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-24">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
      ) : invitations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center max-w-md mx-auto">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail size={24} />
          </div>
          <h3 className="font-semibold text-gray-900 text-lg">No pending invitations</h3>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            You do not have any pending team invitations at the moment.
          </p>
          <Link
            href="/teams"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
          >
            <Users size={16} /> View Your Teams
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {invitations.map((inv) => (
            <div
              key={inv.id}
              className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 text-base">{inv.team.name}</h3>
                  <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 font-semibold rounded-full">
                    Role: {inv.role}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Invited by <strong>{inv.invitedBy.name}</strong> ({inv.invitedBy.email}) •{' '}
                  {formatDate(inv.createdAt)}
                </p>
                {inv.team.description && (
                  <p className="text-xs text-gray-600 pt-1 max-w-xl">{inv.team.description}</p>
                )}
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <button
                  onClick={() => rejectMutation.mutate(inv.id)}
                  disabled={rejectMutation.isPending || acceptMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl border border-gray-200 hover:border-red-200 transition disabled:opacity-60"
                >
                  <X size={15} /> Reject
                </button>
                <button
                  onClick={() => acceptMutation.mutate(inv.id)}
                  disabled={acceptMutation.isPending || rejectMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-sm disabled:opacity-60"
                >
                  <Check size={15} />
                  {acceptMutation.isPending ? 'Joining...' : 'Accept & Join'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

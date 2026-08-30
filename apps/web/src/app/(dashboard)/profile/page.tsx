'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { formatDate, getInitials } from '@/lib/utils';
import { User, Mail, Calendar, Save } from 'lucide-react';

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');

  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; bio: string }) => {
      const res = await apiClient.put('/api/users/profile', data);
      return res.data.data;
    },
    onSuccess: async () => {
      await refreshUser();
      setIsEditing(false);
      toast.success('Profile updated successfully');
    },
    onError: () => toast.error('Failed to update profile'),
  });

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Profile</h1>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Avatar section */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-10 flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold text-white border-4 border-white/30">
            {user ? getInitials(user.name) : '?'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user?.name}</h2>
            <p className="text-indigo-100 text-sm mt-1">{user?.email}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <div className={`w-2 h-2 rounded-full ${user?.isOnline ? 'bg-emerald-400' : 'bg-gray-400'}`} />
              <span className="text-xs text-indigo-100">
                {user?.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Profile details */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-gray-900">Profile Information</h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-sm text-indigo-600 font-medium hover:underline"
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User size={16} className="text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Name</p>
                {isEditing ? (
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Mail size={16} className="text-gray-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Email</p>
                <p className="text-sm font-medium text-gray-900">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Calendar size={16} className="text-gray-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Member Since</p>
                <p className="text-sm font-medium text-gray-900">
                  {user?.createdAt ? formatDate(user.createdAt) : '—'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bio</p>
              {isEditing ? (
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Tell your team about yourself"
                  className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              ) : (
                <p className="text-sm text-gray-600">{user?.bio || 'No bio yet.'}</p>
              )}
            </div>

            {isEditing && (
              <button
                onClick={() => updateMutation.mutate({ name, bio })}
                disabled={updateMutation.isPending}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition disabled:opacity-60"
              >
                <Save size={16} />
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>

        {/* Danger zone */}
        <div className="border-t border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Account</h3>
          <button
            onClick={logout}
            className="text-sm font-medium text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 px-4 py-2 rounded-xl transition"
          >
            Sign out of DevSync
          </button>
        </div>
      </div>
    </div>
  );
}

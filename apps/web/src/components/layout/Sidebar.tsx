'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { cn, getInitials } from '@/lib/utils';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Bell,
  Users,
  Mail,
  Search,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tasks', label: 'My Tasks', icon: CheckSquare },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/teams', label: 'Teams', icon: Users },
  { href: '/invitations', label: 'Invitations', icon: Mail },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/search', label: 'Search', icon: Search },
];

export function Sidebar({ onOpenSearch }: { onOpenSearch?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await apiClient.get('/api/notifications/unread-count');
      return res.data.data?.count ?? 0;
    },
    refetchInterval: 30000,
  });

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-gray-100 flex flex-col">
      {/* Logo & Notification Bell */}
      <div className="p-4 px-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <span className="text-white text-sm font-bold">DS</span>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">DevSync</p>
            <p className="text-xs text-gray-400">Team Platform</p>
          </div>
        </div>
        <NotificationBell />
      </div>

      {/* Quick Search Trigger */}
      <div className="p-3 pb-0">
        <button
          type="button"
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100/80 border border-gray-200/70 rounded-xl text-xs font-medium text-gray-500 transition group cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Search size={14} className="text-gray-400 group-hover:text-indigo-600 transition" />
            <span>Search DevSync...</span>
          </span>
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-bold text-gray-400 shadow-2xs">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
          Menu
        </p>
        <ul className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
            const isNotifications = href === '/notifications';

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  )}
                >
                  <Icon
                    className={cn(
                      'w-4.5 h-4.5',
                      isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600',
                    )}
                    size={18}
                  />
                  {label}

                  {isNotifications && unreadCount > 0 && (
                    <span className="ml-auto bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}

                  {isActive && !isNotifications && (
                    <ChevronRight className="ml-auto text-indigo-400" size={14} />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile & Sign Out */}
      <div className="p-3 border-t border-gray-100">
        <Link href="/profile" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition group">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {user ? getInitials(user.name) : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
          <Settings size={16} className="text-gray-300 group-hover:text-gray-500 transition" />
        </Link>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition mt-0.5"
        >
          <LogOut size={18} className="text-gray-400" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

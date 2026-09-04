'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api';
import { SearchResultItem, SearchResultType } from '@devsync/shared';
import { formatRelative } from '@/lib/utils';
import {
  Search,
  FolderKanban,
  CheckSquare,
  Users,
  MessageSquare,
  FileText,
  Activity as ActivityIcon,
  X,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

const TYPE_CONFIG: Record<
  SearchResultType,
  { label: string; icon: typeof FolderKanban; color: string; bg: string }
> = {
  PROJECT: { label: 'Project', icon: FolderKanban, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  TASK: { label: 'Task', icon: CheckSquare, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  USER: { label: 'Member', icon: Users, color: 'text-sky-600', bg: 'bg-sky-50' },
  MESSAGE: { label: 'Message', icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
  FILE: { label: 'File', icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' },
  ACTIVITY: { label: 'Activity', icon: ActivityIcon, color: 'text-rose-600', bg: 'bg-rose-50' },
};

const FILTER_TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'All Results' },
  { key: 'projects', label: 'Projects' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'users', label: 'People' },
  { key: 'messages', label: 'Messages' },
  { key: 'files', label: 'Files' },
  { key: 'activity', label: 'Activity' },
];

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const initialType = searchParams.get('type') || 'all';

  const [inputQuery, setInputQuery] = useState(initialQ);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQ);
  const [activeTab, setActiveTab] = useState(initialType);
  const [page, setPage] = useState(1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches
  useEffect(() => {
    try {
      const saved = localStorage.getItem('devsync_recent_searches');
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch {
      // Ignore
    }
  }, []);

  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed || trimmed.length < 2) return;
    const updated = [trimmed, ...recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
    setRecentSearches(updated);
    try {
      localStorage.setItem('devsync_recent_searches', JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(inputQuery.trim());
      setPage(1);
      if (inputQuery.trim().length >= 2) {
        saveRecentSearch(inputQuery.trim());
        const typeParam = activeTab !== 'all' ? `&type=${activeTab}` : '';
        router.replace(`/search?q=${encodeURIComponent(inputQuery.trim())}${typeParam}`);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [inputQuery, activeTab, router]);

  // Fetch search results
  const { data, isLoading, isError } = useQuery<{
    results: SearchResultItem[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }>({
    queryKey: ['full-search', debouncedQuery, activeTab, page],
    queryFn: async () => {
      if (debouncedQuery.length < 2) {
        return { results: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } };
      }
      const typeParam = activeTab !== 'all' ? `&type=${activeTab}` : '';
      const res = await apiClient.get(
        `/api/search?q=${encodeURIComponent(debouncedQuery)}${typeParam}&page=${page}&limit=20`,
      );
      const payload = res.data.data;
      return {
        results: payload?.results || [],
        pagination: payload?.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 },
      };
    },
    enabled: debouncedQuery.length >= 2,
  });

  const results = data?.results || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Search Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Global Search</h1>
        <p className="text-xs text-gray-500 mt-1">
          Discover projects, tasks, messages, files, activities, and team members across DevSync.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Type keywords (e.g. 'authentication', 'payment', 'API')..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          {inputQuery && (
            <button
              onClick={() => {
                setInputQuery('');
                setDebouncedQuery('');
              }}
              className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Searches */}
      {debouncedQuery.length < 2 && recentSearches.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-gray-700">
            <span>Recent Searches</span>
            <button
              onClick={() => {
                setRecentSearches([]);
                localStorage.removeItem('devsync_recent_searches');
              }}
              className="text-gray-400 hover:text-rose-600 transition"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((term) => (
              <button
                key={term}
                onClick={() => {
                  setInputQuery(term);
                  setDebouncedQuery(term);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 transition"
              >
                <Clock size={13} className="text-gray-400" />
                <span>{term}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results List */}
      <div className="space-y-3">
        {isLoading && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
          </div>
        )}

        {isError && (
          <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-sm text-center space-y-2">
            <AlertCircle size={32} className="text-rose-500 mx-auto" />
            <h3 className="text-sm font-bold text-gray-900">Search Error</h3>
            <p className="text-xs text-gray-500">Failed to execute search. Please check your query.</p>
          </div>
        )}

        {debouncedQuery.length >= 2 && !isLoading && results.length === 0 && !isError && (
          <div className="bg-white p-16 rounded-2xl border border-gray-100 shadow-sm text-center space-y-2">
            <Search size={36} className="text-gray-300 mx-auto" />
            <h3 className="text-sm font-bold text-gray-900">No results found</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              We couldn&apos;t find anything matching &ldquo;{debouncedQuery}&rdquo;. Try another term or filter.
            </p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-gray-400 px-1">
              Found {pagination.total} results for &ldquo;{debouncedQuery}&rdquo;
            </p>

            {results.map((item) => {
              const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.PROJECT;
              const IconComponent = config.icon;

              return (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.url}
                  className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-indigo-200 hover:shadow-md transition flex items-start justify-between gap-4 group block"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className={`w-9 h-9 rounded-xl ${config.bg} ${config.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <IconComponent size={18} />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-gray-900 group-hover:text-indigo-600 transition truncate">
                          {item.title}
                        </h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${config.bg} ${config.color}`}>
                          {config.label}
                        </span>
                        {item.project && item.type !== 'PROJECT' && (
                          <span className="text-xs text-gray-400 font-medium truncate">
                            • #{item.project.name}
                          </span>
                        )}
                      </div>

                      {item.snippet && (
                        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                          {item.snippet}
                        </p>
                      )}

                      <div className="flex items-center gap-3 pt-1 text-[11px] text-gray-400 font-medium">
                        {Boolean(item.metadata?.status) && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md font-semibold">
                            {String(item.metadata?.status)}
                          </span>
                        )}
                        {Boolean(item.metadata?.priority) && (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md font-semibold">
                            {String(item.metadata?.priority)}
                          </span>
                        )}
                        {Boolean(item.metadata?.assigneeName) && (
                          <span>Assignee: {String(item.metadata?.assigneeName)}</span>
                        )}
                        {Boolean(item.metadata?.uploaderName) && (
                          <span>By {String(item.metadata?.uploaderName)}</span>
                        )}
                        {item.createdAt ? <span>{formatRelative(item.createdAt)}</span> : null}
                      </div>
                    </div>
                  </div>

                  <ArrowRight size={16} className="text-gray-300 group-hover:text-indigo-600 transition flex-shrink-0 mt-2" />
                </Link>
              );
            })}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
                >
                  Previous
                </button>
                <span className="text-xs text-gray-500 font-medium">
                  Page {page} of {pagination.totalPages}
                </span>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}

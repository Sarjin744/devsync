'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  Loader2,
  AlertCircle,
  CornerDownLeft,
} from 'lucide-react';

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

export function CommandPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('devsync_recent_searches');
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed || trimmed.length < 2) return;
    const updated = [trimmed, ...recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 5);
    setRecentSearches(updated);
    try {
      localStorage.setItem('devsync_recent_searches', JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const removeRecentSearch = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    const updated = recentSearches.filter((s) => s !== term);
    setRecentSearches(updated);
    try {
      localStorage.setItem('devsync_recent_searches', JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('devsync_recent_searches');
    } catch {
      // Ignore
    }
  };

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setSelectedIndex(0);
    }, 250);
    return () => clearTimeout(handler);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setDebouncedQuery('');
    }
  }, [isOpen]);

  // Execute Search Query
  const { data, isLoading, isError } = useQuery<{
    results: SearchResultItem[];
    pagination: { total: number };
  }>({
    queryKey: ['global-search', debouncedQuery, activeTab],
    queryFn: async () => {
      if (debouncedQuery.length < 2) return { results: [], pagination: { total: 0 } };
      const typeParam = activeTab !== 'all' ? `&type=${activeTab}` : '';
      const res = await apiClient.get(
        `/api/search?q=${encodeURIComponent(debouncedQuery)}${typeParam}&limit=25`,
      );
      const payload = res.data.data;
      return {
        results: payload?.results || [],
        pagination: payload?.pagination || { total: 0 },
      };
    },
    enabled: isOpen && debouncedQuery.length >= 2,
    staleTime: 10000,
  });

  const results = data?.results || [];

  const handleSelectResult = useCallback(
    (item: SearchResultItem) => {
      saveRecentSearch(debouncedQuery || item.title);
      onClose();
      router.push(item.url);
    },
    [debouncedQuery, onClose, router],
  );

  // Keyboard navigation inside command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
      } else if (e.key === 'Enter') {
        if (results[selectedIndex]) {
          e.preventDefault();
          handleSelectResult(results[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, handleSelectResult, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <Search size={20} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search projects, tasks, chat, files, teammates..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none"
          />
          {isLoading && <Loader2 size={18} className="animate-spin text-indigo-600 flex-shrink-0" />}
          {query && !isLoading && (
            <button
              onClick={() => {
                setQuery('');
                setDebouncedQuery('');
              }}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X size={16} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-gray-500 bg-gray-100 border border-gray-200 rounded-md">
            ESC
          </kbd>
        </div>

        {/* Filter Pills */}
        <div className="px-4 py-2 bg-gray-50/70 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-200/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-2">
          {/* Recent Searches (when input is empty) */}
          {debouncedQuery.length < 2 && recentSearches.length > 0 && (
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-400 px-1">
                <span>Recent Searches</span>
                <button
                  onClick={clearAllRecent}
                  className="text-gray-400 hover:text-rose-600 text-[11px] transition"
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <div
                    key={term}
                    onClick={() => {
                      setQuery(term);
                      setDebouncedQuery(term);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-100 rounded-xl text-xs font-medium text-gray-700 cursor-pointer transition group"
                  >
                    <Clock size={13} className="text-gray-400 group-hover:text-indigo-600" />
                    <span>{term}</span>
                    <button
                      onClick={(e) => removeRecentSearch(e, term)}
                      className="text-gray-400 hover:text-rose-600 ml-1 p-0.5 rounded-full"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prompt when input is empty and no recent searches */}
          {debouncedQuery.length < 2 && recentSearches.length === 0 && (
            <div className="py-12 text-center text-gray-400 space-y-2">
              <Search size={32} className="mx-auto text-gray-300" />
              <p className="text-xs font-medium">Type at least 2 characters to search across DevSync</p>
              <p className="text-[11px] text-gray-400">Projects • Tasks • Messages • Files • Activity • Teammates</p>
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="py-12 text-center text-rose-500 space-y-2">
              <AlertCircle size={28} className="mx-auto" />
              <p className="text-xs font-semibold">Search request failed. Please try again.</p>
            </div>
          )}

          {/* No Results Found */}
          {debouncedQuery.length >= 2 && !isLoading && results.length === 0 && !isError && (
            <div className="py-12 text-center text-gray-400 space-y-2">
              <AlertCircle size={28} className="mx-auto text-gray-300" />
              <p className="text-xs font-semibold text-gray-700">No results found for &ldquo;{debouncedQuery}&rdquo;</p>
              <p className="text-[11px] text-gray-400">Try adjusting your keywords or changing the filter category.</p>
            </div>
          )}

          {/* Render Results List */}
          {results.length > 0 && (
            <div className="space-y-1">
              {results.map((item, index) => {
                const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.PROJECT;
                const IconComponent = config.icon;
                const isSelected = selectedIndex === index;

                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleSelectResult(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`p-3 rounded-xl flex items-start gap-3.5 cursor-pointer transition ${
                      isSelected ? 'bg-indigo-50/70 border border-indigo-100' : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${config.bg} ${config.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <IconComponent size={16} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-gray-900 truncate">{item.title}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${config.bg} ${config.color}`}>
                          {config.label}
                        </span>
                        {item.project && item.type !== 'PROJECT' && (
                          <span className="text-[11px] text-gray-400 font-medium truncate">
                            • #{item.project.name}
                          </span>
                        )}
                      </div>

                      {item.snippet && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                          {item.snippet}
                        </p>
                      )}

                      <div className="flex items-center gap-2.5 mt-1.5 text-[10px] text-gray-400 font-medium">
                        {Boolean(item.metadata?.status) && (
                          <span className="px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded">
                            {String(item.metadata?.status)}
                          </span>
                        )}
                        {Boolean(item.metadata?.priority) && (
                          <span className="px-1.5 py-0.2 bg-amber-50 text-amber-700 rounded">
                            {String(item.metadata?.priority)}
                          </span>
                        )}
                        {Boolean(item.metadata?.assigneeName) && (
                          <span>Assigned: {String(item.metadata?.assigneeName)}</span>
                        )}
                        {Boolean(item.metadata?.mimeType) && (
                          <span>{String(item.metadata?.mimeType)}</span>
                        )}
                        {item.createdAt ? <span>{formatRelative(item.createdAt)}</span> : null}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="text-indigo-600 flex items-center gap-1 text-[11px] font-semibold flex-shrink-0 self-center">
                        <span>Open</span>
                        <CornerDownLeft size={12} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-bold">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-bold">↓</kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-bold">↵</kbd>
              <span>to select</span>
            </span>
          </div>
          {results.length > 0 && <span>{results.length} results found</span>}
        </div>
      </div>
    </div>
  );
}

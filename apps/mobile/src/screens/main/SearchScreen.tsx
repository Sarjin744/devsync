import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { api } from '../../services/api';
import type { SearchResultItem, SearchResultType } from '@devsync/shared';

const TYPE_EMOJIS: Record<SearchResultType, string> = {
  PROJECT: '📁',
  TASK: '✅',
  USER: '👤',
  MESSAGE: '💬',
  FILE: '📄',
  ACTIVITY: '⚡',
};

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'projects', label: 'Projects' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'users', label: 'People' },
  { key: 'messages', label: 'Chat' },
  { key: 'files', label: 'Files' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function SearchScreen({ navigation }: { navigation?: any }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Debounce user input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  const performSearch = useCallback(async (searchTerm: string, type: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = (await api.search(searchTerm, {
        type: type !== 'all' ? type : undefined,
        limit: 25,
      })) as any;

      const items = res?.results || res?.data?.results || (Array.isArray(res) ? res : []);
      setResults(items);

      setRecentSearches((prev) =>
        [searchTerm, ...prev.filter((s) => s.toLowerCase() !== searchTerm.toLowerCase())].slice(
          0,
          5,
        ),
      );
    } catch {
      Alert.alert('Search Error', 'Failed to retrieve search results');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    performSearch(debouncedQuery, selectedType);
  }, [debouncedQuery, selectedType, performSearch]);

  const handleSelectResult = (item: SearchResultItem) => {
    if (item.type === 'PROJECT') {
      navigation?.navigate('Projects', { screen: 'ProjectDetails', params: { projectId: item.id } });
    } else if (item.type === 'TASK') {
      navigation?.navigate('Tasks');
    } else if (item.type === 'MESSAGE' && item.project) {
      navigation?.navigate('ProjectChat', { projectId: item.project.id, projectName: item.project.name });
    } else if (item.type === 'USER') {
      navigation?.navigate('Profile');
    } else {
      Alert.alert(item.title, item.snippet || item.description || 'DevSync item');
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search projects, tasks, messages, files..."
          placeholderTextColor="#9ca3af"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Filter Pills */}
        <View style={styles.filterBar}>
          {FILTER_OPTIONS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterBtn, selectedType === f.key && styles.filterBtnActive]}
              onPress={() => setSelectedType(f.key)}
            >
              <Text
                style={[
                  styles.filterBtnText,
                  selectedType === f.key && styles.filterBtnTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Searches */}
      {debouncedQuery.length < 2 && recentSearches.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Recent Searches</Text>
          <View style={styles.recentTags}>
            {recentSearches.map((term) => (
              <TouchableOpacity
                key={term}
                style={styles.recentTag}
                onPress={() => setQuery(term)}
              >
                <Text style={styles.recentTagText}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      )}

      {/* Empty / Result List */}
      {!isLoading && (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            debouncedQuery.length >= 2 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyTitle}>No results found</Text>
                <Text style={styles.emptySubtitle}>
                  Try searching for another keyword or change the filter.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const emoji = TYPE_EMOJIS[item.type] || '📌';
            return (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleSelectResult(item)}
              >
                <Text style={styles.resultIcon}>{emoji}</Text>
                <View style={styles.resultContent}>
                  <View style={styles.resultTitleRow}>
                    <Text style={styles.resultTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.resultTypeTag}>{item.type}</Text>
                  </View>

                  {item.snippet ? (
                    <Text style={styles.resultSnippet} numberOfLines={2}>
                      {item.snippet}
                    </Text>
                  ) : null}

                  {item.project ? (
                    <Text style={styles.resultProject}>#{item.project.name}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 10,
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  filterBar: {
    flexDirection: 'row',
    gap: 6,
  },
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  filterBtnActive: {
    backgroundColor: '#6366f1',
  },
  filterBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
  },
  filterBtnTextActive: {
    color: '#fff',
  },
  recentSection: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  recentTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  recentTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  recentTag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  recentTagText: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '500',
  },
  list: { padding: 12, gap: 8 },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  resultIcon: { fontSize: 20, marginRight: 10, marginTop: 2 },
  resultContent: { flex: 1 },
  resultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  resultTitle: { fontSize: 13, fontWeight: '700', color: '#111827', flex: 1 },
  resultTypeTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6366f1',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  resultSnippet: { fontSize: 11, color: '#6b7280', marginTop: 4, lineHeight: 15 },
  resultProject: { fontSize: 10, color: '#9ca3af', marginTop: 4, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', marginTop: 80, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  emptySubtitle: { fontSize: 13, color: '#6b7280', marginTop: 4, textAlign: 'center' },
});

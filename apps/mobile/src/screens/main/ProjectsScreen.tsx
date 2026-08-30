import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { api } from '../../services/api';
import type { ProjectSummary } from '@devsync/shared';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#10b981',
  ARCHIVED: '#f59e0b',
};

export default function ProjectsScreen({ navigation }: { navigation: { navigate: (s: string, p?: object) => void } }) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProjects = async () => {
    try {
      const data = await api.getProjects() as ProjectSummary[];
      setProjects(data);
    } catch (error) {
      console.error('Projects error:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadProjects(); }, []);

  const onRefresh = () => { setRefreshing(true); loadProjects(); };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📁</Text>
            <Text style={styles.emptyTitle}>No projects yet</Text>
            <Text style={styles.emptySubtitle}>Create your first project to get started</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ProjectDetail', { projectId: item.id })}
          >
            <View style={styles.cardHeader}>
              <View style={styles.projectIcon}>
                <Text style={styles.projectIconText}>{item.name.charAt(0)}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
                  {item.status}
                </Text>
              </View>
            </View>
            <Text style={styles.projectName}>{item.name}</Text>
            {item.description ? (
              <Text style={styles.projectDesc} numberOfLines={2}>{item.description}</Text>
            ) : null}
            <Text style={styles.cardDate}>
              Created {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  projectIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectIconText: { color: '#6366f1', fontSize: 18, fontWeight: '700' },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  projectName: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4 },
  projectDesc: { fontSize: 14, color: '#6b7280', lineHeight: 20, marginBottom: 8 },
  cardDate: { fontSize: 12, color: '#9ca3af' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
});

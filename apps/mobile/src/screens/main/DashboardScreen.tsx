import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { DashboardOverviewData, ProjectHealthStatus } from '@devsync/shared';

const HEALTH_COLORS: Record<ProjectHealthStatus, { bg: string; text: string; dot: string }> = {
  HEALTHY: { bg: '#ecfdf5', text: '#047857', dot: '#10b981' },
  AT_RISK: { bg: '#fffbeb', text: '#b45309', dot: '#f59e0b' },
  CRITICAL: { bg: '#fef2f2', text: '#b91c1c', dot: '#ef4444' },
};

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function DashboardScreen({ navigation }: { navigation?: any }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (await api.getDashboard()) as any;
      setStats(data?.data || data);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const projects = stats?.projectSummaries || [];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name} 👋</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard value={stats?.projects ?? 0} label="Active Projects" color="#6366f1" />
        <StatCard value={stats?.openTasks ?? 0} label="Open Tasks" color="#f59e0b" />
        <StatCard value={stats?.completedTasks ?? 0} label="Completed" color="#10b981" />
        <StatCard value={stats?.overdueTasks ?? 0} label="Overdue" color="#ef4444" />
      </View>

      {/* Projects Health & Insights */}
      {projects.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Project Health</Text>
            <TouchableOpacity onPress={() => navigation?.navigate('Projects')}>
              <Text style={styles.linkText}>View All</Text>
            </TouchableOpacity>
          </View>

          {projects.map((p) => {
            const health = p.health?.status || 'HEALTHY';
            const healthTheme = HEALTH_COLORS[health] || HEALTH_COLORS.HEALTHY;
            return (
              <View key={p.id} style={styles.projectCard}>
                <View style={styles.projectHeader}>
                  <Text style={styles.projectName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <View style={[styles.healthBadge, { backgroundColor: healthTheme.bg }]}>
                    <View style={[styles.healthDot, { backgroundColor: healthTheme.dot }]} />
                    <Text style={[styles.healthText, { color: healthTheme.text }]}>{health}</Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${p.completionRate}%` }]} />
                </View>

                <View style={styles.projectMetaRow}>
                  <Text style={styles.projectMetaText}>{p.completionRate}% complete</Text>
                  <Text style={styles.projectMetaText}>
                    {p.openTasks} open • {p.memberCount} members
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {stats?.recentActivity && stats.recentActivity.length > 0 ? (
          stats.recentActivity.slice(0, 5).map((activity) => (
            <View key={activity.id} style={styles.activityItem}>
              <View style={styles.activityDot} />
              <View style={styles.activityContent}>
                <Text style={styles.activityDesc}>
                  <Text style={{ fontWeight: '700' }}>{activity.user?.name || 'Member'}</Text>{' '}
                  {activity.description}
                </Text>
                <Text style={styles.activityTime}>
                  {new Date(activity.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No recent activity</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  greeting: { fontSize: 13, color: '#6b7280' },
  userName: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 2 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  statValue: { fontSize: 26, fontWeight: '700', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  linkText: { fontSize: 12, color: '#6366f1', fontWeight: '600' },
  projectCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  projectName: { fontSize: 13, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  healthDot: { width: 6, height: 6, borderRadius: 3 },
  healthText: { fontSize: 10, fontWeight: '700' },
  progressBarBg: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 3,
  },
  projectMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  projectMetaText: { fontSize: 10, color: '#9ca3af', fontWeight: '500' },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6366f1',
    marginTop: 6,
    marginRight: 10,
  },
  activityContent: { flex: 1 },
  activityDesc: { fontSize: 12, color: '#374151', lineHeight: 18 },
  activityTime: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  emptyState: { padding: 16, alignItems: 'center' },
  emptyText: { color: '#9ca3af', fontSize: 13 },
});

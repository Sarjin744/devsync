import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { api } from '../../services/api';

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  projectId: string;
  dueDate: string | null;
  isOverdue: boolean;
  project?: {
    id: string;
    name: string;
  };
}

const STATUS_TABS: { key: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'; label: string }[] = [
  { key: 'TODO', label: 'To Do' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'IN_REVIEW', label: 'In Review' },
  { key: 'DONE', label: 'Done' },
];

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  CRITICAL: { bg: '#fee2e2', text: '#b91c1c' },
  HIGH: { bg: '#fef3c7', text: '#b45309' },
  MEDIUM: { bg: '#e0e7ff', text: '#4338ca' },
  LOW: { bg: '#f3f4f6', text: '#4b5563' },
};

export default function TasksScreen() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [activeStatus, setActiveStatus] = useState<'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'>('TODO');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selected task modal
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const data = (await api.getMyTasks()) as TaskItem[];
      setTasks(data || []);
    } catch {
      Alert.alert('Error', 'Failed to load tasks');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await api.updateTaskStatus(taskId, newStatus);
      fetchTasks();
      if (selectedTask) {
        setSelectedTask({ ...selectedTask, status: newStatus as TaskItem['status'] });
      }
      Alert.alert('Success', 'Status updated');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      Alert.alert('Error', message);
    }
  };

  const filteredTasks = tasks.filter((t) => t.status === activeStatus);

  const renderItem = ({ item }: { item: TaskItem }) => {
    const priority = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.MEDIUM;

    return (
      <TouchableOpacity style={styles.card} onPress={() => setSelectedTask(item)}>
        <View style={styles.cardHeader}>
          <View style={[styles.priorityBadge, { backgroundColor: priority.bg }]}>
            <Text style={[styles.priorityText, { color: priority.text }]}>{item.priority}</Text>
          </View>

          {item.isOverdue && (
            <View style={styles.overdueBadge}>
              <Text style={styles.overdueText}>⚠️ Overdue</Text>
            </View>
          )}
        </View>

        <Text style={styles.taskTitle}>{item.title}</Text>
        {item.description ? (
          <Text style={styles.taskDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.cardFooter}>
          {item.project && (
            <Text style={styles.projectName}>📁 {item.project.name}</Text>
          )}
          {item.dueDate && (
            <Text style={[styles.dueDate, item.isOverdue && styles.dueDateOverdue]}>
              📅 {new Date(item.dueDate).toLocaleDateString()}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Status tabs */}
      <View style={styles.tabBar}>
        {STATUS_TABS.map((tab) => {
          const count = tasks.filter((t) => t.status === tab.key).length;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeStatus === tab.key && styles.tabActive]}
              onPress={() => setActiveStatus(tab.key)}
            >
              <Text style={[styles.tabText, activeStatus === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
              <View style={[styles.badge, activeStatus === tab.key && styles.badgeActive]}>
                <Text style={[styles.badgeText, activeStatus === tab.key && styles.badgeTextActive]}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchTasks();
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tasks in {STATUS_TABS.find((t) => t.key === activeStatus)?.label}</Text>
            <Text style={styles.emptySubtext}>Tasks assigned to you will appear here</Text>
          </View>
        }
      />

      {/* Task Details Modal */}
      {selectedTask && (
        <Modal visible={!!selectedTask} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedTask.title}</Text>
                <TouchableOpacity onPress={() => setSelectedTask(null)}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              {selectedTask.description ? (
                <Text style={styles.modalDesc}>{selectedTask.description}</Text>
              ) : null}

              <Text style={styles.sectionHeading}>Change Status:</Text>
              <View style={styles.statusRow}>
                {STATUS_TABS.map((tab) => (
                  <TouchableOpacity
                    key={tab.key}
                    style={[
                      styles.statusOption,
                      selectedTask.status === tab.key && styles.statusOptionActive,
                    ]}
                    onPress={() => handleStatusChange(selectedTask.id, tab.key)}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        selectedTask.status === tab.key && styles.statusOptionTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  tabActive: {
    backgroundColor: '#ede9fe',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#6366f1',
  },
  badge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
  },
  badgeActive: {
    backgroundColor: '#6366f1',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6b7280',
  },
  badgeTextActive: {
    color: '#fff',
  },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  overdueBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  overdueText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b91c1c',
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  taskDesc: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f9fafb',
  },
  projectName: {
    fontSize: 11,
    color: '#6366f1',
    fontWeight: '600',
  },
  dueDate: {
    fontSize: 11,
    color: '#9ca3af',
  },
  dueDateOverdue: {
    color: '#dc2626',
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  closeBtn: {
    fontSize: 18,
    color: '#9ca3af',
    padding: 4,
  },
  modalDesc: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 16,
    lineHeight: 18,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  statusOptionActive: {
    backgroundColor: '#6366f1',
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  statusOptionTextActive: {
    color: '#fff',
  },
});

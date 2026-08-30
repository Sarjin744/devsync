import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { api } from '../../services/api';
import { getMobileSocket } from '../../services/socket';
import type { Notification } from '@devsync/shared';
import type { Socket } from 'socket.io-client';

const TYPE_ICONS: Record<string, string> = {
  TASK_ASSIGNED: '📋',
  TASK_STATUS_CHANGED: '🔄',
  TASK_DUE_SOON: '⏰',
  TASK_OVERDUE: '🚨',
  PROJECT_INVITATION: '✉️',
  PROJECT_MEMBER_ADDED: '👤',
  PROJECT_MEMBER_REMOVED: '🚫',
  PROJECT_ROLE_CHANGED: '🛡️',
  CHAT_MESSAGE: '💬',
  NEW_MESSAGE: '💬',
  TASK_COMMENTED: '💭',
  TEAM_MEMBER_JOINED: '🎉',
  MENTION: '@',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function NotificationsScreen({ navigation }: { navigation?: any }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = (await api.getNotifications()) as any;
      const fetched: Notification[] =
        res?.notifications || res?.items || (Array.isArray(res) ? res : []);
      setNotifications(fetched);
    } catch {
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Real-time Socket.IO listeners
  useEffect(() => {
    let activeSocket: Socket;

    getMobileSocket().then((s) => {
      activeSocket = s;
      if (!s.connected) s.connect();

      s.on('notification:new', (notif: Notification) => {
        setNotifications((prev) => [notif, ...prev.filter((n) => n.id !== notif.id)]);
      });

      s.on('notification:read', (data: { notificationId: string }) => {
        setNotifications((prev) =>
          prev.map((n) => (n.id === data.notificationId ? { ...n, isRead: true } : n)),
        );
      });

      s.on('notification:read-all', () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      });
    });

    return () => {
      if (activeSocket) {
        activeSocket.off('notification:new');
        activeSocket.off('notification:read');
        activeSocket.off('notification:read-all');
      }
    };
  }, []);

  const markRead = async (id: string) => {
    try {
      await api.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    try {
      await api.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const handleNotificationPress = (item: Notification) => {
    if (!item.isRead) {
      markRead(item.id);
    }
    if (item.projectId) {
      navigation?.navigate('ProjectChat', {
        projectId: item.projectId,
        projectName: item.title || 'Project',
      });
    }
  };

  const filteredNotifications =
    filter === 'UNREAD' ? notifications.filter((n) => !n.isRead) : notifications;
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <View style={styles.filterPills}>
          <TouchableOpacity
            style={[styles.pill, filter === 'ALL' && styles.pillActive]}
            onPress={() => setFilter('ALL')}
          >
            <Text style={[styles.pillText, filter === 'ALL' && styles.pillTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pill, filter === 'UNREAD' && styles.pillActive]}
            onPress={() => setFilter('UNREAD')}
          >
            <Text style={[styles.pillText, filter === 'UNREAD' && styles.pillTextActive]}>
              Unread {unreadCount > 0 ? `(${unreadCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadNotifications();
            }}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'UNREAD'
                ? 'You have read all your notifications'
                : 'All caught up! No notifications to display.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, !item.isRead && styles.itemUnread]}
            onPress={() => handleNotificationPress(item)}
          >
            <Text style={styles.itemIcon}>{TYPE_ICONS[item.type] ?? '🔔'}</Text>
            <View style={styles.itemContent}>
              <Text style={[styles.itemTitle, !item.isRead && styles.itemTitleUnread]}>
                {item.title || 'DevSync Alert'}
              </Text>
              <Text style={styles.itemMessage}>{item.message}</Text>
              <Text style={styles.itemTime}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            </View>
            {!item.isRead && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  filterPills: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pillActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pillText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#111827',
  },
  markAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#ede9fe',
    borderRadius: 8,
  },
  markAllText: { color: '#6366f1', fontSize: 12, fontWeight: '700' },
  list: { padding: 12, gap: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  itemUnread: {
    backgroundColor: '#f5f3ff',
    borderColor: '#ede9fe',
  },
  itemIcon: { fontSize: 20, marginRight: 12, marginTop: 2 },
  itemContent: { flex: 1 },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  itemTitleUnread: {
    color: '#111827',
    fontWeight: '700',
  },
  itemMessage: { fontSize: 13, color: '#4b5563', lineHeight: 18 },
  itemTime: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366f1',
    marginLeft: 8,
    marginTop: 6,
  },
  emptyState: { alignItems: 'center', marginTop: 80, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  emptySubtitle: { fontSize: 13, color: '#6b7280', marginTop: 4, textAlign: 'center' },
});

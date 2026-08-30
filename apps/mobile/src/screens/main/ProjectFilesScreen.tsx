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
  TextInput,
  Linking,
} from 'react-native';
import { api, API_BASE_URL } from '../../services/api';
import { getMobileSocket } from '../../services/socket';
import type { ProjectFile } from '@devsync/shared';
import type { Socket } from 'socket.io-client';

const FILE_ICONS: Record<string, string> = {
  'application/pdf': '📄',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'image/webp': '🖼️',
  'application/zip': '📦',
  'text/plain': '📝',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ProjectFilesScreen({ route }: { route?: any }) {
  const projectId = route?.params?.projectId;
  const projectName = route?.params?.projectName || 'Project Files';

  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'name' | 'size'>('newest');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFiles = useCallback(async () => {
    if (!projectId) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = (await api.getProjectFiles(projectId, { sort, search })) as any;
      const fetchedFiles: ProjectFile[] = res?.files || (Array.isArray(res) ? res : []);
      setFiles(fetchedFiles);
    } catch {
      Alert.alert('Error', 'Failed to load project files');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [projectId, sort, search]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Real-time Socket.IO sync
  useEffect(() => {
    if (!projectId) return;
    let activeSocket: Socket;

    getMobileSocket().then((s) => {
      activeSocket = s;
      if (!s.connected) s.connect();

      s.emit('project:join', { projectId });

      s.on('file:new', (newFile: ProjectFile) => {
        setFiles((prev) => [newFile, ...prev.filter((f) => f.id !== newFile.id)]);
      });

      s.on('file:updated', (updatedFile: ProjectFile) => {
        setFiles((prev) => prev.map((f) => (f.id === updatedFile.id ? updatedFile : f)));
      });

      s.on('file:deleted', (data: { fileId: string }) => {
        setFiles((prev) => prev.filter((f) => f.id !== data.fileId));
      });
    });

    return () => {
      if (activeSocket) {
        activeSocket.off('file:new');
        activeSocket.off('file:updated');
        activeSocket.off('file:deleted');
      }
    };
  }, [projectId]);

  const handleDelete = (file: ProjectFile) => {
    Alert.alert(
      'Delete File',
      `Are you sure you want to delete "${file.originalName || file.fileName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteProjectFile(file.id);
              setFiles((prev) => prev.filter((f) => f.id !== file.id));
            } catch {
              Alert.alert('Error', 'Failed to delete file');
            }
          },
        },
      ],
    );
  };

  const handleDownload = (file: ProjectFile) => {
    const downloadUrl = `${API_BASE_URL}/api/files/${file.id}/download`;
    Linking.openURL(downloadUrl).catch(() => {
      Alert.alert('Error', 'Unable to open file download');
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      {/* Search Header */}
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search files..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.sortContainer}>
          {(['newest', 'name', 'size'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.sortBtn, sort === s && styles.sortBtnActive]}
              onPress={() => setSort(s)}
            >
              <Text style={[styles.sortText, sort === s && styles.sortTextActive]}>
                {s.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={files}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadFiles();
            }}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📁</Text>
            <Text style={styles.emptyTitle}>No files found</Text>
            <Text style={styles.emptySubtitle}>
              {search
                ? 'No files matching your search query'
                : 'Project attachments will appear here.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const icon = FILE_ICONS[item.mimeType] || '📎';
          const name = item.originalName || item.fileName;
          return (
            <View style={styles.item}>
              <Text style={styles.fileIcon}>{icon}</Text>
              <View style={styles.itemContent}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={styles.fileMeta}>
                  {formatFileSize(item.fileSize || item.size)} •{' '}
                  {item.uploadedBy?.name || 'Member'}
                </Text>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleDownload(item)}
                >
                  <Text style={styles.actionBtnText}>⬇</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={() => handleDelete(item)}
                >
                  <Text style={[styles.actionBtnText, styles.deleteBtnText]}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 8,
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
  },
  sortContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  sortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  sortBtnActive: {
    backgroundColor: '#6366f1',
  },
  sortText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6b7280',
  },
  sortTextActive: {
    color: '#fff',
  },
  list: { padding: 12, gap: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  fileIcon: { fontSize: 24, marginRight: 10 },
  itemContent: { flex: 1 },
  fileName: { fontSize: 13, fontWeight: '700', color: '#111827' },
  fileMeta: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: { fontSize: 14, color: '#4b5563', fontWeight: '700' },
  deleteBtn: { backgroundColor: '#fee2e2' },
  deleteBtnText: { color: '#ef4444' },
  emptyState: { alignItems: 'center', marginTop: 80, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  emptySubtitle: { fontSize: 13, color: '#6b7280', marginTop: 4, textAlign: 'center' },
});

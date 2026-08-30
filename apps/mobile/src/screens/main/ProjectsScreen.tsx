import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { api } from '../../services/api';

interface TeamOption {
  id: string;
  name: string;
}

interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  teamId: string | null;
  team: { id: string; name: string } | null;
  status: 'ACTIVE' | 'ARCHIVED';
  ownerId: string;
  role: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ProjectsScreen({ navigation }: { navigation?: any }) {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New Project modal state
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [projectsData, teamsData] = await Promise.all([
        api.getProjects({ status: statusFilter }) as Promise<ProjectItem[]>,
        api.getTeams() as Promise<TeamOption[]>,
      ]);
      setProjects(projectsData || []);
      setTeams(teamsData || []);
      if (teamsData && teamsData.length > 0 && !selectedTeamId) {
        setSelectedTeamId(teamsData[0].id);
      }
    } catch {
      Alert.alert('Error', 'Failed to load projects');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, selectedTeamId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateProject = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Project name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        teamId: selectedTeamId || undefined,
      });
      setName('');
      setDescription('');
      setShowModal(false);
      loadData();
      Alert.alert('Success', 'Project created successfully');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create project';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
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
      {/* Header toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, statusFilter === 'ACTIVE' && styles.filterTabActive]}
            onPress={() => setStatusFilter('ACTIVE')}
          >
            <Text style={[styles.filterTabText, statusFilter === 'ACTIVE' && styles.filterTabTextActive]}>
              Active
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, statusFilter === 'ARCHIVED' && styles.filterTabActive]}
            onPress={() => setStatusFilter('ARCHIVED')}
          >
            <Text style={[styles.filterTabText, statusFilter === 'ARCHIVED' && styles.filterTabTextActive]}>
              Archived
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.createBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.createBtnText}>+ New Project</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📁</Text>
            <Text style={styles.emptyTitle}>
              {statusFilter === 'ARCHIVED' ? 'No archived projects' : 'No projects yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {statusFilter === 'ARCHIVED'
                ? 'Projects you archive will appear here'
                : 'Create your first project to start collaborating'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.projectIcon}>
                <Text style={styles.projectIconText}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={[styles.statusBadge, item.status === 'ARCHIVED' ? styles.archivedBadge : styles.activeBadge]}>
                <Text style={[styles.statusText, item.status === 'ARCHIVED' ? styles.archivedText : styles.activeText]}>
                  {item.status}
                </Text>
              </View>
            </View>

            <Text style={styles.projectName}>{item.name}</Text>
            {item.description ? (
              <Text style={styles.projectDesc} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}

            {item.team ? (
              <View style={styles.teamBadge}>
                <Text style={styles.teamBadgeText}>🏢 {item.team.name}</Text>
              </View>
            ) : null}

            <View style={styles.cardFooter}>
              <Text style={styles.memberCount}>👥 {item.memberCount} members</Text>
              <TouchableOpacity
                style={styles.chatButton}
                onPress={() =>
                  navigation?.navigate('ProjectChat', {
                    projectId: item.id,
                    projectName: item.name,
                  })
                }
              >
                <Text style={styles.chatButtonText}>💬 Chat</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Create Project Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Project</Text>

            <Text style={styles.label}>Project Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Mobile Engineering"
              value={name}
              onChangeText={setName}
            />

            {teams.length > 0 && (
              <View>
                <Text style={styles.label}>Team (Select)</Text>
                <View style={styles.teamSelectRow}>
                  {teams.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        styles.teamOption,
                        selectedTeamId === t.id && styles.teamOptionSelected,
                      ]}
                      onPress={() => setSelectedTeamId(t.id)}
                    >
                      <Text
                        style={[
                          styles.teamOptionText,
                          selectedTeamId === t.id && styles.teamOptionTextSelected,
                        ]}
                      >
                        {t.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What does this project accomplish?"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleCreateProject}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 2,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  filterTabActive: {
    backgroundColor: '#fff',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTabTextActive: {
    color: '#6366f1',
  },
  createBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  list: { padding: 16, gap: 12 },
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
    marginBottom: 10,
  },
  projectIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectIconText: { color: '#6366f1', fontSize: 16, fontWeight: '700' },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeBadge: { backgroundColor: '#ecfdf5' },
  archivedBadge: { backgroundColor: '#f3f4f6' },
  statusText: { fontSize: 11, fontWeight: '600' },
  activeText: { color: '#059669' },
  archivedText: { color: '#6b7280' },
  projectName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  projectDesc: { fontSize: 13, color: '#6b7280', lineHeight: 18, marginBottom: 8 },
  teamBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 8,
  },
  teamBadgeText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f9fafb',
  },
  memberCount: { fontSize: 12, color: '#6b7280' },
  cardDate: { fontSize: 12, color: '#9ca3af' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 60 },
  emptyIcon: { fontSize: 44, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: '#6b7280', textAlign: 'center' },
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    marginBottom: 12,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  teamSelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  teamOption: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  teamOptionSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#ede9fe',
  },
  teamOptionText: {
    fontSize: 12,
    color: '#4b5563',
  },
  teamOptionTextSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  modalButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 13,
  },
  submitButton: {
    backgroundColor: '#6366f1',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  chatButton: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  chatButtonText: {
    color: '#6366f1',
    fontWeight: '700',
    fontSize: 11,
  },
});

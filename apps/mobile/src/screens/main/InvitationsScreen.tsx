import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { api } from '../../services/api';

interface Invitation {
  id: string;
  teamId: string;
  role: 'OWNER' | 'MEMBER';
  status: string;
  createdAt: string;
  team: {
    id: string;
    name: string;
    description: string | null;
  };
  invitedBy: {
    name: string;
    email: string;
  };
}

export default function InvitationsScreen() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInvitations = useCallback(async () => {
    try {
      const data = (await api.getInvitations()) as Invitation[];
      setInvitations(data || []);
    } catch {
      Alert.alert('Error', 'Failed to load invitations');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleAccept = async (id: string) => {
    try {
      await api.acceptInvitation(id);
      Alert.alert('Success', 'You have joined the team!');
      fetchInvitations();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to accept invitation';
      Alert.alert('Error', message);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.rejectInvitation(id);
      Alert.alert('Success', 'Invitation rejected');
      fetchInvitations();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reject invitation';
      Alert.alert('Error', message);
    }
  };

  const renderItem = ({ item }: { item: Invitation }) => (
    <View style={styles.card}>
      <Text style={styles.teamName}>{item.team.name}</Text>
      <Text style={styles.invitedBy}>
        Invited by {item.invitedBy.name} ({item.invitedBy.email})
      </Text>
      {item.team.description ? (
        <Text style={styles.description}>{item.team.description}</Text>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, styles.rejectBtn]}
          onPress={() => handleReject(item.id)}
        >
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.acceptBtn]}
          onPress={() => handleAccept(item.id)}
        >
          <Text style={styles.acceptText}>Accept & Join</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={invitations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchInvitations();
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No pending invitations</Text>
            <Text style={styles.emptySubtext}>When you are invited to a team, it will appear here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  teamName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  invitedBy: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rejectBtn: {
    backgroundColor: '#f3f4f6',
  },
  rejectText: {
    color: '#4b5563',
    fontSize: 13,
    fontWeight: '600',
  },
  acceptBtn: {
    backgroundColor: '#6366f1',
  },
  acceptText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
  },
});

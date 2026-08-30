import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.updateProfile({ name, bio });
      await refreshUser();
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>{user?.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <View style={[styles.onlineBadge, { backgroundColor: user?.isOnline ? '#d1fae5' : '#f3f4f6' }]}>
          <View style={[styles.onlineDot, { backgroundColor: user?.isOnline ? '#10b981' : '#9ca3af' }]} />
          <Text style={[styles.onlineText, { color: user?.isOnline ? '#065f46' : '#6b7280' }]}>
            {user?.isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      {/* Profile Info */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
            <Text style={styles.editBtn}>{isEditing ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Name</Text>
          {isEditing ? (
            <TextInput style={styles.fieldInput} value={name} onChangeText={setName} />
          ) : (
            <Text style={styles.fieldValue}>{user?.name}</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Email</Text>
          <Text style={styles.fieldValue}>{user?.email}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Bio</Text>
          {isEditing ? (
            <TextInput
              style={[styles.fieldInput, { height: 80 }]}
              value={bio}
              onChangeText={setBio}
              multiline
              placeholder="Tell your team about yourself"
            />
          ) : (
            <Text style={styles.fieldValue}>{user?.bio ?? 'No bio yet'}</Text>
          )}
        </View>

        {isEditing && (
          <TouchableOpacity
            style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Text style={styles.memberSince}>
          Member since {new Date(user?.createdAt ?? '').toLocaleDateString()}
        </Text>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  avatarSection: {
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  userName: { fontSize: 22, fontWeight: '700', color: '#111827' },
  userEmail: { fontSize: 14, color: '#6b7280', marginTop: 2, marginBottom: 10 },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  onlineDot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 5 },
  onlineText: { fontSize: 12, fontWeight: '600' },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  editBtn: { color: '#6366f1', fontSize: 14, fontWeight: '600' },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600', marginBottom: 4 },
  fieldValue: { fontSize: 15, color: '#111827' },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    color: '#111827',
  },
  saveBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  memberSince: { fontSize: 14, color: '#6b7280' },
  logoutBtn: {
    margin: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  logoutText: { color: '#dc2626', fontWeight: '600', fontSize: 15 },
});

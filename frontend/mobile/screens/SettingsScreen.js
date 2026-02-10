import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/ui/Toast';
import { SPACING, RADIUS, TYPOGRAPHY } from '../constants/colors';

const SettingsScreen = () => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const toast = useToast();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const handleLogout = () => {
    setConfirmLogout(true);
  };

  const confirmLogoutAction = async () => {
    setConfirmLogout(false);
    await logout();
    toast.success('You have been logged out successfully.');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.profileCard, { backgroundColor: theme.surface }]}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={80} color="#3b82f6" />
        </View>
        <Text style={[styles.email, { color: theme.textPrimary }]}>{user?.email || 'user@example.com'}</Text>
        <Text style={[styles.userId, { color: theme.textSecondary }]}>
          ID: {user?.userId?.substring(0, 8) || 'N/A'}...
        </Text>
      </View>

      {/* Confirmation Banner for Logout */}
      {confirmLogout && (
        <View style={[styles.confirmBanner, { backgroundColor: theme.errorBackground || '#FEE2E2', borderColor: '#EF4444' }]}>
          <Text style={[styles.confirmText, { color: theme.textPrimary }]}>
            Are you sure you want to log out?
          </Text>
          <View style={styles.confirmButtons}>
            <TouchableOpacity 
              onPress={() => setConfirmLogout(false)}
              style={[styles.confirmButton, styles.cancelButton, { borderColor: theme.border }]}
            >
              <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={confirmLogoutAction}
              style={[styles.confirmButton, styles.logoutConfirmButton]}
            >
              <Text style={styles.logoutConfirmText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity 
        style={[styles.logoutButton, { backgroundColor: theme.surface }]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  profileCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  email: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  userId: {
    fontSize: 14,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  // Confirmation banner styles
  confirmBanner: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  confirmText: {
    ...TYPOGRAPHY.body,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  confirmButton: {
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  cancelButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
  },
  logoutConfirmButton: {
    backgroundColor: '#EF4444',
  },
  logoutConfirmText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default SettingsScreen;

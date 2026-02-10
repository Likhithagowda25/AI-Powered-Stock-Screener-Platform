import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, TYPOGRAPHY, RADIUS } from '../../constants/colors';

/**
 * NoDataState - Fallback UI for missing or incomplete data
 * @param {string} title - Main title
 * @param {string} message - User-friendly description
 * @param {string} icon - Ionicons icon name
 * @param {function} onRetry - Optional retry handler
 */
export default function NoDataState({ 
  title = 'Data Not Available', 
  message = 'This information is currently unavailable.',
  icon = 'document-text-outline',
  onRetry = null 
}) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;

  return (
    <View style={styles.container}>
      <View style={[
        styles.iconCircle, 
        { backgroundColor: theme.warning + '20' },
        isSmallScreen && styles.smallIconCircle
      ]}>
        <Ionicons 
          name={icon} 
          size={isSmallScreen ? 32 : 48} 
          color={theme.warning} 
        />
      </View>
      
      <Text style={[
        styles.title, 
        { color: theme.textPrimary },
        isSmallScreen && styles.smallTitle
      ]}>
        {title}
      </Text>
      
      <Text style={[
        styles.message, 
        { color: theme.textSecondary },
        isSmallScreen && styles.smallMessage
      ]}>
        {message}
      </Text>

      {onRetry && (
        <TouchableOpacity
          style={[
            styles.retryButton, 
            { backgroundColor: theme.primary },
            isSmallScreen && styles.smallRetryButton
          ]}
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  smallIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  title: {
    ...TYPOGRAPHY.h3,
    fontWeight: '600',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  smallTitle: {
    fontSize: 18,
  },
  message: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  smallMessage: {
    fontSize: 14,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.full,
  },
  smallRetryButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  retryButtonText: {
    ...TYPOGRAPHY.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

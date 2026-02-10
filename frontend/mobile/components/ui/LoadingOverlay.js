import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, TYPOGRAPHY, SHADOWS } from '../../constants/colors';

/**
 * LoadingOverlay - Full screen loading state with customizable message
 * @param {string} message - Primary message to display
 * @param {string} subMessage - Secondary message to display
 */
export default function LoadingOverlay({ message = 'Loading...', subMessage = '' }) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.loaderBox, { backgroundColor: theme.surface, borderColor: theme.border }, SHADOWS.medium]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[
          styles.message, 
          { color: theme.textPrimary },
          isSmallScreen && styles.smallMessage
        ]}>
          {message}
        </Text>
        {subMessage ? (
          <Text style={[
            styles.subMessage, 
            { color: theme.textSecondary },
            isSmallScreen && styles.smallSubMessage
          ]}>
            {subMessage}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loaderBox: {
    padding: SPACING.xl,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 200,
    borderWidth: 1,
  },
  message: {
    ...TYPOGRAPHY.h3,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  smallMessage: {
    fontSize: 18,
  },
  subMessage: {
    ...TYPOGRAPHY.body,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  smallSubMessage: {
    fontSize: 14,
  },
});

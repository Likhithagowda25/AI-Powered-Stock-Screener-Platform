import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, TYPOGRAPHY } from '../../constants/colors';

export default function LoadingState() {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={[
        styles.loadingText, 
        { color: theme.textSecondary },
        isSmallScreen && styles.smallLoadingText
      ]}>
        Analyzing stocks...
      </Text>
      <Text style={[
        styles.loadingSubtext, 
        { color: theme.textSecondary },
        isSmallScreen && styles.smallLoadingSubtext
      ]}>
        This may take a few moments
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
  },
  loadingText: {
    ...TYPOGRAPHY.h3,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  smallLoadingText: {
    fontSize: 18,
  },
  loadingSubtext: {
    ...TYPOGRAPHY.body,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  smallLoadingSubtext: {
    fontSize: 14,
  },
});

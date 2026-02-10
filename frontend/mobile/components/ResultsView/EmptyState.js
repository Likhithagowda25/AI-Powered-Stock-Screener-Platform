import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, TYPOGRAPHY } from '../../constants/colors';

export default function EmptyState() {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;

  return (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name="search-outline" 
        size={isSmallScreen ? 48 : 64} 
        color={theme.textSecondary} 
      />
      <Text style={[
        styles.emptyText, 
        { color: theme.textSecondary },
        isSmallScreen && styles.smallEmptyText
      ]}>
        No stocks match your criteria
      </Text>
      <Text style={[
        styles.emptySubtext, 
        { color: theme.textSecondary },
        isSmallScreen && styles.smallEmptySubtext
      ]}>
        Try adjusting your filters
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    ...TYPOGRAPHY.h3,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  smallEmptyText: {
    fontSize: 18,
  },
  emptySubtext: {
    ...TYPOGRAPHY.body,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  smallEmptySubtext: {
    fontSize: 14,
  },
});

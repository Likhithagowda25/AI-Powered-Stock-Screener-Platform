import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, TYPOGRAPHY, RADIUS } from '../../constants/colors';

export default function MetricRow({ label, value, unit = '', isPrimary = false, isHighlighted = false }) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;

  return (
    <View style={[
      isPrimary ? styles.primaryMetricRow : styles.metricRow,
      isHighlighted && styles.highlightedMetricRow
    ]}>
      <Text 
        style={[
          isPrimary ? styles.primaryMetricLabel : styles.metricLabel,
          { color: isHighlighted ? theme.primary : theme.textSecondary },
          isHighlighted && styles.highlightedLabel,
          isSmallScreen && (isPrimary ? styles.smallPrimaryLabel : styles.smallLabel)
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
      <Text 
        style={[
          isPrimary ? styles.primaryMetricValue : styles.metricValue,
          { color: theme.textPrimary },
          isHighlighted && styles.highlightedValue,
          isSmallScreen && (isPrimary ? styles.smallPrimaryValue : styles.smallValue)
        ]}
        numberOfLines={1}
      >
        {value || 'N/A'}{unit}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    minHeight: 24,
  },
  metricLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    marginRight: SPACING.xs,
  },
  metricValue: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    textAlign: 'right',
  },
  smallLabel: {
    fontSize: 10,
  },
  smallValue: {
    fontSize: 12,
  },
  primaryMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    minHeight: 28,
  },
  primaryMetricLabel: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: SPACING.xs,
  },
  primaryMetricValue: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  smallPrimaryLabel: {
    fontSize: 12,
  },
  smallPrimaryValue: {
    fontSize: 14,
  },
  highlightedMetricRow: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xs,
  },
  highlightedLabel: {
    fontWeight: '700',
  },
  highlightedValue: {
    fontWeight: '800',
  },
});

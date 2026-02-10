import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../constants/colors';

/**
 * MetricsSection - Displays quarterly or TTM financial metrics
 * 
 * @param {string} title - Section title
 * @param {object} metrics - Metrics data object
 * @param {string} type - 'quarterly' or 'ttm'
 */
export default function MetricsSection({ title, metrics, type }) {
  const { theme } = useTheme();

  const formatValue = (value, format = 'number') => {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    const num = Number(value);
    
    switch (format) {
      case 'currency':
        if (Math.abs(num) >= 10000) return `₹${(num / 1000).toFixed(1)}K Cr`;
        if (Math.abs(num) >= 1000) return `₹${(num / 1000).toFixed(2)}K Cr`;
        return `₹${num.toFixed(2)} Cr`;
      case 'ratio':
        return num.toFixed(2);
      case 'percent':
        return `${num.toFixed(2)}%`;
      default:
        if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(2)}K`;
        return num.toFixed(2);
    }
  };

  const getMetricConfig = (key, type) => {
    const configs = {
      // Quarterly metrics
      revenue: { label: 'Revenue', format: 'currency', icon: 'bar-chart-outline' },
      ebitda: { label: 'EBITDA', format: 'currency', icon: 'trending-up-outline' },
      netIncome: { label: 'Net Income', format: 'currency', icon: 'cash-outline' },
      eps: { label: 'EPS', format: 'number', icon: 'stats-chart-outline' },
      freeCashFlow: { label: 'Free Cash Flow', format: 'currency', icon: 'wallet-outline' },
      totalDebt: { label: 'Total Debt', format: 'currency', icon: 'card-outline' },
      
      // TTM metrics
      fcf: { label: 'FCF (TTM)', format: 'currency', icon: 'wallet-outline' },
      peRatio: { label: 'P/E Ratio', format: 'ratio', icon: 'analytics-outline' },
      pegRatio: { label: 'PEG Ratio', format: 'ratio', icon: 'calculator-outline', isDerived: true },
      debtToFcf: { label: 'Debt/FCF', format: 'ratio', icon: 'swap-horizontal-outline', isDerived: true },
    };
    
    return configs[key] || { label: key, format: 'number', icon: 'ellipse-outline' };
  };

  const renderMetricRow = (key, value) => {
    const config = getMetricConfig(key, type);
    const formattedValue = formatValue(value, config.format);
    const isNA = formattedValue === 'N/A';
    
    return (
      <View key={key} style={[styles.metricRow, { borderBottomColor: theme.border }]}>
        <View style={styles.metricLeft}>
          <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name={config.icon} size={18} color={theme.primary} />
          </View>
          <View style={styles.labelContainer}>
            <Text style={[styles.metricLabel, { color: theme.textPrimary }]}>
              {config.label}
            </Text>
            {config.isDerived && (
              <View style={[styles.derivedBadge, { backgroundColor: theme.accentLight }]}>
                <Text style={[styles.derivedText, { color: theme.accent }]}>Derived</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={[
          styles.metricValue, 
          { color: isNA ? theme.textSecondary : theme.textPrimary }
        ]}>
          {formattedValue}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.titleRow}>
        <Ionicons 
          name={type === 'quarterly' ? 'calendar-outline' : 'time-outline'} 
          size={20} 
          color={theme.primary} 
        />
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          {title}
        </Text>
      </View>
      
      <View style={styles.metricsContainer}>
        {Object.entries(metrics).map(([key, value]) => renderMetricRow(key, value))}
      </View>

      {/* Period indicator */}
      <View style={[styles.periodNote, { backgroundColor: theme.surface }]}>
        <Ionicons name="information-circle-outline" size={14} color={theme.textSecondary} />
        <Text style={[styles.periodText, { color: theme.textSecondary }]}>
          {type === 'quarterly' 
            ? 'Latest quarter data' 
            : 'Trailing 12 months aggregate'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.small,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.h4,
    fontWeight: '600',
  },
  metricsContainer: {
    gap: SPACING.xs,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  metricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  metricLabel: {
    ...TYPOGRAPHY.body,
    fontWeight: '500',
  },
  metricValue: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },
  derivedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  derivedText: {
    fontSize: 9,
    fontWeight: '600',
  },
  periodNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.md,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  periodText: {
    ...TYPOGRAPHY.caption,
    fontStyle: 'italic',
  },
});

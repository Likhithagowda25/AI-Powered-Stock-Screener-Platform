import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../constants/colors';

/**
 * DerivedMetricsCard - Explains derived financial metrics used in screening
 * Shows formula breakdowns and explanations for transparency
 */
export default function DerivedMetricsCard({ 
  pegRatio, 
  debtToFcf, 
  fcfMargin, 
  epsGrowth,
  peRatio,
  freeCashFlow,
  totalDebt,
  revenue,
}) {
  const { theme } = useTheme();
  const [expandedMetric, setExpandedMetric] = useState(null);

  const derivedMetrics = [
    {
      id: 'peg',
      name: 'PEG Ratio',
      value: pegRatio,
      formula: 'P/E Ratio ÷ EPS Growth Rate',
      explanation: 'Price/Earnings to Growth ratio. Lower values (< 1) may indicate undervaluation relative to growth.',
      interpretation: getInterpretation('peg', pegRatio),
      icon: 'calculator-outline',
      components: peRatio && epsGrowth ? [
        { label: 'P/E Ratio', value: peRatio },
        { label: 'EPS Growth', value: `${epsGrowth}%` },
      ] : null,
    },
    {
      id: 'debtFcf',
      name: 'Debt to FCF',
      value: debtToFcf,
      formula: 'Total Debt ÷ Free Cash Flow',
      explanation: 'Years needed to pay off debt using free cash flow. Lower is better.',
      interpretation: getInterpretation('debtFcf', debtToFcf),
      icon: 'swap-horizontal-outline',
      components: totalDebt && freeCashFlow ? [
        { label: 'Total Debt', value: `₹${totalDebt} Cr` },
        { label: 'Free Cash Flow', value: `₹${freeCashFlow} Cr` },
      ] : null,
    },
    {
      id: 'fcfMargin',
      name: 'FCF Margin',
      value: fcfMargin,
      formula: '(Free Cash Flow ÷ Revenue) × 100',
      explanation: 'Percentage of revenue converted to free cash flow. Higher indicates efficient operations.',
      interpretation: getInterpretation('fcfMargin', fcfMargin),
      icon: 'pie-chart-outline',
      unit: '%',
      components: freeCashFlow && revenue ? [
        { label: 'Free Cash Flow', value: `₹${freeCashFlow} Cr` },
        { label: 'Revenue', value: `₹${revenue} Cr` },
      ] : null,
    },
  ].filter(m => m.value !== null && m.value !== undefined);

  function getInterpretation(metricId, value) {
    if (value === null || value === undefined) return null;
    
    switch (metricId) {
      case 'peg':
        if (value < 1) return { text: 'Potentially undervalued', color: '#10b981' };
        if (value < 2) return { text: 'Fairly valued', color: '#f59e0b' };
        return { text: 'Potentially overvalued', color: '#ef4444' };
      
      case 'debtFcf':
        if (value < 3) return { text: 'Low debt burden', color: '#10b981' };
        if (value < 7) return { text: 'Moderate debt', color: '#f59e0b' };
        return { text: 'High debt burden', color: '#ef4444' };
      
      case 'fcfMargin':
        if (value > 15) return { text: 'Excellent cash generation', color: '#10b981' };
        if (value > 5) return { text: 'Good cash generation', color: '#f59e0b' };
        if (value > 0) return { text: 'Positive cash flow', color: '#64748b' };
        return { text: 'Negative cash flow', color: '#ef4444' };
      
      default:
        return null;
    }
  }

  const toggleExpanded = (id) => {
    setExpandedMetric(expandedMetric === id ? null : id);
  };

  if (derivedMetrics.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.header}>
        <Ionicons name="flask-outline" size={20} color={theme.primary} />
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          Derived Metrics
        </Text>
        <View style={[styles.badge, { backgroundColor: theme.primaryLight }]}>
          <Text style={[styles.badgeText, { color: theme.primary }]}>
            Computed
          </Text>
        </View>
      </View>

      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        These metrics are calculated from base financial data
      </Text>

      <View style={styles.metricsList}>
        {derivedMetrics.map((metric) => (
          <View key={metric.id} style={styles.metricWrapper}>
            <TouchableOpacity
              style={[styles.metricRow, { backgroundColor: theme.surface }]}
              onPress={() => toggleExpanded(metric.id)}
              activeOpacity={0.7}
            >
              <View style={styles.metricLeft}>
                <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
                  <Ionicons name={metric.icon} size={18} color={theme.primary} />
                </View>
                <View style={styles.metricInfo}>
                  <Text style={[styles.metricName, { color: theme.textPrimary }]}>
                    {metric.name}
                  </Text>
                  {metric.interpretation && (
                    <Text style={[styles.interpretation, { color: metric.interpretation.color }]}>
                      {metric.interpretation.text}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.metricRight}>
                <Text style={[styles.metricValue, { color: theme.textPrimary }]}>
                  {Number(metric.value).toFixed(2)}{metric.unit || ''}
                </Text>
                <Ionicons 
                  name={expandedMetric === metric.id ? 'chevron-up' : 'chevron-down'} 
                  size={18} 
                  color={theme.textSecondary} 
                />
              </View>
            </TouchableOpacity>

            {/* Expanded explanation */}
            {expandedMetric === metric.id && (
              <View style={[styles.expandedContent, { backgroundColor: theme.surface }]}>
                {/* Formula */}
                <View style={styles.formulaSection}>
                  <Text style={[styles.formulaLabel, { color: theme.textSecondary }]}>
                    Formula:
                  </Text>
                  <Text style={[styles.formula, { color: theme.primary }]}>
                    {metric.formula}
                  </Text>
                </View>

                {/* Components breakdown */}
                {metric.components && (
                  <View style={styles.componentsSection}>
                    <Text style={[styles.componentsLabel, { color: theme.textSecondary }]}>
                      Components:
                    </Text>
                    {metric.components.map((comp, idx) => (
                      <View key={idx} style={styles.componentRow}>
                        <Text style={[styles.componentName, { color: theme.textSecondary }]}>
                          {comp.label}:
                        </Text>
                        <Text style={[styles.componentValue, { color: theme.textPrimary }]}>
                          {comp.value}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Explanation */}
                <View style={[styles.explanationSection, { borderTopColor: theme.border }]}>
                  <Ionicons name="information-circle-outline" size={14} color={theme.textSecondary} />
                  <Text style={[styles.explanation, { color: theme.textSecondary }]}>
                    {metric.explanation}
                  </Text>
                </View>
              </View>
            )}
          </View>
        ))}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  title: {
    ...TYPOGRAPHY.h4,
    fontWeight: '600',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    marginBottom: SPACING.md,
  },
  metricsList: {
    gap: SPACING.sm,
  },
  metricWrapper: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.sm,
  },
  metricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricInfo: {
    flex: 1,
  },
  metricName: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },
  interpretation: {
    ...TYPOGRAPHY.caption,
    fontWeight: '500',
    marginTop: 2,
  },
  metricRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  metricValue: {
    ...TYPOGRAPHY.h4,
    fontWeight: '700',
  },
  expandedContent: {
    padding: SPACING.sm,
    paddingTop: 0,
  },
  formulaSection: {
    marginBottom: SPACING.sm,
  },
  formulaLabel: {
    ...TYPOGRAPHY.caption,
    marginBottom: 2,
  },
  formula: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  componentsSection: {
    marginBottom: SPACING.sm,
  },
  componentsLabel: {
    ...TYPOGRAPHY.caption,
    marginBottom: SPACING.xs,
  },
  componentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  componentName: {
    ...TYPOGRAPHY.caption,
  },
  componentValue: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  explanationSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
  },
  explanation: {
    ...TYPOGRAPHY.caption,
    flex: 1,
    lineHeight: 18,
  },
});

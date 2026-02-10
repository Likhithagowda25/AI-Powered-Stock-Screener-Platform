import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../constants/colors';

/**
 * MatchedConditions - Shows why a stock matched the screener query
 * Displays conditions that the stock satisfied during screening
 */
export default function MatchedConditions({ conditions = [], queryContext = {} }) {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(true);

  if (!conditions || conditions.length === 0) {
    return null;
  }

  const getConditionIcon = (condition) => {
    const field = condition.field?.toLowerCase() || '';
    
    if (field.includes('pe') || field.includes('peg')) return 'analytics-outline';
    if (field.includes('growth') || field.includes('cagr')) return 'trending-up-outline';
    if (field.includes('debt') || field.includes('fcf')) return 'wallet-outline';
    if (field.includes('roe') || field.includes('roa')) return 'stats-chart-outline';
    if (field.includes('profit') || field.includes('earnings')) return 'cash-outline';
    if (field.includes('revenue')) return 'bar-chart-outline';
    return 'checkmark-circle-outline';
  };

  const formatCondition = (condition) => {
    const field = condition.field || 'Unknown';
    const operator = condition.operator || '=';
    const value = condition.value;
    
    // Format operator for display
    const opMap = {
      '<': '<',
      '>': '>',
      '<=': '≤',
      '>=': '≥',
      '=': '=',
      '!=': '≠',
      'between': 'between',
      'in': 'in',
    };
    
    const displayOp = opMap[operator] || operator;
    
    // Format field name for display
    const fieldMap = {
      'pe_ratio': 'P/E Ratio',
      'peg_ratio': 'PEG Ratio',
      'debt_to_fcf': 'Debt/FCF',
      'roe': 'ROE',
      'roa': 'ROA',
      'eps_growth': 'EPS Growth',
      'revenue_growth_yoy': 'Revenue Growth',
      'net_profit': 'Net Profit',
      'free_cash_flow': 'Free Cash Flow',
      'eps_cagr': 'EPS CAGR',
      'revenue_cagr': 'Revenue CAGR',
      'fcf_margin': 'FCF Margin',
    };
    
    const displayField = fieldMap[field] || field.replace(/_/g, ' ');
    
    // Format value
    let displayValue = value;
    if (Array.isArray(value)) {
      displayValue = value.join(' - ');
    } else if (typeof value === 'number') {
      displayValue = value.toFixed(2);
    }
    
    return {
      field: displayField,
      condition: `${displayOp} ${displayValue}`,
      isDerived: ['peg_ratio', 'debt_to_fcf', 'eps_cagr', 'revenue_cagr', 'fcf_margin'].includes(field),
      hasPeriod: condition.period !== undefined,
      periodText: condition.period ? formatPeriod(condition.period) : null,
    };
  };

  const formatPeriod = (period) => {
    if (!period) return null;
    const { type, n, aggregation } = period;
    
    const typeMap = {
      'last_n_quarters': `last ${n} quarters`,
      'last_n_years': `last ${n} years`,
      'trailing_12_months': 'TTM',
      'quarter_over_quarter': 'QoQ',
      'year_over_year': 'YoY',
    };
    
    const aggMap = {
      'all': 'all periods',
      'any': 'any period',
      'avg': 'average',
      'trend': 'trend',
    };
    
    const periodStr = typeMap[type] || type;
    const aggStr = aggMap[aggregation] || '';
    
    return aggStr ? `${periodStr} (${aggStr})` : periodStr;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.cardBackground }]}>
      <TouchableOpacity 
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="filter" size={20} color={theme.primary} />
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Why This Stock Matched
          </Text>
        </View>
        <Ionicons 
          name={isExpanded ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color={theme.textSecondary} 
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.conditionsList}>
          {conditions.map((condition, index) => {
            const formatted = formatCondition(condition);
            return (
              <View 
                key={index} 
                style={[styles.conditionItem, { backgroundColor: theme.surface }]}
              >
                <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
                  <Ionicons 
                    name={getConditionIcon(condition)} 
                    size={16} 
                    color={theme.primary} 
                  />
                </View>
                <View style={styles.conditionContent}>
                  <View style={styles.conditionRow}>
                    <Text style={[styles.fieldName, { color: theme.textPrimary }]}>
                      {formatted.field}
                    </Text>
                    <Text style={[styles.conditionText, { color: theme.primary }]}>
                      {formatted.condition}
                    </Text>
                  </View>
                  <View style={styles.badgesRow}>
                    {formatted.isDerived && (
                      <View style={[styles.badge, { backgroundColor: theme.accentLight }]}>
                        <Text style={[styles.badgeText, { color: theme.accent }]}>
                          Derived Metric
                        </Text>
                      </View>
                    )}
                    {formatted.periodText && (
                      <View style={[styles.badge, { backgroundColor: theme.primaryLight }]}>
                        <Ionicons name="time-outline" size={10} color={theme.primary} />
                        <Text style={[styles.badgeText, { color: theme.primary }]}>
                          {formatted.periodText}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              </View>
            );
          })}

          {/* Query context info */}
          {queryContext?.originalQuery && (
            <View style={[styles.queryInfo, { backgroundColor: theme.surface }]}>
              <Ionicons name="chatbubble-outline" size={14} color={theme.textSecondary} />
              <Text style={[styles.queryText, { color: theme.textSecondary }]} numberOfLines={2}>
                "{queryContext.originalQuery}"
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.h4,
    fontWeight: '600',
  },
  conditionsList: {
    padding: SPACING.md,
    paddingTop: 0,
    gap: SPACING.sm,
  },
  conditionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conditionContent: {
    flex: 1,
    gap: 4,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  fieldName: {
    ...TYPOGRAPHY.body,
    fontWeight: '500',
  },
  conditionText: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  queryInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.xs,
  },
  queryText: {
    ...TYPOGRAPHY.caption,
    fontStyle: 'italic',
    flex: 1,
  },
});

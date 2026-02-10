import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../constants/colors';
import MetricRow from './MetricRow';

export default function StockCard({ 
  item, 
  highlightedFields = [], 
  matchedConditions = [],
  onPress,
  showMatchedBadge = false,
}) {
  const { theme, isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  
  const isSmallScreen = width < 375;
  const cardWidth = width - (SPACING.lg * 2);
  
  // Check for derived metrics
  const hasDerivedMetrics = item.peg_ratio || item.debt_to_fcf || item.fcf_margin;

  // Convert raw rupee values to Crores (÷ 1e7)
  const formatCrores = (num) => {
    if (num === null || num === undefined || isNaN(num)) return null;
    const value = Number(num) / 1e7; // raw → crores
    if (Math.abs(value) >= 100000) return (value / 100000).toFixed(2) + ' L'; // lakh crore
    if (Math.abs(value) >= 1) return value.toFixed(2);
    return value.toFixed(4);
  };

  // For decimal-ratio fields stored as 0.xx (roe, roa, margins) → show as xx%
  const formatRatioPercent = (num) => {
    if (num === null || num === undefined || isNaN(num)) return null;
    const value = Number(num);
    // If already in percentage form (|val| > 1), show as-is
    if (Math.abs(value) > 1) return value.toFixed(2);
    return (value * 100).toFixed(2);
  };

  // For fields already stored as percentages (revenue_growth_yoy, ebitda_growth_yoy)
  const formatPercentage = (num) => {
    if (num === null || num === undefined || isNaN(num)) return null;
    return Number(num).toFixed(2);
  };

  const formatCurrency = (num) => {
    if (num === null || num === undefined || isNaN(num)) return null;
    return Number(num).toFixed(2);
  };

  const CardWrapper = onPress ? TouchableOpacity : View;
  const cardProps = onPress ? { onPress, activeOpacity: 0.8 } : {};

  return (
    <CardWrapper {...cardProps} style={[styles.cardContainer, { width: cardWidth }]}>
      <LinearGradient
        colors={isDarkMode ? theme.gradientHeader : ['#EEF2FF', '#DBEAFE']}
        style={styles.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.companyInfo}>
            <Text 
              style={[styles.ticker, { 
                color: isDarkMode ? '#fff' : '#111827',
                fontSize: isSmallScreen ? 20 : 24,
              }]}
              numberOfLines={1}
            >
              {item.ticker}
            </Text>
            <Text 
              style={[styles.companyName, { 
                color: isDarkMode ? 'rgba(255,255,255,0.82)' : '#2563EB',
                fontSize: isSmallScreen ? 12 : 13,
              }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.name}
            </Text>
          </View>
          {/* Badges for derived metrics and matched conditions */}
          <View style={styles.badgesContainer}>
            {hasDerivedMetrics && (
              <View style={[styles.derivedBadge, { backgroundColor: isDarkMode ? '#4c1d95' : '#ddd6fe' }]}>
                <Ionicons name="flask-outline" size={10} color={isDarkMode ? '#c4b5fd' : '#7c3aed'} />
                <Text style={[styles.badgeText, { color: isDarkMode ? '#c4b5fd' : '#7c3aed' }]}>
                  Derived
                </Text>
              </View>
            )}
            {matchedConditions.length > 0 && showMatchedBadge && (
              <View style={[styles.matchedBadge, { backgroundColor: isDarkMode ? '#065f46' : '#d1fae5' }]}>
                <Text style={[styles.badgeText, { color: isDarkMode ? '#6ee7b7' : '#059669' }]}>
                  {matchedConditions.length} matched
                </Text>
              </View>
            )}
            {onPress && (
              <Ionicons name="chevron-forward" size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            )}
          </View>
        </View>
      </LinearGradient>

      <View style={[styles.cardContent, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.metricsContainer}>
          <MetricRow
            label="P/E Ratio"
            value={formatCurrency(item.pe_ratio)}
            isPrimary={true}
            isHighlighted={highlightedFields.includes('pe_ratio')}
          />
          <MetricRow
            label="ROE"
            value={formatRatioPercent(item.roe)}
            unit="%"
            isPrimary={true}
            isHighlighted={highlightedFields.includes('roe')}
          />
          <MetricRow
            label="Market Cap"
            value={formatCrores(item.market_cap)}
            unit=" Cr"
            isPrimary={true}
            isHighlighted={highlightedFields.includes('market_cap')}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.secondaryMetricsGrid}>
          <View style={styles.secondaryColumn}>
            <MetricRow
              label="P/B Ratio"
              value={formatCurrency(item.pb_ratio)}
              isHighlighted={highlightedFields.includes('pb_ratio')}
            />
            <MetricRow
              label="Revenue"
              value={formatCrores(item.revenue)}
              unit=" Cr"
              isHighlighted={highlightedFields.includes('revenue')}
            />
            <MetricRow
              label="Rev. Growth"
              value={formatPercentage(item.revenue_growth_yoy)}
              unit="%"
              isHighlighted={highlightedFields.includes('revenue_growth_yoy')}
            />
            <MetricRow
              label="EPS"
              value={formatCurrency(item.eps)}
              isHighlighted={highlightedFields.includes('eps')}
            />
          </View>
          <View style={styles.secondaryColumn}>
            <MetricRow
              label="ROA"
              value={formatRatioPercent(item.roa)}
              unit="%"
              isHighlighted={highlightedFields.includes('roa')}
            />
            <MetricRow
              label="Op. Margin"
              value={formatRatioPercent(item.operating_margin)}
              unit="%"
              isHighlighted={highlightedFields.includes('operating_margin')}
            />
            <MetricRow
              label="D/E Ratio"
              value={formatCurrency(item.debt_to_equity)}
              isHighlighted={highlightedFields.includes('debt_to_equity')}
            />
          </View>
        </View>
      </View>
    </CardWrapper>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  gradientHeader: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 60,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  companyInfo: {
    flex: 1,
  },
  ticker: {
    fontWeight: '800',
    marginBottom: 2,
  },
  companyName: {
    fontWeight: '600',
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  derivedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    gap: 3,
  },
  matchedBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardContent: {
    padding: SPACING.md,
  },
  metricsContainer: {
    marginBottom: SPACING.xs,
  },
  divider: {
    height: 1,
    marginVertical: SPACING.sm,
  },
  secondaryMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  secondaryColumn: {
    flex: 1,
  },
});

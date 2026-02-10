import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../constants/colors';

/**
 * StockPriceCard - Premium gradient card displaying current stock price
 */
export default function StockPriceCard({ 
  currentPrice, 
  previousClose, 
  dayHigh, 
  dayLow,
  volume,
  marketCap 
}) {
  const { theme } = useTheme();
  
  const priceChange = currentPrice && previousClose 
    ? currentPrice - previousClose 
    : null;
  const priceChangePercent = priceChange && previousClose 
    ? (priceChange / previousClose) * 100 
    : null;
  const isPositive = priceChange >= 0;

  const formatPrice = (val) => {
    if (val == null || isNaN(val)) return 'N/A';
    return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatLargeNumber = (val) => {
    if (val == null || isNaN(val)) return 'N/A';
    const num = Number(val);
    if (num >= 1e9) return `₹${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e7) return `₹${(num / 1e7).toFixed(2)}Cr`;
    if (num >= 1e5) return `₹${(num / 1e5).toFixed(2)}L`;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const formatVolume = (val) => {
    if (val == null || isNaN(val)) return 'N/A';
    const num = Number(val);
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e5) return `${(num / 1e5).toFixed(2)}L`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toLocaleString('en-IN');
  };

  return (
    <LinearGradient
      colors={theme.gradientBlue || ['#60A5FA', '#3B82F6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradientContainer, SHADOWS.medium]}
    >
      {/* Main Price Section */}
      <View style={styles.priceSection}>
        <View>
          <Text style={styles.labelWhite}>Current Price</Text>
          <Text style={styles.mainPrice}>
            {formatPrice(currentPrice)}
          </Text>
        </View>
        
        {priceChange != null && (
          <View style={[
            styles.changeBadge, 
            { backgroundColor: isPositive ? '#10B981' : '#EF4444' }
          ]}>
            <Ionicons 
              name={isPositive ? 'trending-up' : 'trending-down'} 
              size={18} 
              color="#FFFFFF" 
            />
            <Text style={styles.changeBadgeText}>
              {isPositive ? '+' : ''}{priceChange.toFixed(2)}
            </Text>
            <Text style={styles.changeBadgePercent}>
              ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
            </Text>
          </View>
        )}
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.iconCircle, { backgroundColor: '#34D399' }]}>
            <Ionicons name="arrow-up" size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.statLabel}>Day High</Text>
          <Text style={styles.statValue}>{formatPrice(dayHigh)}</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.iconCircle, { backgroundColor: '#F87171' }]}>
            <Ionicons name="arrow-down" size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.statLabel}>Day Low</Text>
          <Text style={styles.statValue}>{formatPrice(dayLow)}</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.iconCircle, { backgroundColor: '#A78BFA' }]}>
            <Ionicons name="pulse" size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.statLabel}>Volume</Text>
          <Text style={styles.statValue}>{formatVolume(volume)}</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.iconCircle, { backgroundColor: '#FBBF24' }]}>
            <Ionicons name="trending-up" size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.statLabel}>Market Cap</Text>
          <Text style={styles.statValue}>{formatLargeNumber(marketCap)}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  labelWhite: {
    ...TYPOGRAPHY.caption,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  mainPrice: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  changeBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  changeBadgePercent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    color: '#FFFFFF',
    opacity: 0.85,
    marginBottom: 2,
    fontSize: 11,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

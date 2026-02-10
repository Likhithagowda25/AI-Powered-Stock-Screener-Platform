import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, TYPOGRAPHY, RADIUS } from '../../constants/colors';

/**
 * TrendIndicator - Displays growth/trend indicators with visual icons
 * 
 * Types:
 * - 'growth': Shows percentage with ↑/↓ arrows
 * - 'score': Shows 0-1 score as bar
 * - 'trend': Shows directional trend (positive/negative/stable)
 */
export default function TrendIndicator({ label, value, type = 'growth' }) {
  const { theme } = useTheme();

  const getTrendIcon = (val) => {
    if (val === null || val === undefined) return { icon: 'remove-outline', color: theme.textSecondary };
    
    if (type === 'growth' || type === 'trend') {
      if (val > 0) return { icon: 'arrow-up', color: '#10b981' }; // Green
      if (val < 0) return { icon: 'arrow-down', color: '#ef4444' }; // Red
      return { icon: 'arrow-forward', color: theme.textSecondary }; // Neutral
    }
    
    if (type === 'score') {
      if (val >= 0.7) return { icon: 'checkmark-circle', color: '#10b981' };
      if (val >= 0.4) return { icon: 'ellipse', color: '#f59e0b' };
      return { icon: 'alert-circle', color: '#ef4444' };
    }
    
    return { icon: 'ellipse-outline', color: theme.textSecondary };
  };

  const formatValue = (val) => {
    if (val === null || val === undefined) return 'N/A';
    
    switch (type) {
      case 'growth':
        const sign = val > 0 ? '+' : '';
        return `${sign}${Number(val).toFixed(2)}%`;
      case 'score':
        return `${(Number(val) * 100).toFixed(0)}%`;
      case 'trend':
        if (val > 0) return 'Positive';
        if (val < 0) return 'Negative';
        return 'Stable';
      default:
        return String(val);
    }
  };

  const getDirectionLabel = (val) => {
    if (val === null || val === undefined) return '→ No data';
    if (val > 5) return '↑ Strong growth';
    if (val > 0) return '↑ Growing';
    if (val < -5) return '↓ Sharp decline';
    if (val < 0) return '↓ Declining';
    return '→ Stable';
  };

  const { icon, color } = getTrendIcon(value);
  const formattedValue = formatValue(value);
  const isNA = formattedValue === 'N/A';

  return (
    <View style={[styles.container, { borderBottomColor: theme.border }]}>
      <View style={styles.leftSection}>
        <View style={[styles.iconCircle, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>
            {label}
          </Text>
          {type === 'growth' && !isNA && (
            <Text style={[styles.directionLabel, { color: theme.textSecondary }]}>
              {getDirectionLabel(value)}
            </Text>
          )}
        </View>
      </View>
      
      <View style={styles.rightSection}>
        <Text style={[
          styles.value, 
          { color: isNA ? theme.textSecondary : color }
        ]}>
          {formattedValue}
        </Text>
        
        {/* Progress bar for score type */}
        {type === 'score' && !isNA && (
          <View style={[styles.progressContainer, { backgroundColor: theme.border }]}>
            <View 
              style={[
                styles.progressBar, 
                { 
                  width: `${Math.min(100, Number(value) * 100)}%`,
                  backgroundColor: color 
                }
              ]} 
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    ...TYPOGRAPHY.body,
    fontWeight: '500',
  },
  directionLabel: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: SPACING.xs,
  },
  value: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
  },
  progressContainer: {
    width: 60,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});

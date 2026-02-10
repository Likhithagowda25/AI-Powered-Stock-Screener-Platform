import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, RADIUS, SHADOWS } from '../../constants/colors';

/**
 * Card - Flexible card component
 * @param {React.ReactNode} children - Card content
 * @param {object} style - Additional styles
 * @param {function} onPress - Optional press handler
 * @param {string} variant - 'default' | 'elevated' | 'outlined'
 * @param {string} padding - 'none' | 'sm' | 'md' | 'lg'
 */
export default function Card({ 
  children, 
  style, 
  onPress,
  variant = 'default',
  padding = 'md',
}) {
  const { theme } = useTheme();
  
  const cardStyles = [
    styles.base,
    { backgroundColor: theme.surface, borderColor: theme.border },
    // give default cards a subtle border so they read on both themes
    variant === 'default' && { borderWidth: 1 },
    variant === 'elevated' && SHADOWS.medium,
    variant === 'outlined' && { borderWidth: 1, borderColor: theme.border },
    padding === 'none' && { padding: 0 },
    padding === 'sm' && { padding: SPACING.sm },
    padding === 'md' && { padding: SPACING.md },
    padding === 'lg' && { padding: SPACING.lg },
    style,
  ];
  
  if (onPress) {
    return (
      <TouchableOpacity 
        style={cardStyles}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }
  
  return <View style={cardStyles}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
});

import React from 'react';
import { Text, StyleSheet, TouchableOpacity, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../constants/colors';

/**
 * Button - Versatile button component
 * @param {string} title - Button text
 * @param {function} onPress - Press handler
 * @param {string} variant - 'primary' | 'secondary' | 'outline' | 'ghost'
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {string} icon - Ionicons icon name
 * @param {string} iconPosition - 'left' | 'right'
 * @param {boolean} loading - Show loading indicator
 * @param {boolean} disabled - Disable button
 * @param {boolean} fullWidth - Take full width
 */
export default function Button({ 
  title, 
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}) {
  const { theme } = useTheme();
  
  const getButtonStyle = () => {
    const base = [
      styles.base,
      size === 'sm' && styles.sizeSm,
      size === 'md' && styles.sizeMd,
      size === 'lg' && styles.sizeLg,
      fullWidth && styles.fullWidth,
    ];
    
    switch (variant) {
      case 'secondary':
        return [...base, { backgroundColor: theme.primaryBackground, borderWidth: 1, borderColor: theme.border }];
      case 'outline':
        return [...base, styles.outline, { borderColor: theme.primary }];
      case 'ghost':
        return [...base, styles.ghost];
      default:
        return base;
    }
  };
  
  const getTextStyle = () => {
    const base = [
      styles.text,
      size === 'sm' && styles.textSm,
      size === 'md' && styles.textMd,
      size === 'lg' && styles.textLg,
    ];
    
    switch (variant) {
      case 'primary':
        return [...base, { color: '#FFFFFF' }];
      case 'secondary':
      case 'outline':
      case 'ghost':
        return [...base, { color: theme.primary }];
      default:
        return base;
    }
  };
  
  const iconColor = variant === 'primary' ? '#FFFFFF' : theme.primary;
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 22 : 18;
  
  const content = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Ionicons name={icon} size={iconSize} color={iconColor} style={styles.iconLeft} />
          )}
          <Text style={getTextStyle()}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <Ionicons name={icon} size={iconSize} color={iconColor} style={styles.iconRight} />
          )}
        </>
      )}
    </View>
  );
  
  if (variant === 'primary') {
    return (
      <TouchableOpacity 
        onPress={onPress} 
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[
          styles.wrapper,
          fullWidth && styles.fullWidth,
          disabled && styles.disabledWrapper,
          style
        ]}
      >
        <LinearGradient
          colors={disabled ? [theme.disabled, theme.disabled] : theme.gradientPrimary}
          style={[getButtonStyle(), !disabled && SHADOWS.large]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }
  
  return (
    <TouchableOpacity 
      style={[getButtonStyle(), disabled && { opacity: 0.5 }, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  disabledWrapper: {
    opacity: 0.65,
  },
  base: {
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeSm: {
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.md,
  },
  sizeMd: {
    paddingVertical: SPACING.sm + 4,
    paddingHorizontal: SPACING.lg,
  },
  sizeLg: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  fullWidth: {
    width: '100%',
  },
  outline: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
  textSm: {
    fontSize: 14,
  },
  textMd: {
    fontSize: 16,
  },
  textLg: {
    fontSize: 18,
  },
  iconLeft: {
    marginRight: SPACING.xs,
  },
  iconRight: {
    marginLeft: SPACING.xs,
  },
});

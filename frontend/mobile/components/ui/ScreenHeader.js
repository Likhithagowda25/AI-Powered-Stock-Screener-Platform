import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, TYPOGRAPHY, RADIUS } from '../../constants/colors';

/**
 * ScreenHeader - Consistent header component for all screens
 * @param {string} title - Main title
 * @param {string} subtitle - Optional subtitle
 * @param {object} leftAction - { icon: string, onPress: function }
 * @param {object} rightAction - { icon: string, onPress: function }
 * @param {boolean} showGradient - Whether to show gradient background
 */
export default function ScreenHeader({ 
  title, 
  subtitle,
  leftAction,
  rightAction,
  showGradient = false,
}) {
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  
  const headerContent = (
    <View style={[styles.container, { paddingTop: insets.top + SPACING.sm }]}>
      <View style={styles.row}>
        {leftAction && (
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              { 
                backgroundColor: showGradient ? 'rgba(255,255,255,0.18)' : theme.surface,
                borderColor: showGradient ? 'rgba(255,255,255,0.22)' : theme.border,
                borderWidth: 1,
              }
            ]}
            onPress={leftAction.onPress}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={leftAction.icon} 
              size={22} 
              color={showGradient ? '#FFFFFF' : theme.textPrimary} 
            />
          </TouchableOpacity>
        )}
        
        <View style={[styles.titleContainer, !leftAction && styles.titleNoLeft]}>
          <Text style={[
            styles.title, 
            { color: showGradient ? '#FFFFFF' : theme.textPrimary }
          ]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[
              styles.subtitle, 
              { color: showGradient ? 'rgba(255,255,255,0.8)' : theme.textSecondary }
            ]}>
              {subtitle}
            </Text>
          )}
        </View>
        
        {rightAction ? (
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              { 
                backgroundColor: showGradient ? 'rgba(255,255,255,0.18)' : theme.primary,
                borderColor: showGradient ? 'rgba(255,255,255,0.22)' : theme.primaryDark,
                borderWidth: 1,
              }
            ]}
            onPress={rightAction.onPress}
            activeOpacity={0.7}
          >
            <Ionicons name={rightAction.icon} size={22} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={styles.actionPlaceholder} />
        )}
      </View>
    </View>
  );
  
  if (showGradient) {
    return (
      <>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient
          colors={theme.gradientHeader}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {headerContent}
        </LinearGradient>
      </>
    );
  }
  
  return (
    <>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={theme.surface} 
      />
      <View style={[styles.solidHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        {headerContent}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingBottom: SPACING.md,
  },
  solidHeader: {
    borderBottomWidth: 1,
    paddingBottom: SPACING.md,
  },
  container: {
    paddingHorizontal: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionPlaceholder: {
    width: 44,
  },
  titleContainer: {
    flex: 1,
  },
  titleNoLeft: {
    paddingLeft: 0,
  },
  title: {
    ...TYPOGRAPHY.h2,
    fontWeight: '700',
  },
  subtitle: {
    ...TYPOGRAPHY.bodySmall,
    marginTop: 2,
  },
});

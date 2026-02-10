/**
 * UNIFIED DESIGN SYSTEM
 * Premium stock trading app with consistent styling
 */
export const LIGHT_THEME = {
  // Background Colors
  background: '#F6F8FC',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  cardBackground: '#FFFFFF',
  surfaceTint: 'rgba(59, 130, 246, 0.08)',
  
  // Text Colors
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  
  // Primary Action Colors - Modern Blue
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDark: '#2563EB',
  primaryBackground: '#EFF6FF',
  primaryForeground: '#FFFFFF',
  
  // Financial Colors
  success: '#10B981',
  successLight: '#34D399',
  successBackground: '#ECFDF5',
  successForeground: '#052E22',
  
  warning: '#F59E0B',
  warningLight: '#FBBF24',
  warningBackground: '#FEF3C7',
  warningForeground: '#451A03',
  
  error: '#EF4444',
  errorLight: '#F87171',
  errorBackground: '#FEE2E2',
  errorForeground: '#450A0A',
  
  // Accent - Purple
  accent: '#8B5CF6',
  accentLight: '#A78BFA',
  accentBackground: '#F5F3FF',
  accentForeground: '#2E1065',
  
  // Neutral
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  disabled: '#CBD5E1',
  placeholder: '#94A3B8',
  scrim: 'rgba(15, 23, 42, 0.08)',
  
  // Special Cards
  infoBackground: '#DBEAFE',
  successCard: '#D1FAE5',
  warningCard: '#FDE68A',
  
  // Overlay
  overlay: 'rgba(255, 255, 255, 0.95)',
  backdropDim: 'rgba(0, 0, 0, 0.4)',
  
  // Gradients
  gradientPrimary: ['#2563EB', '#3B82F6'],
  gradientSuccess: ['#10B981', '#059669'],
  gradientAccent: ['#7C3AED', '#8B5CF6'],
  gradientBackground: ['#F6F8FC', '#EEF2FF'],
  gradientHeader: ['#1D4ED8', '#7C3AED'],
  gradientCard: ['#FFFFFF', '#F8FAFC'],
};

/**
 * DARK THEME - Premium Dark Mode
 */
export const DARK_THEME = {
  // Background Colors
  background: '#0B1220',
  surface: '#1E293B',
  surfaceElevated: '#334155',
  cardBackground: '#1E293B',
  surfaceTint: 'rgba(96, 165, 250, 0.10)',
  
  // Text Colors
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  
  // Primary Action Colors
  primary: '#60A5FA',
  primaryLight: '#93C5FD',
  primaryDark: '#3B82F6',
  primaryBackground: '#1E3A8A',
  primaryForeground: '#0B1220',
  
  // Financial Colors
  success: '#34D399',
  successLight: '#6EE7B7',
  successBackground: '#064E3B',
  successForeground: '#ECFDF5',
  
  warning: '#FBBF24',
  warningLight: '#FCD34D',
  warningBackground: '#78350F',
  warningForeground: '#FFFBEB',
  
  error: '#F87171',
  errorLight: '#FCA5A5',
  errorBackground: '#7F1D1D',
  errorForeground: '#FEF2F2',
  
  // Accent
  accent: '#A78BFA',
  accentLight: '#C4B5FD',
  accentBackground: '#4C1D95',
  accentForeground: '#F5F3FF',
  
  // Neutral
  border: '#334155',
  borderLight: '#475569',
  disabled: '#475569',
  placeholder: '#64748B',
  scrim: 'rgba(0, 0, 0, 0.35)',
  
  // Special Cards
  infoBackground: '#1E3A8A',
  successCard: '#064E3B',
  warningCard: '#78350F',
  
  // Overlay
  overlay: 'rgba(15, 23, 42, 0.95)',
  backdropDim: 'rgba(0, 0, 0, 0.6)',
  
  // Gradients
  gradientPrimary: ['#3B82F6', '#60A5FA'],
  gradientSuccess: ['#34D399', '#10B981'],
  gradientAccent: ['#8B5CF6', '#A78BFA'],
  gradientBackground: ['#0B1220', '#111C33'],
  gradientHeader: ['#1D4ED8', '#7C3AED'],
  gradientCard: ['#1E293B', '#334155'],
};

// Legacy export for backward compatibility
export const COLORS = LIGHT_THEME;

// Spacing system
export const SPACING = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Typography - Enhanced for better hierarchy
export const TYPOGRAPHY = {
  h1: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
};

// Border Radius - Consistent rounded corners
export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

// Shadows - Enhanced for premium feel
export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
};


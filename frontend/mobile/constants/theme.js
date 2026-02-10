// Shared theme constants for consistent dark mode styling
export const THEME = {
  // Background colors
  background: '#0a0a0f',
  surface: '#1a1a2e',
  surfaceLight: '#252542',
  card: '#1e1e32',
  
  // Text colors
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.5)',
  
  // Accent colors
  primary: '#8b5cf6',
  primaryLight: '#a855f7',
  primaryDark: '#6366f1',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',
  
  // Gradients
  gradientPrimary: ['#6366f1', '#8b5cf6'],
  gradientSecondary: ['#8b5cf6', '#a855f7'],
  
  // Borders
  border: 'rgba(255,255,255,0.1)',
  borderLight: 'rgba(255,255,255,0.15)',
  
  // Input
  inputBg: 'rgba(255,255,255,0.08)',
  inputBorder: 'rgba(255,255,255,0.15)',
  placeholder: 'rgba(255,255,255,0.4)',
};

export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  button: {
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
};

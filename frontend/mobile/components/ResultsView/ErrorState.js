import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, TYPOGRAPHY, RADIUS } from '../../constants/colors';

export default function ErrorState({ onRetry, showDetails = false, errorMessage = null }) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;

  const getUserFriendlyMessage = () => {
    if (!errorMessage) {
      return "We're having trouble loading the results right now.";
    }

    const lowerError = errorMessage.toLowerCase();
    
    // Query validation errors - show helpful examples
    if (lowerError.includes('could not understand') || 
        lowerError.includes('invalid query') ||
        lowerError.includes('parse')) {
      return "Please enter a valid screener query.\n\nExamples:\n• PE ratio less than 15\n• ROE greater than 20\n• Market cap above 10000";
    }
    
    // Network errors
    if (lowerError.includes('network') || lowerError.includes('timeout')) {
      return "Can't reach the server right now. Check your connection and try again.";
    }
    
    // Authentication errors
    if (lowerError.includes('401') || lowerError.includes('unauthorized')) {
      return "Your session has expired. Please log in again.";
    }
    
    // Data not found
    if (lowerError.includes('404') || lowerError.includes('not found')) {
      return "No stocks matched your criteria. Try adjusting your query.";
    }
    
    // Server errors
    if (lowerError.includes('500') || lowerError.includes('502') || lowerError.includes('503')) {
      return "Our servers are taking a quick break. Please try again in a moment.";
    }
    
    // Database errors
    if (lowerError.includes('database') || lowerError.includes('query')) {
      return "We had trouble running your search. Please try a different query.";
    }
    
    // Generic fallback
    return "An unexpected error occurred. Please try again.";
  };

  const getTitle = () => {
    if (!errorMessage) return "Unable to Load Results";
    
    const lowerError = errorMessage.toLowerCase();
    
    if (lowerError.includes('could not understand') || 
        lowerError.includes('invalid query')) {
      return "Invalid Query Format";
    }
    if (lowerError.includes('network') || lowerError.includes('timeout')) {
      return "Connection Error";
    }
    if (lowerError.includes('404') || lowerError.includes('not found')) {
      return "No Results Found";
    }
    
    return "Something Went Wrong";
  };

  return (
    <View style={styles.errorContainer}>
      <View style={[
        styles.iconCircle, 
        { backgroundColor: theme.error + '20' },
        isSmallScreen && styles.smallIconCircle
      ]}>
        <Ionicons 
          name="alert-circle-outline" 
          size={isSmallScreen ? 48 : 64} 
          color={theme.error} 
        />
      </View>
      
      <Text style={[
        styles.errorTitle, 
        { color: theme.textPrimary },
        isSmallScreen && styles.smallErrorTitle
      ]}>
        {getTitle()}
      </Text>
      
      <Text style={[
        styles.errorText, 
        { color: theme.textSecondary },
        isSmallScreen && styles.smallErrorText
      ]}>
        {getUserFriendlyMessage()}
      </Text>

      {showDetails && errorMessage && (
        <View style={[
          styles.detailsBox, 
          { backgroundColor: theme.surfaceElevated },
          isSmallScreen && styles.smallDetailsBox
        ]}>
          <Text style={[styles.detailsLabel, { color: theme.textSecondary }]}>
            Technical Details:
          </Text>
          <Text style={[styles.detailsText, { color: theme.textSecondary }]}>
            {errorMessage}
          </Text>
        </View>
      )}

      {onRetry && (
        <TouchableOpacity
          style={[
            styles.retryButton, 
            { backgroundColor: theme.primary },
            isSmallScreen && styles.smallRetryButton
          ]}
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-outline" size={isSmallScreen ? 18 : 20} color="#FFFFFF" />
          <Text style={[
            styles.retryButtonText,
            isSmallScreen && styles.smallRetryButtonText
          ]}>
            Try Again
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  smallIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  errorTitle: {
    ...TYPOGRAPHY.h2,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  smallErrorTitle: {
    fontSize: 22,
  },
  errorText: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.lg,
  },
  smallErrorText: {
    fontSize: 14,
    lineHeight: 20,
  },
  detailsBox: {
    width: '100%',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
  },
  smallDetailsBox: {
    padding: SPACING.sm,
  },
  detailsLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  detailsText: {
    ...TYPOGRAPHY.caption,
    lineHeight: 18,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.full,
  },
  smallRetryButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  retryButtonText: {
    ...TYPOGRAPHY.body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  smallRetryButtonText: {
    fontSize: 14,
  },
});

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useSavedResults } from '../../context/SavedResultsContext';
import { exportToCSV, shareResultsSummary } from '../../services/exportUtils';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../constants/colors';

export default function ResultsActionBar({ 
  results = [], 
  query = '',
  matchedConditions = {},
  metadata = {},
  onSaveSuccess,
}) {
  const { theme, isDarkMode } = useTheme();
  const { saveResult, savedCount, maxSaved } = useSavedResults();
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleExportCSV = async () => {
    if (results.length === 0) {
      Alert.alert('No Results', 'There are no results to export.');
      return;
    }

    setIsExporting(true);
    try {
      await exportToCSV(results, 'screener_results', query);
      // Success handled by share dialog
    } catch (error) {
      Alert.alert('Export Failed', error.message || 'Unable to export results.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    if (results.length === 0) {
      Alert.alert('No Results', 'There are no results to share.');
      return;
    }

    setIsSharing(true);
    try {
      await shareResultsSummary(results, query);
    } catch (error) {
      Alert.alert('Share Failed', error.message || 'Unable to share results.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleSave = () => {
    if (results.length === 0) {
      Alert.alert('No Results', 'There are no results to save.');
      return;
    }

    if (savedCount >= maxSaved) {
      Alert.alert(
        'Save Limit Reached',
        `You can only save up to ${maxSaved} results. Please remove an older saved result first.`
      );
      return;
    }

    setIsSaving(true);
    try {
      const savedId = saveResult({
        query,
        results,
        matchedConditions,
        metadata,
      });

      Alert.alert('Saved', 'Results have been saved to your history.');
      onSaveSuccess?.(savedId);
    } catch (error) {
      Alert.alert('Save Failed', error.message || 'Unable to save results.');
    } finally {
      setIsSaving(false);
    }
  };

  const ActionButton = ({ icon, label, onPress, isLoading, disabled }) => (
    <TouchableOpacity
      style={[
        styles.actionButton,
        { backgroundColor: isDarkMode ? theme.surface : '#f8fafc' },
        disabled && styles.disabledButton,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={isLoading || disabled}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={theme.primary} />
      ) : (
        <Ionicons 
          name={icon} 
          size={20} 
          color={disabled ? theme.textTertiary : theme.primary} 
        />
      )}
      <Text 
        style={[
          styles.actionLabel, 
          { color: disabled ? theme.textTertiary : theme.textPrimary }
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.bar, { borderColor: theme.border }]}>
        <ActionButton
          icon="download-outline"
          label="Export"
          onPress={handleExportCSV}
          isLoading={isExporting}
          disabled={results.length === 0}
        />
        <ActionButton
          icon="share-outline"
          label="Share"
          onPress={handleShare}
          isLoading={isSharing}
          disabled={results.length === 0}
        />
        <ActionButton
          icon="bookmark-outline"
          label="Save"
          onPress={handleSave}
          isLoading={isSaving}
          disabled={results.length === 0 || savedCount >= maxSaved}
        />
      </View>
      {savedCount > 0 && (
        <Text style={[styles.savedInfo, { color: theme.textTertiary }]}>
          {savedCount}/{maxSaved} saved
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.xs,
    gap: SPACING.xs,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionLabel: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
  },
  savedInfo: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
});

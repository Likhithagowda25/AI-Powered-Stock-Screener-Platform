import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { runScreener } from '../services/api';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../constants/colors';
import ScreenHeader from '../components/ui/ScreenHeader';
import Button from '../components/ui/Button';

export default function ScreenerQueryScreen() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigation = useNavigation();
  const { theme, isDarkMode } = useTheme();

  const handleRunScreener = async () => {
    if (!query.trim()) {
      setError('Please enter a screener query');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await runScreener(query);
      console.log('[ScreenerQueryScreen] Response received:', JSON.stringify(response, null, 2));
      console.log('[ScreenerQueryScreen] Results count:', response.results?.length);
      setLoading(false);
      
      navigation.navigate('Results', { 
        results: response.results,
        count: response.count,
        query, 
        isLoading: false, 
        error: null,
        executionTime: response.execution?.executionTime,
        metadata: response.metadata,
        matchedConditions: response.matchedConditions || {},
        showMatchedBadge: true,
      });
    } catch (err) {
      setLoading(false);
      const errorMessage = err.message || 'An unexpected error occurred';
      navigation.navigate('Results', { 
        results: [], 
        count: 0,
        query, 
        isLoading: false, 
        error: errorMessage 
      });
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenHeader
        title="Stock Screener"
        subtitle="Find stocks that match your criteria"
        showGradient
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Query Input Card */}
        <View style={[styles.queryCard, { backgroundColor: theme.surface }, SHADOWS.medium]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Your Query
          </Text>
          
          <View style={[
            styles.inputWrapper,
            { backgroundColor: theme.background, borderColor: error ? theme.error : theme.border }
          ]}>
            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              placeholder="e.g., Show me stocks with PE less than 20 and ROE above 15%"
              placeholderTextColor={theme.placeholder}
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                if (error) setError('');
              }}
              multiline
              numberOfLines={4}
            />
          </View>

          {error ? (
            <View style={[styles.errorContainer, { backgroundColor: theme.errorBackground }]}>
              <Ionicons name="alert-circle" size={18} color={theme.error} />
              <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
            </View>
          ) : null}

          <Button
            title={loading ? "Analyzing..." : "Run Screener"}
            onPress={handleRunScreener}
            loading={loading}
            disabled={loading}
            icon="search"
            fullWidth
            size="lg"
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  queryCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h4,
    marginBottom: SPACING.md,
  },
  inputWrapper: {
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  input: {
    ...TYPOGRAPHY.body,
    padding: SPACING.md,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  errorText: {
    ...TYPOGRAPHY.bodySmall,
    flex: 1,
  },
  submitButton: {
    marginTop: SPACING.md,
  },
});
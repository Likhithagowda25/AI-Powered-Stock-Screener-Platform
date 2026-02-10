import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../constants/colors';
import { StockCard, EmptyState, LoadingState, ErrorState, ResultsActionBar } from '../components/ResultsView';
import ScreenHeader from '../components/ui/ScreenHeader';
import Button from '../components/ui/Button';

export default function ResultsScreen({ route, navigation }) {
  const { 
    results = [], 
    query, 
    isLoading = false, 
    error = null,
    matchedConditions = {},  // Object mapping ticker to array of conditions
    showMatchedBadge = true,
    metadata = {},
  } = route.params || {};
  const { theme } = useTheme();

  // Debug logging
  console.log('[ResultsScreen] route.params:', JSON.stringify(route.params, null, 2));
  console.log('[ResultsScreen] results count:', results?.length);
  console.log('[ResultsScreen] isLoading:', isLoading);
  console.log('[ResultsScreen] error:', error);

  const getHighlightedFields = () => {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    const fields = [];
    
    if (lowerQuery.includes('pe') || lowerQuery.includes('p/e')) fields.push('pe_ratio');
    if (lowerQuery.includes('pb') || lowerQuery.includes('p/b')) fields.push('pb_ratio');
    if (lowerQuery.includes('roe')) fields.push('roe');
    if (lowerQuery.includes('roa')) fields.push('roa');
    if (lowerQuery.includes('market cap') || lowerQuery.includes('mcap')) fields.push('market_cap');
    if (lowerQuery.includes('revenue growth') || lowerQuery.includes('sales growth')) fields.push('revenue_growth_yoy');
    else if (lowerQuery.includes('revenue')) fields.push('revenue');
    if (lowerQuery.includes('eps')) fields.push('eps');
    if (lowerQuery.includes('margin')) fields.push('operating_margin');
    if (lowerQuery.includes('debt to equity') || lowerQuery.includes('d/e')) fields.push('debt_to_equity');
    if (lowerQuery.includes('ebitda margin')) fields.push('ebitda_margin');
    if (lowerQuery.includes('current ratio')) fields.push('current_ratio');
    
    return fields;
  };

  const highlightedFields = getHighlightedFields();

  const handleRetry = () => {
    navigation.goBack();
  };

  const handleStockPress = (stock) => {
    navigation.navigate('CompanyDetail', {
      company: stock,
      matchedConditions: matchedConditions[stock.ticker] || [],
      originalQuery: query,
    });
  };

  const renderStockCard = ({ item }) => {
    const itemConditions = matchedConditions[item.ticker] || [];
    return (
      <StockCard 
        item={item} 
        highlightedFields={highlightedFields}
        matchedConditions={itemConditions}
        showMatchedBadge={showMatchedBadge}
        onPress={() => handleStockPress(item)}
      />
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LoadingState />
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ErrorState 
          onRetry={handleRetry} 
          errorMessage={error}
          showDetails={false}
        />
      </View>
    );
  }

  // Empty state
  if (!results || results.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader 
          title="Screener Results"
          leftAction={{
            icon: 'arrow-back',
            onPress: () => navigation.goBack()
          }}
        />
        <EmptyState />
      </View>
    );
  }

  // Results state
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader 
        title="Screener Results"
        subtitle={`${results.length} ${results.length === 1 ? 'stock' : 'stocks'} found`}
        leftAction={{
          icon: 'arrow-back',
          onPress: () => navigation.goBack()
        }}
        rightAction={{
          icon: 'pencil-outline',
          onPress: () => navigation.goBack()
        }}
      />

      {/* Export/Save Action Bar */}
      <ResultsActionBar
        results={results}
        query={query}
        matchedConditions={matchedConditions}
        metadata={metadata}
      />

      <FlatList
        data={results}
        keyExtractor={(item, index) => item.ticker || index.toString()}
        renderItem={renderStockCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
});

import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../constants/colors';
import NoDataState from '../ui/NoDataState';

/**
 * NewsFeed - Display news and announcements for a stock
 */
export default function NewsFeed({ news = [], ticker }) {
  const { theme } = useTheme();

  const getNewsIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'earnings':
        return 'bar-chart';
      case 'buyback':
        return 'cart';
      case 'analyst':
        return 'analytics';
      case 'press':
      default:
        return 'newspaper';
    }
  };

  const getNewsColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'earnings':
        return theme.success;
      case 'buyback':
        return theme.primary;
      case 'analyst':
        return theme.warning;
      case 'press':
      default:
        return theme.textSecondary;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
  };

  const handleNewsPress = (item) => {
    if (item.url) {
      Linking.openURL(item.url);
    }
  };

  const renderNewsItem = ({ item }) => {
    const iconColor = getNewsColor(item.type);
    
    return (
      <TouchableOpacity 
        style={[styles.newsItem, { backgroundColor: theme.background, borderColor: theme.border }]}
        onPress={() => handleNewsPress(item)}
        activeOpacity={0.7}
        disabled={!item.url}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={getNewsIcon(item.type)} size={20} color={iconColor} />
        </View>
        
        <View style={styles.newsContent}>
          <Text style={[styles.newsTitle, { color: theme.textPrimary }]} numberOfLines={2}>
            {item.title}
          </Text>
          {item.summary && (
            <Text style={[styles.newsSummary, { color: theme.textSecondary }]} numberOfLines={2}>
              {item.summary}
            </Text>
          )}
          <View style={styles.newsFooter}>
            {item.source && (
              <Text style={[styles.newsSource, { color: theme.textTertiary }]}>{item.source}</Text>
            )}
            <Text style={[styles.newsDate, { color: theme.textTertiary }]}>{formatDate(item.date)}</Text>
          </View>
        </View>
        
        {item.url && (
          <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
        )}
      </TouchableOpacity>
    );
  };

  if (!news || news.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>News & Announcements</Text>
        <NoDataState
          title="No Recent News"
          message={`No news or announcements available for ${ticker || 'this stock'} at the moment.`}
          icon="newspaper-outline"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>News & Announcements</Text>
      
      <FlatList
        data={news.slice(0, 5)}
        renderItem={renderNewsItem}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: SPACING.xs }} />}
      />
      
      {news.length > 5 && (
        <TouchableOpacity style={[styles.viewMoreButton, { borderColor: theme.primary }]}>
          <Text style={[styles.viewMoreText, { color: theme.primary }]}>View All News</Text>
          <Ionicons name="arrow-forward" size={16} color={theme.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    ...SHADOWS.small,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h4,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  newsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  newsContent: {
    flex: 1,
  },
  newsTitle: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
  },
  newsSummary: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  newsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: SPACING.sm,
  },
  newsSource: {
    ...TYPOGRAPHY.caption,
    fontWeight: '500',
  },
  newsDate: {
    ...TYPOGRAPHY.caption,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    marginTop: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  viewMoreText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
  },
});

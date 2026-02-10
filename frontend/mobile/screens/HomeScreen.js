import React, { useState, useEffect, useCallback } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  StatusBar, 
  Dimensions, 
  ScrollView,
  TextInput,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../constants/colors';
import { fetchHomeScreenData } from '../services/api/homeApi';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

// Financial colors
const GAIN_COLOR = '#00C853';
const LOSS_COLOR = '#D50000';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [portfolio, setPortfolio] = useState(null);
  const [watchlistStats, setWatchlistStats] = useState({ count: 0, itemCount: 0 });
  const [alertStats, setAlertStats] = useState({ active: 0, triggered: 0, total: 0 });
  const [trendingStocks, setTrendingStocks] = useState([]);
  const [marketIndices, setMarketIndices] = useState([]);
  const [errors, setErrors] = useState({});

  // Load data on mount
  const loadData = useCallback(async (silent = false) => {
    if (!user?.userId) {
      console.log('No user ID available, skipping data load');
      setLoading(false);
      return;
    }
    
    console.log('Loading home data for user:', user.userId);
    
    try {
      const data = await fetchHomeScreenData(user.userId);
      
      console.log('Home data loaded:', data);
      
      if (data.portfolio) {
        console.log('Setting portfolio state:', data.portfolio.totalValue);
        console.log('Current portfolio state:', portfolio?.totalValue);
        setPortfolio(data.portfolio);
      } else if (data.errors?.portfolio) {
        console.error('Portfolio fetch error:', data.errors.portfolio);
      }
      
      if (data.watchlist) setWatchlistStats(data.watchlist);
      if (data.alerts) setAlertStats(data.alerts);
      if (data.trending) setTrendingStocks(data.trending);
      if (data.indices) setMarketIndices(data.indices);
      setErrors(data.errors || {});
      
      if (silent && data.portfolio) {
         // Optional: notify user of update
         // console.log('Dashboard refreshed silently');
      }
    } catch (error) {
      console.error('Failed to load home screen data:', error);
      setErrors({ general: error.message });
    } finally {
      if (!silent) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [user?.userId]);

  // Initial load
  useEffect(() => {
    loadData();
    
    // Refresh when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('HomeScreen gained focus, refreshing data...');
      if (user?.userId) {
        // Silent refresh to update portfolio/watchlist stats without showing loader
        loadData(true);
      }
    });

    return unsubscribe;
  }, [navigation, user?.userId, loadData]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Format currency
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format number with commas
  const formatNumber = (value) => {
    if (value === null || value === undefined) return '0';
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Handle AI Search
  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigation.navigate('ScreenerQuery', { query: searchQuery });
    } else {
      navigation.navigate('ScreenerQuery');
    }
  };

  // Get market status
  const getMarketStatus = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const day = now.getDay();
    
    // Indian market hours: 9:15 AM - 3:30 PM IST, Mon-Fri
    if (day === 0 || day === 6) {
      return { status: 'Closed', color: LOSS_COLOR, icon: 'moon-outline' };
    }
    
    const currentTime = hours * 60 + minutes;
    const marketOpen = 9 * 60 + 15; // 9:15 AM
    const marketClose = 15 * 60 + 30; // 3:30 PM
    
    if (currentTime >= marketOpen && currentTime <= marketClose) {
      return { status: 'Market Open', color: GAIN_COLOR, icon: 'pulse-outline' };
    } else if (currentTime < marketOpen) {
      return { status: 'Pre-Market', color: '#FFA726', icon: 'time-outline' };
    } else {
      return { status: 'Market Closed', color: LOSS_COLOR, icon: 'moon-outline' };
    }
  };

  const marketStatus = getMarketStatus();

  // Glassmorphism card wrapper
  const GlassCard = ({ children, style, gradient = false }) => {
    if (gradient) {
      return (
        <LinearGradient
          colors={isDarkMode ? ['#1a237e', '#4a148c'] : ['#1565c0', '#7b1fa2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.glassCard, style]}
        >
          {children}
        </LinearGradient>
      );
    }
    
    return (
      <View style={[
        styles.glassCard,
        { 
          backgroundColor: isDarkMode 
            ? 'rgba(30, 41, 59, 0.8)' 
            : 'rgba(255, 255, 255, 0.85)',
          borderColor: isDarkMode 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.05)',
        },
        style
      ]}>
        {children}
      </View>
    );
  };

  // Market Index Item
  const MarketIndexItem = ({ item }) => (
    <View style={styles.tickerItem}>
      <Text style={[styles.tickerSymbol, { color: theme.textSecondary }]}>
        {item.symbol}
      </Text>
      <Text style={[styles.tickerValue, { color: theme.textPrimary }]}>
        ₹{formatNumber(item.price)}
      </Text>
      <View style={[
        styles.tickerBadge, 
        { backgroundColor: item.isPositive ? `${GAIN_COLOR}20` : `${LOSS_COLOR}20` }
      ]}>
        <Text style={[
          styles.tickerChange,
          { color: item.isPositive ? GAIN_COLOR : LOSS_COLOR }
        ]}>
          {item.isPositive ? '+' : ''}{(parseFloat(item.changePercent) || 0).toFixed(2)}%
        </Text>
      </View>
    </View>
  );

  // Trending Stock Card
  const TrendingStockCard = ({ item }) => {
    // Safely handle missing data
    if (!item || !item.ticker) return null;
    
    const price = parseFloat(item.price) || 0;
    const change = parseFloat(item.change || item.changePercent) || 0;
    const isPositive = change >= 0;
    
    return (
      <TouchableOpacity 
        style={styles.trendingCard}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('CompanyDetail', { 
          symbol: item.ticker,
          company: {
            ticker: item.ticker,
            name: item.companyName || item.ticker,
            sector: item.sector,
            current_price: price
          }
        })}
      >
        <GlassCard style={styles.trendingCardInner}>
          <View style={[
            styles.stockIconWrapper,
            { backgroundColor: isPositive ? `${GAIN_COLOR}15` : `${LOSS_COLOR}15` }
          ]}>
            <Ionicons 
              name={isPositive ? 'trending-up' : 'trending-down'} 
              size={18} 
              color={isPositive ? GAIN_COLOR : LOSS_COLOR} 
            />
          </View>
          <Text style={[styles.trendingTicker, { color: theme.textPrimary }]} numberOfLines={1}>
            {item.ticker}
          </Text>
          <Text style={[styles.trendingPrice, { color: theme.textSecondary }]}>
            ₹{formatNumber(price)}
          </Text>
          <View style={[
            styles.trendingChangeBadge,
            { backgroundColor: isPositive ? `${GAIN_COLOR}15` : `${LOSS_COLOR}15` }
          ]}>
            <Text style={[
              styles.trendingChange,
              { color: isPositive ? GAIN_COLOR : LOSS_COLOR }
            ]}>
              {isPositive ? '+' : ''}{change.toFixed(2)}%
            </Text>
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  };

  // Loading skeleton
  const LoadingSkeleton = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
        Loading dashboard...
      </Text>
    </View>
  );

  // Empty state for trending stocks
  const EmptyTrendingState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="trending-up-outline" size={40} color={theme.textTertiary} />
      <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
        No trending stocks available
      </Text>
      <TouchableOpacity 
        style={[styles.emptyStateBtn, { backgroundColor: theme.primary }]}
        onPress={onRefresh}
      >
        <Text style={styles.emptyStateBtnText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar 
          barStyle={isDarkMode ? "light-content" : "dark-content"} 
          translucent 
          backgroundColor="transparent" 
        />
        <LoadingSkeleton />
      </View>
    );
  }

  // Debug: Log when main render is reached
  console.log('HomeScreen rendering main content, user:', user?.userId, 'loading:', loading);

  return (
    <View style={[styles.container, { backgroundColor: theme.background, minHeight: '100%' }]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        translucent 
        backgroundColor="transparent" 
      />
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[
          styles.scrollContent, 
          { paddingTop: insets.top + SPACING.md }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {/* SECTION 1: Header & Market Status */}
        <View style={styles.headerSection}>
          {/* Market Status Header */}
          <View style={styles.greetingRow}>
            <View>
              <View style={styles.marketStatusRow}>
                <View style={[styles.statusDot, { backgroundColor: marketStatus.color }]} />
                <Text style={[styles.marketStatusText, { color: marketStatus.color }]}>
                  {marketStatus.status}
                </Text>
              </View>
              <Text style={[styles.dateText, { color: theme.textSecondary }]}>
                {new Date().toLocaleDateString('en-IN', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'short',
                  year: 'numeric'
                })}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.notificationBtn, { backgroundColor: theme.surface }]}
              onPress={() => navigation.navigate('Alerts')}
            >
              <Ionicons name="notifications-outline" size={22} color={theme.textPrimary} />
              {alertStats.triggered > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {alertStats.triggered > 9 ? '9+' : alertStats.triggered}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Market Indices Row */}
          {marketIndices.length > 0 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.tickerRow}
              contentContainerStyle={styles.tickerRowContent}
            >
              {marketIndices.map((index, i) => (
                <MarketIndexItem key={i} item={index} />
              ))}
            </ScrollView>
          )}
        </View>

        {/* SECTION 2: Portfolio Summary Card (Hero) */}
        <View style={styles.portfolioSection}>
          <GlassCard gradient style={styles.portfolioCard}>
            <View style={styles.portfolioHeader}>
              <Text style={styles.portfolioLabel}>Portfolio Value</Text>
              <TouchableOpacity 
                style={styles.portfolioHeaderBtn}
                onPress={() => navigation.navigate('Portfolio')}
              >
                <Text style={styles.viewAllText}>
                  {portfolio && portfolio.totalValue > 0 ? 'View Details' : 'Get Started'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            </View>
            
            {portfolio && portfolio.totalValue > 0 ? (
              <>
                <Text style={styles.portfolioValue}>
                  {formatCurrency(portfolio.totalValue)}
                </Text>
                
                <View style={styles.portfolioGainRow}>
                  <View style={[
                    styles.gainBadge,
                    { backgroundColor: portfolio.isPositive ? 'rgba(0,200,83,0.35)' : 'rgba(255,255,255,0.95)' }
                  ]}>
                    <Ionicons 
                      name={portfolio.isPositive ? 'arrow-up' : 'arrow-down'} 
                      size={14} 
                      color={portfolio.isPositive ? GAIN_COLOR : LOSS_COLOR} 
                    />
                    <Text style={[
                      styles.gainText,
                      { color: portfolio.isPositive ? '#fff' : LOSS_COLOR }
                    ]}>
                      {portfolio.isPositive ? '+' : '-'}₹{formatNumber(Math.abs(portfolio.dayGain))}
                    </Text>
                    <Text style={[
                      styles.gainPercent,
                      { color: portfolio.isPositive ? '#fff' : LOSS_COLOR }
                    ]}>
                      ({portfolio.isPositive ? '+' : '-'}{(parseFloat(portfolio.dayGainPercent) || 0).toFixed(2)}%)
                    </Text>
                  </View>
                  <Text style={styles.gainLabel}>Overall P&L</Text>
                </View>
              </>
            ) : (
              <View style={styles.emptyPortfolio}>
                <Ionicons name="briefcase-outline" size={40} color="rgba(255,255,255,0.5)" />
                <Text style={styles.emptyPortfolioText}>
                  No holdings yet
                </Text>
                <Text style={styles.emptyPortfolioSubtext}>
                  Start tracking your investments
                </Text>
              </View>
            )}

            {/* Quick Stats Row */}
            <View style={styles.quickStatsRow}>
              <TouchableOpacity 
                style={styles.quickStat}
                onPress={() => navigation.navigate('Watchlist')}
              >
                <Ionicons name="eye-outline" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.quickStatText}>
                  {watchlistStats.itemCount || 0} Watching
                </Text>
              </TouchableOpacity>
              <View style={styles.quickStatDivider} />
              <TouchableOpacity 
                style={styles.quickStat}
                onPress={() => navigation.navigate('Portfolio')}
              >
                <Ionicons name="briefcase-outline" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.quickStatText}>
                  {portfolio?.totalHoldings || 0} Holdings
                </Text>
              </TouchableOpacity>
              <View style={styles.quickStatDivider} />
              <TouchableOpacity 
                style={styles.quickStat}
                onPress={() => navigation.navigate('Alerts')}
              >
                <Ionicons name="notifications-outline" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.quickStatText}>
                  {alertStats.active || 0} Alerts
                </Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>

        {/* SECTION 3: AI Search Center */}
        <View style={styles.searchSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Stock Screener
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                Ask your queries
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={() => navigation.navigate('ScreenerQuery')}
          >
            <GlassCard style={styles.searchCard}>
              <View style={styles.searchInputWrapper}>
                <Ionicons 
                  name="search-outline" 
                  size={20} 
                  color={theme.primary} 
                  style={styles.searchIcon}
                />
                <TextInput
                  style={[styles.searchInput, { color: theme.textPrimary }]}
                  placeholder="Try: 'High growth IT stocks under ₹1000'"
                  placeholderTextColor={theme.placeholder}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                />
                <TouchableOpacity 
                  style={[styles.micButton, { backgroundColor: theme.primaryBackground }]}
                  onPress={() => navigation.navigate('ScreenerQuery')}
                >
                  <Ionicons name="arrow-forward" size={20} color={theme.primary} />
                </TouchableOpacity>
              </View>
              
              {/* Quick Suggestion Chips */}
              <View style={styles.suggestionsRow}>
                {[
                  { label: 'Top Gainers', query: 'top gainers today' },
                  { label: 'Dividend Stocks', query: 'high dividend yield stocks' },
                  { label: 'Low PE', query: 'stocks with PE less than 15' },
                  { label: 'Large Cap', query: 'large cap stocks' },
                ].map((chip, i) => (
                  <TouchableOpacity 
                    key={i}
                    style={[styles.suggestionChip, { backgroundColor: theme.surfaceTint }]}
                    onPress={() => navigation.navigate('ScreenerQuery', { query: chip.query })}
                  >
                    <Text style={[styles.suggestionText, { color: theme.primary }]}>
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </GlassCard>
          </TouchableOpacity>
        </View>

        {/* SECTION 4: Top Gainers */}
        <View style={styles.trendingSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Top Gainers
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                Best performers today
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.seeAllBtn}
              onPress={() => navigation.navigate('Results', { query: 'stocks with ROE above 15', results: trendingStocks })}
            >
              <Text style={[styles.seeAllText, { color: theme.primary }]}>See All</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {trendingStocks.length > 0 ? (
            <FlatList
              horizontal
              data={trendingStocks}
              renderItem={({ item }) => <TrendingStockCard item={item} />}
              keyExtractor={(item) => item.ticker}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trendingList}
            />
          ) : (
            <EmptyTrendingState />
          )}
        </View>

        {/* Quick Actions Row */}
        <View style={styles.quickActionsSection}>
          <TouchableOpacity 
            style={[styles.quickActionBtn, { backgroundColor: theme.surface }]}
            onPress={() => navigation.navigate('Watchlist')}
          >
            <LinearGradient
              colors={theme.gradientAccent}
              style={styles.quickActionIcon}
            >
              <Ionicons name="eye-outline" size={20} color="#fff" />
            </LinearGradient>
            <Text style={[styles.quickActionText, { color: theme.textPrimary }]}>
              Watchlist
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickActionBtn, { backgroundColor: theme.surface }]}
            onPress={() => navigation.navigate('Portfolio')}
          >
            <LinearGradient
              colors={theme.gradientSuccess}
              style={styles.quickActionIcon}
            >
              <Ionicons name="briefcase-outline" size={20} color="#fff" />
            </LinearGradient>
            <Text style={[styles.quickActionText, { color: theme.textPrimary }]}>
              Portfolio
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickActionBtn, { backgroundColor: theme.surface }]}
            onPress={() => navigation.navigate('Alerts')}
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.quickActionIcon}
            >
              <Ionicons name="notifications-outline" size={20} color="#fff" />
            </LinearGradient>
            <Text style={[styles.quickActionText, { color: theme.textPrimary }]}>
              Alerts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickActionBtn, { backgroundColor: theme.surface }]}
            onPress={() => navigation.navigate('ScreenerQuery')}
          >
            <LinearGradient
              colors={theme.gradientPrimary}
              style={styles.quickActionIcon}
            >
              <Ionicons name="search-outline" size={20} color="#fff" />
            </LinearGradient>
            <Text style={[styles.quickActionText, { color: theme.textPrimary }]}>
              Screener
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Padding */}
        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </View>
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
    paddingBottom: SPACING.xxl,
  },

  // SECTION 1: Header & Market Pulse
  headerSection: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  marketStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xxs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.xs,
  },
  marketStatusText: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 14,
    marginTop: SPACING.xxs,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: LOSS_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  tickerRow: {
    marginTop: SPACING.xs,
  },
  tickerRowContent: {
    paddingRight: SPACING.md,
  },
  tickerItem: {
    marginRight: SPACING.md,
    alignItems: 'flex-start',
  },
  tickerSymbol: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  tickerValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  tickerBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  tickerChange: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Glass Card Base
  glassCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    ...SHADOWS.medium,
  },

  // SECTION 2: Portfolio Summary
  portfolioSection: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  portfolioCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  portfolioHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginRight: 4,
  },
  portfolioLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  portfolioValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: SPACING.sm,
  },
  emptyPortfolio: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  emptyPortfolioText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: SPACING.sm,
  },
  emptyPortfolioSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: SPACING.xxs,
  },
  portfolioGainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  gainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    marginRight: SPACING.sm,
  },
  gainText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 4,
  },
  gainPercent: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  gainLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  quickStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  quickStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickStatText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: SPACING.xs,
    fontWeight: '500',
  },
  quickStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  // SECTION 3: AI Search
  searchSection: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.xxs,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: SPACING.md,
  },
  searchCard: {
    padding: SPACING.md,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: SPACING.sm,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionsRow: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  suggestionChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // SECTION 4: Trending
  trendingSection: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  trendingList: {
    paddingHorizontal: SPACING.md,
  },
  trendingCard: {
    marginRight: SPACING.md,
  },
  trendingCardInner: {
    padding: SPACING.md,
    width: 130,
    alignItems: 'center',
  },
  stockIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  trendingTicker: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: SPACING.xxs,
  },
  trendingPrice: {
    fontSize: 13,
    marginBottom: SPACING.sm,
  },
  trendingChangeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xxs,
    borderRadius: RADIUS.sm,
  },
  trendingChange: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Quick Actions
  quickActionsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  quickActionBtn: {
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    flex: 1,
    marginHorizontal: SPACING.xxs,
    ...SHADOWS.small,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  emptyStateText: {
    marginTop: SPACING.sm,
    fontSize: 14,
    textAlign: 'center',
  },
  emptyStateBtn: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  emptyStateBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

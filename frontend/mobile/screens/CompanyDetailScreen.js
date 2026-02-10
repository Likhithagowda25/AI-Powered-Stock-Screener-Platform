import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../constants/colors';
import LoadingOverlay from '../components/ui/LoadingOverlay';
import NoDataState from '../components/ui/NoDataState';
import { 
  MetricsSection,
  TrendIndicator,
  MatchedConditions,
  DerivedMetricsCard,
  StockPriceCard,
  HistoricalCharts,
  NewsFeed,
  CompanyActions,
} from '../components/CompanyDetail';
import { useAuth } from '../context/AuthContext';

import { API_BASE_URL } from '../services/api/config';

const API_BASE = API_BASE_URL;

export default function CompanyDetailScreen({ route, navigation }) {
  const { company: routeCompany, matchedConditions = [], queryContext = {} } = route.params || {};
  const { theme } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [historicalData, setHistoricalData] = useState(null);
  const [newsData, setNewsData] = useState([]);
  const [error, setError] = useState(null);
  const [company, setCompany] = useState(routeCompany);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isInPortfolio, setIsInPortfolio] = useState(false);

  // Extract quarterly and TTM data from company
  const quarterlyMetrics = {
    revenue: company?.revenue,
    ebitda: company?.ebitda,
    netIncome: company?.net_income || company?.net_profit,
    eps: company?.eps,
    freeCashFlow: company?.free_cash_flow || company?.fcf,
    totalDebt: company?.total_debt || company?.debt,
  };

  const ttmMetrics = {
    revenue: company?.revenue_ttm || company?.revenue,
    eps: company?.eps_ttm || company?.eps,
    ebitda: company?.ebitda_ttm || company?.ebitda,
    fcf: company?.fcf_ttm || company?.free_cash_flow,
    peRatio: company?.pe_ratio,
    pegRatio: company?.peg_ratio,
    debtToFcf: company?.debt_to_fcf,
  };

  const trendIndicators = {
    revenueGrowth: company?.revenue_growth_yoy,
    epsGrowth: company?.eps_growth,
    qoqGrowth: company?.qoq_growth,
    earningsConsistency: company?.earnings_consistency_score,
    profitTrend: company?.profit_trend,
  };

  useEffect(() => {
    if (routeCompany?.ticker || routeCompany?.symbol) {
      fetchAllData();
    }
  }, [routeCompany?.ticker, routeCompany?.symbol]);

  const fetchAllData = async () => {
    const ticker = routeCompany?.ticker || routeCompany?.symbol;
    if (!ticker) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch company metadata, quote, price history, fundamentals, and news in parallel
      const [metadataResponse, quoteResponse, priceResponse, fundamentalsResponse, newsResponse] = await Promise.all([
        fetch(`${API_BASE}/company/${ticker}/metadata`),
        fetch(`${API_BASE}/company/${ticker}/quote`),
        fetch(`${API_BASE}/company/${ticker}/price-history?days=365`),
        fetch(`${API_BASE}/company/${ticker}/fundamentals-history`),
        fetch(`${API_BASE}/company/${ticker}/news?limit=20`)
      ]);
      
      const metadataData = await metadataResponse.json();
      const quoteData = await quoteResponse.json();
      const priceData = await priceResponse.json();
      const fundamentalsData = await fundamentalsResponse.json();
      const newsDataResult = await newsResponse.json();
      
      console.log('Company metadata:', metadataData);
      console.log('Company quote:', quoteData);
      
      // Merge route company with fetched data
      const enrichedCompany = {
        ...routeCompany,
        ...(metadataData.success ? metadataData.data : {}),
        ...(quoteData.success ? {
          current_price: quoteData.data?.price,
          previous_close: quoteData.data?.previousClose,
          day_high: quoteData.data?.high,
          day_low: quoteData.data?.low,
          volume: quoteData.data?.volume,
          change_percent: quoteData.data?.changePercent,
        } : {}),
      };
      
      console.log('Enriched company:', enrichedCompany);
      setCompany(enrichedCompany);
      
      // Set historical data for charts
      setHistoricalData({
        priceHistory: priceData.success ? priceData.data : [],
        revenueHistory: fundamentalsData.success ? fundamentalsData.data?.revenue : [],
        earningsHistory: fundamentalsData.success ? fundamentalsData.data?.earnings : [],
        debtFcfHistory: fundamentalsData.success ? fundamentalsData.data?.debtFcf : [],
        pegHistory: fundamentalsData.success ? fundamentalsData.data?.peg : [],
      });
      
      // Check if in watchlist or portfolio
      if (user?.userId) {
        checkWatchlistAndPortfolio(ticker);
      }
    } catch (err) {
      console.error('Error fetching company data:', err);
      setError('Failed to load company data');
      // Keep route company data on error
      setCompany(routeCompany);
      setHistoricalData({
        priceHistory: [],
        revenueHistory: [],
        earningsHistory: [],
        debtFcfHistory: [],
        pegHistory: [],
      });
      setNewsData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAdditionalData = async () => {
    // Deprecated - now using fetchAllData
    await fetchAllData();
  };

  const checkWatchlistAndPortfolio = async (ticker) => {
    if (!user?.userId) return;
    
    try {
      // Normalize ticker for check
      let normalizedTicker = ticker.toUpperCase().trim();
      if (!normalizedTicker.includes('.')) {
        normalizedTicker = normalizedTicker + '.NS';
      }

      // Check watchlist
      const watchlistRes = await fetch(`${API_BASE}/watchlists/check/${normalizedTicker}?user_id=${user.userId}`, {
        headers: { 'x-user-id': user.userId }
      });
      const watchlistData = await watchlistRes.json();
      if (watchlistData.success) {
        setIsInWatchlist(watchlistData.data?.inWatchlist || false);
      }

      // Check portfolio
      const portfolioRes = await fetch(`${API_BASE}/portfolios?user_id=${user.userId}`, {
        headers: { 'x-user-id': user.userId }
      });
      const portfolioData = await portfolioRes.json();
      if (portfolioData.success && portfolioData.data && portfolioData.data.length > 0) {
        const portfolioId = portfolioData.data[0].portfolio_id;
        const holdingsRes = await fetch(`${API_BASE}/portfolios/${portfolioId}/holdings?user_id=${user.userId}`, {
          headers: { 'x-user-id': user.userId }
        });
        const holdingsData = await holdingsRes.json();
        if (holdingsData.success && holdingsData.data) {
          const inPortfolio = holdingsData.data.some(h => 
            h.ticker.toUpperCase() === normalizedTicker || 
            h.ticker.toUpperCase() === ticker.toUpperCase()
          );
          setIsInPortfolio(inPortfolio);
        }
      }
    } catch (err) {
      console.error('Error checking watchlist/portfolio:', err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAllData();
    setIsRefreshing(false);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'analytics-outline' },
    { id: 'quarterly', label: 'Quarterly', icon: 'calendar-outline' },
    { id: 'ttm', label: 'TTM', icon: 'time-outline' },
    { id: 'charts', label: 'Charts', icon: 'bar-chart-outline' },
    { id: 'news', label: 'News', icon: 'newspaper-outline' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <View style={styles.tabContent}>
            {/* Stock Price Card */}
            <StockPriceCard
              currentPrice={company?.current_price || company?.close}
              previousClose={company?.previous_close}
              dayHigh={company?.day_high}
              dayLow={company?.day_low}
              volume={company?.volume}
              marketCap={company?.market_cap}
            />

            {/* Why This Stock Matched */}
            {matchedConditions.length > 0 && (
              <MatchedConditions 
                conditions={matchedConditions} 
                queryContext={queryContext}
              />
            )}
            
            {/* Key Metrics Summary */}
            <View style={[styles.section, { backgroundColor: theme.cardBackground || theme.surface }]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Key Metrics
              </Text>
              <View style={styles.keyMetricsGrid}>
                <MetricItem 
                  label="P/E Ratio" 
                  value={company?.pe_ratio} 
                  format="ratio"
                  theme={theme}
                />
                <MetricItem 
                  label="PEG Ratio" 
                  value={company?.peg_ratio} 
                  format="ratio"
                  theme={theme}
                  isDerived
                />
                <MetricItem 
                  label="ROE" 
                  value={company?.roe} 
                  format="percent"
                  theme={theme}
                />
                <MetricItem 
                  label="ROCE" 
                  value={company?.roce} 
                  format="percent"
                  theme={theme}
                />
                <MetricItem 
                  label="Market Cap" 
                  value={company?.market_cap} 
                  format="currency"
                  unit="Cr"
                  theme={theme}
                />
                <MetricItem 
                  label="Debt/FCF" 
                  value={company?.debt_to_fcf} 
                  format="ratio"
                  theme={theme}
                  isDerived
                />
              </View>
            </View>

            {/* Derived Metrics Card */}
            <DerivedMetricsCard 
              pegRatio={company?.peg_ratio}
              debtToFcf={company?.debt_to_fcf}
              fcfMargin={company?.fcf_margin}
              epsGrowth={company?.eps_growth}
            />

            {/* Company Actions */}
            <CompanyActions
              ticker={company?.ticker || company?.symbol}
              companyName={company?.name}
              currentPrice={company?.current_price || company?.close}
              isInWatchlist={isInWatchlist}
              isInPortfolio={isInPortfolio}
              onWatchlistAdd={() => setIsInWatchlist(true)}
              onPortfolioAdd={() => setIsInPortfolio(true)}
            />
          </View>
        );

      case 'quarterly':
        return (
          <MetricsSection 
            title="Quarterly Metrics"
            metrics={quarterlyMetrics}
            type="quarterly"
          />
        );

      case 'ttm':
        return (
          <MetricsSection 
            title="Trailing Twelve Months (TTM)"
            metrics={ttmMetrics}
            type="ttm"
          />
        );

      case 'charts':
        return (
          <View style={styles.tabContent}>
            <HistoricalCharts
              priceHistory={historicalData?.priceHistory}
              revenueHistory={historicalData?.revenueHistory}
              earningsHistory={historicalData?.earningsHistory}
              debtFcfHistory={historicalData?.debtFcfHistory}
              pegHistory={historicalData?.pegHistory}
            />

            {/* Trend Indicators */}
            <View style={[styles.section, { backgroundColor: theme.cardBackground || theme.surface }]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Growth & Trend Indicators
              </Text>
              
              <TrendIndicator 
                label="Revenue Growth (YoY)"
                value={trendIndicators.revenueGrowth}
                type="growth"
              />
              <TrendIndicator 
                label="EPS Growth"
                value={trendIndicators.epsGrowth}
                type="growth"
              />
              <TrendIndicator 
                label="QoQ Growth"
                value={trendIndicators.qoqGrowth}
                type="growth"
              />
              <TrendIndicator 
                label="Earnings Consistency"
                value={trendIndicators.earningsConsistency}
                type="score"
              />
            </View>
          </View>
        );

      case 'news':
        return (
          <View style={styles.tabContent}>
            <NewsFeed 
              news={newsData}
              ticker={company?.ticker || company?.symbol}
            />

            {/* Time Window Context */}
            {queryContext?.timeWindow && (
              <View style={[styles.section, { backgroundColor: theme.cardBackground || theme.surface }]}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                  Time Window Analysis
                </Text>
                <Text style={[styles.timeWindowText, { color: theme.textSecondary }]}>
                  {queryContext.timeWindow}
                </Text>
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return <LoadingOverlay message="Loading company data..." />;
  }

  if (!company) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <NoDataState
          title="Company Data Not Available"
          message="Unable to load details for this company. Please try again."
          icon="alert-circle-outline"
          onRetry={() => navigation.goBack()}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.cardBackground || theme.surface }]}>
        <TouchableOpacity 
          style={styles.backIcon}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={[styles.ticker, { color: theme.primary }]}>
            {company.ticker || company.symbol}
          </Text>
          <Text style={[styles.companyName, { color: theme.textSecondary }]} numberOfLines={1}>
            {company.name || (isLoading ? 'Loading...' : 'Company Name')}
          </Text>
          {company.sector && (
            <View style={[styles.sectorBadge, { backgroundColor: theme.primaryLight || (theme.primary + '20') }]}>
              <Text style={[styles.sectorText, { color: theme.primary }]}>
                {company.sector}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Tab Navigation */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={[styles.tabBar, { backgroundColor: theme.surface }]}
        contentContainerStyle={styles.tabBarContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && { borderBottomColor: theme.primary, borderBottomWidth: 2 }
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons 
              name={tab.icon} 
              size={18} 
              color={activeTab === tab.id ? theme.primary : theme.textSecondary} 
            />
            <Text style={[
              styles.tabLabel,
              { color: activeTab === tab.id ? theme.primary : theme.textSecondary }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
      >
        {renderTabContent()}
      </ScrollView>
    </View>
  );
}

// Helper component for key metrics
function MetricItem({ label, value, format, unit = '', theme, isDerived = false }) {
  const formatValue = (val) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    const num = Number(val);
    switch (format) {
      case 'ratio':
        return num.toFixed(2);
      case 'percent':
        return `${num.toFixed(2)}%`;
      case 'currency':
        if (num >= 10000) return `${(num / 1000).toFixed(1)}K`;
        if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
        return num.toFixed(2);
      default:
        return num.toFixed(2);
    }
  };

  return (
    <View style={styles.metricItem}>
      <View style={styles.metricLabelRow}>
        <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
          {label}
        </Text>
        {isDerived && (
          <View style={[styles.derivedBadge, { backgroundColor: theme.primaryLight || (theme.primary + '20') }]}>
            <Text style={[styles.derivedText, { color: theme.primary }]}>Derived</Text>
          </View>
        )}
      </View>
      <Text style={[styles.metricValue, { color: theme.textPrimary }]}>
        {formatValue(value)}{unit && ` ${unit}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    paddingTop: SPACING.xl,
    ...SHADOWS.small,
  },
  backIcon: {
    padding: SPACING.xs,
    marginRight: SPACING.sm,
  },
  headerContent: {
    flex: 1,
  },
  ticker: {
    ...TYPOGRAPHY.h2,
    fontWeight: '700',
  },
  companyName: {
    ...TYPOGRAPHY.body,
    marginTop: 2,
  },
  sectorBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.xs,
  },
  sectorText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  tabBar: {
    ...SHADOWS.small,
    maxHeight: 50,
  },
  tabBarContent: {
    paddingHorizontal: SPACING.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    gap: 4,
  },
  tabLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  tabContent: {
    gap: SPACING.md,
  },
  section: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.small,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h4,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  keyMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  metricItem: {
    width: '48%',
    marginBottom: SPACING.sm,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  metricLabel: {
    ...TYPOGRAPHY.caption,
  },
  metricValue: {
    ...TYPOGRAPHY.h4,
    fontWeight: '600',
    marginTop: 2,
  },
  derivedBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  derivedText: {
    fontSize: 8,
    fontWeight: '600',
  },
  timeWindowText: {
    ...TYPOGRAPHY.body,
    fontStyle: 'italic',
  },
});

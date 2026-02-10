/**
 * Home Screen API Service
 * Aggregates data from multiple endpoints for the Home Screen dashboard
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';

const getUserId = async () => {
  return await AsyncStorage.getItem('userId');
};

/**
 * Get headers with user authentication
 */
const getHeaders = (userId) => ({
  'Content-Type': 'application/json',
  'X-User-ID': userId?.toString() || '',
});

/**
 * Fetch portfolio summary for the user
 * Returns aggregated portfolio data across all portfolios
 */
export const fetchPortfolioSummary = async (userId) => {
  if (!userId) return { totalValue: 0, totalInvested: 0, dayGain: 0, dayGainPercent: 0, totalHoldings: 0, isPositive: true };
  try {
    // First get all portfolios
    const portfoliosRes = await fetch(
      `${API_BASE_URL}/portfolios?user_id=${userId}&_t=${Date.now()}`,
      { headers: getHeaders(userId) }
    );
    
    if (!portfoliosRes.ok) {
      throw new Error('Failed to fetch portfolios');
    }
    
    const portfoliosData = await portfoliosRes.json();
    
    console.log('Portfolios API response:', portfoliosData);
    
    if (!portfoliosData.success || !portfoliosData.data?.length) {
      return {
        totalValue: 0,
        totalInvested: 0,
        dayGain: 0,
        dayGainPercent: 0,
        totalHoldings: 0,
        isPositive: true,
      };
    }
    
    // Get summary for the default/first portfolio
    // Aligning with PortfolioScreen and CompanyActions which use data[0]
    const defaultPortfolio = portfoliosData.data[0];
    
    console.log('Default portfolio:', defaultPortfolio);
    // Note: total_holdings from getUserPortfolios might be different from summary
    const holdingsFromList = parseInt(defaultPortfolio.total_holdings, 10) || 0;
    console.log('Holdings count from portfolio list:', holdingsFromList);
    
    const summaryRes = await fetch(
      `${API_BASE_URL}/portfolios/${defaultPortfolio.portfolio_id}/summary?user_id=${userId}&_t=${Date.now()}`,
      { headers: getHeaders(userId) }
    );
    
    if (!summaryRes.ok) {
      throw new Error('Failed to fetch portfolio summary');
    }
    
    const summaryData = await summaryRes.json();
    
    console.log('Portfolio summary API response:', summaryData);
    
    if (!summaryData.success) {
      throw new Error('Invalid portfolio summary response');
    }
    
    // Handle both { data: { summary: ... } } and { data: ... } structures
    const summary = summaryData.data?.summary || summaryData.data;
    
    if (!summary) {
       console.log('No summary data found');
       return { totalValue: 0, totalInvested: 0, dayGain: 0, dayGainPercent: 0, totalHoldings: 0, isPositive: true };
    }
    
    console.log('Summary total_holdings:', summary.total_holdings);
    
    return {
      totalValue: parseFloat(summary.total_current_value) || 0,
      totalInvested: parseFloat(summary.total_invested) || 0,
      dayGain: parseFloat(summary.total_gain_loss) || 0,
      dayGainPercent: parseFloat(summary.total_gain_loss_percent) || 0,
      totalHoldings: parseInt(summary.total_holdings, 10) || 0,
      isPositive: (parseFloat(summary.total_gain_loss) || 0) >= 0,
    };
  } catch (error) {
    console.error('Error fetching portfolio summary:', error);
    throw error;
  }
};

/**
 * Fetch watchlist count for the user
 */
export const fetchWatchlistCount = async (userId) => {
  if (!userId) return { count: 0, itemCount: 0 };
  try {
    const response = await fetch(
      `${API_BASE_URL}/watchlists?user_id=${userId}&_t=${Date.now()}`,
      { headers: getHeaders(userId) }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch watchlists');
    }
    
    const data = await response.json();
    
    console.log('Watchlist API response:', data);
    
    if (!data.success) {
      return { count: 0, itemCount: 0 };
    }
    
    // Sum up all items across watchlists - ensure we parse the value as integer
    const totalItems = data.data.reduce((sum, wl) => {
      const items = parseInt(wl.total_items, 10) || 0;
      console.log(`Watchlist "${wl.name}": ${items} items`);
      return sum + items;
    }, 0);
    
    console.log('Total watchlist items:', totalItems);
    
    return {
      count: data.count || 0,
      itemCount: totalItems,
    };
  } catch (error) {
    console.error('Error fetching watchlist count:', error);
    throw error;
  }
};

/**
 * Fetch alert summary for the user
 */
export const fetchAlertSummary = async (userId) => {
  if (!userId) return { totalAlerts: 0, activeAlerts: 0, recentNotifications: [] };
  try {
    const response = await fetch(
      `${API_BASE_URL}/alerts/summary?user_id=${userId}`,
      { headers: getHeaders(userId) }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch alert summary');
    }
    
    const data = await response.json();
    
    if (!data.success) {
      return { active: 0, triggered: 0, total: 0 };
    }
    
    return {
      active: data.data?.active || 0,
      triggered: data.data?.triggered_today || 0,
      total: data.data?.total || 0,
    };
  } catch (error) {
    console.error('Error fetching alert summary:', error);
    throw error;
  }
};

/**
 * Fetch trending/top moving stocks using the screener API
 */
export const fetchTrendingStocks = async (limit = 10) => {
  try {
    // Use screener with a valid filter query
    const response = await fetch(`${API_BASE_URL}/screener`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        query: 'stocks with market cap above 100000 crore',
        requestId: `trending_${Date.now()}`,
        timestamp: new Date().toISOString(),
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch trending stocks');
    }
    
    const data = await response.json();
    
    if (!data.success || !data.results?.length) {
      return [];
    }
    
    return data.results.slice(0, limit).map(stock => ({
      ticker: stock.ticker,
      companyName: stock.company_name || stock.name,
      price: stock.current_price || stock.close || stock.price || 0,
      change: stock.revenue_growth_yoy || 0,
      isPositive: (stock.revenue_growth_yoy || 0) >= 0,
      sector: stock.sector,
    }));
  } catch (error) {
    console.error('Error fetching trending stocks:', error);
    throw error;
  }
};

/**
 * Fetch top gainers - large cap stocks with good fundamentals
 */
/**
 * Fetch top gainers using market data endpoint
 */
export const fetchTopGainers = async (limit = 6) => {
  try {
    const response = await fetch(`${API_BASE_URL}/market/top-gainers?limit=${limit}`, {
      headers: getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch top gainers');
    }
    
    const data = await response.json();
    
    if (!data.success || !data.results) {
      return [];
    }
    
    return data.results.map(stock => ({
      ticker: stock.ticker,
      companyName: stock.companyName,
      price: stock.price,
      change: stock.change,
      isPositive: stock.isPositive,
      sector: stock.sector,
    }));
  } catch (error) {
    console.error('Error fetching top gainers:', error);
    // Fallback or empty
    return [];
  }
};

/**
 * Fetch top losers using market data endpoint
 */
export const fetchTopLosers = async (limit = 6) => {
  try {
    const response = await fetch(`${API_BASE_URL}/market/top-losers?limit=${limit}`, {
      headers: getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch top losers');
    }
    
    const data = await response.json();
    
    if (!data.success || !data.results) {
      return [];
    }
    
    return data.results.map(stock => ({
      ticker: stock.ticker,
      companyName: stock.companyName,
      price: stock.price,
      change: stock.change,
      isPositive: stock.isPositive,
      sector: stock.sector, 
    }));
  } catch (error) {
    console.error('Error fetching top losers:', error);
    return [];
  }
};

/**
 * Fetch real-time quote for a stock
 */
export const fetchStockQuote = async (ticker) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/company/${ticker}/quote`,
      { headers: getHeaders() }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch quote for ${ticker}`);
    }
    
    const data = await response.json();
    
    if (!data.success || !data.data) {
      return null;
    }
    
    return {
      ticker: data.data.ticker,
      price: data.data.price,
      change: data.data.change,
      changePercent: data.data.changePercent,
      isPositive: data.data.change >= 0,
    };
  } catch (error) {
    console.error(`Error fetching quote for ${ticker}:`, error);
    throw error;
  }
};

/**
 * Fetch multiple stock quotes (for market indices simulation)
 * Note: In production, use a dedicated market data API for indices
 */
export const fetchMarketIndices = async () => {
  // For market indices, we'd typically use a market data provider
  // For now, use major Indian stocks as proxies for market sentiment
  const indexProxies = [
    { symbol: 'NIFTY50', ticker: 'RELIANCE' }, // Using major stocks as proxy
    { symbol: 'SENSEX', ticker: 'TCS' },
    { symbol: 'BANKNIFTY', ticker: 'HDFCBANK' },
  ];
  
  try {
    const quotes = await Promise.all(
      indexProxies.map(async (index) => {
        try {
          const quote = await fetchStockQuote(index.ticker);
          return quote ? {
            symbol: index.symbol,
            proxyTicker: index.ticker,
            ...quote,
          } : null;
        } catch {
          return null;
        }
      })
    );
    
    return quotes.filter(Boolean);
  } catch (error) {
    console.error('Error fetching market indices:', error);
    return [];
  }
};

/**
 * Fetch all home screen data in one call
 */
export const fetchHomeScreenData = async (userId) => {
  if (!userId) return { portfolioSummary: null, watchlistData: null, alertData: null, trendingStocks: [], marketMovers: [], sectorPerformance: [] };
  try {
    const [portfolio, watchlist, alerts, trending, indices] = await Promise.allSettled([
      fetchPortfolioSummary(userId),
      fetchWatchlistCount(userId),
      fetchAlertSummary(userId),
      fetchTopGainers(6),
      fetchMarketIndices(),
    ]);
    
    return {
      portfolio: portfolio.status === 'fulfilled' ? portfolio.value : null,
      watchlist: watchlist.status === 'fulfilled' ? watchlist.value : { count: 0, itemCount: 0 },
      alerts: alerts.status === 'fulfilled' ? alerts.value : { active: 0, triggered: 0, total: 0 },
      trending: trending.status === 'fulfilled' ? trending.value : [],
      indices: indices.status === 'fulfilled' ? indices.value : [],
      errors: {
        portfolio: portfolio.status === 'rejected' ? portfolio.reason?.message : null,
        watchlist: watchlist.status === 'rejected' ? watchlist.reason?.message : null,
        alerts: alerts.status === 'rejected' ? alerts.reason?.message : null,
        trending: trending.status === 'rejected' ? trending.reason?.message : null,
        indices: indices.status === 'rejected' ? indices.reason?.message : null,
      }
    };
  } catch (error) {
    console.error('Error fetching home screen data:', error);
    throw error;
  }
};

export default {
  fetchPortfolioSummary,
  fetchWatchlistCount,
  fetchAlertSummary,
  fetchTrendingStocks,
  fetchTopGainers,
  fetchTopLosers,
  fetchStockQuote,
  fetchMarketIndices,
  fetchHomeScreenData,
};

/**
 * Company API Service
 * Provides API calls for company-specific data including:
 * - Historical price data
 * - Fundamentals time-series
 * - Company news and announcements
 */

import { API_BASE_URL } from './config';

const API_BASE = API_BASE_URL;

/**
 * Fetch historical price data for a stock
 * @param {string} ticker - Stock ticker symbol
 * @param {number} days - Number of days of history (default: 365)
 */
export const fetchPriceHistory = async (ticker, days = 365) => {
  try {
    const response = await fetch(
      `${API_BASE}/company/${ticker}/price-history?days=${days}`
    );
    const data = await response.json();
    
    if (data.success) {
      return data.data || [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching price history:', error);
    return [];
  }
};

/**
 * Fetch fundamentals time-series data (quarterly + TTM)
 * @param {string} ticker - Stock ticker symbol
 */
export const fetchFundamentalsHistory = async (ticker) => {
  try {
    const response = await fetch(
      `${API_BASE}/company/${ticker}/fundamentals-history`
    );
    const data = await response.json();
    
    if (data.success) {
      return {
        revenueHistory: data.data?.revenue || [],
        earningsHistory: data.data?.earnings || [],
        debtFcfHistory: data.data?.debtFcf || [],
        pegHistory: data.data?.peg || [],
      };
    }
    return {
      revenueHistory: [],
      earningsHistory: [],
      debtFcfHistory: [],
      pegHistory: [],
    };
  } catch (error) {
    console.error('Error fetching fundamentals history:', error);
    return {
      revenueHistory: [],
      earningsHistory: [],
      debtFcfHistory: [],
      pegHistory: [],
    };
  }
};

/**
 * Fetch company news and announcements
 * @param {string} ticker - Stock ticker symbol
 * @param {number} limit - Maximum number of news items (default: 20)
 */
export const fetchCompanyNews = async (ticker, limit = 20) => {
  try {
    const response = await fetch(
      `${API_BASE}/company/${ticker}/news?limit=${limit}`
    );
    const data = await response.json();
    
    if (data.success) {
      return data.data || [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching company news:', error);
    return [];
  }
};

/**
 * Fetch company metadata (sector, industry, etc.)
 * @param {string} ticker - Stock ticker symbol
 */
export const fetchCompanyMetadata = async (ticker) => {
  try {
    const response = await fetch(
      `${API_BASE}/company/${ticker}/metadata`
    );
    const data = await response.json();
    
    if (data.success) {
      return data.data || null;
    }
    return null;
  } catch (error) {
    console.error('Error fetching company metadata:', error);
    return null;
  }
};

/**
 * Fetch real-time quote for a stock
 * @param {string} ticker - Stock ticker symbol
 */
export const fetchRealTimeQuote = async (ticker) => {
  try {
    const response = await fetch(
      `${API_BASE}/company/${ticker}/quote`
    );
    const data = await response.json();
    
    if (data.success) {
      return data.data || null;
    }
    return null;
  } catch (error) {
    console.error('Error fetching real-time quote:', error);
    return null;
  }
};

export default {
  fetchPriceHistory,
  fetchFundamentalsHistory,
  fetchCompanyNews,
  fetchCompanyMetadata,
  fetchRealTimeQuote,
};

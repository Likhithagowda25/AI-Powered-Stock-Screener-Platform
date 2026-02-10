import apiClient from './apiClient';

/**
 * Example Protected API Calls
 * These will automatically include the JWT token in headers
 */

// Watchlist APIs
export const getWatchlist = async () => {
  const response = await apiClient.get('/watchlist');
  return response.data;
};

export const addToWatchlist = async (stockSymbol) => {
  const response = await apiClient.post('/watchlist', { symbol: stockSymbol });
  return response.data;
};

export const removeFromWatchlist = async (stockSymbol) => {
  const response = await apiClient.delete(`/watchlist/${stockSymbol}`);
  return response.data;
};

// Portfolio APIs
export const getPortfolio = async () => {
  const response = await apiClient.get('/portfolio');
  return response.data;
};

export const addToPortfolio = async (stock) => {
  const response = await apiClient.post('/portfolio', stock);
  return response.data;
};

// Alerts APIs
export const getAlerts = async () => {
  const response = await apiClient.get('/alerts');
  return response.data;
};

export const createAlert = async (alert) => {
  const response = await apiClient.post('/alerts', alert);
  return response.data;
};

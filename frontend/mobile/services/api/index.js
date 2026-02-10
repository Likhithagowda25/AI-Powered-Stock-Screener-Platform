import { API_BASE_URL } from './config';

export const runScreener = async (query) => {
  try {
    const response = await fetch(`${API_BASE_URL}/screener`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to run screener' }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || data.error || 'Screener query failed');
    }

    return {
      results: data.results || [],
      count: data.count || 0,
      execution: data.execution || {},
      metadata: data.metadata || {},
      matchedConditions: data.matchedConditions || {},
    };
  } catch (error) {
    console.error('Screener API error:', error);
    throw error;
  }
};
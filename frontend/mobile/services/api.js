import { API_BASE_URL } from './api/config';

const API_URL = API_BASE_URL;

import { processScreenerResponse, extractMatchedConditions } from './screenerResponseHandler';

// Generate unique request ID
const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get or create session ID
let sessionId = null;
const getSessionId = () => {
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  return sessionId;
};

export const runScreener = async (query) => {
  const requestId = generateRequestId();
  const session = getSessionId();
  
  try {
    const response = await fetch(`${API_BASE_URL}/screener`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        'X-Session-ID': session
      },
      body: JSON.stringify({ 
        query,
        requestId,
        sessionId: session,
        timestamp: new Date().toISOString()
      }),
      timeout: 30000, // 30 second timeout
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `Server error: ${response.status}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    console.log('[API.js runScreener] Raw response data:', JSON.stringify(data, null, 2));
    
    // Validate response structure
    if (!data.success) {
      throw new Error(data.error || 'Query execution failed');
    }
    
    if (!data.results || !Array.isArray(data.results)) {
      throw new Error('Invalid response format from server');
    }

    // Return structured response with metadata
    return {
      results: data.results,
      count: data.count,
      query: data.query,
      execution: data.execution,
      metadata: data.metadata,
      // Add processed data for enhanced UI
      matchedConditions: extractMatchedConditions(data),
      processedResponse: processScreenerResponse(data),
    };
  } catch (err) {
    console.error('API Error:', err);
    
    // Preserve the original error message for better error handling
    if (err.message.includes('Network request failed') || err.message.includes('timeout')) {
      throw new Error('Network error: Please check your internet connection');
    }
    
    throw err;
  }
};
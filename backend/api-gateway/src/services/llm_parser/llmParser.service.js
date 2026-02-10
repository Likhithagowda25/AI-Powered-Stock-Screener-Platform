/**
 * LLM Parser Service
 * 
 * Responsibilities:
 * 1. Accept Natural-Language Query Input with metadata
 * 2. Invoke LLM or Stub for NL → DSL translation
 * 3. Validate DSL Output against schema
 * 4. Response Construction & Error Handling
 * 5. Forward validated DSL to Screener Compiler & Runner
 * 
 * Separation of Concerns:
 * - ONLY handles NL → DSL translation and validation
 * - Does NOT execute database queries
 * - Does NOT compile DSL to SQL
 */

const { validateDSL } = require('./llmSchema');
const { translateNLToDSL } = require('../llm_stub/llm_stub');
const { v4: uuidv4 } = require('uuid');

class LLMParserService {
  constructor() {
    this.useLLM = process.env.USE_LLM === 'true';
    this.requestLog = [];
  }

  /**
   * Main entry point: Process natural language query
   * 
   * @param {string} nlQuery - Natural language query from frontend
   * @param {object} context - Request metadata (userId, sessionId, etc.)
   * @returns {Promise<object>} Validated DSL and metadata
   */
  async processQuery(nlQuery, context = {}) {
    const requestId = uuidv4();
    const timestamp = new Date().toISOString();
    
    // Sanitize input
    const sanitizedQuery = this._sanitizeInput(nlQuery);
    
    // Log incoming request for traceability
    this._logRequest({
      requestId,
      timestamp,
      query: sanitizedQuery,
      userId: context.userId,
      sessionId: context.sessionId
    });

    try {
      // Step 2: Invoke LLM or Stub
      const dslOutput = await this._translateQuery(sanitizedQuery);

      // Step 3: Validate DSL Output
      const validationResult = this._validateDSL(dslOutput);
      
      if (!validationResult.isValid) {
        throw new Error(`DSL Validation Failed: ${validationResult.errors.join(', ')}`);
      }

      // Step 4: Response Construction
      return {
        success: true,
        requestId,
        timestamp,
        query: sanitizedQuery,
        dsl: dslOutput,
        metadata: {
          translationMethod: this.useLLM ? 'llm' : 'stub',
          validatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      // Step 5: Error Handling
      return this._handleError(error, requestId, sanitizedQuery);
    }
  }

  /**
   * Step 1: Sanitize and validate input
   * @private
   */
  _sanitizeInput(query) {
    if (!query || typeof query !== 'string') {
      throw new Error('Invalid query: must be a non-empty string');
    }

    // Remove potentially harmful characters
    const sanitized = query
      .trim()
      .replace(/[<>]/g, '') // Remove angle brackets
      .substring(0, 1000); // Limit length

    if (sanitized.length === 0) {
      throw new Error('Query cannot be empty');
    }

    return sanitized;
  }

  /**
   * Step 2: Route query to LLM or Stub implementation
   * @private
   */
  async _translateQuery(query) {
    if (this.useLLM) {
      return await this._callLLMAPI(query);
    } else {
      return this._callStub(query);
    }
  }

  /**
   * Call LLM API (Groq - Free) for NL → DSL translation
   * Enforces deterministic, structured JSON output only
   * @private
   */
  async _callLLMAPI(query) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY not configured. Get free key from: https://console.groq.com');
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `You are a stock screener DSL generator. Convert natural language queries to DSL JSON.
              
STRICT RULES:
- Return ONLY valid JSON, no explanations
- Use this exact structure: { "filter": { "and": [...] } }
- Allowed fields: pe_ratio, roe, roa, revenue, net_income, eps, operating_margin, pb_ratio, debt_to_equity, market_cap, volume, sector, exchange
- Allowed operators: <, >, <=, >=, =, !=, between
- Example: "PE < 15 and ROE > 20" becomes:
{
  "filter": {
    "and": [
      { "field": "pe_ratio", "operator": "<", "value": 15 },
      { "field": "roe", "operator": ">", "value": 20 }
    ]
  }
}`
            },
            {
              role: 'user',
              content: query
            }
          ],
          temperature: 0, // Deterministic output
          max_tokens: 500,
          response_format: { type: 'json_object' } // Force JSON response
        })
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const dslText = data.choices[0].message.content;
      
      // Parse JSON response
      return JSON.parse(dslText);

    } catch (error) {
      console.error('LLM API call failed:', error);
      throw new Error(`LLM translation failed: ${error.message}`);
    }
  }

  /**
   * Call stub/mock implementation for development
   * @private
   */
  _callStub(query) {
    return translateNLToDSL(query);
  }

  /**
   * Step 3: Validate DSL against schema
   * @private
   */
  _validateDSL(dsl) {
    try {
      validateDSL(dsl);
      return { isValid: true, errors: [] };
    } catch (error) {
      return { 
        isValid: false, 
        errors: [error.message] 
      };
    }
  }

  /**
   * Log request for traceability
   * @private
   */
  _logRequest(logEntry) {
    this.requestLog.push(logEntry);
    
    // Keep only last 1000 requests in memory
    if (this.requestLog.length > 1000) {
      this.requestLog.shift();
    }

    // In production, this should write to proper logging service
    console.log('[LLM-Parser]', JSON.stringify(logEntry));
  }

  /**
   * Step 4: Error handling with user-safe messages
   * @private
   */
  _handleError(error, requestId, query) {
    // Log internal error details
    console.error('[LLM-Parser Error]', {
      requestId,
      query,
      error: error.message,
      stack: error.stack
    });

    // Return user-safe error message
    let userMessage = 'Unable to process query';
    let errorType = 'UNKNOWN_ERROR';

    if (error.message.includes('Validation Failed')) {
      userMessage = 'The query could not be translated to a valid screening rule';
      errorType = 'VALIDATION_ERROR';
    } else if (error.message.includes('Invalid query')) {
      userMessage = 'Please provide a valid query';
      errorType = 'INVALID_INPUT';
    } else if (error.message.includes('Unsupported')) {
      userMessage = 'This query type is not yet supported';
      errorType = 'UNSUPPORTED_QUERY';
    }

    return {
      success: false,
      requestId,
      error: {
        type: errorType,
        message: userMessage
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get request logs (for debugging)
   */
  getRequestLogs(limit = 10) {
    return this.requestLog.slice(-limit);
  }
}

module.exports = new LLMParserService();
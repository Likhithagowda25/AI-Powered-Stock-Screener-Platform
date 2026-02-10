/**
 * Screener Orchestrator Service
 * 
 * Coordinates the complete screener pipeline:
 * 1. LLM Parser: NL → Validated DSL
 * 2. Screener Compiler: DSL → SQL
 * 3. Screener Runner: SQL → Results
 * 
 * This is the main entry point for screener queries
 */

const llmParser = require('../llm_parser/llmParser.service');
const compiler = require('../screener_compiler/compiler.service');
const runner = require('../screener_runner/runner.service');

class ScreenerService {
  /**
   * Execute complete screener pipeline
   * @param {string} nlQuery - Natural language query
   * @param {object} context - User context (userId, sessionId)
   * @returns {object} Complete screener response
   */
  async executeQuery(nlQuery, context = {}) {
    const startTime = Date.now();
    
    try {
      // Step 1: Parse natural language to validated DSL
      const parseResult = await llmParser.processQuery(nlQuery, context);
      
      if (!parseResult.success) {
        return {
          success: false,
          stage: 'parsing',
          error: parseResult.error,
          executionTime: Date.now() - startTime
        };
      }

      // Step 2: Compile DSL to SQL
      let compiledQuery;
      try {
        compiledQuery = compiler.compile(parseResult.dsl);
      } catch (error) {
        console.error('[Compiler Error]', error);
        return {
          success: false,
          stage: 'compilation',
          error: {
            type: 'COMPILATION_ERROR',
            message: 'Unable to compile screening rules'
          },
          executionTime: Date.now() - startTime
        };
      }

      // Step 3: Execute SQL query
      const queryResult = await runner.execute(compiledQuery.sql, compiledQuery.params);

      if (!queryResult.success) {
        return {
          success: false,
          stage: 'execution',
          error: queryResult.error,
          executionTime: Date.now() - startTime
        };
      }

      // Step 4: Return complete response
      return {
        success: true,
        requestId: parseResult.requestId,
        query: parseResult.query,
        dsl: parseResult.dsl,
        results: queryResult.results,
        count: queryResult.count,
        metadata: {
          translationMethod: parseResult.metadata.translationMethod,
          executionTime: Date.now() - startTime,
          queryExecutionTime: queryResult.executionTime,
          tablesUsed: compiledQuery.requiredTables
        }
      };

    } catch (error) {
      console.error('[Screener Service Error]', error);
      
      return {
        success: false,
        stage: 'unknown',
        error: {
          type: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred'
        },
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Health check for all screener components
   */
  async healthCheck() {
    const dbStatus = await runner.testConnection();
    
    return {
      llmParser: { status: 'ok' },
      compiler: { status: 'ok' },
      database: {
        status: dbStatus.connected ? 'ok' : 'error',
        error: dbStatus.error
      }
    };
  }
}

module.exports = new ScreenerService();

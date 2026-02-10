const { translateNLToDSL } = require('../services/llm_stub/llm_stub');
const dslValidator = require('../services/dsl_validator/validator.service');
const compilerService = require('../services/screener_compiler/compiler.service');
const runnerService = require('../services/screener_runner/runner.service');


// Run screener with full NL → DSL → Validation → SQL → Results pipeline
exports.runScreener = async (req, res) => {
  const { query, requestId, sessionId, timestamp } = req.body;
  const headerRequestId = req.headers['x-request-id'];
  const headerSessionId = req.headers['x-session-id'];

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  console.log('[Screener Pipeline]', {
    requestId: requestId || headerRequestId,
    sessionId: sessionId || headerSessionId,
    timestamp: timestamp || new Date().toISOString(),
    query
  });

  try {
    // ===== STEP 1: LLM-Parser - Translate Natural Language to DSL =====
    console.log('[Step 1] LLM-Parser: Translating NL to DSL...');
    const dsl = translateNLToDSL(query);
    console.log('[Step 1] DSL Output:', JSON.stringify(dsl, null, 2));

    // Basic parsing check
    if (!dsl.filter || (Object.keys(dsl.filter).length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'Could not understand your query. Please try something like: "PE ratio less than 15" or "ROE greater than 20"'
      });
    }

    // ===== STEP 2: DSL Validation - Ensure Safe Execution =====
    console.log('[Step 2] DSL Validator: Validating DSL structure...');
    const validation = dslValidator.validate(dsl);
    
    if (!validation.valid) {
      console.error('[Step 2] DSL Validation Failed:', validation.errors);
      return res.status(400).json({
        success: false,
        error: 'Invalid query format. Please check your query and try again.'
      });
    }
    console.log('[Step 2] DSL Validation: PASSED');

    // ===== STEP 3: Screener Compiler - DSL to SQL =====
    // IMPORTANT: Only validated DSL reaches here - LLM output never directly accesses database
    console.log('[Step 3] Compiler: Converting validated DSL to SQL...');
    const { sql, params } = compilerService.compile(validation.sanitizedDSL);
    console.log('[Step 3] Generated SQL:', sql);
    console.log('[Step 3] SQL Params:', params);

    // ===== STEP 4: Screener Runner - Execute SQL Query =====
    console.log('[Step 4] Runner: Executing parameterized SQL...');
    const result = await runnerService.execute(sql, params);

    if (!result.success) {
      console.error('[Step 4] Query Execution Failed:', result.error);
      return res.status(500).json({
        success: false,
        error: 'Unable to complete your search. Please try again.'
      });
    }

    console.log('[Step 4] Query Execution: SUCCESS', {
      resultCount: result.count,
      executionTime: result.executionTime
    });

    // Return results
    res.json({
      success: true,
      results: result.results,
      count: result.count,
      query: {
        original: query,
        dsl: validation.sanitizedDSL
      },
      execution: {
        executionTime: result.executionTime,
        timestamp: new Date().toISOString()
      },
      metadata: {
        requestId: requestId || headerRequestId,
        sessionId: sessionId || headerSessionId
      }
    });

  } catch (error) {
    console.error('[Screener Pipeline Error]', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred. Please try again.'
    });
  }
};
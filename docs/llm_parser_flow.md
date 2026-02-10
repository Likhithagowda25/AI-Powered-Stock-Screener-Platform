# LLM Parser Integration Flow

**Version:** 1.0.0 | **Date:** December 26, 2025

## Flow: Frontend → LLM Parser → Screener Compiler → Screener Runner → Results

### Phase 1: LLM Parser Service
**Location:** `/backend/api-gateway/src/services/llm_parser/`

**Input:** Natural language query from frontend
```javascript
{ query: "Find stocks with PE < 15 and ROE > 20%", userId: "user123" }
```

**Process:**
1. Generate requestId (UUID) and timestamp
2. Sanitize input (remove harmful chars, limit 1000 chars)
3. Route to LLM API (`USE_LLM=true`) or Stub (`USE_LLM=false`)
4. Validate DSL output against schema (35 allowed fields, 9 operators)
5. Return validated DSL or error

**Output (Success):**
```javascript
{ success: true, requestId: "...", dsl: { filter: { and: [...] } }, metadata: {...} }
```

**Output (Error):**
```javascript
{ success: false, requestId: "...", error: { type: "VALIDATION_ERROR", message: "..." } }
```

### Phase 2: Screener Compiler (Separate Module)
**Input:** Validated DSL from LLM Parser

**Process:** Parse DSL → Map fields to DB columns → Generate SQL/ORM query → Apply security rules

**Output:** SQL query ready for execution

### Phase 3: Screener Runner (Separate Module)
**Input:** SQL query from Compiler

**Process:** Execute query → Fetch results → Format for frontend

**Output:** Array of stock results

## Separation of Concerns

**✅ LLM Parser Does:** Accept queries, sanitize, translate NL→DSL, validate DSL, error handling, logging  
**❌ LLM Parser Does NOT:** Compile to SQL, execute queries, fetch data, format results

## Configuration
```env
USE_LLM=false                    # Toggle LLM/stub
OPENAI_API_KEY=sk-...           # For LLM mode
```

## API Endpoint: `POST /api/v1/screener/query`
**Request:** `{ "query": "PE < 15 and ROE > 20" }`  
**Response:** `{ success: true, results: [...], count: 2 }`

## References
- Service: `/backend/api-gateway/src/services/llm_parser/llmParser.service.js`
- Validation: `/backend/api-gateway/src/services/llm_parser/llmSchema.js`
- Stub: `/backend/api-gateway/src/services/llm_stub/llm_stub.js`

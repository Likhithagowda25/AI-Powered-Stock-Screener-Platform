# End-to-End Screener Flow

## Overview

This document describes the complete flow from user query input to results display in the stock screener feature.

## Architecture

```
Frontend (React Native)  →  API Gateway  →  LLM Parser  →  DSL Validator  →  SQL Compiler  →  Query Runner  →  Database
```

## Flow Steps

### 1. User Submits Query

**Location:** ScreenerQueryScreen.js

**Process:**
- User types natural language query (e.g., "PE ratio less than 15")
- Clicks "Run Screener" button
- Frontend validates query is not empty
- Generates requestId and sessionId for tracking

**Request Metadata:**
```javascript
{
  query: "user's natural language input",
  requestId: "req_1234567890_abc123",
  sessionId: "session_1234567890_xyz789",
  timestamp: "2025-12-30T12:00:00.000Z"
}
```

### 2. API Request

**Location:** frontend/mobile/services/api.js

**Endpoint:** POST /api/v1/screener

**Headers:**
- Content-Type: application/json
- X-Request-ID: unique per request
- X-Session-ID: consistent per session

**Timeout:** 30 seconds

### 3. Backend Pipeline

**Location:** backend/api-gateway/src/controllers/screenerController.js

#### Stage 1: LLM Parser
- Translates natural language to DSL format
- Currently using stub implementation
- Returns structured filter object

**Example DSL:**
```json
{
  "filter": {
    "and": [
      {"field": "pe_ratio", "operator": "<", "value": 15}
    ]
  }
}
```

#### Stage 2: DSL Validator
- Validates field names against whitelist
- Validates operators (=, !=, <, <=, >, >=, LIKE, IN, BETWEEN)
- Ensures structure is safe
- Returns sanitized DSL or validation errors

**Security:** LLM output never directly accesses database

#### Stage 3: SQL Compiler
- Converts validated DSL to parameterized SQL
- Uses prepared statements to prevent injection
- Selects 14 fields from fundamentals_quarterly

**Generated SQL:**
```sql
SELECT ticker, name, sector, industry, exchange, 
       market_cap, pe_ratio, pb_ratio, roe, roa, 
       revenue, net_income, eps, operating_margin
FROM fundamentals_quarterly
WHERE pe_ratio < $1
```

#### Stage 4: Query Runner
- Executes SQL with parameters
- Measures execution time
- Returns results array

### 4. Backend Response

**Success Response:**
```json
{
  "success": true,
  "results": [...],
  "count": 42,
  "query": {
    "original": "PE ratio less than 15",
    "dsl": {...}
  },
  "execution": {
    "executionTime": "45ms",
    "timestamp": "2025-12-30T12:00:00.500Z"
  },
  "metadata": {
    "requestId": "req_1234567890_abc123",
    "sessionId": "session_1234567890_xyz789"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "User-friendly error message"
}
```

### 5. Frontend Result Handling

**Location:** ScreenerQueryScreen.js

- Parses response structure
- Navigates to ResultsScreen with data
- Passes results, count, execution metadata

### 6. Results Display

**Location:** ResultsScreen.js

**Three States:**

1. **Success with Results**
   - Shows count badge
   - Displays stock cards in scrollable list
   - Highlights queried fields
   - Shows "Edit Query" button

2. **Empty Results**
   - EmptyState component
   - "No stocks matched your criteria"
   - Suggests trying different query

3. **Error State**
   - ErrorState component
   - User-friendly error message
   - "Try Again" button to go back
   - No technical details shown

## Request Tracking

**Purpose:** Debug and analytics

**RequestID:** Unique per query execution
**SessionID:** Persists across multiple queries in same app session

**Logged at:**
- Frontend api.js
- Backend screenerController.js
- Included in response metadata

## Error Handling

### Frontend Errors
- Network timeout → "Can't reach server"
- Invalid response → "Unexpected error"
- All errors show retry option

### Backend Errors
- Empty query → 400 "Query is required"
- Invalid DSL → 400 "Could not understand query"
- Validation failed → 400 "Invalid query format"
- Execution failed → 500 "Unable to complete search"
- Generic errors → 500 "An unexpected error occurred"

**Security:** No stack traces, SQL, or internal details in user-facing errors

## Testing

**Test Script:** backend/api-gateway/test-queries.js

Validates:
- 7 predefined queries execute correctly
- Results match filter criteria
- Error cases handled properly

**Edge Cases:** backend/api-gateway/test-edge-cases.js

Tests:
- Invalid queries
- Empty results
- Network failures
- Server errors

## Data Flow Summary

1. User input (NL text)
2. Request metadata added
3. LLM translation to DSL
4. DSL validation (security layer)
5. SQL compilation (parameterized)
6. Database execution
7. Results returned with metadata
8. Frontend displays results/error/empty state

**Key Security Feature:** Multi-stage validation ensures only safe, validated queries reach the database.

- The stub translates predefined natural-language queries to DSL JSON.
- Integrates with Screener Compiler & Runner.
- DSL JSON is validated before execution.
- Unsupported queries return `{ filter: {} }`.


## Architecture

```
┌─────────────────┐
│  Mobile App     │
│  (User Input)   │
└────────┬────────┘
         │
         │ "PE < 20 and ROE > 15"
         │
         ▼
┌─────────────────┐
│  API Gateway    │
│  /llm/translate │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LLM Stub       │
│  Service        │
└────────┬────────┘
         │
         │ DSL JSON
         │
         ▼
┌─────────────────┐
│  DSL Validator  │
└────────┬────────┘
         │
         │ Validated DSL
         │
         ▼
┌─────────────────┐
│  Screener       │
│  Service        │
└────────┬────────┘
         │
         │ Filtered Results
         │
         ▼
┌─────────────────┐
│  Mobile App     │
│  (Results)      │
└─────────────────┘
```

---

## Integration Flow

### Step 1: User Enters Query

User types natural language query in mobile app:
```
"PE less than 20 and ROE greater than 15"
```

### Step 2: Translate to DSL

**Current Supported Queries (Stub Implementation):**
1. `"pe less than 10"`
2. `"roe greater than 15"`
3. `"net profit greater than 1000"`

**API Call:**
```http
POST http://localhost:8080/llm/translate
Content-Type: application/json

{
  "query": "pe less than 10"
}
```

**Response:**
```json
{
  "dsl": {
    "filter": {
      "and": [
        { "field": "pe_ratio", "operator": "<", "value": 10 }
      ]
    }
  }
}
```

### Time-Based Constraints
```
"ROE > 15 in last 4 quarters"
"revenue > 1000000 in last 3 years"
"eps > 10 in last 6 months"
```

### Step 3: Validate DSL

DSL validator checks:
- ✅ Version is "1.0"
- ✅ Conditions array exists and not empty
- ✅ Each condition has metric, operator, value
- ✅ Metrics are supported
- ✅ Operators are valid
- ✅ Values have correct types
- ✅ Logic is "AND" or "OR"


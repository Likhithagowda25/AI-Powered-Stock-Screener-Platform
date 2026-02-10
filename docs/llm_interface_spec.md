## Endpoint
```
POST /llm/translate
```

## Request Headers
```
Content-Type: application/json
```

## Request Body
```json
{
  "query": "pe less than 10"
}
```

## Response Body

### Success Response (200 OK)
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

## Supported Query Examples

### 1. Single Condition Queries

**Example 1: PE Ratio**
```json
// Request
{
  "query": "pe less than 10"
}

// Response
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

**Example 2: ROE Query**
```json
// Request
{
  "query": "roe greater than 15"
}

// Response
{
  "dsl": {
    "filter": {
      "and": [
        { "field": "roe", "operator": ">", "value": 15 }
      ]
    }
  }
}
```

**Example 3: Net Income Query**
```json
// Request
{
  "query": "net income > 1000"
}

// Response
{
  "dsl": {
    "filter": {
      "and": [
        { "field": "net_income", "operator": ">", "value": 1000 }
      ]
    }
  }
}
```

### 2. AND Logic Queries

**Example 4: Multiple Conditions with AND**
```json
// Request
{
  "query": "PE < 20 and ROE > 15"
}

// Response
{
  "dsl": {
    "filter": {
      "and": [
        { "field": "pe_ratio", "operator": "<", "value": 20 },
        { "field": "roe", "operator": ">", "value": 15 }
      ]
    }
  }
}
```

### 3. OR Logic Queries

**Example 5: Multiple Conditions with OR**
```json
// Request
{
  "query": "PE < 10 or ROE > 20"
}

// Response
{
  "dsl": {
    "filter": {
      "or": [
        { "field": "pe_ratio", "operator": "<", "value": 10 },
        { "field": "roe", "operator": ">", "value": 20 }
      ]
    }
  }
}
```

### 4. Complex Nested Logic

**Example 6: AND within OR**
```json
// Request
{
  "query": "PE < 20 and ROE > 15 or net income > 5000"
}

// Response
{
  "dsl": {
    "filter": {
      "or": [
        {
          "and": [
            { "field": "pe_ratio", "operator": "<", "value": 20 },
            { "field": "roe", "operator": ">", "value": 15 }
          ]
        },
        { "field": "net_income", "operator": ">", "value": 5000 }
      ]
    }
  }
}
```

### 5. Time-Based Constraints

**Example 7: Quarter-based Query**
```json
// Request
{
  "query": "ROE > 15 in last 4 quarters"
}

// Response
{
  "dsl": {
    "filter": {
      "and": [
        {
          "field": "roe",
          "operator": ">",
          "value": 15,
          "timeframe": {
            "type": "quarters",
            "period": 4,
            "aggregation": "latest"
          }
        }
      ]
    }
  }
}
```

**Example 8: Year-based Query**
```json
// Request
{
  "query": "revenue > 1000000 in last 3 years"
}

// Response
{
  "dsl": {
    "filter": {
      "and": [
        {
          "field": "revenue",
          "operator": ">",
          "value": 1000000,
          "timeframe": {
            "type": "years",
            "period": 3,
            "aggregation": "latest"
          }
        }
      ]
    }
  }
}
```

### 6. Additional Metrics

**Example 9: EPS Query**
```json
// Request
{
  "query": "eps > 10"
}

// Response
{
  "dsl": {
    "filter": {
      "and": [
        { "field": "eps", "operator": ">", "value": 10 }
      ]
    }
  }
}
```

**Example 10: Debt to Equity**
```json
// Request
{
  "query": "debt to equity < 2"
}

// Response
{
  "dsl": {
    "filter": {
      "and": [
        { "field": "debt_to_equity", "operator": "<", "value": 2 }
      ]
    }
  }
}
```

**Example 11: Market Cap**
```json
// Request
{
  "query": "market cap > 1000000000"
}

// Response
{
  "dsl": {
    "filter": {
      "and": [
        { "field": "market_cap", "operator": ">", "value": 1000000000 }
      ]
    }
  }
}
```

### 7. Not Equal Operator

**Example 12: Not Equal**
```json
// Request
{
  "query": "PE != 15"
}

// Response
{
  "dsl": {
    "filter": {
      "and": [
        { "field": "pe_ratio", "operator": "!=", "value": 15 }
      ]
    }
  }
}
```

### 8. Unsupported Query

**Example 13: Unrecognized Pattern**
```json
// Request
{
  "query": "anything else"
}

// Response
{
  "dsl": {
    "filter": {}
  }
}
```

### Error Response (400 Bad Request)
```json
{
  "error": "Query is required"
}
```

## Supported Features

### Financial Metrics (14 total)
- PE Ratio, ROE, ROA, PB Ratio
- Revenue, Net Income, EPS
- Operating Margin
- Debt to Equity
- Market Cap
- Short Term Debt, Long Term Debt
- CapEx, Operating Cash Flow (CFO)

### Comparison Operators
- `<`, `>`, `<=`, `>=`, `=`, `!=`
- Natural language: "less than", "greater than", "equal to", "not equal to", etc.

### Logical Operators
- AND (combine multiple conditions)
- OR (alternative conditions)
- Complex nesting (AND within OR)

### Time Constraints
- Last N quarters
- Last N years
- Last N months

## Notes
- Base URL: `http://localhost:8080`
- Queries are case-insensitive
- Flexible pattern matching
- Missing query field returns 400 error
- All metrics from `fundamentals_quarterly` table are supported
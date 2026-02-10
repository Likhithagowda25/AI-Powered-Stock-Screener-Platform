# Results View Flow

## Navigation Stack
```
ScreenerQuery (Initial) → Results
```

## User Flow

1. **Query Submission**
   - User enters query → Clicks "Run Screener"
   - API call: `POST /api/screener` with `{ query }`
   - Navigate to Results with: `{ results, query, isLoading, error }`

2. **Display Logic**
   ```javascript
   if (isLoading) → LoadingState
   if (error) → ErrorState  
   if (results.length === 0) → EmptyState
   else → ResultsList
   ```

3. **Back Navigation** (3 ways)
   - Native back button → `navigation.goBack()`
   - "Edit Query" button → `navigation.goBack()`
   - "Try Again" (error) → `navigation.goBack()`

---

## Data Flow

**API Response** → **Format Numbers** → **Render Cards**

```javascript
// Example response
{
  results: [{
    ticker: "RELIANCE",
    name: "Reliance Industries Ltd.",
    pe_ratio: 24.5,
    roe: 18.2,
    market_cap: 175000
    // ... other fields
  }]
}

// Formatting
market_cap: 175000 → "175.00 Cr"
roe: 18.2 → "18.20 %"
pe_ratio: 24.5 → "24.50"
null → "N/A"
```

---

## Highlighting Logic

Query: "Companies with high ROE and low PE"
- Parse keywords: `["roe", "pe"]`
- Map to fields: `['roe', 'pe_ratio']`
- Apply blue background to matching metrics

---

## Components

- **StockCard**: Gradient header + metrics (2-level hierarchy)
- **MetricRow**: Label + value with conditional highlighting
- **FlatList**: Virtual scrolling with `keyExtractor`

---

## Error Handling

| Backend Error | User Message |
|---------------|--------------|
| Network timeout | "Check your internet connection" |
| 401 | "Session expired" |
| 500/502/503 | "Service temporarily unavailable" |
| Default | "Something went wrong" |

**Security**: Raw error messages never shown to users (`showDetails={false}`)

---

## Performance

- FlatList virtual scrolling (60fps)
- `useWindowDimensions()` for responsive updates
- Dynamic card widths
- Efficient re-renders with `keyExtractor`

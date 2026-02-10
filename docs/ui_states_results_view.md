# UI States - Results View

## State Overview

| State | Trigger | Component | User Action |
|-------|---------|-----------|-------------|
| **Loading** | API call in progress | `LoadingState.js` | Wait |
| **Success** | results.length > 0 | `ResultsScreen.js` + `StockCard.js` | Scroll, Edit Query, Back |
| **Empty** | results.length = 0 | `EmptyState.js` | Edit Query, Back |
| **Error** | API failure | `ErrorState.js` | Try Again, Back |

---

## Loading State
- Spinner + "Analyzing stocks..." message
- No user interaction during loading

## Success State
- Header: Title + "Edit Query" button + results count
- Stock cards with gradient header (ticker, company name)
- **Primary metrics**: P/E Ratio, ROE, Market Cap
- **Secondary metrics**: P/B Ratio, Revenue, EPS, ROA, Operating Margin
- Query-based highlighting (blue background for relevant metrics)

## Empty State
- Search icon + "No stocks match your criteria"
- Helpful message: "Try adjusting your filters"

## Error State
- Alert icon + "Oops!" title
- **Safe error messages** (backend details hidden):
  - Network/timeout → "Check your internet connection"
  - 401 → "Session expired"
  - 404 → "Data not found"
  - 500/502/503 → "Service temporarily unavailable"
  - Default → "Something went wrong"
- "Try Again" button

---

## State Flow

```
Query Screen → Loading → Success/Empty/Error → Back to Query
```

## Route Parameters
```javascript
{ results: Array, query: String, isLoading: Boolean, error: String|null }
```

## Responsive Design
- Small screens (<375px): Reduced font sizes, smaller icons
- Dynamic card widths, text ellipsis for overflow
- All components use `useTheme()` for dark mode support

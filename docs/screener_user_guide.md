# Stock Screener User Guide

## Overview

The Stock Screener is an AI-powered mobile application that allows you to search and filter stocks using natural language queries. Simply describe what you're looking for, and the screener will find matching stocks based on your criteria.

---

## Getting Started

### 1. Open the Screener
Launch the app to access the Stock Screener screen. You'll see a text input area where you can enter your screening query.

### 2. Enter Your Query
Type your screening criteria in natural language. The system understands queries like:
- "Show me stocks with PE ratio below 15"
- "Find companies with ROE above 20%"
- "Stocks with market cap over 10000 crores and growing revenue"

### 3. View Results
After submitting your query, the app displays matching stocks with key metrics highlighted based on your criteria.

---

## Understanding the Results Screen

### Stock Cards
Each matching stock is displayed as a card showing:
- **Ticker Symbol**: The stock's trading symbol (e.g., RELIANCE, TCS)
- **Company Name**: Full company name
- **Primary Metrics**: P/E Ratio, ROE, Market Cap
- **Secondary Metrics**: P/B Ratio, Revenue, EPS, ROA, Operating Margin

### Visual Indicators
- **Highlighted Metrics**: Metrics related to your query are highlighted in blue
- **Derived Badge**: Purple badge indicates stocks with calculated metrics (PEG ratio, FCF margin, etc.)
- **Matched Badge**: Green badge shows how many conditions a stock matched

### Tap for Details
Tap any stock card to view detailed company information including:
- Quarterly vs TTM (Trailing Twelve Months) breakdowns
- Trend indicators and growth rates
- Matched conditions explanation
- Derived metrics with formulas

---

## Advanced Metric Definitions

### Fundamental Ratios

| Metric | Definition | Interpretation |
|--------|------------|----------------|
| **P/E Ratio** | Price / Earnings Per Share | Lower is typically more attractive (<15 value, <25 reasonable, >30 expensive) |
| **P/B Ratio** | Price / Book Value Per Share | <1 potentially undervalued, >3 may be expensive |
| **ROE** | Return on Equity (Net Income / Shareholder Equity) | >15% good, >20% excellent |
| **ROA** | Return on Assets (Net Income / Total Assets) | >5% good for most industries |

### Profitability Metrics

| Metric | Definition | Interpretation |
|--------|------------|----------------|
| **Operating Margin** | Operating Income / Revenue × 100 | Higher indicates better operational efficiency |
| **Net Margin** | Net Income / Revenue × 100 | Higher means more profit per rupee of revenue |
| **EPS** | Earnings Per Share | Positive and growing is desirable |

### Derived Metrics (Advanced)

| Metric | Formula | Interpretation |
|--------|---------|----------------|
| **PEG Ratio** | P/E Ratio / EPS Growth Rate | <1 potentially undervalued, 1-2 fairly valued |
| **Debt to FCF** | Total Debt / Free Cash Flow | <3 healthy, <5 moderate, >5 concern |
| **FCF Margin** | Free Cash Flow / Revenue × 100 | >15% strong, >5% moderate |
| **FCF Yield** | Free Cash Flow / Market Cap × 100 | Higher indicates better value |
| **Debt/Equity** | Total Debt / Total Equity | Lower generally safer, varies by industry |
| **Current Ratio** | Current Assets / Current Liabilities | >2 strong liquidity, >1 adequate |

---

## Export & Save Features

### Export to CSV
Tap the **Export** button to download results as a CSV file:
- Opens the share sheet for saving or sending
- Includes all displayed metrics
- Contains metadata (query, date, result count)

### Share Results
Tap the **Share** button to share a text summary:
- Quick overview of top 10 results
- Includes key metrics per stock
- Suitable for messaging or email

### Save to History
Tap the **Save** button to save results for later:
- Stores up to 10 recent result sets
- Access saved results from history
- Temporary storage (session-based)

---

## Example Queries

### Value Investing
```
Show stocks with PE below 15 and ROE above 15%
```

### Growth Stocks
```
Find companies with revenue growth above 20% and market cap over 5000 crores
```

### Quality Screening
```
Stocks with operating margin above 20% and debt to equity below 0.5
```

### Dividend Stocks
```
Show companies with dividend yield above 3% and ROE above 12%
```

### Small-Cap Value
```
Find stocks with market cap between 500 and 2000 crores and PE below 12
```

### Combined Criteria
```
Show stocks where PE is less than 20, ROE is above 18%, and market cap is over 10000 crores
```

---

## Tips for Better Results

1. **Be Specific**: Use exact metric names (PE, ROE, market cap)
2. **Use Numbers**: Include specific thresholds ("PE below 15" not "low PE")
3. **Combine Criteria**: Use "and" to add multiple conditions
4. **Check Highlighted Fields**: The UI highlights which metrics matched your query
5. **Explore Details**: Tap cards to see full company analysis

---

## Quarterly vs TTM Data

### Quarterly Data
- Based on the most recent quarter's financial statements
- Shows snapshot of recent performance
- Useful for tracking recent trends

### TTM (Trailing Twelve Months)
- Aggregates the last 4 quarters
- Smooths out seasonal variations
- Better for annualized comparisons

The Company Detail screen shows both views so you can compare.

---

## Understanding Trends

The app displays trend indicators showing:
- **↑ Green Arrow**: Positive growth/improvement
- **↓ Red Arrow**: Decline
- **→ Gray Arrow**: Stable/No significant change

Growth percentages are calculated as:
- **YoY (Year over Year)**: Current vs same period last year
- **QoQ (Quarter over Quarter)**: Current vs previous quarter

---

## Troubleshooting

### No Results Found
- Criteria may be too strict
- Try relaxing one or more conditions
- Check spelling of metric names

### Loading Takes Long
- Complex queries take more time
- Check internet connection
- Try again with simpler criteria

### Export Not Working
- Ensure file sharing is enabled
- Check device storage space
- Try sharing instead of exporting

---

## Technical Notes

- All financial data is sourced from regulatory filings
- Market cap is in Indian Rupees (Crores)
- Derived metrics are calculated on-demand
- Results are limited to stocks with available data

For technical support or feature requests, please contact the development team.

# Stock Result Fields - Data Contract

## Mandatory Fields
These fields must be present in every stock result:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| ticker | string | Stock symbol | "TCS.NS" |
| name | string | Company name | "Tata Consultancy Services" |

## Optional Fields from Database

### Company Information (from companies table)
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| sector | string | Business sector | "Technology" |
| industry | string | Industry type | "IT Services" |
| exchange | string | Stock exchange | "NSE" |
| market_cap | number | Market capitalization in crores | 125000 |

### Financial Metrics (from fundamentals_quarterly table)
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| quarter | string | Quarter identifier | "2024-Q4" |
| revenue | number | Total revenue in crores | 58500 |
| net_income | number | Net profit in crores | 11750 |
| eps | number | Earnings per share | 95.50 |
| operating_margin | number | Operating margin percentage | 26.5 |
| roe | number | Return on equity percentage | 45.2 |
| roa | number | Return on assets percentage | 25.6 |
| pe_ratio | number | Price to earnings ratio | 28.5 |
| pb_ratio | number | Price to book ratio | 12.3 |

### Debt Information (from debt_profile table)
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| short_term_debt | number | Short term debt in crores | 500 |
| long_term_debt | number | Long term debt in crores | 2000 |
| debt_to_equity | number | Debt to equity ratio | 0.05 |

### Cash Flow (from cashflow_statements table)
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| period | string | Period identifier | "2024-Q4" |
| cfo | number | Cash flow from operations | 12000 |
| cfi | number | Cash flow from investing | -3000 |
| cff | number | Cash flow from financing | -1500 |
| capex | number | Capital expenditure | 2000 |

## Frontend Display Fields

The frontend displays these fields when available:
- ticker (mandatory - always displayed)
- name (mandatory - always displayed)
- market_cap (from companies table)
- pe_ratio (from fundamentals_quarterly table)
- pb_ratio (from fundamentals_quarterly table)
- roe (from fundamentals_quarterly table)
- roa (from fundamentals_quarterly table)
- revenue (from fundamentals_quarterly table)
- eps (from fundamentals_quarterly table)
- operating_margin (from fundamentals_quarterly table)

All fields match schema.sql structure exactly.

## Data Handling Rules

1. Always check if field exists before displaying
2. Show "N/A" if field is null or undefined
3. Format large numbers (market_cap, revenue) by dividing by 1000
4. Format decimal numbers to 2 decimal places
5. Show percentage symbol for roe, roa, operating_margin

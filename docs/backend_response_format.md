# Backend Response Format Documentation

## API Endpoint
POST /api/screener

## Request Format
```json
{
  "query": "string - natural language query"
}
```

## Response Format
```json
{
  "results": [
    {
      "ticker": "string",
      "name": "string",
      "pe_ratio": "number",
      "roe": "number",
      ...
    }
  ]
}
```

## Database Tables
Based on schema.sql, the backend queries from:

### companies table
- ticker
- name
- sector
- industry
- exchange
- market_cap

### fundamentals_quarterly table
- ticker
- quarter
- revenue
- net_income
- eps
- operating_margin
- roe
- roa
- pe_ratio
- pb_ratio

### debt_profile table
- ticker
- quarter
- short_term_debt
- long_term_debt
- debt_to_equity

### cashflow_statements table
- ticker
- period
- cfo (cash flow from operations)
- cfi (cash flow from investing)
- cff (cash flow from financing)
- capex

## Mandatory Fields
Every stock result must have:
- ticker
- name

## Optional Fields
All other fields from database tables may or may not be present.

## Field Data Types
- ticker: string
- name: string
- sector: string
- industry: string
- exchange: string
- market_cap: number (BIGINT)
- revenue: number (BIGINT)
- net_income: number (BIGINT)
- eps: number (NUMERIC)
- operating_margin: number (NUMERIC)
- roe: number (NUMERIC)
- roa: number (NUMERIC)
- pe_ratio: number (NUMERIC)
- pb_ratio: number (NUMERIC)
- debt_to_equity: number (NUMERIC)
- short_term_debt: number (BIGINT)
- long_term_debt: number (BIGINT)
- cfo: number (BIGINT)
- cfi: number (BIGINT)
- cff: number (BIGINT)
- capex: number (BIGINT)

## Current Mock Response
The backend currently returns:
```json
{
  "results": [
    { "ticker": "TCS.NS", "name": "Tata Consultancy Services", "pe_ratio": 18, "roe": 19 },
    { "ticker": "INFY.NS", "name": "Infosys", "pe_ratio": 16, "roe": 17 },
    { "ticker": "HDFCBANK.NS", "name": "HDFC Bank", "pe_ratio": 20, "roe": 15 }
  ]
}
```

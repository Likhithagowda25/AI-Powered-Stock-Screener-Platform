# Screener Rule Engine Specification

## 1. Filters / Rules

### 1.1 PEG Ratio
- Description: Filter stocks with PEG ratio below threshold to find undervalued stocks with good growth potential.
- Logic: PEG < 3

### 1.2 Debt
- *Description: Include stocks where company can repay debt in 4 years or less using free cash flow.
- Logic: Debt / FCF < 4

### 1.3 YoY Revenue Growth
- Description: Include companies whose revenue is growing year-over-year.
- Logic: Revenue_YoY > 5%

### 1.4 Buyback Flag
- Description: Include only companies that have announced stock buybacks.
- Logic: buyback_announced = true

### 1.5 Upcoming Earnings
- Description: Include companies with quarterly earnings scheduled in the next 30 days.
- Logic: earnings_next_30d = true

### 1.6 Analyst Target Comparison
- Description: Check if current stock price is below or near the analyst low target to identify potentially undervalued stocks.
- Logic: target_low_diff_pct = (CurrentPrice - TargetLow)/TargetLow * 100
        Include if target_low_diff_pct <= 0


## 2. Table of Fields and Source

| Field Name          | Description                           | Source         |
|---------------------|-------------------------------------- |----------------|
| symbol              | Stock ticker symbol                   | NSE/BSE API    |
| company_name        | Full company name                     | Market API     |
| peg                 | Price/Earnings to Growth ratio        | Computed       |
| debt_to_fcf         | Debt divided by free cash flow        | Computed       |
| target_low_diff_pct | % difference from analyst low target  | Computed       |
| revenue_growth_yoy  | YoY revenue growth %                  | Fundamentals API|
| earnings_next_30d   | Earnings call within next 30 days     | Exchange calendar |
| buyback_announced   | Buyback announced (true/false)        | Corporate Actions API |


## 3. Example Queries & JSON Output

User Query:
  "Show NSE IT stocks with PEG < 3, revenue growth > 5%, buyback announced, earnings in next 30 days"

Rules Applied:
  PEG < 3, Debt/FCF < 4, Revenue_YoY > 5%, buyback_announced = true, earnings_next_30d = true
 
 Sample JSON Output:
  { "symbol": "TCS", "company_name": "Tata Consultancy Services", "peg": 2.4, "debt_to_fcf": 0.22, "target_low_diff_pct": -8, "revenue_growth_yoy": 12.3, "earnings_next_30d": true, "buyback_announced": true }


## Mapping of NLP → DSL fields

User Query: "Show NSE IT stocks with PEG < 3, revenue growth > 5%, buyback announced"

DSL JSON:
{
  "exchange": "NSE",
  "sector": "IT",
  "peg": {"lt": 3},
  "revenue_growth_yoy": {"gt": 5},
  "buyback_announced": true
}

- Rules combine with AND logic by default.
- JSON output ensures frontend consistency.
- This spec guides backend implementation of the screener engine.


# Data Quality Validation Framework

## Overview

The Data Quality Validation Framework ensures that all stock data used in the AI-Powered Mobile Stock Screener is accurate, complete, and reliable. This is essential to guarantee correct screening results, avoid errors, and maintain trust in analytics.

## 1. Field Completeness

Ensure all required fields for screening are populated:

- *Required Fields*: PEG, Debt/FCF, Revenue_YoY, EPS, Price_Target_Low, Buyback_Announced, Next_Earnings_Date
- *Example Check*: If Revenue_YoY is null for a stock, exclude it from the screener or flag for review.

## 2. Data Type Validation

Verify that each field has the correct data type:

| Field | Expected Type | Example |
|-------|---------------|---------|
| PEG | Decimal | 2.5 |
| Debt/FCF | Decimal | 0.8 |
| Revenue_YoY | Percentage | 12.3 |
| Next_Earnings_Date | Date | 2025-12-30 |
| Buyback_Announced | Boolean | true |

## 3. Range Checks

Validate that numeric values are within reasonable limits:

- PEG > 0
- Debt/FCF >= 0
- Revenue_YoY >= 0
- Price_Target_Low > 0

*Example:* A Debt/FCF of -5 would be flagged as invalid.

## 4. Duplicate Records

Remove duplicate stock entries to avoid double-counting in screening:

- *Check*: Unique combination of symbol and date in historical price data
- *Action*: Keep only the latest or correct entry.

## 5. External Validation

Cross-check critical fields with trusted data sources or APIs:

- Compare PEG, Debt/FCF, and Price_Target with a reliable financial API like Yahoo Finance or NSE API.
- Flag discrepancies above a defined threshold for review.

## 6. Implementation Notes 

- Can be implemented in Python during ETL (Extract, Transform, Load) process.
- Each validation step should generate logs and error reports.
- Supports automated quality checks before the data enters the screener engine.


Output of Framework:

- Flagged stocks with missing or invalid data
- Logs for all validation checks
- Clean dataset ready for screening

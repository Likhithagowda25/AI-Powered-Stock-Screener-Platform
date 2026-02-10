# User Portfolio, Watchlist & Alert Subscription Module

## Overview

This module provides backend services for managing user-specific data including:
- **Portfolios**: Track owned stocks with quantities and buy prices
- **Watchlists**: Monitor stocks of interest without ownership data
- **Alert Subscriptions**: Automated notifications based on price, fundamentals, or events

## Database Schema

### Tables Created (V5 Migration)

#### 1. User Portfolios
```sql
user_portfolios
├── portfolio_id (UUID, PK)
├── user_id (UUID, FK → users)
├── name (VARCHAR, unique per user)
├── description (TEXT)
├── is_default (BOOLEAN)
├── currency (VARCHAR)
├── created_at / updated_at (TIMESTAMP)
```

#### 2. Portfolio Holdings
```sql
portfolio_holdings
├── holding_id (UUID, PK)
├── portfolio_id (UUID, FK → user_portfolios)
├── ticker (VARCHAR, unique per portfolio)
├── quantity (NUMERIC)
├── average_buy_price (NUMERIC)
├── buy_date (DATE)
├── notes (TEXT)
├── created_at / updated_at (TIMESTAMP)
```

#### 3. Watchlists
```sql
watchlists
├── watchlist_id (UUID, PK)
├── user_id (UUID, FK → users)
├── name (VARCHAR, unique per user)
├── description (TEXT)
├── is_default (BOOLEAN)
├── created_at / updated_at (TIMESTAMP)
```

#### 4. Watchlist Items
```sql
watchlist_items
├── item_id (UUID, PK)
├── watchlist_id (UUID, FK → watchlists)
├── ticker (VARCHAR, unique per watchlist)
├── added_price (NUMERIC)
├── target_price (NUMERIC)
├── notes (TEXT)
├── created_at (TIMESTAMP)
```

#### 5. Alert Subscriptions
```sql
alert_subscriptions
├── alert_id (UUID, PK)
├── user_id (UUID, FK → users)
├── name (VARCHAR)
├── description (TEXT)
├── ticker (VARCHAR, optional)
├── alert_type (ENUM: price_threshold, price_change, fundamental, event, technical, custom_dsl)
├── condition (JSONB)
├── frequency (ENUM: real_time, hourly, daily, weekly)
├── status (ENUM: active, paused, triggered, expired, deleted)
├── expires_at (TIMESTAMP)
├── last_evaluated_at / last_triggered_at (TIMESTAMP)
├── trigger_count (INTEGER)
├── notify_push / notify_email (BOOLEAN)
├── created_at / updated_at (TIMESTAMP)
```

#### 6. Alert History
```sql
alert_history
├── history_id (UUID, PK)
├── alert_id (UUID, FK → alert_subscriptions)
├── triggered_at (TIMESTAMP)
├── trigger_value (JSONB)
├── message (TEXT)
├── acknowledged (BOOLEAN)
├── acknowledged_at (TIMESTAMP)
```

## API Endpoints

### Portfolio Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/portfolios` | Get all portfolios |
| POST | `/api/v1/portfolios` | Create new portfolio |
| GET | `/api/v1/portfolios/:id` | Get portfolio by ID |
| PUT | `/api/v1/portfolios/:id` | Update portfolio |
| DELETE | `/api/v1/portfolios/:id` | Delete portfolio |
| GET | `/api/v1/portfolios/:id/summary` | Get portfolio summary with values |
| GET | `/api/v1/portfolios/:id/holdings` | Get all holdings |
| POST | `/api/v1/portfolios/:id/holdings` | Add stock to portfolio |
| PUT | `/api/v1/portfolios/:id/holdings/:holdingId` | Update holding |
| DELETE | `/api/v1/portfolios/:id/holdings/:holdingId` | Remove holding |

### Watchlist Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/watchlists` | Get all watchlists |
| POST | `/api/v1/watchlists` | Create new watchlist |
| GET | `/api/v1/watchlists/check/:ticker` | Check if stock is watched |
| GET | `/api/v1/watchlists/:id` | Get watchlist by ID |
| PUT | `/api/v1/watchlists/:id` | Update watchlist |
| DELETE | `/api/v1/watchlists/:id` | Delete watchlist |
| GET | `/api/v1/watchlists/:id/items` | Get all items |
| POST | `/api/v1/watchlists/:id/items` | Add stock to watchlist |
| PUT | `/api/v1/watchlists/:id/items/:itemId` | Update item |
| DELETE | `/api/v1/watchlists/:id/items/:itemId` | Remove item |
| DELETE | `/api/v1/watchlists/:id/items/ticker/:ticker` | Remove by ticker |

### Alert Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/alerts` | Get all alerts (with filters) |
| GET | `/api/v1/alerts/summary` | Get alert statistics |
| POST | `/api/v1/alerts` | Create new alert |
| GET | `/api/v1/alerts/:id` | Get alert by ID |
| PUT | `/api/v1/alerts/:id` | Update alert |
| DELETE | `/api/v1/alerts/:id` | Delete alert (soft) |
| POST | `/api/v1/alerts/:id/enable` | Enable alert |
| POST | `/api/v1/alerts/:id/disable` | Disable alert |
| GET | `/api/v1/alerts/:id/history` | Get trigger history |
| POST | `/api/v1/alerts/:id/history/:historyId/acknowledge` | Acknowledge trigger |

## Alert Condition Format

### Price Threshold Alert
```json
{
  "name": "TCS Price Drop Alert",
  "ticker": "TCS.NS",
  "alert_type": "price_threshold",
  "condition": {
    "operator": "<",
    "value": 3500
  }
}
```

### Price Change Alert
```json
{
  "name": "Daily Price Drop Alert",
  "ticker": "INFY.NS",
  "alert_type": "price_change",
  "condition": {
    "operator": "<",
    "value": -5,
    "period": "1d"
  }
}
```

### Fundamental Alert
```json
{
  "name": "Low PE Stock Alert",
  "alert_type": "fundamental",
  "condition": {
    "field": "pe_ratio",
    "operator": "<",
    "value": 15
  }
}
```

### Event Alert
```json
{
  "name": "Earnings Reminder",
  "ticker": "TCS.NS",
  "alert_type": "event",
  "condition": {
    "event_type": "earnings_date",
    "days_before": 7
  }
}
```

### Between Operator
```json
{
  "condition": {
    "field": "peg_ratio",
    "operator": "between",
    "value": [0.5, 1.5]
  }
}
```

## Supported Fields for Fundamental Alerts

- `price`, `price_change_percent`, `volume`
- `pe_ratio`, `peg_ratio`, `price_to_book`, `price_to_sales`, `ev_to_ebitda`
- `roe`, `roa`, `operating_margin`, `net_margin`
- `revenue_growth_yoy`, `earnings_growth_yoy`, `eps_growth`
- `debt_to_equity`, `debt_to_fcf`, `free_cash_flow`
- `market_cap`, `dividend_yield`, `promoter_holding`
- `price_change_from_52w_high`, `price_change_from_52w_low`

## Supported Operators

- `<`, `>`, `<=`, `>=`, `=`, `!=`
- `between` (requires array [min, max])
- `in`, `not_in` (requires array of values)
- `exists`

## Event Types

- `earnings_date`
- `buyback_announced`
- `dividend_declared`
- `stock_split`

## Rate Limiting

- Maximum 50 alerts created per day per user
- Maximum 100 total active alerts per user

## Validation Rules

1. **Ticker Validation**: All tickers must exist in the `companies` table
2. **Duplicate Prevention**: 
   - Same ticker cannot be added twice to same portfolio/watchlist
   - Same name cannot be used for multiple portfolios/watchlists per user
3. **Default Protection**: Default portfolio/watchlist cannot be deleted
4. **Access Control**: Users can only access their own data
5. **Condition Validation**: Alert conditions are validated based on alert type

## Database Views

- `portfolio_summary`: Aggregated portfolio data with total holdings and investment
- `watchlist_summary`: Aggregated watchlist data with item counts
- `active_alerts_summary`: User alert counts by status

## Running Migrations

```bash
# From project root
psql -h localhost -U your_user -d your_db -f backend/database/migrations/V5__portfolio_watchlist_alerts.sql
```

## Running Tests

```bash
# From api-gateway directory
npm test -- --testPathPattern="portfolio|watchlist|alert"
```

## File Structure

```
backend/api-gateway/src/
├── controllers/
│   ├── portfolioController.js
│   ├── watchlistController.js
│   └── alertController.js
├── services/
│   ├── portfolioService.js
│   ├── watchlistService.js
│   └── alertService.js
├── routes/
│   ├── portfolio.js
│   ├── watchlist.js
│   └── alert.js
├── middleware/
│   ├── portfolioValidator.js
│   ├── watchlistValidator.js
│   └── alertValidator.js
└── routes/index.js (updated)

backend/database/migrations/
└── V5__portfolio_watchlist_alerts.sql
```

## Default Initialization

When a new user is created, the database automatically creates:
- One default portfolio named "My Portfolio"
- One default watchlist named "My Watchlist"

## Acceptance Criteria Checklist

- [x] Users can add/remove stocks from portfolio and watchlist
- [x] Alert subscriptions can be created and managed
- [x] Alert rules are validated and stored correctly
- [x] Users cannot access or modify other users' data
- [x] APIs return consistent and predictable responses
- [x] Portfolio CRUD works correctly
- [x] Watchlist CRUD works correctly
- [x] Alert rules stored in structured format
- [x] Duplicate entries prevented
- [x] Unauthorized access blocked
- [x] API tests provided

## Next Steps for Integration

1. **Alert Execution Engine**: Build background service to evaluate alert conditions
2. **Push Notification Service**: Integrate with FCM/APNs for mobile notifications
3. **Email Service**: Integrate with email provider for email alerts
4. **Frontend Integration**: Connect mobile app to these endpoints
5. **Real-time Updates**: Add WebSocket support for live portfolio/watchlist updates

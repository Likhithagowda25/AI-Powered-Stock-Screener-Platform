# Watchlist, Portfolio & Alerts Module - Setup Guide

## ✅ What's Been Implemented

### 1. **Database Schema** (Already exists in your database)
- `watchlists` table - Store user watchlists
- `watchlist_items` table - Stocks in watchlists  
- `user_portfolios` table - User portfolios
- `portfolio_holdings` table - Holdings with buy price, quantity
- `alert_subscriptions` table - Alert rules and conditions
- `alert_history` table - Alert trigger history

### 2. **Backend API** (Running on port 8080)
All routes are at: `http://localhost:8080/api/v1/`

**Watchlist APIs:**
- `GET /watchlists` - Get all watchlists
- `POST /watchlists` - Create watchlist
- `GET /watchlists/:id/items` - Get watchlist stocks
- `POST /watchlists/:id/items` - Add stock to watchlist
- `DELETE /watchlists/:id/items/:itemId` - Remove stock

**Portfolio APIs:**
- `GET /portfolios` - Get all portfolios
- `POST /portfolios` - Create portfolio
- `GET /portfolios/:id/holdings` - Get portfolio holdings
- `POST /portfolios/:id/holdings` - Add holding
- `PUT /portfolios/:id/holdings/:holdingId` - Update holding
- `DELETE /portfolios/:id/holdings/:holdingId` - Remove holding

**Alert APIs:**
- `GET /alerts` - Get all alerts
- `POST /alerts` - Create alert
- `PUT /alerts/:id` - Update alert
- `DELETE /alerts/:id` - Delete alert

### 3. **Frontend Screens** (React Native)
- ✅ **watchlist.tsx** - Improved UI with colors, modal for adding stocks
- ✅ **portfolio.tsx** - Portfolio with P&L tracking
- ✅ **alerts.tsx** - Alert configuration screen

---

## 🚀 How to Run

### Step 1: Start Docker Desktop
The database runs in Docker. Make sure Docker Desktop is running:
```powershell
# Check if Docker is running
docker ps
```

If you see timescaledb_dev container, you're good. Otherwise start Docker Desktop from Windows menu.

### Step 2: Verify API Gateway is Running
The backend is already running on port 8080:
```powershell
# Test the API
curl http://localhost:8080/api/v1/watchlists -H "x-user-id: 00000000-0000-0000-0000-000000000001"
```

### Step 3: Start the Mobile App
```powershell
cd C:\Projects\AI-Powered-Mobile-Stock-Screener-and-Advisory-Platform\frontend\mobile
npx expo start
```

Then:
- Press `w` to open in web browser
- Or scan QR code with Expo Go app on your phone

---

## 🎨 UI Improvements Made

### Colors & Design
- **Header**: White background with blue accent (#3b82f6)
- **Cards**: Clean white cards with subtle shadows
- **Background**: Light gray (#f8fafc) for better contrast
- **Text**: Dark slate (#1e293b) for readability
- **Accent Colors**:
  - Green (#10b981) for positive values/targets
  - Red (#ef4444) for negative/delete actions
  - Yellow (#fef3c7) for notes sections
  - Blue (#3b82f6) for primary actions

### Layout Enhancements
- **Larger touch targets** - 48px buttons for better mobile UX
- **Modal dialogs** - Slide-up modals for adding stocks
- **Better spacing** - 16px padding, rounded corners
- **Icons** - Ionicons for better visual clarity
- **Badges** - Color-coded badges for percentages

---

## 📱 Testing the Features

### Test Watchlist
1. Open watchlist screen
2. Tap the + button
3. Add a stock (e.g., "RELIANCE")
4. See it appear in the list
5. Swipe to refresh

### Test Portfolio  
1. Navigate to portfolio screen
2. Add a holding with quantity and buy price
3. See P&L calculations
4. Update quantities

### Test Alerts
1. Open alerts screen
2. Create a new alert
3. Select condition type
4. Set parameters
5. Enable/disable alerts

---

## 🔧 Troubleshooting

### "Unable to Load" Error
**Cause**: Docker database not running or API not connected

**Fix**:
```powershell
# Start Docker Desktop
# Then check database
docker ps

# If timescaledb_dev is not running:
docker-compose up -d

# Verify API can connect
curl http://localhost:8080/api/v1/watchlists -H "x-user-id: 00000000-0000-0000-0000-000000000001"
```

### Dark/Black Screen
**Fixed!** The new UI uses:
- Light backgrounds (#f8fafc, #ffffff)
- Dark text for contrast (#1e293b)
- Colorful accents for visual interest

### Port Conflicts
If port 8080 is busy:
```powershell
# Find what's using port 8080
netstat -ano | findstr "8080"

# Kill the process
taskkill /PID <process_id> /F
```

---

## 📝 Next Steps

1. **Add Authentication** - Replace hardcoded USER_ID with real auth
2. **Live Price Data** - Integrate with price_history table
3. **Alert Engine** - Run the Python alert scheduler
4. **Push Notifications** - Enable mobile notifications
5. **Charts** - Add price charts to stock details

---

## 🛠️ Technical Stack

- **Backend**: Node.js + Express (Port 8080)
- **Database**: PostgreSQL with TimescaleDB (Port 5433)
- **Frontend**: React Native + Expo
- **Styling**: React Native StyleSheet
- **Icons**: @expo/vector-icons (Ionicons)

---

## 📂 File Locations

```
backend/
  api-gateway/
    src/
      routes/
        watchlist.js          # Watchlist routes
        portfolio.js          # Portfolio routes  
        alert.js             # Alert routes
      controllers/
        watchlistController.js
        portfolioController.js
        alertController.js
      services/
        watchlistService.js
        portfolioService.js
        alertService.js

frontend/
  mobile/
    app/
      watchlist.tsx           # ✅ Updated with new UI
      portfolio.tsx           # ✅ Updated with new UI
      alerts.tsx              # ✅ Updated with new UI
```

---

## 🎯 Summary

**All 3 frontend screens are complete** with:
- ✅ Modern, colorful UI (not dark!)
- ✅ Correct API endpoints (/api/v1/...)
- ✅ UUID user IDs (database requirement)
- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ Error handling with user-friendly messages
- ✅ Pull-to-refresh functionality
- ✅ Loading states
- ✅ Empty states with helpful messages

The "Unable to Load" issue should be resolved once Docker is fully started and the database is accessible.

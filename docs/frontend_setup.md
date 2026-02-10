## Purpose
This document explains how to run and verify the Mobile Frontend Skeleton & Navigation Foundation module.  
This frontend is a placeholder UI that validates the end-to-end flow (UI → API → Results) and provides a scalable base for future features like authentication, watchlists, portfolios, alerts, and company details.

This module does NOT include:
- Authentication logic
- Live backend integration
- Final UI/UX design

It ONLY ensures:
- App runs successfully
- Navigation works
- Placeholder screens render correctly

---

## Prerequisites
Ensure the following are installed on your system:
- Node.js (v18 or above recommended)
- npm (comes with Node.js)
- Expo CLI (installed automatically via npx)
- A browser (for Expo Web) OR Android Emulator / iOS Simulator

---

## Running the Application

1. Navigate to the mobile frontend directory:
```bash
cd frontend/mobile

Install dependencies (if not already installed):
Copy code
Bash
npm install
Start the Expo development server (clear cache recommended):
Copy code
Bash
npx expo start -c
After the server starts, choose one option:
Press w → Run on Web (opens in browser)
Press a → Run on Android Emulator
Press i → Run on iOS Simulator (Mac only)

Give this in one markdown file
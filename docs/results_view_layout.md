# Results View Layout Design

## Presentation Style

**Decision: Card-based List (Mobile-friendly)**

Rationale:
- Cards provide clear visual separation between stock results
- Better touch targets for mobile devices
- Allows for flexible content layout within each card
- More scannable than traditional table rows on small screens
- Supports gradient backgrounds and shadows for depth

Alternative considered: Table-style rows were rejected because they are less mobile-friendly and harder to read on small screens.

## Visual Hierarchy

### Level 1: Company Identity (Most Prominent)
Located at the top of each card:
- Company name: Large, bold text (fontSize: 16, fontWeight: 700)
- Ticker symbol: Highlighted badge with primary color background
- Visual accent: Left border (3px) in primary color for quick scanning

### Level 2: Key Metrics (Prominently Displayed)
Two-column layout for efficient space usage:

**Column 1:**
- Market Cap
- P/E Ratio
- P/B Ratio
- ROE

**Column 2:**
- ROA
- Revenue
- EPS
- Operating Margin

All metrics use consistent formatting:
- Label: Small, secondary color (fontSize: 11, fontWeight: 600)
- Value: Bold, primary text color (fontWeight: 700)

### Level 3: Visual Separators
- Horizontal divider between company info and metrics
- Vertical spacing between metric rows
- Card elevation using shadows for depth

## Layout Structure

```
┌─────────────────────────────────────┐
│ [Card]                              │
│ ┌─────────────────────────────────┐ │
│ │ Company Name          [Badge]   │ │ ← Level 1
│ │ TICKER                          │ │
│ ├─────────────────────────────────┤ │
│ │ Market Cap    │    ROA          │ │
│ │ P/E Ratio     │    Revenue      │ │ ← Level 2
│ │ P/B Ratio     │    EPS          │ │
│ │ ROE           │    Op. Margin   │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## Spacing & Sizing

Based on constants from `frontend/mobile/constants/colors.js`:

- Card padding: SPACING.md
- Card margin bottom: SPACING.md
- Card border radius: RADIUS.md
- Gap between columns: SPACING.lg
- Gap between metrics: SPACING.xs
- Gap in company info: SPACING.xs

## Responsive Design

Mobile-friendly features:
- FlatList with vertical scrolling
- Full-width cards (minus padding)
- Touch-friendly spacing
- No horizontal scrolling required
- Consistent card heights
- All text properly truncated (numberOfLines={1} for company name)

## Color & Theming

Supports light and dark mode:
- Card background: theme.surface
- Text primary: theme.textPrimary
- Text secondary: theme.textSecondary
- Border accent: theme.primary
- Divider: theme.border

## Typography

Uses consistent type scale:
- Company name: TYPOGRAPHY.body with custom fontSize
- Ticker: TYPOGRAPHY.caption
- Metric labels: TYPOGRAPHY.caption
- Metric values: TYPOGRAPHY.bodySmall

## Current Implementation

Location: `frontend/mobile/screens/ResultsScreen.js`

Key components:
- `renderStockCard`: Renders individual card for each stock
- `renderMetricRow`: Renders label-value pairs for metrics
- `formatNumber`: Formats large numbers (divides by 1000 for crores)

The layout uses React Native FlatList for efficient rendering of multiple cards.

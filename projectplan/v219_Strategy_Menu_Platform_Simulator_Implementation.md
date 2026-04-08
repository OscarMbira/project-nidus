# v219: Strategy Menu – Platform & Simulator Implementation

## Overview
Implements the full Strategy section (circled in the sidebar) for both Platform and Simulator: Strategic Objectives, Strategic Alignment, Strategic Contribution, Strategic Portfolio, Strategic Reports.

## Completed Tasks

### 1. Platform strategy sub-routes
- **App.jsx**: Added lazy imports for `StrategicObjectives`, `StrategicAlignment`, `StrategicContribution`, `StrategicPortfolio`, `StrategicReports`.
- **Routes** (under `platform/*`):
  - `strategy/objectives` → StrategicObjectives
  - `strategy/alignment` → StrategicAlignment
  - `strategy/contribution` → StrategicContribution
  - `strategy/portfolio` → StrategicPortfolio
  - `strategy/portfolio/:portfolioId` → StrategicPortfolio (with URL param)
  - `strategy/reports` → StrategicReports

### 2. strategicService.js
- Replaced all `supabase` usage with `platformDb` so strategy module uses the public schema client consistently.

### 3. pmMenuConfig.js
- Updated Strategy children to match sidebar: Strategy Dashboard, Strategic Objectives, Strategic Alignment, Strategic Contribution, Strategic Portfolio, Strategic Reports (removed OKR Management).

### 4. Simulator strategy
- **SQL (v297_simulator_strategy_menu.sql)**:
  - Inserted `sim_strategy` parent and 5 children: `sim_strategy_objectives`, `sim_strategy_alignment`, `sim_strategy_contribution`, `sim_strategy_portfolio`, `sim_strategy_reports` with `route_path` `/simulator/strategy/*`.
  - Granted role-menu access to any role that has platform strategy access.
- **Sidebar.jsx**:
  - Filter menu by context: when `pathname.startsWith('/simulator')` show only items with `route_path.startsWith('/simulator')`; otherwise show only `route_path.startsWith('/platform')`.
  - Added `TrendingUp` icon and `'trending-up'` in iconMap for simulator strategy menu.
- **App.jsx**: Added simulator routes: `simulator/strategy`, `simulator/strategy/objectives`, `simulator/strategy/alignment`, `simulator/strategy/contribution`, `simulator/strategy/portfolio`, `simulator/strategy/portfolio/:portfolioId`, `simulator/strategy/reports`, each rendering the same Strategy components inside `Layout` with `ProtectedRoute requiredPlatform="simulator"`.

### 5. Component fixes
- **StrategicPortfolioView.jsx**: Switched from `supabase` to `platformDb` for portfolio/portfolios queries.
- **StrategicPortfolio.jsx**: Uses `useParams()` to read `portfolioId` from URL for direct links to `strategy/portfolio/:portfolioId`.

## Files Changed
- `src/App.jsx` – lazy imports, platform strategy routes, simulator strategy routes
- `src/config/pmMenuConfig.js` – Strategy children list
- `src/services/strategicService.js` – platformDb everywhere
- `src/components/Sidebar.jsx` – context filter, TrendingUp icon
- `src/components/strategy/StrategicPortfolioView.jsx` – platformDb
- `src/pages/StrategicPortfolio.jsx` – useParams for portfolioId
- `SQL/v297_simulator_strategy_menu.sql` – new (simulator strategy menu + role grants)

## Database
- Run **v297_simulator_strategy_menu.sql** in Supabase (public schema) to create simulator Strategy menu items and grant access to roles that have platform strategy.

## Review
- Platform: Strategy and all 5 sub-items are reachable at `/platform/strategy`, `/platform/strategy/objectives`, etc. Existing DB menu_items (v37/v140) already use `/platform/strategy/*` routes.
- Simulator: Same 5 features at `/simulator/strategy/*`; sidebar shows Strategy only when on simulator; same components and data (platformDb) for parity.
- No new tables; only menu_items and role_menu_items for simulator. Strategy data remains in public schema for both contexts.

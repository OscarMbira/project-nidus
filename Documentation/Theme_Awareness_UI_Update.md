# Theme awareness (light / dark) — UI update

## Summary

The app uses Tailwind’s `dark` class on `document.documentElement` (see `ThemeContext`). Components should pair light defaults with `dark:` variants so the chosen theme applies consistently.

## Changes (April 2026)

1. **Headers** (`SystemHeader`, `PlatformAppHeader`, `SimulatorAppHeader`): Light header surfaces (`bg-white` / `bg-white` + Simulator dark purple), theme-aware nav link styles, borders, and mobile menu panels.
2. **Platform dashboard** (`Dashboard.jsx`): Page shell, loading and empty states, memoized header, suspense loaders — `bg-gray-50 dark:bg-gray-900` and matching text colours.
3. **Executive Summary & PMO tabs**: Cards, typography, and tab bar use light/dark pairs.
4. **PMO entity panels** (Portfolio / Programmes / Projects tabs): Search fields, tables, and sort controls use theme-aware colours.
5. **Sidebar** (`Sidebar.jsx`): When `sidebar_bg_color` branding is not set, default `bg-white dark:bg-gray-900`.
6. **Dashboard widgets** (`src/components/app/dashboard/*`): Card shells, headings, KPI tints, modals, and several form controls updated for light and dark.
7. **Broad page shells**: `min-h-screen bg-gray-900` was replaced with `min-h-screen bg-gray-50 dark:bg-gray-900` across many `src/pages` files so non-dashboard routes match the selected theme at the layout level.

## Follow-up

Individual pages may still contain inner blocks (e.g. `text-white` only) that should be adjusted when those screens are edited next. Prefer `text-gray-900 dark:text-white` (or equivalent) for primary text on neutral surfaces.

# v1150 — Currency dropdowns: hardcoded list → DB-backed `currencies` table

## Problem

Reported from the Resource edit form's Cost tab: the Currency dropdown was a hardcoded
`<select>` with 6 fixed options (USD/EUR/GBP/JPY/CAD/AUD) — a violation of CLAUDE.md rule
25.1 (no hardcoded dropdown lists; must read from a DB table, same pattern as `countries`
under rule 15). Investigation found the same `CURRENCY_OPTIONS` constant (16 hardcoded
currencies) also feeding the Currency field on **Regional & Format Settings** (rule 68),
plus a separate hardcoded `CURRENCIES` array (7 currencies) on Portfolio Financial — three
independent hardcodings of the same data, none DB-backed, unlike `countries` which already
followed the correct pattern.

## Fix

1. **New `currencies` table** (`SQL/v1161_create_currencies_table.sql`) — mirrors the
   existing `countries` table exactly: `code`/`name`/`symbol`/`decimal_places`/`is_active` +
   standard audit fields, same RLS policies (authenticated + anon read active rows, admin-only
   write), registered in `database_tables`. Seeded with full ISO 4217 coverage; the
   previously-hardcoded 16-currency set is marked `is_active = true`, the rest inactive (same
   seeding pattern as `countries`'s 50-active-of-~250 split).
2. **Resource form Cost tab** (`ResourceForm.jsx`, both apps) — currency `<select>` replaced
   with a DB-fetched, searchable `SelectField` (rule 69: the active list already exceeds the
   12-option threshold). Simulator's copy had not yet received the earlier tabs restructuring
   from this session either — brought fully into parity (tabs + currency fix) in one pass.
3. **Regional & Format Settings** (`RegionalFormatFields.jsx`, both apps) — `currency_code`
   field switched from the static `CURRENCY_OPTIONS` import to a DB fetch, following the exact
   same pattern the `country_code` field already used (`platformDb.from('currencies')`,
   searchable/combobox enabled, org-default label resolution updated).
4. **Portfolio Financial** (`PortfolioFinancial.jsx` / `SimPortfolioFinancial.jsx`) — the
   modal's Currency field switched to the same DB-fetched `SelectField`; Platform's filter-bar
   currency dropdown (a lighter affordance, not a data-entry field) now sources its option
   list from the DB too, left as a native `<select>` since it's a generic shared filter-row
   renderer across 4 filter kinds.
5. **Removed the now-dead `CURRENCY_OPTIONS` export** from both apps' `utils/
   regionalFormatConstants.js` (only consumer was `RegionalFormatFields.jsx`, confirmed via
   grep before removal).

## Why `currencies` is read via `platformDb` from both apps

Confirmed `countries` is already treated as a cross-cutting reference table: Simulator's own
`RegionalFormatFields.jsx` reads it via `platformDb` (not `simDb`), not `sim.countries`. Pure
reference/lookup data is exempt from the public/sim schema separation that applies to project
data. `currencies` follows the identical precedent — one `public.currencies` table, read by
both apps via `platformDb`.

## Verification

All 8 touched files (`ResourceForm.jsx` ×2, `RegionalFormatFields.jsx` ×2,
`PortfolioFinancial.jsx`/`SimPortfolioFinancial.jsx`, `regionalFormatConstants.js` ×2)
syntax-checked clean via `esbuild --jsx=automatic`.

**Not yet run**: the SQL migration itself (`v1161_create_currencies_table.sql`) — needs to be
executed against Supabase before any of the frontend changes will show real data (until then,
the dropdowns will render empty, same as any DB-backed dropdown before its migration runs).

## Remaining hardcoded currency lists not touched

A scan for `CURRENCY_OPTIONS` and the literal `CURRENCIES` array name turned up no other
hits in `apps/platform` or `apps/simulator`. Not exhaustively re-grepped for every possible
inline currency enum (e.g. a one-off `['USD','EUR']` with no named constant) — if another
surfaces, same fix pattern applies: fetch from `currencies` via `platformDb`, render through
`SelectField`.

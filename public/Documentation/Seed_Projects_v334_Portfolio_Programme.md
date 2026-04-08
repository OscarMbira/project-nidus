# Seed script v334 — projects, portfolios, programmes (max 30)

## File
`SQL/v334_seed_platform_projects_portfolio_programme_dev.sql`

## What it creates
| Item | Codes | Notes |
|------|--------|--------|
| Portfolios | `SEED334-PORT-01` … `03` | Named themes (e.g. digital & payments, infrastructure, innovation lab) |
| Programmes | `SEED334-PROG-01` … `03` | 01→PORT-01, 02→PORT-02, 03 standalone (no portfolio); realistic programme titles |
| Projects | `SEED334-PRJ-01` … `30` | **30** distinct titles and descriptions (industry-style samples) |

### Linking (by project suffix)
- **01–09** — `portfolio_projects` only (rotates P1→P2→P3)
- **10–18** — `programme_projects` only (rotates PROG-01→02→03)
- **19–22** — **both** `portfolio_projects` and `programme_projects`
- **23–30** — **standalone** (no portfolio or programme links)

## Organisation & My Projects
- Uses the **first active** row in `public.accounts` (`is_deleted = false`, `is_active = true`).
- Sets `projects.account_id` and `owner_user_id` to that account’s **owner** (with user fallback).
- Inserts **`user_projects`** for that user on all `SEED334-PRJ-*` projects so **My Projects** shows them.

## How to run
1. Open Supabase **SQL Editor** (or `psql` against your DB).
2. Paste and run `v334_seed_platform_projects_portfolio_programme_dev.sql`.

## Idempotency & refresh
- **Portfolios / programmes:** `ON CONFLICT … DO UPDATE` refreshes names and descriptions.
- **Projects:** existing `SEED334-PRJ-*` rows are **updated in place** (same codes; avoids global `project_code` uniqueness issues). New codes are **inserted** if missing.
- **Links:** `portfolio_projects` / `programme_projects` rows for these project codes are **removed and reapplied** each run so the portfolio/programme pattern stays correct.

## Trial / subscription rules
If your database enforces **one trial project per organisation**, inserting 30 projects may **fail** after the first project. Options: use a **paid/test** organisation, temporarily adjust enforcement, or run under policies that allow seeding.

## Related
- Larger sample: `SQL/v305_seed_portfolio_programme_projects_stakeholders.sql` (different codes).

# v478 — `change_requests` grants and RLS (review)

## Problem

PostgREST returned `permission denied for table change_requests` on Platform Dashboard (executive alerts and extended PMO metrics), because `authenticated` had no table privileges on `public.change_requests`.

## Change

- **File:** `SQL/v478_change_requests_grants_and_dashboard_rls.sql`
- **Actions:**
  - `GRANT SELECT, INSERT, UPDATE, DELETE` on `public.change_requests` to `authenticated` and `service_role`.
  - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
  - Policies aligned with `issues` (v175): team visibility + PMO/System Admin; INSERT/UPDATE for members who can manage records.
  - Extra SELECT policies (same idea as v477 for `issues`): account owner and project manager scope for PMO dashboard reads.

## Todo (deployment)

- [ ] Run `SQL/v478_change_requests_grants_and_dashboard_rls.sql` in **Supabase → SQL Editor**.
- [ ] Reload `/platform/dashboard` and confirm executive alerts and extended metrics load without `change_requests` errors.

## Date

2026-04-19

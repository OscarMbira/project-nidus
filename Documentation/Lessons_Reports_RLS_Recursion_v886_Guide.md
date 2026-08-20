# Lessons Reports RLS recursion (v886)

## Error

On Lessons Log (Reports widget / list):

```text
infinite recursion detected in policy for relation "lessons_reports"
```

HTTP 500 on `GET .../rest/v1/lessons_reports?...` (PostgreSQL `42P17`).

## Cause

v204 SELECT on `lessons_reports` checked `lessons_report_distribution`.  
Distribution SELECT checked `lessons_reports`. That cycle triggers infinite RLS recursion.

## Fix

Apply in Supabase SQL Editor:

`SQL/v886_fix_lessons_reports_rls_recursion.sql`

- Adds `user_is_lessons_report_distribution_recipient(uuid)` (`SECURITY DEFINER`) so recipient checks do not re-enter RLS.
- Rewrites `policy_lessons_reports_auth_select` with membership + admin + author + that helper (no plain subquery on distribution).

Refresh Lessons Log after applying. Empty “No reports created yet” is normal when no rows exist; the console should no longer show `42P17`.

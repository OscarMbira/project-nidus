-- ============================================================================
-- v555 DIAGNOSTIC: invitation RPC visibility (run in Supabase SQL Editor)
-- ============================================================================
-- Use when the browser shows POST …/rpc/insert_project_invitation_as_pmo_admin → 404
-- but you are unsure whether the function exists or grants/cache are wrong.
-- Paste all result grids into your ticket or compare with a known-good environment.
--
-- If query (2) shows EXECUTE for `authenticated` but the app still gets HTTP 404:
--   · Confirm SQL Editor project URL hostname matches VITE_SUPABASE_URL in the web app.
--   · Ensure overload_count below is exactly 1 (multiple overloads confuse PostgREST).
--   · Pause/resume the Supabase project (restarts PostgREST) after NOTIFY.
-- In dev, after RPC HTTP 404 the app logs PostgREST OpenAPI probe `rpcListed`:
--   false → API/schema cache or wrong Project URL vs SQL Editor; true → rare overload/param mismatch.
-- ============================================================================

-- 1) Function exists + schema + exact signature (identity args)
SELECT
  n.nspname AS schema,
  p.proname AS name,
  pg_get_function_identity_arguments(p.oid) AS identity_args,
  p.prosecdef AS security_definer,
  p.provolatile AS volatility
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'insert_project_invitation_as_pmo_admin';

-- 1b) Overload count in public (expect exactly 1)
SELECT COUNT(*)::int AS overload_count
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'insert_project_invitation_as_pmo_admin';

-- 2) EXECUTE grants (PostgREST calls as role `authenticated` with JWT)
SELECT
  routine_schema,
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'insert_project_invitation_as_pmo_admin';

-- 3) Companion helper used by the RPC body
SELECT
  n.nspname AS schema,
  p.proname AS name,
  pg_get_function_identity_arguments(p.oid) AS identity_args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'is_user_pmo_admin';

SELECT
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'is_user_pmo_admin';

-- 4) Ask PostgREST to reload (safe to run; may fix stale schema cache)
NOTIFY pgrst, 'reload schema';

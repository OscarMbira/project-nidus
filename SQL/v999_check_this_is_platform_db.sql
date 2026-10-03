-- ============================================================================
-- Quick check: is this the Platform app database?
-- ============================================================================
-- A working Project Nidus Platform DB should show OK for the core tables below.
-- If most are MISSING, you are in the wrong Supabase project — do not keep
-- applying v906/v920/v999 here. Open the project that matches the app's
-- VITE_SUPABASE_URL, then re-run only v999 (or the diagnose script).
-- ============================================================================

SELECT
  CASE WHEN to_regclass('public.users') IS NULL THEN 'MISSING' ELSE 'OK' END AS users,
  CASE WHEN to_regclass('public.accounts') IS NULL THEN 'MISSING' ELSE 'OK' END AS accounts,
  CASE WHEN to_regclass('public.projects') IS NULL THEN 'MISSING' ELSE 'OK' END AS projects,
  CASE WHEN to_regclass('public.menu_items') IS NULL THEN 'MISSING' ELSE 'OK' END AS menu_items,
  CASE WHEN to_regclass('public.project_roles') IS NULL THEN 'MISSING' ELSE 'OK' END AS project_roles,
  CASE WHEN to_regclass('public.roles') IS NULL THEN 'MISSING' ELSE 'OK' END AS roles,
  CASE WHEN to_regclass('public.industry_categories') IS NULL THEN 'MISSING' ELSE 'OK' END AS industry_categories,
  CASE WHEN to_regclass('public.industry_packs') IS NULL THEN 'MISSING' ELSE 'OK' END AS industry_packs;

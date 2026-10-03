-- ============================================================================
-- SUPERSEDED — do not run this file
-- ============================================================================
-- Use SQL/v1004_fin_dress_rehearsal_strategy_fix.sql instead.
-- That script copies Security Testing pack links + role grants and fails hard
-- if the Banking sidebar wire-up is incomplete.
-- ============================================================================

DO $$
BEGIN
  RAISE EXCEPTION
    'v1003_fin_dress_rehearsal_strategy.sql is superseded. '
    'Run SQL/v1004_fin_dress_rehearsal_strategy_fix.sql in the Platform Supabase SQL Editor.';
END $$;

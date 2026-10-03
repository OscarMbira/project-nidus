-- ============================================================================
-- SUPERSEDED — do not run this file
-- ============================================================================
-- Use SQL/v1002_fin_testing_strategy_and_sanity_checks_fix.sql instead.
--
-- This v1001_fin_* script could abort when public.grant_menu_role_group() is
-- missing (transaction rollback → no visible sidebar change). v1002 is
-- idempotent, copies SIT role grants, and wires industry_pack_menu_items
-- without depending on that helper.
--
-- Note: SQL/v1001_backfill_and_prevent_missing_account_template_sync.sql is a
-- different feature that also used the v1001 number — keep that file as-is.
-- ============================================================================

DO $$
BEGIN
  RAISE EXCEPTION
    'v1001_fin_testing_strategy_and_sanity_checks.sql is superseded. '
    'Run SQL/v1002_fin_testing_strategy_and_sanity_checks_fix.sql instead.';
END $$;

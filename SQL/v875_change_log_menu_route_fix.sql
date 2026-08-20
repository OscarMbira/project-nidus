-- =============================================================================
-- v875: Document / ensure Change Log menu path matches shell route
-- Background: v681 set plat_pm_change_log.route_path = '/platform/change', but
--   the React app only registered 'change-log'. The shell now serves
--   ChangeLogPage on both /platform/change and /platform/change-log.
-- This script keeps the DB path on /platform/change (idempotent).
-- =============================================================================

UPDATE public.menu_items
SET
  route_path = '/platform/change',
  updated_at = NOW()
WHERE menu_code = 'plat_pm_change_log'
  AND COALESCE(is_deleted, false) = false
  AND route_path IS DISTINCT FROM '/platform/change';

DO $$
BEGIN
  RAISE NOTICE 'v875: plat_pm_change_log route_path = /platform/change (shell aliases change-log)';
END $$;

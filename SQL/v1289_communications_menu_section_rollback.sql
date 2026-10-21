-- ============================================================================
-- v1289 rollback: remove the Communications sections from the sidebar
-- ============================================================================
-- 1. Hides the new Platform section and its pages (rows kept, so a re-run of v1289 restores them).
-- 2. Puts the Simulator v571 comms pages back as loose items (their v571 section no longer exists)
--    and hides the new Simulator section row.
-- 3. Reactivates the rows v1289 deactivated. Paste the codes from the v1289 NOTICE
--    ("deactivated superseded comms rows: …") into v_codes below; only those are reactivated.
-- The role grants v1289 added are left in place (harmless while the rows are hidden).
-- ============================================================================

UPDATE public.menu_items
SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
WHERE menu_code IN (
  'plat_pm_communications', 'plat_pm_comms_hub', 'plat_pm_comms_messages', 'plat_pm_comms_direct',
  'plat_pm_comms_summaries', 'plat_pm_comms_pending_review', 'sim_pm_communications'
);

UPDATE public.menu_items
SET parent_menu_id = NULL, menu_level = 1, updated_at = NOW()
WHERE menu_code IN (
  'sim_pm_comms_hub', 'sim_pm_comms_channels', 'sim_pm_comms_direct',
  'sim_pm_comms_meetings', 'sim_pm_comms_summaries', 'sim_pm_comms_pending_review'
);

DO $$
DECLARE
  -- Example: ARRAY['plat_grp_tm_comms', 'plat_tm_messages', 'plat_tm_direct_msgs', 'sim_tm_comms']
  v_codes TEXT[] := ARRAY[]::TEXT[];
BEGIN
  UPDATE public.menu_items
  SET is_active = TRUE, is_visible = TRUE, updated_at = NOW()
  WHERE menu_code = ANY (v_codes);
  RAISE NOTICE 'v1289 rollback: reactivated % row(s)', array_length(v_codes, 1);
END $$;

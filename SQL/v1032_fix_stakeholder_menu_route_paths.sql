-- ============================================================================
-- v1032: Fix stale route_path on Stakeholder menu leaves (pre-existing bug,
-- unrelated to this session's own work — same class as v1023/v1025's fixes)
-- ============================================================================
-- Live audit: taxonomy §3 Stakeholders branch is already fully built —
--   - Register: stakeholder_type (Internal/External), email/phone (Contact Details),
--     role fields — StakeholderRegisterPage.jsx
--   - Engagement Assessment: power_level/interest_level (Influence/Interest) on
--     Stakeholder Analysis; current_level/desired_level/engagement_strategy on
--     Assessment Matrix — split across two existing pages, not a gap
--   - Communications: target_audience/communication_channel/frequency +
--     "Communication history (last 5)" on StakeholderProfile.jsx — CommunicationPlan.jsx
--
-- v681_menu_revamp_platform_hierarchy.sql set two of the five leaves' route_path
-- to values that don't match any registered route:
--   plat_pm_stkh_comms  -> '/platform/stakeholders/communication'   (route is .../communications, plural)
--   plat_pm_stkh_assess -> '/platform/stakeholders/assessment'      (route is .../assessment-matrix)
-- Both silently rendered a blank page when clicked.
-- ============================================================================

UPDATE public.menu_items SET route_path = '/platform/stakeholders/communications', updated_at = NOW()
WHERE menu_code = 'plat_pm_stkh_comms' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items SET route_path = '/platform/stakeholders/assessment-matrix', updated_at = NOW()
WHERE menu_code = 'plat_pm_stkh_assess' AND COALESCE(is_deleted, FALSE) = FALSE;

-- plat_pm_stkh_matrix ("Power/Interest Matrix") shares the same broken route and the same
-- destination page as plat_pm_stkh_assess — fix it too in case it's still active anywhere,
-- even though it doesn't currently appear in the live sidebar (likely deduped already).
UPDATE public.menu_items SET route_path = '/platform/stakeholders/assessment-matrix', updated_at = NOW()
WHERE menu_code = 'plat_pm_stkh_matrix' AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1032: Stakeholder Communication Plans / Assessment Matrix route_path fixed';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, route_path FROM public.menu_items
--   WHERE menu_code IN ('plat_pm_stkh_register','plat_pm_stkh_analysis','plat_pm_stkh_engagement','plat_pm_stkh_comms','plat_pm_stkh_matrix','plat_pm_stkh_assess');

-- ============================================================================
-- v1041: Fix stale OKR route_paths — /pmo/okr* never existed as a registered route
-- ============================================================================
-- User report: clicking "Strategy & OKRs" (Cross-Framework) redirected to /pm/dashboard
-- instead of showing OKR content — same stale-route-path bug class as Business Case (v1023),
-- Schedule (v1029), Stakeholders (v1032): a granted menu item pointing at an unmatched route
-- falls through to the catch-all/smart-redirect cascade.
--
-- Root cause (confirmed via route registration search, not guesswork): /pmo/okr, /pmo/okr/
-- objectives, /pmo/okr/alignment, /pmo/okr/check-ins are NOT registered anywhere in
-- platformRoutes.jsx. The real, working OKR implementation
-- (apps/platform/src/pages/okr/OkrDashboardPage.jsx + OkrObjectiveListPage/OkrCycleListPage/etc.)
-- is registered by modules/pmis-gaps/routes/PmisGapRoutes.jsx at /pm/okr, /pm/okr/objectives,
-- /pm/okr/alignment, /pm/okr/checkins (no hyphen) — the old page these menu items were built
-- against (apps/platform/src/modules/pmis-gaps/pages/OKRDashboardPage.jsx, since deleted) was
-- superseded by this richer implementation, but the menu_items rows were never updated to match.
--
-- Fixes BOTH generations that share this dead-route problem:
--   plat_xf_okr        "Strategy & OKRs" leaf, under Cross-Framework (22 grants — what the user
--                       actually clicked)
--   plat_okr_dashboard/plat_okr_objectives/plat_okr_alignment/plat_okr_checkins — the "Strategy
--     & OKRs" GROUP variant under the "Platform" infrastructure wrapper (plat_grp_okr)
-- ============================================================================

UPDATE public.menu_items SET route_path = '/pm/okr', updated_at = NOW()
WHERE menu_code = 'plat_xf_okr' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items SET route_path = '/pm/okr', updated_at = NOW()
WHERE menu_code = 'plat_okr_dashboard' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items SET route_path = '/pm/okr/objectives', updated_at = NOW()
WHERE menu_code = 'plat_okr_objectives' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items SET route_path = '/pm/okr/alignment', updated_at = NOW()
WHERE menu_code = 'plat_okr_alignment' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items SET route_path = '/pm/okr/checkins', updated_at = NOW()
WHERE menu_code = 'plat_okr_checkins' AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1041: 5 stale /pmo/okr* route_paths repointed to the real /pm/okr* routes';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, route_path, is_active
--   FROM public.menu_items
--   WHERE menu_code IN ('plat_xf_okr', 'plat_okr_dashboard', 'plat_okr_objectives', 'plat_okr_alignment', 'plat_okr_checkins');
--   -- expect all 5 route_path values starting with /pm/okr, none starting with /pmo/okr.

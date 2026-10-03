-- ============================================================================
-- v1023: Fix stale route_path on legacy Project Setup leaves (Brief, Business
-- Case, PIDs) — pre-existing bug surfaced by the v1020 Project Setup expansion
-- ============================================================================
-- User reported clicking Project Brief / Business Case / Project Initiation
-- Documents (PIDs) in the Project Setup sidebar (as a "Project Manager"
-- pm-layout user) silently lands back on /pm/dashboard.
--
-- Root cause: these 3 menu_items (all created/re-parented by v981, unrelated
-- to this session's own v1020-v1022 work) still carry route_path values from
-- an earlier routing scheme that no longer match any registered React Router
-- path:
--   - plat_pm_s_brief:         stored '/platform/brief'                -- no such route exists
--   - plat_pm_s_business_case: stored '/pmo/initiation/business-case'  -- exists, but is the
--                               PMO-role variant (BusinessCaseListPage) -- a pm-layout user hitting
--                               a pmo/* route gets redirected back to their own dashboard.
--   - plat_s_pids:             stored '/platform/initiation/pids'      -- no such route exists
--
-- The actual pm-layout-appropriate routes, confirmed live in
-- apps/platform/src/routes/platformRoutes.jsx right alongside "pm/dashboard"
-- itself (same <Route> block, same ProtectedRoute/PMLayout wrapper):
--   pm/initiation/project-brief -> PMInitiationProjectBrief
--   pm/initiation/business-case -> PMInitiationBusinessCase
--   pm/initiation/pid           -> PMInitiationPID
-- ============================================================================

UPDATE public.menu_items
SET route_path = '/pm/initiation/project-brief', updated_at = NOW()
WHERE menu_code = 'plat_pm_s_brief' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET route_path = '/pm/initiation/business-case', updated_at = NOW()
WHERE menu_code = 'plat_pm_s_business_case' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET route_path = '/pm/initiation/pid', updated_at = NOW()
WHERE menu_code = 'plat_s_pids' AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1023: plat_pm_s_brief / plat_pm_s_business_case / plat_s_pids route_path fixed to pm/initiation/*';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, route_path FROM public.menu_items
--   WHERE menu_code IN ('plat_pm_s_brief', 'plat_pm_s_business_case', 'plat_s_pids', 'plat_pm_s_mandate');
--   -- expect route_path = '/pm/initiation/project-brief', '/pm/initiation/business-case',
--   -- '/pm/initiation/pid' respectively (plat_pm_s_mandate untouched, for comparison).

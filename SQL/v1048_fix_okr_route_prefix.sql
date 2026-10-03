-- ============================================================================
-- v1048: Fix OKR route_path values — v1041 repointed them to the bare /pm/okr*,
-- /pmo/okr* paths, but those are NOT the real reachable URLs
-- ============================================================================
-- Found while auditing the Procurement menu (2026-09-11): PmisGapRouteElements() registers
-- "pm/okr", "pm/okr/objectives", etc. as RELATIVE routes nested inside the shell's single
-- <Route path="platform/*"> block's own <Routes> (apps/platform/src/routes/platformRoutes.jsx).
-- React Router resolves relative child routes against the parent match, so these actually live
-- at /platform/pm/okr, /platform/pmo/okr/objectives, etc. — NOT the bare /pm/okr* v1041 set.
-- This is the exact same bug class fixed for the Governance approval routes in SQL/v1047 (and in
-- code for a whole other block of routes, see platformRoutes.jsx's and PmisGapRoutes.jsx's v675/
-- v963 route registrations) — a granted menu item pointing at an unmatched URL falls through to
-- the app's top-level catch-all and hard-redirects to "/", reloading the whole app.
--
-- plat_xf_okr is the PM-layout item (v1041's own comment: "22 grants — what the user actually
-- clicked") — repointed to the PM-flavored, wrapPmOutlet-wrapped /platform/pm/okr route.
--
-- plat_okr_dashboard/plat_okr_objectives/plat_okr_alignment/plat_okr_checkins sit under
-- plat_grp_okr, part of the "Platform" infrastructure wrapper — confirmed PMO/admin-tier-only in
-- this same audit session (Template Library / OKR-Strategy / Process Group Forms / System Admin /
-- Account are correct RBAC restricted to PMO/admin roles, not surfaced to project_manager) —
-- repointed to the PMO-flavored, wrapPmoOutlet-wrapped /platform/pmo/okr* routes.
-- ============================================================================

UPDATE public.menu_items SET route_path = '/platform/pm/okr', updated_at = NOW()
WHERE menu_code = 'plat_xf_okr' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items SET route_path = '/platform/pmo/okr', updated_at = NOW()
WHERE menu_code = 'plat_okr_dashboard' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items SET route_path = '/platform/pmo/okr/objectives', updated_at = NOW()
WHERE menu_code = 'plat_okr_objectives' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items SET route_path = '/platform/pmo/okr/alignment', updated_at = NOW()
WHERE menu_code = 'plat_okr_alignment' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items SET route_path = '/platform/pmo/okr/checkins', updated_at = NOW()
WHERE menu_code = 'plat_okr_checkins' AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1048: OKR route_paths corrected to their real, /platform-prefixed URLs';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, route_path FROM public.menu_items
--   WHERE menu_code IN ('plat_xf_okr','plat_okr_dashboard','plat_okr_objectives','plat_okr_alignment','plat_okr_checkins');

-- ============================================================================
-- v1017: Fix Budget menu item's route — was unreachable from /pm/* pages
-- ============================================================================
-- v1015 wired plat_pm_budget's route_path as /platform/projects/:projectId/budget.
-- resolveMenuRoutePath() (sidebarRouteUtils.js) can only substitute :projectId when
-- the CURRENT page's own URL already has a project id in its path segment — /pm/*
-- pages (where this menu item actually renders, e.g. /pm/dashboard) resolve their
-- project via CurrentProjectContext, not a URL path segment, so there was nothing to
-- substitute. The resolver's fallback for an unresolvable :projectId token sends the
-- user to the bare Projects list (/platform/projects) instead — reported live as
-- "Budget menu link ... taking to the Projects page".
--
-- Fix: point the menu item at the new flat /platform/budget route instead (added
-- alongside the existing path-param route in platformRoutes.jsx, both serving the
-- same ProjectBudgetPage component, which now resolves projectId via
-- usePlatformProjectId()'s full fallback chain — including CurrentProjectContext).
-- ============================================================================

UPDATE public.menu_items
SET route_path = '/platform/budget', updated_at = NOW()
WHERE menu_code = 'plat_pm_budget' AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1017: plat_pm_budget route_path updated to /platform/budget';
  RAISE NOTICE '================================================';
END $$;

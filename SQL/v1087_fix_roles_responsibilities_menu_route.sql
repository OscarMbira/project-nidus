-- =============================================================================
-- v1087: Fix Project Team → Roles & Responsibilities menu route
-- Prerequisites: v1020 (plat_pm_pt_roles), v988 (canonical PMO page route)
--
-- Symptom: clicking "Roles & Responsibilities" under Project Team lands on the
-- public marketing home page instead of the PMO Roles & Responsibilities page.
--
-- Cause: v1020 seeded route_path as '/pmo-admin/roles-responsibilities'
-- (missing the /platform prefix). That path does not match any authenticated
-- app route, so the shell falls through to the public landing page.
--
-- Canonical route (already used by PMO Configuration and menuRegistry):
--   /platform/pmo-admin/roles-responsibilities
-- Idempotent — safe to re-run.
-- =============================================================================

UPDATE public.menu_items
SET route_path = '/platform/pmo-admin/roles-responsibilities',
    updated_at = NOW()
WHERE menu_code = 'plat_pm_pt_roles'
  AND COALESCE(is_deleted, FALSE) = FALSE
  AND COALESCE(route_path, '') IS DISTINCT FROM '/platform/pmo-admin/roles-responsibilities';

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1087: plat_pm_pt_roles route_path → /platform/pmo-admin/roles-responsibilities';
  RAISE NOTICE '================================================';
END $$;

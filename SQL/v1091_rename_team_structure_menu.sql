-- =============================================================================
-- v1091: Rename Project Team → Organisation Structure → Team Structure
-- Prerequisites: v1020 (plat_pm_pt_org_structure)
--
-- Label + route rename for clearer project-team framing (not org-wide org chart).
-- Old path /platform/project-team/org-structure kept as a client redirect only;
-- menu points at /platform/project-team/team-structure.
-- Idempotent — safe to re-run.
-- =============================================================================

UPDATE public.menu_items
SET menu_label = 'Team Structure',
    menu_description = 'Project team grouped by role for easy navigation.',
    route_path = '/platform/project-team/team-structure',
    updated_at = NOW()
WHERE menu_code = 'plat_pm_pt_org_structure'
  AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1091: plat_pm_pt_org_structure → Team Structure';
  RAISE NOTICE '       route → /platform/project-team/team-structure';
  RAISE NOTICE '================================================';
END $$;

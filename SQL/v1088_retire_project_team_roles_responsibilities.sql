-- =============================================================================
-- v1088: Retire Project Team → Roles & Responsibilities (org-wide leaf)
-- Prerequisites: v1020 (plat_pm_pt_roles), v988 (pmo_roles_responsibilities)
--
-- Decision: organisation-wide Roles & Responsibilities (Manage Roles + default
-- RACI per record type) belongs with PMO Admin / Account Owner only — not under
-- a project's Project Team group.
--
-- Action: deactivate + hide plat_pm_pt_roles. Leave pmo_roles_responsibilities
-- (PMO Configuration Zone) active and unchanged.
-- Idempotent — safe to re-run.
-- =============================================================================

UPDATE public.menu_items
SET is_active = FALSE,
    is_visible = FALSE,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_pt_roles'
  AND COALESCE(is_deleted, FALSE) = FALSE
  AND (
    COALESCE(is_active, TRUE) = TRUE
    OR COALESCE(is_visible, TRUE) = TRUE
  );

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1088: plat_pm_pt_roles retired from Project Team';
  RAISE NOTICE '       PMO leaf pmo_roles_responsibilities unchanged';
  RAISE NOTICE '================================================';
END $$;

-- ============================================================================
-- v1238: Explicit Financial Reports (Financial Reporting Hub) menu access for
-- project_manager and pmo_admin
-- ============================================================================
-- Both roles already reach plat_fin_reports today via their respective broad
-- catch-all grants in v683_menu_revamp_platform_role_assignments.sql (pmo_admin's
-- "ALL plat_* except system_admin section", project_manager's "ALL plat_* except
-- [exclusion list]" — plat_fin_reports is not in either exclusion list). This
-- migration makes that access explicit and auditable rather than relying solely
-- on the catch-all, so it survives any future tightening of either role's
-- exclusion list without silently dropping Financial Reports.
-- ============================================================================

INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
SELECT r.id, m.id, TRUE, TRUE, TRUE
FROM public.roles r
CROSS JOIN public.menu_items m
WHERE r.role_name IN ('project_manager', 'pmo_admin')
  AND m.menu_code = 'plat_fin_reports'
  AND COALESCE(m.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

DO $$ BEGIN
  RAISE NOTICE 'v1238_financial_reports_menu_pm_pmo_access.sql applied successfully';
END $$;

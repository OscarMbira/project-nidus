-- ============================================================================
-- v1236: Remove Portfolio EVM / Programme EVM from project_manager's sidebar
-- ============================================================================
-- project_manager's "full access" grant in v683_menu_revamp_platform_role_assignments.sql
-- is a broad `menu_code LIKE 'plat_%'` catch-all with ~25 exclusions, but it never
-- excluded plat_fin_evm (Portfolio EVM) or plat_fin_programme_evm (Programme EVM) —
-- so a Project Manager sees portfolio/programme-level EVM views that don't apply at
-- their project-scoped level. Soft-revoke (is_active = FALSE), same pattern as
-- v980_financial_management_hub_dedup.sql, rather than deleting the row — these two
-- menu items stay granted to pmo_admin/system_admin/account_owner (and their own
-- programme_manager/portfolio_manager roles) unaffected.
-- ============================================================================

UPDATE public.role_menu_items rmi
SET is_active = FALSE, updated_at = NOW()
FROM public.roles r, public.menu_items mi
WHERE rmi.role_id = r.id
  AND rmi.menu_item_id = mi.id
  AND r.role_name = 'project_manager'
  AND mi.menu_code IN ('plat_fin_evm', 'plat_fin_programme_evm')
  AND COALESCE(mi.is_deleted, FALSE) = FALSE;

DO $$ BEGIN
  RAISE NOTICE 'v1236_remove_evm_portfolio_programme_from_pm.sql applied successfully';
END $$;

-- ============================================================================
-- v1292 rollback: PMO Configuration sidebar links
-- ============================================================================
-- 1. Hides the Simulator PMO Admin → PMO Configuration row (kept, so re-running v1292 restores it).
-- 2. Removes the Account Owner / org_admin / super_admin grants v1292 added to the Platform
--    PMO Configuration row (v988's pmo_admin / system_admin grants stay).
-- ============================================================================

UPDATE public.menu_items
SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
WHERE menu_code = 'sim_pmo_admin_configuration';

UPDATE public.role_menu_items rmi
SET is_active = FALSE, is_deleted = TRUE, updated_at = NOW()
FROM public.menu_items mi, public.roles r
WHERE rmi.menu_item_id = mi.id
  AND rmi.role_id = r.id
  AND mi.menu_code = 'pmo_configuration_home'
  AND r.account_id IS NULL
  AND lower(regexp_replace(trim(r.role_name), '[[:space:]]+', '_', 'g')) IN ('account_owner', 'org_admin', 'super_admin');

-- =============================================================================
-- v1102: Remove Delegated Authorities from Governance Setup (PM sidebar)
-- Prerequisites: v1020, v1101
--
-- Authorities are organisation/PMO Configuration (pmo_organisation_authorities →
-- /platform/pmo-admin/authorities). The Project Setup → Governance Setup shortcut
-- (plat_pm_gov_authorities) was granted to Project Manager and mixed org admin into
-- project governance. Deactivate the leaf + its role grants; PMO home remains.
-- =============================================================================

UPDATE public.menu_items
SET is_active = FALSE,
    is_visible = FALSE,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_gov_authorities'
  AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.role_menu_items rmi
SET is_active = FALSE,
    updated_at = NOW()
FROM public.menu_items mi
WHERE rmi.menu_item_id = mi.id
  AND mi.menu_code = 'plat_pm_gov_authorities'
  AND COALESCE(rmi.is_deleted, FALSE) = FALSE;

DO $$
BEGIN
  RAISE NOTICE 'v1102: plat_pm_gov_authorities deactivated (use PMO Configuration → Authorities)';
END $$;

-- Post-run:
--   SELECT menu_code, is_active, is_visible, route_path FROM public.menu_items
--   WHERE menu_code IN ('plat_pm_gov_authorities', 'pmo_organisation_authorities');

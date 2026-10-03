-- =============================================================================
-- v1101: Fix Delegated Authorities menu route (missing /platform prefix)
-- Prerequisites: v1020 (plat_pm_gov_authorities)
--
-- Bug: Governance Setup → Delegated Authorities was seeded as /pmo-admin/authorities
-- which is not a registered Platform route. Correct page is Organisation Authorities
-- at /platform/pmo-admin/authorities (same as PMO Configuration → Authorities).
-- Same class of bug as v1047 / v1048 (missing /platform prefix).
-- =============================================================================

UPDATE public.menu_items
SET route_path = '/platform/pmo-admin/authorities',
    updated_at = NOW()
WHERE menu_code = 'plat_pm_gov_authorities'
  AND COALESCE(is_deleted, FALSE) = FALSE
  AND (
    route_path IS DISTINCT FROM '/platform/pmo-admin/authorities'
  );

DO $$
BEGIN
  RAISE NOTICE 'v1101: plat_pm_gov_authorities route_path → /platform/pmo-admin/authorities';
END $$;

-- Post-run:
--   SELECT menu_code, menu_label, route_path FROM public.menu_items
--   WHERE menu_code = 'plat_pm_gov_authorities';

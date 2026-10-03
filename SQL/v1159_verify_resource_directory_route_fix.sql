-- =============================================================================
-- v1159: Verification query for v1158 (Resource Directory route collision fix)
-- =============================================================================
-- Read-only. Run this after v1158 to confirm whether the UPDATE actually
-- matched rows. Expected: 6 rows, each with route_path =
-- '/platform/resources/directory'. If route_path still shows
-- '/platform/resources' (or rows are missing entirely), the menu_code values
-- assumed from the old seed files don't match what's actually live in this
-- database, and the fix needs to target the real menu_code/route_path instead.
-- =============================================================================

SELECT menu_code, menu_label, route_path, is_active, is_visible, COALESCE(is_deleted, FALSE) AS is_deleted
FROM public.menu_items
WHERE menu_code IN (
  'plat_people_resource_dir',
  'plat_pm_resource_dir',
  'plat_xf_resources_hub',
  'pm_resource_list',
  'plat_pm_rep_resource',
  'mkt_reuse_resources'
)
ORDER BY menu_code;

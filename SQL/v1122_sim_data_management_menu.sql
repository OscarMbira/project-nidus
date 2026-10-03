-- ============================================================================
-- v1122: Simulator sidebar entry for Data Management (v1108)
-- ============================================================================
-- projectplan/v1108_data_management_gdpr_plan.md Phase 0.
-- New menu item under the existing 'sim_sec_knowledge' section (same parent as 'sim_pmo_admin' /
-- "Practice Administration", per v682_menu_revamp_simulator_hierarchy.sql). Deliberately NOT
-- placed under 'sim_sec_system_admin' — that section's role_menu_items grant (v684) explicitly
-- excludes sim_pmo_admin, reserving it for the higher, platform-operator-tier simulator_admin role
-- only. This feature's access model is PMO Admin + Account Owner (matching Platform's v1108
-- decision), so it belongs beside 'sim_pmo_admin', not inside the excluded system-admin group.
-- ============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_sec_knowledge' AND COALESCE(is_deleted, FALSE) = FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), 'sim_sys_data_mgmt', 'Data Management', '/simulator/admin/data-management', sec.id, 2, 50, 'universal', 'database', TRUE, TRUE, NOW(), NOW()
FROM sec
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'sim_sys_data_mgmt' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- simulator_admin already gets this automatically (v684's wildcard: menu_code LIKE 'sim_%').
-- sim_pmo_admin needs an explicit grant — v684's sim_pmo_admin INSERT predates this menu item and
-- was a one-time migration, not re-run here.
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'sim_pmo_admin'),
       mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code = 'sim_sys_data_mgmt'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$ BEGIN
  RAISE NOTICE 'v1122_sim_data_management_menu.sql applied successfully';
END $$;

-- ================================================
-- File: v1174c_timesheet_overtime_types_menu.sql
-- Description: Sidebar menu entries + role grants for the new Timesheet Overtime Types
--              management page — Platform and Simulator, PMO-admin-only tier (same convention
--              as v1169c/v1170c/v1173c's siblings nested under pmo-cat-admin / sim_pmo_cat_admin).
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites: v1174_timesheet_overtime_types.sql

-- ── Platform leaf ──

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'pmo-admin-timesheet-overtime-types', 'Timesheet Overtime Types',
       'Classification options (After Hours, Public Holiday, etc.) offered on the Overtime grid',
       '/platform/pmo-admin/timesheet-overtime-types',
       (SELECT id FROM public.menu_items WHERE menu_code = 'pmo-cat-admin' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, 99, 'universal', 'tags', TRUE, TRUE, NOW(), NOW()
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  route_path = EXCLUDED.route_path,
  parent_menu_id = EXCLUDED.parent_menu_id,
  menu_icon = EXCLUDED.menu_icon,
  sort_order = EXCLUDED.sort_order,
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code = 'pmo-admin-timesheet-overtime-types'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND lower(replace(r.role_name, ' ', '_')) IN ('pmo_admin', 'system_admin', 'account_owner')
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- ── Simulator leaf ──

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'sim-pmo-timesheet-overtime-types', 'Timesheet Overtime Types',
       'Classification options (After Hours, Public Holiday, etc.) offered on the Overtime grid',
       '/simulator/pmo/timesheet-overtime-types',
       (SELECT id FROM public.menu_items WHERE menu_code = 'sim_pmo_cat_admin' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, 99, 'universal', 'tags', TRUE, TRUE, NOW(), NOW()
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  route_path = EXCLUDED.route_path,
  parent_menu_id = EXCLUDED.parent_menu_id,
  menu_icon = EXCLUDED.menu_icon,
  sort_order = EXCLUDED.sort_order,
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code = 'sim-pmo-timesheet-overtime-types'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND lower(replace(r.role_name, ' ', '_')) IN ('pmo_admin', 'system_admin', 'account_owner')
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_platform_menu_id UUID;
    v_sim_menu_id UUID;
BEGIN
    SELECT id INTO v_platform_menu_id FROM public.menu_items WHERE menu_code = 'pmo-admin-timesheet-overtime-types' AND COALESCE(is_deleted, FALSE) = FALSE;
    SELECT id INTO v_sim_menu_id FROM public.menu_items WHERE menu_code = 'sim-pmo-timesheet-overtime-types' AND COALESCE(is_deleted, FALSE) = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Platform menu item: %', v_platform_menu_id;
    RAISE NOTICE 'Simulator menu item: %', v_sim_menu_id;
    RAISE NOTICE '================================================';
END $$;

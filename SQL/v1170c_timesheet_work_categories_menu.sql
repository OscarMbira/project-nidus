-- ================================================
-- File: v1170c_timesheet_work_categories_menu.sql
-- Description: Sidebar menu entry + role grants for the new Timesheet Work Categories
--              management page (apps/platform/src/pages/platform-app/TimesheetWorkCategories.jsx,
--              route /platform/pmo-admin/timesheet-work-categories)
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites: v1170_weekly_timesheet_grid.sql, v727_dedupe_administration_menus.sql
--                 (defines the 'pmo-cat-admin' parent), v909_simulator_manage_roles_menu.sql
--                 (defines the 'sim_pmo_cat_admin' parent)

-- Purpose: PMO-admin-only tier, same convention as Project Types/Statuses/Funding Sources/
-- Timesheet Review Reasons (v727/v1169c) — reference-data config, not a broader PM/TM grant.

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'pmo-admin-timesheet-work-categories', 'Timesheet Work Categories',
       'Category options (Governance, Data Migration, Defect Fixing, etc.) offered when logging time',
       '/platform/pmo-admin/timesheet-work-categories',
       (SELECT id FROM public.menu_items WHERE menu_code = 'pmo-cat-admin' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, 97, 'universal', 'tags', TRUE, TRUE, NOW(), NOW()
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
WHERE mi.menu_code = 'pmo-admin-timesheet-work-categories'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND lower(replace(r.role_name, ' ', '_')) IN ('pmo_admin', 'system_admin', 'account_owner')
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- ── Simulator equivalent — same page, read via platformDb, nested under 'sim_pmo_cat_admin' ──

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'sim-pmo-timesheet-work-categories', 'Timesheet Work Categories',
       'Category options (Governance, Data Migration, Defect Fixing, etc.) offered when logging time',
       '/simulator/pmo/timesheet-work-categories',
       (SELECT id FROM public.menu_items WHERE menu_code = 'sim_pmo_cat_admin' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, 97, 'universal', 'tags', TRUE, TRUE, NOW(), NOW()
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
WHERE mi.menu_code = 'sim-pmo-timesheet-work-categories'
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
    SELECT id INTO v_platform_menu_id FROM public.menu_items WHERE menu_code = 'pmo-admin-timesheet-work-categories' AND COALESCE(is_deleted, FALSE) = FALSE;
    SELECT id INTO v_sim_menu_id FROM public.menu_items WHERE menu_code = 'sim-pmo-timesheet-work-categories' AND COALESCE(is_deleted, FALSE) = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Platform menu item: %', v_platform_menu_id;
    RAISE NOTICE 'Simulator menu item: %', v_sim_menu_id;
    RAISE NOTICE '================================================';
END $$;

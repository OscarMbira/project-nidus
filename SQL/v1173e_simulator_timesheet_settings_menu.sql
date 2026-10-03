-- ================================================
-- File: v1173e_simulator_timesheet_settings_menu.sql
-- Description: Simulator sidebar leaf for the organisation-level Timesheet Settings page —
--              v1173c only wired this for Platform; the Simulator route/page already existed
--              (simulator/pmo/timesheet-settings) and had a PmoConfigurationHome card, but was
--              missing the direct sidebar leaf its siblings (timesheet-review-reasons,
--              timesheet-work-categories) both got in v1169c/v1170c.
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites: v1173_timesheet_overtime_and_settings.sql, v909_simulator_manage_roles_menu.sql
--                 (defines 'sim_pmo_cat_admin')

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'sim-pmo-timesheet-settings', 'Timesheet Settings',
       'Standard daily hours, overtime maximums, and the standard working week for timesheets',
       '/simulator/pmo/timesheet-settings',
       (SELECT id FROM public.menu_items WHERE menu_code = 'sim_pmo_cat_admin' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, 98, 'universal', 'settings', TRUE, TRUE, NOW(), NOW()
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
WHERE mi.menu_code = 'sim-pmo-timesheet-settings'
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
    v_menu_id UUID;
BEGIN
    SELECT id INTO v_menu_id FROM public.menu_items WHERE menu_code = 'sim-pmo-timesheet-settings' AND COALESCE(is_deleted, FALSE) = FALSE;
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Simulator timesheet settings menu item: %', v_menu_id;
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- File: v1173c_timesheet_settings_menu.sql
-- Description: Sidebar menu entries + role grants for the new Timesheet Settings pages —
--              organisation defaults (PMO Admin/Account Owner) and project override
--              (Project Manager), mirroring v1061's Regional & Format Settings menu wiring.
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites: v1173_timesheet_overtime_and_settings.sql, v727_dedupe_administration_menus.sql
--                 (defines 'pmo-cat-admin'), menu_code 'plat_pm_project_setup' (Project Setup
--                 parent, same one v1061 nests Regional & Format Settings' project leaf under)

-- ── 1) Organisation leaf — PMO Configuration reference-data section (same convention as
--       pmo-admin-timesheet-review-reasons / pmo-admin-timesheet-work-categories) ──

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'pmo-admin-timesheet-settings', 'Timesheet Settings',
       'Standard daily hours, overtime maximums, and the standard working week for timesheets',
       '/platform/pmo-admin/timesheet-settings',
       (SELECT id FROM public.menu_items WHERE menu_code = 'pmo-cat-admin' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
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
WHERE mi.menu_code = 'pmo-admin-timesheet-settings'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND lower(replace(r.role_name, ' ', '_')) IN ('pmo_admin', 'system_admin', 'account_owner')
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- ── 2) Project Setup leaf (mirrors v1061's plat_pm_s_regional_format exactly) ──

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  'plat_pm_s_timesheet_settings',
  'Timesheet Settings',
  'Project overrides for standard daily hours, overtime maximums, and the standard working week (inherits organisation defaults).',
  '/platform/project-setup/timesheet-settings',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_project_setup' AND COALESCE(is_deleted, FALSE) = FALSE),
  2, 76, 'universal', 'settings', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items
  WHERE menu_code = 'plat_pm_s_timesheet_settings' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- Grants: Project Setup leaf — copy from Project Details (same pattern as v1061)
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), x.role_id, x.menu_item_id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM (
  SELECT DISTINCT ON (src.role_id, dst.id)
    src.role_id,
    dst.id AS menu_item_id
  FROM public.role_menu_items src
  JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_s_project_details'
  JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_s_timesheet_settings' AND COALESCE(dst.is_deleted, FALSE) = FALSE
  WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
  ORDER BY src.role_id, dst.id
) x
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_org_menu_id UUID;
    v_project_menu_id UUID;
BEGIN
    SELECT id INTO v_org_menu_id FROM public.menu_items WHERE menu_code = 'pmo-admin-timesheet-settings' AND COALESCE(is_deleted, FALSE) = FALSE;
    SELECT id INTO v_project_menu_id FROM public.menu_items WHERE menu_code = 'plat_pm_s_timesheet_settings' AND COALESCE(is_deleted, FALSE) = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Org timesheet settings menu item: %', v_org_menu_id;
    RAISE NOTICE 'Project timesheet settings menu item: %', v_project_menu_id;
    RAISE NOTICE '================================================';
END $$;

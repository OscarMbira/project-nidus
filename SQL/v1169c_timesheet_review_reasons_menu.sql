-- ================================================
-- File: v1169c_timesheet_review_reasons_menu.sql
-- Description: Sidebar menu entry + role grants for the new Timesheet Review Reasons
--              management page (apps/platform/src/pages/platform-app/TimesheetReviewReasons.jsx,
--              route /platform/pmo-admin/timesheet-review-reasons)
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites: v1169_timesheet_entry_approval_workflow.sql,
--                 v727_dedupe_administration_menus.sql (defines the 'pmo-cat-admin' parent)

-- Purpose:
-- Reference-data reason catalogs are configured by PMO Admin only (same precedent as
-- Project Types/Statuses/Funding Sources/Budget Categories — v727's PMO-admin-only tier,
-- NOT Assignment Roles' broader PM/Team Manager grant, since PMs *use* the reasons via
-- TeamTimesheetsPage's review flow but don't manage the catalog itself).

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'pmo-admin-timesheet-review-reasons', 'Timesheet Review Reasons',
       'Predefined reasons a reviewer selects from when approving or rejecting a timesheet entry',
       '/platform/pmo-admin/timesheet-review-reasons',
       (SELECT id FROM public.menu_items WHERE menu_code = 'pmo-cat-admin' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, 96, 'universal', 'clipboard-check', TRUE, TRUE, NOW(), NOW()
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
WHERE mi.menu_code = 'pmo-admin-timesheet-review-reasons'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND lower(replace(r.role_name, ' ', '_')) IN ('pmo_admin', 'system_admin', 'account_owner')
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- ── Simulator equivalent — same page, read via platformDb (shared reference data, same
--    precedent as Assignment Roles), nested under Simulator's 'sim_pmo_cat_admin' parent ──

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'sim-pmo-timesheet-review-reasons', 'Timesheet Review Reasons',
       'Predefined reasons a reviewer selects from when approving or rejecting a timesheet entry',
       '/simulator/pmo/timesheet-review-reasons',
       (SELECT id FROM public.menu_items WHERE menu_code = 'sim_pmo_cat_admin' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, 96, 'universal', 'clipboard-check', TRUE, TRUE, NOW(), NOW()
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
WHERE mi.menu_code = 'sim-pmo-timesheet-review-reasons'
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
    SELECT id INTO v_platform_menu_id FROM public.menu_items WHERE menu_code = 'pmo-admin-timesheet-review-reasons' AND COALESCE(is_deleted, FALSE) = FALSE;
    SELECT id INTO v_sim_menu_id FROM public.menu_items WHERE menu_code = 'sim-pmo-timesheet-review-reasons' AND COALESCE(is_deleted, FALSE) = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Platform menu item: %', v_platform_menu_id;
    RAISE NOTICE 'Simulator menu item: %', v_sim_menu_id;
    RAISE NOTICE '================================================';
END $$;

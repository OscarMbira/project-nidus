-- ============================================================================
-- v754b — Form Template Builder menu_items (Platform + Simulator)
-- Version: v754b
-- Description: Registers "New Template" under Process Group Forms in
--   menu_items + role_menu_items for PMO-admin roles only. Complements
--   v754 sidebar_config seed and packages/config menu entries.
-- Prerequisites: v681 (platform menu hierarchy), v682 (simulator hierarchy)
-- ============================================================================

-- ── Platform: under plat_grp_process_groups ──────────────────────────────────

INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'plat_p_new_form_template',
  'New Template',
  'Author a new process group form template (PMO Admin)',
  par.id,
  3,
  75,
  '/pmo/forms/new',
  'file-plus',
  'pmbok',
  TRUE,
  TRUE
FROM public.menu_items par
WHERE par.menu_code = 'plat_grp_process_groups'
  AND COALESCE(par.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  parent_menu_id = EXCLUDED.parent_menu_id,
  menu_level = EXCLUDED.menu_level,
  sort_order = EXCLUDED.sort_order,
  route_path = EXCLUDED.route_path,
  menu_icon = EXCLUDED.menu_icon,
  methodology = EXCLUDED.methodology,
  is_visible = TRUE,
  is_active = TRUE,
  updated_at = NOW();

-- PMO-admin roles only (not project_manager / portfolio_manager)
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code = 'plat_p_new_form_template'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND r.role_name IN ('pmo_admin', 'system_admin', 'account_owner', 'PMO Admin', 'System Admin', 'Superuser')
  AND COALESCE(r.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  updated_at = NOW();

-- ── Simulator: under sim_grp_pmo_process_groups ──────────────────────────────

INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'sim_pmo_p_new_form_template',
  'New Template',
  'Author a new practice process group form template (PMO Admin)',
  par.id,
  3,
  55,
  '/simulator/pmo/forms/new',
  'file-plus',
  'pmbok',
  TRUE,
  TRUE
FROM public.menu_items par
WHERE par.menu_code = 'sim_grp_pmo_process_groups'
  AND COALESCE(par.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  parent_menu_id = EXCLUDED.parent_menu_id,
  menu_level = EXCLUDED.menu_level,
  sort_order = EXCLUDED.sort_order,
  route_path = EXCLUDED.route_path,
  menu_icon = EXCLUDED.menu_icon,
  methodology = EXCLUDED.methodology,
  is_visible = TRUE,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code = 'sim_pmo_p_new_form_template'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND r.role_name IN ('pmo_admin', 'system_admin', 'account_owner', 'PMO Admin', 'System Admin', 'Superuser')
  AND COALESCE(r.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v754b_form_template_builder_menu_items.sql applied';
END $$;

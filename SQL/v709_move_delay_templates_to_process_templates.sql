-- =============================================================================
-- v709: Move Delay Templates from Project Oversight → Process Templates (pmo_admin)
-- Prerequisites: v681 (plat_* hierarchy), v638 (pmo_oversight_delay_templates)
-- Source of truth: Documentation/Role_Menu_Structures.md § Process Templates
-- =============================================================================

DO $$
DECLARE
  v_pt_parent uuid;
  v_oversight_parent uuid;
  v_sim_pt_parent uuid;
  v_sim_oversight_parent uuid;
BEGIN
  SELECT id INTO v_pt_parent
  FROM public.menu_items
  WHERE menu_code = 'pmo_process_templates_section'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  SELECT id INTO v_oversight_parent
  FROM public.menu_items
  WHERE menu_code = 'pmo_section_oversight'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  SELECT id INTO v_sim_pt_parent
  FROM public.menu_items
  WHERE menu_code = 'sim_pmo_process_templates_section'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  SELECT id INTO v_sim_oversight_parent
  FROM public.menu_items
  WHERE menu_code = 'sim_pmo_section_oversight'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  -- Legacy registry row → Process Templates
  UPDATE public.menu_items
  SET parent_menu_id = v_pt_parent,
      menu_level = 2,
      sort_order = 75,
      updated_at = NOW()
  WHERE menu_code = 'pmo_oversight_delay_templates'
    AND COALESCE(is_deleted, FALSE) = FALSE
    AND v_pt_parent IS NOT NULL;

  -- Simulator parity
  UPDATE public.menu_items
  SET parent_menu_id = v_sim_pt_parent,
      menu_level = 2,
      sort_order = 75,
      updated_at = NOW()
  WHERE menu_code = 'sim_pmo_oversight_delay_templates'
    AND COALESCE(is_deleted, FALSE) = FALSE
    AND v_sim_pt_parent IS NOT NULL;

  -- v681 plat oversight: register only (templates live under Process Templates)
  UPDATE public.menu_items
  SET menu_label = 'Delay Register',
      route_path = '/pmo/oversight/delays',
      menu_icon = 'file-clock',
      updated_at = NOW()
  WHERE menu_code = 'plat_oversight_delay'
    AND COALESCE(is_deleted, FALSE) = FALSE;

  -- v681 plat process templates: Delay Templates leaf
  INSERT INTO public.menu_items (
    id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order,
    methodology, menu_icon, is_active, is_visible, created_at, updated_at
  )
  SELECT gen_random_uuid(),
         'plat_pt_delay_templates',
         'Delay Templates',
         '/pmo/delays/templates',
         sec.id,
         2,
         75,
         'universal',
         'layers',
         TRUE,
         TRUE,
         NOW(),
         NOW()
  FROM public.menu_items sec
  WHERE sec.menu_code = 'plat_sec_process_templates'
    AND COALESCE(sec.is_deleted, FALSE) = FALSE
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    route_path = EXCLUDED.route_path,
    parent_menu_id = EXCLUDED.parent_menu_id,
    menu_level = EXCLUDED.menu_level,
    sort_order = EXCLUDED.sort_order,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  -- Retire duplicate v446 standalone tree (superseded by v638/v681)
  UPDATE public.menu_items
  SET is_active = FALSE,
      is_visible = FALSE,
      is_deleted = TRUE,
      updated_at = NOW()
  WHERE menu_code IN ('delay_management', 'delay_register_platform', 'delay_drafts_platform', 'delay_templates_pmo')
    AND COALESCE(is_deleted, FALSE) = FALSE;

  RAISE NOTICE 'v709_move_delay_templates_to_process_templates.sql applied';
END $$;

-- pmo_admin already receives all plat_* via v683; plat_pt_delay_templates is included.
-- Ensure legacy registry code remains assigned for roles that had oversight templates.
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       r.id,
       mi.id,
       TRUE,
       TRUE,
       TRUE,
       NOW(),
       NOW()
FROM public.roles r
CROSS JOIN public.menu_items mi
WHERE r.role_name IN ('pmo_admin', 'system_admin', 'account_owner')
  AND mi.menu_code IN ('pmo_oversight_delay_templates', 'plat_pt_delay_templates', 'sim_pmo_oversight_delay_templates')
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  updated_at = NOW();

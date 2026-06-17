-- =============================================================================
-- v718: Dissolve Process Templates universal section (pmo_admin)
-- Template library → Knowledge & Operations; Pre-Project → Initiation Hub;
-- Agile Templates → Adaptive - Agile; phase shortcuts hidden (hub-only access).
-- Prerequisites: v681, v709, v717
-- Source of truth: Documentation/Role_Menu_Structures.md
-- =============================================================================

DO $$
DECLARE
  v_knowledge uuid;
  v_template_grp uuid;
  v_initiation uuid;
  v_agile_sec uuid;
  v_agile_tools uuid;
BEGIN
  SELECT id INTO v_knowledge
  FROM public.menu_items
  WHERE menu_code = 'plat_sec_knowledge'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  SELECT id INTO v_initiation
  FROM public.menu_items
  WHERE menu_code = 'plat_grp_initiation'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  SELECT id INTO v_agile_sec
  FROM public.menu_items
  WHERE menu_code = 'plat_sec_agile'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  SELECT id INTO v_agile_tools
  FROM public.menu_items
  WHERE menu_code = 'plat_grp_agile_tools'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  INSERT INTO public.menu_items (
    id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order,
    methodology, menu_icon, is_active, is_visible, created_at, updated_at
  )
  SELECT gen_random_uuid(),
         'plat_grp_template_library',
         'Template Library',
         NULL,
         v_knowledge,
         2,
         15,
         'universal',
         'layers',
         TRUE,
         TRUE,
         NOW(),
         NOW()
  WHERE v_knowledge IS NOT NULL
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    parent_menu_id = EXCLUDED.parent_menu_id,
    menu_level = EXCLUDED.menu_level,
    sort_order = EXCLUDED.sort_order,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  SELECT id INTO v_template_grp
  FROM public.menu_items
  WHERE menu_code = 'plat_grp_template_library'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  -- Template library leaves
  UPDATE public.menu_items
  SET parent_menu_id = v_template_grp,
      menu_level = 3,
      updated_at = NOW()
  WHERE menu_code IN (
    'plat_pt_hub',
    'plat_pt_browse',
    'plat_pt_new',
    'plat_pt_industry',
    'plat_pt_delay_templates',
    'pmo_oversight_delay_templates',
    'pmo_pt_hub',
    'pmo_pt_browse',
    'pmo_pt_manage',
    'pmo_pt_new',
    'pmo_industry_templates',
    'pmo_pt_delay_templates'
  )
    AND COALESCE(is_deleted, FALSE) = FALSE
    AND v_template_grp IS NOT NULL;

  UPDATE public.menu_items
  SET menu_label = 'Template Hub',
      route_path = '/pmo/process-templates',
      menu_icon = 'layers',
      sort_order = 10,
      updated_at = NOW()
  WHERE menu_code = 'plat_pt_hub'
    AND COALESCE(is_deleted, FALSE) = FALSE;

  UPDATE public.menu_items
  SET menu_label = 'Browse Templates',
      route_path = '/platform/templates',
      sort_order = 20,
      updated_at = NOW()
  WHERE menu_code = 'plat_pt_browse'
    AND COALESCE(is_deleted, FALSE) = FALSE;

  -- Pre-Project → Initiation Hub
  UPDATE public.menu_items
  SET parent_menu_id = v_initiation,
      menu_level = 3,
      menu_label = 'Pre-Project Templates',
      route_path = '/pmo/process-templates/pre-project',
      sort_order = 45,
      is_visible = TRUE,
      is_active = TRUE,
      updated_at = NOW()
  WHERE menu_code IN ('plat_pt_preproject', 'pmo_pt_pre')
    AND COALESCE(is_deleted, FALSE) = FALSE
    AND v_initiation IS NOT NULL;

  -- Agile Templates → Adaptive track
  UPDATE public.menu_items
  SET parent_menu_id = COALESCE(v_agile_tools, v_agile_sec),
      menu_level = CASE WHEN v_agile_tools IS NOT NULL THEN 3 ELSE 2 END,
      menu_label = 'Agile Templates',
      route_path = '/pmo/process-templates/agile',
      sort_order = 40,
      methodology = 'agile',
      is_visible = TRUE,
      is_active = TRUE,
      updated_at = NOW()
  WHERE menu_code IN ('plat_pt_agile', 'pmo_pt_agile')
    AND COALESCE(is_deleted, FALSE) = FALSE
    AND COALESCE(v_agile_tools, v_agile_sec) IS NOT NULL;

  -- Hide phase shortcuts (duplicate PMBOK Process Group Forms naming)
  UPDATE public.menu_items
  SET is_visible = FALSE,
      is_active = FALSE,
      updated_at = NOW()
  WHERE menu_code IN (
    'plat_pt_initiating',
    'plat_pt_planning',
    'plat_pt_executing',
    'plat_pt_mc',
    'plat_pt_closing',
    'pmo_pt_init',
    'pmo_pt_plan',
    'pmo_pt_exec',
    'pmo_pt_mon',
    'pmo_pt_close'
  )
    AND COALESCE(is_deleted, FALSE) = FALSE;

  -- Retire universal Process Templates section shells
  UPDATE public.menu_items
  SET is_visible = FALSE,
      is_active = FALSE,
      updated_at = NOW()
  WHERE menu_code IN (
    'pmo-cat-process-templates',
    'plat_sec_process_templates',
    'pmo_process_templates_section',
    'plat_xf_process_templates'
  )
    AND COALESCE(is_deleted, FALSE) = FALSE;

  RAISE NOTICE 'v718_dissolve_process_templates_section.sql applied';
END $$;

-- =============================================================================
-- v670: Process Templates — restore visibility after v669 deactivation / missing grants
-- Ensures pmo_pt_* tree is active and granted; mirrors legacy template_library grants
-- Prerequisites: v666, v668, v669
-- =============================================================================

DO $$
DECLARE
  v_role_id UUID;
  v_pt UUID;
  v_pt_codes TEXT[] := ARRAY[
    'pmo_process_templates_section',
    'pmo_pt_hub', 'pmo_pt_pre', 'pmo_pt_init', 'pmo_pt_plan',
    'pmo_pt_exec', 'pmo_pt_mon', 'pmo_pt_close',
    'pmo_pt_browse', 'pmo_pt_manage', 'pmo_pt_new',
    'pmo_pt_agile_section',
    'pmo_pt_product_backlog', 'pmo_pt_sprint_planning', 'pmo_pt_agile',
    'pmo_pt_story_map', 'pmo_pt_sprint_metrics', 'pmo_pt_releases', 'pmo_pt_roadmap',
    'pmo_industry_templates', 'pmo_industry_templates_new', 'pmo_industry_templates_on_hold'
  ];
BEGIN
  SELECT id INTO v_pt FROM public.menu_items WHERE menu_code = 'pmo_process_templates_section' LIMIT 1;

  IF v_pt IS NULL THEN
    RAISE NOTICE 'v670 skipped — pmo_process_templates_section not found';
    RETURN;
  END IF;

  -- Ensure section + full canonical tree is active/visible
  UPDATE public.menu_items
  SET is_active = TRUE, is_visible = TRUE, is_deleted = FALSE, updated_at = NOW()
  WHERE menu_code = ANY(v_pt_codes)
    AND COALESCE(is_deleted, FALSE) = FALSE;

  -- Re-apply v669 structure (idempotent)
  PERFORM 1 FROM public.menu_items WHERE menu_code = 'pmo_pt_hub' AND is_active = TRUE;
  IF NOT FOUND THEN
    RAISE NOTICE 'v670: pmo_pt_hub missing — run v669 first';
  END IF;

  -- Grant full tree to PMO / system admin roles
  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE LOWER(TRIM(role_name)) IN ('pmo_admin', 'system_admin', 'super_admin')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_pt_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
      AND mi.is_active = TRUE
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
      can_view = TRUE,
      can_use = TRUE,
      is_active = TRUE,
      is_deleted = FALSE,
      updated_at = NOW();
  END LOOP;

  -- Mirror legacy template_library grants → canonical pmo_pt_* (roles that lost access after v669 deactivation)
  INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
  SELECT DISTINCT rmi.role_id, pt.id, TRUE, TRUE, TRUE, FALSE
  FROM public.role_menu_items rmi
  JOIN public.menu_items legacy ON legacy.id = rmi.menu_item_id
  JOIN public.menu_items pt ON pt.menu_code = CASE legacy.menu_code
    WHEN 'template_library' THEN 'pmo_pt_browse'
    WHEN 'template_library_browse' THEN 'pmo_pt_browse'
    WHEN 'template_library_manage' THEN 'pmo_pt_manage'
    WHEN 'template_library_new' THEN 'pmo_pt_new'
    WHEN 'agile_templates' THEN 'pmo_pt_agile'
    ELSE NULL
  END
  WHERE legacy.menu_code IN (
    'template_library', 'template_library_browse', 'template_library_manage',
    'template_library_new', 'agile_templates'
  )
    AND pt.id IS NOT NULL
    AND COALESCE(rmi.is_deleted, FALSE) = FALSE
    AND COALESCE(rmi.is_active, TRUE) = TRUE
    AND rmi.can_view = TRUE
  ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
    can_view = TRUE,
    can_use = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  -- Grant hub + agile subsection to any role that had template_library browse (full PT subtree access)
  INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
  SELECT DISTINCT rmi.role_id, mi.id, TRUE, TRUE, TRUE, FALSE
  FROM public.role_menu_items rmi
  JOIN public.menu_items legacy ON legacy.id = rmi.menu_item_id AND legacy.menu_code = 'template_library_browse'
  CROSS JOIN public.menu_items mi
  WHERE mi.menu_code = ANY(v_pt_codes)
    AND COALESCE(mi.is_deleted, FALSE) = FALSE
    AND mi.is_active = TRUE
    AND COALESCE(rmi.is_deleted, FALSE) = FALSE
    AND COALESCE(rmi.is_active, TRUE) = TRUE
    AND rmi.can_view = TRUE
  ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
    can_view = TRUE,
    can_use = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  RAISE NOTICE 'v670_process_templates_grants_restore.sql applied';
END $$;

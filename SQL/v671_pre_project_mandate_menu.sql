-- =============================================================================
-- v671: Move Project Mandate into Pre-Project Docs (pmo_section_initiation)
-- Mandate is a pre-project document (v160); list hub at /platform/mandates/list
-- Prerequisites: v638, v660
-- =============================================================================

DO $$
DECLARE
  v_init UUID;
  v_gov UUID;
  v_role_id UUID;
  v_codes TEXT[] := ARRAY[
    'pmo_gov_mandate',
    'pmo_init_project_mandate'
  ];
BEGIN
  SELECT id INTO v_init FROM public.menu_items WHERE menu_code = 'pmo_section_initiation' LIMIT 1;
  SELECT id INTO v_gov FROM public.menu_items WHERE menu_code = 'pmo_section_governance' LIMIT 1;

  IF v_init IS NULL THEN
    RAISE NOTICE 'v671 skipped — pmo_section_initiation not found';
    RETURN;
  END IF;

  -- Canonical Pre-Project Docs entry: Project Mandate → mandate register
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'pmo_init_project_mandate',
    'Project Mandate',
    'Project mandate register and capture (pre-project)',
    v_init, 2, 0,
    '/platform/mandates/list',
    'file-text',
    TRUE, TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    parent_menu_id = v_init,
    menu_level = 2,
    sort_order = 0,
    route_path = EXCLUDED.route_path,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  -- Legacy governance row: reparent under initiation (avoid duplicate route labels)
  UPDATE public.menu_items
  SET
    parent_menu_id = v_init,
    menu_level = 2,
    sort_order = 0,
    route_path = '/platform/mandates/list',
    menu_label = 'Project Mandate',
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW()
  WHERE menu_code = 'pmo_gov_mandate'
    AND COALESCE(is_deleted, FALSE) = FALSE;

  -- Hide duplicate "All Mandates" when Project Mandate covers the same list route
  UPDATE public.menu_items
  SET is_visible = FALSE, is_active = FALSE, updated_at = NOW()
  WHERE menu_code = 'pmo_gov_mandates_all'
    AND EXISTS (SELECT 1 FROM public.menu_items x WHERE x.menu_code = 'pmo_init_project_mandate' AND x.is_active = TRUE)
    AND COALESCE(is_deleted, FALSE) = FALSE;

  -- Simulator parity: practice mandate under initiation section
  UPDATE public.menu_items
  SET
    parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'sim_pmo_initiation' LIMIT 1),
    menu_level = 2,
    sort_order = 0,
    updated_at = NOW()
  WHERE menu_code = 'sim_pmo_gov_mandate'
    AND COALESCE(is_deleted, FALSE) = FALSE;

  -- Role grants
  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE LOWER(TRIM(role_name)) IN ('pmo_admin', 'system_admin', 'super_admin', 'project_executive', 'project_manager')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
      AND mi.is_active = TRUE
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
      can_view = TRUE,
      can_use = TRUE,
      is_active = TRUE,
      is_deleted = FALSE,
      updated_at = NOW();
  END LOOP;

  RAISE NOTICE 'v671_pre_project_mandate_menu.sql applied';
END $$;

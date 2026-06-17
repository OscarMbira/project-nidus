-- =============================================================================
-- v668: Process Templates — idempotent role grants + reactivate canonical rows
-- Run after v666/v667. Fixes sidebar showing only "Agile Templates" when
-- matchCategory misrouted pmo_pt_* rows to Projects (fixed in useMenu v35).
-- =============================================================================

DO $$
DECLARE
  v_pt UUID;
  v_role_id UUID;
  v_pt_codes TEXT[] := ARRAY[
    'pmo_process_templates_section',
    'pmo_pt_hub', 'pmo_pt_pre', 'pmo_pt_init', 'pmo_pt_plan',
    'pmo_pt_exec', 'pmo_pt_mon', 'pmo_pt_close',
    'pmo_pt_browse', 'pmo_pt_manage', 'pmo_pt_agile', 'pmo_pt_new',
    'pmo_industry_templates', 'pmo_industry_templates_new', 'pmo_industry_templates_on_hold'
  ];
BEGIN
  SELECT id INTO v_pt FROM public.menu_items WHERE menu_code = 'pmo_process_templates_section' LIMIT 1;

  IF v_pt IS NOT NULL THEN
    UPDATE public.menu_items
    SET is_active = TRUE, is_visible = TRUE, is_deleted = FALSE, parent_menu_id = v_pt, updated_at = NOW()
    WHERE menu_code = ANY(v_pt_codes)
      AND menu_code <> 'pmo_process_templates_section'
      AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;

  -- Deactivate legacy duplicates when canonical pmo_pt_* exists
  UPDATE public.menu_items
  SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
  WHERE menu_code IN ('template_library_browse', 'template_library_manage', 'template_library_new', 'agile_templates')
    AND EXISTS (SELECT 1 FROM public.menu_items x WHERE x.menu_code = 'pmo_pt_browse' AND x.is_active = TRUE)
    AND COALESCE(is_deleted, FALSE) = FALSE;

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

  RAISE NOTICE 'v668: Process Templates grants refreshed for PMO Admin / System Admin';
END $$;

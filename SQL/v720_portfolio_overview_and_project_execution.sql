-- =============================================================================
-- v720: Portfolio Overview under Portfolio; Project Execution wrapper (pmo_admin)
-- Prerequisites: v681, v719
-- =============================================================================

DO $$
DECLARE
  v_portfolio uuid;
  v_delivery uuid;
  v_execution uuid;
  v_projects uuid;
  v_oversight uuid;
BEGIN
  SELECT id INTO v_portfolio
  FROM public.menu_items
  WHERE menu_code = 'plat_grp_portfolio'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  SELECT id INTO v_delivery
  FROM public.menu_items
  WHERE menu_code = 'pmo-cat-project-delivery'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  SELECT id INTO v_projects
  FROM public.menu_items
  WHERE menu_code = 'plat_grp_projects'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  SELECT id INTO v_oversight
  FROM public.menu_items
  WHERE menu_code = 'plat_grp_oversight'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  -- Portfolio Overview → Portfolio group (first leaf)
  UPDATE public.menu_items
  SET parent_menu_id = v_portfolio,
      menu_level = 3,
      sort_order = 10,
      updated_at = NOW()
  WHERE menu_code = 'plat_portfolio_overview'
    AND COALESCE(is_deleted, FALSE) = FALSE
    AND v_portfolio IS NOT NULL;

  -- Project Execution wrapper for Projects + Project Oversight
  INSERT INTO public.menu_items (
    id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order,
    methodology, menu_icon, is_active, is_visible, created_at, updated_at
  )
  SELECT gen_random_uuid(),
         'plat_grp_project_execution',
         'Project Execution',
         NULL,
         v_delivery,
         2,
         40,
         'universal',
         'folder-kanban',
         TRUE,
         TRUE,
         NOW(),
         NOW()
  WHERE v_delivery IS NOT NULL
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

  SELECT id INTO v_execution
  FROM public.menu_items
  WHERE menu_code = 'plat_grp_project_execution'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  UPDATE public.menu_items
  SET parent_menu_id = v_execution,
      menu_level = 3,
      sort_order = 10,
      updated_at = NOW()
  WHERE menu_code = 'plat_grp_projects'
    AND COALESCE(is_deleted, FALSE) = FALSE
    AND v_execution IS NOT NULL;

  UPDATE public.menu_items
  SET parent_menu_id = v_execution,
      menu_level = 3,
      sort_order = 20,
      updated_at = NOW()
  WHERE menu_code = 'plat_grp_oversight'
    AND COALESCE(is_deleted, FALSE) = FALSE
    AND v_execution IS NOT NULL;

  -- Retire legacy duplicate dependencies row if both exist under portfolio
  UPDATE public.menu_items
  SET is_visible = FALSE,
      is_active = FALSE,
      updated_at = NOW()
  WHERE menu_code = 'pmo-pp-dependencies'
    AND COALESCE(is_deleted, FALSE) = FALSE
    AND EXISTS (
      SELECT 1 FROM public.menu_items
      WHERE menu_code = 'plat_portfolio_dependencies'
        AND COALESCE(is_deleted, FALSE) = FALSE
    );

  RAISE NOTICE 'v720_portfolio_overview_and_project_execution.sql applied';
END $$;

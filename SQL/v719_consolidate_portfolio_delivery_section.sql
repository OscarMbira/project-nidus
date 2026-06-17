-- =============================================================================
-- v719: Consolidate Portfolio, Programme, Planning Intelligence + Project Delivery
-- into one universal section: Portfolio & Delivery (pmo_admin)
-- Prerequisites: v676 (category rows), v681 (plat_grp_* under exec overview)
-- Source of truth: Documentation/Role_Menu_Structures.md
-- =============================================================================

DO $$
DECLARE
  v_exec uuid;
  v_delivery uuid;
  v_sim_exec uuid;
  v_sim_delivery uuid;
BEGIN
  SELECT id INTO v_exec
  FROM public.menu_items
  WHERE menu_code = 'pmo-cat-exec'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  SELECT id INTO v_delivery
  FROM public.menu_items
  WHERE menu_code = 'pmo-cat-project-delivery'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  SELECT id INTO v_sim_exec
  FROM public.menu_items
  WHERE menu_code = 'sim_pmo_cat_exec'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  SELECT id INTO v_sim_delivery
  FROM public.menu_items
  WHERE menu_code = 'sim_pmo_cat_project_delivery'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  UPDATE public.menu_items
  SET menu_label = 'Portfolio & Delivery',
      menu_icon = 'briefcase',
      updated_at = NOW()
  WHERE menu_code IN ('pmo-cat-project-delivery', 'plat_sec_project_delivery')
    AND COALESCE(is_deleted, FALSE) = FALSE;

  UPDATE public.menu_items
  SET menu_label = 'Practice Portfolio & Delivery',
      menu_icon = 'briefcase',
      updated_at = NOW()
  WHERE menu_code = 'sim_pmo_cat_project_delivery'
    AND COALESCE(is_deleted, FALSE) = FALSE;

  -- Reparent v681 portfolio / programme / planning groups from exec → delivery
  UPDATE public.menu_items
  SET parent_menu_id = v_delivery,
      menu_level = 2,
      updated_at = NOW()
  WHERE menu_code IN ('plat_grp_portfolio', 'plat_grp_programme', 'plat_grp_plan_intel')
    AND COALESCE(is_deleted, FALSE) = FALSE
    AND v_delivery IS NOT NULL;

  UPDATE public.menu_items
  SET parent_menu_id = v_sim_delivery,
      menu_level = 2,
      updated_at = NOW()
  WHERE menu_code IN ('sim_grp_pmo_portfolio', 'sim_grp_pmo_programme', 'sim_grp_pmo_plan_intel')
    AND COALESCE(is_deleted, FALSE) = FALSE
    AND v_sim_delivery IS NOT NULL;

  -- Legacy category shells still nested under exec overview
  UPDATE public.menu_items
  SET parent_menu_id = v_delivery,
      updated_at = NOW()
  WHERE menu_code IN ('pmo-cat-portfolio', 'pmo-cat-programme', 'pmo-cat-planning', 'pmo-planning')
    AND parent_menu_id = v_exec
    AND COALESCE(is_deleted, FALSE) = FALSE
    AND v_delivery IS NOT NULL;

  RAISE NOTICE 'v719_consolidate_portfolio_delivery_section.sql applied';
END $$;

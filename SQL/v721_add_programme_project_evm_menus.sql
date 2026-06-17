-- =============================================================================
-- v721: Programme EVM + Project EVM under Financial Management (pmo_admin)
-- Prerequisites: v681 (plat_grp_financial), v418 (project_evm_snapshots)
-- =============================================================================

DO $$
DECLARE
  v_fin uuid;
BEGIN
  SELECT id INTO v_fin
  FROM public.menu_items
  WHERE menu_code = 'plat_grp_financial'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  INSERT INTO public.menu_items (
    id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order,
    methodology, menu_icon, is_active, is_visible, created_at, updated_at
  )
  SELECT gen_random_uuid(), v.mc, v.ml, v.rp, v_fin, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
  FROM (VALUES
    ('plat_fin_programme_evm', 'Programme EVM', '/platform/programme/evm', 25, 'trending-up'),
    ('plat_fin_project_evm',   'Project EVM',   '/platform/projects/evm',   35, 'trending-up')
  ) AS v(mc, ml, rp, so, ic)
  WHERE v_fin IS NOT NULL
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

  UPDATE public.menu_items
  SET route_path = '/platform/portfolio/evm',
      menu_label = 'Portfolio EVM',
      sort_order = 20,
      updated_at = NOW()
  WHERE menu_code = 'plat_fin_evm'
    AND COALESCE(is_deleted, FALSE) = FALSE;

  UPDATE public.menu_items
  SET sort_order = 30,
      updated_at = NOW()
  WHERE menu_code = 'plat_fin_approvals'
    AND COALESCE(is_deleted, FALSE) = FALSE;

  UPDATE public.menu_items
  SET sort_order = 40,
      updated_at = NOW()
  WHERE menu_code = 'plat_fin_thresholds'
    AND COALESCE(is_deleted, FALSE) = FALSE;

  RAISE NOTICE 'v721_add_programme_project_evm_menus.sql applied';
END $$;

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
  AND mi.menu_code IN ('plat_fin_programme_evm', 'plat_fin_project_evm', 'pmo-fin-programme-evm', 'pmo-fin-project-evm')
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  updated_at = NOW();

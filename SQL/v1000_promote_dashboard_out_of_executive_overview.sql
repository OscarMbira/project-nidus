-- ============================================================================
-- v1000: Promote Dashboard out of Executive Overview (PMO sidebar)
-- ============================================================================
-- User request: Dashboard should sit at PMO Workspace root (sibling of
-- Portfolio & Delivery, etc.), and the empty "Executive Overview" wrapper
-- should be removed.
--
-- 1) Re-parent every child of pmo-cat-exec / sim_pmo_cat_exec to root
-- 2) Give the Platform / Practice dashboard an early sort_order so it leads
-- 3) Hide the Executive Overview category shells (and legacy plat_sec_exec_overview)
-- ============================================================================

DO $$
DECLARE
  v_exec UUID;
  v_sim_exec UUID;
BEGIN
  SELECT id INTO v_exec
  FROM public.menu_items
  WHERE menu_code = 'pmo-cat-exec'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  SELECT id INTO v_sim_exec
  FROM public.menu_items
  WHERE menu_code = 'sim_pmo_cat_exec'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  -- Promote PMO Executive Overview children → root
  IF v_exec IS NOT NULL THEN
    UPDATE public.menu_items
    SET parent_menu_id = NULL,
        menu_level = 1,
        updated_at = NOW()
    WHERE parent_menu_id = v_exec
      AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;

  -- Promote Simulator Practice Executive Overview children → root
  IF v_sim_exec IS NOT NULL THEN
    UPDATE public.menu_items
    SET parent_menu_id = NULL,
        menu_level = 1,
        updated_at = NOW()
    WHERE parent_menu_id = v_sim_exec
      AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;

  -- Dashboard first among root siblings under PMO Workspace
  UPDATE public.menu_items
  SET sort_order = 5,
      updated_at = NOW()
  WHERE menu_code IN ('plat_dashboard_pmo', 'pmo_dashboard', 'pmo-dashboard', 'plat_pm_dashboard')
    AND COALESCE(is_deleted, FALSE) = FALSE
    AND parent_menu_id IS NULL
    AND route_path ILIKE '%/platform/dashboard%'
    AND menu_label NOT ILIKE '%monitoring%'
    AND menu_label NOT ILIKE '%executive%';

  UPDATE public.menu_items
  SET sort_order = 5,
      updated_at = NOW()
  WHERE menu_code IN ('sim_pmo_dashboard')
    AND COALESCE(is_deleted, FALSE) = FALSE
    AND parent_menu_id IS NULL;

  -- Also catch any remaining Dashboard leaf still under exec by path/label
  UPDATE public.menu_items AS item
  SET parent_menu_id = NULL,
      menu_level = 1,
      sort_order = LEAST(COALESCE(item.sort_order, 99), 5),
      updated_at = NOW()
  FROM public.menu_items AS cat
  WHERE cat.menu_code IN ('pmo-cat-exec', 'sim_pmo_cat_exec', 'plat_sec_exec_overview')
    AND item.parent_menu_id = cat.id
    AND COALESCE(item.is_deleted, FALSE) = FALSE
    AND (
      item.menu_label ILIKE 'dashboard'
      OR item.menu_label ILIKE 'practice dashboard'
      OR (item.route_path ILIKE '%/platform/dashboard%' AND item.menu_label NOT ILIKE '%executive%')
      OR item.route_path ILIKE '%/simulator/pmo/dashboard%'
      OR item.route_path ILIKE '%/simulator/dashboard%'
    );

  -- Remove Executive Overview wrappers from the sidebar
  UPDATE public.menu_items
  SET is_active = FALSE,
      is_visible = FALSE,
      updated_at = NOW()
  WHERE menu_code IN ('pmo-cat-exec', 'sim_pmo_cat_exec', 'plat_sec_exec_overview')
    AND COALESCE(is_deleted, FALSE) = FALSE;

  RAISE NOTICE 'v1000: Dashboard promoted to root; Executive Overview category deactivated';
END $$;

-- Verification
SELECT mi.menu_code, mi.menu_label, mi.route_path, mi.parent_menu_id, mi.sort_order, mi.is_active, mi.is_visible
FROM public.menu_items mi
WHERE mi.menu_code IN (
    'pmo-cat-exec', 'sim_pmo_cat_exec', 'plat_sec_exec_overview',
    'plat_dashboard_pmo', 'pmo_dashboard', 'plat_pm_dashboard', 'sim_pmo_dashboard'
  )
   OR (
     mi.parent_menu_id IS NULL
     AND mi.menu_label ILIKE 'dashboard'
     AND COALESCE(mi.is_deleted, FALSE) = FALSE
   )
ORDER BY mi.menu_code;

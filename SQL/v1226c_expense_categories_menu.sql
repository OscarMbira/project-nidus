-- ============================================================================
-- v1226c: Expense Categories admin — menu_items + role_menu_items
-- (Platform + Simulator). Part of v1226 itemized expense claims initiative.
-- Prerequisites: v153 (pmo_admin_section parent, Platform), v1167 (sim_pmo_cat_admin
-- parent, Simulator), v1226a/v1226b (expense_categories tables).
-- ============================================================================

-- ── Platform: nested under pmo_admin_section ───────────────────────────────

DO $$
DECLARE
  v_parent_id UUID;
  v_sort_order INTEGER;
BEGIN
  SELECT id INTO v_parent_id
  FROM public.menu_items
  WHERE menu_code = 'pmo_admin_section' AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_parent_id IS NULL THEN
    RAISE NOTICE 'pmo_admin_section parent not found — skipping Platform expense-categories menu item';
  ELSE
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_sort_order
    FROM public.menu_items
    WHERE parent_menu_id = v_parent_id AND COALESCE(is_deleted, FALSE) = FALSE;

    INSERT INTO public.menu_items (
      menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
      route_path, menu_icon, is_visible, is_active
    )
    VALUES (
      'pmo_admin_expense_categories',
      'Expense Categories',
      'Manage expense claim line-item categories',
      v_parent_id,
      2,
      v_sort_order,
      '/platform/pmo-admin/expense-categories',
      'receipt',
      TRUE,
      TRUE
    )
    ON CONFLICT (menu_code) DO UPDATE SET
      menu_label = EXCLUDED.menu_label,
      menu_description = EXCLUDED.menu_description,
      route_path = EXCLUDED.route_path,
      parent_menu_id = EXCLUDED.parent_menu_id,
      menu_icon = EXCLUDED.menu_icon,
      sort_order = EXCLUDED.sort_order,
      is_visible = TRUE,
      is_active = TRUE,
      is_deleted = FALSE,
      updated_at = NOW();
  END IF;
END $$;

INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
SELECT r.id, m.id, TRUE, TRUE, TRUE
FROM public.roles r
CROSS JOIN public.menu_items m
WHERE r.role_name IN ('pmo_admin', 'system_admin')
  AND m.menu_code = 'pmo_admin_expense_categories'
  AND COALESCE(m.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- ── Simulator: nested under sim_pmo_cat_admin ──────────────────────────────

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'sim-pmo-expense-categories', 'Expense Categories',
       'Manage expense claim line-item categories', '/simulator/pmo/expense-categories',
       (SELECT id FROM public.menu_items WHERE menu_code = 'sim_pmo_cat_admin' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, 100, 'universal', 'receipt', TRUE, TRUE, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM public.menu_items WHERE menu_code = 'sim_pmo_cat_admin' AND COALESCE(is_deleted, FALSE) = FALSE)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  route_path = EXCLUDED.route_path,
  parent_menu_id = EXCLUDED.parent_menu_id,
  menu_icon = EXCLUDED.menu_icon,
  sort_order = EXCLUDED.sort_order,
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code = 'sim-pmo-expense-categories'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND lower(replace(r.role_name, ' ', '_')) IN ('pmo_admin', 'system_admin', 'account_owner')
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$ BEGIN
  RAISE NOTICE 'v1226c_expense_categories_menu.sql applied successfully';
END $$;

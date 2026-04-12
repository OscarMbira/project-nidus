-- ============================================================================
-- v422: Financial Management — menu_items + role_menu_items (v349 Phase 6)
-- Prerequisites: menu_items, roles, v416 permissions optional
-- ============================================================================

DO $$
DECLARE
  v_fin_parent UUID;
BEGIN
  INSERT INTO menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  )
  VALUES (
    'financial_management_hub',
    'Financial Management',
    'Costs, EVM, profitability, expenses, and reports',
    NULL,
    1,
    62,
    NULL,
    'dollar-sign',
    TRUE,
    TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    sort_order = EXCLUDED.sort_order,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  SELECT id INTO v_fin_parent FROM menu_items WHERE menu_code = 'financial_management_hub' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;

  INSERT INTO menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  )
  VALUES
    ('financial_reports', 'Financial Reports', 'Cross-entity financial reporting hub', v_fin_parent, 2, 1, '/platform/financial-reports', 'file-bar-chart', TRUE, TRUE),
    ('my_expenses', 'My Expenses', 'Submit and track expense claims', v_fin_parent, 2, 2, '/platform/expenses/my', 'receipt', TRUE, TRUE),
    ('expense_approvals', 'Expense Approvals', 'Approve expense claims in your scope', v_fin_parent, 2, 3, '/platform/expenses/approvals', 'clipboard-check', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  INSERT INTO menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  )
  VALUES (
    'pmo_expense_thresholds',
    'Expense Thresholds',
    'Configure approval amount bands',
    NULL,
    1,
    63,
    '/platform/pmo-admin/expense-thresholds',
    'sliders-horizontal',
    TRUE,
    TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    route_path = EXCLUDED.route_path,
    menu_icon = EXCLUDED.menu_icon,
    updated_at = NOW();
END $$;

-- Six financial roles + board/sponsor/executive for hub
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name IN (
  'system_admin', 'pmo_admin', 'project_manager', 'programme_manager', 'portfolio_manager',
  'project_sponsor', 'executive', 'project_board_member'
)
  AND m.menu_code IN ('financial_management_hub', 'financial_reports', 'expense_approvals')
  AND COALESCE(m.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- My expenses: all active roles
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
CROSS JOIN menu_items m
WHERE COALESCE(r.is_active, TRUE) AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND m.menu_code = 'my_expenses'
  AND COALESCE(m.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- PMO: expense thresholds
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name IN ('system_admin', 'pmo_admin')
  AND m.menu_code = 'pmo_expense_thresholds'
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

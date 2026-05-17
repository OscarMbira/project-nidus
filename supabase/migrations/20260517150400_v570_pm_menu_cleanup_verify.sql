-- ============================================================================
-- v570: PM menu cleanup verification + block PMO-exclusive routes for project_manager
-- Extends v398 patterns. Run after v569.
-- ============================================================================

DO $$
DECLARE
  v_pm_role_id UUID;
  v_row_count INT;
BEGIN
  SELECT id INTO v_pm_role_id FROM roles WHERE role_name = 'project_manager' LIMIT 1;
  IF v_pm_role_id IS NULL THEN
    RAISE NOTICE 'v570: project_manager not found';
    RETURN;
  END IF;

  UPDATE role_menu_items rmi
  SET is_active = FALSE, is_deleted = TRUE, updated_at = NOW()
  FROM menu_items mi
  WHERE rmi.role_id = v_pm_role_id
    AND rmi.menu_item_id = mi.id
    AND COALESCE(rmi.is_deleted, FALSE) = FALSE
    AND (
      mi.route_path ILIKE '/pmo/planning%'
      OR mi.route_path ILIKE '/pmo/oversight%'
      OR mi.route_path ILIKE '/platform/portfolio%'
      OR mi.route_path ILIKE '/platform/programme%'
      OR mi.route_path ILIKE '/platform/benefits%'
      OR mi.route_path ILIKE '/platform/pmo-admin%'
      OR mi.route_path ILIKE '/platform/admin/email%'
      OR mi.route_path ILIKE '/platform/organisation/branding%'
      OR mi.menu_code ILIKE 'pmo_%'
      OR mi.menu_code IN ('pm_fin_portfolio_evm', 'pm_fin_exp_approvals')
      OR mi.menu_label ILIKE 'Portfolio EVM'
      OR mi.menu_label ILIKE 'PMO Dashboard'
      OR mi.menu_label ILIKE 'Executive Overview'
    );

  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  RAISE NOTICE 'v570: deactivated % PMO-exclusive role_menu_items for project_manager', v_row_count;
END $$;

-- Verification: active PM menu items (should show v568 structure only)
SELECT mi.menu_code, mi.menu_label, mi.route_path, rmi.can_view, rmi.can_use
FROM role_menu_items rmi
JOIN menu_items mi ON mi.id = rmi.menu_item_id
JOIN roles r ON r.id = rmi.role_id
WHERE r.role_name = 'project_manager'
  AND rmi.is_active = TRUE
  AND COALESCE(rmi.is_deleted, FALSE) = FALSE
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ORDER BY mi.sort_order, mi.menu_label;

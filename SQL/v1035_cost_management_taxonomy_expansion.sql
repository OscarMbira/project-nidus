-- ============================================================================
-- v1035: Cost Management taxonomy expansion (Platform PM sidebar)
-- ============================================================================
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3, Cost Management branch: Budget
-- (already wired, v1015/v1017), Actuals (Actual Costs/Commitments/Accruals/Transactions),
-- Forecast (Estimate to Complete/Estimate at Completion/Variance/History), Cost Performance
-- (Planned vs Actual/Variance/Trend/Indicators).
--
-- Live audit found:
--   - Actuals: CostActualsListPage.jsx already covers all 4 sub-items via one `transaction_type`
--     filter (actual/commitment/accrual — a generic ledger, v963 Phase 6), already routed at the
--     flat /platform/cost-actuals using usePlatformProjectId() — just never linked from the
--     sidebar.
--   - Forecast + Cost Performance: ProjectEVMPage.jsx already shows SPI/CPI (Indicators/Trend)
--     and EAC (Estimate at Completion) in one view (evmService.js) — genuinely one page covering
--     both taxonomy branches (EVM metrics are inherently a single computed set, not separable
--     into two registers), same "facets of one page" reasoning as Business Case/Governance
--     elsewhere in this taxonomy pass. Was only reachable via a project-path-scoped route
--     (/platform/projects/:projectId/evm, useParams()) — same routing-bug class fixed for Brief/
--     PIDs/Business Case/Planning Calendar earlier; companion frontend change switches it to
--     usePlatformProjectId() and adds a flat /platform/evm sibling route.
-- ============================================================================

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), v.menu_code, v.menu_label, v.menu_description, v.route_path,
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_financial' AND COALESCE(is_deleted, FALSE) = FALSE),
  (SELECT menu_level FROM public.menu_items WHERE menu_code = 'plat_pm_fin_reports' AND COALESCE(is_deleted, FALSE) = FALSE),
  v.sort_order, 'universal', v.menu_icon, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('plat_pm_cost_actuals',  'Actuals',                  'Actual costs, commitments, accruals, and transactions against the budget (taxonomy §3, Cost Management > Actuals).', '/platform/cost-actuals', 15, 'receipt'),
  ('plat_pm_cost_evm',      'Forecast & Performance',   'Estimate to complete/at completion, cost/schedule variance, and performance indicators (taxonomy §3, Cost Management > Forecast + Cost Performance).', '/platform/evm', 25, 'trending-up')
) AS v(menu_code, menu_label, menu_description, route_path, sort_order, menu_icon)
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = v.menu_code AND COALESCE(is_deleted, FALSE) = FALSE
);

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_fin_reports'
JOIN public.menu_items dst ON dst.menu_code IN ('plat_pm_cost_actuals', 'plat_pm_cost_evm') AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1035: Cost Management — Actuals + Forecast & Performance leaves added';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, route_path, sort_order FROM public.menu_items
--   WHERE menu_code IN ('plat_grp_pm_financial', 'plat_pm_budget', 'plat_pm_cost_actuals', 'plat_pm_cost_evm', 'plat_pm_fin_reports')
--   ORDER BY sort_order;

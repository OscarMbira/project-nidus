-- =============================================================================
-- v963e: Cost Actuals Ledger — sidebar wiring (Platform + Simulator)
-- =============================================================================
-- projectplan/v963_pmis_core_gap_closure_plan.md Phase 6.
-- Platform: nested under plat_grp_financial (Financial Management), alongside Portfolio EVM —
-- the existing Cost Management area (v681). Simulator has no equivalent dedicated Financial
-- subgroup under its PM layout (sim_pm_financial is a single leaf, not a group) — nested under
-- sim_pm_ctrl_scope (Scope & Value, v879) instead, alongside the Benefits Register, since that's
-- the closest existing "value/financial-adjacent registers" category.
-- Prerequisites: v681 (plat_grp_financial), v879 (sim_pm_ctrl_scope).
-- =============================================================================

-- ── Platform leaf ────────────────────────────────────────────────────────────────

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), 'plat_fin_cost_actuals', 'Cost Actuals', 'Transaction ledger of actual costs, commitments and accruals against project budgets',
  '/platform/cost-actuals',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_financial' AND COALESCE(is_deleted,FALSE)=FALSE),
  3, 25, 'universal', 'receipt', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_fin_cost_actuals' AND COALESCE(is_deleted,FALSE)=FALSE);

-- ── Simulator leaf ───────────────────────────────────────────────────────────────

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), 'sim_pm_cost_actuals', 'Cost Actuals', 'Transaction ledger of actual costs, commitments and accruals against practice project budgets',
  '/simulator/practice-projects/cost-actuals',
  (SELECT id FROM public.menu_items WHERE menu_code = 'sim_pm_ctrl_scope' AND COALESCE(is_deleted,FALSE)=FALSE),
  4, 40, 'universal', 'receipt', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items WHERE menu_code = 'sim_pm_cost_actuals' AND COALESCE(is_deleted,FALSE)=FALSE);

-- ── Role grants — Platform ──────────────────────────────────────────────────────

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), (SELECT id FROM public.roles WHERE role_name = 'system_admin'), mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi WHERE mi.menu_code = 'plat_fin_cost_actuals' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), (SELECT id FROM public.roles WHERE role_name = 'account_owner'), mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi WHERE mi.menu_code = 'plat_fin_cost_actuals' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), (SELECT id FROM public.roles WHERE role_name = 'pmo_admin'), mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi WHERE mi.menu_code = 'plat_fin_cost_actuals' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), (SELECT id FROM public.roles WHERE role_name = 'project_manager'), mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi WHERE mi.menu_code = 'plat_fin_cost_actuals' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

-- ── Role grants — Simulator ──────────────────────────────────────────────────────

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), (SELECT id FROM public.roles WHERE role_name = 'simulator_admin'), mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi WHERE mi.menu_code = 'sim_pm_cost_actuals' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), (SELECT id FROM public.roles WHERE role_name = 'sim_pmo_admin'), mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi WHERE mi.menu_code = 'sim_pm_cost_actuals' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), (SELECT id FROM public.roles WHERE role_name = 'sim_project_manager'), mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi WHERE mi.menu_code = 'sim_pm_cost_actuals' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

DO $$ BEGIN
  RAISE NOTICE 'v963e_cost_actuals_ledger_sidebar_seed.sql applied successfully';
END $$;

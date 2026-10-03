-- ============================================================================
-- v980: Dedupe "Financial Management" — financial_management_hub (v422) vs.
--        the pre-existing plat_grp_financial group
-- ============================================================================
-- Found live in the Platform sidebar (PMO layout, "Reporting & Intelligence" branch)
-- immediately after v422_financial_menu_items.sql was run today as part of the Cost
-- Management prerequisite batch (v416-v425): TWO top-level groups both labeled
-- "Financial Management" render side by side.
--
-- financial_management_hub (v422, newly surfaced today) has 3 children:
--   - financial_reports    -> /platform/financial-reports  (8 grants)
--   - expense_approvals    -> /platform/expenses/approvals  (8 grants)
--   - my_expenses          -> /platform/expenses/my          (111 grants -- new content)
--
-- plat_grp_financial (pre-existing, parent = plat_sec_reporting "Reporting & Intelligence")
-- already has 7 children, including 2 that point at the EXACT SAME routes:
--   - plat_fin_reports     -> /platform/financial-reports   (19 grants) -- same route as financial_reports
--   - plat_fin_approvals   -> /platform/expenses/approvals  (12 grants) -- same route as expense_approvals
--   - plat_fin_cost_actuals, plat_fin_programme_evm, plat_fin_project_evm, plat_fin_evm,
--     plat_fin_thresholds -- no equivalent in financial_management_hub, untouched.
--
-- Resolution (Pattern-B consolidation, same mechanics used throughout this initiative for
-- Risk Register/Work Packages/Calendar duplicates): migrate the 2 duplicate-route children's
-- unique grants onto their plat_grp_financial counterparts, deactivate the financial_management_hub
-- versions. Re-parent my_expenses (same id, no grant migration needed) into plat_grp_financial
-- as the one genuinely new leaf. Deactivate the now-empty financial_management_hub group itself.
-- ============================================================================

-- ── 1. financial_reports -> migrate onto plat_fin_reports, deactivate loser ─────────────────

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, keeper.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items loser ON loser.id = src.menu_item_id AND loser.menu_code = 'financial_reports'
JOIN public.menu_items keeper ON keeper.menu_code = 'plat_fin_reports' AND COALESCE(keeper.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

UPDATE public.menu_items SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
WHERE menu_code = 'financial_reports' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.role_menu_items rmi SET is_active = FALSE, updated_at = NOW()
FROM public.menu_items mi
WHERE rmi.menu_item_id = mi.id AND mi.menu_code = 'financial_reports' AND COALESCE(rmi.is_deleted, FALSE) = FALSE;

-- ── 2. expense_approvals -> migrate onto plat_fin_approvals, deactivate loser ────────────────

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, keeper.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items loser ON loser.id = src.menu_item_id AND loser.menu_code = 'expense_approvals'
JOIN public.menu_items keeper ON keeper.menu_code = 'plat_fin_approvals' AND COALESCE(keeper.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

UPDATE public.menu_items SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
WHERE menu_code = 'expense_approvals' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.role_menu_items rmi SET is_active = FALSE, updated_at = NOW()
FROM public.menu_items mi
WHERE rmi.menu_item_id = mi.id AND mi.menu_code = 'expense_approvals' AND COALESCE(rmi.is_deleted, FALSE) = FALSE;

-- ── 3. my_expenses -> re-parent into plat_grp_financial (same id, no grant migration) ────────

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_financial' AND COALESCE(is_deleted, FALSE) = FALSE),
    updated_at = NOW()
WHERE menu_code = 'my_expenses' AND COALESCE(is_deleted, FALSE) = FALSE;

-- ── 4. financial_management_hub -> now empty, deactivate the group itself ────────────────────

UPDATE public.menu_items SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
WHERE menu_code = 'financial_management_hub' AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN RAISE NOTICE 'v980_financial_management_hub_dedup.sql applied successfully'; END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, parent_menu_id, is_active
--   FROM public.menu_items
--   WHERE menu_code IN ('financial_management_hub', 'financial_reports', 'expense_approvals', 'my_expenses');
--   -- expect financial_management_hub/financial_reports/expense_approvals inactive,
--   -- my_expenses active with parent_menu_id = plat_grp_financial's id.

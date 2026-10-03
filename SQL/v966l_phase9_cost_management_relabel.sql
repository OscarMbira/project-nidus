-- ============================================================================
-- v966l: Core PM Menu Rationalisation — Phase 9 (taxonomy group 5 of N): Cost Management
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 9.
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3 (Cost Management: Budget / Actuals /
-- Forecast / Cost Performance).
--
-- Unlike the prior four Phase 9 files (v966h-v966k), this is a pure RELABEL, not a re-parent —
-- the existing "Financial" top-level PM group (menu_code plat_grp_pm_financial, unchanged) is
-- already 100% cost-management content end to end (My Expenses / Expense Approvals / Financial
-- Reports — actuals, approvals-on-actuals, and cost-performance reporting respectively). No
-- child row moves; only this row's own menu_label changes to match taxonomy §3's group name.
-- menu_code, id, and children are all untouched, so every existing role_menu_items grant and
-- every DB parent_menu_id relationship in this subtree is completely unaffected.
--
-- Why a DB UPDATE is required (not just a JS label change): applyCategoryPresentationLabels()
-- in packages/config/src/pmoMenuHierarchyUtils.js only fills in a category's presentation label
-- when the DB's own menu_label is missing or equals the raw menu_code — it deliberately never
-- overrides a real, already-set DB label (CLAUDE.md rule 25.1's "never override a real DB
-- value" contract). Since this row's menu_label is already the real string "Financial", the
-- paired PM_CATEGORY_DEFS label change alone would be inert without this UPDATE.
-- ============================================================================

UPDATE public.menu_items
SET menu_label = 'Cost Management',
    updated_at = NOW()
WHERE menu_code = 'plat_grp_pm_financial' AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN RAISE NOTICE 'v966l_phase9_cost_management_relabel.sql applied successfully'; END $$;

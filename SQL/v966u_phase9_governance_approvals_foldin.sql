-- ============================================================================
-- v966u: Core PM Menu Rationalisation — Phase 9 (finishing touch): Governance > Approvals fold-in
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 9.
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3 (Governance > Approvals: Pending /
-- Approved / Rejected / History).
--
-- Two prior runs deliberately left this deferred as "bigger, more invasive" without attempting it.
-- Investigation this run found it is materially simpler than feared: the existing "Authorisation"
-- top-level PM group (plat_grp_pm_auth) has exactly 3 children, ALL already universal methodology,
-- ALL already well-granted, and ALL a clean match for taxonomy's Approvals sub-group:
--   - plat_pm_pending_approval  "Pending My Approval"   (/pmo/authorisation/queue)     30 grants
--   - plat_pm_submitted         "My Submitted Records"  (/pm/authorisation/submitted)  29 grants
--   - plat_pm_approval_chains   "Approval Chains"       (/pmo/authorisation/chains)    19 grants
-- Re-parented into the existing plat_pm_governance group (created by SQL/v966k, currently holding
-- only Decision Log). Same-id re-parent for all 3 — no grant migration needed.
--
-- Code-path check before attempting this (the plan's stated precondition for going ahead):
--   - PM_PLATFORM_SEC_TARGETS (packages/config/src/pmoMenuHierarchyUtils.js) maps two LEGACY
--     orphan codes (plat_sec_approvals_gov, plat_sec_approvals_reporting) to plat_grp_pm_auth —
--     but both source rows were already deactivated by SQL/v966g (Phase 10's empty-stub cleanup,
--     "Approvals & Governance" / "Approvals & Reporting"), so these mapping entries are inert
--     today and unaffected by this file.
--   - inferPmPlatformCategoryId's regex fallback (line ~934) independently matches "authorisation"
--     text to plat_grp_pm_auth — this only fires for ORPHAN rows with no real DB parent. All 3 rows
--     moved here keep a real DB parent (plat_pm_governance) after this file runs, so they never hit
--     this fallback path regardless.
--   - plat_grp_pm_auth becomes permanently empty (0 remaining children) after this file. It is
--     deliberately left in PM_CATEGORY_DEFS rather than removed — filterPmLayoutMenuItems() already
--     strips any node with no route_path AND no children (packages/config/src/
--     pmoMenuHierarchyUtils.js), so the empty header simply stops rendering for every role, with no
--     JS cleanup required — the same "leave the empty parent, let the filter hide it" pattern
--     already used for Controls & Registers / Knowledge & Governance in SQL/v966h/v966k/v966q.
--   - PMO_CATEGORY_DEFS's own "Workflows & Governance" bucket (pmo-cat-workflows-approvals) is a
--     separate, out-of-scope layout per PRD decision 11 and is untouched by this file.
--
-- Harness-verified (before/after across all 111 live roles): the only visible change is
-- plat_grp_pm_auth ("Authorisation") disappearing from the PM sidebar for the 30 roles that had it
-- (correct — it is now permanently empty) and its 3 children reappearing, unchanged in every other
-- respect, as children of Governance instead. An explicit per-role menu_code presence scan confirms
-- zero codes are lost (only plat_grp_pm_auth itself, expected) and zero new duplicates appear
-- anywhere in the tree for any role.
-- ============================================================================

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_governance' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 3,
    sort_order = 20,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_pending_approval' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_governance' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 3,
    sort_order = 30,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_submitted' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_governance' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 3,
    sort_order = 40,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_approval_chains' AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN RAISE NOTICE 'v966u_phase9_governance_approvals_foldin.sql applied successfully'; END $$;

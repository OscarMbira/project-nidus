-- ============================================================================
-- v966aj: Core PM Menu Rationalisation — Phase 1 follow-up: re-parent 3 of the 4 "remaining
-- items" into the "Platform" top-level sidebar wrapper.
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 1.
--
-- CONTEXT: Phase 1 (already run, part of the v966a-v966ab batch) added a JS-only change —
-- PLATFORM_INFRA_TOP_LEVEL_CODES in packages/config/src/pmoMenuHierarchyUtils.js — that splits
-- any LITERAL TOP-LEVEL menu_items root whose menu_code is in that Set into a new "Platform"
-- sidebar wrapper (sibling of "Core Project Management"). It shipped scoped to just 2 codes
-- (plat_sec_system_admin, plat_sec_account) because the other 4 candidate items were, at the
-- time, NESTED CHILDREN of other DB sections, not literal top-level roots — and the plan
-- deferred them pending harness verification (this file's own work).
--
-- INVESTIGATION METHOD: a Node harness (esbuild-bundling the REAL, unmodified
-- packages/config/src/pmoMenuHierarchyUtils.js/methodologyMenuUtils.js/
-- pmoLayoutMenuExclusions.js/pmoMenuSemanticDedupe.js/menuDbOnlyUtils.js, run against a fresh
-- live snapshot of menu_items (2077 rows) / role_menu_items (11094 rows) / roles (111 rows)
-- fetched via PostgREST immediately before this file was written) was used to simulate, for
-- EACH of the 4 candidate items independently: (a) re-parenting the row's parent_menu_id to
-- NULL (making it a literal top-level DB root) and (b) adding its menu_code to
-- PLATFORM_INFRA_TOP_LEVEL_CODES in a patched copy of the real JS file — then diffing the
-- rendered menu_code set for ALL 111 roles at both 'pmo' and 'pm' layouts, before vs after.
--
-- FINDING — the mechanism only works for "childful" rows (a group with its own real DB
-- children), not for a childless leaf. groupMenuTreeByIndustryPack() only inspects the FIRST
-- level of the already-built, already-classified sidebar tree; a childFUL orphan root gets
-- promoted directly under its own code by reorganizeMenuRoots()'s v946 rule, bypassing
-- classification entirely (that's why this reaches the top level at all) — but a CHILDLESS leaf
-- is always individually classified by inferPlatformCategoryId() (PMO layout, route/label
-- regexes) or inferPmPlatformCategoryId() (PM layout, the explicit
-- PM_TRACK_AND_GROUP_CODE_TARGETS map plus its own regex fallbacks) into whatever category its
-- own identity matches, and nests there — never reaching the top level groupMenuTreeByIndustryPack
-- checks, regardless of where its DB parent points.
--
-- RESULT: 3 of the 4 items are childFUL groups — harness-confirmed SAFE, re-parented below.
-- The other 2 (plat_xf_okr, plat_xf_integrations) are childLESS leaves — harness-confirmed
-- INERT (re-parenting + the JS Set addition produced a byte-for-byte identical rendered tree,
-- before vs after, for every one of their granted roles at both layouts) — NOT touched by this
-- file. See the updated comment block above PLATFORM_INFRA_TOP_LEVEL_CODES in
-- packages/config/src/pmoMenuHierarchyUtils.js for the full per-item reasoning.
--
-- ITEM-BY-ITEM:
--
-- 1. Template Library (plat_grp_template_library) — currently a child of plat_sec_knowledge
--    ("Knowledge & Operations"), 12 live grants, 4 real children (plat_pt_hub/plat_pt_new/
--    plat_pt_industry/plat_pt_browse). Harness: on PMO layout, moves cleanly from
--    nested-under-Knowledge-&-Operations to a standalone "Template Library" entry under the new
--    "Platform" wrapper, for all 12 granted roles, zero loss/duplication across all 111 roles.
--    On PM layout: confirmed ABSENT from the rendered tree both before and after this change (a
--    separate, pre-existing gap — plat_sec_knowledge's PM-layout childful-orphan promotion is
--    filtered out by reorganizeMenuRoots()'s pm/tm-only "must start with plat_pm_" sweep
--    restriction — unrelated to and unaffected by this file).
--
-- 2. Strategy & OKRs — GROUP variant only (plat_grp_okr). LIVE-DATA CORRECTION to the task
--    brief: this row's real DB parent is plat_sec_knowledge ("Knowledge & Operations"), NOT
--    plat_sec_cross_fw as the brief assumed — there are genuinely TWO different "Strategy &
--    OKRs" rows in the DB today (a pre-existing, unrelated duplication, not caused or fixed by
--    this file):
--      - plat_grp_okr (this one) — a GROUP with its own 4 children (OKR Dashboard/Objectives &
--        Key Results/Alignment Map/OKR Check-ins, all under /pmo/okr*), 3 live grants
--        (system_admin, account_owner, pmo_admin only — no PM-layout role holds this grant, so
--        PM layout is moot for this specific row).
--      - plat_xf_okr — a single LEAF row (route /pmo/okr, 22 grants, including many PM-layout
--        roles) — this is the childLESS leaf confirmed INERT above, deliberately NOT touched by
--        this file. It stays exactly where it is (child of plat_sec_cross_fw).
--    Harness: plat_grp_okr moves cleanly to "Platform" for its 3 granted roles on PMO layout,
--    zero loss/duplication across all 111 roles at both layouts.
--
-- 3. Process Group Forms (plat_grp_process_groups) — currently a child of
--    plat_sec_standards_based ("Standards-Based"), 12 live grants, 8 real children (Initiating/
--    Planning/Executing/Monitoring & Controlling/Closing/Drafts/Approvals/New Template). Harness:
--    on PMO layout, moves cleanly from a childful-orphan-promoted top-level position inside "Core
--    Project Management" to the same top-level position inside "Platform" instead, for all 12
--    granted roles, zero loss/duplication across all 111 roles. Confirmed pre-existing, unrelated
--    duplicate: a DIFFERENT node also labelled "Process Group Forms" (menu_code
--    pmo-cat-standards-based, holding only "ITTO Templates / Drafts") already exists under the
--    "Standards-Based" methodology track header — untouched by this file, not the same feature,
--    not caused by this change. On PM layout: confirmed ABSENT from the rendered tree both before
--    and after (same pre-existing plat_pm_-prefix sweep restriction as Template Library above) —
--    unrelated to and unaffected by this file.
--
-- 4. Integrations (plat_xf_integrations) — childLESS leaf, deliberately NOT touched. Harness
--    finding worth flagging as a follow-up bug ticket (same class as the already-documented
--    Timesheets/plat_tm_lesson_actions orphan-visibility bug in Phase 9): this row is confirmed
--    COMPLETELY ABSENT from the PMO-layout sidebar today for every one of its 12 granted roles,
--    not merely mis-nested — inferPlatformCategoryId() has no "integrations" regex match at all,
--    so it falls through to the pmo-cat-admin default, but the v671 subsection restructuring for
--    pmo-cat-admin's children then drops it (it doesn't match any of that section's specific
--    subsection predicates, and a DIFFERENT row, pmo-admin-integrations, already occupies the
--    "Integrations" position under PMO Administration > Extensions & Integrations). Pre-existing,
--    unrelated to this initiative, NOT fixed here.
--
-- MATCHING JS CHANGE (already applied to the working tree, verify it is deployed before running
-- this SQL): PLATFORM_INFRA_TOP_LEVEL_CODES in packages/config/src/pmoMenuHierarchyUtils.js (the
-- REAL file resolved by @nidus/config/pmoMenuHierarchyUtils — NOT apps/platform or
-- apps/simulator's dead shadow copies) gained 'plat_grp_template_library', 'plat_grp_okr',
-- 'plat_grp_process_groups'. packages/config's full test suite re-run: 101/101 passing. esbuild
-- --bundle syntax-check: clean. apps/platform/src/utils/menuCacheUtils.js's
-- SIDEBAR_CACHE_VERSION bumped 60->61 in the same change.
--
-- These are re-parents, not deletions — each UPDATE keeps the row's existing id, so
-- role_menu_items grants carry over automatically with zero migration risk, same as every other
-- Phase 9 re-parent in this initiative.
--
-- Simulator parity: NOT attempted — Phase 1's own JS change was never mirrored to
-- apps/simulator/src/config/pmoMenuHierarchyUtils.js either (that file is a dead shadow copy,
-- untouched); both remain deferred together to Phase 14. Note the SHARED file this SQL's JS
-- companion change touched IS also imported by Simulator's useMenu.js/useSimMenu.js via
-- @nidus/config — confirmed inert for Simulator regardless, since sim.menu_items has no rows
-- with any of the 3 newly-added plat_grp_* codes.
-- ============================================================================

-- 1. Template Library — re-parent out of plat_sec_knowledge to become a literal top-level root.
UPDATE public.menu_items
SET parent_menu_id = NULL,
    menu_level = 1,
    updated_at = NOW()
WHERE menu_code = 'plat_grp_template_library' AND COALESCE(is_deleted, FALSE) = FALSE;

-- 2. Strategy & OKRs (GROUP variant only — plat_grp_okr) — re-parent out of plat_sec_knowledge.
--    plat_xf_okr (the leaf variant) is deliberately NOT touched — see header.
UPDATE public.menu_items
SET parent_menu_id = NULL,
    menu_level = 1,
    updated_at = NOW()
WHERE menu_code = 'plat_grp_okr' AND COALESCE(is_deleted, FALSE) = FALSE;

-- 3. Process Group Forms — re-parent out of plat_sec_standards_based.
UPDATE public.menu_items
SET parent_menu_id = NULL,
    menu_level = 1,
    updated_at = NOW()
WHERE menu_code = 'plat_grp_process_groups' AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN RAISE NOTICE 'v966aj_phase1_platform_infra_reparent.sql applied successfully'; END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, parent_menu_id, menu_level
--   FROM public.menu_items
--   WHERE menu_code IN ('plat_grp_template_library', 'plat_grp_okr', 'plat_grp_process_groups');
--   -- expect parent_menu_id IS NULL, menu_level = 1 for all 3 rows.

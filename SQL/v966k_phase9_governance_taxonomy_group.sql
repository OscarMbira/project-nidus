-- ============================================================================
-- v966k: Core PM Menu Rationalisation — Phase 9 (taxonomy group 4 of N): Governance
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 9.
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3 (Governance: Decisions / Actions /
-- Approvals / Stage Gates / Meetings).
--
-- Fourth taxonomy group split out of the old functional "Controls & Registers" bucket (after
-- v966h RAID, v966i Benefits, v966j Change Control). Decision Log is currently one leaf nested
-- under Controls & Registers > Knowledge & Governance, alongside Lessons Log (which stays —
-- taxonomy §3 places Lessons Learned under Project Closure, a group not yet built) and RAID Log
-- (already moved to the RAID group by v966h).
--
-- Deliberately conservative scope for this file: taxonomy's Governance>Approvals sub-leaf is
-- already served today by the existing "Authorisation" top-level group (Pending My Approval /
-- My Submitted Records / Approval Chains) — that group is NOT renamed or folded into this new
-- Governance group by this file. Merging them is a materially bigger, more invasive change
-- (Authorisation is referenced by several other maps: PM_PLATFORM_SEC_TARGETS,
-- PMO_ONLY_PM_LAYOUT_DROP_CODES, the PMO-layout inferPlatformCategoryId's own
-- 'pmo-cat-workflows-approvals' bucket) that needs its own dedicated, separately-verified pass —
-- left as a follow-up decision, not guessed at here. This file only creates the new Governance
-- group and moves the one leaf (Decision Log) that has no other unambiguous home.
--
-- Same no-grant-migration-needed pattern as the prior three files: the leaf keeps its existing
-- menu_items.id, so every role already granted plat_pm_s_decision_log keeps exactly the same
-- visibility with only a parent_menu_id/menu_level/sort_order change.
-- ============================================================================

-- ── Step 1: create the new "Governance" top-level PM category row ───────────────────────────

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_governance', 'Governance',
  'Decisions, actions, stage gates, and governance meetings (taxonomy §3). Approvals live under the existing Authorisation group.',
  NULL,
  (SELECT parent_menu_id FROM public.menu_items
     WHERE menu_code = 'plat_grp_pm_controls' AND COALESCE(is_deleted, FALSE) = FALSE),
  2, 115, 'universal', 'clipboard', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_governance' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- ── Step 2: re-parent Decision Log under the new row ─────────────────────────────────────────
-- Note: this row's own `methodology` column stays 'structured' (unchanged) — that reflects the
-- underlying capability's methodology scope, not its sidebar placement, and the harness
-- (projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 9 notes) confirmed moving a
-- structured-methodology leaf into a universal category row does not change its visibility
-- (it already worked this way nested under the old universal "Controls & Registers" group).

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_governance' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 3,
    sort_order = 10,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_s_decision_log' AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN RAISE NOTICE 'v966k_phase9_governance_taxonomy_group.sql applied successfully'; END $$;

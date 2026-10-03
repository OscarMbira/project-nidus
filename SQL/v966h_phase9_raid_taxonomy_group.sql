-- ============================================================================
-- v966h: Core PM Menu Rationalisation — Phase 9 (taxonomy group 1 of N): RAID
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 9.
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3 (RAID: Risks / Assumptions /
-- Issues / Dependencies).
--
-- Phase 9 rebuilds the PM-layout top-level sidebar ("Core Project Management") to match
-- taxonomy §3's discipline groups. Per this run's own scope decision (see plan Phase 9
-- write-up), this is done ONE taxonomy group at a time, each verified with a local harness
-- script that runs the REAL packages/config/src/pmoMenuHierarchyUtils.js functions against a
-- real snapshot of menu_items/role_menu_items — not a live browser session, but a faithful
-- substitute (see harness details in the plan). RAID is the first group: it already exists
-- as five clearly RAID-shaped leaves scattered one level too deep (nested under Controls &
-- Registers > Core Controls / Knowledge & Governance) with zero ambiguity about what belongs.
--
-- IMPORTANT — why this is a pure re-parent, no grant migration needed: every leaf below KEEPS
-- its existing menu_items.id. Only parent_menu_id/menu_level/sort_order change. role_menu_items
-- grants are keyed by menu_item_id, which is unchanged — so every role that could already see
-- Risk/Issue/Assumption/Dependency Register or the combined RAID Log keeps exactly the same
-- visibility after this migration, automatically, with no INSERT/migration statements required.
--
-- What stays behind in Controls & Registers (deliberately NOT moved by this file): Change Log,
-- Delay Register, Quality Register, Configuration Item Register, Lessons Log, Decision Log,
-- Requirements Register, EEF, Benefits Register. Each belongs to a taxonomy group (Change
-- Control / Quality / Project Closure / Governance / Scope & Deliverables / Benefits
-- respectively) that is NOT yet built in this pass — moving them now, one file at a time, is
-- deliberately deferred so each group gets its own harness-verified, independently-reviewable
-- migration (see plan's "several smaller migration files" guidance) rather than one giant
-- reshuffle. Controls & Registers keeps rendering exactly as before for everything not moved
-- here.
-- ============================================================================

-- ── Step 1: create the new "RAID" top-level PM category row ─────────────────────────────────
-- Same parent as the existing "Controls & Registers" row (both are direct children of the PM
-- layout's universal root), so it renders as a sibling top-level sidebar section.

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_raid', 'RAID',
  'Risks, Assumptions, Issues, and Dependencies — consolidated PM discipline group (taxonomy §3).',
  NULL,
  (SELECT parent_menu_id FROM public.menu_items
     WHERE menu_code = 'plat_grp_pm_controls' AND COALESCE(is_deleted, FALSE) = FALSE),
  2, 65, 'universal', 'alert-triangle', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_raid' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- ── Step 2: re-parent the five RAID leaves under the new row, in taxonomy §3's own R-A-I-D order ──

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_raid' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 3,
    sort_order = 10,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_risk_reg' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_raid' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 3,
    sort_order = 20,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_assumptions_reg' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_raid' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 3,
    sort_order = 30,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_issue_log' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_raid' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 3,
    sort_order = 40,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_dependencies_reg' AND COALESCE(is_deleted, FALSE) = FALSE;

-- Combined cross-register view — kept as a 5th leaf inside RAID rather than left orphaned under
-- the old "Knowledge & Governance" bucket it never really belonged in.
UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_raid' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 3,
    sort_order = 50,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_raid_log' AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN RAISE NOTICE 'v966h_phase9_raid_taxonomy_group.sql applied successfully'; END $$;

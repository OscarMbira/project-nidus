-- ============================================================================
-- v966n: Core PM Menu Rationalisation — Phase 9 (taxonomy group 7 of N): Resources
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 9.
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3 (Resources: Resource Plan / Assignments
-- / Capacity / Timesheets).
--
-- DELIBERATELY PARTIAL -- only Capacity is moved. The existing "Teams" top-level PM group
-- (plat_grp_pm_teams) currently mixes taxonomy §3 "Project Setup > Project Team" concepts (Team
-- Members, RACI-adjacent Team Charter, Manage Roles) together with genuine "Resources" concepts
-- (Resource Directory, Skill Matrix, Capacity) -- an already-combined group with no clean content
-- boundary today, the same class of problem the plan's Phase 9 notes flagged for Quality &
-- Testing. Splitting Teams fully requires "Project Setup > Project Team" to exist as a
-- destination first, which it does not (Project Setup is one of the still-deferred groups -- see
-- the plan's Phase 9 "what was NOT attempted" list). Capacity is the one exception: it has no
-- ambiguity (it is not simultaneously a Team Members / Contact Directory concept the way Resource
-- Directory is), so it moves on its own without waiting for that larger split.
--
-- Resource Directory / Manage Roles / Skill Matrix / Leave Calendar / Team Charter / All Teams /
-- My Team all deliberately STAY under Teams -- not moved by this file.
--
-- Timesheets (Time Entry leaf, plat_tm_timesheets) was investigated and NOT moved: a harness
-- trace found it is a genuine PRE-EXISTING bug, unrelated to this migration -- plat_tm_timesheets
-- lives under the legacy "Personal Workspace" shell (plat_sec_personal), which
-- flattenLegacyCategoryShells() explodes into individual orphan roots for PM layout, and
-- inferPmPlatformCategoryId() has no matching branch for "timesheet" text/codes (confirmed via
-- grep: "timesheet" only appears in the SIMULATOR PM-layout inference function, never the
-- Platform one) -- so it currently silently disappears from the PM-layout sidebar for every role
-- that has it granted (confirmed via harness: pmo_admin is granted plat_tm_timesheets but it does
-- not render anywhere in pmo_admin's rendered tree today). Moving it into a real Resources DB
-- parent would fix this bug as a side effect of a "menu relabel" file, which is a bigger,
-- separately-decided change than this pass should make quietly -- flagged here as a follow-up
-- bug, not attempted in this file. "My Lesson Actions" (plat_tm_lesson_actions) has the same
-- root-cause gap and is likewise not addressed here (out of Resources' taxonomy scope anyway).
--
-- Assignments (Project/Work Package/Role/History) -- Phase 4 already flagged this needs its own
-- UX decision (which of project-users/manager-assignments/appointments becomes the anchor); not
-- resolved by this file either.
--
-- IMPORTANT -- dedupe interaction: pmoMenuSemanticDedupe.js's peopleLeafSemanticKey() maps BOTH
-- "resources/capacity" (plat_pm_capacity's route) and "teams/capacity" (the orphan row
-- pmo-people-team-capacity's route) to the SAME 'people:team-capacity' dedupe key -- but dedupe
-- only collapses SIBLINGS under the same parent (pmoMenuSemanticDedupe.js's
-- dedupePmoMenuSiblings()). Before this migration both rows were siblings under Teams (both fed
-- by the same regex bucket) so they deduped correctly today. This file's matching JS change
-- (packages/config/src/pmoMenuHierarchyUtils.js, inferPmPlatformCategoryId) carves "capacity" out
-- of the Teams regex bucket into a new branch targeting plat_pm_resources for BOTH the real DB
-- row's code/label AND the pmo-people-team-capacity orphan's code/label -- keeping them siblings
-- under the new Resources group so dedupe continues to collapse them exactly as before (verified
-- via harness: pmo_admin, who is granted both, sees exactly one "Team Capacity" entry under the
-- new Resources group, same single-entry outcome as pre-migration Teams).
-- ============================================================================

-- ── Step 1: create the new "Resources" top-level PM category row ────────────────────────────

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_resources', 'Resources',
  'Capacity planning (taxonomy §3, partial -- Resource Directory/Assignments/Timesheets deliberately stay under Teams, see file header).',
  NULL,
  (SELECT parent_menu_id FROM public.menu_items
     WHERE menu_code = 'plat_grp_pm_controls' AND COALESCE(is_deleted, FALSE) = FALSE),
  2, 75, 'universal', 'users', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_resources' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- ── Step 2: re-parent Capacity Planning out of Teams ─────────────────────────────────────────
-- Same-id re-parent (no grant migration needed).

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_resources' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 3,
    sort_order = 10,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_capacity' AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN RAISE NOTICE 'v966n_phase9_resources_taxonomy_group.sql applied successfully'; END $$;

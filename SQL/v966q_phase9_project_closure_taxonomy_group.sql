-- ============================================================================
-- v966q: Core PM Menu Rationalisation — Phase 9 (taxonomy group 10 of N): Project Closure
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 9.
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3 (Project Closure: Closure Checklist /
-- Final Acceptance / Outstanding Items / Handover / Lessons Learned / Benefits Transition /
-- Archive / Closure Report).
--
-- DELIBERATELY PARTIAL -- only Lessons Learned is moved. This continues the same pattern as
-- Benefits (v966i) and Governance (v966k): one already-canonical, unambiguous leaf pulled out of
-- the old functional "Controls & Registers" bucket into its taxonomy-correct new group, while the
-- rest of the taxonomy group's sub-leaves are left for a follow-up because each needs a
-- content-mapping decision this pass cannot make safely:
--   - Closure Checklist / Final Acceptance / Outstanding Items / Handover / Benefits Transition --
--     no confirmed dedicated artefact exists for any of these (mapping audit: all "Not confirmed"
--     or "New candidate").
--   - Archive -- TWO different existing "archive" concepts were found on fresh inspection
--     (plat_pm_archives "Archives / On Hold" at /platform/projects/on-hold, which is NOT actually
--     an archive -- it is the on-hold projects list; and plat_archived_projects "Archived
--     Projects" at /platform/projects/archived, which lives under a completely different DB
--     branch, plat_sec_project_delivery, that is not part of the live PM_CATEGORY_DEFS tree at
--     all today) -- genuinely ambiguous, not moved.
--   - Closure Report -- the closest match (plat_pm_s_end_project "End Project Report") lives
--     under the Structured-track methodology wrapper (plat_sec_structured), not a simple
--     universal-track leaf like the other Phase 9 moves -- re-parenting a track-wrapped leaf risks
--     interacting with wrapPmoMenuWithMethodologyTracks()/filterMenuTreeByVisibleTracks() in ways
--     this pass has not verified; left alone rather than guessed at.
--
-- What IS moved: "Lessons Log" (plat_pm_lessons_ctrl, route /pm/controls/lessons-log), currently
-- nested under Controls & Registers > Knowledge & Governance (which becomes empty and no longer
-- renders once this file runs, matching the same pattern seen when v966h emptied out RAID's old
-- Core Controls slots and v966k emptied Knowledge & Governance's Decision Log). This is a
-- confirmed-distinct PM-layout route, NOT the PMO Oversight cross-project variant
-- (plat_oversight_lessons, a deliberate Pattern-A rollup left untouched, same reasoning as prior
-- phases' Risk/Issue/Change Register handling) and NOT the Reporting track's "Lessons Reports"
-- view (plat_rep_lessons, a different, also-untouched row).
--
-- Same no-grant-migration-needed pattern as v966h-v966k/v966o: the leaf keeps its existing
-- menu_items.id, so every role already granted plat_pm_lessons_ctrl keeps exactly the same
-- visibility with only a parent_menu_id/menu_level/sort_order change.
-- ============================================================================

-- ── Step 1: create the new "Project Closure" top-level PM category row ──────────────────────

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_project_closure', 'Project Closure',
  'Lessons Learned (taxonomy §3, partial -- Closure Checklist/Final Acceptance/Outstanding Items/Handover/Benefits Transition/Archive/Closure Report each need a content-mapping decision, see file header).',
  NULL,
  (SELECT parent_menu_id FROM public.menu_items
     WHERE menu_code = 'plat_grp_pm_controls' AND COALESCE(is_deleted, FALSE) = FALSE),
  2, 118, 'universal', 'flag', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_project_closure' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- ── Step 2: re-parent Lessons Log out of Controls & Registers > Knowledge & Governance ───────

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_project_closure' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 3,
    sort_order = 10,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_lessons_ctrl' AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN RAISE NOTICE 'v966q_phase9_project_closure_taxonomy_group.sql applied successfully'; END $$;

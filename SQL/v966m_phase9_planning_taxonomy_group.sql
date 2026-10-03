-- ============================================================================
-- v966m: Core PM Menu Rationalisation — Phase 9 (taxonomy group 6 of N): Planning
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 9.
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3 (Planning: Schedule / Milestones /
-- Dependencies / Calendars / Baselines / Planning Assumptions / Scenario Planning).
--
-- DELIBERATELY PARTIAL — only 2 of Planning's 7 taxonomy sub-groups are touched by this file:
--   - Baselines  -> re-parents the existing "S-Curve & Baselines" leaf (plat_pm_a_scurve) out of
--     Reporting & Analytics (where Phase 6 / v966f had put it after pulling it out of the
--     Agile-only "Planning Tools" group). It is methodology-universal, so Planning is its correct
--     taxonomy-final home, not Reports.
--   - Planning Assumptions -> per PRD decision 7 ("Planning Assumptions and RAID Assumptions
--     share one register... linked from both menu locations"), this adds a SECOND menu_items row
--     (plat_pm_planning_assumptions) pointing at the same /platform/assumptions route as RAID's
--     existing plat_pm_assumptions_reg (moved to RAID by v966h). This is the one dual-location
--     wiring case in Phase 9 so far — grants are copied (not migrated) from plat_pm_assumptions_reg
--     onto the new row so visibility matches exactly, same pattern as v966b's Dependency Register
--     wiring. Both rows keep rendering independently; no dedupe collision (verified: no semantic
--     dedupe key exists for "assumptions register" in pmoMenuSemanticDedupe.js, and the two rows
--     have different parents so they are not sibling-deduped by the fallback path-based key
--     either).
--
-- NOT touched (left deliberately deferred, per the plan's "don't force it" discipline):
--   - Schedule (Activity Register / Gantt / Network-Dependencies / Critical Path / Look-Ahead
--     Plan / Schedule Variance) -- real pages exist (ActivityListPage/GanttChartPage/etc.) but
--     have NO menu_items row today (confirmed via fresh query: no menu_code with route
--     'projects/:projectId/schedule/activities' etc.). This is the same "wire an unlinked page"
--     class of work already flagged undone in Phase 6 (route-param substitution unconfirmed) --
--     not a re-parent, needs its own dedicated pass.
--   - Milestones (Register/Key Dates/Forecast/Slippage) -- no capability exists anywhere in the
--     codebase (Phase 11, not attempted this run).
--   - Dependencies -- already has a canonical home under RAID (v966h); §3 lists "Dependencies"
--     under both Planning and RAID, but no explicit user decision (unlike Planning Assumptions,
--     which PRD decision 7 covers) authorises a second menu location for it. Left single-homed
--     under RAID only.
--   - Calendars -- three separate calendar implementations still need the PRD's own flagged
--     consolidation decision (Phase 5's deferred bullet); not resolved by this file.
--   - Scenario Planning -- closest existing capability (Recovery Planning) is not a confirmed
--     match for the taxonomy's "Current Plan / What-If Scenarios / Comparison / Recommendation"
--     concept; left as a genuine content-mapping gap, not guessed at.
-- ============================================================================

-- ── Step 1: create the new "Planning" top-level PM category row ─────────────────────────────

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_planning', 'Planning',
  'Baselines and planning-phase assumptions (taxonomy §3, partial — Schedule/Milestones/Dependencies/Calendars/Scenario Planning are not yet wired here).',
  NULL,
  (SELECT parent_menu_id FROM public.menu_items
     WHERE menu_code = 'plat_grp_pm_controls' AND COALESCE(is_deleted, FALSE) = FALSE),
  2, 63, 'universal', 'calendar-range', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_planning' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- ── Step 2: re-parent S-Curve & Baselines out of Reporting & Analytics ───────────────────────
-- Same-id re-parent (no grant migration needed) -- keeps plat_pm_a_scurve's existing
-- menu_items.id, so every role already granted it keeps exactly the same visibility.

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_planning' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 3,
    sort_order = 10,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_a_scurve' AND COALESCE(is_deleted, FALSE) = FALSE;

-- ── Step 3: wire "Planning Assumptions" as a second location for the shared Assumptions Register ──

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_planning_assumptions', 'Planning Assumptions',
  'Same Assumptions Register as RAID > Assumptions (PRD decision 7) -- linked from both taxonomy locations.',
  (SELECT route_path FROM public.menu_items WHERE menu_code = 'plat_pm_assumptions_reg' AND COALESCE(is_deleted, FALSE) = FALSE),
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_planning' AND COALESCE(is_deleted, FALSE) = FALSE),
  3, 20, 'universal', 'list-checks', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_planning_assumptions' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- Copy (not migrate) grants from plat_pm_assumptions_reg onto the new row -- both rows keep
-- rendering independently in their own taxonomy location.

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_assumptions_reg'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_planning_assumptions' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v966m_phase9_planning_taxonomy_group.sql applied successfully'; END $$;

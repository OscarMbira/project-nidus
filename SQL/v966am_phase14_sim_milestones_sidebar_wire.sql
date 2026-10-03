-- ============================================================================
-- v966am: Core PM Menu Rationalisation — Phase 14: Simulator sidebar wire for Milestone Register
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 14.
--
-- Phase 11 (SQL/v966w-y) built the Milestone Register for BOTH apps (sim.milestones table,
-- apps/simulator/src/services/milestoneService.js, MilestonesListPage/MilestoneForm/
-- MilestoneDetailPage all routed in apps/simulator/src/routes/simulatorRoutes.jsx at
-- `simulator/practice-projects/milestones` and `simulator/practice-projects/:projectId/
-- milestones[...]`) but only wired a Platform sidebar entry (v966y, under plat_pm_planning) --
-- Simulator's sidebar wiring was explicitly deferred to Phase 14 because Simulator had no live
-- plat_pm_planning-equivalent taxonomy group to nest it under.
--
-- INVESTIGATION FINDING (this run): Simulator's PM-layout sidebar (apps/simulator/src/hooks/
-- useSimMenu.js -> useMenu.js's applySimulatorMenuTransform -> packages/config/src/
-- pmoMenuHierarchyUtils.js's reorganizeMenuRoots(..., 'sim_pm')) is NOT a mirror of Platform's
-- rationalised PM_CATEGORY_DEFS taxonomy -- it is still on Platform's PRE-v966 shape. Its
-- SIM_PM_CATEGORY_DEFS has only 8 coarse top-level buckets (Live Simulation / Practice Dashboard /
-- Practice Projects / Practice Teams / Practice Controls & Registers / Practice Process Templates /
-- Practice Cross-Framework / Learning Hub), all of which are SYNTHETIC JS-only shells with no real
-- DB row of their own (confirmed: zero `menu_items` rows exist for any `sim_pm_cat_*`/
-- `sim_pmo_cat_*` code). Unlike Platform's Phase 9 groups (plat_pm_governance, plat_pm_planning,
-- etc, each a REAL menu_items row a leaf can be given as its literal parent_menu_id), Simulator PM
-- leaves land in these buckets purely via `inferSimPmCategoryId()`'s route/label regex matching on
-- ORPHAN nodes (nodes with no real, resolvable DB parent).
--
-- Simulator DOES still have real, DB-backed sub-groups from its own (pre-v966-equivalent)
-- structure, though -- e.g. sim_grp_pm_controls ("Practice Controls & Registers") >
-- sim_pm_ctrl_core ("Core Controls"), which already holds Risk Register / Issue Register / Delay
-- Register / Change Log / Assumptions Register as real children (mirroring exactly what
-- Platform's Controls & Registers > Core Controls held before Phase 2/9 broke it apart). This is
-- the closest existing, safe, real-DB-parent anchor for a new register-style leaf -- adding
-- Milestones here needs ZERO JS change (no orphan/inference classification is ever invoked for a
-- node with a real, already-recognised parent) and mirrors exactly how sim_pm_assumptions_reg
-- (Simulator's own Assumptions Register, wired the same way) already works.
--
-- A full Phase 14 mirror of all 14 of Platform's rationalised taxonomy groups (RAID, Benefits,
-- Change Control, Governance, Cost Management, Planning, Resources, Quality, Testing, Documents,
-- Reports, Project Closure, etc.) into Simulator would require inventing 12+ new
-- SIM_PM_CATEGORY_DEFS/SIM_PMO_CATEGORY_DEFS entries and matching inferSimPmCategoryId/
-- inferSimPmoCategoryId regex branches for each -- a genuine JS taxonomy redesign, not a SQL-only
-- pass. That is explicitly OUT OF SCOPE for this file -- see the plan file's Phase 14 section for
-- the full scoping write-up and recommendation. This file only closes the narrow, low-risk,
-- already-flagged gap: wiring the 2 new-capability registers (Milestones here, Governance Actions
-- in v966an) that Phase 11/12 explicitly built for both apps but never sidebar-wired for
-- Simulator, using Simulator's EXISTING real-DB-parent structure as-is.
--
-- Route: 'simulator/practice-projects/milestones' (the bare, no-:projectId list route, confirmed
-- registered in apps/simulator/src/routes/simulatorRoutes.jsx -- MilestonesListPage handles both
-- the bare and the :projectId-scoped case with an inline project picker when none is present,
-- matching the same convention already used for sim_pm_assumptions_reg's bare
-- `/simulator/practice-projects/assumptions` route).
--
-- Grants copied from the direct sibling sim_pm_assumptions_reg (3 live grants, freshly
-- re-verified) -- same grant-copy-from-sibling pattern used throughout this initiative.
-- ============================================================================

WITH parent AS (
  SELECT id FROM public.menu_items WHERE menu_code = 'sim_pm_ctrl_core' AND COALESCE(is_deleted, FALSE) = FALSE
)
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'sim_pm_milestones', 'Milestones',
  'Practice milestone register: target/forecast/actual dates, status, slippage (Phase 11/14, v966w/v966am).',
  '/simulator/practice-projects/milestones',
  parent.id,
  4, 60, 'universal', 'flag', TRUE, TRUE, NOW(), NOW()
FROM parent
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'sim_pm_milestones' AND COALESCE(is_deleted, FALSE) = FALSE
);

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'sim_pm_assumptions_reg'
JOIN public.menu_items dst ON dst.menu_code = 'sim_pm_milestones' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v966am_phase14_sim_milestones_sidebar_wire.sql applied successfully'; END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, route_path, parent_menu_id, is_active
--   FROM public.menu_items WHERE menu_code = 'sim_pm_milestones';
--   SELECT count(*) FROM public.role_menu_items rmi JOIN public.menu_items mi ON mi.id = rmi.menu_item_id
--   WHERE mi.menu_code = 'sim_pm_milestones' AND rmi.can_view AND rmi.is_active AND NOT COALESCE(rmi.is_deleted, FALSE);
--   -- expect 3 (matches sim_pm_assumptions_reg's live grant count as of this run).

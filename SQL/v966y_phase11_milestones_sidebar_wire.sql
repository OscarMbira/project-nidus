-- ============================================================================
-- v966y: Core PM Menu Rationalisation — Phase 11: Milestone Register (sidebar wire)
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 11.
--
-- Wires the new Milestone Register (SQL/v966w/v966x) into the sidebar as "Milestones", nested
-- under the "Planning" taxonomy group (plat_pm_planning, created by SQL/v966m) alongside
-- S-Curve & Baselines and Planning Assumptions. Follows the exact same pattern as every other
-- Phase 9/11 leaf: `WHERE NOT EXISTS` guard on the INSERT, grants copied (not migrated, since
-- this is a genuinely new row, same as v966m's Planning Assumptions leaf) from the direct
-- Planning sibling plat_pm_a_scurve (S-Curve & Baselines, 12 roles) — same grant-copy precedent
-- used by v966m/v966f/v966v.
--
-- MUST RUN AFTER v966m (relies on plat_pm_planning already existing) and v966w/v966x (the table
-- this menu item points at). Route is a flat /platform/milestones path with a ?projectId= query
-- param, matching every other Phase 9-moved leaf in this taxonomy group (Assumptions Register,
-- S-Curve & Baselines, RAID registers, etc.) rather than a project-nested /platform/projects/:id/
-- path — consistent with rule 16.1's usePlatformProjectId() convention already used throughout
-- this taxonomy rebuild.
--
-- Platform sidebar only. Per this plan's Phase 9 "Simulator parity" note (Phase 14, not yet
-- attempted — PM_CATEGORY_DEFS/plat_pm_planning has no live Simulator-side taxonomy mirror yet),
-- Simulator's Milestones CRUD capability is built (see apps/simulator/src/pages/milestones/*)
-- but its sidebar entry point is deliberately NOT wired here — there is no sim-side
-- plat_pm_planning-equivalent taxonomy group to nest it under yet. Revisit as part of Phase 14.
-- ============================================================================

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_planning_milestones', 'Milestones',
  'Milestone Register: target/forecast/actual dates and a planned/at_risk/achieved/missed/slipped lifecycle (Phase 11, v966w).',
  '/platform/milestones',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_planning' AND COALESCE(is_deleted, FALSE) = FALSE),
  3, 30, 'universal', 'flag', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_planning_milestones' AND COALESCE(is_deleted, FALSE) = FALSE
)
AND EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_planning' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- Copy grants from plat_pm_a_scurve (the direct Planning sibling) onto the new row.

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_a_scurve'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_planning_milestones' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v966y_phase11_milestones_sidebar_wire.sql applied successfully'; END $$;

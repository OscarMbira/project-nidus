-- ============================================================================
-- v1246: Workload menu items (Platform + Simulator) — v1239 Slice 4.2
-- Plan: projectplan/v1239_dual_mode_planning_product_plan.md (Slice 4.2)
--
-- New leaf "Workload" (estimated hours per person per week vs capacity), rendered by the shared
-- @nidus/planning ScheduleWorkloadScreen at `schedule/workload`:
--   plat_pm_planning_workload → /platform/projects/:id/schedule/workload
--                               parent plat_pm_planning_schedule (v966v)
--   sim_pm_planning_workload  → /simulator/practice-projects/:id/schedule/workload
--                               parent sim_pm_planning_section (v571)
-- Both route tokens are already substituted by the sidebar resolvers (see v966v, v571).
--
-- Grants: copied from each app's existing schedule menu, so the same roles see Workload:
--   Platform  ← plat_pm_planning_gantt (itself copied from plat_pm_a_scurve in v966v)
--   Simulator ← sim_pm_planning_health (same section; v571 grants)
-- Additive only. Existing menu rows are not changed. Idempotent.
-- No demo seed: Workload has no table of its own; it reads tasks, project calendars and
-- resource calendars that already exist.
-- ============================================================================

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_planning_workload', 'Workload',
  'Estimated hours per person per week against capacity (v1239).',
  '/platform/projects/:id/schedule/workload',
  p.id, 4, 60, 'universal', 'users', TRUE, TRUE, NOW(), NOW()
FROM public.menu_items p
WHERE p.menu_code = 'plat_pm_planning_schedule' AND COALESCE(p.is_deleted, FALSE) = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_planning_workload' AND COALESCE(is_deleted, FALSE) = FALSE
  );

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'sim_pm_planning_workload', 'Workload',
  'Practice project: estimated hours per person per week against capacity (v1239).',
  '/simulator/practice-projects/:id/schedule/workload',
  p.id, 2, 60, 'users', TRUE, TRUE, NOW(), NOW()
FROM public.menu_items p
WHERE p.menu_code = 'sim_pm_planning_section' AND COALESCE(p.is_deleted, FALSE) = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM public.menu_items WHERE menu_code = 'sim_pm_planning_workload' AND COALESCE(is_deleted, FALSE) = FALSE
  );

-- Grants (copy view/use from the reference menu in the same app)
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, src.can_use, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_planning_gantt'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_planning_workload' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = EXCLUDED.can_use, is_active = TRUE, updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, src.can_use, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'sim_pm_planning_health'
JOIN public.menu_items dst ON dst.menu_code = 'sim_pm_planning_workload' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = EXCLUDED.can_use, is_active = TRUE, updated_at = NOW();

-- Report
DO $$
DECLARE
  v_plat INT; v_sim INT;
BEGIN
  SELECT COUNT(*) INTO v_plat FROM public.role_menu_items r JOIN public.menu_items m ON m.id = r.menu_item_id
   WHERE m.menu_code = 'plat_pm_planning_workload' AND r.is_active;
  SELECT COUNT(*) INTO v_sim FROM public.role_menu_items r JOIN public.menu_items m ON m.id = r.menu_item_id
   WHERE m.menu_code = 'sim_pm_planning_workload' AND r.is_active;
  IF NOT EXISTS (SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_planning_workload') THEN
    RAISE WARNING 'plat_pm_planning_workload not created: parent plat_pm_planning_schedule missing (run v966v first)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.menu_items WHERE menu_code = 'sim_pm_planning_workload') THEN
    RAISE WARNING 'sim_pm_planning_workload not created: parent sim_pm_planning_section missing (run v571 first)';
  END IF;
  RAISE NOTICE 'v1246 applied: Workload granted to % Platform role(s), % Simulator role(s)', v_plat, v_sim;
END $$;

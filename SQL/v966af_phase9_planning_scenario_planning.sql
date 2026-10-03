-- ============================================================================
-- v966af: Core PM Menu Rationalisation — Phase 9: Planning > Scenario Planning
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 9 (Planning group, continuing
-- SQL/v966m/v966v/v966y/v966ac/v966ad's deliberately-partial build).
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3 (Planning: ... Scenario Planning).
--
-- Corrects v966m's original "no confirmed page exists" assumption for Scenario Planning:
-- v966m's header said "closest existing capability (Recovery Planning) is not a confirmed match
-- ... left as a genuine content-mapping gap". Fresh investigation this run found a real,
-- registered page instead: ScenarioList (apps/platform/src/pages/planning/scenarios/
-- ScenarioList.jsx), mounted at route 'scenarios' inside apps/platform/src/routes/fallback/
-- planningHubRoutes.jsx, which is itself mounted at the 'pm/planning/*' prefix in
-- platformRoutes.jsx -- full path /pm/planning/scenarios, confirmed via a direct grep of the
-- route tree (not assumed from the audit documents).
--
-- Two historical menu rows already exist at this exact route (planning_scenarios,
-- pm_planning_scenarios) but both are is_deleted = true -- confirmed via fresh query. Per the
-- same convention v966v already established for Activity Register/Gantt/Sequencing (dead
-- pm_activity_list/pm_gantt_chart/pm_activity_sequencing rows NOT reactivated, fresh
-- plat_pm_*-prefixed rows created instead), this file does the same: a new
-- plat_pm_planning_scenarios row, not a reactivation of either dead predecessor.
--
-- GRANTS -- copied from plat_pm_a_scurve (S-Curve & Baselines, the established Planning-sibling
-- precedent used by every net-new Planning leaf so far -- v966v's Schedule sub-leaves, v966y's
-- Milestones). Fresh live count: 12 active/granted roles (Content-Range 0-11/12), matching the
-- brief's "~12 roles" exactly, no correction needed.
--
-- DEDUPE CHECK: no semantic key exists for "scenario"/"scenario planning" anywhere in
-- packages/config/src/pmoMenuSemanticDedupe.js (planningLeafSemanticKey only covers "planning
-- hub"/"intelligence rules"/"governance rules"). No other LIVE row shares the /pm/planning/
-- scenarios route (only the 2 is_deleted=true rows above do) -- no orphan-dedupe risk, no
-- matching inferPmPlatformCategoryId change needed, same as v966v's Schedule sub-leaves.
-- ============================================================================

-- ── Wire "Scenario Planning" under the Planning group ────────────────────────────────────────

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_planning_scenarios', 'Scenario Planning',
  'What-if scenario comparison for project plans (taxonomy §3, Planning > Scenario Planning). New plat_pm_*-prefixed row, not a reactivation of the dead planning_scenarios/pm_planning_scenarios rows at this same route.',
  '/pm/planning/scenarios',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_planning' AND COALESCE(is_deleted, FALSE) = FALSE),
  3, 60, 'universal', 'git-compare', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_planning_scenarios' AND COALESCE(is_deleted, FALSE) = FALSE
)
AND EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_planning' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- Copy grants from plat_pm_a_scurve (the direct Planning sibling).

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_a_scurve'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_planning_scenarios' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v966af_phase9_planning_scenario_planning.sql applied successfully'; END $$;

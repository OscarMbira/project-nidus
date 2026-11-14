-- ============================================================================
-- v1454: Consolidated role menus — Simulator (practice) placements (Slice 11, D12)
-- PRD/plan: projectprd/v1341 / projectplan/v1341_consolidated_role_menus_plan.md
--
-- The Simulator reads the same public.menu_items catalogue (sim_ codes). Industry group rows are
-- shared with the Platform, so their v1450 / v1451 placements already apply in the Simulator.
-- This file places the Simulator's own core items for the 'pm' key, the same sections and order
-- as the Platform:
--   1. default sections on the Simulator category and group rows (safety net, story 25)
--   2. each sim_pm_ page takes the placement of the Platform page with the same label
--      (ignoring a leading "Practice "), so both apps keep the same sections (rule 34.1)
-- Simulator placements whose route is not mounted are reported by
-- scripts/check-sim-placement-routes.mjs (R8); the audit query (v1452) lists unplaced pages.
-- Idempotent. Run after v1453.
-- ============================================================================

-- ── 1. Default sections for Simulator category / group rows ────────────────
UPDATE public.menu_items mi
   SET default_section_code = v.section_code
  FROM (VALUES
    ('sim_pm_cat_dashboard',         'home'),
    ('sim_pm_cat_live',              'home'),
    ('sim_pm_cat_learning',          'home'),
    ('sim_pm_cat_projects',          'home'),
    ('sim_pm_cat_initiation',        'project_setup'),
    ('sim_pm_cat_pmbok',             'plan_schedule'),
    ('sim_pm_cat_project_delivery',  'deliver_test'),
    ('sim_pm_cat_agile',             'deliver_test'),
    ('sim_pm_cat_controls',          'risks_governance'),
    ('sim_pm_cat_governance',        'risks_governance'),
    ('sim_pm_cat_teams',             'money_resources'),
    ('sim_pm_cat_process_templates', 'footer'),
    ('sim_pm_cat_cross_framework',   'footer'),
    ('sim_pm_controls',              'risks_governance'),
    ('sim_pm_ctrl_core',             'risks_governance'),
    ('sim_pm_ctrl_knowledge',        'risks_governance'),
    ('sim_pm_ctrl_quality',          'deliver_test'),
    ('sim_pm_ctrl_scope',            'scope_requirements'),
    ('sim_pm_delivery',              'deliver_test'),
    ('sim_pm_financial',             'money_resources'),
    ('sim_pm_closure',               'readiness_close'),
    ('sim_pm_comms_section',         'home'),
    ('sim_pm_governance',            'risks_governance'),
    ('sim_pm_delays',                'plan_schedule'),
    ('sim_pm_advanced_planning_group','plan_schedule'),
    ('sim_pmo_cat_exec',             'home'),
    ('sim_pmo_cat_live',             'home'),
    ('sim_pmo_cat_initiation',       'project_setup'),
    ('sim_pmo_cat_pmbok',            'plan_schedule'),
    ('sim_pmo_cat_project_delivery', 'deliver_test'),
    ('sim_pmo_cat_agile',            'deliver_test'),
    ('sim_pmo_cat_governance',       'risks_governance'),
    ('sim_pmo_cat_reporting',        'footer'),
    ('sim_pmo_cat_admin',            'organisation'),
    ('sim_pmo_cat_email',            'organisation'),
    ('sim_pmo_cat_knowledge',        'organisation'),
    ('sim_pmo_cat_process_templates','organisation'),
    ('sim_pmo_cat_system_admin',     'organisation'),
    ('sim_pmo_cat_workflows',        'organisation')
  ) AS v(menu_code, section_code)
 WHERE mi.menu_code = v.menu_code
   AND mi.default_section_code IS DISTINCT FROM v.section_code;

-- ── 2. Simulator pages take the Platform page's placement (same label) ──────
WITH plat AS (
  SELECT DISTINCT ON (lower(regexp_replace(mi.menu_label, '^Practice\s+', '', 'i')))
         lower(regexp_replace(mi.menu_label, '^Practice\s+', '', 'i')) AS label_key,
         p.section_code, p.slot_key, p.sort_order
  FROM public.menu_item_placements p
  JOIN public.menu_items mi ON mi.id = p.menu_item_id
  WHERE p.placement_key = 'pm' AND p.is_active = TRUE
    AND mi.menu_code NOT LIKE 'sim\_%'
    AND p.parent_menu_item_id IS NULL
  ORDER BY lower(regexp_replace(mi.menu_label, '^Practice\s+', '', 'i')), p.sort_order
),
sim AS (
  SELECT mi.id, lower(regexp_replace(mi.menu_label, '^Practice\s+', '', 'i')) AS label_key
  FROM public.menu_items mi
  WHERE mi.menu_code LIKE 'sim\_pm\_%'
    AND mi.menu_code NOT LIKE 'sim\_pm\_cat\_%'
    AND mi.is_active = TRUE AND COALESCE(mi.is_deleted, FALSE) = FALSE
)
INSERT INTO public.menu_item_placements (menu_item_id, placement_key, section_code, parent_menu_item_id, slot_key, sort_order)
SELECT sim.id, 'pm', plat.section_code, NULL, plat.slot_key, plat.sort_order
FROM sim
JOIN plat ON plat.label_key = sim.label_key
ON CONFLICT (menu_item_id, placement_key) DO NOTHING;

-- ── Check ───────────────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM public.menu_item_placements p JOIN public.menu_items mi ON mi.id = p.menu_item_id
    WHERE p.placement_key = 'pm' AND mi.menu_code LIKE 'sim\_%') AS simulator_pm_placements,
  (SELECT count(*) FROM public.menu_items WHERE menu_code LIKE 'sim\_%' AND default_section_code IS NOT NULL) AS simulator_rows_with_default;

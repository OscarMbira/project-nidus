-- ============================================================================
-- v1459: Consolidated role menus — PMO Admin / Account Owner / Org Admin placements (Slice 9)
-- PRD/plan: projectprd/v1341 (D9, D28, stories 20, 21, 35) / projectplan/v1341
-- Design source: Documentation/Consolidated_Role_Menus_Proposal.md §6.8
--
-- The PMO sidebar keeps its two zones as sections of the same skeleton:
--   Oversight — Home, Project Setup (projects), Risks, Changes & Governance, Readiness / Benefits,
--               Money & Resources, Reports & Documents
--   Organisation — the 'organisation' section (configuration, templates, users and roles,
--               reference data, settings) and organisation-level industry pages (D28)
-- Each PMO category row (pmo-cat-*) is placed for 'pmo_oversight' and carries its pages as a
-- sub-menu. The methodology track headers ([S] / [P] / [A]) are not placed, so they leave the
-- sidebar (D9); the methodology switcher is unchanged. The organisation capability switch-off
-- (v931) still applies first (story 21).
-- Default sections on the same rows catch any PMO page added later.
-- Idempotent. Run after v1458.
-- ============================================================================

WITH v(menu_code, section_code, sort_order) AS (
  VALUES
    ('pmo-cat-exec',                    'home',                  10),
    ('pmo-cat-projects',                'project_setup',         10),
    ('pmo-cat-project-oversight',       'project_setup',         20),
    ('pmo-cat-project-oversight-group', 'project_setup',         21),
    ('pmo-cat-initiation',              'project_setup',         30),
    ('pmo-cat-portfolio',               'home',                  20),
    ('pmo-cat-programme',               'home',                  21),
    ('pmo-cat-planning',                'plan_schedule',         10),
    ('pmo-cat-project-delivery',        'deliver_test',          10),
    ('pmo-cat-delivery-management',     'deliver_test',          11),
    ('pmo-cat-delivery-controls',       'deliver_test',          12),
    ('pmo-cat-delivery-controls-group', 'deliver_test',          13),
    ('pmo-cat-risk-issues-quality',     'risks_governance',      10),
    ('pmo-cat-governance-standards',    'risks_governance',      20),
    ('pmo-cat-audit-compliance',        'risks_governance',      30),
    ('pmo-cat-workflows-approvals',     'risks_governance',      40),
    ('pmo-cat-stakeholders',            'stakeholders_adoption', 10),
    ('pmo-cat-financial-commercial',    'money_resources',       10),
    ('pmo-cat-teams',                   'money_resources',       20),
    ('pmo-cat-reporting-intelligence',  'footer',                10),
    ('pmo-cat-knowledge-assets',        'organisation',          10),
    ('pmo-cat-process-templates',       'organisation',          20),
    ('pmo-cat-structured',              'organisation',          30),
    ('pmo-cat-standards-based',         'organisation',          31),
    ('pmo-cat-pmbok',                   'organisation',          32),
    ('pmo-cat-pmbok-track',             'organisation',          33),
    ('pmo-cat-agile-lean',              'organisation',          34),
    ('pmo-cat-agile-track',             'organisation',          35),
    ('pmo-cat-admin',                   'organisation',          40),
    ('pmo-cat-system-admin',            'organisation',          50),
    ('pmo-cat-email-notifications',     'organisation',          60),
    ('pmo-cat-help',                    'organisation',          90),
    ('pmo-cat-support',                 'organisation',          91)
)
UPDATE public.menu_items mi
   SET default_section_code = v.section_code
  FROM v
 WHERE mi.menu_code = v.menu_code
   AND mi.default_section_code IS DISTINCT FROM v.section_code;

INSERT INTO public.menu_item_placements (menu_item_id, placement_key, section_code, parent_menu_item_id, slot_key, sort_order)
SELECT mi.id, 'pmo_oversight', v.section_code, NULL, NULL, v.sort_order
FROM (VALUES
    ('pmo-cat-exec',                    'home',                  10),
    ('pmo-cat-projects',                'project_setup',         10),
    ('pmo-cat-project-oversight',       'project_setup',         20),
    ('pmo-cat-project-oversight-group', 'project_setup',         21),
    ('pmo-cat-initiation',              'project_setup',         30),
    ('pmo-cat-portfolio',               'home',                  20),
    ('pmo-cat-programme',               'home',                  21),
    ('pmo-cat-planning',                'plan_schedule',         10),
    ('pmo-cat-project-delivery',        'deliver_test',          10),
    ('pmo-cat-delivery-management',     'deliver_test',          11),
    ('pmo-cat-delivery-controls',       'deliver_test',          12),
    ('pmo-cat-delivery-controls-group', 'deliver_test',          13),
    ('pmo-cat-risk-issues-quality',     'risks_governance',      10),
    ('pmo-cat-governance-standards',    'risks_governance',      20),
    ('pmo-cat-audit-compliance',        'risks_governance',      30),
    ('pmo-cat-workflows-approvals',     'risks_governance',      40),
    ('pmo-cat-stakeholders',            'stakeholders_adoption', 10),
    ('pmo-cat-financial-commercial',    'money_resources',       10),
    ('pmo-cat-teams',                   'money_resources',       20),
    ('pmo-cat-reporting-intelligence',  'footer',                10),
    ('pmo-cat-knowledge-assets',        'organisation',          10),
    ('pmo-cat-process-templates',       'organisation',          20),
    ('pmo-cat-structured',              'organisation',          30),
    ('pmo-cat-standards-based',         'organisation',          31),
    ('pmo-cat-pmbok',                   'organisation',          32),
    ('pmo-cat-pmbok-track',             'organisation',          33),
    ('pmo-cat-agile-lean',              'organisation',          34),
    ('pmo-cat-agile-track',             'organisation',          35),
    ('pmo-cat-admin',                   'organisation',          40),
    ('pmo-cat-system-admin',            'organisation',          50),
    ('pmo-cat-email-notifications',     'organisation',          60),
    ('pmo-cat-help',                    'organisation',          90),
    ('pmo-cat-support',                 'organisation',          91),
    -- Simulator PMO categories (same zones)
    ('sim_pmo_cat_exec',                'home',                  10),
    ('sim_pmo_cat_live',                'home',                  15),
    ('sim_pmo_cat_initiation',          'project_setup',         30),
    ('sim_pmo_cat_pmbok',               'plan_schedule',         10),
    ('sim_pmo_cat_project_delivery',    'deliver_test',          10),
    ('sim_pmo_cat_agile',               'deliver_test',          20),
    ('sim_pmo_cat_governance',          'risks_governance',      20),
    ('sim_pmo_cat_reporting',           'footer',                10),
    ('sim_pmo_cat_knowledge',           'organisation',          10),
    ('sim_pmo_cat_process_templates',   'organisation',          20),
    ('sim_pmo_cat_admin',               'organisation',          40),
    ('sim_pmo_cat_system_admin',        'organisation',          50),
    ('sim_pmo_cat_email',               'organisation',          60),
    ('sim_pmo_cat_workflows',           'organisation',          70)
) AS v(menu_code, section_code, sort_order)
JOIN public.menu_items mi ON mi.menu_code = v.menu_code AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_item_id, placement_key) DO UPDATE SET
  section_code = EXCLUDED.section_code,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  updated_at = NOW();

SELECT
  (SELECT count(*) FROM public.menu_item_placements WHERE placement_key = 'pmo_oversight') AS pmo_placements,
  (SELECT count(*) FROM public.menu_items WHERE menu_code LIKE 'pmo-cat-%' AND default_section_code IS NOT NULL) AS pmo_categories_with_default;

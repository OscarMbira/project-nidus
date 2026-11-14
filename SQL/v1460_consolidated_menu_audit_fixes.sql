-- ============================================================================
-- v1460: Consolidated role menus — fixes from the first audit run (v1452, 2026-11-14)
-- PRD/plan: projectprd/v1341 / projectplan/v1341 (story 25, story 26, R8)
--
-- The audit (CSV Files/consolidated_menu_audit_A.csv, sim_placements.csv) found:
--   1. two Simulator menu routes that point at pages that do not exist (also broken in today's
--      sidebar): the approvals queue and "My submitted records" live under /simulator/pm/…
--   2. granted pages with no home in the full-menu roles (PM, Team, Programme, Portfolio, PMO):
--      mostly PMO / organisation tools, legacy local registers, reports and personal pages that
--      today's sidebar files under its own category groups. Each gets a default section by what it
--      is (story 25 safety net); placements still win wherever they exist.
--   3. compact menus (governance profiles): personal pages and the reports / documents each role
--      reviews are placed; everything else they are granted stays out on purpose (story 23,
--      proposal §6.9).
-- Re-run v1452 afterwards: result A should list only pages left out on purpose.
-- Idempotent. Run after v1459.
-- ============================================================================

-- ── 1. Simulator routes that point nowhere (mounted under /simulator/pm/…) ──
UPDATE public.menu_items
   SET route_path = '/simulator/pm/authorisation/queue', updated_at = NOW()
 WHERE menu_code = 'sim_pm_pending_approval' AND route_path = '/simulator/authorisation/queue';
UPDATE public.menu_items
   SET route_path = '/simulator/pm/authorisation/submitted', updated_at = NOW()
 WHERE menu_code = 'sim_pm_submitted' AND route_path = '/simulator/authorisation/submitted';

-- ── 2. Default sections for granted pages with no home (full-menu roles) ───
WITH RECURSIVE full_keys(role_name) AS (
  VALUES ('project_manager'), ('pm_project_manager'), ('team_manager'), ('pm_team_manager'), ('team_lead'),
         ('programme_manager'), ('portfolio_manager'), ('pmo_admin'), ('account_owner'), ('org_admin')
),
granted AS (
  SELECT DISTINCT rmi.menu_item_id
  FROM public.role_menu_items rmi
  JOIN public.roles r ON r.id = rmi.role_id AND r.account_id IS NULL
  JOIN full_keys fk ON fk.role_name = lower(r.role_name)
  WHERE rmi.can_view = TRUE AND rmi.is_active = TRUE AND COALESCE(rmi.is_deleted, FALSE) = FALSE
),
chain AS (
  SELECT g.menu_item_id AS item_id, mi.id AS node_id, mi.parent_menu_id, 0 AS depth
  FROM granted g JOIN public.menu_items mi ON mi.id = g.menu_item_id
  UNION ALL
  SELECT c.item_id, p.id, p.parent_menu_id, c.depth + 1
  FROM chain c JOIN public.menu_items p ON p.id = c.parent_menu_id
  WHERE c.depth < 12
),
covered AS (
  SELECT DISTINCT c.item_id
  FROM chain c
  JOIN public.menu_items n ON n.id = c.node_id
  WHERE n.default_section_code IS NOT NULL
     OR EXISTS (SELECT 1 FROM public.menu_item_placements pl WHERE pl.menu_item_id = c.node_id AND pl.is_active = TRUE)
),
gaps AS (
  SELECT mi.id, lower(mi.menu_code || ' ' || COALESCE(mi.route_path, '') || ' ' || mi.menu_label) AS k, mi.menu_code
  FROM granted g
  JOIN public.menu_items mi ON mi.id = g.menu_item_id
  WHERE mi.is_active = TRUE AND mi.is_visible = TRUE AND COALESCE(mi.is_deleted, FALSE) = FALSE
    AND mi.route_path IS NOT NULL AND mi.menu_code NOT LIKE 'pln\_%'
    AND NOT EXISTS (SELECT 1 FROM covered cv WHERE cv.item_id = mi.id)
)
UPDATE public.menu_items mi
   SET default_section_code = CASE
     -- Legacy local registers (v931): by what they hold
     WHEN g.menu_code IN ('local_register_cutover', 'local_register_go_live', 'local_register_readiness_checklist', 'local_register_commissioning')
       THEN 'readiness_close'
     WHEN g.menu_code IN ('local_register_permits', 'local_register_safety_incidents', 'local_register_patient_safety_events',
                          'local_register_environmental_impact_assessments', 'local_register_regulatory_submissions',
                          'local_register_foi_requests')
       THEN 'risks_governance'
     WHEN g.menu_code = 'local_register_policy_legislative_milestones' THEN 'plan_schedule'
     WHEN g.menu_code = 'local_registers_index' THEN 'footer'
     WHEN g.menu_code LIKE 'local\_register\_%' THEN 'deliver_test'
     -- Explicit homes for pages the keyword rules below would misplace
     WHEN g.menu_code IN ('plat_pm_ai', 'plat_portfolio_map') THEN 'home'
     WHEN g.menu_code = 'plat_pm_s_policies' THEN 'risks_governance'
     WHEN g.menu_code IN ('plat_pm_s_work_auth', 'plat_pm_a_process_forms') THEN 'deliver_test'
     WHEN g.menu_code = 'plat_oversight_scope' THEN 'scope_requirements'
     WHEN g.menu_code LIKE 'plat\_oversight\_%' THEN 'risks_governance'
     WHEN g.menu_code LIKE 'plat\_pm\_p\_itto\_%' THEN 'plan_schedule'
     WHEN g.menu_code IN ('plat_pm_s_conf_ms', 'plat_pm_s_cms', 'plat_pm_s_qms', 'plat_pm_s_rms', 'plat_pm_s_doc_gov',
                          'plat_pm_s_pid', 'plat_pm_s_benefits_rp', 'plat_xf_project_settings') THEN 'project_setup'
     WHEN g.menu_code IN ('plat_lc_configure', 'plat_lc_retention', 'plat_lc_vault') THEN 'organisation'
     WHEN g.menu_code = 'plat_tl_assignments' THEN 'money_resources'
     WHEN g.menu_code LIKE 'sim\_pm\_project\_templates%' THEN 'footer'
     WHEN g.menu_code = 'plat_portfolio_alignment' THEN 'readiness_close'
     -- Personal pages and the user's own work
     WHEN g.k ~ '(my_expenses|notif|/notification-preferences|dashboard|daily-log|/calendar|/comms|/authorisation/queue|/authorisation/submitted|my submitted|pending)'
       THEN 'home'
     WHEN g.k ~ '(/projects/archived|/projects/on-hold|/projects/create|/projects( |$))' THEN 'home'
     -- Organisation tools and settings (PMO Organisation zone)
     WHEN g.k ~ '(template|/forms|admin|settings|configuration|/opa|knowledge|email|branding|integration|manage-roles|menu-bundles|role-assignment|assignment-roles|industries|categor|statuses|project-types|classification|authorities|local-data-extensions|field-templates|document-oversight|collaboration|automation|work-categories|review-reasons|overtime|funding-sources|signatory-requirements|role-menu-access|roles-and-responsibilities|regional-format)'
       THEN 'organisation'
     -- Money, people and suppliers
     WHEN g.k ~ '(expense|financial|/evm|cost|budget|threshold|procurement|/rfp|vendor|resource|capacity|workload|/teams|team-board|members|assignments)'
       THEN 'money_resources'
     -- Reports
     WHEN g.k ~ '(report|analytics|metrics|scheduled)' THEN 'footer'
     -- Agile and delivery work
     WHEN g.k ~ '(release|sprint|story-map|kaizen|value-stream|lean|planning-poker|/tasks|task-|workstream|process-templates)'
       THEN 'deliver_test'
     -- Initiation documents and project setup
     WHEN g.k ~ '(initiation|/pid|brief|charter|business-case|mandate|project-details|project-settings|strategy|itto|document-governance|document-signatory|/documents)'
       THEN 'project_setup'
     WHEN g.k ~ '(product-description|/ppd|work-package|scope)' THEN 'scope_requirements'
     WHEN g.k ~ '(stakeholder|communication)' THEN 'stakeholders_adoption'
     WHEN g.k ~ '(benefit|okr|alignment)' THEN 'readiness_close'
     WHEN g.k ~ '(portfolio|programme)' THEN 'home'
     WHEN g.k ~ '(risk|issue|lesson|quality|delay|oversight|approval|governance|stage-gate|decision|change)'
       THEN 'risks_governance'
     WHEN g.k ~ '(schedule|planning|milestone|dependenc)' THEN 'plan_schedule'
     ELSE 'footer'
   END,
   updated_at = NOW()
  FROM gaps g
 WHERE mi.id = g.id;

-- ── 3. Compact menus: what each governance role reviews (proposal §6.9) ────
INSERT INTO public.menu_item_placements (menu_item_id, placement_key, section_code, parent_menu_item_id, slot_key, sort_order)
SELECT mi.id, v.placement_key, v.section_code, NULL, NULL, v.sort_order
FROM (
  -- Personal pages for every compact role
  SELECT k.placement_key, c.menu_code, 'home'::text AS section_code, c.sort_order
  FROM (VALUES ('team_member'), ('executive'), ('sponsor'), ('board'), ('assurance'), ('qa'),
               ('change_authority'), ('stakeholder'), ('viewer')) AS k(placement_key)
  CROSS JOIN (VALUES ('my_expenses', 80), ('plat_xf_notif_prefs', 90)) AS c(menu_code, sort_order)
  UNION ALL
  SELECT * FROM (VALUES
    ('executive', 'plat_exec_dashboard',            'home',             5),
    ('executive', 'plat_portfolio_overview',        'home',             20),
    ('executive', 'plat_portfolio_map',             'home',             21),
    ('executive', 'plat_portfolio_alignment',       'readiness_close',  20),
    ('executive', 'plat_portfolio_benefits',        'readiness_close',  21),
    ('executive', 'plat_pm_s_benefits_rp',          'readiness_close',  22),
    ('executive', 'plat_fin_reports',               'money_resources',  40),
    ('executive', 'plat_fin_evm',                   'money_resources',  41),
    ('executive', 'plat_pm_analytics',              'footer',           20),
    ('executive', 'plat_pm_rep_library',            'footer',           21),
    ('executive', 'plat_pm_s_end_project',          'footer',           46),
    ('sponsor',   'plat_pm_s_pid',                  'project_setup',    50),
    ('sponsor',   'plat_pm_s_benefits_rp',          'readiness_close',  22),
    ('sponsor',   'plat_pm_s_decision_log',         'risks_governance', 50),
    ('sponsor',   'plat_pm_gov_stage_gates',        'risks_governance', 60),
    ('sponsor',   'plat_pm_s_stage_gates',          'risks_governance', 61),
    ('sponsor',   'plat_pm_submitted',              'home',             45),
    ('sponsor',   'plat_fin_evm',                   'money_resources',  41),
    ('sponsor',   'plat_pm_rep_library',            'footer',           21),
    ('sponsor',   'plat_pm_s_exception',            'footer',           43),
    ('sponsor',   'plat_pm_s_end_stage',            'footer',           44),
    ('sponsor',   'plat_pm_s_end_project',          'footer',           46),
    ('board',     'plat_pm_s_project_details',      'project_setup',    10),
    ('board',     'plat_pm_s_brief',                'project_setup',    30),
    ('board',     'plat_pm_s_charter',              'project_setup',    35),
    ('board',     'plat_pm_s_business_case',        'project_setup',    40),
    ('board',     'plat_pm_s_pid',                  'project_setup',    50),
    ('board',     'plat_pm_risk_reg',               'risks_governance', 10),
    ('board',     'plat_pm_issue_log',              'risks_governance', 20),
    ('board',     'plat_pm_change_requests',        'risks_governance', 40),
    ('board',     'plat_fin_reports',               'money_resources',  40),
    ('board',     'plat_pm_s_checkpoint',           'footer',           40),
    ('stakeholder','plat_pm_s_brief',               'project_setup',    30),
    ('stakeholder','plat_tm_meetings',              'home',             60),
    ('stakeholder','plat_pm_s_highlight',           'footer',           41),
    ('stakeholder','plat_pm_s_end_project',         'footer',           46),
    ('viewer',    'plat_pm_rep_timesheet_overview', 'footer',           30),
    ('viewer',    'plat_pm_rep_work_plan_variance', 'footer',           31)
  ) AS e(placement_key, menu_code, section_code, sort_order)
) AS v(placement_key, menu_code, section_code, sort_order)
JOIN public.menu_items mi ON mi.menu_code = v.menu_code AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_item_id, placement_key) DO NOTHING;

-- ── Check: defaults set by this file, and compact placements per role ──────
SELECT default_section_code, count(*) AS items
FROM public.menu_items
WHERE updated_at > NOW() - INTERVAL '10 minutes' AND default_section_code IS NOT NULL
GROUP BY default_section_code
ORDER BY default_section_code;

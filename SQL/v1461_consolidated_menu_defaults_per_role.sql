-- ============================================================================
-- v1461: Consolidated role menus — default sections, checked per role (audit follow-up)
-- PRD/plan: projectprd/v1341 / projectplan/v1341 (story 25)
--
-- v1460 treated a page as covered when ANY role had a placement for it, so pages placed only for
-- a governance role (or the Simulator) stayed without a home for the Project Manager and PMO
-- (second audit run, 2026-11-14: pm 17, pmo_oversight 66). This file checks coverage per role,
-- exactly like the v1452 audit, and gives each remaining page of a full-menu role (PM, Team,
-- Programme, Portfolio, PMO) a default section with the same rules as v1460. Placements still win.
-- Compact menus (governance profiles, Team Member) are not changed: what is left there is out on
-- purpose (proposal §6.9).
-- Idempotent. Run after v1460.
-- ============================================================================

WITH RECURSIVE role_keys(role_name, placement_key) AS (
  VALUES
    ('project_manager', 'pm'), ('pm_project_manager', 'pm'),
    ('team_manager', 'team'), ('pm_team_manager', 'team'), ('team_lead', 'team'),
    ('programme_manager', 'programme'), ('portfolio_manager', 'portfolio'),
    ('pmo_admin', 'pmo_oversight'), ('account_owner', 'pmo_oversight'), ('org_admin', 'pmo_oversight')
),
granted AS (
  SELECT DISTINCT rk.placement_key, rmi.menu_item_id
  FROM public.role_menu_items rmi
  JOIN public.roles r ON r.id = rmi.role_id AND r.account_id IS NULL AND COALESCE(r.is_active, TRUE)
  JOIN role_keys rk ON rk.role_name = lower(r.role_name)
  WHERE rmi.can_view = TRUE AND rmi.is_active = TRUE AND COALESCE(rmi.is_deleted, FALSE) = FALSE
),
chain AS (
  SELECT g.placement_key, g.menu_item_id AS item_id, mi.id AS node_id, mi.parent_menu_id, 0 AS depth
  FROM granted g JOIN public.menu_items mi ON mi.id = g.menu_item_id
  UNION ALL
  SELECT c.placement_key, c.item_id, p.id, p.parent_menu_id, c.depth + 1
  FROM chain c JOIN public.menu_items p ON p.id = c.parent_menu_id
  WHERE c.depth < 12
),
covered AS (
  SELECT DISTINCT c.placement_key, c.item_id
  FROM chain c
  JOIN public.menu_items n ON n.id = c.node_id
  WHERE n.default_section_code IS NOT NULL
     OR EXISTS (SELECT 1 FROM public.menu_item_placements pl
                WHERE pl.menu_item_id = c.node_id AND pl.placement_key = c.placement_key AND pl.is_active = TRUE)
),
gaps AS (
  SELECT DISTINCT mi.id, lower(mi.menu_code || ' ' || COALESCE(mi.route_path, '') || ' ' || mi.menu_label) AS k, mi.menu_code
  FROM granted g
  JOIN public.menu_items mi ON mi.id = g.menu_item_id
  WHERE mi.is_active = TRUE AND mi.is_visible = TRUE AND COALESCE(mi.is_deleted, FALSE) = FALSE
    AND mi.route_path IS NOT NULL AND mi.menu_code NOT LIKE 'pln\_%'
    AND NOT EXISTS (SELECT 1 FROM covered cv WHERE cv.placement_key = g.placement_key AND cv.item_id = g.menu_item_id)
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

-- ── Check: re-run block A of v1452; pm, team, programme, portfolio and pmo_oversight should be gone.
SELECT count(*) AS items_with_default_section FROM public.menu_items WHERE default_section_code IS NOT NULL;

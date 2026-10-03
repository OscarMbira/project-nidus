-- ============================================================================
-- v959: Industry Capability Content Taxonomy — Phase 14 (HRM: Human Resources)
-- ============================================================================
-- projectplan/v946_industry_capability_content_taxonomy_plan.md Phase 14.
-- Source: Documentation/Human_Resources_and_Legal_Compliance_Menu_Taxonomy.md Section 3,
-- filtered through PRD decision 6b (this is PM-of-HR-projects, not an HR ERP — Employee Records,
-- Payroll, Time & Attendance, Leave Management, Compensation & Benefits, Employee Relations,
-- Performance Management, Talent/Succession Management, Recruitment/Onboarding/Offboarding
-- operational tracking, Health/Safety/Wellbeing, HR Policies/Compliance, HR Data & Analytics are
-- all genuinely out of scope — they belong in a real HRIS, not a PMIS).
-- HR already existed as a bare industry_categories row with zero content — no new row needed
-- (see v946 Phase 1).
-- UUID block: 900d. Prerequisites: v931, v932, v946, v946c.
-- ============================================================================

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.menu_code, v.menu_label, v.menu_description, NULL, NULL, 1, v.sort_order, 'universal', 'users', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('hrm_cat_portfolio', 'HR Portfolio', 'Overview of the HR project portfolio', 2200),
  ('hrm_cat_org_design', 'Organisation Design', 'Organisation design initiatives', 2201),
  ('hrm_cat_technology', 'HR Technology', 'HR system implementation projects', 2202),
  ('hrm_cat_projects', 'HR Projects', 'Named HR initiatives', 2203)
) AS v(menu_code, menu_label, menu_description, sort_order)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, menu_description = EXCLUDED.menu_description,
  is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

SELECT public.grant_menu_role_group('hrm_cat_%');

INSERT INTO public.local_registers (id, register_key, label, icon, description, scope_level, account_id, status_workflow, is_system_defined, is_active, created_at, updated_at)
SELECT v.id::uuid, v.register_key, v.label, 'list-checks', v.description, 'project', NULL, v.status_workflow::jsonb, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  -- HR Portfolio (5, Programme Health/Executive Dashboard dropped — reporting views)
  ('00000000-0000-4000-900d-000000000001', 'hrm_overview', 'HR Overview', 'HR project portfolio overview', '[{"key":"draft","label":"Draft"},{"key":"published","label":"Published"}]'),
  ('00000000-0000-4000-900d-000000000002', 'hrm_project_portfolio', 'HR Project Portfolio', 'HR project portfolio register', '[{"key":"active","label":"Active"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-900d-000000000003', 'hrm_transformation_roadmap', 'HR Transformation Roadmap', 'HR transformation roadmap', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-900d-000000000004', 'hrm_strategic_initiatives', 'Strategic HR Initiatives', 'Strategic HR initiative register', '[{"key":"proposed","label":"Proposed"},{"key":"active","label":"Active"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-900d-000000000005', 'hrm_milestones', 'HR Milestones', 'HR programme milestones', '[{"key":"upcoming","label":"Upcoming"},{"key":"met","label":"Met"},{"key":"missed","label":"Missed"}]'),
  -- Organisation Design (3, heavily collapsed from a 4-level source structure)
  ('00000000-0000-4000-900d-000000000006', 'hrm_org_design_requests', 'Organisation Design Requests', 'Organisation design requests, impact assessment and approval tracking', '[{"key":"requested","label":"Requested"},{"key":"impact_assessed","label":"Impact Assessed"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-900d-000000000007', 'hrm_role_design', 'Role Design', 'Role catalogue, job families, levels and profile register', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-900d-000000000008', 'hrm_position_management', 'Position Management', 'Position register (vacant, filled, closed)', '[{"key":"vacant","label":"Vacant"},{"key":"filled","label":"Filled"},{"key":"closed","label":"Closed"}]'),
  -- HR Technology (1, heavily collapsed)
  ('00000000-0000-4000-900d-000000000009', 'hrm_systems_implementation', 'HR Systems Implementation', 'HRIS, payroll, recruitment, learning and performance system implementation', '[{"key":"not_started","label":"Not Started"},{"key":"integration","label":"Integration"},{"key":"data_migration","label":"Data Migration"},{"key":"testing","label":"Testing"},{"key":"ready","label":"Ready"}]'),
  -- HR Projects (1, collapsed)
  ('00000000-0000-4000-900d-00000000000a', 'hrm_named_projects', 'HR Projects', 'HR transformation, organisation restructure, talent, culture, learning and workforce optimisation projects', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]')
) AS v(id, register_key, label, description, status_workflow)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, status_workflow = EXCLUDED.status_workflow,
  is_active = TRUE, updated_at = NOW();

INSERT INTO public.local_register_industry_packs (register_id, industry_pack_id)
SELECT lr.id, ip.id
FROM public.local_registers lr
JOIN public.industry_packs ip ON ip.industry_category_id = (SELECT id FROM public.industry_categories WHERE name = 'Human Resources')
WHERE lr.id::text LIKE '00000000-0000-4000-900d-%'
ON CONFLICT (register_id, industry_pack_id) DO NOTHING;

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), 'hrm_reg_' || lr.register_key, lr.label, lr.description, '/platform/local-registers/' || lr.id::text,
  (SELECT id FROM public.menu_items WHERE menu_code = v.category_code AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
  2, v.sort_order, 'universal', 'list-checks', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('00000000-0000-4000-900d-000000000001','hrm_cat_portfolio',2210),('00000000-0000-4000-900d-000000000002','hrm_cat_portfolio',2211),
  ('00000000-0000-4000-900d-000000000003','hrm_cat_portfolio',2212),('00000000-0000-4000-900d-000000000004','hrm_cat_portfolio',2213),
  ('00000000-0000-4000-900d-000000000005','hrm_cat_portfolio',2214),
  ('00000000-0000-4000-900d-000000000006','hrm_cat_org_design',2220),('00000000-0000-4000-900d-000000000007','hrm_cat_org_design',2221),
  ('00000000-0000-4000-900d-000000000008','hrm_cat_org_design',2222),
  ('00000000-0000-4000-900d-000000000009','hrm_cat_technology',2230),
  ('00000000-0000-4000-900d-00000000000a','hrm_cat_projects',2240)
) AS v(register_id, category_code, sort_order)
JOIN public.local_registers lr ON lr.id = v.register_id::uuid
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, route_path = EXCLUDED.route_path, parent_menu_id = EXCLUDED.parent_menu_id,
  sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- Reuse links (PRD decision 6b) — routes verified against platformRoutes.jsx.
INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'hrm_reuse_risks_issues', 'HR Risks & Issues', 'HR risk and issue register',
    '/platform/raid-log', (SELECT id FROM public.menu_items WHERE menu_code = 'hrm_cat_portfolio' LIMIT 1), 2, 2215, 'universal', 'alert-triangle', TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'hrm_reuse_budget_cost', 'HR Budget & Cost', 'HR budget management (see project Cost Management for project-scoped budget)',
    '/platform/reports', (SELECT id FROM public.menu_items WHERE menu_code = 'hrm_cat_portfolio' LIMIT 1), 2, 2216, 'universal', 'dollar-sign', TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'hrm_reuse_governance', 'HR Governance', 'HR governance and decisions',
    '/platform/governance', (SELECT id FROM public.menu_items WHERE menu_code = 'hrm_cat_portfolio' LIMIT 1), 2, 2217, 'universal', 'shield-check', TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'hrm_reuse_lessons', 'HR Knowledge & Lessons', 'HR lessons learned',
    '/platform/lessons/corporate', (SELECT id FROM public.menu_items WHERE menu_code = 'hrm_cat_portfolio' LIMIT 1), 2, 2218, 'universal', 'book-open', TRUE, TRUE, NOW(), NOW())
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, route_path = EXCLUDED.route_path, parent_menu_id = EXCLUDED.parent_menu_id,
  is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

SELECT public.grant_menu_role_group('hrm_re%');

INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
SELECT DISTINCT lrip.industry_pack_id, mi.id
FROM public.local_register_industry_packs lrip
JOIN public.local_registers lr ON lr.id = lrip.register_id
JOIN public.menu_items mi ON mi.route_path = '/platform/local-registers/' || lr.id::text
WHERE lr.id::text LIKE '00000000-0000-4000-900d-%' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
SELECT ip.id, mi.id
FROM public.menu_items mi
JOIN public.industry_packs ip ON ip.industry_category_id = (SELECT id FROM public.industry_categories WHERE name = 'Human Resources')
WHERE mi.menu_code LIKE 'hrm_reuse_%' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

DO $$
DECLARE v_registers INT;
BEGIN
  SELECT COUNT(*) INTO v_registers FROM public.local_registers WHERE id::text LIKE '00000000-0000-4000-900d-%';
  RAISE NOTICE 'v959: HRM phase complete — % registers across 4 categories + 4 reuse links', v_registers;
END $$;

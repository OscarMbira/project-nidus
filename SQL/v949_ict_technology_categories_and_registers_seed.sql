-- ============================================================================
-- v949: Industry Capability Content Taxonomy — Phase 4 (ICT: Information Technology)
-- ============================================================================
-- projectplan/v946_industry_capability_content_taxonomy_plan.md Phase 4.
-- Source: Documentation/Core_PM_and_Industry_Menu_Taxonomy.md Section 6, filtered through PRD
-- decision 0. 11 of 14 categories kept; Requirements/Defects/Releases/Deployments handled by
-- decision 6's reuse links, not new registers (Releases/Deployments already exist from v931/v934
-- and are already correctly pack-linked — untouched here to avoid risk to working rows;
-- Requirements/Defects get new menu_items rows pointing at their existing routes).
--
-- Same leaf-collapsing discipline as v948 (CON) applied throughout — see inline comments.
-- UUID block: 9003. Prerequisites: v931, v932, v946 (Information Technology pack exists),
-- v946c (grant_menu_role_group() helper).
-- ============================================================================

-- ── 1. Category menu_items (11 rows) ────────────────────────────────────────────────────

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.menu_code, v.menu_label, v.menu_description, NULL, NULL, 1, v.sort_order, 'universal', 'cpu', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('ict_cat_delivery', 'Technology Delivery', 'Overview of the technology delivery programme', 900),
  ('ict_cat_architecture', 'Architecture', 'Solution and technical architecture', 901),
  ('ict_cat_design', 'Design', 'Functional and technical design', 902),
  ('ict_cat_environments', 'Environments', 'Project environments', 903),
  ('ict_cat_development', 'Development', 'Development activities', 904),
  ('ict_cat_interfaces', 'Interfaces', 'System interfaces and integrations', 905),
  ('ict_cat_data', 'Data', 'Data sources, models and migration', 906),
  ('ict_cat_testing', 'Testing', 'Testing activities', 907),
  ('ict_cat_technical_debt', 'Technical Debt', 'Technical debt register', 908),
  ('ict_cat_cybersecurity', 'Cybersecurity', 'Project cybersecurity activities', 909),
  ('ict_cat_production_readiness', 'Production Readiness', 'Production readiness activities', 910)
) AS v(menu_code, menu_label, menu_description, sort_order)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, menu_description = EXCLUDED.menu_description,
  is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

SELECT public.grant_menu_role_group('ict_cat_%');

-- ── 2. local_registers (38 registers, UUID block 9003) ─────────────────────────────────

INSERT INTO public.local_registers (id, register_key, label, icon, description, scope_level, account_id, status_workflow, is_system_defined, is_active, created_at, updated_at)
SELECT v.id::uuid, v.register_key, v.label, 'list-checks', v.description, 'project', NULL, v.status_workflow::jsonb, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  -- Technology Delivery (4)
  ('00000000-0000-4000-9003-000000000001', 'ict_delivery_overview', 'Delivery Overview', 'Technology delivery programme overview', '[{"key":"draft","label":"Draft"},{"key":"published","label":"Published"}]'),
  ('00000000-0000-4000-9003-000000000002', 'ict_technology_roadmap', 'Technology Roadmap', 'Technology delivery roadmap', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9003-000000000003', 'ict_workstreams', 'Workstreams', 'Technology delivery workstreams', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-9003-000000000004', 'ict_technology_milestones', 'Technology Milestones', 'Technology delivery milestones', '[{"key":"upcoming","label":"Upcoming"},{"key":"met","label":"Met"},{"key":"missed","label":"Missed"}]'),
  -- Architecture (8)
  ('00000000-0000-4000-9003-000000000005', 'ict_enterprise_architecture', 'Enterprise Architecture', 'Enterprise architecture deliverables', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9003-000000000006', 'ict_solution_architecture', 'Solution Architecture', 'Solution architecture deliverables', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9003-000000000007', 'ict_application_architecture', 'Application Architecture', 'Application architecture deliverables', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9003-000000000008', 'ict_data_architecture', 'Data Architecture', 'Data architecture deliverables', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9003-000000000009', 'ict_integration_architecture', 'Integration Architecture', 'Integration architecture deliverables', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9003-00000000000a', 'ict_security_architecture', 'Security Architecture', 'Security architecture deliverables', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9003-00000000000b', 'ict_architecture_decisions', 'Architecture Decisions', 'Architecture decision records', '[{"key":"proposed","label":"Proposed"},{"key":"accepted","label":"Accepted"},{"key":"superseded","label":"Superseded"}]'),
  ('00000000-0000-4000-9003-00000000000c', 'ict_architecture_reviews', 'Architecture Reviews', 'Architecture review records', '[{"key":"scheduled","label":"Scheduled"},{"key":"complete","label":"Complete"}]'),
  -- Design (5 — Design Approval folded into each design type's own status)
  ('00000000-0000-4000-9003-00000000000d', 'ict_functional_design', 'Functional Design', 'Functional design deliverables', '[{"key":"draft","label":"Draft"},{"key":"review","label":"In Review"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9003-00000000000e', 'ict_technical_design', 'Technical Design', 'Technical design deliverables', '[{"key":"draft","label":"Draft"},{"key":"review","label":"In Review"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9003-00000000000f', 'ict_ux_ui_design', 'UX / UI Design', 'UX/UI design deliverables', '[{"key":"draft","label":"Draft"},{"key":"review","label":"In Review"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9003-000000000010', 'ict_data_design', 'Data Design', 'Data design deliverables', '[{"key":"draft","label":"Draft"},{"key":"review","label":"In Review"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9003-000000000011', 'ict_integration_design', 'Integration Design', 'Integration design deliverables', '[{"key":"draft","label":"Draft"},{"key":"review","label":"In Review"},{"key":"approved","label":"Approved"}]'),
  -- Environments (1, collapsed from Dev/Test/SIT/UAT/Staging/Prod/DR + Readiness)
  ('00000000-0000-4000-9003-000000000012', 'ict_environments', 'Environments', 'Project environments (Development/Test/SIT/UAT/Staging/Production/DR)', '[{"key":"not_provisioned","label":"Not Provisioned"},{"key":"provisioned","label":"Provisioned"},{"key":"ready","label":"Ready"}]'),
  -- Development (2, collapsed from Features/Components/Services/APIs/Configuration/Build Status)
  ('00000000-0000-4000-9003-000000000013', 'ict_development_items', 'Development Items', 'Development backlog (features, components, services, APIs, configuration)', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"code_review","label":"Code Review"},{"key":"built","label":"Built"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-9003-000000000014', 'ict_code_reviews', 'Code Reviews', 'Code review records', '[{"key":"open","label":"Open"},{"key":"approved","label":"Approved"},{"key":"changes_requested","label":"Changes Requested"}]'),
  -- Interfaces (2, collapsed from Interface Register/APIs/Events-Messaging/Batch-Files/Testing/Readiness)
  ('00000000-0000-4000-9003-000000000015', 'ict_interface_register', 'Interface Register', 'System interface register (APIs, events/messaging, batch/files)', '[{"key":"not_started","label":"Not Started"},{"key":"built","label":"Built"},{"key":"testing","label":"Testing"},{"key":"ready","label":"Ready"}]'),
  ('00000000-0000-4000-9003-000000000016', 'ict_integration_dependencies', 'Integration Dependencies', 'Integration dependency register', '[{"key":"open","label":"Open"},{"key":"resolved","label":"Resolved"}]'),
  -- Data (3, collapsed from Migration/Data Quality/Reconciliation/Sign-Off)
  ('00000000-0000-4000-9003-000000000017', 'ict_data_sources', 'Data Sources', 'Data source register', '[{"key":"identified","label":"Identified"},{"key":"connected","label":"Connected"}]'),
  ('00000000-0000-4000-9003-000000000018', 'ict_data_models', 'Data Models', 'Data model register', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9003-000000000019', 'ict_data_migration', 'Data Migration', 'Data migration, quality and reconciliation tracking', '[{"key":"scoping","label":"Scoping"},{"key":"migrating","label":"Migrating"},{"key":"quality_check","label":"Quality Check"},{"key":"reconciled","label":"Reconciled"},{"key":"signed_off","label":"Signed Off"}]'),
  -- Testing (1, collapsed from Unit/Integration/SIT/UAT/Regression/Performance/Security/DR)
  ('00000000-0000-4000-9003-00000000001a', 'ict_testing', 'Testing', 'Testing activities (unit, integration, SIT, UAT, regression, performance, security, DR)', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"passed","label":"Passed"},{"key":"failed","label":"Failed"}]'),
  -- Technical Debt (1, collapsed from Register/Architecture/Code/Infrastructure/Security Debt/Priority/Remediation)
  ('00000000-0000-4000-9003-00000000001b', 'ict_technical_debt', 'Technical Debt', 'Technical debt register (architecture, code, infrastructure, security)', '[{"key":"identified","label":"Identified"},{"key":"prioritised","label":"Prioritised"},{"key":"in_remediation","label":"In Remediation"},{"key":"resolved","label":"Resolved"}]'),
  -- Cybersecurity (4, Security Exceptions/Sign-Off folded into status)
  ('00000000-0000-4000-9003-00000000001c', 'ict_security_requirements', 'Security Requirements', 'Project security requirements register', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9003-00000000001d', 'ict_threat_assessment', 'Threat Assessment', 'Threat assessment records', '[{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-9003-00000000001e', 'ict_vulnerabilities', 'Vulnerabilities', 'Vulnerability register', '[{"key":"open","label":"Open"},{"key":"in_remediation","label":"In Remediation"},{"key":"closed","label":"Closed"}]'),
  ('00000000-0000-4000-9003-00000000001f', 'ict_penetration_testing', 'Penetration Testing', 'Penetration testing records', '[{"key":"scheduled","label":"Scheduled"},{"key":"complete","label":"Complete"}]'),
  -- Production Readiness (7)
  ('00000000-0000-4000-9003-000000000020', 'ict_operational_readiness', 'Operational Readiness', 'Production operational readiness tracking', '[{"key":"not_ready","label":"Not Ready"},{"key":"ready","label":"Ready"}]'),
  ('00000000-0000-4000-9003-000000000021', 'ict_monitoring_setup', 'Monitoring', 'Production monitoring setup', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"ready","label":"Ready"}]'),
  ('00000000-0000-4000-9003-000000000022', 'ict_logging_alerting', 'Logging & Alerting', 'Production logging and alerting setup', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"ready","label":"Ready"}]'),
  ('00000000-0000-4000-9003-000000000023', 'ict_support_model', 'Support Model', 'Post go-live support model', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9003-000000000024', 'ict_runbooks', 'Runbooks', 'Operational runbooks', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9003-000000000025', 'ict_disaster_recovery', 'Disaster Recovery', 'Disaster recovery plan and readiness', '[{"key":"not_ready","label":"Not Ready"},{"key":"ready","label":"Ready"}]'),
  ('00000000-0000-4000-9003-000000000026', 'ict_go_live_hypercare', 'Go-Live & Hypercare', 'Go-live decision and hypercare tracking', '[{"key":"pending","label":"Pending"},{"key":"go_live","label":"Go-Live"},{"key":"hypercare","label":"Hypercare"},{"key":"stabilised","label":"Stabilised"}]')
) AS v(id, register_key, label, description, status_workflow)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, status_workflow = EXCLUDED.status_workflow,
  is_active = TRUE, updated_at = NOW();

-- ── 3. local_register_industry_packs ────────────────────────────────────────────────────

INSERT INTO public.local_register_industry_packs (register_id, industry_pack_id)
SELECT lr.id, ip.id
FROM public.local_registers lr
JOIN public.industry_packs ip ON ip.industry_category_id = (
  SELECT id FROM public.industry_categories WHERE name = 'Information Technology'
)
WHERE lr.id::text LIKE '00000000-0000-4000-9003-%'
ON CONFLICT (register_id, industry_pack_id) DO NOTHING;

-- ── 4. menu_items — one per register, nested under its category ────────────────────────

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT
  gen_random_uuid(), 'ict_reg_' || lr.register_key, lr.label, lr.description,
  '/platform/local-registers/' || lr.id::text,
  (SELECT id FROM public.menu_items WHERE menu_code = v.category_code AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
  2, v.sort_order, 'universal', 'list-checks', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('00000000-0000-4000-9003-000000000001','ict_cat_delivery',920),('00000000-0000-4000-9003-000000000002','ict_cat_delivery',921),
  ('00000000-0000-4000-9003-000000000003','ict_cat_delivery',922),('00000000-0000-4000-9003-000000000004','ict_cat_delivery',923),
  ('00000000-0000-4000-9003-000000000005','ict_cat_architecture',930),('00000000-0000-4000-9003-000000000006','ict_cat_architecture',931),
  ('00000000-0000-4000-9003-000000000007','ict_cat_architecture',932),('00000000-0000-4000-9003-000000000008','ict_cat_architecture',933),
  ('00000000-0000-4000-9003-000000000009','ict_cat_architecture',934),('00000000-0000-4000-9003-00000000000a','ict_cat_architecture',935),
  ('00000000-0000-4000-9003-00000000000b','ict_cat_architecture',936),('00000000-0000-4000-9003-00000000000c','ict_cat_architecture',937),
  ('00000000-0000-4000-9003-00000000000d','ict_cat_design',940),('00000000-0000-4000-9003-00000000000e','ict_cat_design',941),
  ('00000000-0000-4000-9003-00000000000f','ict_cat_design',942),('00000000-0000-4000-9003-000000000010','ict_cat_design',943),
  ('00000000-0000-4000-9003-000000000011','ict_cat_design',944),
  ('00000000-0000-4000-9003-000000000012','ict_cat_environments',950),
  ('00000000-0000-4000-9003-000000000013','ict_cat_development',960),('00000000-0000-4000-9003-000000000014','ict_cat_development',961),
  ('00000000-0000-4000-9003-000000000015','ict_cat_interfaces',970),('00000000-0000-4000-9003-000000000016','ict_cat_interfaces',971),
  ('00000000-0000-4000-9003-000000000017','ict_cat_data',980),('00000000-0000-4000-9003-000000000018','ict_cat_data',981),
  ('00000000-0000-4000-9003-000000000019','ict_cat_data',982),
  ('00000000-0000-4000-9003-00000000001a','ict_cat_testing',990),
  ('00000000-0000-4000-9003-00000000001b','ict_cat_technical_debt',1000),
  ('00000000-0000-4000-9003-00000000001c','ict_cat_cybersecurity',1010),('00000000-0000-4000-9003-00000000001d','ict_cat_cybersecurity',1011),
  ('00000000-0000-4000-9003-00000000001e','ict_cat_cybersecurity',1012),('00000000-0000-4000-9003-00000000001f','ict_cat_cybersecurity',1013),
  ('00000000-0000-4000-9003-000000000020','ict_cat_production_readiness',1020),('00000000-0000-4000-9003-000000000021','ict_cat_production_readiness',1021),
  ('00000000-0000-4000-9003-000000000022','ict_cat_production_readiness',1022),('00000000-0000-4000-9003-000000000023','ict_cat_production_readiness',1023),
  ('00000000-0000-4000-9003-000000000024','ict_cat_production_readiness',1024),('00000000-0000-4000-9003-000000000025','ict_cat_production_readiness',1025),
  ('00000000-0000-4000-9003-000000000026','ict_cat_production_readiness',1026)
) AS v(register_id, category_code, sort_order)
JOIN public.local_registers lr ON lr.id = v.register_id::uuid
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, route_path = EXCLUDED.route_path, parent_menu_id = EXCLUDED.parent_menu_id,
  sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- ── 5. Reuse links (PRD decision 6) — Requirements + Defects point at existing routes, no new
-- local_registers row. Releases/Deployments already exist and are already pack-linked (v931/v934)
-- — deliberately untouched here to avoid risk to already-working rows.

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'ict_reuse_requirements', 'Requirements', 'Project requirements register',
    '/platform/scope/requirements',
    (SELECT id FROM public.menu_items WHERE menu_code = 'ict_cat_delivery' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
    2, 924, 'universal', 'list-checks', TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'ict_reuse_defects', 'Defects', 'Project defect register',
    '/platform/testing/defects',
    (SELECT id FROM public.menu_items WHERE menu_code = 'ict_cat_testing' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
    2, 991, 'universal', 'list-checks', TRUE, TRUE, NOW(), NOW())
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, route_path = EXCLUDED.route_path, parent_menu_id = EXCLUDED.parent_menu_id,
  is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- ── 6. Role grants for all ICT register + reuse menu items (both prefixes share "ict_re") ──

SELECT public.grant_menu_role_group('ict_re%');

-- ── 7. industry_pack_menu_items — new registers + the 2 reuse-link menu items ──────────

INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
SELECT DISTINCT lrip.industry_pack_id, mi.id
FROM public.local_register_industry_packs lrip
JOIN public.local_registers lr ON lr.id = lrip.register_id
JOIN public.menu_items mi ON mi.route_path = '/platform/local-registers/' || lr.id::text
WHERE lr.id::text LIKE '00000000-0000-4000-9003-%' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
SELECT ip.id, mi.id
FROM public.menu_items mi
JOIN public.industry_packs ip ON ip.industry_category_id = (
  SELECT id FROM public.industry_categories WHERE name = 'Information Technology'
)
WHERE mi.menu_code IN ('ict_reuse_requirements', 'ict_reuse_defects')
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

DO $$
DECLARE v_registers INT;
BEGIN
  SELECT COUNT(*) INTO v_registers FROM public.local_registers WHERE id::text LIKE '00000000-0000-4000-9003-%';
  RAISE NOTICE 'v949: ICT phase complete — % registers across 11 categories + 2 reuse links (Requirements/Defects); Releases/Deployments left untouched (already correctly linked from v931/v934)', v_registers;
END $$;

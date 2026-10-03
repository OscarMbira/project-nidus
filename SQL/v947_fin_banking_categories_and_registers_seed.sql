-- ============================================================================
-- v947: Industry Capability Content Taxonomy — Phase 2 (FIN: Banking & Financial Services)
-- ============================================================================
-- projectplan/v946_industry_capability_content_taxonomy_plan.md Phase 2.
-- Source: Documentation/Core_PM_and_Industry_Menu_Taxonomy.md Section 4, filtered through
-- PRD v946 decision 0 (PM-of-projects only) — 8 of the taxonomy's 10 Level-2 categories kept
-- (Regulatory & Compliance and Payments & Channels dropped as ongoing operational content).
--
-- Pattern (confirmed technical pattern, projectplan/v946 header): category menu_items rows need
-- NO industry_pack_menu_items entry (groupMenuTreeByIndustryPack's pruneToOwner keeps a parent
-- automatically once any child matches); only the register leaf rows need one. Category
-- visibility comes from ordinary role_menu_items grants, not the hardcoded structural-scaffolding
-- list — same broad delivery-team role set v934 already used for the original 28 registers.
--
-- UUID scheme: this initiative's registers use the 9xxx block (00000000-0000-4000-90XX-...) to
-- stay visually distinct from the original 28 (which use the 8000 block). FIN = block 9001.
-- Prerequisites: v931 (Local Register Engine), v932 (schema fix), v946 (industry master data,
-- confirmed live — Banking & Financial Services pack exists), v946c (grant_menu_role_group()
-- helper — role grants below use this instead of repeating the role-name list inline)
-- ============================================================================

-- ── 1. Category menu_items (8 rows, pure section headers, no route_path) ───────────────

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.menu_code, v.menu_label, v.menu_description, NULL, NULL, 1, v.sort_order, 'universal', 'layers', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('fin_cat_transformation', 'Banking Transformation', 'Overview of the banking transformation programme', 600),
  ('fin_cat_core_banking', 'Core Banking', 'Core banking system configuration and build activities', 601),
  ('fin_cat_data_migration', 'Data Migration', 'Banking data migration activities', 602),
  ('fin_cat_testing_assurance', 'Testing & Assurance', 'Banking system testing and assurance activities', 603),
  ('fin_cat_cutover', 'Cutover', 'Banking cutover planning and execution', 604),
  ('fin_cat_operational_readiness', 'Operational Readiness', 'Banking operational readiness activities', 605),
  ('fin_cat_go_live', 'Go-Live', 'Banking go-live activities', 606),
  ('fin_cat_hypercare', 'Hypercare', 'Post-go-live hypercare activities', 607)
) AS v(menu_code, menu_label, menu_description, sort_order)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, menu_description = EXCLUDED.menu_description,
  is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- ── 2. Category role grants (public.grant_menu_role_group, v946c — 'delivery_team' group) ──

SELECT public.grant_menu_role_group('fin_cat_%');

-- ── 3. local_registers rows (62 registers, fixed UUIDs, 9001 block) ────────────────────

INSERT INTO public.local_registers (id, register_key, label, icon, description, scope_level, account_id, status_workflow, is_system_defined, is_active, created_at, updated_at)
SELECT v.id::uuid, v.register_key, v.label, 'list-checks', v.description, 'project', NULL, v.status_workflow::jsonb, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  -- Banking Transformation
  ('00000000-0000-4000-9001-000000000001', 'fin_transformation_overview', 'Transformation Overview', 'Executive overview of the banking transformation programme', '[{"key":"draft","label":"Draft"},{"key":"published","label":"Published"}]'),
  ('00000000-0000-4000-9001-000000000002', 'fin_transformation_roadmap', 'Transformation Roadmap', 'Roadmap of the banking transformation programme', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9001-000000000003', 'fin_business_units', 'Business Units', 'Business units in scope of the transformation', '[{"key":"in_scope","label":"In Scope"},{"key":"out_of_scope","label":"Out of Scope"}]'),
  ('00000000-0000-4000-9001-000000000004', 'fin_workstreams', 'Workstreams', 'Transformation programme workstreams', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-9001-000000000005', 'fin_regulatory_milestones', 'Regulatory Milestones', 'Regulatory milestones for the transformation programme', '[{"key":"upcoming","label":"Upcoming"},{"key":"met","label":"Met"},{"key":"missed","label":"Missed"}]'),
  ('00000000-0000-4000-9001-000000000006', 'fin_transformation_readiness', 'Transformation Readiness', 'Overall transformation readiness tracking', '[{"key":"not_ready","label":"Not Ready"},{"key":"ready","label":"Ready"}]'),
  -- Core Banking
  ('00000000-0000-4000-9001-000000000007', 'fin_product_configuration', 'Product Configuration', 'Core banking product configuration items', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"configured","label":"Configured"},{"key":"tested","label":"Tested"}]'),
  ('00000000-0000-4000-9001-000000000008', 'fin_parameterisation', 'Parameterisation', 'Core banking parameter sets', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"configured","label":"Configured"},{"key":"tested","label":"Tested"}]'),
  ('00000000-0000-4000-9001-000000000009', 'fin_core_banking_interfaces', 'Interfaces', 'Core banking system interfaces', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"built","label":"Built"},{"key":"tested","label":"Tested"}]'),
  ('00000000-0000-4000-9001-00000000000a', 'fin_core_banking_environments', 'Environments', 'Core banking project environments', '[{"key":"not_provisioned","label":"Not Provisioned"},{"key":"provisioned","label":"Provisioned"},{"key":"ready","label":"Ready"}]'),
  ('00000000-0000-4000-9001-00000000000b', 'fin_customisation', 'Customisation', 'Core banking customisation items', '[{"key":"register","label":"Registered"},{"key":"justification","label":"Justification"},{"key":"design","label":"Design"},{"key":"build","label":"Build"},{"key":"testing","label":"Testing"},{"key":"deployed","label":"Deployed"}]'),
  -- Data Migration
  ('00000000-0000-4000-9001-00000000000c', 'fin_migration_strategy', 'Migration Strategy', 'Data migration strategy', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9001-00000000000d', 'fin_data_scope', 'Data Scope', 'Data migration scope items', '[{"key":"in_scope","label":"In Scope"},{"key":"out_of_scope","label":"Out of Scope"}]'),
  ('00000000-0000-4000-9001-00000000000e', 'fin_source_systems', 'Source Systems', 'Source systems for data migration', '[{"key":"identified","label":"Identified"},{"key":"connected","label":"Connected"},{"key":"extracted","label":"Extracted"}]'),
  ('00000000-0000-4000-9001-00000000000f', 'fin_data_mapping', 'Data Mapping', 'Source to target data mapping', '[{"key":"draft","label":"Draft"},{"key":"reviewed","label":"Reviewed"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9001-000000000010', 'fin_data_cleansing', 'Data Cleansing', 'Data cleansing activities', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-9001-000000000011', 'fin_data_transformation', 'Data Transformation', 'Data transformation rules and activities', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-9001-000000000012', 'fin_migration_rules', 'Migration Rules', 'Data migration business rules', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9001-000000000013', 'fin_mock_migrations', 'Mock Migrations', 'Mock migration runs', '[{"key":"planned","label":"Planned"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-9001-000000000014', 'fin_reconciliations', 'Reconciliations', 'Data migration reconciliations', '[{"key":"open","label":"Open"},{"key":"reconciled","label":"Reconciled"},{"key":"exception","label":"Exception"}]'),
  ('00000000-0000-4000-9001-000000000015', 'fin_migration_defects', 'Migration Defects', 'Data migration defects', '[{"key":"open","label":"Open"},{"key":"in_progress","label":"In Progress"},{"key":"resolved","label":"Resolved"},{"key":"closed","label":"Closed"}]'),
  ('00000000-0000-4000-9001-000000000016', 'fin_migration_sign_off', 'Migration Sign-Off', 'Data migration sign-off', '[{"key":"pending","label":"Pending"},{"key":"signed_off","label":"Signed Off"}]'),
  -- Testing & Assurance
  ('00000000-0000-4000-9001-000000000017', 'fin_sit', 'SIT', 'System Integration Testing', '[{"key":"plan","label":"Plan"},{"key":"cases","label":"Cases"},{"key":"execution","label":"Execution"},{"key":"defects","label":"Defects"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-9001-000000000018', 'fin_uat', 'UAT', 'User Acceptance Testing', '[{"key":"plan","label":"Plan"},{"key":"cases","label":"Cases"},{"key":"execution","label":"Execution"},{"key":"sign_off","label":"Sign-Off"}]'),
  ('00000000-0000-4000-9001-000000000019', 'fin_regression_testing', 'Regression Testing', 'Regression testing activities', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-9001-00000000001a', 'fin_performance_testing', 'Performance Testing', 'Performance testing activities', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-9001-00000000001b', 'fin_security_testing', 'Security Testing', 'Security testing activities', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-9001-00000000001c', 'fin_dr_testing', 'DR Testing', 'Disaster recovery testing activities', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-9001-00000000001d', 'fin_operational_readiness_testing', 'Operational Readiness Testing', 'Operational readiness testing activities', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'),
  -- Cutover
  ('00000000-0000-4000-9001-00000000001e', 'fin_cutover_strategy', 'Cutover Strategy', 'Cutover strategy', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9001-00000000001f', 'fin_cutover_plan', 'Cutover Plan', 'Detailed cutover plan', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9001-000000000020', 'fin_cutover_activities', 'Cutover Activities', 'Individual cutover activities', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-9001-000000000021', 'fin_cutover_dependencies', 'Cutover Dependencies', 'Cutover dependencies', '[{"key":"open","label":"Open"},{"key":"resolved","label":"Resolved"}]'),
  ('00000000-0000-4000-9001-000000000022', 'fin_command_centre', 'Command Centre', 'Cutover command centre log', '[{"key":"open","label":"Open"},{"key":"closed","label":"Closed"}]'),
  ('00000000-0000-4000-9001-000000000023', 'fin_go_no_go', 'Go / No-Go', 'Go/No-Go decision points', '[{"key":"pending","label":"Pending"},{"key":"go","label":"Go"},{"key":"no_go","label":"No-Go"}]'),
  ('00000000-0000-4000-9001-000000000024', 'fin_rollback_plan', 'Rollback Plan', 'Cutover rollback plan', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9001-000000000025', 'fin_cutover_communications', 'Cutover Communications', 'Cutover communications log', '[{"key":"planned","label":"Planned"},{"key":"sent","label":"Sent"}]'),
  ('00000000-0000-4000-9001-000000000026', 'fin_business_readiness', 'Business Readiness', 'Cutover business readiness tracking', '[{"key":"not_ready","label":"Not Ready"},{"key":"ready","label":"Ready"}]'),
  ('00000000-0000-4000-9001-000000000027', 'fin_technology_readiness', 'Technology Readiness', 'Cutover technology readiness tracking', '[{"key":"not_ready","label":"Not Ready"},{"key":"ready","label":"Ready"}]'),
  ('00000000-0000-4000-9001-000000000028', 'fin_cutover_sign_off', 'Cutover Sign-Off', 'Cutover sign-off', '[{"key":"pending","label":"Pending"},{"key":"signed_off","label":"Signed Off"}]'),
  -- Operational Readiness
  ('00000000-0000-4000-9001-000000000029', 'fin_sops', 'SOPs', 'Standard operating procedures', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"},{"key":"published","label":"Published"}]'),
  ('00000000-0000-4000-9001-00000000002a', 'fin_process_readiness', 'Process Readiness', 'Process readiness tracking', '[{"key":"not_ready","label":"Not Ready"},{"key":"ready","label":"Ready"}]'),
  ('00000000-0000-4000-9001-00000000002b', 'fin_readiness_training', 'Training', 'Operational readiness training', '[{"key":"planned","label":"Planned"},{"key":"delivered","label":"Delivered"}]'),
  ('00000000-0000-4000-9001-00000000002c', 'fin_branch_readiness', 'Branch Readiness', 'Branch operational readiness', '[{"key":"not_ready","label":"Not Ready"},{"key":"ready","label":"Ready"}]'),
  ('00000000-0000-4000-9001-00000000002d', 'fin_contact_centre_readiness', 'Contact Centre Readiness', 'Contact centre readiness', '[{"key":"not_ready","label":"Not Ready"},{"key":"ready","label":"Ready"}]'),
  ('00000000-0000-4000-9001-00000000002e', 'fin_support_model', 'Support Model', 'Post go-live support model', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9001-00000000002f', 'fin_readiness_monitoring', 'Monitoring', 'Operational monitoring setup', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"ready","label":"Ready"}]'),
  ('00000000-0000-4000-9001-000000000030', 'fin_incident_management', 'Incident Management', 'Incident management setup', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"ready","label":"Ready"}]'),
  ('00000000-0000-4000-9001-000000000031', 'fin_readiness_sign_off', 'Readiness Sign-Off', 'Operational readiness sign-off', '[{"key":"pending","label":"Pending"},{"key":"signed_off","label":"Signed Off"}]'),
  -- Go-Live
  ('00000000-0000-4000-9001-000000000032', 'fin_production_deployment', 'Production Deployment', 'Go-live production deployment', '[{"key":"planned","label":"Planned"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-9001-000000000033', 'fin_opening_balances', 'Opening Balances', 'Go-live opening balances', '[{"key":"pending","label":"Pending"},{"key":"loaded","label":"Loaded"},{"key":"verified","label":"Verified"}]'),
  ('00000000-0000-4000-9001-000000000034', 'fin_day1_validation', 'Day-1 Validation', 'Day-1 validation checks', '[{"key":"pending","label":"Pending"},{"key":"passed","label":"Passed"},{"key":"failed","label":"Failed"}]'),
  ('00000000-0000-4000-9001-000000000035', 'fin_business_verification', 'Business Verification', 'Go-live business verification', '[{"key":"pending","label":"Pending"},{"key":"verified","label":"Verified"}]'),
  ('00000000-0000-4000-9001-000000000036', 'fin_technical_verification', 'Technical Verification', 'Go-live technical verification', '[{"key":"pending","label":"Pending"},{"key":"verified","label":"Verified"}]'),
  ('00000000-0000-4000-9001-000000000037', 'fin_go_live_decision', 'Go-Live Decision', 'Go-live decision record', '[{"key":"pending","label":"Pending"},{"key":"go","label":"Go"},{"key":"no_go","label":"No-Go"}]'),
  -- Hypercare
  ('00000000-0000-4000-9001-000000000038', 'fin_hypercare_plan', 'Hypercare Plan', 'Hypercare plan', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9001-000000000039', 'fin_daily_command_centre', 'Daily Command Centre', 'Hypercare daily command centre log', '[{"key":"open","label":"Open"},{"key":"closed","label":"Closed"}]'),
  ('00000000-0000-4000-9001-00000000003a', 'fin_hypercare_incidents', 'Incidents', 'Hypercare incidents', '[{"key":"open","label":"Open"},{"key":"in_progress","label":"In Progress"},{"key":"resolved","label":"Resolved"}]'),
  ('00000000-0000-4000-9001-00000000003b', 'fin_hypercare_defects', 'Defects', 'Hypercare defects', '[{"key":"open","label":"Open"},{"key":"in_progress","label":"In Progress"},{"key":"resolved","label":"Resolved"}]'),
  ('00000000-0000-4000-9001-00000000003c', 'fin_hypercare_performance_monitoring', 'Performance Monitoring', 'Hypercare performance monitoring', '[{"key":"nominal","label":"Nominal"},{"key":"degraded","label":"Degraded"},{"key":"critical","label":"Critical"}]'),
  ('00000000-0000-4000-9001-00000000003d', 'fin_user_support', 'User Support', 'Hypercare user support log', '[{"key":"open","label":"Open"},{"key":"resolved","label":"Resolved"}]'),
  ('00000000-0000-4000-9001-00000000003e', 'fin_exit_criteria', 'Exit Criteria', 'Hypercare exit criteria', '[{"key":"not_met","label":"Not Met"},{"key":"met","label":"Met"}]')
) AS v(id, register_key, label, description, status_workflow)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, status_workflow = EXCLUDED.status_workflow,
  is_active = TRUE, updated_at = NOW();

-- ── 4. local_register_fields — only where a clean Level-4 mapping exists (PRD decision 5) ──

INSERT INTO public.local_register_fields (id, register_id, field_key, field_label, field_type, is_required, display_order, dropdown_options)
SELECT gen_random_uuid(), v.register_id::uuid, v.field_key, v.field_label, v.field_type, FALSE, 0, v.dropdown_options::jsonb
FROM (VALUES
  ('00000000-0000-4000-9001-000000000007', 'product_area', 'Product Area', 'dropdown', '[{"value":"deposits","label":"Deposits"},{"value":"lending","label":"Lending"},{"value":"payments","label":"Payments"},{"value":"customer","label":"Customer"},{"value":"fees_charges","label":"Fees / Charges"}]'),
  ('00000000-0000-4000-9001-000000000008', 'parameter_type', 'Parameter Type', 'dropdown', '[{"value":"global","label":"Global Parameters"},{"value":"product","label":"Product Parameters"},{"value":"branch","label":"Branch Parameters"},{"value":"accounting","label":"Accounting Parameters"}]'),
  ('00000000-0000-4000-9001-000000000009', 'interface_type', 'Interface Type', 'dropdown', '[{"value":"upstream","label":"Upstream System"},{"value":"downstream","label":"Downstream System"},{"value":"file","label":"File Interface"},{"value":"api","label":"API"}]'),
  ('00000000-0000-4000-9001-00000000000a', 'environment', 'Environment', 'dropdown', '[{"value":"development","label":"Development"},{"value":"sit","label":"SIT"},{"value":"uat","label":"UAT"},{"value":"pre_production","label":"Pre-Production"},{"value":"production","label":"Production"},{"value":"dr","label":"DR"}]'),
  ('00000000-0000-4000-9001-000000000013', 'mock_round', 'Mock Round', 'dropdown', '[{"value":"mock_1","label":"Mock 1"},{"value":"mock_2","label":"Mock 2"},{"value":"dress_rehearsal","label":"Dress Rehearsal"},{"value":"final_migration","label":"Final Migration"}]'),
  ('00000000-0000-4000-9001-000000000014', 'reconciliation_type', 'Reconciliation Type', 'dropdown', '[{"value":"record_counts","label":"Record Counts"},{"value":"financial","label":"Financial"},{"value":"customer","label":"Customer"},{"value":"account","label":"Account"}]'),
  ('00000000-0000-4000-9001-000000000005', 'milestone_date', 'Milestone Date', 'date', NULL),
  ('00000000-0000-4000-9001-000000000023', 'decision_date', 'Decision Date', 'date', NULL),
  ('00000000-0000-4000-9001-000000000037', 'decision_date', 'Decision Date', 'date', NULL)
) AS v(register_id, field_key, field_label, field_type, dropdown_options)
ON CONFLICT DO NOTHING;

-- ── 5. local_register_industry_packs — links every register to the Banking & Financial ─────
-- Services pack (the ONE genuine curation source PRD v945/v931's design relies on).

INSERT INTO public.local_register_industry_packs (register_id, industry_pack_id)
SELECT lr.id, ip.id
FROM public.local_registers lr
JOIN public.industry_packs ip ON ip.industry_category_id = (
  SELECT id FROM public.industry_categories WHERE name = 'Banking & Financial Services'
)
WHERE lr.id::text LIKE '00000000-0000-4000-9001-%'
ON CONFLICT (register_id, industry_pack_id) DO NOTHING;

-- ── 6. menu_items rows — one per register, nested under its category ───────────────────

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'fin_reg_' || lr.register_key,
  lr.label,
  lr.description,
  '/platform/local-registers/' || lr.id::text,
  (SELECT id FROM public.menu_items WHERE menu_code = v.category_code AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
  2, v.sort_order, 'universal', 'list-checks', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('00000000-0000-4000-9001-000000000001', 'fin_cat_transformation', 610),
  ('00000000-0000-4000-9001-000000000002', 'fin_cat_transformation', 611),
  ('00000000-0000-4000-9001-000000000003', 'fin_cat_transformation', 612),
  ('00000000-0000-4000-9001-000000000004', 'fin_cat_transformation', 613),
  ('00000000-0000-4000-9001-000000000005', 'fin_cat_transformation', 614),
  ('00000000-0000-4000-9001-000000000006', 'fin_cat_transformation', 615),
  ('00000000-0000-4000-9001-000000000007', 'fin_cat_core_banking', 620),
  ('00000000-0000-4000-9001-000000000008', 'fin_cat_core_banking', 621),
  ('00000000-0000-4000-9001-000000000009', 'fin_cat_core_banking', 622),
  ('00000000-0000-4000-9001-00000000000a', 'fin_cat_core_banking', 623),
  ('00000000-0000-4000-9001-00000000000b', 'fin_cat_core_banking', 624),
  ('00000000-0000-4000-9001-00000000000c', 'fin_cat_data_migration', 630),
  ('00000000-0000-4000-9001-00000000000d', 'fin_cat_data_migration', 631),
  ('00000000-0000-4000-9001-00000000000e', 'fin_cat_data_migration', 632),
  ('00000000-0000-4000-9001-00000000000f', 'fin_cat_data_migration', 633),
  ('00000000-0000-4000-9001-000000000010', 'fin_cat_data_migration', 634),
  ('00000000-0000-4000-9001-000000000011', 'fin_cat_data_migration', 635),
  ('00000000-0000-4000-9001-000000000012', 'fin_cat_data_migration', 636),
  ('00000000-0000-4000-9001-000000000013', 'fin_cat_data_migration', 637),
  ('00000000-0000-4000-9001-000000000014', 'fin_cat_data_migration', 638),
  ('00000000-0000-4000-9001-000000000015', 'fin_cat_data_migration', 639),
  ('00000000-0000-4000-9001-000000000016', 'fin_cat_data_migration', 640),
  ('00000000-0000-4000-9001-000000000017', 'fin_cat_testing_assurance', 650),
  ('00000000-0000-4000-9001-000000000018', 'fin_cat_testing_assurance', 651),
  ('00000000-0000-4000-9001-000000000019', 'fin_cat_testing_assurance', 652),
  ('00000000-0000-4000-9001-00000000001a', 'fin_cat_testing_assurance', 653),
  ('00000000-0000-4000-9001-00000000001b', 'fin_cat_testing_assurance', 654),
  ('00000000-0000-4000-9001-00000000001c', 'fin_cat_testing_assurance', 655),
  ('00000000-0000-4000-9001-00000000001d', 'fin_cat_testing_assurance', 656),
  ('00000000-0000-4000-9001-00000000001e', 'fin_cat_cutover', 660),
  ('00000000-0000-4000-9001-00000000001f', 'fin_cat_cutover', 661),
  ('00000000-0000-4000-9001-000000000020', 'fin_cat_cutover', 662),
  ('00000000-0000-4000-9001-000000000021', 'fin_cat_cutover', 663),
  ('00000000-0000-4000-9001-000000000022', 'fin_cat_cutover', 664),
  ('00000000-0000-4000-9001-000000000023', 'fin_cat_cutover', 665),
  ('00000000-0000-4000-9001-000000000024', 'fin_cat_cutover', 666),
  ('00000000-0000-4000-9001-000000000025', 'fin_cat_cutover', 667),
  ('00000000-0000-4000-9001-000000000026', 'fin_cat_cutover', 668),
  ('00000000-0000-4000-9001-000000000027', 'fin_cat_cutover', 669),
  ('00000000-0000-4000-9001-000000000028', 'fin_cat_cutover', 670),
  ('00000000-0000-4000-9001-000000000029', 'fin_cat_operational_readiness', 680),
  ('00000000-0000-4000-9001-00000000002a', 'fin_cat_operational_readiness', 681),
  ('00000000-0000-4000-9001-00000000002b', 'fin_cat_operational_readiness', 682),
  ('00000000-0000-4000-9001-00000000002c', 'fin_cat_operational_readiness', 683),
  ('00000000-0000-4000-9001-00000000002d', 'fin_cat_operational_readiness', 684),
  ('00000000-0000-4000-9001-00000000002e', 'fin_cat_operational_readiness', 685),
  ('00000000-0000-4000-9001-00000000002f', 'fin_cat_operational_readiness', 686),
  ('00000000-0000-4000-9001-000000000030', 'fin_cat_operational_readiness', 687),
  ('00000000-0000-4000-9001-000000000031', 'fin_cat_operational_readiness', 688),
  ('00000000-0000-4000-9001-000000000032', 'fin_cat_go_live', 690),
  ('00000000-0000-4000-9001-000000000033', 'fin_cat_go_live', 691),
  ('00000000-0000-4000-9001-000000000034', 'fin_cat_go_live', 692),
  ('00000000-0000-4000-9001-000000000035', 'fin_cat_go_live', 693),
  ('00000000-0000-4000-9001-000000000036', 'fin_cat_go_live', 694),
  ('00000000-0000-4000-9001-000000000037', 'fin_cat_go_live', 695),
  ('00000000-0000-4000-9001-000000000038', 'fin_cat_hypercare', 700),
  ('00000000-0000-4000-9001-000000000039', 'fin_cat_hypercare', 701),
  ('00000000-0000-4000-9001-00000000003a', 'fin_cat_hypercare', 702),
  ('00000000-0000-4000-9001-00000000003b', 'fin_cat_hypercare', 703),
  ('00000000-0000-4000-9001-00000000003c', 'fin_cat_hypercare', 704),
  ('00000000-0000-4000-9001-00000000003d', 'fin_cat_hypercare', 705),
  ('00000000-0000-4000-9001-00000000003e', 'fin_cat_hypercare', 706)
) AS v(register_id, category_code, sort_order)
JOIN public.local_registers lr ON lr.id = v.register_id::uuid
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, route_path = EXCLUDED.route_path, parent_menu_id = EXCLUDED.parent_menu_id,
  sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- ── 7. Register menu items — same helper ────────────────────────────────────────────────

SELECT public.grant_menu_role_group('fin_reg_%');

-- ── 8. industry_pack_menu_items — derived from local_register_industry_packs (v945 pattern) ─

INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
SELECT DISTINCT lrip.industry_pack_id, mi.id
FROM public.local_register_industry_packs lrip
JOIN public.local_registers lr ON lr.id = lrip.register_id
JOIN public.menu_items mi ON mi.route_path = '/platform/local-registers/' || lr.id::text
WHERE lr.id::text LIKE '00000000-0000-4000-9001-%'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

DO $$
DECLARE
  v_registers INT;
  v_menu_items INT;
BEGIN
  SELECT COUNT(*) INTO v_registers FROM public.local_registers WHERE id::text LIKE '00000000-0000-4000-9001-%';
  SELECT COUNT(*) INTO v_menu_items FROM public.menu_items WHERE menu_code LIKE 'fin_%';
  RAISE NOTICE 'v947: FIN phase complete — % registers, % menu_items (8 categories + registers)', v_registers, v_menu_items;
END $$;

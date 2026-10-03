-- ============================================================================
-- v952: Industry Capability Content Taxonomy — Phase 7 (TEL: Telecommunications)
-- ============================================================================
-- projectplan/v946_industry_capability_content_taxonomy_plan.md Phase 7.
-- Source: Documentation/Core_PM_and_Industry_Menu_Taxonomy.md Section 9, filtered through PRD
-- decision 0. 9 of 10 categories kept (Services dropped — ongoing product operations); Regulatory
-- also dropped. Within Launch & Operations, Network Operations/Monitoring/Incident Management/
-- Optimisation dropped at leaf level (ongoing operations), keeping only the launch-project leaves.
-- Genuinely new industry — no existing registers to reconcile.
-- UUID block: 9006. Prerequisites: v931, v932, v946, v946c.
-- ============================================================================

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.menu_code, v.menu_label, v.menu_description, NULL, NULL, 1, v.sort_order, 'universal', 'radio-tower', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('tel_cat_programme', 'Telecom Programme', 'Overview of the telecom rollout programme', 1300),
  ('tel_cat_network_planning', 'Network Planning', 'Network planning activities', 1301),
  ('tel_cat_sites_towers', 'Sites & Towers', 'Site and tower rollout', 1302),
  ('tel_cat_ran', 'Radio Access Network', 'Radio access network rollout', 1303),
  ('tel_cat_core_network', 'Core Network', 'Core network rollout', 1304),
  ('tel_cat_transmission', 'Transmission', 'Transmission network rollout', 1305),
  ('tel_cat_oss_bss', 'OSS / BSS', 'OSS/BSS system implementation', 1306),
  ('tel_cat_network_testing', 'Network Testing', 'Network testing activities', 1307),
  ('tel_cat_launch_operations', 'Launch & Operations', 'Network launch activities', 1308)
) AS v(menu_code, menu_label, menu_description, sort_order)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, menu_description = EXCLUDED.menu_description,
  is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

SELECT public.grant_menu_role_group('tel_cat_%');

INSERT INTO public.local_registers (id, register_key, label, icon, description, scope_level, account_id, status_workflow, is_system_defined, is_active, created_at, updated_at)
SELECT v.id::uuid, v.register_key, v.label, 'list-checks', v.description, 'project', NULL, v.status_workflow::jsonb, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  -- Telecom Programme (5)
  ('00000000-0000-4000-9006-000000000001', 'tel_programme_overview', 'Programme Overview', 'Telecom rollout programme overview', '[{"key":"draft","label":"Draft"},{"key":"published","label":"Published"}]'),
  ('00000000-0000-4000-9006-000000000002', 'tel_network_roadmap', 'Network Roadmap', 'Network rollout roadmap', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9006-000000000003', 'tel_service_roadmap', 'Service Roadmap', 'Service rollout roadmap', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9006-000000000004', 'tel_regions', 'Regions', 'Rollout regions register', '[{"key":"planned","label":"Planned"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-9006-000000000005', 'tel_rollout_milestones', 'Rollout Milestones', 'Rollout programme milestones', '[{"key":"upcoming","label":"Upcoming"},{"key":"met","label":"Met"},{"key":"missed","label":"Missed"}]'),
  -- Network Planning (6)
  ('00000000-0000-4000-9006-000000000006', 'tel_coverage_plan', 'Coverage Plan', 'Network coverage plan', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9006-000000000007', 'tel_capacity_plan', 'Capacity Plan', 'Network capacity plan', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9006-000000000008', 'tel_spectrum_requirements', 'Spectrum Requirements', 'Spectrum requirement register', '[{"key":"identified","label":"Identified"},{"key":"secured","label":"Secured"}]'),
  ('00000000-0000-4000-9006-000000000009', 'tel_technology_selection', 'Technology Selection', 'Network technology selection register', '[{"key":"under_evaluation","label":"Under Evaluation"},{"key":"selected","label":"Selected"}]'),
  ('00000000-0000-4000-9006-00000000000a', 'tel_site_plan', 'Site Plan', 'Network site plan', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9006-00000000000b', 'tel_network_design', 'Network Design', 'Network design deliverables', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  -- Sites & Towers (1, collapsed)
  ('00000000-0000-4000-9006-00000000000c', 'tel_site_register', 'Site Register', 'Telecom site and tower rollout register', '[{"key":"acquisition","label":"Acquisition"},{"key":"permitting","label":"Permitting"},{"key":"civil_works","label":"Civil Works"},{"key":"tower_installation","label":"Tower Installation"},{"key":"power_connection","label":"Power Connection"},{"key":"acceptance","label":"Acceptance"}]'),
  -- Radio Access Network (3, collapsed)
  ('00000000-0000-4000-9006-00000000000d', 'tel_ran_design', 'RAN Design', 'Radio access network design', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9006-00000000000e', 'tel_ran_equipment', 'RAN Equipment', 'Radio access network equipment register', '[{"key":"ordered","label":"Ordered"},{"key":"delivered","label":"Delivered"}]'),
  ('00000000-0000-4000-9006-00000000000f', 'tel_ran_rollout', 'RAN Rollout', 'RAN installation, integration and optimisation tracking', '[{"key":"installation","label":"Installation"},{"key":"integration","label":"Integration"},{"key":"optimisation","label":"Optimisation"},{"key":"acceptance","label":"Acceptance"}]'),
  -- Core Network (3, collapsed)
  ('00000000-0000-4000-9006-000000000010', 'tel_core_design', 'Core Design', 'Core network design', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9006-000000000011', 'tel_core_hardware_software', 'Core Network Hardware / Software', 'Core network hardware and software register', '[{"key":"ordered","label":"Ordered"},{"key":"delivered","label":"Delivered"}]'),
  ('00000000-0000-4000-9006-000000000012', 'tel_core_rollout', 'Core Network Rollout', 'Core network configuration, integration, testing and cutover tracking', '[{"key":"configuration","label":"Configuration"},{"key":"integration","label":"Integration"},{"key":"testing","label":"Testing"},{"key":"cutover","label":"Cutover"}]'),
  -- Transmission (1, collapsed)
  ('00000000-0000-4000-9006-000000000013', 'tel_transmission_register', 'Transmission Register', 'Fibre, microwave and backhaul transmission register', '[{"key":"planned","label":"Planned"},{"key":"installation","label":"Installation"},{"key":"testing","label":"Testing"},{"key":"complete","label":"Complete"}]'),
  -- OSS/BSS (5)
  ('00000000-0000-4000-9006-000000000014', 'tel_oss_bss_crm', 'CRM', 'CRM system implementation', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"live","label":"Live"}]'),
  ('00000000-0000-4000-9006-000000000015', 'tel_oss_bss_billing', 'Billing', 'Billing system implementation', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"live","label":"Live"}]'),
  ('00000000-0000-4000-9006-000000000016', 'tel_oss_bss_provisioning', 'Provisioning', 'Provisioning system implementation', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"live","label":"Live"}]'),
  ('00000000-0000-4000-9006-000000000017', 'tel_oss_bss_mediation', 'Mediation', 'Mediation system implementation', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"live","label":"Live"}]'),
  ('00000000-0000-4000-9006-000000000018', 'tel_oss_bss_network_management', 'Network Management', 'Network management system implementation', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"live","label":"Live"}]'),
  -- Network Testing (1, collapsed)
  ('00000000-0000-4000-9006-000000000019', 'tel_network_testing', 'Network Testing', 'Coverage, capacity, drive, performance and failover testing', '[{"key":"scheduled","label":"Scheduled"},{"key":"in_progress","label":"In Progress"},{"key":"passed","label":"Passed"},{"key":"failed","label":"Failed"}]'),
  -- Launch & Operations (3, Network Operations/Monitoring/Incident Management/Optimisation dropped)
  ('00000000-0000-4000-9006-00000000001a', 'tel_launch_plan', 'Launch Plan', 'Network launch plan', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9006-00000000001b', 'tel_commercial_readiness', 'Commercial Readiness', 'Commercial launch readiness tracking', '[{"key":"not_ready","label":"Not Ready"},{"key":"ready","label":"Ready"}]'),
  ('00000000-0000-4000-9006-00000000001c', 'tel_customer_readiness', 'Customer Readiness', 'Customer launch readiness tracking', '[{"key":"not_ready","label":"Not Ready"},{"key":"ready","label":"Ready"}]')
) AS v(id, register_key, label, description, status_workflow)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, status_workflow = EXCLUDED.status_workflow,
  is_active = TRUE, updated_at = NOW();

INSERT INTO public.local_register_industry_packs (register_id, industry_pack_id)
SELECT lr.id, ip.id
FROM public.local_registers lr
JOIN public.industry_packs ip ON ip.industry_category_id = (SELECT id FROM public.industry_categories WHERE name = 'Telecommunications')
WHERE lr.id::text LIKE '00000000-0000-4000-9006-%'
ON CONFLICT (register_id, industry_pack_id) DO NOTHING;

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), 'tel_reg_' || lr.register_key, lr.label, lr.description, '/platform/local-registers/' || lr.id::text,
  (SELECT id FROM public.menu_items WHERE menu_code = v.category_code AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
  2, v.sort_order, 'universal', 'list-checks', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('00000000-0000-4000-9006-000000000001','tel_cat_programme',1310),('00000000-0000-4000-9006-000000000002','tel_cat_programme',1311),
  ('00000000-0000-4000-9006-000000000003','tel_cat_programme',1312),('00000000-0000-4000-9006-000000000004','tel_cat_programme',1313),
  ('00000000-0000-4000-9006-000000000005','tel_cat_programme',1314),
  ('00000000-0000-4000-9006-000000000006','tel_cat_network_planning',1320),('00000000-0000-4000-9006-000000000007','tel_cat_network_planning',1321),
  ('00000000-0000-4000-9006-000000000008','tel_cat_network_planning',1322),('00000000-0000-4000-9006-000000000009','tel_cat_network_planning',1323),
  ('00000000-0000-4000-9006-00000000000a','tel_cat_network_planning',1324),('00000000-0000-4000-9006-00000000000b','tel_cat_network_planning',1325),
  ('00000000-0000-4000-9006-00000000000c','tel_cat_sites_towers',1330),
  ('00000000-0000-4000-9006-00000000000d','tel_cat_ran',1340),('00000000-0000-4000-9006-00000000000e','tel_cat_ran',1341),
  ('00000000-0000-4000-9006-00000000000f','tel_cat_ran',1342),
  ('00000000-0000-4000-9006-000000000010','tel_cat_core_network',1350),('00000000-0000-4000-9006-000000000011','tel_cat_core_network',1351),
  ('00000000-0000-4000-9006-000000000012','tel_cat_core_network',1352),
  ('00000000-0000-4000-9006-000000000013','tel_cat_transmission',1360),
  ('00000000-0000-4000-9006-000000000014','tel_cat_oss_bss',1370),('00000000-0000-4000-9006-000000000015','tel_cat_oss_bss',1371),
  ('00000000-0000-4000-9006-000000000016','tel_cat_oss_bss',1372),('00000000-0000-4000-9006-000000000017','tel_cat_oss_bss',1373),
  ('00000000-0000-4000-9006-000000000018','tel_cat_oss_bss',1374),
  ('00000000-0000-4000-9006-000000000019','tel_cat_network_testing',1380),
  ('00000000-0000-4000-9006-00000000001a','tel_cat_launch_operations',1390),('00000000-0000-4000-9006-00000000001b','tel_cat_launch_operations',1391),
  ('00000000-0000-4000-9006-00000000001c','tel_cat_launch_operations',1392)
) AS v(register_id, category_code, sort_order)
JOIN public.local_registers lr ON lr.id = v.register_id::uuid
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, route_path = EXCLUDED.route_path, parent_menu_id = EXCLUDED.parent_menu_id,
  sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

SELECT public.grant_menu_role_group('tel_reg_%');

INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
SELECT DISTINCT lrip.industry_pack_id, mi.id
FROM public.local_register_industry_packs lrip
JOIN public.local_registers lr ON lr.id = lrip.register_id
JOIN public.menu_items mi ON mi.route_path = '/platform/local-registers/' || lr.id::text
WHERE lr.id::text LIKE '00000000-0000-4000-9006-%' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

DO $$
DECLARE v_registers INT;
BEGIN
  SELECT COUNT(*) INTO v_registers FROM public.local_registers WHERE id::text LIKE '00000000-0000-4000-9006-%';
  RAISE NOTICE 'v952: TEL phase complete — % registers across 9 categories', v_registers;
END $$;

-- ============================================================================
-- v953: Industry Capability Content Taxonomy — Phase 8 (ENR: Energy & Utilities)
-- ============================================================================
-- projectplan/v946_industry_capability_content_taxonomy_plan.md Phase 8.
-- Source: Documentation/Core_PM_and_Industry_Menu_Taxonomy.md Section 10, filtered through PRD
-- decision 0. 10 of 11 categories kept (Regulatory & Environmental dropped — ongoing compliance).
-- No collision: the 3 existing registers (Asset/Infrastructure Register, Outage Management,
-- Environmental Impact Assessments) belong to different concepts than the collapsed registers
-- below (project-phase tracking, not the same leaf).
-- UUID block: 9007. Prerequisites: v931, v932, v946, v946c.
-- ============================================================================

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.menu_code, v.menu_label, v.menu_description, NULL, NULL, 1, v.sort_order, 'universal', 'zap', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('enr_cat_programme', 'Energy / Utility Programme', 'Overview of the energy/utility programme', 1400),
  ('enr_cat_generation', 'Generation / Production', 'Generation and production asset delivery', 1401),
  ('enr_cat_transmission', 'Transmission', 'Transmission asset delivery', 1402),
  ('enr_cat_distribution', 'Distribution', 'Distribution network delivery', 1403),
  ('enr_cat_utility_assets', 'Utility Assets', 'Utility asset delivery', 1404),
  ('enr_cat_metering', 'Metering', 'Metering rollout', 1405),
  ('enr_cat_grid_integration', 'Grid / Network Integration', 'Grid and network integration activities', 1406),
  ('enr_cat_hse', 'Health, Safety & Environment', 'Project health, safety and environment activities', 1407),
  ('enr_cat_outages_cutovers', 'Outages & Cutovers', 'Planned outage and cutover activities', 1408),
  ('enr_cat_operations_readiness', 'Operations Readiness', 'Operations readiness activities', 1409)
) AS v(menu_code, menu_label, menu_description, sort_order)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, menu_description = EXCLUDED.menu_description,
  is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

SELECT public.grant_menu_role_group('enr_cat_%');

INSERT INTO public.local_registers (id, register_key, label, icon, description, scope_level, account_id, status_workflow, is_system_defined, is_active, created_at, updated_at)
SELECT v.id::uuid, v.register_key, v.label, 'list-checks', v.description, 'project', NULL, v.status_workflow::jsonb, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  -- Energy/Utility Programme (5)
  ('00000000-0000-4000-9007-000000000001', 'enr_programme_overview', 'Programme Overview', 'Energy/utility programme overview', '[{"key":"draft","label":"Draft"},{"key":"published","label":"Published"}]'),
  ('00000000-0000-4000-9007-000000000002', 'enr_assets', 'Assets', 'Programme asset register', '[{"key":"planned","label":"Planned"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-9007-000000000003', 'enr_service_areas', 'Service Areas', 'Service area register', '[{"key":"planned","label":"Planned"},{"key":"active","label":"Active"}]'),
  ('00000000-0000-4000-9007-000000000004', 'enr_regulatory_milestones', 'Regulatory Milestones', 'Programme regulatory milestones', '[{"key":"upcoming","label":"Upcoming"},{"key":"met","label":"Met"},{"key":"missed","label":"Missed"}]'),
  ('00000000-0000-4000-9007-000000000005', 'enr_delivery_workstreams', 'Delivery Workstreams', 'Programme delivery workstreams', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'),
  -- Generation / Production (2, collapsed)
  ('00000000-0000-4000-9007-000000000006', 'enr_generation_assets', 'Generation Assets', 'Generation asset register', '[{"key":"planned","label":"Planned"},{"key":"operational","label":"Operational"}]'),
  ('00000000-0000-4000-9007-000000000007', 'enr_generation_project', 'Generation Project', 'Generation plant design, construction and commissioning tracking', '[{"key":"plant_design","label":"Plant Design"},{"key":"construction","label":"Construction"},{"key":"commissioning","label":"Commissioning"},{"key":"operational_readiness","label":"Operational Readiness"}]'),
  -- Transmission (1, collapsed)
  ('00000000-0000-4000-9007-000000000008', 'enr_transmission_assets', 'Transmission Assets', 'Substation, line and route delivery register', '[{"key":"design","label":"Design"},{"key":"construction","label":"Construction"},{"key":"testing","label":"Testing"},{"key":"energisation","label":"Energisation"}]'),
  -- Distribution (3, collapsed)
  ('00000000-0000-4000-9007-000000000009', 'enr_distribution_assets', 'Distribution Assets', 'Feeder and transformer delivery register', '[{"key":"planned","label":"Planned"},{"key":"installed","label":"Installed"},{"key":"energised","label":"Energised"}]'),
  ('00000000-0000-4000-9007-00000000000a', 'enr_connections', 'Connections', 'Customer connection register', '[{"key":"applied","label":"Applied"},{"key":"connected","label":"Connected"}]'),
  ('00000000-0000-4000-9007-00000000000b', 'enr_network_expansion', 'Network Expansion', 'Network expansion project register', '[{"key":"planned","label":"Planned"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'),
  -- Utility Assets (1, collapsed)
  ('00000000-0000-4000-9007-00000000000c', 'enr_asset_register', 'Asset Register', 'Utility asset installation and handover register', '[{"key":"installation","label":"Installation"},{"key":"replacement","label":"Replacement"},{"key":"handover","label":"Handover"}]'),
  -- Metering (2, collapsed)
  ('00000000-0000-4000-9007-00000000000d', 'enr_metering_strategy', 'Metering Strategy', 'Metering strategy', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9007-00000000000e', 'enr_meter_rollout', 'Meter Rollout', 'Meter register, installation and testing tracking', '[{"key":"registered","label":"Registered"},{"key":"installation","label":"Installation"},{"key":"testing","label":"Testing"},{"key":"live","label":"Live"}]'),
  -- Grid / Network Integration (3)
  ('00000000-0000-4000-9007-00000000000f', 'enr_connection_applications', 'Connection Applications', 'Grid connection application register', '[{"key":"submitted","label":"Submitted"},{"key":"under_review","label":"Under Review"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9007-000000000010', 'enr_grid_studies', 'Studies', 'Grid integration study register', '[{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-9007-000000000011', 'enr_protection_scada', 'Protection & SCADA', 'Protection and SCADA implementation tracking', '[{"key":"design","label":"Design"},{"key":"implementation","label":"Implementation"},{"key":"testing","label":"Testing"},{"key":"approved","label":"Approved"}]'),
  -- Health, Safety & Environment (5)
  ('00000000-0000-4000-9007-000000000012', 'enr_hse_plan', 'HSE Plan', 'Health, safety and environment plan', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9007-000000000013', 'enr_permit_to_work', 'Permit to Work', 'Permit to work register', '[{"key":"issued","label":"Issued"},{"key":"closed","label":"Closed"}]'),
  ('00000000-0000-4000-9007-000000000014', 'enr_safety_risks', 'Safety Risks', 'Safety risk register', '[{"key":"open","label":"Open"},{"key":"mitigated","label":"Mitigated"}]'),
  ('00000000-0000-4000-9007-000000000015', 'enr_hse_incidents', 'Incidents', 'HSE incident register', '[{"key":"open","label":"Open"},{"key":"under_investigation","label":"Under Investigation"},{"key":"closed","label":"Closed"}]'),
  ('00000000-0000-4000-9007-000000000016', 'enr_hse_corrective_actions', 'Corrective Actions', 'HSE corrective action register', '[{"key":"open","label":"Open"},{"key":"in_progress","label":"In Progress"},{"key":"closed","label":"Closed"}]'),
  -- Outages & Cutovers (2, collapsed)
  ('00000000-0000-4000-9007-000000000017', 'enr_cutover_plan', 'Cutover Plan', 'Planned outage and cutover plan', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9007-000000000018', 'enr_cutover_execution', 'Cutover Execution', 'Switching, isolation and restoration tracking', '[{"key":"switching","label":"Switching"},{"key":"isolation","label":"Isolation"},{"key":"restoration","label":"Restoration"},{"key":"review","label":"Post-Outage Review"}]'),
  -- Operations Readiness (5, Maintenance/Spares dropped as ongoing)
  ('00000000-0000-4000-9007-000000000019', 'enr_control_centre', 'Control Centre', 'Control centre readiness tracking', '[{"key":"not_ready","label":"Not Ready"},{"key":"ready","label":"Ready"}]'),
  ('00000000-0000-4000-9007-00000000001a', 'enr_operations_training', 'Training', 'Operations readiness training', '[{"key":"planned","label":"Planned"},{"key":"delivered","label":"Delivered"}]'),
  ('00000000-0000-4000-9007-00000000001b', 'enr_emergency_response', 'Emergency Response', 'Emergency response plan', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9007-00000000001c', 'enr_business_continuity', 'Business Continuity', 'Business continuity plan', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9007-00000000001d', 'enr_operations_handover', 'Handover', 'Operations handover checklist', '[{"key":"open","label":"Open"},{"key":"closed","label":"Closed"}]')
) AS v(id, register_key, label, description, status_workflow)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, status_workflow = EXCLUDED.status_workflow,
  is_active = TRUE, updated_at = NOW();

INSERT INTO public.local_register_industry_packs (register_id, industry_pack_id)
SELECT lr.id, ip.id
FROM public.local_registers lr
JOIN public.industry_packs ip ON ip.industry_category_id = (SELECT id FROM public.industry_categories WHERE name = 'Energy & Utilities')
WHERE lr.id::text LIKE '00000000-0000-4000-9007-%'
ON CONFLICT (register_id, industry_pack_id) DO NOTHING;

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), 'enr_reg_' || lr.register_key, lr.label, lr.description, '/platform/local-registers/' || lr.id::text,
  (SELECT id FROM public.menu_items WHERE menu_code = v.category_code AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
  2, v.sort_order, 'universal', 'list-checks', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('00000000-0000-4000-9007-000000000001','enr_cat_programme',1410),('00000000-0000-4000-9007-000000000002','enr_cat_programme',1411),
  ('00000000-0000-4000-9007-000000000003','enr_cat_programme',1412),('00000000-0000-4000-9007-000000000004','enr_cat_programme',1413),
  ('00000000-0000-4000-9007-000000000005','enr_cat_programme',1414),
  ('00000000-0000-4000-9007-000000000006','enr_cat_generation',1420),('00000000-0000-4000-9007-000000000007','enr_cat_generation',1421),
  ('00000000-0000-4000-9007-000000000008','enr_cat_transmission',1430),
  ('00000000-0000-4000-9007-000000000009','enr_cat_distribution',1440),('00000000-0000-4000-9007-00000000000a','enr_cat_distribution',1441),
  ('00000000-0000-4000-9007-00000000000b','enr_cat_distribution',1442),
  ('00000000-0000-4000-9007-00000000000c','enr_cat_utility_assets',1450),
  ('00000000-0000-4000-9007-00000000000d','enr_cat_metering',1460),('00000000-0000-4000-9007-00000000000e','enr_cat_metering',1461),
  ('00000000-0000-4000-9007-00000000000f','enr_cat_grid_integration',1470),('00000000-0000-4000-9007-000000000010','enr_cat_grid_integration',1471),
  ('00000000-0000-4000-9007-000000000011','enr_cat_grid_integration',1472),
  ('00000000-0000-4000-9007-000000000012','enr_cat_hse',1480),('00000000-0000-4000-9007-000000000013','enr_cat_hse',1481),
  ('00000000-0000-4000-9007-000000000014','enr_cat_hse',1482),('00000000-0000-4000-9007-000000000015','enr_cat_hse',1483),
  ('00000000-0000-4000-9007-000000000016','enr_cat_hse',1484),
  ('00000000-0000-4000-9007-000000000017','enr_cat_outages_cutovers',1490),('00000000-0000-4000-9007-000000000018','enr_cat_outages_cutovers',1491),
  ('00000000-0000-4000-9007-000000000019','enr_cat_operations_readiness',1500),('00000000-0000-4000-9007-00000000001a','enr_cat_operations_readiness',1501),
  ('00000000-0000-4000-9007-00000000001b','enr_cat_operations_readiness',1502),('00000000-0000-4000-9007-00000000001c','enr_cat_operations_readiness',1503),
  ('00000000-0000-4000-9007-00000000001d','enr_cat_operations_readiness',1504)
) AS v(register_id, category_code, sort_order)
JOIN public.local_registers lr ON lr.id = v.register_id::uuid
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, route_path = EXCLUDED.route_path, parent_menu_id = EXCLUDED.parent_menu_id,
  sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

SELECT public.grant_menu_role_group('enr_reg_%');

INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
SELECT DISTINCT lrip.industry_pack_id, mi.id
FROM public.local_register_industry_packs lrip
JOIN public.local_registers lr ON lr.id = lrip.register_id
JOIN public.menu_items mi ON mi.route_path = '/platform/local-registers/' || lr.id::text
WHERE lr.id::text LIKE '00000000-0000-4000-9007-%' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

DO $$
DECLARE v_registers INT;
BEGIN
  SELECT COUNT(*) INTO v_registers FROM public.local_registers WHERE id::text LIKE '00000000-0000-4000-9007-%';
  RAISE NOTICE 'v953: ENR phase complete — % registers across 10 categories', v_registers;
END $$;

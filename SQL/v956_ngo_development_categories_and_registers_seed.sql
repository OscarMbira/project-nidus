-- ============================================================================
-- v956: Industry Capability Content Taxonomy — Phase 11 (NGO: NGO / Development)
-- ============================================================================
-- projectplan/v946_industry_capability_content_taxonomy_plan.md Phase 11.
-- Source: Documentation/Core_PM_and_Industry_Menu_Taxonomy.md Section 13, filtered through PRD
-- decision 0. 8 of 10 categories kept (Beneficiaries, Safeguarding, Compliance dropped — ongoing
-- case management/compliance). Genuinely new industry — no existing registers to reconcile.
-- UUID block: 900a. Prerequisites: v931, v932, v946, v946c.
-- ============================================================================

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.menu_code, v.menu_label, v.menu_description, NULL, NULL, 1, v.sort_order, 'universal', 'globe', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('ngo_cat_programme', 'Development Programme', 'Overview of the development programme', 1800),
  ('ngo_cat_donor_management', 'Donor Management', 'Donor management activities', 1801),
  ('ngo_cat_grants', 'Grants', 'Grant management activities', 1802),
  ('ngo_cat_field_operations', 'Field Operations', 'Field operations activities', 1803),
  ('ngo_cat_logical_framework', 'Logical Framework', 'Programme logical framework', 1804),
  ('ngo_cat_monitoring_evaluation', 'Monitoring & Evaluation', 'Monitoring and evaluation activities', 1805),
  ('ngo_cat_partners', 'Partners', 'Implementing partner management', 1806),
  ('ngo_cat_impact_learning', 'Impact & Learning', 'Impact assessment and programme closeout', 1807)
) AS v(menu_code, menu_label, menu_description, sort_order)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, menu_description = EXCLUDED.menu_description,
  is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

SELECT public.grant_menu_role_group('ngo_cat_%');

INSERT INTO public.local_registers (id, register_key, label, icon, description, scope_level, account_id, status_workflow, is_system_defined, is_active, created_at, updated_at)
SELECT v.id::uuid, v.register_key, v.label, 'list-checks', v.description, 'project', NULL, v.status_workflow::jsonb, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  -- Development Programme (5)
  ('00000000-0000-4000-900a-000000000001', 'ngo_programme_overview', 'Programme Overview', 'Development programme overview', '[{"key":"draft","label":"Draft"},{"key":"published","label":"Published"}]'),
  ('00000000-0000-4000-900a-000000000002', 'ngo_countries_regions', 'Countries / Regions', 'Countries/regions register', '[{"key":"active","label":"Active"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-900a-000000000003', 'ngo_communities', 'Communities', 'Community register', '[{"key":"engaged","label":"Engaged"},{"key":"active","label":"Active"}]'),
  ('00000000-0000-4000-900a-000000000004', 'ngo_thematic_areas', 'Thematic Areas', 'Thematic area register', '[{"key":"active","label":"Active"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-900a-000000000005', 'ngo_programme_milestones', 'Programme Milestones', 'Programme milestones', '[{"key":"upcoming","label":"Upcoming"},{"key":"met","label":"Met"},{"key":"missed","label":"Missed"}]'),
  -- Donor Management (2, collapsed)
  ('00000000-0000-4000-900a-000000000006', 'ngo_donor_register', 'Donor Register', 'Donor register', '[{"key":"engaged","label":"Engaged"},{"key":"active","label":"Active"}]'),
  ('00000000-0000-4000-900a-000000000007', 'ngo_funding_agreements', 'Funding Agreements', 'Funding agreement, grant condition and reporting tracking', '[{"key":"negotiation","label":"Negotiation"},{"key":"active","label":"Active"},{"key":"reporting","label":"Reporting"},{"key":"closed","label":"Closed"}]'),
  -- Grants (1, collapsed)
  ('00000000-0000-4000-900a-000000000008', 'ngo_grant_register', 'Grant Register', 'Grant application, award, budget and disbursement tracking', '[{"key":"application","label":"Application"},{"key":"awarded","label":"Awarded"},{"key":"disbursement","label":"Disbursement"},{"key":"closeout","label":"Closeout"}]'),
  -- Field Operations (4)
  ('00000000-0000-4000-900a-000000000009', 'ngo_field_offices', 'Field Offices', 'Field office register', '[{"key":"active","label":"Active"},{"key":"closed","label":"Closed"}]'),
  ('00000000-0000-4000-900a-00000000000a', 'ngo_field_teams', 'Field Teams', 'Field team register', '[{"key":"deployed","label":"Deployed"},{"key":"stood_down","label":"Stood Down"}]'),
  ('00000000-0000-4000-900a-00000000000b', 'ngo_activity_plans', 'Activity Plans', 'Field activity plan register', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-900a-00000000000c', 'ngo_missions', 'Missions', 'Field mission register (including logistics)', '[{"key":"planned","label":"Planned"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'),
  -- Logical Framework (1, collapsed)
  ('00000000-0000-4000-900a-00000000000d', 'ngo_logical_framework', 'Logical Framework', 'Programme logical framework (impact, outcomes, outputs, activities, indicators)', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  -- Monitoring & Evaluation (2, collapsed)
  ('00000000-0000-4000-900a-00000000000e', 'ngo_results_framework', 'Results Framework', 'Results framework register', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-900a-00000000000f', 'ngo_me_tracking', 'M&E Tracking', 'Baseline, targets, data collection and results tracking', '[{"key":"baseline","label":"Baseline"},{"key":"targets_set","label":"Targets Set"},{"key":"data_collection","label":"Data Collection"},{"key":"results","label":"Results"},{"key":"evaluated","label":"Evaluated"}]'),
  -- Partners (1, collapsed)
  ('00000000-0000-4000-900a-000000000010', 'ngo_partner_register', 'Partner Register', 'Partner due diligence, agreement and performance tracking', '[{"key":"due_diligence","label":"Due Diligence"},{"key":"agreement","label":"Agreement"},{"key":"active","label":"Active"},{"key":"closeout","label":"Closeout"}]'),
  -- Impact & Learning (2, collapsed)
  ('00000000-0000-4000-900a-000000000011', 'ngo_impact_assessment', 'Impact Assessment', 'Impact assessment register', '[{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-900a-000000000012', 'ngo_programme_closeout', 'Programme Closeout', 'Programme closeout checklist', '[{"key":"open","label":"Open"},{"key":"closed","label":"Closed"}]')
) AS v(id, register_key, label, description, status_workflow)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, status_workflow = EXCLUDED.status_workflow,
  is_active = TRUE, updated_at = NOW();

INSERT INTO public.local_register_industry_packs (register_id, industry_pack_id)
SELECT lr.id, ip.id
FROM public.local_registers lr
JOIN public.industry_packs ip ON ip.industry_category_id = (SELECT id FROM public.industry_categories WHERE name = 'NGO / Development')
WHERE lr.id::text LIKE '00000000-0000-4000-900a-%'
ON CONFLICT (register_id, industry_pack_id) DO NOTHING;

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), 'ngo_reg_' || lr.register_key, lr.label, lr.description, '/platform/local-registers/' || lr.id::text,
  (SELECT id FROM public.menu_items WHERE menu_code = v.category_code AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
  2, v.sort_order, 'universal', 'list-checks', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('00000000-0000-4000-900a-000000000001','ngo_cat_programme',1810),('00000000-0000-4000-900a-000000000002','ngo_cat_programme',1811),
  ('00000000-0000-4000-900a-000000000003','ngo_cat_programme',1812),('00000000-0000-4000-900a-000000000004','ngo_cat_programme',1813),
  ('00000000-0000-4000-900a-000000000005','ngo_cat_programme',1814),
  ('00000000-0000-4000-900a-000000000006','ngo_cat_donor_management',1820),('00000000-0000-4000-900a-000000000007','ngo_cat_donor_management',1821),
  ('00000000-0000-4000-900a-000000000008','ngo_cat_grants',1830),
  ('00000000-0000-4000-900a-000000000009','ngo_cat_field_operations',1840),('00000000-0000-4000-900a-00000000000a','ngo_cat_field_operations',1841),
  ('00000000-0000-4000-900a-00000000000b','ngo_cat_field_operations',1842),('00000000-0000-4000-900a-00000000000c','ngo_cat_field_operations',1843),
  ('00000000-0000-4000-900a-00000000000d','ngo_cat_logical_framework',1850),
  ('00000000-0000-4000-900a-00000000000e','ngo_cat_monitoring_evaluation',1860),('00000000-0000-4000-900a-00000000000f','ngo_cat_monitoring_evaluation',1861),
  ('00000000-0000-4000-900a-000000000010','ngo_cat_partners',1870),
  ('00000000-0000-4000-900a-000000000011','ngo_cat_impact_learning',1880),('00000000-0000-4000-900a-000000000012','ngo_cat_impact_learning',1881)
) AS v(register_id, category_code, sort_order)
JOIN public.local_registers lr ON lr.id = v.register_id::uuid
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, route_path = EXCLUDED.route_path, parent_menu_id = EXCLUDED.parent_menu_id,
  sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

SELECT public.grant_menu_role_group('ngo_reg_%');

INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
SELECT DISTINCT lrip.industry_pack_id, mi.id
FROM public.local_register_industry_packs lrip
JOIN public.local_registers lr ON lr.id = lrip.register_id
JOIN public.menu_items mi ON mi.route_path = '/platform/local-registers/' || lr.id::text
WHERE lr.id::text LIKE '00000000-0000-4000-900a-%' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

DO $$
DECLARE v_registers INT;
BEGIN
  SELECT COUNT(*) INTO v_registers FROM public.local_registers WHERE id::text LIKE '00000000-0000-4000-900a-%';
  RAISE NOTICE 'v956: NGO phase complete — % registers across 8 categories', v_registers;
END $$;

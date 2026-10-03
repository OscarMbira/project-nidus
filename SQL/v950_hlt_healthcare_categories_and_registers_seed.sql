-- ============================================================================
-- v950: Industry Capability Content Taxonomy — Phase 5 (HLT: Healthcare)
-- ============================================================================
-- projectplan/v946_industry_capability_content_taxonomy_plan.md Phase 5.
-- Source: Documentation/Core_PM_and_Industry_Menu_Taxonomy.md Section 7, filtered through PRD
-- decision 0. 6 of 10 categories kept (Regulatory Compliance, Patient Safety, Clinical Systems,
-- Data Privacy, Quality & Clinical Governance dropped — ongoing clinical/compliance operations).
--
-- No collision risk: the 4 existing registers for this industry (Clinical Trials, Regulatory
-- Submissions, Patient Safety Events, Clinical Site Activation, from v933) belong to the DROPPED
-- categories, not the 6 kept here — left untouched, already correctly pack-linked.
--
-- UUID block: 9004. Prerequisites: v931, v932, v946, v946c.
-- ============================================================================

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.menu_code, v.menu_label, v.menu_description, NULL, NULL, 1, v.sort_order, 'universal', 'heart-pulse', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('hlt_cat_projects', 'Healthcare Projects', 'Overview of healthcare projects', 1100),
  ('hlt_cat_clinical_readiness', 'Clinical Readiness', 'Clinical readiness activities', 1101),
  ('hlt_cat_facilities_equipment', 'Facilities & Equipment', 'Healthcare facilities and equipment delivery', 1102),
  ('hlt_cat_workforce_readiness', 'Workforce Readiness', 'Healthcare workforce readiness activities', 1103),
  ('hlt_cat_accreditation', 'Accreditation', 'Accreditation preparation activities', 1104),
  ('hlt_cat_operational_readiness', 'Operational Readiness', 'Healthcare operational readiness activities', 1105)
) AS v(menu_code, menu_label, menu_description, sort_order)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, menu_description = EXCLUDED.menu_description,
  is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

SELECT public.grant_menu_role_group('hlt_cat_%');

INSERT INTO public.local_registers (id, register_key, label, icon, description, scope_level, account_id, status_workflow, is_system_defined, is_active, created_at, updated_at)
SELECT v.id::uuid, v.register_key, v.label, 'list-checks', v.description, 'project', NULL, v.status_workflow::jsonb, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  -- Healthcare Projects (5)
  ('00000000-0000-4000-9004-000000000001', 'hlt_project_overview', 'Project Overview', 'Healthcare project overview', '[{"key":"draft","label":"Draft"},{"key":"published","label":"Published"}]'),
  ('00000000-0000-4000-9004-000000000002', 'hlt_clinical_workstreams', 'Clinical Workstreams', 'Clinical workstreams', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-9004-000000000003', 'hlt_operational_workstreams', 'Operational Workstreams', 'Operational workstreams', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-9004-000000000004', 'hlt_technology_workstreams', 'Technology Workstreams', 'Technology workstreams', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-9004-000000000005', 'hlt_healthcare_milestones', 'Healthcare Milestones', 'Healthcare project milestones', '[{"key":"upcoming","label":"Upcoming"},{"key":"met","label":"Met"},{"key":"missed","label":"Missed"}]'),
  -- Clinical Readiness (5, Sign-Off folded into status)
  ('00000000-0000-4000-9004-000000000006', 'hlt_clinical_requirements', 'Clinical Requirements', 'Clinical requirements register', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9004-000000000007', 'hlt_clinical_workflows', 'Clinical Workflows', 'Clinical workflow register', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9004-000000000008', 'hlt_clinical_stakeholders', 'Clinical Stakeholders', 'Clinical stakeholder register', '[{"key":"identified","label":"Identified"},{"key":"engaged","label":"Engaged"}]'),
  ('00000000-0000-4000-9004-000000000009', 'hlt_clinical_validation', 'Clinical Validation', 'Clinical validation records', '[{"key":"pending","label":"Pending"},{"key":"validated","label":"Validated"},{"key":"signed_off","label":"Signed Off"}]'),
  ('00000000-0000-4000-9004-00000000000a', 'hlt_clinical_training', 'Clinical Training', 'Clinical training records', '[{"key":"planned","label":"Planned"},{"key":"delivered","label":"Delivered"}]'),
  -- Facilities & Equipment (2, collapsed)
  ('00000000-0000-4000-9004-00000000000b', 'hlt_facility_readiness', 'Facility Readiness', 'Facility readiness tracking', '[{"key":"not_ready","label":"Not Ready"},{"key":"ready","label":"Ready"}]'),
  ('00000000-0000-4000-9004-00000000000c', 'hlt_medical_equipment', 'Medical Equipment', 'Medical equipment installation, calibration and validation', '[{"key":"installation","label":"Installation"},{"key":"calibration","label":"Calibration"},{"key":"validation","label":"Validation"},{"key":"handover","label":"Handover"}]'),
  -- Workforce Readiness (3, collapsed)
  ('00000000-0000-4000-9004-00000000000d', 'hlt_staffing_requirements', 'Staffing Requirements', 'Healthcare staffing requirements', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9004-00000000000e', 'hlt_workforce_readiness_tracking', 'Workforce Readiness Tracking', 'Recruitment, credentialing, training and competency tracking', '[{"key":"recruitment","label":"Recruitment"},{"key":"credentialing","label":"Credentialing"},{"key":"training","label":"Training"},{"key":"competency_assessed","label":"Competency Assessed"},{"key":"ready","label":"Ready"}]'),
  ('00000000-0000-4000-9004-00000000000f', 'hlt_roster_readiness', 'Roster Readiness', 'Roster readiness tracking', '[{"key":"not_ready","label":"Not Ready"},{"key":"ready","label":"Ready"}]'),
  -- Accreditation (1, collapsed)
  ('00000000-0000-4000-9004-000000000010', 'hlt_accreditation_preparation', 'Accreditation Preparation', 'Accreditation gap assessment, evidence and mock assessment tracking', '[{"key":"gap_assessment","label":"Gap Assessment"},{"key":"evidence_gathering","label":"Evidence Gathering"},{"key":"corrective_actions","label":"Corrective Actions"},{"key":"mock_assessment","label":"Mock Assessment"},{"key":"outcome","label":"Outcome"}]'),
  -- Operational Readiness (6)
  ('00000000-0000-4000-9004-000000000011', 'hlt_sops', 'SOPs', 'Standard operating procedures', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"},{"key":"published","label":"Published"}]'),
  ('00000000-0000-4000-9004-000000000012', 'hlt_patient_journey', 'Patient Journey', 'Patient journey mapping', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9004-000000000013', 'hlt_business_continuity', 'Business Continuity', 'Business continuity plan', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9004-000000000014', 'hlt_emergency_readiness', 'Emergency Readiness', 'Emergency readiness tracking', '[{"key":"not_ready","label":"Not Ready"},{"key":"ready","label":"Ready"}]'),
  ('00000000-0000-4000-9004-000000000015', 'hlt_support_model', 'Support Model', 'Post go-live support model', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9004-000000000016', 'hlt_go_live_readiness', 'Go-Live Readiness', 'Go-live readiness tracking', '[{"key":"not_ready","label":"Not Ready"},{"key":"ready","label":"Ready"}]')
) AS v(id, register_key, label, description, status_workflow)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, status_workflow = EXCLUDED.status_workflow,
  is_active = TRUE, updated_at = NOW();

INSERT INTO public.local_register_industry_packs (register_id, industry_pack_id)
SELECT lr.id, ip.id
FROM public.local_registers lr
JOIN public.industry_packs ip ON ip.industry_category_id = (SELECT id FROM public.industry_categories WHERE name = 'Healthcare')
WHERE lr.id::text LIKE '00000000-0000-4000-9004-%'
ON CONFLICT (register_id, industry_pack_id) DO NOTHING;

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), 'hlt_reg_' || lr.register_key, lr.label, lr.description, '/platform/local-registers/' || lr.id::text,
  (SELECT id FROM public.menu_items WHERE menu_code = v.category_code AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
  2, v.sort_order, 'universal', 'list-checks', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('00000000-0000-4000-9004-000000000001','hlt_cat_projects',1110),('00000000-0000-4000-9004-000000000002','hlt_cat_projects',1111),
  ('00000000-0000-4000-9004-000000000003','hlt_cat_projects',1112),('00000000-0000-4000-9004-000000000004','hlt_cat_projects',1113),
  ('00000000-0000-4000-9004-000000000005','hlt_cat_projects',1114),
  ('00000000-0000-4000-9004-000000000006','hlt_cat_clinical_readiness',1120),('00000000-0000-4000-9004-000000000007','hlt_cat_clinical_readiness',1121),
  ('00000000-0000-4000-9004-000000000008','hlt_cat_clinical_readiness',1122),('00000000-0000-4000-9004-000000000009','hlt_cat_clinical_readiness',1123),
  ('00000000-0000-4000-9004-00000000000a','hlt_cat_clinical_readiness',1124),
  ('00000000-0000-4000-9004-00000000000b','hlt_cat_facilities_equipment',1130),('00000000-0000-4000-9004-00000000000c','hlt_cat_facilities_equipment',1131),
  ('00000000-0000-4000-9004-00000000000d','hlt_cat_workforce_readiness',1140),('00000000-0000-4000-9004-00000000000e','hlt_cat_workforce_readiness',1141),
  ('00000000-0000-4000-9004-00000000000f','hlt_cat_workforce_readiness',1142),
  ('00000000-0000-4000-9004-000000000010','hlt_cat_accreditation',1150),
  ('00000000-0000-4000-9004-000000000011','hlt_cat_operational_readiness',1160),('00000000-0000-4000-9004-000000000012','hlt_cat_operational_readiness',1161),
  ('00000000-0000-4000-9004-000000000013','hlt_cat_operational_readiness',1162),('00000000-0000-4000-9004-000000000014','hlt_cat_operational_readiness',1163),
  ('00000000-0000-4000-9004-000000000015','hlt_cat_operational_readiness',1164),('00000000-0000-4000-9004-000000000016','hlt_cat_operational_readiness',1165)
) AS v(register_id, category_code, sort_order)
JOIN public.local_registers lr ON lr.id = v.register_id::uuid
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, route_path = EXCLUDED.route_path, parent_menu_id = EXCLUDED.parent_menu_id,
  sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

SELECT public.grant_menu_role_group('hlt_reg_%');

INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
SELECT DISTINCT lrip.industry_pack_id, mi.id
FROM public.local_register_industry_packs lrip
JOIN public.local_registers lr ON lr.id = lrip.register_id
JOIN public.menu_items mi ON mi.route_path = '/platform/local-registers/' || lr.id::text
WHERE lr.id::text LIKE '00000000-0000-4000-9004-%' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

DO $$
DECLARE v_registers INT;
BEGIN
  SELECT COUNT(*) INTO v_registers FROM public.local_registers WHERE id::text LIKE '00000000-0000-4000-9004-%';
  RAISE NOTICE 'v950: HLT phase complete — % registers across 6 categories', v_registers;
END $$;

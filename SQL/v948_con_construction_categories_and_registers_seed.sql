-- ============================================================================
-- v948: Industry Capability Content Taxonomy — Phase 3 (CON: Construction & Engineering)
-- ============================================================================
-- projectplan/v946_industry_capability_content_taxonomy_plan.md Phase 3.
-- Source: Documentation/Core_PM_and_Industry_Menu_Taxonomy.md Section 5 — nearly the full tree
-- survives PRD decision 0's filter (construction work is inherently project-bounded).
--
-- Modelling correction applied while authoring (not just at Level-4, one level up too): several
-- of the source taxonomy's "leaf lists" are status progressions of ONE register, not separate
-- registers — e.g. RFIs' Register/New/Open/Responses/Overdue/Closed collapses to a single "RFI
-- Register" with a status_workflow, not 6 registers. Applied consistently below; see each
-- category's comment for what was collapsed/dropped/kept as a field vs a distinct register.
--
-- Reuse: 3 of the existing 28 registers already cover this industry's "X Register" leaf under
-- Sites/Materials/Permits (local_register_sites, local_register_materials, local_register_permits,
-- SQL/v933) — those leaves are NOT recreated here.
--
-- UUID block: 9002. Prerequisites: v931, v932, v946 (Construction & Engineering pack exists),
-- v946c (grant_menu_role_group() helper).
-- ============================================================================

-- ── 1. Category menu_items (17 rows) ────────────────────────────────────────────────────

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.menu_code, v.menu_label, v.menu_description, NULL, NULL, 1, v.sort_order, 'universal', 'hard-hat', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('con_cat_management', 'Construction Management', 'Overview of the construction programme', 710),
  ('con_cat_sites', 'Sites', 'Construction site management', 711),
  ('con_cat_contractors', 'Contractors', 'Main contractor management', 712),
  ('con_cat_subcontractors', 'Subcontractors', 'Subcontractor management', 713),
  ('con_cat_permits', 'Permits', 'Construction permit compliance', 714),
  ('con_cat_design_engineering', 'Design & Engineering', 'Design and engineering deliverables', 715),
  ('con_cat_rfis', 'RFIs', 'Requests for information', 716),
  ('con_cat_site_instructions', 'Site Instructions', 'Site instruction management', 717),
  ('con_cat_inspections', 'Inspections', 'Site and quality inspections', 718),
  ('con_cat_materials', 'Materials', 'Material submittals and testing', 719),
  ('con_cat_plant_equipment', 'Plant & Equipment', 'Plant and equipment management', 720),
  ('con_cat_health_safety', 'Health & Safety', 'Construction health and safety', 721),
  ('con_cat_quality_control', 'Quality Control', 'Construction quality control', 722),
  ('con_cat_progress_measurement', 'Progress Measurement', 'Construction progress measurement', 723),
  ('con_cat_commercial', 'Commercial', 'Construction commercial management', 724),
  ('con_cat_progress_certificates', 'Progress Certificates', 'Progress certification and payment', 725),
  ('con_cat_handover_commissioning', 'Handover & Commissioning', 'Handover and commissioning activities', 726)
) AS v(menu_code, menu_label, menu_description, sort_order)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, menu_description = EXCLUDED.menu_description,
  is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

SELECT public.grant_menu_role_group('con_cat_%');

-- ── 2. local_registers (67 registers, UUID block 9002) ─────────────────────────────────

INSERT INTO public.local_registers (id, register_key, label, icon, description, scope_level, account_id, status_workflow, is_system_defined, is_active, created_at, updated_at)
SELECT v.id::uuid, v.register_key, v.label, 'list-checks', v.description, 'project', NULL, v.status_workflow::jsonb, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  -- Construction Management (5)
  ('00000000-0000-4000-9002-000000000001', 'con_overview', 'Construction Overview', 'Construction programme overview', '[{"key":"draft","label":"Draft"},{"key":"published","label":"Published"}]'),
  ('00000000-0000-4000-9002-000000000002', 'con_project_sites', 'Project Sites', 'Project sites in scope', '[{"key":"active","label":"Active"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-9002-000000000003', 'con_construction_packages', 'Construction Packages', 'Construction work packages', '[{"key":"planned","label":"Planned"},{"key":"awarded","label":"Awarded"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-9002-000000000004', 'con_workfronts', 'Workfronts', 'Active construction workfronts', '[{"key":"open","label":"Open"},{"key":"closed","label":"Closed"}]'),
  ('00000000-0000-4000-9002-000000000005', 'con_construction_milestones', 'Construction Milestones', 'Construction programme milestones', '[{"key":"upcoming","label":"Upcoming"},{"key":"met","label":"Met"},{"key":"missed","label":"Missed"}]'),
  -- Sites (7 — Site Register reused from existing local_register_sites)
  ('00000000-0000-4000-9002-000000000006', 'con_site_setup', 'Site Setup', 'Site setup activities', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-9002-000000000007', 'con_site_access', 'Site Access', 'Site access arrangements', '[{"key":"pending","label":"Pending"},{"key":"granted","label":"Granted"}]'),
  ('00000000-0000-4000-9002-000000000008', 'con_site_logistics', 'Site Logistics', 'Site logistics plans', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9002-000000000009', 'con_site_facilities', 'Site Facilities', 'Site welfare and facilities', '[{"key":"planned","label":"Planned"},{"key":"installed","label":"Installed"}]'),
  ('00000000-0000-4000-9002-00000000000a', 'con_site_diary', 'Site Diary', 'Daily site diary entries', '[{"key":"open","label":"Open"},{"key":"closed","label":"Closed"}]'),
  ('00000000-0000-4000-9002-00000000000b', 'con_daily_progress', 'Daily Progress', 'Daily progress records', '[{"key":"recorded","label":"Recorded"},{"key":"verified","label":"Verified"}]'),
  ('00000000-0000-4000-9002-00000000000c', 'con_site_closeout', 'Site Closeout', 'Site closeout checklist', '[{"key":"open","label":"Open"},{"key":"closed","label":"Closed"}]'),
  -- Contractors (7)
  ('00000000-0000-4000-9002-00000000000d', 'con_contractor_register', 'Contractor Register', 'Main contractor register', '[{"key":"prospective","label":"Prospective"},{"key":"appointed","label":"Appointed"},{"key":"demobilised","label":"Demobilised"}]'),
  ('00000000-0000-4000-9002-00000000000e', 'con_prequalification', 'Prequalification', 'Contractor prequalification assessments', '[{"key":"in_progress","label":"In Progress"},{"key":"passed","label":"Passed"},{"key":"failed","label":"Failed"}]'),
  ('00000000-0000-4000-9002-00000000000f', 'con_appointments', 'Appointments', 'Contractor appointments', '[{"key":"draft","label":"Draft"},{"key":"executed","label":"Executed"}]'),
  ('00000000-0000-4000-9002-000000000010', 'con_contractor_work_packages', 'Contractor Work Packages', 'Work packages assigned to contractors', '[{"key":"assigned","label":"Assigned"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-9002-000000000011', 'con_contractor_performance', 'Contractor Performance', 'Contractor performance records', '[{"key":"satisfactory","label":"Satisfactory"},{"key":"needs_improvement","label":"Needs Improvement"}]'),
  ('00000000-0000-4000-9002-000000000012', 'con_contractor_claims', 'Contractor Claims', 'Claims raised by contractors', '[{"key":"submitted","label":"Submitted"},{"key":"under_review","label":"Under Review"},{"key":"settled","label":"Settled"},{"key":"rejected","label":"Rejected"}]'),
  ('00000000-0000-4000-9002-000000000013', 'con_contractor_closeout', 'Contractor Closeout', 'Contractor closeout checklist', '[{"key":"open","label":"Open"},{"key":"closed","label":"Closed"}]'),
  -- Subcontractors (3 — Approval/Mobilisation/Demobilisation folded into Register's own status)
  ('00000000-0000-4000-9002-000000000014', 'con_subcontractor_register', 'Subcontractor Register', 'Subcontractor register', '[{"key":"registered","label":"Registered"},{"key":"approved","label":"Approved"},{"key":"mobilised","label":"Mobilised"},{"key":"active","label":"Active"},{"key":"demobilised","label":"Demobilised"}]'),
  ('00000000-0000-4000-9002-000000000015', 'con_subcontractor_scope', 'Subcontractor Scope', 'Subcontractor scope of work records', '[{"key":"draft","label":"Draft"},{"key":"agreed","label":"Agreed"}]'),
  ('00000000-0000-4000-9002-000000000016', 'con_subcontractor_performance', 'Subcontractor Performance', 'Subcontractor performance records', '[{"key":"satisfactory","label":"Satisfactory"},{"key":"needs_improvement","label":"Needs Improvement"}]'),
  -- Permits (1 — Permit Register reused from existing local_register_permits; Planning/
  -- Environmental/Work Permits fold into that register's own type field, Expiry Tracking is a
  -- filtered view of it, not a separate register)
  ('00000000-0000-4000-9002-000000000017', 'con_permit_compliance', 'Permit Compliance', 'Permit compliance evidence', '[{"key":"pending","label":"Pending"},{"key":"compliant","label":"Compliant"},{"key":"non_compliant","label":"Non-Compliant"}]'),
  -- Design & Engineering (6 — Approved for Construction folded into Drawings' status)
  ('00000000-0000-4000-9002-000000000018', 'con_design_packages', 'Design Packages', 'Design package register', '[{"key":"in_progress","label":"In Progress"},{"key":"issued","label":"Issued"}]'),
  ('00000000-0000-4000-9002-000000000019', 'con_drawings', 'Drawings', 'Construction drawing register', '[{"key":"draft","label":"Draft"},{"key":"issued_for_review","label":"Issued for Review"},{"key":"approved_for_construction","label":"Approved for Construction"}]'),
  ('00000000-0000-4000-9002-00000000001a', 'con_specifications', 'Specifications', 'Construction specifications', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9002-00000000001b', 'con_design_reviews', 'Design Reviews', 'Design review records', '[{"key":"scheduled","label":"Scheduled"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-9002-00000000001c', 'con_design_changes', 'Design Changes', 'Design change register', '[{"key":"proposed","label":"Proposed"},{"key":"approved","label":"Approved"},{"key":"rejected","label":"Rejected"}]'),
  ('00000000-0000-4000-9002-00000000001d', 'con_technical_queries', 'Technical Queries', 'Technical query register', '[{"key":"open","label":"Open"},{"key":"answered","label":"Answered"},{"key":"closed","label":"Closed"}]'),
  -- RFIs (1, collapsed from Register/New/Open/Responses/Overdue/Closed)
  ('00000000-0000-4000-9002-00000000001e', 'con_rfi_register', 'RFI Register', 'Requests for information register', '[{"key":"new","label":"New"},{"key":"open","label":"Open"},{"key":"responded","label":"Responded"},{"key":"overdue","label":"Overdue"},{"key":"closed","label":"Closed"}]'),
  -- Site Instructions (1, collapsed)
  ('00000000-0000-4000-9002-00000000001f', 'con_site_instructions', 'Site Instructions', 'Site instruction register', '[{"key":"new","label":"New"},{"key":"under_review","label":"Under Review"},{"key":"actioned","label":"Actioned"},{"key":"closed","label":"Closed"}]'),
  -- Inspections (2)
  ('00000000-0000-4000-9002-000000000020', 'con_inspection_plan', 'Inspection Plan', 'Site inspection and test plan', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9002-000000000021', 'con_site_inspections', 'Site Inspections', 'Site inspection records (witness points, hold points, general)', '[{"key":"requested","label":"Requested"},{"key":"scheduled","label":"Scheduled"},{"key":"completed","label":"Completed"},{"key":"closed","label":"Closed"}]'),
  -- Materials (2 — Material Register reused from existing local_register_materials)
  ('00000000-0000-4000-9002-000000000022', 'con_material_submittals', 'Material Submittals', 'Material submittal register', '[{"key":"submitted","label":"Submitted"},{"key":"under_review","label":"Under Review"},{"key":"approved","label":"Approved"},{"key":"rejected","label":"Rejected"}]'),
  ('00000000-0000-4000-9002-000000000023', 'con_material_testing', 'Material Testing', 'Material test records', '[{"key":"scheduled","label":"Scheduled"},{"key":"passed","label":"Passed"},{"key":"failed","label":"Failed"}]'),
  -- Plant & Equipment (2)
  ('00000000-0000-4000-9002-000000000024', 'con_equipment_register', 'Equipment Register', 'Plant and equipment register', '[{"key":"mobilised","label":"Mobilised"},{"key":"allocated","label":"Allocated"},{"key":"available","label":"Available"},{"key":"demobilised","label":"Demobilised"}]'),
  ('00000000-0000-4000-9002-000000000025', 'con_equipment_maintenance', 'Equipment Maintenance', 'Plant and equipment maintenance log', '[{"key":"scheduled","label":"Scheduled"},{"key":"complete","label":"Complete"}]'),
  -- Health & Safety (8)
  ('00000000-0000-4000-9002-000000000026', 'con_hse_plan', 'HSE Plan', 'Health, safety and environment plan', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9002-000000000027', 'con_risk_assessments', 'Risk Assessments', 'Construction risk assessments', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9002-000000000028', 'con_method_statements', 'Method Statements', 'Method statement register', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9002-000000000029', 'con_toolbox_talks', 'Toolbox Talks', 'Toolbox talk records', '[{"key":"planned","label":"Planned"},{"key":"delivered","label":"Delivered"}]'),
  ('00000000-0000-4000-9002-00000000002a', 'con_safety_inspections', 'Safety Inspections', 'Site safety inspection records', '[{"key":"scheduled","label":"Scheduled"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-9002-00000000002b', 'con_hse_incidents', 'Incidents', 'HSE incident register', '[{"key":"open","label":"Open"},{"key":"under_investigation","label":"Under Investigation"},{"key":"closed","label":"Closed"}]'),
  ('00000000-0000-4000-9002-00000000002c', 'con_near_misses', 'Near Misses', 'Near miss register', '[{"key":"reported","label":"Reported"},{"key":"reviewed","label":"Reviewed"}]'),
  ('00000000-0000-4000-9002-00000000002d', 'con_hse_corrective_actions', 'Corrective Actions', 'HSE corrective action register', '[{"key":"open","label":"Open"},{"key":"in_progress","label":"In Progress"},{"key":"closed","label":"Closed"}]'),
  -- Quality Control (6)
  ('00000000-0000-4000-9002-00000000002e', 'con_itps', 'ITPs', 'Inspection and test plans', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9002-00000000002f', 'con_quality_inspections', 'Quality Inspections', 'Quality control inspection records', '[{"key":"scheduled","label":"Scheduled"},{"key":"passed","label":"Passed"},{"key":"failed","label":"Failed"}]'),
  ('00000000-0000-4000-9002-000000000030', 'con_test_certificates', 'Test Certificates', 'Quality test certificate register', '[{"key":"pending","label":"Pending"},{"key":"issued","label":"Issued"}]'),
  ('00000000-0000-4000-9002-000000000031', 'con_ncrs', 'NCRs', 'Non-conformance report register', '[{"key":"open","label":"Open"},{"key":"in_progress","label":"In Progress"},{"key":"closed","label":"Closed"}]'),
  ('00000000-0000-4000-9002-000000000032', 'con_snag_punch_list', 'Snag / Punch List', 'Snag and punch list items', '[{"key":"open","label":"Open"},{"key":"closed","label":"Closed"}]'),
  ('00000000-0000-4000-9002-000000000033', 'con_quality_corrective_actions', 'Corrective Actions', 'Quality corrective action register', '[{"key":"open","label":"Open"},{"key":"in_progress","label":"In Progress"},{"key":"closed","label":"Closed"}]'),
  -- Progress Measurement (3)
  ('00000000-0000-4000-9002-000000000034', 'con_progress_measurement', 'Progress Measurement', 'Planned, actual and earned progress records', '[{"key":"planned","label":"Planned"},{"key":"actual","label":"Actual"},{"key":"earned","label":"Earned"}]'),
  ('00000000-0000-4000-9002-000000000035', 'con_delays', 'Delays', 'Delay register', '[{"key":"identified","label":"Identified"},{"key":"assessed","label":"Assessed"},{"key":"resolved","label":"Resolved"}]'),
  ('00000000-0000-4000-9002-000000000036', 'con_recovery_plans', 'Recovery Plans', 'Schedule recovery plans', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  -- Commercial (4)
  ('00000000-0000-4000-9002-000000000037', 'con_bills_of_quantities', 'Bills of Quantities', 'Bills of quantities register', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9002-000000000038', 'con_valuations', 'Valuations', 'Interim valuation register', '[{"key":"submitted","label":"Submitted"},{"key":"certified","label":"Certified"}]'),
  ('00000000-0000-4000-9002-000000000039', 'con_variations', 'Variations', 'Contract variation register', '[{"key":"proposed","label":"Proposed"},{"key":"approved","label":"Approved"},{"key":"rejected","label":"Rejected"}]'),
  ('00000000-0000-4000-9002-00000000003a', 'con_commercial_claims', 'Commercial Claims', 'Commercial claim register', '[{"key":"submitted","label":"Submitted"},{"key":"under_review","label":"Under Review"},{"key":"settled","label":"Settled"}]'),
  -- Progress Certificates (1, collapsed — also absorbs "Payment Certificates" from Commercial)
  ('00000000-0000-4000-9002-00000000003b', 'con_progress_certificates', 'Progress Certificates', 'Progress and payment certificate register', '[{"key":"submitted","label":"Submitted"},{"key":"measured","label":"Measured"},{"key":"certified","label":"Certified"},{"key":"approved","label":"Approved"},{"key":"paid","label":"Paid"}]'),
  -- Handover & Commissioning (8)
  ('00000000-0000-4000-9002-00000000003c', 'con_commissioning_plan', 'Commissioning Plan', 'Commissioning plan', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9002-00000000003d', 'con_pre_commissioning', 'Pre-Commissioning', 'Pre-commissioning checklist', '[{"key":"open","label":"Open"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-9002-00000000003e', 'con_testing_commissioning', 'Testing & Commissioning', 'Testing and commissioning records', '[{"key":"scheduled","label":"Scheduled"},{"key":"passed","label":"Passed"},{"key":"failed","label":"Failed"}]'),
  ('00000000-0000-4000-9002-00000000003f', 'con_as_built_drawings', 'As-Built Drawings', 'As-built drawing register', '[{"key":"pending","label":"Pending"},{"key":"submitted","label":"Submitted"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9002-000000000040', 'con_om_manuals', 'O&M Manuals', 'Operations and maintenance manual register', '[{"key":"pending","label":"Pending"},{"key":"submitted","label":"Submitted"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9002-000000000041', 'con_handover_training', 'Training', 'Handover training records', '[{"key":"planned","label":"Planned"},{"key":"delivered","label":"Delivered"}]'),
  ('00000000-0000-4000-9002-000000000042', 'con_handover_certificates', 'Handover Certificates', 'Handover certificate register', '[{"key":"pending","label":"Pending"},{"key":"issued","label":"Issued"}]'),
  ('00000000-0000-4000-9002-000000000043', 'con_defects_liability', 'Defects Liability', 'Defects liability period tracking', '[{"key":"open","label":"Open"},{"key":"closed","label":"Closed"}]')
) AS v(id, register_key, label, description, status_workflow)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, status_workflow = EXCLUDED.status_workflow,
  is_active = TRUE, updated_at = NOW();

-- ── 3. local_register_industry_packs ────────────────────────────────────────────────────

INSERT INTO public.local_register_industry_packs (register_id, industry_pack_id)
SELECT lr.id, ip.id
FROM public.local_registers lr
JOIN public.industry_packs ip ON ip.industry_category_id = (
  SELECT id FROM public.industry_categories WHERE name = 'Construction & Engineering'
)
WHERE lr.id::text LIKE '00000000-0000-4000-9002-%'
ON CONFLICT (register_id, industry_pack_id) DO NOTHING;

-- Also link the 3 reused existing registers (Sites/Materials/Permits) to this pack, in case
-- they aren't already (they were seeded generically in v933, cross-industry-applicable, but
-- may not have had an explicit Construction & Engineering link before this industry existed
-- with real content — safe, idempotent, no-op if already linked).
INSERT INTO public.local_register_industry_packs (register_id, industry_pack_id)
SELECT lr.id, ip.id
FROM public.local_registers lr
JOIN public.industry_packs ip ON ip.industry_category_id = (
  SELECT id FROM public.industry_categories WHERE name = 'Construction & Engineering'
)
WHERE lr.register_key IN ('local_register_sites', 'local_register_materials', 'local_register_permits')
ON CONFLICT (register_id, industry_pack_id) DO NOTHING;

-- ── 4. menu_items — one per register, nested under its category ────────────────────────

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT
  gen_random_uuid(), 'con_reg_' || lr.register_key, lr.label, lr.description,
  '/platform/local-registers/' || lr.id::text,
  (SELECT id FROM public.menu_items WHERE menu_code = v.category_code AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
  2, v.sort_order, 'universal', 'list-checks', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('00000000-0000-4000-9002-000000000001','con_cat_management',730),('00000000-0000-4000-9002-000000000002','con_cat_management',731),
  ('00000000-0000-4000-9002-000000000003','con_cat_management',732),('00000000-0000-4000-9002-000000000004','con_cat_management',733),
  ('00000000-0000-4000-9002-000000000005','con_cat_management',734),
  ('00000000-0000-4000-9002-000000000006','con_cat_sites',740),('00000000-0000-4000-9002-000000000007','con_cat_sites',741),
  ('00000000-0000-4000-9002-000000000008','con_cat_sites',742),('00000000-0000-4000-9002-000000000009','con_cat_sites',743),
  ('00000000-0000-4000-9002-00000000000a','con_cat_sites',744),('00000000-0000-4000-9002-00000000000b','con_cat_sites',745),
  ('00000000-0000-4000-9002-00000000000c','con_cat_sites',746),
  ('00000000-0000-4000-9002-00000000000d','con_cat_contractors',750),('00000000-0000-4000-9002-00000000000e','con_cat_contractors',751),
  ('00000000-0000-4000-9002-00000000000f','con_cat_contractors',752),('00000000-0000-4000-9002-000000000010','con_cat_contractors',753),
  ('00000000-0000-4000-9002-000000000011','con_cat_contractors',754),('00000000-0000-4000-9002-000000000012','con_cat_contractors',755),
  ('00000000-0000-4000-9002-000000000013','con_cat_contractors',756),
  ('00000000-0000-4000-9002-000000000014','con_cat_subcontractors',760),('00000000-0000-4000-9002-000000000015','con_cat_subcontractors',761),
  ('00000000-0000-4000-9002-000000000016','con_cat_subcontractors',762),
  ('00000000-0000-4000-9002-000000000017','con_cat_permits',770),
  ('00000000-0000-4000-9002-000000000018','con_cat_design_engineering',780),('00000000-0000-4000-9002-000000000019','con_cat_design_engineering',781),
  ('00000000-0000-4000-9002-00000000001a','con_cat_design_engineering',782),('00000000-0000-4000-9002-00000000001b','con_cat_design_engineering',783),
  ('00000000-0000-4000-9002-00000000001c','con_cat_design_engineering',784),('00000000-0000-4000-9002-00000000001d','con_cat_design_engineering',785),
  ('00000000-0000-4000-9002-00000000001e','con_cat_rfis',790),
  ('00000000-0000-4000-9002-00000000001f','con_cat_site_instructions',800),
  ('00000000-0000-4000-9002-000000000020','con_cat_inspections',810),('00000000-0000-4000-9002-000000000021','con_cat_inspections',811),
  ('00000000-0000-4000-9002-000000000022','con_cat_materials',820),('00000000-0000-4000-9002-000000000023','con_cat_materials',821),
  ('00000000-0000-4000-9002-000000000024','con_cat_plant_equipment',830),('00000000-0000-4000-9002-000000000025','con_cat_plant_equipment',831),
  ('00000000-0000-4000-9002-000000000026','con_cat_health_safety',840),('00000000-0000-4000-9002-000000000027','con_cat_health_safety',841),
  ('00000000-0000-4000-9002-000000000028','con_cat_health_safety',842),('00000000-0000-4000-9002-000000000029','con_cat_health_safety',843),
  ('00000000-0000-4000-9002-00000000002a','con_cat_health_safety',844),('00000000-0000-4000-9002-00000000002b','con_cat_health_safety',845),
  ('00000000-0000-4000-9002-00000000002c','con_cat_health_safety',846),('00000000-0000-4000-9002-00000000002d','con_cat_health_safety',847),
  ('00000000-0000-4000-9002-00000000002e','con_cat_quality_control',850),('00000000-0000-4000-9002-00000000002f','con_cat_quality_control',851),
  ('00000000-0000-4000-9002-000000000030','con_cat_quality_control',852),('00000000-0000-4000-9002-000000000031','con_cat_quality_control',853),
  ('00000000-0000-4000-9002-000000000032','con_cat_quality_control',854),('00000000-0000-4000-9002-000000000033','con_cat_quality_control',855),
  ('00000000-0000-4000-9002-000000000034','con_cat_progress_measurement',860),('00000000-0000-4000-9002-000000000035','con_cat_progress_measurement',861),
  ('00000000-0000-4000-9002-000000000036','con_cat_progress_measurement',862),
  ('00000000-0000-4000-9002-000000000037','con_cat_commercial',870),('00000000-0000-4000-9002-000000000038','con_cat_commercial',871),
  ('00000000-0000-4000-9002-000000000039','con_cat_commercial',872),('00000000-0000-4000-9002-00000000003a','con_cat_commercial',873),
  ('00000000-0000-4000-9002-00000000003b','con_cat_progress_certificates',880),
  ('00000000-0000-4000-9002-00000000003c','con_cat_handover_commissioning',890),('00000000-0000-4000-9002-00000000003d','con_cat_handover_commissioning',891),
  ('00000000-0000-4000-9002-00000000003e','con_cat_handover_commissioning',892),('00000000-0000-4000-9002-00000000003f','con_cat_handover_commissioning',893),
  ('00000000-0000-4000-9002-000000000040','con_cat_handover_commissioning',894),('00000000-0000-4000-9002-000000000041','con_cat_handover_commissioning',895),
  ('00000000-0000-4000-9002-000000000042','con_cat_handover_commissioning',896),('00000000-0000-4000-9002-000000000043','con_cat_handover_commissioning',897)
) AS v(register_id, category_code, sort_order)
JOIN public.local_registers lr ON lr.id = v.register_id::uuid
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, route_path = EXCLUDED.route_path, parent_menu_id = EXCLUDED.parent_menu_id,
  sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

SELECT public.grant_menu_role_group('con_reg_%');

INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
SELECT DISTINCT lrip.industry_pack_id, mi.id
FROM public.local_register_industry_packs lrip
JOIN public.local_registers lr ON lr.id = lrip.register_id
JOIN public.menu_items mi ON mi.route_path = '/platform/local-registers/' || lr.id::text
WHERE lr.id::text LIKE '00000000-0000-4000-9002-%' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

DO $$
DECLARE v_registers INT;
BEGIN
  SELECT COUNT(*) INTO v_registers FROM public.local_registers WHERE id::text LIKE '00000000-0000-4000-9002-%';
  RAISE NOTICE 'v948: CON phase complete — % registers across 17 categories', v_registers;
END $$;

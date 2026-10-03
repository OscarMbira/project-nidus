-- ============================================================================
-- v951: Industry Capability Content Taxonomy — Phase 6 (GOV: Government & Public Sector)
-- ============================================================================
-- projectplan/v946_industry_capability_content_taxonomy_plan.md Phase 6.
-- Source: Documentation/Core_PM_and_Industry_Menu_Taxonomy.md Section 8, filtered through PRD
-- decision 0. 7 of 11 categories kept (Regulatory & Legal, Citizen & Stakeholder Engagement,
-- Service Delivery, Transparency & Accountability dropped — ongoing operations).
-- No collision: the 2 existing registers (FOI Requests, Policy/Legislative Milestones) belong to
-- dropped categories.
-- UUID block: 9005. Prerequisites: v931, v932, v946, v946c.
-- ============================================================================

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.menu_code, v.menu_label, v.menu_description, NULL, NULL, 1, v.sort_order, 'universal', 'landmark', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('gov_cat_programme', 'Public Sector Programme', 'Overview of the public sector programme', 1200),
  ('gov_cat_policy_mandate', 'Policy & Mandate', 'Policy and mandate activities', 1201),
  ('gov_cat_investment', 'Public Investment', 'Public investment activities', 1202),
  ('gov_cat_budget_appropriation', 'Budget & Appropriation', 'Budget and appropriation tracking', 1203),
  ('gov_cat_procurement_tendering', 'Procurement & Tendering', 'Procurement and tendering activities', 1204),
  ('gov_cat_interagency_coordination', 'Inter-Agency Coordination', 'Inter-agency coordination activities', 1205),
  ('gov_cat_benefits_outcomes', 'Benefits & Outcomes', 'Programme benefits and outcomes tracking', 1206)
) AS v(menu_code, menu_label, menu_description, sort_order)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, menu_description = EXCLUDED.menu_description,
  is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

SELECT public.grant_menu_role_group('gov_cat_%');

INSERT INTO public.local_registers (id, register_key, label, icon, description, scope_level, account_id, status_workflow, is_system_defined, is_active, created_at, updated_at)
SELECT v.id::uuid, v.register_key, v.label, 'list-checks', v.description, 'project', NULL, v.status_workflow::jsonb, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  -- Public Sector Programme (5)
  ('00000000-0000-4000-9005-000000000001', 'gov_programme_overview', 'Programme Overview', 'Public sector programme overview', '[{"key":"draft","label":"Draft"},{"key":"published","label":"Published"}]'),
  ('00000000-0000-4000-9005-000000000002', 'gov_government_priorities', 'Government Priorities', 'Government priority register', '[{"key":"active","label":"Active"},{"key":"achieved","label":"Achieved"}]'),
  ('00000000-0000-4000-9005-000000000003', 'gov_policy_alignment', 'Policy Alignment', 'Policy alignment register', '[{"key":"assessed","label":"Assessed"},{"key":"aligned","label":"Aligned"}]'),
  ('00000000-0000-4000-9005-000000000004', 'gov_ministries_agencies', 'Ministries / Agencies', 'Participating ministries and agencies', '[{"key":"engaged","label":"Engaged"},{"key":"active","label":"Active"}]'),
  ('00000000-0000-4000-9005-000000000005', 'gov_public_sector_milestones', 'Public Sector Milestones', 'Programme milestones', '[{"key":"upcoming","label":"Upcoming"},{"key":"met","label":"Met"},{"key":"missed","label":"Missed"}]'),
  -- Policy & Mandate (4, Policy Approval folded into status)
  ('00000000-0000-4000-9005-000000000006', 'gov_policy_objectives', 'Policy Objectives', 'Policy objective register', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9005-000000000007', 'gov_legal_mandate', 'Legal Mandate', 'Legal mandate register', '[{"key":"draft","label":"Draft"},{"key":"confirmed","label":"Confirmed"}]'),
  ('00000000-0000-4000-9005-000000000008', 'gov_strategic_alignment', 'Strategic Alignment', 'Strategic alignment register', '[{"key":"assessed","label":"Assessed"},{"key":"aligned","label":"Aligned"}]'),
  ('00000000-0000-4000-9005-000000000009', 'gov_policy_dependencies', 'Policy Dependencies', 'Policy dependency register', '[{"key":"open","label":"Open"},{"key":"resolved","label":"Resolved"}]'),
  -- Public Investment (3, collapsed)
  ('00000000-0000-4000-9005-00000000000a', 'gov_investment_case', 'Investment Case', 'Investment proposal, appraisal and review tracking', '[{"key":"proposal","label":"Proposal"},{"key":"appraisal","label":"Appraisal"},{"key":"funding_approval","label":"Funding Approval"},{"key":"review","label":"Review"}]'),
  ('00000000-0000-4000-9005-00000000000b', 'gov_capital_allocation', 'Capital Allocation', 'Capital allocation register', '[{"key":"allocated","label":"Allocated"},{"key":"deployed","label":"Deployed"}]'),
  ('00000000-0000-4000-9005-00000000000c', 'gov_expenditure_tracking', 'Expenditure Tracking', 'Investment expenditure tracking', '[{"key":"planned","label":"Planned"},{"key":"actual","label":"Actual"}]'),
  -- Budget & Appropriation (1, collapsed)
  ('00000000-0000-4000-9005-00000000000d', 'gov_budget_appropriation', 'Budget & Appropriation', 'Budget request, approval and appropriation tracking', '[{"key":"requested","label":"Requested"},{"key":"approved","label":"Approved"},{"key":"appropriated","label":"Appropriated"}]'),
  -- Procurement & Tendering (4)
  ('00000000-0000-4000-9005-00000000000e', 'gov_procurement_plan', 'Procurement Plan', 'Procurement plan', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9005-00000000000f', 'gov_tender_register', 'Tender Register', 'Tender register', '[{"key":"new","label":"New"},{"key":"bid_evaluation","label":"Bid Evaluation"},{"key":"awarded","label":"Awarded"}]'),
  ('00000000-0000-4000-9005-000000000010', 'gov_contracts', 'Contracts', 'Government contract register', '[{"key":"draft","label":"Draft"},{"key":"executed","label":"Executed"}]'),
  ('00000000-0000-4000-9005-000000000011', 'gov_supplier_performance', 'Supplier Performance', 'Supplier performance records', '[{"key":"satisfactory","label":"Satisfactory"},{"key":"needs_improvement","label":"Needs Improvement"}]'),
  -- Inter-Agency Coordination (4, Escalations folded)
  ('00000000-0000-4000-9005-000000000012', 'gov_agencies', 'Agencies', 'Participating agency register', '[{"key":"engaged","label":"Engaged"},{"key":"active","label":"Active"}]'),
  ('00000000-0000-4000-9005-000000000013', 'gov_interagency_dependencies', 'Dependencies', 'Inter-agency dependency register', '[{"key":"open","label":"Open"},{"key":"resolved","label":"Resolved"}]'),
  ('00000000-0000-4000-9005-000000000014', 'gov_shared_deliverables', 'Shared Deliverables', 'Shared deliverable register', '[{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-9005-000000000015', 'gov_joint_decisions', 'Joint Decisions', 'Joint decision register', '[{"key":"pending","label":"Pending"},{"key":"decided","label":"Decided"}]'),
  -- Benefits & Outcomes (2, collapsed)
  ('00000000-0000-4000-9005-000000000016', 'gov_public_benefits', 'Public Benefits', 'Public benefits register', '[{"key":"planned","label":"Planned"},{"key":"realised","label":"Realised"}]'),
  ('00000000-0000-4000-9005-000000000017', 'gov_outcome_tracking', 'Outcome Tracking', 'Outcome baseline, indicator and impact tracking', '[{"key":"baseline","label":"Baseline"},{"key":"indicators_set","label":"Indicators Set"},{"key":"results_recorded","label":"Results Recorded"},{"key":"impact_evaluated","label":"Impact Evaluated"}]')
) AS v(id, register_key, label, description, status_workflow)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, status_workflow = EXCLUDED.status_workflow,
  is_active = TRUE, updated_at = NOW();

INSERT INTO public.local_register_industry_packs (register_id, industry_pack_id)
SELECT lr.id, ip.id
FROM public.local_registers lr
JOIN public.industry_packs ip ON ip.industry_category_id = (SELECT id FROM public.industry_categories WHERE name = 'Government & Public Sector')
WHERE lr.id::text LIKE '00000000-0000-4000-9005-%'
ON CONFLICT (register_id, industry_pack_id) DO NOTHING;

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), 'gov_reg_' || lr.register_key, lr.label, lr.description, '/platform/local-registers/' || lr.id::text,
  (SELECT id FROM public.menu_items WHERE menu_code = v.category_code AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
  2, v.sort_order, 'universal', 'list-checks', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('00000000-0000-4000-9005-000000000001','gov_cat_programme',1210),('00000000-0000-4000-9005-000000000002','gov_cat_programme',1211),
  ('00000000-0000-4000-9005-000000000003','gov_cat_programme',1212),('00000000-0000-4000-9005-000000000004','gov_cat_programme',1213),
  ('00000000-0000-4000-9005-000000000005','gov_cat_programme',1214),
  ('00000000-0000-4000-9005-000000000006','gov_cat_policy_mandate',1220),('00000000-0000-4000-9005-000000000007','gov_cat_policy_mandate',1221),
  ('00000000-0000-4000-9005-000000000008','gov_cat_policy_mandate',1222),('00000000-0000-4000-9005-000000000009','gov_cat_policy_mandate',1223),
  ('00000000-0000-4000-9005-00000000000a','gov_cat_investment',1230),('00000000-0000-4000-9005-00000000000b','gov_cat_investment',1231),
  ('00000000-0000-4000-9005-00000000000c','gov_cat_investment',1232),
  ('00000000-0000-4000-9005-00000000000d','gov_cat_budget_appropriation',1240),
  ('00000000-0000-4000-9005-00000000000e','gov_cat_procurement_tendering',1250),('00000000-0000-4000-9005-00000000000f','gov_cat_procurement_tendering',1251),
  ('00000000-0000-4000-9005-000000000010','gov_cat_procurement_tendering',1252),('00000000-0000-4000-9005-000000000011','gov_cat_procurement_tendering',1253),
  ('00000000-0000-4000-9005-000000000012','gov_cat_interagency_coordination',1260),('00000000-0000-4000-9005-000000000013','gov_cat_interagency_coordination',1261),
  ('00000000-0000-4000-9005-000000000014','gov_cat_interagency_coordination',1262),('00000000-0000-4000-9005-000000000015','gov_cat_interagency_coordination',1263),
  ('00000000-0000-4000-9005-000000000016','gov_cat_benefits_outcomes',1270),('00000000-0000-4000-9005-000000000017','gov_cat_benefits_outcomes',1271)
) AS v(register_id, category_code, sort_order)
JOIN public.local_registers lr ON lr.id = v.register_id::uuid
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, route_path = EXCLUDED.route_path, parent_menu_id = EXCLUDED.parent_menu_id,
  sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

SELECT public.grant_menu_role_group('gov_reg_%');

INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
SELECT DISTINCT lrip.industry_pack_id, mi.id
FROM public.local_register_industry_packs lrip
JOIN public.local_registers lr ON lr.id = lrip.register_id
JOIN public.menu_items mi ON mi.route_path = '/platform/local-registers/' || lr.id::text
WHERE lr.id::text LIKE '00000000-0000-4000-9005-%' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

DO $$
DECLARE v_registers INT;
BEGIN
  SELECT COUNT(*) INTO v_registers FROM public.local_registers WHERE id::text LIKE '00000000-0000-4000-9005-%';
  RAISE NOTICE 'v951: GOV phase complete — % registers across 7 categories', v_registers;
END $$;

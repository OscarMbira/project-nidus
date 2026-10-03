-- ============================================================================
-- v960: Industry Capability Content Taxonomy — Phase 15 (LCO: Legal & Compliance)
-- ============================================================================
-- projectplan/v946_industry_capability_content_taxonomy_plan.md Phase 15.
-- Source: Documentation/Human_Resources_and_Legal_Compliance_Menu_Taxonomy.md Section 4,
-- filtered through PRD decision 6c (PM-of-legal-projects, not a GRC/legal-matter-management
-- system — Litigation & Disputes, Claims Management, Contract Management's ongoing lifecycle,
-- Compliance Monitoring/Testing programs, Data Privacy operations, Whistleblowing,
-- Investigations, AML/Sanctions, and everything else operational/case-management-shaped is
-- genuinely out of scope).
-- Legal & Compliance already existed as a bare industry_categories row with zero content — no
-- new row needed (see v946 Phase 1).
-- UUID block: 900e. Prerequisites: v931, v932, v946, v946c.
-- ============================================================================

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.menu_code, v.menu_label, v.menu_description, NULL, NULL, 1, v.sort_order, 'universal', 'scale', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('lco_cat_portfolio', 'Legal & Compliance Portfolio', 'Overview of the legal and compliance portfolio', 2300),
  ('lco_cat_regulatory_change', 'Regulatory Change', 'Regulatory change project tracking', 2301),
  ('lco_cat_projects', 'Legal & Compliance Projects', 'Named legal and compliance initiatives', 2302),
  ('lco_cat_technology', 'Legal Technology', 'Legal system implementation projects', 2303),
  ('lco_cat_remediation', 'Remediation Programmes', 'Remediation programme tracking', 2304)
) AS v(menu_code, menu_label, menu_description, sort_order)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, menu_description = EXCLUDED.menu_description,
  is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

SELECT public.grant_menu_role_group('lco_cat_%');

INSERT INTO public.local_registers (id, register_key, label, icon, description, scope_level, account_id, status_workflow, is_system_defined, is_active, created_at, updated_at)
SELECT v.id::uuid, v.register_key, v.label, 'list-checks', v.description, 'project', NULL, v.status_workflow::jsonb, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  -- Legal & Compliance Portfolio (5, Executive Dashboard/Regulatory Change Portfolio dropped)
  ('00000000-0000-4000-900e-000000000001', 'lco_legal_overview', 'Legal Overview', 'Legal portfolio overview', '[{"key":"draft","label":"Draft"},{"key":"published","label":"Published"}]'),
  ('00000000-0000-4000-900e-000000000002', 'lco_compliance_overview', 'Compliance Overview', 'Compliance portfolio overview', '[{"key":"draft","label":"Draft"},{"key":"published","label":"Published"}]'),
  ('00000000-0000-4000-900e-000000000003', 'lco_legal_project_portfolio', 'Legal Project Portfolio', 'Legal project portfolio register', '[{"key":"active","label":"Active"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-900e-000000000004', 'lco_compliance_programme_portfolio', 'Compliance Programme Portfolio', 'Compliance programme portfolio register', '[{"key":"active","label":"Active"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-900e-000000000005', 'lco_key_legal_milestones', 'Key Legal Milestones', 'Legal and compliance programme milestones', '[{"key":"upcoming","label":"Upcoming"},{"key":"met","label":"Met"},{"key":"missed","label":"Missed"}]'),
  -- Regulatory Change (1, heavily collapsed)
  ('00000000-0000-4000-900e-000000000006', 'lco_regulatory_change_register', 'Regulatory Change Register', 'New regulation impact assessment, implementation plan and closure tracking', '[{"key":"new","label":"New"},{"key":"impact_assessment","label":"Impact Assessment"},{"key":"gap_assessment","label":"Gap Assessment"},{"key":"implementation_plan","label":"Implementation Plan"},{"key":"actions_in_progress","label":"Actions In Progress"},{"key":"compliance_testing","label":"Compliance Testing"},{"key":"closed","label":"Closed"}]'),
  -- Legal & Compliance Projects (1, collapsed)
  ('00000000-0000-4000-900e-000000000007', 'lco_named_projects', 'Legal & Compliance Projects', 'Compliance transformation, contract transformation, privacy and governance projects', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'),
  -- Legal Technology (1, collapsed)
  ('00000000-0000-4000-900e-000000000008', 'lco_technology_implementation', 'Legal Technology Implementation', 'Legal, contract, matter management, compliance and regulatory system implementation', '[{"key":"not_started","label":"Not Started"},{"key":"integration","label":"Integration"},{"key":"data_migration","label":"Data Migration"},{"key":"testing","label":"Testing"},{"key":"ready","label":"Ready"}]'),
  -- Remediation Programmes (1, collapsed)
  ('00000000-0000-4000-900e-000000000009', 'lco_remediation_register', 'Remediation Programme Register', 'Regulatory, audit, compliance and customer remediation programme tracking', '[{"key":"actions","label":"Actions"},{"key":"evidence","label":"Evidence"},{"key":"validation","label":"Validation"},{"key":"closure","label":"Closure"}]')
) AS v(id, register_key, label, description, status_workflow)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, status_workflow = EXCLUDED.status_workflow,
  is_active = TRUE, updated_at = NOW();

INSERT INTO public.local_register_industry_packs (register_id, industry_pack_id)
SELECT lr.id, ip.id
FROM public.local_registers lr
JOIN public.industry_packs ip ON ip.industry_category_id = (SELECT id FROM public.industry_categories WHERE name = 'Legal & Compliance')
WHERE lr.id::text LIKE '00000000-0000-4000-900e-%'
ON CONFLICT (register_id, industry_pack_id) DO NOTHING;

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), 'lco_reg_' || lr.register_key, lr.label, lr.description, '/platform/local-registers/' || lr.id::text,
  (SELECT id FROM public.menu_items WHERE menu_code = v.category_code AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
  2, v.sort_order, 'universal', 'list-checks', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('00000000-0000-4000-900e-000000000001','lco_cat_portfolio',2310),('00000000-0000-4000-900e-000000000002','lco_cat_portfolio',2311),
  ('00000000-0000-4000-900e-000000000003','lco_cat_portfolio',2312),('00000000-0000-4000-900e-000000000004','lco_cat_portfolio',2313),
  ('00000000-0000-4000-900e-000000000005','lco_cat_portfolio',2314),
  ('00000000-0000-4000-900e-000000000006','lco_cat_regulatory_change',2320),
  ('00000000-0000-4000-900e-000000000007','lco_cat_projects',2330),
  ('00000000-0000-4000-900e-000000000008','lco_cat_technology',2340),
  ('00000000-0000-4000-900e-000000000009','lco_cat_remediation',2350)
) AS v(register_id, category_code, sort_order)
JOIN public.local_registers lr ON lr.id = v.register_id::uuid
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, route_path = EXCLUDED.route_path, parent_menu_id = EXCLUDED.parent_menu_id,
  sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- Reuse links (PRD decision 6c) — routes verified against platformRoutes.jsx.
INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'lco_reuse_risks_issues', 'Legal Risks & Issues', 'Legal risk and issue register',
    '/platform/raid-log', (SELECT id FROM public.menu_items WHERE menu_code = 'lco_cat_portfolio' LIMIT 1), 2, 2315, 'universal', 'alert-triangle', TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'lco_reuse_compliance_actions', 'Compliance Actions', 'Compliance action register',
    '/platform/governance', (SELECT id FROM public.menu_items WHERE menu_code = 'lco_cat_portfolio' LIMIT 1), 2, 2316, 'universal', 'check-square', TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'lco_reuse_approvals', 'Legal Approvals', 'Legal approval and governance',
    '/platform/governance', (SELECT id FROM public.menu_items WHERE menu_code = 'lco_cat_portfolio' LIMIT 1), 2, 2317, 'universal', 'shield-check', TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'lco_reuse_contract_documents', 'Contract Documents', 'Contract document management',
    '/platform/documents/project', (SELECT id FROM public.menu_items WHERE menu_code = 'lco_cat_portfolio' LIMIT 1), 2, 2318, 'universal', 'folder', TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'lco_reuse_external_counsel_cost', 'External Counsel Cost', 'External counsel cost management (see project Cost Management for project-scoped budget)',
    '/platform/reports', (SELECT id FROM public.menu_items WHERE menu_code = 'lco_cat_portfolio' LIMIT 1), 2, 2319, 'universal', 'dollar-sign', TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'lco_reuse_knowledge', 'Legal & Compliance Knowledge', 'Legal and compliance lessons learned',
    '/platform/lessons/corporate', (SELECT id FROM public.menu_items WHERE menu_code = 'lco_cat_portfolio' LIMIT 1), 2, 2320, 'universal', 'book-open', TRUE, TRUE, NOW(), NOW())
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, route_path = EXCLUDED.route_path, parent_menu_id = EXCLUDED.parent_menu_id,
  is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

SELECT public.grant_menu_role_group('lco_re%');

INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
SELECT DISTINCT lrip.industry_pack_id, mi.id
FROM public.local_register_industry_packs lrip
JOIN public.local_registers lr ON lr.id = lrip.register_id
JOIN public.menu_items mi ON mi.route_path = '/platform/local-registers/' || lr.id::text
WHERE lr.id::text LIKE '00000000-0000-4000-900e-%' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
SELECT ip.id, mi.id
FROM public.menu_items mi
JOIN public.industry_packs ip ON ip.industry_category_id = (SELECT id FROM public.industry_categories WHERE name = 'Legal & Compliance')
WHERE mi.menu_code LIKE 'lco_reuse_%' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

DO $$
DECLARE v_registers INT;
BEGIN
  SELECT COUNT(*) INTO v_registers FROM public.local_registers WHERE id::text LIKE '00000000-0000-4000-900e-%';
  RAISE NOTICE 'v960: LCO phase complete — % registers across 5 categories + 6 reuse links', v_registers;
END $$;

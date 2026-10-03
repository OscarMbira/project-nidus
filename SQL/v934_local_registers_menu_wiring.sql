-- =============================================================================
-- v934: Local Register Engine — menu wiring for the 28 system-defined registers
-- =============================================================================
-- One menu_items row per register (route_path references the fixed UUID from
-- SQL/v933_local_registers_system_seed.sql), nested under Portfolio & Delivery
-- (pmo-cat-project-delivery) — every one of the 28 is fundamentally a project-delivery
-- tracking concern, same broad home as Risk/Issue/Change registers. Wired through
-- industry_pack_menu_items exactly like any other industry-specific menu item (v920), so
-- v930's pack-grouped sidebar buckets each one under its owning industry pack section(s)
-- automatically — no changes needed to the v930 grouping code itself.
--
-- Role grants follow the same broad delivery-team role set v928 (Simulator Industries &
-- Capabilities menu item) already used for a comparable new-item rollout.
--
-- Prerequisites: v933_local_registers_system_seed.sql, v676 (pmo-cat-project-delivery category
-- row), v920 (industry_pack_menu_items)
-- =============================================================================

-- ── 1. menu_items rows ──────────────────────────────────────────────────────────

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT
  gen_random_uuid(), v.menu_code, v.menu_label, v.menu_description,
  '/platform/local-registers/' || v.register_id,
  (SELECT id FROM public.menu_items WHERE menu_code = 'pmo-cat-project-delivery' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
  2, v.sort_order, 'universal', 'list-checks', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('local_register_readiness_checklist',           'Readiness Checklist',                'Go-live/readiness checklist',                     '00000000-0000-4000-8000-000000000001', 500),
  ('local_register_data_migration',                'Data Migration',                     'Data migration wave/object tracking',             '00000000-0000-4000-8000-000000000002', 501),
  ('local_register_commissioning',                 'Commissioning',                      'Commissioning/energisation tracking',             '00000000-0000-4000-8000-000000000003', 502),
  ('local_register_permits',                       'Permits',                            'Regulatory permit tracking',                      '00000000-0000-4000-8000-000000000004', 503),
  ('local_register_core_banking',                  'Core Banking',                       'Core banking configuration items',                '00000000-0000-4000-8000-000000000005', 504),
  ('local_register_product_configuration',         'Product Configuration',              'Banking product setups',                          '00000000-0000-4000-8000-000000000006', 505),
  ('local_register_parameterisation',              'Parameterisation',                   'System parameter sets',                           '00000000-0000-4000-8000-000000000007', 506),
  ('local_register_cutover',                       'Cutover',                            'Cutover run-sheet tasks',                         '00000000-0000-4000-8000-000000000008', 507),
  ('local_register_go_live',                       'Go-Live',                            'Go-live decision gate criteria',                  '00000000-0000-4000-8000-000000000009', 508),
  ('local_register_sites',                         'Sites',                              'Construction sites/locations',                    '00000000-0000-4000-8000-00000000000a', 509),
  ('local_register_materials',                     'Materials',                          'Material procurement/delivery/usage',             '00000000-0000-4000-8000-00000000000b', 510),
  ('local_register_releases',                      'Releases',                           'Software release packages/versions',              '00000000-0000-4000-8000-00000000000c', 511),
  ('local_register_deployments',                   'Deployments',                        'Individual deployment events',                    '00000000-0000-4000-8000-00000000000d', 512),
  ('local_register_clinical_trials',                'Clinical Trials / Studies',          'Clinical trial/study records',                    '00000000-0000-4000-8000-00000000000e', 513),
  ('local_register_regulatory_submissions',        'Regulatory Submissions',             'Regulatory body submissions',                     '00000000-0000-4000-8000-00000000000f', 514),
  ('local_register_patient_safety_events',         'Patient Safety Events',              'Adverse events/safety incidents',                 '00000000-0000-4000-8000-000000000010', 515),
  ('local_register_clinical_site_activation',      'Clinical Site Activation',           'Trial site activation status',                    '00000000-0000-4000-8000-000000000011', 516),
  ('local_register_bill_of_materials',             'Bill of Materials',                  'BOM line items',                                  '00000000-0000-4000-8000-000000000012', 517),
  ('local_register_equipment_asset_qualification', 'Equipment/Asset Qualification',      'IQ/OQ/PQ qualification records',                  '00000000-0000-4000-8000-000000000013', 518),
  ('local_register_process_validation',            'Process Validation',                 'Process validation runs/protocols',               '00000000-0000-4000-8000-000000000014', 519),
  ('local_register_safety_incidents',              'Safety Incidents',                   'Workplace safety incidents',                      '00000000-0000-4000-8000-000000000015', 520),
  ('local_register_foi_requests',                  'Freedom of Information Requests',    'Public records/FOI requests',                     '00000000-0000-4000-8000-000000000016', 521),
  ('local_register_policy_legislative_milestones', 'Policy/Legislative Milestones',      'Policy or legislative milestones',                '00000000-0000-4000-8000-000000000017', 522),
  ('local_register_media_placements',              'Media Placements / Channel Scheduling', 'Media buy/placement bookings',                 '00000000-0000-4000-8000-000000000018', 523),
  ('local_register_asset_infrastructure_register', 'Asset/Infrastructure Register',      'Physical energy/utility assets',                  '00000000-0000-4000-8000-000000000019', 524),
  ('local_register_outage_management',             'Outage Management',                  'Planned/unplanned outages',                       '00000000-0000-4000-8000-00000000001a', 525),
  ('local_register_environmental_impact_assessments', 'Environmental Impact Assessments', 'EIA studies/approvals',                          '00000000-0000-4000-8000-00000000001b', 526),
  ('local_register_curriculum_development',        'Curriculum Development / Rollout',   'Curriculum development/rollout items',            '00000000-0000-4000-8000-00000000001c', 527)
) AS v(menu_code, menu_label, menu_description, register_id, sort_order)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  route_path = EXCLUDED.route_path,
  parent_menu_id = EXCLUDED.parent_menu_id,
  sort_order = EXCLUDED.sort_order,
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

-- ── 2. Role grants — same broad delivery-team role set as v928's comparable rollout ────

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code LIKE 'local_register_%'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND lower(replace(r.role_name, ' ', '_')) IN (
    'pmo_admin', 'org_admin', 'system_admin', 'super_admin', 'account_owner',
    'portfolio_manager', 'programme_manager', 'project_manager', 'team_manager',
    'pm_portfolio_manager', 'pm_programme_manager', 'pm_project_manager', 'pm_team_manager'
  )
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- ── 3. industry_pack_menu_items — links each menu item to the SAME pack(s) its register ────
-- has in local_register_industry_packs (v933), so v930's pack-grouped sidebar buckets each
-- one under the correct industry section automatically.

INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
SELECT DISTINCT lrip.industry_pack_id, mi.id
FROM public.local_register_industry_packs lrip
JOIN public.local_registers lr ON lr.id = lrip.register_id
JOIN public.menu_items mi ON mi.route_path = '/platform/local-registers/' || lr.id::text
WHERE COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

-- ── 4. "Local Registers" entry point (member-created registers) + admin oversight page ────
-- These are NOT industry-specific — visible to everyone with a delivery-team role (Local
-- Registers) or PMO-admin-tier role (Manage Local Registers), no industry_pack_menu_items link.

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), 'local_registers_index', 'Local Registers',
       'Custom registers created for your PMO, Portfolio, Programme, or Project',
       '/platform/local-registers',
       (SELECT id FROM public.menu_items WHERE menu_code = 'pmo-cat-project-delivery' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, 499, 'universal', 'layout-grid', TRUE, TRUE, NOW(), NOW()
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, menu_description = EXCLUDED.menu_description,
  route_path = EXCLUDED.route_path, parent_menu_id = EXCLUDED.parent_menu_id,
  sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code = 'local_registers_index'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND lower(replace(r.role_name, ' ', '_')) IN (
    'pmo_admin', 'org_admin', 'system_admin', 'super_admin', 'account_owner',
    'portfolio_manager', 'programme_manager', 'project_manager', 'team_manager',
    'pm_portfolio_manager', 'pm_programme_manager', 'pm_project_manager', 'pm_team_manager'
  )
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), 'pmo_admin_local_registers', 'Manage Local Registers',
       'Oversight view of every local register across the organisation',
       '/platform/pmo-admin/local-registers',
       (SELECT id FROM public.menu_items WHERE menu_code = 'pmo-cat-admin' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, 250, 'universal', 'layout-grid', TRUE, TRUE, NOW(), NOW()
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, menu_description = EXCLUDED.menu_description,
  route_path = EXCLUDED.route_path, parent_menu_id = EXCLUDED.parent_menu_id,
  sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code = 'pmo_admin_local_registers'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND lower(replace(r.role_name, ' ', '_')) IN ('pmo_admin', 'org_admin', 'system_admin', 'super_admin', 'account_owner')
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$ BEGIN
  RAISE NOTICE 'v934_local_registers_menu_wiring.sql applied successfully — 28 menu items wired';
END $$;

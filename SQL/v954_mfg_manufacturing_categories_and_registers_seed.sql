-- ============================================================================
-- v954: Industry Capability Content Taxonomy — Phase 9 (MFG: Manufacturing)
-- ============================================================================
-- projectplan/v946_industry_capability_content_taxonomy_plan.md Phase 9.
-- Source: Documentation/Core_PM_and_Industry_Menu_Taxonomy.md Section 11, filtered through PRD
-- decision 0. 7 of 10 categories kept (Supply Chain, Quality, Continuous Improvement dropped —
-- ongoing operations). Process Validation is NOT a separate category here — it's fully covered
-- by the existing local_register_process_validation register (v933); creating an empty new
-- category with nothing under it would just be pruned by groupMenuTreeByIndustryPack anyway.
-- Bill of Materials and Equipment/Asset Qualification are also reused (existing registers),
-- not recreated, same as the CON/HLT/GOV/ENR pattern — left in their current placement, not
-- re-parented, to avoid risk to already-working rows.
-- UUID block: 9008. Prerequisites: v931, v932, v946, v946c.
-- ============================================================================

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.menu_code, v.menu_label, v.menu_description, NULL, NULL, 1, v.sort_order, 'universal', 'factory', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('mfg_cat_programme', 'Manufacturing Programme', 'Overview of the manufacturing programme', 1600),
  ('mfg_cat_industrialisation', 'Product Industrialisation', 'Product industrialisation activities', 1601),
  ('mfg_cat_plant_facility', 'Plant & Facility', 'Plant and facility delivery', 1602),
  ('mfg_cat_production_lines', 'Production Lines', 'Production line delivery', 1603),
  ('mfg_cat_equipment_tooling', 'Equipment & Tooling', 'Equipment and tooling delivery', 1604),
  ('mfg_cat_production_readiness', 'Production Readiness', 'Production readiness activities', 1605),
  ('mfg_cat_ramp_up', 'Ramp-Up', 'Production ramp-up activities', 1606)
) AS v(menu_code, menu_label, menu_description, sort_order)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, menu_description = EXCLUDED.menu_description,
  is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

SELECT public.grant_menu_role_group('mfg_cat_%');

INSERT INTO public.local_registers (id, register_key, label, icon, description, scope_level, account_id, status_workflow, is_system_defined, is_active, created_at, updated_at)
SELECT v.id::uuid, v.register_key, v.label, 'list-checks', v.description, 'project', NULL, v.status_workflow::jsonb, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  -- Manufacturing Programme (4, Production Lines dropped as duplicate of its own category)
  ('00000000-0000-4000-9008-000000000001', 'mfg_programme_overview', 'Programme Overview', 'Manufacturing programme overview', '[{"key":"draft","label":"Draft"},{"key":"published","label":"Published"}]'),
  ('00000000-0000-4000-9008-000000000002', 'mfg_plants', 'Plants', 'Plant register', '[{"key":"planned","label":"Planned"},{"key":"operational","label":"Operational"}]'),
  ('00000000-0000-4000-9008-000000000003', 'mfg_product_families', 'Product Families', 'Product family register', '[{"key":"planned","label":"Planned"},{"key":"in_production","label":"In Production"}]'),
  ('00000000-0000-4000-9008-000000000004', 'mfg_industrialisation_milestones', 'Industrialisation Milestones', 'Industrialisation programme milestones', '[{"key":"upcoming","label":"Upcoming"},{"key":"met","label":"Met"},{"key":"missed","label":"Missed"}]'),
  -- Product Industrialisation (4, BOM reused from existing local_register_bill_of_materials)
  ('00000000-0000-4000-9008-000000000005', 'mfg_product_definition', 'Product Definition', 'Product definition register', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9008-000000000006', 'mfg_process_design', 'Process Design', 'Manufacturing process design', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9008-000000000007', 'mfg_routing', 'Routing', 'Manufacturing routing register', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9008-000000000008', 'mfg_work_instructions', 'Work Instructions', 'Work instruction register', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  -- Plant & Facility (3, collapsed)
  ('00000000-0000-4000-9008-000000000009', 'mfg_plant_layout', 'Plant Layout', 'Plant layout register', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9008-00000000000a', 'mfg_utilities', 'Utilities', 'Plant utilities register', '[{"key":"planned","label":"Planned"},{"key":"installed","label":"Installed"}]'),
  ('00000000-0000-4000-9008-00000000000b', 'mfg_facility_modifications', 'Facility Modifications', 'Facility modification tracking', '[{"key":"design","label":"Design"},{"key":"commissioning","label":"Commissioning"},{"key":"handover","label":"Handover"}]'),
  -- Production Lines (2, collapsed — Equipment folded into Equipment & Tooling)
  ('00000000-0000-4000-9008-00000000000c', 'mfg_line_design', 'Line Design', 'Production line design', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9008-00000000000d', 'mfg_line_installation', 'Line Installation', 'Production line installation, balancing and trial run tracking', '[{"key":"installation","label":"Installation"},{"key":"line_balancing","label":"Line Balancing"},{"key":"trial_runs","label":"Trial Runs"}]'),
  -- Equipment & Tooling (1, collapsed — qualification reuses existing local_register_equipment_asset_qualification)
  ('00000000-0000-4000-9008-00000000000e', 'mfg_equipment_tooling_register', 'Equipment & Tooling Register', 'Equipment and tooling procurement, FAT, installation and SAT tracking', '[{"key":"procurement","label":"Procurement"},{"key":"fat","label":"FAT"},{"key":"installation","label":"Installation"},{"key":"sat","label":"SAT"},{"key":"calibration","label":"Calibration"},{"key":"ready","label":"Ready"}]'),
  -- Production Readiness (1, collapsed)
  ('00000000-0000-4000-9008-00000000000f', 'mfg_production_readiness_gate', 'Production Readiness Gate', 'Materials, labour, equipment, quality, maintenance and safety readiness checklist', '[{"key":"not_ready","label":"Not Ready"},{"key":"ready","label":"Ready"}]'),
  -- Ramp-Up (1, collapsed — Volume/Yield/Scrap/Productivity dropped as ongoing metrics)
  ('00000000-0000-4000-9008-000000000010', 'mfg_ramp_up_plan', 'Ramp-Up Plan', 'Production ramp-up plan and stabilisation tracking', '[{"key":"planned","label":"Planned"},{"key":"ramping","label":"Ramping"},{"key":"stabilised","label":"Stabilised"}]')
) AS v(id, register_key, label, description, status_workflow)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, status_workflow = EXCLUDED.status_workflow,
  is_active = TRUE, updated_at = NOW();

INSERT INTO public.local_register_industry_packs (register_id, industry_pack_id)
SELECT lr.id, ip.id
FROM public.local_registers lr
JOIN public.industry_packs ip ON ip.industry_category_id = (SELECT id FROM public.industry_categories WHERE name = 'Manufacturing')
WHERE lr.id::text LIKE '00000000-0000-4000-9008-%'
ON CONFLICT (register_id, industry_pack_id) DO NOTHING;

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), 'mfg_reg_' || lr.register_key, lr.label, lr.description, '/platform/local-registers/' || lr.id::text,
  (SELECT id FROM public.menu_items WHERE menu_code = v.category_code AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
  2, v.sort_order, 'universal', 'list-checks', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('00000000-0000-4000-9008-000000000001','mfg_cat_programme',1610),('00000000-0000-4000-9008-000000000002','mfg_cat_programme',1611),
  ('00000000-0000-4000-9008-000000000003','mfg_cat_programme',1612),('00000000-0000-4000-9008-000000000004','mfg_cat_programme',1613),
  ('00000000-0000-4000-9008-000000000005','mfg_cat_industrialisation',1620),('00000000-0000-4000-9008-000000000006','mfg_cat_industrialisation',1621),
  ('00000000-0000-4000-9008-000000000007','mfg_cat_industrialisation',1622),('00000000-0000-4000-9008-000000000008','mfg_cat_industrialisation',1623),
  ('00000000-0000-4000-9008-000000000009','mfg_cat_plant_facility',1630),('00000000-0000-4000-9008-00000000000a','mfg_cat_plant_facility',1631),
  ('00000000-0000-4000-9008-00000000000b','mfg_cat_plant_facility',1632),
  ('00000000-0000-4000-9008-00000000000c','mfg_cat_production_lines',1640),('00000000-0000-4000-9008-00000000000d','mfg_cat_production_lines',1641),
  ('00000000-0000-4000-9008-00000000000e','mfg_cat_equipment_tooling',1650),
  ('00000000-0000-4000-9008-00000000000f','mfg_cat_production_readiness',1660),
  ('00000000-0000-4000-9008-000000000010','mfg_cat_ramp_up',1670)
) AS v(register_id, category_code, sort_order)
JOIN public.local_registers lr ON lr.id = v.register_id::uuid
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, route_path = EXCLUDED.route_path, parent_menu_id = EXCLUDED.parent_menu_id,
  sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

SELECT public.grant_menu_role_group('mfg_reg_%');

INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
SELECT DISTINCT lrip.industry_pack_id, mi.id
FROM public.local_register_industry_packs lrip
JOIN public.local_registers lr ON lr.id = lrip.register_id
JOIN public.menu_items mi ON mi.route_path = '/platform/local-registers/' || lr.id::text
WHERE lr.id::text LIKE '00000000-0000-4000-9008-%' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

DO $$
DECLARE v_registers INT;
BEGIN
  SELECT COUNT(*) INTO v_registers FROM public.local_registers WHERE id::text LIKE '00000000-0000-4000-9008-%';
  RAISE NOTICE 'v954: MFG phase complete — % registers across 7 categories', v_registers;
END $$;

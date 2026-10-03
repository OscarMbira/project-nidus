-- ============================================================================
-- v957: Industry Capability Content Taxonomy — Phase 12 (RET: Retail)
-- ============================================================================
-- projectplan/v946_industry_capability_content_taxonomy_plan.md Phase 12.
-- Source: Documentation/Core_PM_and_Industry_Menu_Taxonomy.md Section 14, filtered through PRD
-- decision 0. 6 of 10 categories kept (Store Portfolio, Supply Chain, Customer Experience,
-- Retail Operations, Loss Prevention dropped — ongoing operations). Genuinely new industry — no
-- existing registers to reconcile.
-- UUID block: 900b. Prerequisites: v931, v932, v946, v946c.
-- ============================================================================

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.menu_code, v.menu_label, v.menu_description, NULL, NULL, 1, v.sort_order, 'universal', 'shopping-cart', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('ret_cat_programme', 'Retail Programme', 'Overview of the retail programme', 1900),
  ('ret_cat_store_development', 'Store Development', 'Store development activities', 1901),
  ('ret_cat_merchandising', 'Merchandising', 'Merchandising launch readiness', 1902),
  ('ret_cat_pos', 'Point of Sale', 'Point of sale implementation', 1903),
  ('ret_cat_ecommerce', 'E-Commerce', 'E-commerce build activities', 1904),
  ('ret_cat_launch_stabilisation', 'Launch & Stabilisation', 'Store launch activities', 1905)
) AS v(menu_code, menu_label, menu_description, sort_order)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, menu_description = EXCLUDED.menu_description,
  is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

SELECT public.grant_menu_role_group('ret_cat_%');

INSERT INTO public.local_registers (id, register_key, label, icon, description, scope_level, account_id, status_workflow, is_system_defined, is_active, created_at, updated_at)
SELECT v.id::uuid, v.register_key, v.label, 'list-checks', v.description, 'project', NULL, v.status_workflow::jsonb, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  -- Retail Programme (5)
  ('00000000-0000-4000-900b-000000000001', 'ret_programme_overview', 'Programme Overview', 'Retail programme overview', '[{"key":"draft","label":"Draft"},{"key":"published","label":"Published"}]'),
  ('00000000-0000-4000-900b-000000000002', 'ret_regions', 'Regions', 'Rollout regions register', '[{"key":"planned","label":"Planned"},{"key":"active","label":"Active"}]'),
  ('00000000-0000-4000-900b-000000000003', 'ret_stores_in_scope', 'Stores in Scope', 'Stores in scope of the programme', '[{"key":"planned","label":"Planned"},{"key":"in_progress","label":"In Progress"},{"key":"open","label":"Open"}]'),
  ('00000000-0000-4000-900b-000000000004', 'ret_channels', 'Channels', 'Retail channel register', '[{"key":"planned","label":"Planned"},{"key":"active","label":"Active"}]'),
  ('00000000-0000-4000-900b-000000000005', 'ret_retail_milestones', 'Retail Milestones', 'Retail programme milestones', '[{"key":"upcoming","label":"Upcoming"},{"key":"met","label":"Met"},{"key":"missed","label":"Missed"}]'),
  -- Store Development (2, collapsed)
  ('00000000-0000-4000-900b-000000000006', 'ret_site_selection', 'Site Selection', 'Store site selection register', '[{"key":"under_evaluation","label":"Under Evaluation"},{"key":"selected","label":"Selected"}]'),
  ('00000000-0000-4000-900b-000000000007', 'ret_store_development', 'Store Development', 'Lease, design, fit-out and opening readiness tracking', '[{"key":"lease","label":"Lease"},{"key":"design","label":"Design"},{"key":"fit_out","label":"Fit-Out"},{"key":"merchandising_setup","label":"Merchandising Setup"},{"key":"readiness","label":"Readiness"},{"key":"opening","label":"Opening"}]'),
  -- Merchandising (1, collapsed)
  ('00000000-0000-4000-900b-000000000008', 'ret_merchandising_readiness', 'Merchandising Launch Readiness', 'Category, product range, planogram and pricing readiness for launch', '[{"key":"categories_set","label":"Categories Set"},{"key":"product_range_set","label":"Product Range Set"},{"key":"planograms_set","label":"Planograms Set"},{"key":"ready","label":"Ready"}]'),
  -- Point of Sale (1, collapsed)
  ('00000000-0000-4000-900b-000000000009', 'ret_pos_implementation', 'POS Implementation', 'Point of sale hardware, software and payments implementation', '[{"key":"requirements","label":"Requirements"},{"key":"hardware","label":"Hardware"},{"key":"software","label":"Software"},{"key":"testing","label":"Testing"},{"key":"deployed","label":"Deployed"}]'),
  -- E-Commerce (1, collapsed)
  ('00000000-0000-4000-900b-00000000000a', 'ret_ecommerce_build', 'E-Commerce Build', 'Website/mobile, catalogue and payments build tracking', '[{"key":"build","label":"Build"},{"key":"catalogue_loaded","label":"Catalogue Loaded"},{"key":"payments_integrated","label":"Payments Integrated"},{"key":"testing","label":"Testing"},{"key":"launched","label":"Launched"}]'),
  -- Launch & Stabilisation (3)
  ('00000000-0000-4000-900b-00000000000b', 'ret_launch_plan', 'Launch Plan', 'Store/channel launch plan (including customer communications)', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-900b-00000000000c', 'ret_store_readiness', 'Store Readiness', 'Store launch readiness tracking', '[{"key":"not_ready","label":"Not Ready"},{"key":"ready","label":"Ready"}]'),
  ('00000000-0000-4000-900b-00000000000d', 'ret_hypercare_stabilisation', 'Hypercare & Stabilisation', 'Post-launch hypercare and stabilisation tracking', '[{"key":"hypercare","label":"Hypercare"},{"key":"stabilised","label":"Stabilised"}]')
) AS v(id, register_key, label, description, status_workflow)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, status_workflow = EXCLUDED.status_workflow,
  is_active = TRUE, updated_at = NOW();

INSERT INTO public.local_register_industry_packs (register_id, industry_pack_id)
SELECT lr.id, ip.id
FROM public.local_registers lr
JOIN public.industry_packs ip ON ip.industry_category_id = (SELECT id FROM public.industry_categories WHERE name = 'Retail')
WHERE lr.id::text LIKE '00000000-0000-4000-900b-%'
ON CONFLICT (register_id, industry_pack_id) DO NOTHING;

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), 'ret_reg_' || lr.register_key, lr.label, lr.description, '/platform/local-registers/' || lr.id::text,
  (SELECT id FROM public.menu_items WHERE menu_code = v.category_code AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
  2, v.sort_order, 'universal', 'list-checks', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('00000000-0000-4000-900b-000000000001','ret_cat_programme',1910),('00000000-0000-4000-900b-000000000002','ret_cat_programme',1911),
  ('00000000-0000-4000-900b-000000000003','ret_cat_programme',1912),('00000000-0000-4000-900b-000000000004','ret_cat_programme',1913),
  ('00000000-0000-4000-900b-000000000005','ret_cat_programme',1914),
  ('00000000-0000-4000-900b-000000000006','ret_cat_store_development',1920),('00000000-0000-4000-900b-000000000007','ret_cat_store_development',1921),
  ('00000000-0000-4000-900b-000000000008','ret_cat_merchandising',1930),
  ('00000000-0000-4000-900b-000000000009','ret_cat_pos',1940),
  ('00000000-0000-4000-900b-00000000000a','ret_cat_ecommerce',1950),
  ('00000000-0000-4000-900b-00000000000b','ret_cat_launch_stabilisation',1960),('00000000-0000-4000-900b-00000000000c','ret_cat_launch_stabilisation',1961),
  ('00000000-0000-4000-900b-00000000000d','ret_cat_launch_stabilisation',1962)
) AS v(register_id, category_code, sort_order)
JOIN public.local_registers lr ON lr.id = v.register_id::uuid
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, route_path = EXCLUDED.route_path, parent_menu_id = EXCLUDED.parent_menu_id,
  sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

SELECT public.grant_menu_role_group('ret_reg_%');

INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
SELECT DISTINCT lrip.industry_pack_id, mi.id
FROM public.local_register_industry_packs lrip
JOIN public.local_registers lr ON lr.id = lrip.register_id
JOIN public.menu_items mi ON mi.route_path = '/platform/local-registers/' || lr.id::text
WHERE lr.id::text LIKE '00000000-0000-4000-900b-%' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

DO $$
DECLARE v_registers INT;
BEGIN
  SELECT COUNT(*) INTO v_registers FROM public.local_registers WHERE id::text LIKE '00000000-0000-4000-900b-%';
  RAISE NOTICE 'v957: RET phase complete — % registers across 6 categories', v_registers;
END $$;

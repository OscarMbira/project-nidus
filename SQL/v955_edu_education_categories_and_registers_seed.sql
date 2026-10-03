-- ============================================================================
-- v955: Industry Capability Content Taxonomy — Phase 10 (EDU: Education)
-- ============================================================================
-- projectplan/v946_industry_capability_content_taxonomy_plan.md Phase 10.
-- Source: Documentation/Core_PM_and_Industry_Menu_Taxonomy.md Section 12, filtered through PRD
-- decision 0. 6 of 9 categories kept (Student Services, Teaching & Learning, Education Outcomes
-- dropped — ongoing operations).
-- Reuses the existing local_register_curriculum_development register for Curriculum's own
-- "Curriculum Design" leaf rather than recreating it.
-- UUID block: 9009. Prerequisites: v931, v932, v946, v946c.
-- ============================================================================

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.menu_code, v.menu_label, v.menu_description, NULL, NULL, 1, v.sort_order, 'universal', 'graduation-cap', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('edu_cat_programme', 'Education Programme', 'Overview of the education programme', 1700),
  ('edu_cat_curriculum', 'Curriculum', 'Curriculum development activities', 1701),
  ('edu_cat_academic_programmes', 'Academic Programmes', 'Academic programme launch activities', 1702),
  ('edu_cat_digital_learning', 'Digital Learning', 'Digital learning implementation', 1703),
  ('edu_cat_facilities', 'Facilities', 'Education facility delivery', 1704),
  ('edu_cat_research', 'Research', 'Research project activities', 1705)
) AS v(menu_code, menu_label, menu_description, sort_order)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, menu_description = EXCLUDED.menu_description,
  is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

SELECT public.grant_menu_role_group('edu_cat_%');

INSERT INTO public.local_registers (id, register_key, label, icon, description, scope_level, account_id, status_workflow, is_system_defined, is_active, created_at, updated_at)
SELECT v.id::uuid, v.register_key, v.label, 'list-checks', v.description, 'project', NULL, v.status_workflow::jsonb, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  -- Education Programme (4)
  ('00000000-0000-4000-9009-000000000001', 'edu_programme_overview', 'Programme Overview', 'Education programme overview', '[{"key":"draft","label":"Draft"},{"key":"published","label":"Published"}]'),
  ('00000000-0000-4000-9009-000000000002', 'edu_institutions', 'Institutions', 'Participating institution register', '[{"key":"engaged","label":"Engaged"},{"key":"active","label":"Active"}]'),
  ('00000000-0000-4000-9009-000000000003', 'edu_faculties_departments', 'Faculties / Departments', 'Faculty/department register', '[{"key":"active","label":"Active"},{"key":"inactive","label":"Inactive"}]'),
  ('00000000-0000-4000-9009-000000000004', 'edu_education_milestones', 'Education Milestones', 'Education programme milestones', '[{"key":"upcoming","label":"Upcoming"},{"key":"met","label":"Met"},{"key":"missed","label":"Missed"}]'),
  -- Curriculum (3 — Curriculum Design reused from existing local_register_curriculum_development)
  ('00000000-0000-4000-9009-000000000005', 'edu_programmes', 'Programmes', 'Academic programme register', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9009-000000000006', 'edu_courses', 'Courses', 'Course register', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-9009-000000000007', 'edu_learning_outcomes', 'Learning Outcomes', 'Learning outcome register', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  -- Academic Programmes (1, collapsed)
  ('00000000-0000-4000-9009-000000000008', 'edu_programme_register', 'Programme Register', 'Academic programme requirements, delivery plan and assessment strategy tracking', '[{"key":"requirements","label":"Requirements"},{"key":"delivery_plan","label":"Delivery Plan"},{"key":"assessment_strategy","label":"Assessment Strategy"},{"key":"review","label":"Review"}]'),
  -- Digital Learning (2, collapsed)
  ('00000000-0000-4000-9009-000000000009', 'edu_lms_implementation', 'LMS Implementation', 'Learning management system implementation', '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"live","label":"Live"}]'),
  ('00000000-0000-4000-9009-00000000000a', 'edu_digital_content', 'Digital Content', 'Digital content, online course and virtual classroom register', '[{"key":"planned","label":"Planned"},{"key":"in_development","label":"In Development"},{"key":"published","label":"Published"}]'),
  -- Facilities (1, collapsed)
  ('00000000-0000-4000-9009-00000000000b', 'edu_facility_delivery', 'Facility Delivery', 'Classroom, laboratory, library, accommodation and ICT facility delivery', '[{"key":"planned","label":"Planned"},{"key":"in_progress","label":"In Progress"},{"key":"ready","label":"Ready"}]'),
  -- Research (3)
  ('00000000-0000-4000-9009-00000000000c', 'edu_research_projects', 'Research Projects', 'Research project register', '[{"key":"proposed","label":"Proposed"},{"key":"active","label":"Active"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-9009-00000000000d', 'edu_grants', 'Grants', 'Research grant register', '[{"key":"applied","label":"Applied"},{"key":"awarded","label":"Awarded"}]'),
  ('00000000-0000-4000-9009-00000000000e', 'edu_ethics_approval', 'Ethics Approval', 'Research ethics approval register', '[{"key":"submitted","label":"Submitted"},{"key":"approved","label":"Approved"}]')
) AS v(id, register_key, label, description, status_workflow)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, status_workflow = EXCLUDED.status_workflow,
  is_active = TRUE, updated_at = NOW();

INSERT INTO public.local_register_industry_packs (register_id, industry_pack_id)
SELECT lr.id, ip.id
FROM public.local_registers lr
JOIN public.industry_packs ip ON ip.industry_category_id = (SELECT id FROM public.industry_categories WHERE name = 'Education')
WHERE lr.id::text LIKE '00000000-0000-4000-9009-%'
ON CONFLICT (register_id, industry_pack_id) DO NOTHING;

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), 'edu_reg_' || lr.register_key, lr.label, lr.description, '/platform/local-registers/' || lr.id::text,
  (SELECT id FROM public.menu_items WHERE menu_code = v.category_code AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
  2, v.sort_order, 'universal', 'list-checks', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('00000000-0000-4000-9009-000000000001','edu_cat_programme',1710),('00000000-0000-4000-9009-000000000002','edu_cat_programme',1711),
  ('00000000-0000-4000-9009-000000000003','edu_cat_programme',1712),('00000000-0000-4000-9009-000000000004','edu_cat_programme',1713),
  ('00000000-0000-4000-9009-000000000005','edu_cat_curriculum',1720),('00000000-0000-4000-9009-000000000006','edu_cat_curriculum',1721),
  ('00000000-0000-4000-9009-000000000007','edu_cat_curriculum',1722),
  ('00000000-0000-4000-9009-000000000008','edu_cat_academic_programmes',1730),
  ('00000000-0000-4000-9009-000000000009','edu_cat_digital_learning',1740),('00000000-0000-4000-9009-00000000000a','edu_cat_digital_learning',1741),
  ('00000000-0000-4000-9009-00000000000b','edu_cat_facilities',1750),
  ('00000000-0000-4000-9009-00000000000c','edu_cat_research',1760),('00000000-0000-4000-9009-00000000000d','edu_cat_research',1761),
  ('00000000-0000-4000-9009-00000000000e','edu_cat_research',1762)
) AS v(register_id, category_code, sort_order)
JOIN public.local_registers lr ON lr.id = v.register_id::uuid
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, route_path = EXCLUDED.route_path, parent_menu_id = EXCLUDED.parent_menu_id,
  sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

SELECT public.grant_menu_role_group('edu_reg_%');

INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
SELECT DISTINCT lrip.industry_pack_id, mi.id
FROM public.local_register_industry_packs lrip
JOIN public.local_registers lr ON lr.id = lrip.register_id
JOIN public.menu_items mi ON mi.route_path = '/platform/local-registers/' || lr.id::text
WHERE lr.id::text LIKE '00000000-0000-4000-9009-%' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

DO $$
DECLARE v_registers INT;
BEGIN
  SELECT COUNT(*) INTO v_registers FROM public.local_registers WHERE id::text LIKE '00000000-0000-4000-9009-%';
  RAISE NOTICE 'v955: EDU phase complete — % registers across 6 categories', v_registers;
END $$;

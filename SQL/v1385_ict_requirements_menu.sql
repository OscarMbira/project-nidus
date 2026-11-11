-- ============================================================================
-- v1385: Information Technology → Requirements menu category
-- ============================================================================
-- PRD / plan v1338, Slice 3 — decision D7 (part 1).
--   * New category "Requirements" after Technology Delivery, before Architecture (later
--     categories move down one place — explicit values, so re-running does not shift them again).
--   * Items: All Requirements · Business · Functional · Non-Functional Requirements (the same
--     register, opened filtered with ?category=) · Traceability.
--     Requirements Specification, Use Cases and Requirement Changes are added by v1386–v1389.
--   * The Technology Delivery → Requirements link (ict_reuse_requirements, v949) is hidden.
--     Note: re-running v949 would show it again; re-run this file afterwards.
-- Platform only — the Simulator has no IT pack menu. Role grants as the other IT items (v946c).
-- Menu taxonomy: Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §6 (rule 70).
-- Idempotent.
-- ============================================================================

-- ── 1. Category ─────────────────────────────────────────────────────────────────
INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
VALUES (gen_random_uuid(), 'ict_cat_requirements', 'Requirements', 'Business, functional and non-functional requirements, use cases and traceability', NULL, NULL, 1, 901, 'universal', 'cpu', TRUE, TRUE, NOW(), NOW())
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, menu_description = EXCLUDED.menu_description, sort_order = EXCLUDED.sort_order,
  is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

UPDATE public.menu_items m
SET sort_order = v.sort_order, updated_at = NOW()
FROM (VALUES
  ('ict_cat_architecture', 902), ('ict_cat_design', 903), ('ict_cat_environments', 904),
  ('ict_cat_development', 905), ('ict_cat_interfaces', 906), ('ict_cat_data', 907),
  ('ict_cat_testing', 908), ('ict_cat_technical_debt', 909), ('ict_cat_cybersecurity', 910),
  ('ict_cat_production_readiness', 911)
) AS v(menu_code, sort_order)
WHERE m.menu_code = v.menu_code;

SELECT public.grant_menu_role_group('ict_cat_requirements');

-- ── 2. Items ────────────────────────────────────────────────────────────────────
INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.menu_code, v.menu_label, v.menu_description, v.route_path,
       (SELECT id FROM public.menu_items WHERE menu_code = 'ict_cat_requirements' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, v.sort_order, 'universal', 'list-checks', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('ict_req_all',            'All Requirements',            'Every requirement for this project',                   '/platform/scope/requirements',                         926),
  ('ict_req_business',       'Business Requirements',       'Requirements in the Business category',                '/platform/scope/requirements?category=business',       927),
  ('ict_req_functional',     'Functional Requirements',     'Requirements in the Functional category',              '/platform/scope/requirements?category=functional',     928),
  ('ict_req_non_functional', 'Non-Functional Requirements', 'Requirements in the Non-functional category, by area', '/platform/scope/requirements?category=non_functional', 929),
  ('ict_req_traceability',   'Traceability',                'Requirements linked to deliverables, WBS and tests',   '/platform/scope/traceability',                         931)
) AS v(menu_code, menu_label, menu_description, route_path, sort_order)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, menu_description = EXCLUDED.menu_description, route_path = EXCLUDED.route_path,
  parent_menu_id = EXCLUDED.parent_menu_id, sort_order = EXCLUDED.sort_order,
  is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

SELECT public.grant_menu_role_group('ict_req_%');

INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
SELECT ip.id, mi.id
FROM public.menu_items mi
JOIN public.industry_packs ip ON ip.industry_category_id = (
  SELECT id FROM public.industry_categories WHERE name = 'Information Technology'
)
WHERE mi.menu_code LIKE 'ict_req_%'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

-- ── 3. Hide the old Technology Delivery → Requirements link ─────────────────────
UPDATE public.menu_items
SET is_visible = FALSE, is_active = FALSE, updated_at = NOW()
WHERE menu_code = 'ict_reuse_requirements';

-- ── Check ────────────────────────────────────────────────────────────────────────
SELECT mi.sort_order, mi.menu_code, mi.menu_label, mi.route_path, mi.is_visible,
       (SELECT count(*) FROM public.role_menu_items rmi WHERE rmi.menu_item_id = mi.id AND rmi.can_view AND rmi.is_active
          AND COALESCE(rmi.is_deleted, FALSE) = FALSE) AS roles
FROM public.menu_items mi
WHERE mi.menu_code = 'ict_reuse_requirements'
   OR mi.parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'ict_cat_requirements' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1)
ORDER BY mi.sort_order;

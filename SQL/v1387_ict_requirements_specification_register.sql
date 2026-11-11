-- ============================================================================
-- v1387: Information Technology → Requirements → Requirements Specification (document register)
-- ============================================================================
-- PRD / plan v1338, Slice 5 — decisions D1, D1b, D2, D3.
-- One document register with a Document Type (Business Requirements Document / Functional
-- Requirements Specification) on the register-document engine: tabs, sign-off, complete-document
-- Word / PDF with contents page, templates, Audit tab, exports.
-- The requirement chapters are NOT typed: "linked records" fields with a core source
-- (value "core:requirements") show this project's rows of the Requirements register as tables —
--   Business (category business), Functional (functional), Non-Functional (non_functional, one table
--   per area), Other (technical, regulatory, other) — and the Use Cases chapter shows the project's
--   Use Cases records (v1386). Every chapter appears only when it has items (D1b).
-- Register id 00000000-0000-4000-9003-000000000028 (IT block). Standard document statuses (Draft,
-- In Review, Approved, Superseded — In Review / Approved are set by sign-off).
-- Prerequisites: v1318 (is_document), v1326 (table), v1332 (linked_records), v1384, v1386.
-- Idempotent.
-- ============================================================================

INSERT INTO public.local_registers (id, register_key, label, icon, description, scope_level, account_id, status_workflow, is_system_defined, is_active, is_document, created_at, updated_at)
VALUES (
  '00000000-0000-4000-9003-000000000028', 'ict_requirements_specification', 'Requirements Specification', 'list-checks',
  'Business Requirements Document or Functional Requirements Specification — signed, exported as a complete document',
  'project', NULL,
  '[{"key":"draft","label":"Draft"},{"key":"in_review","label":"In Review"},{"key":"approved","label":"Approved"},{"key":"superseded","label":"Superseded"}]'::jsonb,
  TRUE, TRUE, TRUE, NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, status_workflow = EXCLUDED.status_workflow,
  is_document = TRUE, is_active = TRUE, updated_at = NOW();

INSERT INTO public.local_register_industry_packs (register_id, industry_pack_id)
SELECT '00000000-0000-4000-9003-000000000028'::uuid, ip.id
FROM public.industry_packs ip
WHERE ip.industry_category_id = (SELECT id FROM public.industry_categories WHERE name = 'Information Technology')
ON CONFLICT (register_id, industry_pack_id) DO NOTHING;

INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT '00000000-0000-4000-9003-000000000028'::uuid, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM (VALUES
  -- Details (with Title, Description, Status). The first four are the list columns.
  ('document_type', 'Document Type', 'dropdown', true, 0, NULL,
    '[{"value":"brd","label":"Business Requirements Document"},{"value":"frs","label":"Functional Requirements Specification"}]'),
  ('document_reference', 'Document Reference', 'text', false, 1, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 2, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 3, NULL, NULL),
  ('business_owner', 'Business Owner', 'user_picker', false, 4, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 5, NULL, NULL),

  -- 1. Introduction
  ('purpose', 'Purpose', 'long_text', false, 10, 'Introduction', NULL),
  ('requirements_overview', 'Requirements Overview', 'long_text', false, 11, 'Introduction', NULL),
  ('in_scope', 'In Scope', 'multi_line', false, 12, 'Introduction', NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', false, 13, 'Introduction', NULL),

  -- 2. Summary
  ('summary_of_requirements', 'Summary of Requirements', 'long_text', false, 20, 'Summary', NULL),
  ('assumptions', 'Assumptions', 'multi_line', false, 21, 'Summary', NULL),
  ('constraints', 'Constraints', 'multi_line', false, 22, 'Summary', NULL),
  ('dependencies', 'Dependencies', 'multi_line', false, 23, 'Summary', NULL),

  -- 3–6. Requirement chapters — shown from the Requirements register (core source), never typed
  ('business_requirements', 'Business Requirements', 'linked_records', false, 30, 'Business Requirements',
    '[{"value":"core:requirements","label":"Requirements register","category":"business"}]'),
  ('functional_requirements', 'Functional Requirements', 'linked_records', false, 40, 'Functional Requirements',
    '[{"value":"core:requirements","label":"Requirements register","category":"functional"}]'),
  ('non_functional_requirements', 'Non-Functional Requirements', 'linked_records', false, 50, 'Non-Functional Requirements',
    '[{"value":"core:requirements","label":"Requirements register","category":"non_functional","group_by":"nfr_area_key"}]'),
  ('other_requirements', 'Technical, Regulatory and Other Requirements', 'linked_records', false, 55, 'Other Requirements',
    '[{"value":"core:requirements","label":"Requirements register","category":"technical,regulatory,other"}]'),

  -- 7. Use cases — this project's Use Cases records (v1386)
  ('use_cases', 'Use Cases', 'linked_records', false, 60, 'Use Cases',
    '[{"value":"ict_use_cases","label":"Use Cases"}]'),

  -- Glossary & Appendices / Document Control (placed by the document engine)
  ('glossary', 'Glossary of Terms', 'table', false, 90, 'Glossary & Appendices',
    '[{"value":"term","label":"Term"},{"value":"definition","label":"Definition"}]'),
  ('appendices', 'Appendices', 'table', false, 91, 'Glossary & Appendices',
    '[{"value":"title","label":"Title"},{"value":"reference","label":"Reference / Link"}]'),
  ('version_history', 'Version History', 'table', false, 100, 'Document Control',
    '[{"value":"version","label":"Version"},{"type":"date","label":"Date","value":"date"},{"value":"author","label":"Author"},{"value":"change","label":"Change"}]'),
  ('related_documents', 'Related Documents', 'multi_line', false, 101, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── Menu: IT → Requirements → Requirements Specification (first item) ───────────
INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), 'ict_req_specification', 'Requirements Specification',
       'Business Requirements Document or Functional Requirements Specification',
       '/platform/local-registers/00000000-0000-4000-9003-000000000028',
       (SELECT id FROM public.menu_items WHERE menu_code = 'ict_cat_requirements' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, 925, 'universal', 'list-checks', TRUE, TRUE, NOW(), NOW()
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, menu_description = EXCLUDED.menu_description, route_path = EXCLUDED.route_path,
  parent_menu_id = EXCLUDED.parent_menu_id, sort_order = EXCLUDED.sort_order,
  is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

SELECT public.grant_menu_role_group('ict_req_specification');

INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
SELECT ip.id, mi.id
FROM public.menu_items mi
JOIN public.industry_packs ip ON ip.industry_category_id = (SELECT id FROM public.industry_categories WHERE name = 'Information Technology')
WHERE mi.menu_code = 'ict_req_specification' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

DO $$
DECLARE
  v_fields INT;
  v_groups INT;
BEGIN
  SELECT COUNT(*), COUNT(DISTINCT field_group) FILTER (WHERE field_group IS NOT NULL)
    INTO v_fields, v_groups
  FROM public.local_register_fields
  WHERE register_id = '00000000-0000-4000-9003-000000000028'::uuid;
  RAISE NOTICE 'v1387: ict_requirements_specification has % fields and % tabs (expected 23 fields, 9 tabs)', v_fields, v_groups;
END $$;

NOTIFY pgrst, 'reload schema';

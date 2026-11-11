-- ============================================================================
-- v1386: Information Technology → Requirements → Use Cases register
-- ============================================================================
-- PRD / plan v1338, Slice 4 — decisions D6, D6b.
-- One record per use case. Main and alternative / exception flows are step tables
-- (Step | Actor | Action) so they search, sort and export as numbered steps (rules 67.1, 38.1).
-- The Requirements Specification (v1387) shows this project's use cases in its Use Cases chapter.
-- First four fields are the list columns: Use Case ID, Primary Actor, Priority, Frequency of Use.
-- Register id 00000000-0000-4000-9003-000000000027 (IT block). Platform menu only (the Simulator
-- reads system registers from public). Idempotent.
-- ============================================================================

INSERT INTO public.local_registers (id, register_key, label, icon, description, scope_level, account_id, status_workflow, is_system_defined, is_active, created_at, updated_at)
VALUES (
  '00000000-0000-4000-9003-000000000027', 'ict_use_cases', 'Use Cases', 'list-checks',
  'How users and systems interact with the solution, step by step',
  'project', NULL,
  '[{"key":"draft","label":"Draft"},{"key":"in_review","label":"In Review"},{"key":"approved","label":"Approved"},{"key":"retired","label":"Retired"}]'::jsonb,
  TRUE, TRUE, NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, status_workflow = EXCLUDED.status_workflow,
  is_active = TRUE, updated_at = NOW();

INSERT INTO public.local_register_industry_packs (register_id, industry_pack_id)
SELECT '00000000-0000-4000-9003-000000000027'::uuid, ip.id
FROM public.industry_packs ip
WHERE ip.industry_category_id = (SELECT id FROM public.industry_categories WHERE name = 'Information Technology')
ON CONFLICT (register_id, industry_pack_id) DO NOTHING;

INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT '00000000-0000-4000-9003-000000000027'::uuid, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM (VALUES
  -- Details (with Title, Description, Status). The first four are the list columns.
  ('use_case_ref', 'Use Case ID', 'text', true, 0, NULL, NULL),
  ('primary_actor', 'Primary Actor', 'text', true, 1, NULL, NULL),
  ('priority', 'Priority (MoSCoW)', 'dropdown', false, 2, NULL,
    '[{"value":"must","label":"Must"},{"value":"should","label":"Should"},{"value":"could","label":"Could"},{"value":"wont","label":"Won''t"}]'),
  ('frequency_of_use', 'Frequency of Use', 'dropdown', false, 3, NULL,
    '[{"value":"many_daily","label":"Many times a day"},{"value":"daily","label":"Daily"},{"value":"weekly","label":"Weekly"},{"value":"monthly","label":"Monthly"},{"value":"occasionally","label":"Occasionally"}]'),

  -- Actors & Conditions
  ('secondary_actors', 'Secondary Actors', 'multi_line', false, 4, 'Actors & Conditions', NULL),
  ('trigger_event', 'Trigger', 'long_text', false, 5, 'Actors & Conditions', NULL),
  ('preconditions', 'Preconditions', 'multi_line', false, 6, 'Actors & Conditions', NULL),
  ('postconditions', 'Postconditions (Outcome)', 'multi_line', false, 7, 'Actors & Conditions', NULL),

  -- Flows (step tables)
  ('main_flow', 'Main Flow', 'table', false, 8, 'Flows',
    '[{"value":"step","label":"Step"},{"value":"actor","label":"Actor"},{"value":"action","label":"Action"}]'),
  ('alternative_flows', 'Alternative / Exception Flows', 'table', false, 9, 'Flows',
    '[{"value":"step","label":"Step"},{"value":"actor","label":"Actor"},{"value":"action","label":"Action"}]'),

  -- Rules & Links
  ('business_rules', 'Business Rules', 'multi_line', false, 10, 'Rules & Links', NULL),
  ('related_requirements', 'Related Requirements', 'multi_line', false, 11, 'Rules & Links', NULL),
  ('related_screens_reports', 'Related Screens / Reports', 'multi_line', false, 12, 'Rules & Links', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── Menu: IT → Requirements → Use Cases ─────────────────────────────────────────
INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), 'ict_req_use_cases', 'Use Cases', 'How users and systems interact with the solution, step by step',
       '/platform/local-registers/00000000-0000-4000-9003-000000000027',
       (SELECT id FROM public.menu_items WHERE menu_code = 'ict_cat_requirements' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, 930, 'universal', 'list-checks', TRUE, TRUE, NOW(), NOW()
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, menu_description = EXCLUDED.menu_description, route_path = EXCLUDED.route_path,
  parent_menu_id = EXCLUDED.parent_menu_id, sort_order = EXCLUDED.sort_order,
  is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

SELECT public.grant_menu_role_group('ict_req_use_cases');

INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
SELECT ip.id, mi.id
FROM public.menu_items mi
JOIN public.industry_packs ip ON ip.industry_category_id = (SELECT id FROM public.industry_categories WHERE name = 'Information Technology')
WHERE mi.menu_code = 'ict_req_use_cases' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

DO $$
DECLARE
  v_fields INT;
  v_groups INT;
BEGIN
  SELECT COUNT(*), COUNT(DISTINCT field_group) FILTER (WHERE field_group IS NOT NULL)
    INTO v_fields, v_groups
  FROM public.local_register_fields
  WHERE register_id = '00000000-0000-4000-9003-000000000027'::uuid;
  RAISE NOTICE 'v1386: ict_use_cases has % fields and % tabs (expected 13 fields, 3 tabs)', v_fields, v_groups;
END $$;

NOTIFY pgrst, 'reload schema';

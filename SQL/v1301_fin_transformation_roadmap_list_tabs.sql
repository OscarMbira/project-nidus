-- ============================================================================
-- v1301: Transformation Roadmap — five list fields, one tab each
-- ============================================================================
-- Owner request 2026-10-21: on the Transformation Roadmap register
-- (fin_transformation_roadmap, 00000000-0000-4000-9001-000000000002) make these fields
-- multi-value (v1299 'multi_line' type — @nidus/ui MultiLineListInput) and give each its own tab:
--   release_wave, workstream, capability_delivered, key_deliverables, dependencies
--
-- Tabs follow each field's display_order, so the form reads:
--   Details · Release / Wave · Workstream · Schedule & Progress · Business Capability Delivered ·
--   Key Deliverables · Dependencies · Audit details
-- The old "Deliverables" tab disappears (it has no fields left).
-- These were 'text' fields, so any existing values are already strings and become the first
-- list item. Prerequisite: v1299 (multi_line type). Idempotent.
-- ============================================================================

UPDATE public.local_register_fields f
SET field_type = 'multi_line', field_group = v.field_group, updated_at = NOW()
FROM (VALUES
  ('release_wave', 'Release / Wave'),
  ('workstream', 'Workstream'),
  ('capability_delivered', 'Business Capability Delivered'),
  ('key_deliverables', 'Key Deliverables'),
  ('dependencies', 'Dependencies')
) AS v(field_key, field_group)
WHERE f.register_id = '00000000-0000-4000-9001-000000000002'::uuid
  AND f.field_key = v.field_key;

DO $$
DECLARE
  v_multi INT;
BEGIN
  SELECT COUNT(*) INTO v_multi FROM public.local_register_fields
  WHERE register_id = '00000000-0000-4000-9001-000000000002'::uuid AND field_type = 'multi_line';
  RAISE NOTICE 'v1301: Transformation Roadmap has % multi-line fields on their own tabs (expected 5)', v_multi;
END $$;

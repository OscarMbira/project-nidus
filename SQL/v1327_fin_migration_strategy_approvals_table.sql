-- ============================================================================
-- v1327: Migration Strategy — "Approvals" captured as a table (Name | Role | Date)
-- ============================================================================
-- Owner request 2026-10-24: capture "Approvals (Name – Role – Date)" in a tabular format, like
-- Version History (v1326). This supersedes v1318 PRD d.1 #8 / story 20 ("drop Approvals"): the
-- field is kept alongside the document's built-in sign-off, and v1321 no longer deletes it.
--
--   * field_type 'table' (v1326) with columns Name | Role | Date (date picker);
--   * labelled "Sign-Off" (owner, 2026-10-24) on its own "Sign-Off" tab, just before Document
--     Control (v1321 puts Version History at 100). On the record's view page this tab sits next to
--     the built-in "Sign-off" tab (the signing panel) — different tabs, by owner choice;
--   * the complete document export shows it as a "Sign-Off" section with a table.
-- The field key stays 'approvals', so existing values are kept.
-- Existing "Name – Role – Date" lines are read as table rows without conversion (v1326).
-- If an earlier run of v1321 removed the field, it is created again here.
--
-- Prerequisites: v1316, v1326 ('table' field type). Run after v1321. Idempotent.
-- ============================================================================

INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, 'approvals', 'Sign-Off', 'table', false, 99, 'Sign-Off',
       '[{"value":"name","label":"Name"},{"value":"role","label":"Role"},{"value":"date","label":"Date","type":"date"}]'::jsonb
FROM public.local_registers lr
WHERE lr.register_key = 'fin_migration_strategy'
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.local_register_fields f
  JOIN public.local_registers lr ON lr.id = f.register_id
  WHERE lr.register_key = 'fin_migration_strategy'
    AND f.field_key = 'approvals'
    AND f.field_type = 'table';
  RAISE NOTICE 'v1327: % Migration Strategy Sign-Off table field(s) (expected 1, or more if accounts hold copies)', v_count;
END $$;

NOTIFY pgrst, 'reload schema';

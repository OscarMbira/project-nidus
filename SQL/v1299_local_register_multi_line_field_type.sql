-- ============================================================================
-- v1299: Local Register Engine — 'multi_line' field type + Transformation Overview list fields
-- ============================================================================
-- Adds a 'multi_line' field type to local_register_fields (public + sim, engine parity rule
-- 34.1). The generic register form renders it with @nidus/ui MultiLineListInput (CLAUDE.md
-- rule 67: Card / Table-List toggle, inline edit, confirm-before-delete) and stores the value
-- as a newline-joined string in local_register_records.field_values.
--
-- Then switches six Transformation Overview fields (fin_transformation_overview,
-- 00000000-0000-4000-9001-000000000001) to multi_line — owner request 2026-10-21:
--   strategic_objectives, expected_annual_benefit, in_scope, out_of_scope,
--   regulatory_drivers, key_dependencies
-- expected_annual_benefit was 'currency'; any existing numeric value is converted to text so
-- it shows as the first list item rather than disappearing.
-- Idempotent.
-- ============================================================================

-- ── 1. Allow 'multi_line' in both schemas (the original CHECK was unnamed — look it up) ──

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE t.relname = 'local_register_fields'
      AND n.nspname IN ('public', 'sim')
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%field_type%'
  LOOP
    EXECUTE format('ALTER TABLE %I.local_register_fields DROP CONSTRAINT %I', r.schema_name, r.conname);
  END LOOP;
END $$;

ALTER TABLE public.local_register_fields
  ADD CONSTRAINT chk_local_register_fields_field_type CHECK (field_type IN
    ('text', 'multi_line', 'number', 'date', 'dropdown', 'boolean', 'user_picker', 'currency'));

ALTER TABLE sim.local_register_fields
  ADD CONSTRAINT chk_sim_local_register_fields_field_type CHECK (field_type IN
    ('text', 'multi_line', 'number', 'date', 'dropdown', 'boolean', 'user_picker', 'currency'));

-- ── 2. Transformation Overview: switch the six fields to multi_line ─────────────────

UPDATE public.local_register_fields
SET field_type = 'multi_line',
    field_label = CASE WHEN field_key = 'expected_annual_benefit' THEN 'Expected Annual Benefits' ELSE field_label END,
    updated_at = NOW()
WHERE register_id = '00000000-0000-4000-9001-000000000001'::uuid
  AND field_key IN ('strategic_objectives', 'expected_annual_benefit', 'in_scope', 'out_of_scope',
                    'regulatory_drivers', 'key_dependencies');

-- Existing numeric benefit values -> text, so they become the first list item.
UPDATE public.local_register_records
SET field_values = jsonb_set(field_values, '{expected_annual_benefit}',
                             to_jsonb(field_values->>'expected_annual_benefit')),
    updated_at = NOW()
WHERE register_id = '00000000-0000-4000-9001-000000000001'::uuid
  AND jsonb_typeof(field_values->'expected_annual_benefit') = 'number';

DO $$
DECLARE
  v_multi INT;
BEGIN
  SELECT COUNT(*) INTO v_multi FROM public.local_register_fields
  WHERE register_id = '00000000-0000-4000-9001-000000000001'::uuid AND field_type = 'multi_line';
  RAISE NOTICE 'v1299: Transformation Overview has % multi-line fields (expected 6)', v_multi;
END $$;

NOTIFY pgrst, 'reload schema';

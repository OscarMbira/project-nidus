-- =============================================================================
-- v815: Per-tier label/type overrides for shared form template fields
-- Plan: projectplan/v815_form_template_tier_label_type_override_plan.md (Phase 1)
-- Prerequisites: v758 (form_template_field_overrides), v810 (is_required),
--                v812 (scope_entity_type/scope_entity_id tiering)
--
-- NULL = inherit whatever the chain resolved so far (ultimately the master schema's
-- own field.label/field.type/field.options). Same nullable-override pattern as
-- is_required — no ratchet: closest tier's non-null value always wins (decision 2).
-- =============================================================================

ALTER TABLE public.form_template_field_overrides
    ADD COLUMN IF NOT EXISTS label_override TEXT NULL,
    ADD COLUMN IF NOT EXISTS field_type_override TEXT NULL,
    ADD COLUMN IF NOT EXISTS options_override JSONB NULL;

ALTER TABLE sim.form_template_field_overrides
    ADD COLUMN IF NOT EXISTS label_override TEXT NULL,
    ADD COLUMN IF NOT EXISTS field_type_override TEXT NULL,
    ADD COLUMN IF NOT EXISTS options_override JSONB NULL;

COMMENT ON COLUMN public.form_template_field_overrides.label_override IS
    'NULL = inherit the label resolved so far (master schema, or an ancestor tier''s own override); a value replaces it for this scope only.';
COMMENT ON COLUMN public.form_template_field_overrides.field_type_override IS
    'NULL = inherit the type resolved so far; a value (text/textarea/date/number/money/select) replaces it for this scope only.';
COMMENT ON COLUMN public.form_template_field_overrides.options_override IS
    'Only meaningful when field_type_override = ''select''. Array of option strings, mirrors form_template_field_additions.field_definition.options shape.';

COMMENT ON COLUMN sim.form_template_field_overrides.label_override IS
    'NULL = inherit the label resolved so far (master schema, or an ancestor tier''s own override); a value replaces it for this scope only.';
COMMENT ON COLUMN sim.form_template_field_overrides.field_type_override IS
    'NULL = inherit the type resolved so far; a value (text/textarea/date/number/money/select) replaces it for this scope only.';
COMMENT ON COLUMN sim.form_template_field_overrides.options_override IS
    'Only meaningful when field_type_override = ''select''. Array of option strings, mirrors form_template_field_additions.field_definition.options shape.';

-- database_tables registry refresh (table already registered in v758; description updated
-- to reflect the broadened scope of what this table now overrides)
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('form_template_field_overrides', 'Per-organisation/per-tier enable/disable, required, label, and type overrides for shared form template fields (Platform).', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('sim.form_template_field_overrides', 'Per-organisation/per-tier enable/disable, required, label, and type overrides for shared form template fields (Simulator sim schema).', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v815_form_template_field_label_type_override.sql applied';
END $$;

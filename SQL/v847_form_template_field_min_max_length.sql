-- =============================================================================
-- v847: Min/max character length overrides on form_template_field_overrides
-- Plan: projectplan/v847_form_field_min_max_length_plan.md
-- Prerequisites: v813 (ratchet trigger), v815 (label/type override columns)
--
-- NULL = inherit the length resolved so far (master schema field.minLength /
-- field.maxLength, or an ancestor tier's override). Descendants may only tighten:
-- raise min, lower max. Applies to text/textarea at submit time in the app.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Columns (public + sim)
-- -----------------------------------------------------------------------------
ALTER TABLE public.form_template_field_overrides
    ADD COLUMN IF NOT EXISTS min_length_override INTEGER NULL,
    ADD COLUMN IF NOT EXISTS max_length_override INTEGER NULL;

ALTER TABLE sim.form_template_field_overrides
    ADD COLUMN IF NOT EXISTS min_length_override INTEGER NULL,
    ADD COLUMN IF NOT EXISTS max_length_override INTEGER NULL;

ALTER TABLE public.form_template_field_overrides
    DROP CONSTRAINT IF EXISTS form_template_field_overrides_length_bounds_chk;
ALTER TABLE public.form_template_field_overrides
    ADD CONSTRAINT form_template_field_overrides_length_bounds_chk
    CHECK (
        (min_length_override IS NULL OR min_length_override >= 0)
        AND (max_length_override IS NULL OR max_length_override >= 0)
        AND (
            min_length_override IS NULL
            OR max_length_override IS NULL
            OR max_length_override >= min_length_override
        )
    );

ALTER TABLE sim.form_template_field_overrides
    DROP CONSTRAINT IF EXISTS form_template_field_overrides_length_bounds_chk;
ALTER TABLE sim.form_template_field_overrides
    ADD CONSTRAINT form_template_field_overrides_length_bounds_chk
    CHECK (
        (min_length_override IS NULL OR min_length_override >= 0)
        AND (max_length_override IS NULL OR max_length_override >= 0)
        AND (
            min_length_override IS NULL
            OR max_length_override IS NULL
            OR max_length_override >= min_length_override
        )
    );

COMMENT ON COLUMN public.form_template_field_overrides.min_length_override IS
    'NULL = inherit min length resolved so far; a non-null value tightens (must be >= ancestor effective min).';
COMMENT ON COLUMN public.form_template_field_overrides.max_length_override IS
    'NULL = inherit max length resolved so far; a non-null value tightens (must be <= ancestor effective max).';
COMMENT ON COLUMN sim.form_template_field_overrides.min_length_override IS
    'NULL = inherit min length resolved so far; a non-null value tightens (must be >= ancestor effective min).';
COMMENT ON COLUMN sim.form_template_field_overrides.max_length_override IS
    'NULL = inherit max length resolved so far; a non-null value tightens (must be <= ancestor effective max).';

-- -----------------------------------------------------------------------------
-- public: extend ratchet trigger with length tighten-only rules
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_form_template_field_overrides_ratchet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ancestor_required BOOLEAN;
    v_ancestor_min INTEGER;
    v_ancestor_max INTEGER;
BEGIN
    IF NEW.min_length_override IS NOT NULL
       AND NEW.max_length_override IS NOT NULL
       AND NEW.max_length_override < NEW.min_length_override THEN
        RAISE EXCEPTION 'max_length_override (%) cannot be less than min_length_override (%) for field "%.%"',
            NEW.max_length_override, NEW.min_length_override, NEW.section_key, NEW.field_key;
    END IF;

    -- The org-wide default row itself has no ancestor to ratchet against.
    IF NEW.scope_entity_type = 'account' THEN
        RETURN NEW;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.form_template_field_overrides o
        WHERE o.organisation_id = NEW.organisation_id
          AND o.template_id = NEW.template_id
          AND o.section_key = NEW.section_key
          AND o.field_key = NEW.field_key
          AND o.is_required = TRUE
          AND (
              o.scope_entity_type = 'account'
              OR (o.scope_entity_type, o.scope_entity_id) IN (
                  SELECT scope_entity_type, scope_entity_id
                  FROM public.form_template_ancestor_scopes(NEW.scope_entity_type, NEW.scope_entity_id)
              )
          )
    ) INTO v_ancestor_required;

    IF v_ancestor_required AND NEW.is_enabled = FALSE THEN
        RAISE EXCEPTION 'Cannot disable field "%.%" — it is required by an ancestor tier', NEW.section_key, NEW.field_key;
    END IF;

    IF v_ancestor_required AND NEW.is_required = FALSE THEN
        RAISE EXCEPTION 'Cannot un-require field "%.%" — it is required by an ancestor tier', NEW.section_key, NEW.field_key;
    END IF;

    SELECT MAX(o.min_length_override), MIN(o.max_length_override)
    INTO v_ancestor_min, v_ancestor_max
    FROM public.form_template_field_overrides o
    WHERE o.organisation_id = NEW.organisation_id
      AND o.template_id = NEW.template_id
      AND o.section_key = NEW.section_key
      AND o.field_key = NEW.field_key
      AND (
          o.scope_entity_type = 'account'
          OR (o.scope_entity_type, o.scope_entity_id) IN (
              SELECT scope_entity_type, scope_entity_id
              FROM public.form_template_ancestor_scopes(NEW.scope_entity_type, NEW.scope_entity_id)
          )
      );

    IF NEW.min_length_override IS NOT NULL AND v_ancestor_min IS NOT NULL
       AND NEW.min_length_override < v_ancestor_min THEN
        RAISE EXCEPTION 'Cannot lower min length for field "%.%" below ancestor minimum (%)',
            NEW.section_key, NEW.field_key, v_ancestor_min;
    END IF;

    IF NEW.max_length_override IS NOT NULL AND v_ancestor_max IS NOT NULL
       AND NEW.max_length_override > v_ancestor_max THEN
        RAISE EXCEPTION 'Cannot raise max length for field "%.%" above ancestor maximum (%)',
            NEW.section_key, NEW.field_key, v_ancestor_max;
    END IF;

    IF NEW.min_length_override IS NOT NULL AND v_ancestor_max IS NOT NULL
       AND NEW.min_length_override > v_ancestor_max THEN
        RAISE EXCEPTION 'Cannot set min length for field "%.%" above ancestor maximum (%)',
            NEW.section_key, NEW.field_key, v_ancestor_max;
    END IF;

    IF NEW.max_length_override IS NOT NULL AND v_ancestor_min IS NOT NULL
       AND NEW.max_length_override < v_ancestor_min THEN
        RAISE EXCEPTION 'Cannot set max length for field "%.%" below ancestor minimum (%)',
            NEW.section_key, NEW.field_key, v_ancestor_min;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_form_template_field_overrides_ratchet ON public.form_template_field_overrides;
CREATE TRIGGER trg_form_template_field_overrides_ratchet
    BEFORE INSERT OR UPDATE ON public.form_template_field_overrides
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_form_template_field_overrides_ratchet();

-- -----------------------------------------------------------------------------
-- sim: same ratchet extension
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sim.trg_form_template_field_overrides_ratchet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
AS $$
DECLARE
    v_ancestor_required BOOLEAN;
    v_ancestor_min INTEGER;
    v_ancestor_max INTEGER;
BEGIN
    IF NEW.min_length_override IS NOT NULL
       AND NEW.max_length_override IS NOT NULL
       AND NEW.max_length_override < NEW.min_length_override THEN
        RAISE EXCEPTION 'max_length_override (%) cannot be less than min_length_override (%) for field "%.%"',
            NEW.max_length_override, NEW.min_length_override, NEW.section_key, NEW.field_key;
    END IF;

    IF NEW.scope_entity_type = 'account' THEN
        RETURN NEW;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM sim.form_template_field_overrides o
        WHERE o.organisation_id = NEW.organisation_id
          AND o.template_id = NEW.template_id
          AND o.section_key = NEW.section_key
          AND o.field_key = NEW.field_key
          AND o.is_required = TRUE
          AND (
              o.scope_entity_type = 'account'
              OR (o.scope_entity_type, o.scope_entity_id) IN (
                  SELECT scope_entity_type, scope_entity_id
                  FROM sim.form_template_ancestor_scopes(NEW.scope_entity_type, NEW.scope_entity_id)
              )
          )
    ) INTO v_ancestor_required;

    IF v_ancestor_required AND NEW.is_enabled = FALSE THEN
        RAISE EXCEPTION 'Cannot disable field "%.%" — it is required by an ancestor tier', NEW.section_key, NEW.field_key;
    END IF;

    IF v_ancestor_required AND NEW.is_required = FALSE THEN
        RAISE EXCEPTION 'Cannot un-require field "%.%" — it is required by an ancestor tier', NEW.section_key, NEW.field_key;
    END IF;

    SELECT MAX(o.min_length_override), MIN(o.max_length_override)
    INTO v_ancestor_min, v_ancestor_max
    FROM sim.form_template_field_overrides o
    WHERE o.organisation_id = NEW.organisation_id
      AND o.template_id = NEW.template_id
      AND o.section_key = NEW.section_key
      AND o.field_key = NEW.field_key
      AND (
          o.scope_entity_type = 'account'
          OR (o.scope_entity_type, o.scope_entity_id) IN (
              SELECT scope_entity_type, scope_entity_id
              FROM sim.form_template_ancestor_scopes(NEW.scope_entity_type, NEW.scope_entity_id)
          )
      );

    IF NEW.min_length_override IS NOT NULL AND v_ancestor_min IS NOT NULL
       AND NEW.min_length_override < v_ancestor_min THEN
        RAISE EXCEPTION 'Cannot lower min length for field "%.%" below ancestor minimum (%)',
            NEW.section_key, NEW.field_key, v_ancestor_min;
    END IF;

    IF NEW.max_length_override IS NOT NULL AND v_ancestor_max IS NOT NULL
       AND NEW.max_length_override > v_ancestor_max THEN
        RAISE EXCEPTION 'Cannot raise max length for field "%.%" above ancestor maximum (%)',
            NEW.section_key, NEW.field_key, v_ancestor_max;
    END IF;

    IF NEW.min_length_override IS NOT NULL AND v_ancestor_max IS NOT NULL
       AND NEW.min_length_override > v_ancestor_max THEN
        RAISE EXCEPTION 'Cannot set min length for field "%.%" above ancestor maximum (%)',
            NEW.section_key, NEW.field_key, v_ancestor_max;
    END IF;

    IF NEW.max_length_override IS NOT NULL AND v_ancestor_min IS NOT NULL
       AND NEW.max_length_override < v_ancestor_min THEN
        RAISE EXCEPTION 'Cannot set max length for field "%.%" below ancestor minimum (%)',
            NEW.section_key, NEW.field_key, v_ancestor_min;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sim_form_template_field_overrides_ratchet ON sim.form_template_field_overrides;
CREATE TRIGGER trg_sim_form_template_field_overrides_ratchet
    BEFORE INSERT OR UPDATE ON sim.form_template_field_overrides
    FOR EACH ROW
    EXECUTE FUNCTION sim.trg_form_template_field_overrides_ratchet();

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('form_template_field_overrides', 'Per-organisation/per-tier enable/disable, required, label, type, and min/max length overrides for shared form template fields (Platform).', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('sim.form_template_field_overrides', 'Per-organisation/per-tier enable/disable, required, label, type, and min/max length overrides for shared form template fields (Simulator sim schema).', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v847_form_template_field_min_max_length.sql applied';
END $$;

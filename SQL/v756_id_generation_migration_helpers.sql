-- ============================================================================
-- v756: ID Generation Migration — shared trigger helpers (public + sim)
-- Plan: projectplan/v755_system_wide_id_generation_migration_plan.md
-- Prerequisites: project-nidus-admin SQL/v155 + v156 applied
-- ============================================================================

-- Generic AFTER INSERT trigger: populate a display-ID column via admin engine.
-- TG_ARGV[0] = qualified target_table for admin.generate_display_id (e.g. 'public.risks')
-- TG_ARGV[1] = column name to set (e.g. 'risk_identifier')
CREATE OR REPLACE FUNCTION public.trg_apply_admin_display_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, admin
AS $$
DECLARE
    v_target_table TEXT := TG_ARGV[0];
    v_column       TEXT := TG_ARGV[1];
    v_display_id   TEXT;
BEGIN
    IF TG_OP <> 'INSERT' THEN
        RETURN NULL;
    END IF;

    EXECUTE format(
        'SELECT ($1).%I',
        v_column
    )
    INTO v_display_id
    USING NEW;

    IF v_display_id IS NOT NULL AND btrim(v_display_id) <> '' THEN
        RETURN NULL;
    END IF;

    v_display_id := admin.generate_display_id(v_target_table, NEW.id);

    EXECUTE format(
        'UPDATE %s SET %I = $1 WHERE id = $2',
        v_target_table,
        v_column
    )
    USING v_display_id, NEW.id;

    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.trg_apply_admin_display_id() IS
    'AFTER INSERT trigger helper — sets a column from admin.generate_display_id(target_table, id)';

CREATE OR REPLACE FUNCTION sim.trg_apply_admin_display_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, admin
AS $$
DECLARE
    v_target_table TEXT := TG_ARGV[0];
    v_column       TEXT := TG_ARGV[1];
    v_display_id   TEXT;
BEGIN
    IF TG_OP <> 'INSERT' THEN
        RETURN NULL;
    END IF;

    EXECUTE format(
        'SELECT ($1).%I',
        v_column
    )
    INTO v_display_id
    USING NEW;

    IF v_display_id IS NOT NULL AND btrim(v_display_id) <> '' THEN
        RETURN NULL;
    END IF;

    v_display_id := admin.generate_display_id(v_target_table, NEW.id);

    EXECUTE format(
        'UPDATE %s SET %I = $1 WHERE id = $2',
        v_target_table,
        v_column
    )
    USING v_display_id, NEW.id;

    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION sim.trg_apply_admin_display_id() IS
    'AFTER INSERT trigger helper for sim schema tables';

GRANT EXECUTE ON FUNCTION public.trg_apply_admin_display_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION sim.trg_apply_admin_display_id() TO authenticated, service_role;

DO $$
BEGIN
    RAISE NOTICE 'v756_id_generation_migration_helpers.sql applied';
END $$;

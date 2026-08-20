-- =============================================================================
-- v830: Fix create_issue_register_for_project() - broken by the v756b ID
--       Generation migration
--
-- Symptom: opening /pm/controls/issue-register for a project with no register
--          yet raises "function generate_issue_register_reference() does not
--          exist". The page then never resolves a register, so every downstream
--          issue query is skipped and the register renders empty.
--
-- Cause:  v756b_id_generation_migration_public.sql (Phase 1, Issue family) called
--         _v756_swap_display_id_trigger(...) for public.issue_registers, whose
--         p_drop_function_names argument explicitly DROPs
--         public.generate_issue_register_reference() and replaces the old BEFORE
--         INSERT reference trigger with trg_issue_registers_admin_display_id, an
--         AFTER INSERT trigger that fills register_reference from
--         admin.generate_display_id(). v821 later rewrote
--         create_issue_register_for_project() to remove a dead organisation_id
--         lookup but kept the call to the by-then-dropped generator.
--
-- Fix:    insert with register_reference = '' (satisfies NOT NULL and is only
--         transient, since the AFTER INSERT trigger overwrites it immediately)
--         and let the display-ID trigger assign the real reference. This is
--         exactly the shape of v823_fix_create_risk_register_for_project_display_id.sql,
--         which repaired the identical breakage on the risk register side.
--
-- Also adds two things v821 lacked:
--   * an existing-register short-circuit, matching create_risk_register_for_project,
--     so a concurrent or repeated call returns the current register instead of
--     tripping the UNIQUE constraint on issue_registers.project_id;
--   * a fallback that assigns IR-YYYY-NNN if the display-ID trigger leaves the
--     reference blank (no admin ID-generation rule configured for
--     public.issue_registers). Without it, register_reference stays '' and the
--     UNIQUE constraint on that column would let exactly one project in the whole
--     database ever create a register - which would surface as a confusing
--     duplicate-key error on the second project rather than a missing rule.
--
-- SECURITY DEFINER matches create_risk_register_for_project (v823). The INSERT
-- policy on issue_registers (v175) only admits user_projects rows with
-- access_level 'owner'/'admin', so an INVOKER function would refuse to auto-create
-- the register for a plain Project Manager - which is why the risk register works
-- for this role today and the issue register would not. Creating the single
-- per-project register is an implicit system action on first view, not a
-- user-authored write; the per-issue RLS policies are untouched.
--
-- Prerequisites: v174_issue_register_tables.sql, v756b_id_generation_migration_public.sql
-- Platform (public) schema only - the sim schema has no issue_registers table.
-- =============================================================================

CREATE OR REPLACE FUNCTION create_issue_register_for_project(p_project_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_register_id UUID;
    v_reference   VARCHAR(50);
    v_year        INTEGER;
    v_sequence    INTEGER;
BEGIN
    -- Return the existing register rather than violating the UNIQUE constraint
    -- on project_id.
    SELECT id INTO v_register_id
    FROM issue_registers
    WHERE project_id = p_project_id
      AND COALESCE(is_deleted, FALSE) = FALSE
    LIMIT 1;

    IF v_register_id IS NOT NULL THEN
        RETURN v_register_id;
    END IF;

    -- register_reference left blank here; trg_issue_registers_admin_display_id
    -- (AFTER INSERT) fills it via admin.generate_display_id().
    INSERT INTO issue_registers (
        project_id,
        register_reference,
        version_number,
        created_by,
        updated_by
    ) VALUES (
        p_project_id,
        '',
        '1.0',
        p_user_id,
        p_user_id
    ) RETURNING id INTO v_register_id;

    -- The AFTER INSERT trigger has already run by this point. If no admin
    -- ID-generation rule is configured for public.issue_registers it will have
    -- left the reference blank, so fall back to the original IR-YYYY-NNN format.
    SELECT register_reference INTO v_reference
    FROM issue_registers
    WHERE id = v_register_id;

    IF v_reference IS NULL OR btrim(v_reference) = '' THEN
        v_year := EXTRACT(YEAR FROM NOW())::INTEGER;

        SELECT COALESCE(MAX(NULLIF(SUBSTRING(register_reference FROM '[0-9]+$'), '')::INTEGER), 0) + 1
        INTO v_sequence
        FROM issue_registers
        WHERE register_reference LIKE 'IR-' || v_year || '-%';

        UPDATE issue_registers
        SET register_reference = 'IR-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0')
        WHERE id = v_register_id;
    END IF;

    RETURN v_register_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_issue_register_for_project(UUID, UUID) IS
    'Creates (or returns) the issue register for a project. register_reference is populated by the admin display-ID trigger, with an IR-YYYY-NNN fallback (v830).';

-- -----------------------------------------------------------------------------
-- Backfill: any register already sitting on a blank reference (created between
-- v756b and this fix) gets the same fallback treatment.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    reg       RECORD;
    v_year    INTEGER := EXTRACT(YEAR FROM NOW())::INTEGER;
    v_sequence INTEGER;
BEGIN
    FOR reg IN
        SELECT id FROM issue_registers
        WHERE register_reference IS NULL OR btrim(register_reference) = ''
        ORDER BY created_at NULLS LAST, id
    LOOP
        SELECT COALESCE(MAX(NULLIF(SUBSTRING(register_reference FROM '[0-9]+$'), '')::INTEGER), 0) + 1
        INTO v_sequence
        FROM issue_registers
        WHERE register_reference LIKE 'IR-' || v_year || '-%';

        UPDATE issue_registers
        SET register_reference = 'IR-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0')
        WHERE id = reg.id;
    END LOOP;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'v830_fix_create_issue_register_for_project_display_id.sql applied';
END $$;

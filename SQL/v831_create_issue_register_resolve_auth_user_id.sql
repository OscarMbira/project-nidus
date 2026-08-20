-- =============================================================================
-- v831: create_issue_register_for_project() - accept an auth uid as well as a
--       users.id, so p_user_id can never land in created_by/updated_by as a
--       value that does not exist in public.users
--
-- Symptom (immediately after v830 unblocked register creation):
--   "insert or update on table issue_registers violates foreign key constraint
--    issue_registers_updated_by_fkey"
--
-- Cause: public.users.id and the Supabase auth uid are two different values -
--        they are joined via public.users.auth_user_id (see the v175 RLS
--        policies, which all match on u.auth_user_id = auth.uid()).
--        issueRegisterService.createIssueRegister was passing
--        supabase.auth.getUser().id straight through as p_user_id, so the
--        function wrote an auth uid into created_by/updated_by, which are FKs to
--        public.users(id). created_by survived because trigger_set_created_fields
--        overwrites it; updated_by had nothing to save it and tripped the FK.
--
--        The risk-register equivalents (riskRegisterService.createRiskRegister,
--        riskService.createRisk) already resolve users.id from auth_user_id
--        before calling their RPC - the issue register service simply never did.
--
-- Fix, in two places:
--   * App (the real fix, matching the established pattern): resolve users.id from
--     auth_user_id before the RPC call, in both
--     apps/platform/src/services/issueRegisterService.js and the Simulator twin.
--   * This file (defence in depth): have the function accept either form. Other
--     callers exist - create_issue_from_risk() and the v829 seed among them - and
--     nothing about the signature tells a caller which of the two ids is wanted.
--     Resolving inside the function makes the ambiguity harmless and turns a
--     confusing FK error into a clear message when neither form matches.
--
-- Supersedes v830 (this is a complete replacement of the function; it keeps
-- v830's existing-register short-circuit and IR-YYYY-NNN fallback). Applying
-- v831 alone on a fresh database is sufficient - v830 need not be run first.
--
-- Prerequisites: v174_issue_register_tables.sql, v756b_id_generation_migration_public.sql
-- Platform (public) schema only - the sim schema has no issue_registers table.
-- =============================================================================

CREATE OR REPLACE FUNCTION create_issue_register_for_project(p_project_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_register_id UUID;
    v_user_id     UUID;
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

    -- p_user_id may be a public.users.id (server-side callers, seeds) or a
    -- Supabase auth uid (browser callers using auth.getUser()). Accept both.
    SELECT id INTO v_user_id
    FROM users
    WHERE id = p_user_id
      AND COALESCE(is_deleted, FALSE) = FALSE;

    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id
        FROM users
        WHERE auth_user_id = p_user_id
          AND COALESCE(is_deleted, FALSE) = FALSE
        LIMIT 1;
    END IF;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION
            'create_issue_register_for_project: no active public.users row matches % (tried users.id and users.auth_user_id)',
            p_user_id;
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
        v_user_id,
        v_user_id
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
    'Creates (or returns) the issue register for a project. p_user_id accepts a users.id or an auth uid (v831); register_reference comes from the admin display-ID trigger with an IR-YYYY-NNN fallback (v830).';

-- -----------------------------------------------------------------------------
-- Repair: any register left on a blank reference from before v830. A no-op on a
-- healthy database. (No equivalent repair is needed for created_by/updated_by:
-- the FK constraint is exactly what blocked those rows from being written.)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    reg        RECORD;
    v_year     INTEGER := EXTRACT(YEAR FROM NOW())::INTEGER;
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
  RAISE NOTICE 'v831_create_issue_register_resolve_auth_user_id.sql applied';
END $$;

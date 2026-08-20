-- =============================================================================
-- v824: Fix trigger_set_created_fields() — clobbers explicitly-supplied created_by
-- Bug: trigger_set_created_fields() (BEFORE INSERT, used across most tables)
--      unconditionally sets NEW.created_by from auth.uid(), and forces it to
--      NULL whenever auth.uid() is NULL (SQL editor, service-role scripts,
--      system/RPC calls made outside an authenticated session) — even when the
--      INSERT explicitly supplied a created_by value.
--      This broke create_risk_register_for_project() (v172/v823): it inserts
--      with created_by = p_user_id, but the trigger nulled it out, tripping the
--      NOT NULL constraint on risk_registers.created_by:
--        ERROR: null value in column "created_by" of relation "risk_registers"
--               violates not-null constraint
-- Fix: keep any explicitly-provided created_by when there is no authenticated
--      user to resolve. Behaviour for normal authenticated app inserts (where
--      created_by is left unset) is unchanged.
-- Prerequisites: v102_fix_audit_triggers_user_id_lookup.sql
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_set_created_fields()
RETURNS TRIGGER AS $$
DECLARE
    v_internal_user_id UUID;
BEGIN
    NEW.created_at := NOW();

    IF auth.uid() IS NOT NULL THEN
        SELECT id INTO v_internal_user_id
        FROM users
        WHERE auth_user_id = auth.uid()
        AND is_deleted = false
        LIMIT 1;
    END IF;

    -- Preserve an explicitly-supplied created_by (e.g. seed scripts, system
    -- RPCs run without an authenticated session) instead of nulling it out.
    NEW.created_by := COALESCE(v_internal_user_id, NEW.created_by);

    NEW.updated_at := NOW();

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, auth;

COMMENT ON FUNCTION trigger_set_created_fields() IS
'Trigger function that automatically sets created_at, created_by (internal user ID), and initial updated_at fields on INSERT. Looks up internal user ID from auth.uid(); preserves an explicitly-supplied created_by when no authenticated user is present (v824).';

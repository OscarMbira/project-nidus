-- =============================================================================
-- v305.3: Fix create_risk_register_for_project when p_user_id is null
-- Error: null value in column "created_by" of relation "risk_registers" violates
--        not-null constraint (e.g. project seed inserts without created_by).
-- Skip creating risk register when user id is null so seed/migration inserts succeed.
-- =============================================================================

CREATE OR REPLACE FUNCTION create_risk_register_for_project(p_project_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_register_id UUID;
    v_reference VARCHAR(50);
BEGIN
    -- Skip when no user (e.g. seed data, migrations); risk_registers.created_by is NOT NULL
    IF p_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT id INTO v_register_id
    FROM risk_registers
    WHERE project_id = p_project_id
      AND is_deleted = FALSE;

    IF v_register_id IS NOT NULL THEN
        RETURN v_register_id;
    END IF;

    v_reference := generate_risk_register_reference();

    INSERT INTO risk_registers (
        project_id,
        register_reference,
        created_by,
        is_active
    )
    VALUES (
        p_project_id,
        v_reference,
        p_user_id,
        TRUE
    )
    RETURNING id INTO v_register_id;

    RETURN v_register_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_risk_register_for_project(UUID, UUID) IS 'Creates risk register when project is initiated; returns NULL when p_user_id is null (e.g. seed inserts).';

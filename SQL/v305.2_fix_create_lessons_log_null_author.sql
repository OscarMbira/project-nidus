-- =============================================================================
-- v305.2: Fix create_lessons_log_for_project when p_user_id is null
-- Error: null value in column "author_id" of relation "lessons_logs" violates
--        not-null constraint (e.g. project seed inserts without created_by).
-- Skip creating lessons log when user id is null so seed/migration inserts succeed.
-- =============================================================================

CREATE OR REPLACE FUNCTION create_lessons_log_for_project(p_project_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_reference VARCHAR(50);
BEGIN
    -- Skip when no user (e.g. seed data, migrations); lessons_logs.author_id is NOT NULL
    IF p_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT id INTO v_log_id
    FROM lessons_logs
    WHERE project_id = p_project_id
      AND is_deleted = FALSE;

    IF v_log_id IS NOT NULL THEN
        RETURN v_log_id;
    END IF;

    v_reference := generate_lessons_log_reference();

    INSERT INTO lessons_logs (
        project_id,
        log_reference,
        author_id,
        owner_id,
        created_by,
        is_active
    )
    VALUES (
        p_project_id,
        v_reference,
        p_user_id,
        p_user_id,
        p_user_id,
        TRUE
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_lessons_log_for_project(UUID, UUID) IS 'Creates lessons log when project is initiated; returns NULL when p_user_id is null (e.g. seed inserts).';

-- =============================================================================
-- v705: Fix create_daily_log_for_project – remove invalid projects.programme_id
-- Root cause: the function (v166) reads programme_id FROM the projects table,
--             but that column was never added to projects.  The programme link
--             lives in programme_projects (v37).  The function is replaced to
--             look up programme_id via programme_projects instead.
-- =============================================================================

CREATE OR REPLACE FUNCTION create_daily_log_for_project(p_project_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_log_id       UUID;
    v_reference    VARCHAR(50);
    v_programme_id UUID;
BEGIN
    -- Return existing log if one already exists for this project
    SELECT id INTO v_log_id
    FROM daily_logs
    WHERE project_id = p_project_id
      AND is_deleted = FALSE;

    IF v_log_id IS NOT NULL THEN
        RETURN v_log_id;
    END IF;

    -- Resolve programme_id via the programme_projects linking table.
    -- projects.programme_id does not exist; the association is stored in
    -- programme_projects (created in v37_programme_management.sql).
    SELECT pp.programme_id INTO v_programme_id
    FROM programme_projects pp
    WHERE pp.project_id = p_project_id
    LIMIT 1;

    -- Generate a unique log reference
    v_reference := generate_log_reference();

    -- Create the daily log
    INSERT INTO daily_logs (
        project_id,
        programme_id,
        log_reference,
        created_by,
        visibility,
        is_active
    )
    VALUES (
        p_project_id,
        v_programme_id,   -- NULL when project has no programme assignment
        v_reference,
        p_user_id,
        'team',
        TRUE
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_daily_log_for_project(UUID, UUID) IS
  'v705 fix: creates or returns the daily log for a project. '
  'programme_id is resolved via programme_projects (not projects.programme_id which does not exist).';

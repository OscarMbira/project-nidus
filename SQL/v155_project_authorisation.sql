-- =============================================
-- PMO Project Creation Governance Upgrade
-- Phase 4: Authorisation Rules (Hard Gates)
-- File: v155_project_authorisation.sql
-- Description: Adds authorisation, rejection, and suspension functions with PMO Admin enforcement
-- =============================================

-- Create RPC function to authorise project
CREATE OR REPLACE FUNCTION authorise_project(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_project RECORD;
    v_readiness_result JSONB;
    v_current_user_id UUID;
    v_is_pmo_admin BOOLEAN;
BEGIN
    -- Get current user
    v_current_user_id := auth.uid();

    IF v_current_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;

    -- Check if user is PMO Admin
    SELECT EXISTS(
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        JOIN users u ON ur.user_id = u.id
        WHERE u.auth_user_id = v_current_user_id
        AND r.role_name = 'pmo_admin'
        AND ur.is_active = TRUE
        AND ur.is_deleted = FALSE
        AND r.is_deleted = FALSE
    ) INTO v_is_pmo_admin;

    IF NOT v_is_pmo_admin THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Only PMO Admin can authorise projects'
        );
    END IF;

    -- Get project
    SELECT * INTO v_project
    FROM projects
    WHERE id = p_project_id
    AND is_deleted = FALSE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Project not found'
        );
    END IF;

    -- Check if already authorised
    IF v_project.intake_status = 'authorised' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Project is already authorised'
        );
    END IF;

    -- Run readiness validation
    v_readiness_result := validate_project_readiness(p_project_id);

    IF (v_readiness_result->>'readiness_status') != 'pass' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Project does not meet authorisation readiness criteria',
            'readiness_result', v_readiness_result
        );
    END IF;

    -- Authorise project
    UPDATE projects
    SET intake_status = 'authorised',
        authorised_by_user_id = v_current_user_id,
        authorised_at = NOW(),
        updated_at = NOW(),
        updated_by = v_current_user_id
    WHERE id = p_project_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Project authorised successfully',
        'project_id', p_project_id,
        'authorised_at', NOW()
    );
END;
$$;

COMMENT ON FUNCTION authorise_project IS 'Authorises a project after validating readiness (PMO Admin only)';

-- Create RPC function to reject project
CREATE OR REPLACE FUNCTION reject_project(p_project_id UUID, p_rejection_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID;
    v_is_pmo_admin BOOLEAN;
    v_previous_status VARCHAR(50);
BEGIN
    -- Get current user
    v_current_user_id := auth.uid();

    IF v_current_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;

    -- Validate rejection reason
    IF p_rejection_reason IS NULL OR trim(p_rejection_reason) = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Rejection reason is required'
        );
    END IF;

    -- Check if user is PMO Admin
    SELECT EXISTS(
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        JOIN users u ON ur.user_id = u.id
        WHERE u.auth_user_id = v_current_user_id
        AND r.role_name = 'pmo_admin'
        AND ur.is_active = TRUE
        AND ur.is_deleted = FALSE
        AND r.is_deleted = FALSE
    ) INTO v_is_pmo_admin;

    IF NOT v_is_pmo_admin THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Only PMO Admin can reject projects'
        );
    END IF;

    -- Get previous status
    SELECT intake_status INTO v_previous_status
    FROM projects
    WHERE id = p_project_id
    AND is_deleted = FALSE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Project not found'
        );
    END IF;

    -- Prevent rejection of already authorised projects (optional business rule)
    IF v_previous_status = 'authorised' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot reject an authorised project. Use suspension instead.'
        );
    END IF;

    -- Reject project
    UPDATE projects
    SET intake_status = 'rejected',
        rejection_reason = p_rejection_reason,
        updated_at = NOW(),
        updated_by = v_current_user_id
    WHERE id = p_project_id
    AND is_deleted = FALSE;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Project rejected successfully',
        'project_id', p_project_id,
        'previous_status', v_previous_status
    );
END;
$$;

COMMENT ON FUNCTION reject_project IS 'Rejects a project with reason (PMO Admin only)';

-- Create RPC function to suspend project
CREATE OR REPLACE FUNCTION suspend_project(p_project_id UUID, p_suspended_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID;
    v_is_pmo_admin BOOLEAN;
    v_previous_status VARCHAR(50);
BEGIN
    -- Get current user
    v_current_user_id := auth.uid();

    IF v_current_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;

    -- Validate suspension reason
    IF p_suspended_reason IS NULL OR trim(p_suspended_reason) = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Suspension reason is required'
        );
    END IF;

    -- Check if user is PMO Admin
    SELECT EXISTS(
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        JOIN users u ON ur.user_id = u.id
        WHERE u.auth_user_id = v_current_user_id
        AND r.role_name = 'pmo_admin'
        AND ur.is_active = TRUE
        AND ur.is_deleted = FALSE
        AND r.is_deleted = FALSE
    ) INTO v_is_pmo_admin;

    IF NOT v_is_pmo_admin THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Only PMO Admin can suspend projects'
        );
    END IF;

    -- Get previous status
    SELECT intake_status INTO v_previous_status
    FROM projects
    WHERE id = p_project_id
    AND is_deleted = FALSE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Project not found'
        );
    END IF;

    -- Suspend project
    UPDATE projects
    SET intake_status = 'suspended',
        suspended_reason = p_suspended_reason,
        updated_at = NOW(),
        updated_by = v_current_user_id
    WHERE id = p_project_id
    AND is_deleted = FALSE;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Project suspended successfully',
        'project_id', p_project_id,
        'previous_status', v_previous_status
    );
END;
$$;

COMMENT ON FUNCTION suspend_project IS 'Suspends a project with reason (PMO Admin only)';

-- Add RLS policy for project authorisation (PMO Admin only)
-- Note: This is a supplementary policy. Existing policies should already control basic CRUD.
DO $$
BEGIN
    -- Drop policy if exists (for re-running script)
    DROP POLICY IF EXISTS "PMO Admin can update project intake status" ON projects;

    -- Create policy for intake status updates
    CREATE POLICY "PMO Admin can update project intake status"
    ON projects
    FOR UPDATE
    USING (
        EXISTS(
            SELECT 1
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
            AND r.role_name = 'pmo_admin'
            AND ur.is_active = TRUE
            AND ur.is_deleted = FALSE
            AND r.is_deleted = FALSE
        )
    )
    WITH CHECK (
        EXISTS(
            SELECT 1
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
            AND r.role_name = 'pmo_admin'
            AND ur.is_active = TRUE
            AND ur.is_deleted = FALSE
            AND r.is_deleted = FALSE
        )
    );
END $$;

-- Register table update
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('projects', 'Main project records with intake lifecycle, readiness validation, and authorisation support', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

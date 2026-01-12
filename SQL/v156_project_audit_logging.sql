-- =============================================
-- PMO Project Creation Governance Upgrade
-- Phase 5: Audit Logging (PMO Actions)
-- File: v156_project_audit_logging.sql
-- Description: Comprehensive audit logging for all project lifecycle actions
-- =============================================

-- Check if audit_log table exists, create if not
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'authorise', 'reject', 'suspend', 'save_draft', 'validate_readiness'
    action_details JSONB,
    performed_by UUID REFERENCES users(id),
    performed_at TIMESTAMP DEFAULT NOW(),
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by ON audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_at ON audit_log(performed_at DESC);

-- Register table if not exists
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('audit_log', 'System-wide audit log for all table changes and actions', true, true, 'system')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- Create audit logging function for project lifecycle actions
CREATE OR REPLACE FUNCTION log_project_action(
    p_project_id UUID,
    p_action VARCHAR(50),
    p_action_details JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get the internal user ID from auth.uid()
    SELECT id INTO v_user_id
    FROM users
    WHERE auth_user_id = auth.uid()
    LIMIT 1;

    INSERT INTO audit_log (
        table_name,
        record_id,
        action,
        action_details,
        performed_by,
        performed_at
    )
    VALUES (
        'projects',
        p_project_id,
        p_action,
        p_action_details,
        v_user_id,
        NOW()
    );
END;
$$;

COMMENT ON FUNCTION log_project_action IS 'Logs project lifecycle actions to audit_log table';

-- Update authorise_project to log action
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
    v_user_id UUID;
BEGIN
    -- Get current user
    v_current_user_id := auth.uid();

    IF v_current_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;

    -- Get internal user ID
    SELECT id INTO v_user_id
    FROM users
    WHERE auth_user_id = v_current_user_id
    LIMIT 1;

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
        updated_by = v_user_id
    WHERE id = p_project_id;

    -- Log action
    PERFORM log_project_action(
        p_project_id,
        'authorise',
        jsonb_build_object(
            'previous_status', v_project.intake_status,
            'new_status', 'authorised',
            'authorised_by', v_user_id,
            'authorised_at', NOW(),
            'project_name', v_project.project_name
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Project authorised successfully',
        'project_id', p_project_id,
        'authorised_at', NOW()
    );
END;
$$;

-- Update reject_project to log action
CREATE OR REPLACE FUNCTION reject_project(p_project_id UUID, p_rejection_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID;
    v_is_pmo_admin BOOLEAN;
    v_previous_status VARCHAR(50);
    v_user_id UUID;
    v_project_name VARCHAR(500);
BEGIN
    -- Get current user
    v_current_user_id := auth.uid();

    IF v_current_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;

    -- Get internal user ID
    SELECT id INTO v_user_id
    FROM users
    WHERE auth_user_id = v_current_user_id
    LIMIT 1;

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

    -- Get previous status and project name
    SELECT intake_status, project_name INTO v_previous_status, v_project_name
    FROM projects
    WHERE id = p_project_id
    AND is_deleted = FALSE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Project not found'
        );
    END IF;

    -- Prevent rejection of already authorised projects
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
        updated_by = v_user_id
    WHERE id = p_project_id
    AND is_deleted = FALSE;

    -- Log action
    PERFORM log_project_action(
        p_project_id,
        'reject',
        jsonb_build_object(
            'previous_status', v_previous_status,
            'new_status', 'rejected',
            'rejection_reason', p_rejection_reason,
            'rejected_by', v_user_id,
            'project_name', v_project_name
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Project rejected successfully',
        'project_id', p_project_id,
        'previous_status', v_previous_status
    );
END;
$$;

-- Update suspend_project to log action
CREATE OR REPLACE FUNCTION suspend_project(p_project_id UUID, p_suspended_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID;
    v_is_pmo_admin BOOLEAN;
    v_previous_status VARCHAR(50);
    v_user_id UUID;
    v_project_name VARCHAR(500);
BEGIN
    -- Get current user
    v_current_user_id := auth.uid();

    IF v_current_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;

    -- Get internal user ID
    SELECT id INTO v_user_id
    FROM users
    WHERE auth_user_id = v_current_user_id
    LIMIT 1;

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

    -- Get previous status and project name
    SELECT intake_status, project_name INTO v_previous_status, v_project_name
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
        updated_by = v_user_id
    WHERE id = p_project_id
    AND is_deleted = FALSE;

    -- Log action
    PERFORM log_project_action(
        p_project_id,
        'suspend',
        jsonb_build_object(
            'previous_status', v_previous_status,
            'new_status', 'suspended',
            'suspended_reason', p_suspended_reason,
            'suspended_by', v_user_id,
            'project_name', v_project_name
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Project suspended successfully',
        'project_id', p_project_id,
        'previous_status', v_previous_status
    );
END;
$$;

-- Create trigger to log draft saves
CREATE OR REPLACE FUNCTION trigger_log_project_draft_save()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get internal user ID
    SELECT id INTO v_user_id
    FROM users
    WHERE auth_user_id = auth.uid()
    LIMIT 1;

    -- Only log on INSERT or UPDATE of draft status
    IF (TG_OP = 'INSERT' AND NEW.intake_status = 'draft') THEN
        PERFORM log_project_action(
            NEW.id,
            'create_draft',
            jsonb_build_object(
                'project_name', NEW.project_name,
                'project_code', NEW.project_code,
                'created_at', NEW.created_at,
                'created_by', v_user_id
            )
        );
    ELSIF (TG_OP = 'UPDATE' AND NEW.intake_status = 'draft' AND OLD.intake_status = 'draft') THEN
        PERFORM log_project_action(
            NEW.id,
            'update_draft',
            jsonb_build_object(
                'project_name', NEW.project_name,
                'project_code', NEW.project_code,
                'updated_at', NEW.updated_at,
                'updated_by', v_user_id
            )
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_projects_log_draft_save ON projects;

CREATE TRIGGER trg_projects_log_draft_save
AFTER INSERT OR UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION trigger_log_project_draft_save();

COMMENT ON TRIGGER trg_projects_log_draft_save ON projects IS 'Logs draft project creation and updates to audit_log';

-- Create function to log readiness validation
CREATE OR REPLACE FUNCTION validate_project_readiness(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_project RECORD;
    v_issues JSONB := '[]'::JSONB;
    v_board_members_count INTEGER;
    v_readiness_status VARCHAR(50);
    v_user_id UUID;
BEGIN
    -- Get internal user ID
    SELECT id INTO v_user_id
    FROM users
    WHERE auth_user_id = auth.uid()
    LIMIT 1;

    -- Get project details
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

    -- Validate mandatory fields (keeping existing validation logic)
    IF v_project.executive_user_id IS NULL THEN
        v_issues := v_issues || jsonb_build_object('field', 'executive_user_id', 'message', 'Executive/Sponsor must be assigned');
    END IF;

    IF v_project.business_objective IS NULL OR trim(v_project.business_objective) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'business_objective', 'message', 'Business objective is required');
    END IF;

    IF v_project.strategic_alignment IS NULL OR trim(v_project.strategic_alignment) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'strategic_alignment', 'message', 'Strategic alignment is required');
    END IF;

    IF v_project.expected_benefits_summary IS NULL OR trim(v_project.expected_benefits_summary) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'expected_benefits_summary', 'message', 'Expected benefits summary is required');
    END IF;

    IF v_project.benefit_owner_user_id IS NULL THEN
        v_issues := v_issues || jsonb_build_object('field', 'benefit_owner_user_id', 'message', 'Benefit owner must be assigned');
    END IF;

    IF v_project.delivery_methodology IS NULL OR trim(v_project.delivery_methodology) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'delivery_methodology', 'message', 'Delivery methodology is required');
    END IF;

    IF v_project.lifecycle_template IS NULL OR trim(v_project.lifecycle_template) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'lifecycle_template', 'message', 'Lifecycle template is required');
    END IF;

    IF v_project.stage_model IS NULL OR trim(v_project.stage_model) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'stage_model', 'message', 'Stage model is required');
    END IF;

    IF v_project.tolerance_time_days IS NULL AND v_project.tolerance_cost_percentage IS NULL THEN
        v_issues := v_issues || jsonb_build_object('field', 'tolerances', 'message', 'At least one tolerance (time or cost) must be defined');
    END IF;

    IF v_project.budget_amount IS NULL OR v_project.budget_amount <= 0 THEN
        v_issues := v_issues || jsonb_build_object('field', 'budget_amount', 'message', 'Budget amount must be greater than zero');
    END IF;

    IF v_project.budget_type IS NULL OR trim(v_project.budget_type) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'budget_type', 'message', 'Budget type (capex/opex/mixed) is required');
    END IF;

    IF v_project.funding_source IS NULL OR trim(v_project.funding_source) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'funding_source', 'message', 'Funding source is required');
    END IF;

    IF v_project.budget_approval_status IS NULL OR trim(v_project.budget_approval_status) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'budget_approval_status', 'message', 'Budget approval status is required');
    END IF;

    IF v_project.initial_risk_rating IS NULL OR trim(v_project.initial_risk_rating) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'initial_risk_rating', 'message', 'Initial risk rating is required');
    END IF;

    IF v_project.complexity_rating IS NULL OR trim(v_project.complexity_rating) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'complexity_rating', 'message', 'Complexity rating is required');
    END IF;

    IF v_project.mandate_status IS NULL OR trim(v_project.mandate_status) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'mandate_status', 'message', 'Mandate status is required');
    END IF;

    IF v_project.business_case_status IS NULL OR trim(v_project.business_case_status) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'business_case_status', 'message', 'Business case status is required');
    END IF;

    IF v_project.funding_approval_status IS NULL OR trim(v_project.funding_approval_status) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'funding_approval_status', 'message', 'Funding approval status is required');
    END IF;

    -- Conditional validations
    IF v_project.board_required = TRUE THEN
        SELECT COUNT(*) INTO v_board_members_count
        FROM project_board_members
        WHERE project_id = p_project_id
        AND is_active = TRUE
        AND is_deleted = FALSE;

        IF v_board_members_count = 0 THEN
            v_issues := v_issues || jsonb_build_object('field', 'board_members', 'message', 'Board members are required when board is enabled');
        END IF;
    END IF;

    -- Date validations
    IF v_project.planned_start_date IS NOT NULL AND v_project.planned_end_date IS NOT NULL THEN
        IF v_project.planned_end_date < v_project.planned_start_date THEN
            v_issues := v_issues || jsonb_build_object('field', 'planned_end_date', 'message', 'End date must be after start date');
        END IF;
    END IF;

    -- Determine readiness status
    IF jsonb_array_length(v_issues) = 0 THEN
        v_readiness_status := 'pass';
    ELSE
        v_readiness_status := 'fail';
    END IF;

    -- Update project readiness fields
    UPDATE projects
    SET readiness_status = v_readiness_status,
        readiness_issues = v_issues,
        readiness_checked_at = NOW(),
        readiness_checked_by = auth.uid()
    WHERE id = p_project_id;

    -- Log validation action
    PERFORM log_project_action(
        p_project_id,
        'validate_readiness',
        jsonb_build_object(
            'readiness_status', v_readiness_status,
            'issues_count', jsonb_array_length(v_issues),
            'validated_by', v_user_id,
            'project_name', v_project.project_name
        )
    );

    -- Return result
    RETURN jsonb_build_object(
        'success', true,
        'readiness_status', v_readiness_status,
        'issues', v_issues,
        'issues_count', jsonb_array_length(v_issues)
    );
END;
$$;

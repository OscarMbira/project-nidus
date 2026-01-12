-- =============================================
-- PMO Project Creation Governance Upgrade
-- Phase 3: Readiness Validation
-- File: v154_project_readiness_validation.sql
-- Description: Adds readiness tracking and validation function
-- =============================================

-- Add readiness tracking fields
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS readiness_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS readiness_issues JSONB,
ADD COLUMN IF NOT EXISTS readiness_checked_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS readiness_checked_by UUID REFERENCES users(id);

-- Add constraint for readiness_status values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_projects_readiness_status'
    ) THEN
        ALTER TABLE projects
        ADD CONSTRAINT chk_projects_readiness_status
        CHECK (readiness_status IN ('pass', 'fail', 'not_checked') OR readiness_status IS NULL);
    END IF;
END $$;

COMMENT ON COLUMN projects.readiness_status IS 'Authorisation readiness: pass, fail, not_checked';
COMMENT ON COLUMN projects.readiness_issues IS 'JSONB array of validation issues';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_projects_readiness_status ON projects(readiness_status) WHERE is_deleted = FALSE;

-- Create RPC function to validate project readiness
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
BEGIN
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

    -- Validate mandatory fields
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

    -- Return result
    RETURN jsonb_build_object(
        'success', true,
        'readiness_status', v_readiness_status,
        'issues', v_issues,
        'issues_count', jsonb_array_length(v_issues)
    );
END;
$$;

COMMENT ON FUNCTION validate_project_readiness IS 'Validates if a project meets authorisation readiness criteria';

-- Register table update
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('projects', 'Main project records with intake lifecycle and readiness validation support', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ============================================================================
-- PMO Project Creation - Integration Hooks
-- Version: v157
-- Description: Stage gate checks table and initialisation function for project lifecycle
-- Date: 2025-01-27
-- ============================================================================
--
-- Purpose:
-- Creates placeholder table and function for stage gate initialisation on project authorisation.
-- This is an optional integration hook that can be enabled via feature flag in the future.
--
-- Prerequisites:
-- - v152_project_intake_lifecycle.sql (intake_status field must exist)
-- - v155_project_authorisation.sql (authorise_project function must exist)
-- - v156_project_audit_logging.sql (audit_log table must exist)
--
-- Note: This phase is OPTIONAL. The stage_gate_checks table is a placeholder
-- for future integration. The existing stage_boundaries table (v10_stage_gates_tables.sql)
-- may serve similar purposes, but this table provides a simpler check mechanism.
--
-- ============================================================================
-- STAGE GATE CHECKS TABLE
-- ============================================================================

-- Create stage_gate_checks table (placeholder for future integration)
CREATE TABLE IF NOT EXISTS stage_gate_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stage_name VARCHAR(200) NOT NULL,
    gate_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'passed', 'failed'
    checked_at TIMESTAMP,
    checked_by UUID REFERENCES users(id),
    gate_criteria JSONB,
    gate_results JSONB,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stage_gate_checks_project_id ON stage_gate_checks(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stage_gate_checks_gate_status ON stage_gate_checks(gate_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stage_gate_checks_checked_by ON stage_gate_checks(checked_by) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_stage_gate_checks_before_insert ON stage_gate_checks;
CREATE TRIGGER trg_stage_gate_checks_before_insert
    BEFORE INSERT ON stage_gate_checks
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_stage_gate_checks_before_update ON stage_gate_checks;
CREATE TRIGGER trg_stage_gate_checks_before_update
    BEFORE UPDATE ON stage_gate_checks
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE stage_gate_checks IS 'Stage gate check records for project lifecycle (placeholder for future integration)';
COMMENT ON COLUMN stage_gate_checks.gate_status IS 'Gate status: pending, passed, failed';
COMMENT ON COLUMN stage_gate_checks.gate_criteria IS 'JSONB criteria that must be met for gate to pass';
COMMENT ON COLUMN stage_gate_checks.gate_results IS 'JSONB results of gate check';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('stage_gate_checks', 'Stage gate check records for project lifecycle', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- INITIALISATION FUNCTION
-- ============================================================================

-- Create function to initialise stage gates on authorisation (optional, behind feature flag)
CREATE OR REPLACE FUNCTION initialise_project_stage_gates(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_project RECORD;
    v_user_id UUID;
BEGIN
    -- Get current user's internal ID
    SELECT id INTO v_user_id
    FROM users
    WHERE auth_user_id = auth.uid()
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found'
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

    -- Check if already initialised
    IF EXISTS (
        SELECT 1 FROM stage_gate_checks
        WHERE project_id = p_project_id
        AND stage_name = 'Pre-Project (Authorisation)'
        AND is_deleted = FALSE
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Stage gates already initialised for this project'
        );
    END IF;

    -- Insert pre-project stage gate check
    INSERT INTO stage_gate_checks (
        project_id,
        stage_name,
        gate_status,
        gate_criteria,
        created_by,
        updated_by
    )
    VALUES (
        p_project_id,
        'Pre-Project (Authorisation)',
        'pending',
        jsonb_build_object(
            'executive_assigned', v_project.executive_user_id IS NOT NULL,
            'business_case_approved', COALESCE(v_project.business_case_status, '') = 'approved',
            'funding_secured', COALESCE(v_project.funding_approval_status, '') = 'approved'
        ),
        v_user_id,
        v_user_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Stage gates initialised'
    );
END;
$$;

COMMENT ON FUNCTION initialise_project_stage_gates IS 'Initialises stage gate checks for a newly authorised project (optional integration hook)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Stage gate checks table and initialisation function created';
    RAISE NOTICE 'Note: This is an optional integration hook - can be enabled via feature flag in frontend';
END $$;

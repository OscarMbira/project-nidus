-- ================================================
-- End Stage Report CRUD Enhancement
-- SQL Version: v218
-- Date: 2026-01-20
-- Related: v29_stage_boundaries_enhanced.sql (existing end_stage_reports table)
-- ================================================

-- ================================================
-- ENUM TYPE DEFINITIONS
-- ================================================

-- Product Completion Status Enum
DO $$ BEGIN
    CREATE TYPE esr_product_completion_status_enum AS ENUM ('completed', 'in-progress', 'not-started', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Product Quality Status Enum
DO $$ BEGIN
    CREATE TYPE esr_product_quality_status_enum AS ENUM ('approved', 'pending-approval', 'off-specification', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Risk Status Enum
DO $$ BEGIN
    CREATE TYPE esr_risk_status_enum AS ENUM ('closed', 'transferred-next-stage', 'carried-forward', 'newly-identified');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Issue Status Enum
DO $$ BEGIN
    CREATE TYPE esr_issue_status_enum AS ENUM ('resolved', 'transferred-next-stage', 'carried-forward', 'newly-identified');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Follow-On Action Type Enum
DO $$ BEGIN
    CREATE TYPE esr_action_type_enum AS ENUM ('unfinished-work', 'open-issue', 'carried-forward-risk', 'lessons-implementation', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Follow-On Action Priority Enum
DO $$ BEGIN
    CREATE TYPE esr_action_priority_enum AS ENUM ('high', 'medium', 'low');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Follow-On Action Status Enum
DO $$ BEGIN
    CREATE TYPE esr_action_status_enum AS ENUM ('pending', 'in-progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Approval Status Enum
DO $$ BEGIN
    CREATE TYPE esr_approval_status_enum AS ENUM ('pending', 'approved', 'rejected', 'deferred');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Distribution Status Enum
DO $$ BEGIN
    CREATE TYPE esr_distribution_status_enum AS ENUM ('sent', 'read', 'acknowledged');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Benefits Review Status Enum
DO $$ BEGIN
    CREATE TYPE esr_benefits_review_status_enum AS ENUM ('on-track', 'at-risk', 'not-achievable');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ================================================
-- ALTER EXISTING TABLE: end_stage_reports
-- ================================================

-- Add version control field
ALTER TABLE end_stage_reports
ADD COLUMN IF NOT EXISTS version_no VARCHAR(20) DEFAULT '1.0';

-- Make report_reference UNIQUE (if not already)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'end_stage_reports_report_reference_key'
    ) THEN
        ALTER TABLE end_stage_reports
        ADD CONSTRAINT end_stage_reports_report_reference_key UNIQUE (report_reference);
    END IF;
END $$;

-- Add UNIQUE constraint on stage_boundary_id (one-to-one relationship)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'end_stage_reports_stage_boundary_id_key'
    ) THEN
        ALTER TABLE end_stage_reports
        ADD CONSTRAINT end_stage_reports_stage_boundary_id_key UNIQUE (stage_boundary_id);
    END IF;
END $$;

-- Project-Level Review Fields (Six Variables)
ALTER TABLE end_stage_reports
ADD COLUMN IF NOT EXISTS project_time_actual TEXT,
ADD COLUMN IF NOT EXISTS project_time_forecast TEXT,
ADD COLUMN IF NOT EXISTS project_cost_actual TEXT,
ADD COLUMN IF NOT EXISTS project_cost_forecast TEXT,
ADD COLUMN IF NOT EXISTS project_quality_actual TEXT,
ADD COLUMN IF NOT EXISTS project_quality_forecast TEXT,
ADD COLUMN IF NOT EXISTS project_scope_actual TEXT,
ADD COLUMN IF NOT EXISTS project_scope_forecast TEXT,
ADD COLUMN IF NOT EXISTS project_risk_actual TEXT,
ADD COLUMN IF NOT EXISTS project_risk_forecast TEXT,
ADD COLUMN IF NOT EXISTS project_benefits_actual TEXT,
ADD COLUMN IF NOT EXISTS project_benefits_forecast TEXT;

-- Business Case Review Fields
ALTER TABLE end_stage_reports
ADD COLUMN IF NOT EXISTS business_case_review_summary TEXT,
ADD COLUMN IF NOT EXISTS business_case_still_valid BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS business_case_changes_summary TEXT,
ADD COLUMN IF NOT EXISTS benefits_realized_summary TEXT,
ADD COLUMN IF NOT EXISTS benefits_review_status esr_benefits_review_status_enum;

-- Product/Deliverable Status (counts - detailed tracking in child table)
ALTER TABLE end_stage_reports
ADD COLUMN IF NOT EXISTS products_completed_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS products_approved_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS products_off_specification_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS products_handover_status TEXT;

-- Follow-On Actions Summary
ALTER TABLE end_stage_reports
ADD COLUMN IF NOT EXISTS follow_on_actions_summary TEXT,
ADD COLUMN IF NOT EXISTS unfinished_work_summary TEXT;

-- Distribution & Approval (enhanced)
ALTER TABLE end_stage_reports
ADD COLUMN IF NOT EXISTS distribution_list JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS approval_workflow_status VARCHAR(50) DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS approval_decision_date DATE,
ADD COLUMN IF NOT EXISTS approval_conditions TEXT;

-- Document Links
ALTER TABLE end_stage_reports
ADD COLUMN IF NOT EXISTS updated_business_case_id UUID,
ADD COLUMN IF NOT EXISTS updated_risk_register_version VARCHAR(50),
ADD COLUMN IF NOT EXISTS updated_issue_register_version VARCHAR(50);

-- Add foreign key for business case (if business_cases table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_cases') THEN
        ALTER TABLE end_stage_reports
        ADD CONSTRAINT fk_end_stage_reports_business_case 
        FOREIGN KEY (updated_business_case_id) 
        REFERENCES business_cases(id) 
        ON DELETE SET NULL;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update approval_status to use new workflow status if needed
-- (Keep existing approval_status for backward compatibility)

-- ================================================
-- NEW CHILD TABLES
-- ================================================

-- ================================================
-- TABLE 1: end_stage_report_revision_history
-- ================================================

CREATE TABLE IF NOT EXISTS end_stage_report_revision_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    end_stage_report_id UUID NOT NULL REFERENCES end_stage_reports(id) ON DELETE CASCADE,
    revision_date DATE NOT NULL DEFAULT CURRENT_DATE,
    version_number VARCHAR(20) NOT NULL,
    previous_version_number VARCHAR(20),
    summary_of_changes TEXT,
    changes_marked TEXT,
    revised_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_esr_revision_history_report_id ON end_stage_report_revision_history(end_stage_report_id);
CREATE INDEX IF NOT EXISTS idx_esr_revision_history_revised_by ON end_stage_report_revision_history(revised_by);

COMMENT ON TABLE end_stage_report_revision_history IS 'Revision history for End Stage Reports';

-- ================================================
-- TABLE 2: end_stage_report_product_status
-- ================================================

CREATE TABLE IF NOT EXISTS end_stage_report_product_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    end_stage_report_id UUID NOT NULL REFERENCES end_stage_reports(id) ON DELETE CASCADE,
    product_id UUID, -- FK to products/deliverables if table exists
    product_name VARCHAR(200) NOT NULL,
    product_description TEXT,
    completion_status esr_product_completion_status_enum NOT NULL DEFAULT 'not-started',
    quality_status esr_product_quality_status_enum NOT NULL DEFAULT 'pending-approval',
    approval_date DATE,
    approved_by UUID REFERENCES users(id),
    handover_status VARCHAR(50) DEFAULT 'pending-handover', -- 'handed-over', 'pending-handover', 'not-required'
    handover_date DATE,
    off_specification_details TEXT,
    follow_on_actions TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_esr_product_status_report_id ON end_stage_report_product_status(end_stage_report_id);
CREATE INDEX IF NOT EXISTS idx_esr_product_status_product_id ON end_stage_report_product_status(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_esr_product_status_completion ON end_stage_report_product_status(completion_status);
CREATE INDEX IF NOT EXISTS idx_esr_product_status_quality ON end_stage_report_product_status(quality_status);

COMMENT ON TABLE end_stage_report_product_status IS 'Product/deliverable status tracking for End Stage Reports';

-- ================================================
-- TABLE 3: end_stage_report_risk_review
-- ================================================

CREATE TABLE IF NOT EXISTS end_stage_report_risk_review (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    end_stage_report_id UUID NOT NULL REFERENCES end_stage_reports(id) ON DELETE CASCADE,
    risk_id UUID, -- FK to risks if table exists
    risk_title VARCHAR(200) NOT NULL,
    risk_description TEXT,
    risk_status esr_risk_status_enum NOT NULL DEFAULT 'carried-forward',
    original_probability VARCHAR(50),
    current_probability VARCHAR(50),
    original_impact VARCHAR(50),
    current_impact VARCHAR(50),
    risk_response_actions TEXT,
    effectiveness_of_response TEXT,
    lessons_from_risk TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_esr_risk_review_report_id ON end_stage_report_risk_review(end_stage_report_id);
CREATE INDEX IF NOT EXISTS idx_esr_risk_review_risk_id ON end_stage_report_risk_review(risk_id) WHERE risk_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_esr_risk_review_status ON end_stage_report_risk_review(risk_status);

COMMENT ON TABLE end_stage_report_risk_review IS 'Risk review for End Stage Reports';

-- ================================================
-- TABLE 4: end_stage_report_issue_review
-- ================================================

CREATE TABLE IF NOT EXISTS end_stage_report_issue_review (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    end_stage_report_id UUID NOT NULL REFERENCES end_stage_reports(id) ON DELETE CASCADE,
    issue_id UUID, -- FK to issues if table exists
    issue_title VARCHAR(200) NOT NULL,
    issue_description TEXT,
    issue_status esr_issue_status_enum NOT NULL DEFAULT 'carried-forward',
    issue_impact TEXT,
    resolution_actions TEXT,
    lessons_from_issue TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_esr_issue_review_report_id ON end_stage_report_issue_review(end_stage_report_id);
CREATE INDEX IF NOT EXISTS idx_esr_issue_review_issue_id ON end_stage_report_issue_review(issue_id) WHERE issue_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_esr_issue_review_status ON end_stage_report_issue_review(issue_status);

COMMENT ON TABLE end_stage_report_issue_review IS 'Issue review for End Stage Reports';

-- ================================================
-- TABLE 5: end_stage_report_follow_on_actions
-- ================================================

CREATE TABLE IF NOT EXISTS end_stage_report_follow_on_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    end_stage_report_id UUID NOT NULL REFERENCES end_stage_reports(id) ON DELETE CASCADE,
    action_description TEXT NOT NULL,
    action_type esr_action_type_enum NOT NULL DEFAULT 'other',
    priority esr_action_priority_enum NOT NULL DEFAULT 'medium',
    assigned_to UUID REFERENCES users(id),
    target_completion_date DATE,
    status esr_action_status_enum NOT NULL DEFAULT 'pending',
    completion_date DATE,
    related_risk_id UUID, -- FK to risks if table exists
    related_issue_id UUID, -- FK to issues if table exists
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_esr_follow_on_actions_report_id ON end_stage_report_follow_on_actions(end_stage_report_id);
CREATE INDEX IF NOT EXISTS idx_esr_follow_on_actions_assigned_to ON end_stage_report_follow_on_actions(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_esr_follow_on_actions_status ON end_stage_report_follow_on_actions(status);
CREATE INDEX IF NOT EXISTS idx_esr_follow_on_actions_risk_id ON end_stage_report_follow_on_actions(related_risk_id) WHERE related_risk_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_esr_follow_on_actions_issue_id ON end_stage_report_follow_on_actions(related_issue_id) WHERE related_issue_id IS NOT NULL;

COMMENT ON TABLE end_stage_report_follow_on_actions IS 'Follow-on actions for End Stage Reports';

-- ================================================
-- TABLE 6: end_stage_report_approvals
-- ================================================

CREATE TABLE IF NOT EXISTS end_stage_report_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    end_stage_report_id UUID NOT NULL REFERENCES end_stage_reports(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES users(id),
    approver_name VARCHAR(200),
    approver_title VARCHAR(200),
    approver_role VARCHAR(100), -- 'project-board-executive', 'project-board-senior-user', 'project-board-senior-supplier', 'pm', 'other'
    approval_date DATE,
    approval_status esr_approval_status_enum NOT NULL DEFAULT 'pending',
    approval_comments TEXT,
    conditions TEXT,
    signature_data TEXT,
    version_approved VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_esr_approvals_report_id ON end_stage_report_approvals(end_stage_report_id);
CREATE INDEX IF NOT EXISTS idx_esr_approvals_approver_id ON end_stage_report_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_esr_approvals_status ON end_stage_report_approvals(approval_status);

COMMENT ON TABLE end_stage_report_approvals IS 'Approval workflow for End Stage Reports';

-- ================================================
-- TABLE 7: end_stage_report_distribution
-- ================================================

CREATE TABLE IF NOT EXISTS end_stage_report_distribution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    end_stage_report_id UUID NOT NULL REFERENCES end_stage_reports(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id),
    recipient_name VARCHAR(200),
    recipient_email VARCHAR(200),
    recipient_title VARCHAR(200),
    recipient_role VARCHAR(100),
    date_of_issue DATE DEFAULT CURRENT_DATE,
    version_distributed VARCHAR(20),
    distribution_status esr_distribution_status_enum NOT NULL DEFAULT 'sent',
    acknowledgment_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_esr_distribution_report_id ON end_stage_report_distribution(end_stage_report_id);
CREATE INDEX IF NOT EXISTS idx_esr_distribution_recipient_id ON end_stage_report_distribution(recipient_id);
CREATE INDEX IF NOT EXISTS idx_esr_distribution_status ON end_stage_report_distribution(distribution_status);

COMMENT ON TABLE end_stage_report_distribution IS 'Distribution list for End Stage Reports';

-- ================================================
-- ADDITIONAL INDEXES ON end_stage_reports
-- ================================================

CREATE INDEX IF NOT EXISTS idx_end_stage_reports_version_no ON end_stage_reports(version_no) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_end_stage_reports_approval_workflow_status ON end_stage_reports(approval_workflow_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_end_stage_reports_updated_business_case_id ON end_stage_reports(updated_business_case_id) WHERE updated_business_case_id IS NOT NULL;

-- ================================================
-- DATABASE FUNCTIONS
-- ================================================

-- ================================================
-- Function: Get End Stage Report by Stage Boundary
-- ================================================

CREATE OR REPLACE FUNCTION get_end_stage_report_by_stage_boundary(p_stage_boundary_id UUID)
RETURNS TABLE (
    report_id UUID,
    report_reference VARCHAR,
    approval_status VARCHAR,
    approval_workflow_status VARCHAR,
    version_no VARCHAR,
    report_title VARCHAR,
    report_date DATE,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        esr.id AS report_id,
        esr.report_reference,
        esr.approval_status,
        esr.approval_workflow_status,
        esr.version_no,
        esr.report_title,
        esr.report_date,
        esr.created_at
    FROM end_stage_reports esr
    WHERE esr.stage_boundary_id = p_stage_boundary_id
      AND esr.is_deleted = FALSE
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_end_stage_report_by_stage_boundary IS 'Returns the end stage report for a specific stage boundary';

-- ================================================
-- Function: Generate End Stage Report Reference
-- ================================================

CREATE OR REPLACE FUNCTION generate_end_stage_report_reference(p_project_id UUID, p_stage_number INTEGER)
RETURNS VARCHAR AS $$
DECLARE
    v_project_code VARCHAR;
    v_report_count INTEGER;
    v_reference VARCHAR;
BEGIN
    -- Get project code
    SELECT project_code INTO v_project_code
    FROM projects
    WHERE id = p_project_id;
    
    IF v_project_code IS NULL THEN
        v_project_code := 'PROJ' || SUBSTRING(p_project_id::TEXT, 1, 8);
    END IF;
    
    -- Count existing reports for this project/stage combination
    SELECT COUNT(*) + 1 INTO v_report_count
    FROM end_stage_reports
    WHERE project_id = p_project_id
      AND stage_number = p_stage_number
      AND is_deleted = FALSE;
    
    -- Generate reference: ESR-PROJ001-STAGE1-001
    v_reference := 'ESR-' || UPPER(v_project_code) || '-STAGE' || p_stage_number || '-' || LPAD(v_report_count::TEXT, 3, '0');
    
    RETURN v_reference;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_end_stage_report_reference IS 'Generates unique report reference (e.g., ESR-PROJ001-STAGE1-001)';

-- ================================================
-- Function: Can Edit End Stage Report
-- ================================================

CREATE OR REPLACE FUNCTION can_edit_end_stage_report(p_report_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_report RECORD;
    v_user_role VARCHAR;
BEGIN
    -- Get report details
    SELECT 
        esr.approval_workflow_status,
        esr.approval_status,
        esr.created_by,
        esr.prepared_by
    INTO v_report
    FROM end_stage_reports esr
    WHERE esr.id = p_report_id
      AND esr.is_deleted = FALSE;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user is PMO Admin (can override)
    SELECT role INTO v_user_role
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND r.role_name = 'pmo_admin'
    LIMIT 1;
    
    IF v_user_role = 'pmo_admin' THEN
        RETURN TRUE; -- PMO Admins can always edit
    END IF;
    
    -- Check if report is approved (read-only except for PMO Admin)
    IF v_report.approval_workflow_status = 'approved' OR v_report.approval_status = 'approved' THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user is author or preparer
    IF v_report.created_by = p_user_id OR v_report.prepared_by = p_user_id THEN
        RETURN TRUE;
    END IF;
    
    -- Check if report is in draft or submitted status
    IF v_report.approval_workflow_status IN ('draft', 'submitted') THEN
        -- Check if user is project manager
        SELECT role INTO v_user_role
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = p_user_id
          AND r.role_name = 'project_manager'
        LIMIT 1;
        
        IF v_user_role = 'project_manager' THEN
            RETURN TRUE;
        END IF;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_edit_end_stage_report IS 'Checks if an end stage report can be edited by the user';

-- ================================================
-- Function: Validate End Stage Report Completeness
-- ================================================

CREATE OR REPLACE FUNCTION validate_end_stage_report_completeness(p_report_id UUID)
RETURNS TABLE (
    section_name VARCHAR,
    is_complete BOOLEAN,
    missing_fields TEXT[],
    completeness_percentage DECIMAL
) AS $$
DECLARE
    v_report RECORD;
    v_sections_complete INTEGER := 0;
    v_total_sections INTEGER := 11;
    v_missing_fields TEXT[];
    v_product_count INTEGER;
    v_risk_count INTEGER;
    v_issue_count INTEGER;
    v_follow_on_count INTEGER;
BEGIN
    -- Get report
    SELECT * INTO v_report
    FROM end_stage_reports
    WHERE id = p_report_id
      AND is_deleted = FALSE;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Section 1: Document Information
    v_missing_fields := ARRAY[]::TEXT[];
    IF v_report.report_reference IS NULL THEN
        v_missing_fields := array_append(v_missing_fields, 'report_reference');
    END IF;
    IF v_report.version_no IS NULL THEN
        v_missing_fields := array_append(v_missing_fields, 'version_no');
    END IF;
    IF array_length(v_missing_fields, 1) = 0 THEN
        v_sections_complete := v_sections_complete + 1;
    END IF;
    RETURN QUERY SELECT 'Document Information'::VARCHAR, (array_length(v_missing_fields, 1) = 0)::BOOLEAN, v_missing_fields, 
        CASE WHEN array_length(v_missing_fields, 1) = 0 THEN 100.0 ELSE 0.0 END::DECIMAL;
    
    -- Section 2: Basic Information
    v_missing_fields := ARRAY[]::TEXT[];
    IF v_report.report_title IS NULL OR v_report.report_title = '' THEN
        v_missing_fields := array_append(v_missing_fields, 'report_title');
    END IF;
    IF v_report.stage_objectives_summary IS NULL OR v_report.stage_objectives_summary = '' THEN
        v_missing_fields := array_append(v_missing_fields, 'stage_objectives_summary');
    END IF;
    IF array_length(v_missing_fields, 1) = 0 THEN
        v_sections_complete := v_sections_complete + 1;
    END IF;
    RETURN QUERY SELECT 'Basic Information'::VARCHAR, (array_length(v_missing_fields, 1) = 0)::BOOLEAN, v_missing_fields,
        CASE WHEN array_length(v_missing_fields, 1) = 0 THEN 100.0 ELSE 0.0 END::DECIMAL;
    
    -- Section 3: Project-Level Review (at least one field should be populated)
    v_missing_fields := ARRAY[]::TEXT[];
    IF v_report.project_time_actual IS NULL AND v_report.project_time_forecast IS NULL THEN
        v_missing_fields := array_append(v_missing_fields, 'project_time_actual or project_time_forecast');
    END IF;
    IF array_length(v_missing_fields, 1) = 0 THEN
        v_sections_complete := v_sections_complete + 1;
    END IF;
    RETURN QUERY SELECT 'Project-Level Review'::VARCHAR, (array_length(v_missing_fields, 1) = 0)::BOOLEAN, v_missing_fields,
        CASE WHEN array_length(v_missing_fields, 1) = 0 THEN 100.0 ELSE 0.0 END::DECIMAL;
    
    -- Section 4: Business Case Review
    v_missing_fields := ARRAY[]::TEXT[];
    IF v_report.business_case_review_summary IS NULL OR v_report.business_case_review_summary = '' THEN
        v_missing_fields := array_append(v_missing_fields, 'business_case_review_summary');
    END IF;
    IF v_report.business_case_still_valid IS NULL THEN
        v_missing_fields := array_append(v_missing_fields, 'business_case_still_valid');
    END IF;
    IF array_length(v_missing_fields, 1) = 0 THEN
        v_sections_complete := v_sections_complete + 1;
    END IF;
    RETURN QUERY SELECT 'Business Case Review'::VARCHAR, (array_length(v_missing_fields, 1) = 0)::BOOLEAN, v_missing_fields,
        CASE WHEN array_length(v_missing_fields, 1) = 0 THEN 100.0 ELSE 0.0 END::DECIMAL;
    
    -- Section 5: Stage Performance
    v_missing_fields := ARRAY[]::TEXT[];
    IF v_report.schedule_performance_index IS NULL THEN
        v_missing_fields := array_append(v_missing_fields, 'schedule_performance_index');
    END IF;
    IF v_report.cost_performance_index IS NULL THEN
        v_missing_fields := array_append(v_missing_fields, 'cost_performance_index');
    END IF;
    IF array_length(v_missing_fields, 1) = 0 THEN
        v_sections_complete := v_sections_complete + 1;
    END IF;
    RETURN QUERY SELECT 'Stage Performance'::VARCHAR, (array_length(v_missing_fields, 1) = 0)::BOOLEAN, v_missing_fields,
        CASE WHEN array_length(v_missing_fields, 1) = 0 THEN 100.0 ELSE 0.0 END::DECIMAL;
    
    -- Section 6: Product/Deliverable Status (at least one product should exist)
    SELECT COUNT(*) INTO v_product_count
    FROM end_stage_report_product_status
    WHERE end_stage_report_id = p_report_id;
    
    IF v_product_count = 0 THEN
        v_missing_fields := ARRAY['At least one product status entry required'];
    ELSE
        v_missing_fields := ARRAY[]::TEXT[];
        v_sections_complete := v_sections_complete + 1;
    END IF;
    RETURN QUERY SELECT 'Product/Deliverable Status'::VARCHAR, (array_length(v_missing_fields, 1) = 0)::BOOLEAN, v_missing_fields,
        CASE WHEN array_length(v_missing_fields, 1) = 0 THEN 100.0 ELSE 0.0 END::DECIMAL;
    
    -- Section 7: Risk and Issue Review (at least one should exist)
    SELECT COUNT(*) INTO v_risk_count
    FROM end_stage_report_risk_review
    WHERE end_stage_report_id = p_report_id;
    
    SELECT COUNT(*) INTO v_issue_count
    FROM end_stage_report_issue_review
    WHERE end_stage_report_id = p_report_id;
    
    IF v_risk_count = 0 AND v_issue_count = 0 THEN
        v_missing_fields := ARRAY['At least one risk or issue review required'];
    ELSE
        v_missing_fields := ARRAY[]::TEXT[];
        v_sections_complete := v_sections_complete + 1;
    END IF;
    RETURN QUERY SELECT 'Risk and Issue Review'::VARCHAR, (array_length(v_missing_fields, 1) = 0)::BOOLEAN, v_missing_fields,
        CASE WHEN array_length(v_missing_fields, 1) = 0 THEN 100.0 ELSE 0.0 END::DECIMAL;
    
    -- Section 8: Lessons Learned
    v_missing_fields := ARRAY[]::TEXT[];
    IF v_report.lessons_learned IS NULL OR v_report.lessons_learned = '' THEN
        v_missing_fields := array_append(v_missing_fields, 'lessons_learned');
    END IF;
    IF array_length(v_missing_fields, 1) = 0 THEN
        v_sections_complete := v_sections_complete + 1;
    END IF;
    RETURN QUERY SELECT 'Lessons Learned'::VARCHAR, (array_length(v_missing_fields, 1) = 0)::BOOLEAN, v_missing_fields,
        CASE WHEN array_length(v_missing_fields, 1) = 0 THEN 100.0 ELSE 0.0 END::DECIMAL;
    
    -- Section 9: Forecast for Next Stage
    v_missing_fields := ARRAY[]::TEXT[];
    IF v_report.next_stage_forecast IS NULL OR v_report.next_stage_forecast = '' THEN
        v_missing_fields := array_append(v_missing_fields, 'next_stage_forecast');
    END IF;
    IF array_length(v_missing_fields, 1) = 0 THEN
        v_sections_complete := v_sections_complete + 1;
    END IF;
    RETURN QUERY SELECT 'Forecast for Next Stage'::VARCHAR, (array_length(v_missing_fields, 1) = 0)::BOOLEAN, v_missing_fields,
        CASE WHEN array_length(v_missing_fields, 1) = 0 THEN 100.0 ELSE 0.0 END::DECIMAL;
    
    -- Section 10: Follow-On Actions (optional but recommended)
    SELECT COUNT(*) INTO v_follow_on_count
    FROM end_stage_report_follow_on_actions
    WHERE end_stage_report_id = p_report_id;
    
    IF v_follow_on_count = 0 THEN
        v_missing_fields := ARRAY['Follow-on actions recommended'];
    ELSE
        v_missing_fields := ARRAY[]::TEXT[];
    END IF;
    v_sections_complete := v_sections_complete + 1; -- Not blocking
    RETURN QUERY SELECT 'Follow-On Actions'::VARCHAR, TRUE::BOOLEAN, v_missing_fields,
        CASE WHEN array_length(v_missing_fields, 1) = 0 THEN 100.0 ELSE 50.0 END::DECIMAL;
    
    -- Section 11: Approval (not required for completeness check)
    RETURN QUERY SELECT 'Approval'::VARCHAR, TRUE::BOOLEAN, ARRAY[]::TEXT[], 100.0::DECIMAL;
    
    -- Overall completeness
    RETURN QUERY SELECT 'Overall'::VARCHAR, (v_sections_complete >= 9)::BOOLEAN, ARRAY[]::TEXT[],
        ROUND((v_sections_complete::DECIMAL / v_total_sections::DECIMAL) * 100, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION validate_end_stage_report_completeness IS 'Validates that all required sections are completed before submission';

-- ================================================
-- Function: Link Updated Documents
-- ================================================

CREATE OR REPLACE FUNCTION link_updated_documents(
    p_report_id UUID,
    p_business_case_id UUID DEFAULT NULL,
    p_risk_register_version VARCHAR DEFAULT NULL,
    p_issue_register_version VARCHAR DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE end_stage_reports
    SET 
        updated_business_case_id = COALESCE(p_business_case_id, updated_business_case_id),
        updated_risk_register_version = COALESCE(p_risk_register_version, updated_risk_register_version),
        updated_issue_register_version = COALESCE(p_issue_register_version, updated_issue_register_version),
        updated_at = NOW()
    WHERE id = p_report_id
      AND is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION link_updated_documents IS 'Links updated documents (business case, risk register, issue register) to the end stage report';

-- ================================================
-- Function: Auto Calculate Performance Metrics
-- ================================================

CREATE OR REPLACE FUNCTION auto_calculate_performance_metrics(p_report_id UUID)
RETURNS VOID AS $$
DECLARE
    v_report RECORD;
    v_schedule_variance INTEGER;
    v_cost_variance DECIMAL;
    v_spi DECIMAL;
    v_cpi DECIMAL;
    v_planned_days INTEGER;
    v_actual_days INTEGER;
BEGIN
    -- Get report
    SELECT 
        planned_start_date,
        actual_start_date,
        planned_end_date,
        actual_end_date,
        planned_budget,
        actual_cost
    INTO v_report
    FROM end_stage_reports
    WHERE id = p_report_id
      AND is_deleted = FALSE;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Calculate schedule variance and SPI
    IF v_report.planned_end_date IS NOT NULL AND v_report.actual_end_date IS NOT NULL THEN
        v_schedule_variance := EXTRACT(DAY FROM (v_report.actual_end_date - v_report.planned_end_date))::INTEGER;
        
        -- Calculate SPI (Schedule Performance Index)
        IF v_report.planned_start_date IS NOT NULL AND v_report.actual_start_date IS NOT NULL THEN
            v_planned_days := EXTRACT(DAY FROM (v_report.planned_end_date - v_report.planned_start_date))::INTEGER;
            v_actual_days := EXTRACT(DAY FROM (v_report.actual_end_date - v_report.actual_start_date))::INTEGER;
            
            IF v_planned_days > 0 THEN
                v_spi := v_actual_days::DECIMAL / v_planned_days::DECIMAL;
            ELSE
                v_spi := 1.0;
            END IF;
        ELSE
            -- Simple SPI calculation based on end dates
            v_spi := CASE 
                WHEN v_schedule_variance <= 0 THEN 1.0
                ELSE GREATEST(0.1, 1.0 - (v_schedule_variance::DECIMAL / 30.0))
            END;
        END IF;
    ELSE
        v_schedule_variance := 0;
        v_spi := 1.0;
    END IF;
    
    -- Calculate cost variance and CPI
    IF v_report.planned_budget IS NOT NULL AND v_report.actual_cost IS NOT NULL THEN
        v_cost_variance := v_report.actual_cost - v_report.planned_budget;
        
        -- Calculate CPI (Cost Performance Index)
        IF v_report.planned_budget > 0 THEN
            v_cpi := v_report.planned_budget / v_report.actual_cost;
        ELSE
            v_cpi := 1.0;
        END IF;
    ELSE
        v_cost_variance := 0;
        v_cpi := 1.0;
    END IF;
    
    -- Update report with calculated metrics
    UPDATE end_stage_reports
    SET 
        schedule_variance_days = v_schedule_variance,
        schedule_performance_index = v_spi,
        cost_variance = v_cost_variance,
        cost_performance_index = v_cpi,
        updated_at = NOW()
    WHERE id = p_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_calculate_performance_metrics IS 'Automatically calculates SPI, CPI, and other performance metrics from actual vs planned data';

-- ================================================
-- TRIGGERS
-- ================================================

-- ================================================
-- Trigger: Auto-generate report reference on creation
-- ================================================

CREATE OR REPLACE FUNCTION trigger_generate_end_stage_report_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.report_reference IS NULL OR NEW.report_reference = '' THEN
        NEW.report_reference := generate_end_stage_report_reference(NEW.project_id, COALESCE(NEW.stage_number, 1));
    END IF;
    
    IF NEW.version_no IS NULL OR NEW.version_no = '' THEN
        NEW.version_no := '1.0';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_end_stage_reports_generate_ref ON end_stage_reports;
CREATE TRIGGER trg_end_stage_reports_generate_ref
    BEFORE INSERT ON end_stage_reports
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_end_stage_report_reference();

-- ================================================
-- Trigger: Auto-calculate performance metrics on update
-- ================================================

CREATE OR REPLACE FUNCTION trigger_auto_calculate_performance_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Only recalculate if relevant fields changed
    IF (OLD.planned_start_date IS DISTINCT FROM NEW.planned_start_date) OR
       (OLD.actual_start_date IS DISTINCT FROM NEW.actual_start_date) OR
       (OLD.planned_end_date IS DISTINCT FROM NEW.planned_end_date) OR
       (OLD.actual_end_date IS DISTINCT FROM NEW.actual_end_date) OR
       (OLD.planned_budget IS DISTINCT FROM NEW.planned_budget) OR
       (OLD.actual_cost IS DISTINCT FROM NEW.actual_cost) THEN
        
        PERFORM auto_calculate_performance_metrics(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_end_stage_reports_auto_calculate_metrics ON end_stage_reports;
CREATE TRIGGER trg_end_stage_reports_auto_calculate_metrics
    AFTER UPDATE ON end_stage_reports
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_calculate_performance_metrics();

-- ================================================
-- Trigger: Update timestamps on child tables
-- ================================================

CREATE OR REPLACE FUNCTION trigger_update_esr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all child tables with updated_at
DROP TRIGGER IF EXISTS trg_esr_product_status_updated_at ON end_stage_report_product_status;
CREATE TRIGGER trg_esr_product_status_updated_at
    BEFORE UPDATE ON end_stage_report_product_status
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_esr_updated_at();

DROP TRIGGER IF EXISTS trg_esr_risk_review_updated_at ON end_stage_report_risk_review;
CREATE TRIGGER trg_esr_risk_review_updated_at
    BEFORE UPDATE ON end_stage_report_risk_review
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_esr_updated_at();

DROP TRIGGER IF EXISTS trg_esr_issue_review_updated_at ON end_stage_report_issue_review;
CREATE TRIGGER trg_esr_issue_review_updated_at
    BEFORE UPDATE ON end_stage_report_issue_review
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_esr_updated_at();

DROP TRIGGER IF EXISTS trg_esr_follow_on_actions_updated_at ON end_stage_report_follow_on_actions;
CREATE TRIGGER trg_esr_follow_on_actions_updated_at
    BEFORE UPDATE ON end_stage_report_follow_on_actions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_esr_updated_at();

-- ================================================
-- REGISTER TABLES IN database_tables
-- ================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
    ('end_stage_report_revision_history', 'Revision history for End Stage Reports', false, true, 'structured'),
    ('end_stage_report_product_status', 'Product/deliverable status tracking for End Stage Reports', false, true, 'structured'),
    ('end_stage_report_risk_review', 'Risk review for End Stage Reports', false, true, 'structured'),
    ('end_stage_report_issue_review', 'Issue review for End Stage Reports', false, true, 'structured'),
    ('end_stage_report_follow_on_actions', 'Follow-on actions for End Stage Reports', false, true, 'structured'),
    ('end_stage_report_approvals', 'Approval workflow for End Stage Reports', false, true, 'structured'),
    ('end_stage_report_distribution', 'Distribution list for End Stage Reports', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- END OF SCRIPT
-- ================================================

-- ================================================
-- File: v07_structured_tables.sql
-- Description: Structured/Traditional PM process tables for SU and IP modules
-- Version: 1.0
-- Date: 2025-01-XX
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v06 must be run first (all core tables must exist)
-- - projects table must exist

-- Purpose:
-- Creates Structured/Traditional PM process tables:
-- 1. project_mandates - Project Mandate (SU process)
-- 2. project_briefs - Project Brief (SU process)
-- 3. business_cases - Business Case (IP process)
-- 4. project_initiation_documents - PID (IP process)
-- 5. structured_process_steps - Process step tracking

-- Note: This script is idempotent and can be run multiple times safely
-- Note: Uses "structured" naming to avoid copyright/trademark issues

-- ================================================
-- TABLE 1: project_mandates
-- Description: Project Mandate documents (Structured PM Starting Up process)
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS project_mandates (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Mandate Information
    mandate_title VARCHAR(200) NOT NULL,
    mandate_description TEXT,
    mandate_reason TEXT,
    mandate_authority VARCHAR(200),  -- Who authorized the project
    mandate_date DATE,

    -- Business Justification
    business_justification TEXT,
    expected_benefits TEXT,
    expected_costs TEXT,

    -- Constraints and Assumptions
    constraints TEXT,
    assumptions TEXT,

    -- Status
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,

    -- Document
    document_content JSONB,  -- Full mandate document structure
    document_version INTEGER DEFAULT 1,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_mandates_project_id ON project_mandates(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_mandates_is_approved ON project_mandates(is_approved) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_project_mandates_before_insert ON project_mandates;
CREATE TRIGGER trg_project_mandates_before_insert
    BEFORE INSERT ON project_mandates
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_project_mandates_before_update ON project_mandates;
CREATE TRIGGER trg_project_mandates_before_update
    BEFORE UPDATE ON project_mandates
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE project_mandates IS 'Project Mandate documents for Structured PM Starting Up a Project process';
COMMENT ON COLUMN project_mandates.document_content IS 'JSONB structure for full mandate document';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('project_mandates', 'Project Mandate documents for Structured PM Starting Up a Project process', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 2: project_briefs
-- Description: Project Brief documents (Structured PM Starting Up process)
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS project_briefs (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    mandate_id UUID REFERENCES project_mandates(id),

    -- Brief Information
    brief_title VARCHAR(200) NOT NULL,
    brief_description TEXT,
    project_definition TEXT,
    project_objectives TEXT[],
    project_scope TEXT,
    out_of_scope TEXT,

    -- Project Approach
    project_approach TEXT,
    quality_approach TEXT,
    risk_approach TEXT,

    -- Team Structure
    executive_user_id UUID REFERENCES users(id),  -- Executive
    senior_user_id UUID REFERENCES users(id),     -- Senior User
    project_manager_user_id UUID REFERENCES users(id),  -- Project Manager

    -- Timeline
    target_start_date DATE,
    target_end_date DATE,
    key_milestones JSONB,

    -- Status
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,

    -- Document
    document_content JSONB,
    document_version INTEGER DEFAULT 1,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_briefs_project_id ON project_briefs(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_briefs_mandate_id ON project_briefs(mandate_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_briefs_is_approved ON project_briefs(is_approved) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_project_briefs_before_insert ON project_briefs;
CREATE TRIGGER trg_project_briefs_before_insert
    BEFORE INSERT ON project_briefs
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_project_briefs_before_update ON project_briefs;
CREATE TRIGGER trg_project_briefs_before_update
    BEFORE UPDATE ON project_briefs
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE project_briefs IS 'Project Brief documents for Structured PM Starting Up a Project process';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('project_briefs', 'Project Brief documents for Structured PM Starting Up a Project process', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 3: business_cases
-- Description: Business Case documents (Structured PM Initiating process)
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS business_cases (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    project_brief_id UUID REFERENCES project_briefs(id),

    -- Business Case Information
    case_title VARCHAR(200) NOT NULL,
    case_description TEXT,
    business_justification TEXT,
    expected_benefits TEXT[],
    expected_disbenefits TEXT[],
    expected_costs DECIMAL(15, 2),
    expected_timescale TEXT,

    -- Options Analysis
    options_considered JSONB,  -- Array of options with analysis
    recommended_option TEXT,
    reasons_for_recommendation TEXT,

    -- Risk Assessment
    major_risks TEXT[],
    risk_mitigation TEXT,

    -- Investment Appraisal
    investment_appraisal TEXT,
    return_on_investment DECIMAL(10, 2),
    payback_period INTEGER,  -- In months

    -- Status
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,

    -- Document
    document_content JSONB,
    document_version INTEGER DEFAULT 1,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_business_cases_project_id ON business_cases(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_business_cases_is_approved ON business_cases(is_approved) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_business_cases_before_insert ON business_cases;
CREATE TRIGGER trg_business_cases_before_insert
    BEFORE INSERT ON business_cases
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_business_cases_before_update ON business_cases;
CREATE TRIGGER trg_business_cases_before_update
    BEFORE UPDATE ON business_cases
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE business_cases IS 'Business Case documents for Structured PM Initiating a Project process';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('business_cases', 'Business Case documents for Structured PM Initiating a Project process', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 4: project_initiation_documents
-- Description: Project Initiation Documents (PID) - Structured PM Initiating process
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS project_initiation_documents (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    business_case_id UUID REFERENCES business_cases(id),
    project_brief_id UUID REFERENCES project_briefs(id),

    -- PID Information
    pid_title VARCHAR(200) NOT NULL,
    pid_description TEXT,

    -- Project Definition
    project_definition TEXT,
    project_objectives TEXT[],
    project_scope TEXT,
    exclusions TEXT,
    interfaces TEXT[],

    -- Project Approach
    project_approach TEXT,
    quality_approach TEXT,
    risk_approach TEXT,
    change_control_approach TEXT,
    communication_approach TEXT,

    -- Project Management Team
    executive_user_id UUID REFERENCES users(id),
    senior_user_user_id UUID REFERENCES users(id),
    senior_supplier_user_id UUID REFERENCES users(id),
    project_manager_user_id UUID REFERENCES users(id),
    team_manager_user_ids UUID[],  -- Array of team manager user IDs

    -- Project Controls
    tolerance_levels JSONB,  -- Time, cost, quality, scope, risk, benefit tolerances
    reporting_arrangements TEXT,
    monitoring_and_control TEXT,

    -- Project Plan Summary
    project_plan_summary JSONB,
    stage_plan_summary JSONB,

    -- Status
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,

    -- Document
    document_content JSONB,
    document_version INTEGER DEFAULT 1,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_initiation_documents_project_id ON project_initiation_documents(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_initiation_documents_is_approved ON project_initiation_documents(is_approved) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_project_initiation_documents_before_insert ON project_initiation_documents;
CREATE TRIGGER trg_project_initiation_documents_before_insert
    BEFORE INSERT ON project_initiation_documents
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_project_initiation_documents_before_update ON project_initiation_documents;
CREATE TRIGGER trg_project_initiation_documents_before_update
    BEFORE UPDATE ON project_initiation_documents
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE project_initiation_documents IS 'Project Initiation Documents (PID) for Structured PM Initiating a Project process';
COMMENT ON COLUMN project_initiation_documents.tolerance_levels IS 'JSONB structure for time, cost, quality, scope, risk, benefit tolerances';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('project_initiation_documents', 'Project Initiation Documents (PID) for Structured PM Initiating a Project process', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 5: structured_process_steps
-- Description: Structured PM process step tracking
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS structured_process_steps (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Process Information
    process_code VARCHAR(50) NOT NULL,  -- 'SU', 'IP', 'CS', 'MP', 'DP', 'SB', 'CP' (process codes)
    step_code VARCHAR(50) NOT NULL,     -- Step identifier within process
    step_name VARCHAR(200) NOT NULL,
    step_description TEXT,
    step_order INTEGER NOT NULL,

    -- Status
    status VARCHAR(50) DEFAULT 'not_started',  -- 'not_started', 'in_progress', 'completed', 'blocked'
    completed_at TIMESTAMP,
    completed_by UUID REFERENCES users(id),

    -- Notes
    notes TEXT,
    blockers TEXT,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Partial unique index (allows WHERE clause)
CREATE UNIQUE INDEX IF NOT EXISTS idx_structured_process_steps_unique 
ON structured_process_steps(project_id, process_code, step_code) 
WHERE is_deleted = FALSE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_structured_process_steps_project_id ON structured_process_steps(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_structured_process_steps_process_code ON structured_process_steps(process_code) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_structured_process_steps_status ON structured_process_steps(status) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_structured_process_steps_before_insert ON structured_process_steps;
CREATE TRIGGER trg_structured_process_steps_before_insert
    BEFORE INSERT ON structured_process_steps
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_structured_process_steps_before_update ON structured_process_steps;
CREATE TRIGGER trg_structured_process_steps_before_update
    BEFORE UPDATE ON structured_process_steps
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE structured_process_steps IS 'Structured PM process step tracking for all structured PM processes';
COMMENT ON COLUMN structured_process_steps.process_code IS 'Process codes: SU (Starting Up), IP (Initiating), CS, MP, DP, SB, CP';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('structured_process_steps', 'Structured PM process step tracking for all structured PM processes', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_tables_count INTEGER;
BEGIN
    -- Count Structured PM-related tables
    SELECT COUNT(*)
    INTO v_tables_count
    FROM database_tables
    WHERE table_category = 'structured'
      AND is_deleted = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Structured PM Tables Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Structured PM Tables Created: %', v_tables_count;
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v07_structured_tables.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================



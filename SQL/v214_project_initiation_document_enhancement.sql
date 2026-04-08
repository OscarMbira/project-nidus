-- ============================================================================
-- Project Initiation Document Enhancement - Comprehensive PID Module
-- Version: v214
-- Description: Enhances existing project_initiation_documents table and creates supporting tables
-- Date: 2026-01-20
-- ============================================================================
--
-- Purpose:
-- Enhances the existing project_initiation_documents table (from v07) with additional fields
-- and creates supporting tables for detailed PID sections.
--
-- Prerequisites:
-- - v07_structured_tables.sql must be run (project_initiation_documents table exists)
-- - v160_project_mandate_tables.sql (project_mandates)
-- - v163_project_brief_tables.sql (project_briefs)
-- - v177_project_product_description_tables.sql (project_product_descriptions)
-- - v180_quality_management_strategy_tables.sql (quality_management_strategies)
-- - Risk management strategy table exists
-- - v185_configuration_management_strategy_tables.sql (configuration_management_strategies)
-- - v190_communication_management_strategy_tables.sql (communication_management_strategies)
-- - business_cases table exists
-- - users table exists
--
-- ============================================================================
-- SECTION 1: ENHANCE EXISTING project_initiation_documents TABLE
-- ============================================================================

-- Add missing fields to existing table (only if they don't exist)
DO $$
BEGIN
    -- Add pid_reference if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'pid_reference') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN pid_reference VARCHAR(50) UNIQUE;
    END IF;

    -- Add version_number if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'version_number') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN version_number VARCHAR(20) DEFAULT '1.0';
    END IF;

    -- Add release if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'release') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN release VARCHAR(50);
    END IF;

    -- Add document_ref if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'document_ref') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN document_ref VARCHAR(200);
    END IF;

    -- Add project_mandate_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'project_mandate_id') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN project_mandate_id UUID REFERENCES project_mandates(id) ON DELETE SET NULL;
    END IF;

    -- Add project_product_description_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'project_product_description_id') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN project_product_description_id UUID REFERENCES project_product_descriptions(id) ON DELETE SET NULL;
    END IF;

    -- Add strategy links
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'quality_management_strategy_id') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN quality_management_strategy_id UUID REFERENCES quality_management_strategies(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'risk_management_strategy_id') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN risk_management_strategy_id UUID REFERENCES risk_management_strategies(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'configuration_management_strategy_id') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN configuration_management_strategy_id UUID REFERENCES configuration_management_strategies(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'communication_management_strategy_id') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN communication_management_strategy_id UUID REFERENCES communication_management_strategies(id) ON DELETE SET NULL;
    END IF;

    -- Add additional fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'project_background') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN project_background TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'project_justification') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN project_justification TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'dependencies') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN dependencies TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'success_criteria') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN success_criteria TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'project_outcomes') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN project_outcomes TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'expected_benefits') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN expected_benefits TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'development_approach') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN development_approach TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'configuration_management_approach') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN configuration_management_approach TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'procurement_approach') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN procurement_approach TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'project_assurance_user_id') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN project_assurance_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'change_authority_user_id') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN change_authority_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'control_mechanisms') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN control_mechanisms TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'stage_boundary_reviews') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN stage_boundary_reviews TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'timeline_summary') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN timeline_summary TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'budget_summary') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN budget_summary TEXT;
    END IF;

    -- Add status enum field if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'status') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN status VARCHAR(50) DEFAULT 'draft' 
        CHECK (status IN ('draft', 'under_review', 'approved', 'superseded'));
    END IF;

    -- Add approved_date if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'approved_date') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN approved_date DATE;
    END IF;

    -- Add author_id and owner_id if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'author_id') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN author_id UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'author_name') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN author_name VARCHAR(200);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'owner_id') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN owner_id UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_initiation_documents' AND column_name = 'owner_name') THEN
        ALTER TABLE project_initiation_documents 
        ADD COLUMN owner_name VARCHAR(200);
    END IF;
END $$;

-- Update existing records to set default status
UPDATE project_initiation_documents 
SET status = CASE 
    WHEN is_approved = TRUE THEN 'approved'
    ELSE 'draft'
END
WHERE status IS NULL;

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_pid_pid_reference ON project_initiation_documents(pid_reference) WHERE pid_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pid_status ON project_initiation_documents(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_pid_project_mandate_id ON project_initiation_documents(project_mandate_id) WHERE project_mandate_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pid_project_product_description_id ON project_initiation_documents(project_product_description_id) WHERE project_product_description_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pid_quality_management_strategy_id ON project_initiation_documents(quality_management_strategy_id) WHERE quality_management_strategy_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pid_risk_management_strategy_id ON project_initiation_documents(risk_management_strategy_id) WHERE risk_management_strategy_id IS NOT NULL;

-- ============================================================================
-- SECTION 2: CREATE ENUM TYPES FOR SUPPORTING TABLES
-- ============================================================================

-- Objective category enum
DO $$ BEGIN
    CREATE TYPE pid_objective_category_enum AS ENUM ('business', 'technical', 'quality', 'compliance', 'stakeholder', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Objective priority enum
DO $$ BEGIN
    CREATE TYPE pid_priority_enum AS ENUM ('must_have', 'should_have', 'could_have', 'wont_have');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Interface type enum
DO $$ BEGIN
    CREATE TYPE pid_interface_type_enum AS ENUM ('other_project', 'business_as_usual', 'programme', 'portfolio', 'external_organization', 'system', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Dependency type enum
DO $$ BEGIN
    CREATE TYPE pid_dependency_type_enum AS ENUM ('external', 'internal', 'organizational', 'technical', 'resource', 'regulatory', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Dependency status enum
DO $$ BEGIN
    CREATE TYPE pid_dependency_status_enum AS ENUM ('satisfied', 'pending', 'at_risk', 'not_met');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Role type enum
DO $$ BEGIN
    CREATE TYPE pid_role_type_enum AS ENUM ('project_board', 'project_management', 'team_management', 'assurance', 'support', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tolerance type enum
DO $$ BEGIN
    CREATE TYPE pid_tolerance_type_enum AS ENUM ('time', 'cost', 'quality', 'scope', 'risk', 'benefit');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Report type enum
DO $$ BEGIN
    CREATE TYPE pid_report_type_enum AS ENUM ('highlight_report', 'checkpoint_report', 'end_stage_report', 'exception_report', 'end_project_report', 'ad_hoc');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Report format enum
DO $$ BEGIN
    CREATE TYPE pid_report_format_enum AS ENUM ('written', 'verbal', 'dashboard', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Approval status enum
DO $$ BEGIN
    CREATE TYPE pid_approval_status_enum AS ENUM ('pending', 'approved', 'rejected', 'conditional');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Approver role enum
DO $$ BEGIN
    CREATE TYPE pid_approver_role_enum AS ENUM ('executive', 'senior_user', 'senior_supplier', 'project_board_member', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- SECTION 3: CREATE SUPPORTING TABLES
-- ============================================================================

-- Table 1: pid_objectives
CREATE TABLE IF NOT EXISTS pid_objectives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pid_id UUID NOT NULL REFERENCES project_initiation_documents(id) ON DELETE CASCADE,
    objective_number INTEGER NOT NULL,
    objective_reference VARCHAR(50),
    objective_title VARCHAR(200) NOT NULL,
    objective_description TEXT NOT NULL,
    objective_category VARCHAR(50) DEFAULT 'business' CHECK (objective_category IN ('business', 'technical', 'quality', 'compliance', 'stakeholder', 'other')),
    priority VARCHAR(50) DEFAULT 'should_have' CHECK (priority IN ('must_have', 'should_have', 'could_have', 'wont_have')),
    success_criteria TEXT,
    measurement_method TEXT,
    target_value VARCHAR(100),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE(pid_id, objective_reference)
);

CREATE INDEX IF NOT EXISTS idx_pid_objectives_pid_id ON pid_objectives(pid_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_pid_objectives_category ON pid_objectives(objective_category) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_pid_objectives_priority ON pid_objectives(priority) WHERE is_deleted = false;

-- Table 2: pid_interfaces
CREATE TABLE IF NOT EXISTS pid_interfaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pid_id UUID NOT NULL REFERENCES project_initiation_documents(id) ON DELETE CASCADE,
    interface_type VARCHAR(50) NOT NULL CHECK (interface_type IN ('other_project', 'business_as_usual', 'programme', 'portfolio', 'external_organization', 'system', 'other')),
    interface_name VARCHAR(200) NOT NULL,
    interface_description TEXT,
    interface_contact VARCHAR(200),
    interface_impact TEXT,
    management_arrangement TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pid_interfaces_pid_id ON pid_interfaces(pid_id) WHERE is_deleted = false;

-- Table 3: pid_dependencies
CREATE TABLE IF NOT EXISTS pid_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pid_id UUID NOT NULL REFERENCES project_initiation_documents(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) NOT NULL CHECK (dependency_type IN ('external', 'internal', 'organizational', 'technical', 'resource', 'regulatory', 'other')),
    dependency_name VARCHAR(200) NOT NULL,
    dependency_description TEXT,
    dependency_owner VARCHAR(200),
    dependency_status VARCHAR(50) DEFAULT 'pending' CHECK (dependency_status IN ('satisfied', 'pending', 'at_risk', 'not_met')),
    dependency_impact TEXT,
    mitigation_plan TEXT,
    expected_date DATE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pid_dependencies_pid_id ON pid_dependencies(pid_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_pid_dependencies_status ON pid_dependencies(dependency_status) WHERE is_deleted = false;

-- Table 4: pid_team_structure
CREATE TABLE IF NOT EXISTS pid_team_structure (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pid_id UUID NOT NULL REFERENCES project_initiation_documents(id) ON DELETE CASCADE,
    role_name VARCHAR(200) NOT NULL,
    role_description TEXT,
    assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_user_name VARCHAR(200),
    role_type VARCHAR(50) DEFAULT 'project_management' CHECK (role_type IN ('project_board', 'project_management', 'team_management', 'assurance', 'support', 'other')),
    responsibilities TEXT,
    authority_level VARCHAR(100),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pid_team_structure_pid_id ON pid_team_structure(pid_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_pid_team_structure_user_id ON pid_team_structure(assigned_user_id) WHERE assigned_user_id IS NOT NULL;

-- Table 5: pid_tolerances
CREATE TABLE IF NOT EXISTS pid_tolerances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pid_id UUID NOT NULL REFERENCES project_initiation_documents(id) ON DELETE CASCADE,
    tolerance_type VARCHAR(50) NOT NULL CHECK (tolerance_type IN ('time', 'cost', 'quality', 'scope', 'risk', 'benefit')),
    tolerance_description TEXT NOT NULL,
    tolerance_level VARCHAR(100),
    measurement_method TEXT,
    exception_process TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE(pid_id, tolerance_type)
);

CREATE INDEX IF NOT EXISTS idx_pid_tolerances_pid_id ON pid_tolerances(pid_id) WHERE is_deleted = false;

-- Table 6: pid_reporting_arrangements
CREATE TABLE IF NOT EXISTS pid_reporting_arrangements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pid_id UUID NOT NULL REFERENCES project_initiation_documents(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('highlight_report', 'checkpoint_report', 'end_stage_report', 'exception_report', 'end_project_report', 'ad_hoc')),
    report_frequency VARCHAR(100),
    report_recipients TEXT,
    report_template VARCHAR(200),
    report_format VARCHAR(50) DEFAULT 'written' CHECK (report_format IN ('written', 'verbal', 'dashboard', 'other')),
    report_owner UUID REFERENCES users(id) ON DELETE SET NULL,
    report_description TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pid_reporting_arrangements_pid_id ON pid_reporting_arrangements(pid_id) WHERE is_deleted = false;

-- Table 7: pid_revision_history
CREATE TABLE IF NOT EXISTS pid_revision_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pid_id UUID NOT NULL REFERENCES project_initiation_documents(id) ON DELETE CASCADE,
    revision_date DATE NOT NULL,
    previous_revision_date DATE,
    summary_of_changes TEXT NOT NULL,
    changes_marked TEXT,
    revised_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    change_request_id UUID, -- Will reference change_requests when available
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pid_revision_history_pid_id ON pid_revision_history(pid_id);
CREATE INDEX IF NOT EXISTS idx_pid_revision_history_revision_date ON pid_revision_history(revision_date);

-- Table 8: pid_approvals
CREATE TABLE IF NOT EXISTS pid_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pid_id UUID NOT NULL REFERENCES project_initiation_documents(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    approver_name VARCHAR(200) NOT NULL,
    approver_title VARCHAR(200),
    approver_role VARCHAR(50) CHECK (approver_role IN ('executive', 'senior_user', 'senior_supplier', 'project_board_member', 'other')),
    signature_data TEXT,
    approval_date DATE,
    approval_status VARCHAR(50) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'conditional')),
    comments TEXT,
    version_approved VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pid_approvals_pid_id ON pid_approvals(pid_id);
CREATE INDEX IF NOT EXISTS idx_pid_approvals_status ON pid_approvals(approval_status);
CREATE INDEX IF NOT EXISTS idx_pid_approvals_approver_id ON pid_approvals(approver_id);

-- Table 9: pid_distribution
CREATE TABLE IF NOT EXISTS pid_distribution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pid_id UUID NOT NULL REFERENCES project_initiation_documents(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_name VARCHAR(200) NOT NULL,
    recipient_title VARCHAR(200),
    date_of_issue DATE NOT NULL,
    version_distributed VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pid_distribution_pid_id ON pid_distribution(pid_id);
CREATE INDEX IF NOT EXISTS idx_pid_distribution_recipient_id ON pid_distribution(recipient_id);

-- ============================================================================
-- SECTION 4: DATABASE FUNCTIONS
-- ============================================================================

-- Function: Generate PID Reference
CREATE OR REPLACE FUNCTION generate_pid_reference()
RETURNS VARCHAR AS $$
DECLARE
    v_year INTEGER;
    v_seq INTEGER;
    v_ref VARCHAR(50);
BEGIN
    v_year := EXTRACT(YEAR FROM NOW());
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(pid_reference FROM '\d+$') AS INTEGER)), 0) + 1
    INTO v_seq
    FROM project_initiation_documents
    WHERE pid_reference LIKE 'PID-' || v_year || '-%'
      AND is_deleted = false;
    
    v_ref := 'PID-' || v_year || '-' || LPAD(v_seq::TEXT, 3, '0');
    
    RETURN v_ref;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_pid_reference() IS 'Generates unique PID reference number (PID-YYYY-NNN)';

-- Function: Generate Objective Reference
CREATE OR REPLACE FUNCTION generate_objective_reference(p_pid_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_count INTEGER;
    v_ref VARCHAR(50);
BEGIN
    SELECT COUNT(*) + 1 INTO v_count
    FROM pid_objectives
    WHERE pid_id = p_pid_id
      AND is_deleted = false;
    
    v_ref := 'OBJ-' || LPAD(v_count::TEXT, 3, '0');
    
    RETURN v_ref;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_objective_reference(UUID) IS 'Generates objective reference (OBJ-NNN)';

-- ============================================================================
-- SECTION 5: TRIGGERS
-- ============================================================================

-- Trigger: Auto-generate pid_reference on INSERT
CREATE OR REPLACE FUNCTION trg_pid_generate_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.pid_reference IS NULL OR NEW.pid_reference = '' THEN
        NEW.pid_reference := generate_pid_reference();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_initiation_documents_generate_reference ON project_initiation_documents;
CREATE TRIGGER trg_project_initiation_documents_generate_reference
    BEFORE INSERT ON project_initiation_documents
    FOR EACH ROW
    EXECUTE FUNCTION trg_pid_generate_reference();

-- Trigger: Auto-generate objective_reference on INSERT
CREATE OR REPLACE FUNCTION trg_pid_objective_generate_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.objective_reference IS NULL OR NEW.objective_reference = '' THEN
        NEW.objective_reference := generate_objective_reference(NEW.pid_id);
    END IF;
    
    -- Set objective_number if not set
    IF NEW.objective_number IS NULL OR NEW.objective_number = 0 THEN
        SELECT COALESCE(MAX(objective_number), 0) + 1 INTO NEW.objective_number
        FROM pid_objectives
        WHERE pid_id = NEW.pid_id
          AND is_deleted = false;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pid_objectives_generate_reference ON pid_objectives;
CREATE TRIGGER trg_pid_objectives_generate_reference
    BEFORE INSERT ON pid_objectives
    FOR EACH ROW
    EXECUTE FUNCTION trg_pid_objective_generate_reference();

-- ============================================================================
-- SECTION 6: REGISTER TABLES IN database_tables REGISTRY (if exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'database_tables') THEN
        -- Register main table (if not already registered)
        INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
        VALUES ('project_initiation_documents', 'Project Initiation Documents (PID)', false, true, 'structured')
        ON CONFLICT (table_name) DO UPDATE SET
            table_description = EXCLUDED.table_description,
            table_category = EXCLUDED.table_category,
            updated_at = NOW();

        -- Register supporting tables
        INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
        VALUES 
            ('pid_objectives', 'PID Objectives', false, true, 'structured'),
            ('pid_interfaces', 'PID Interfaces', false, true, 'structured'),
            ('pid_dependencies', 'PID Dependencies', false, true, 'structured'),
            ('pid_team_structure', 'PID Team Structure', false, true, 'structured'),
            ('pid_tolerances', 'PID Tolerances', false, true, 'structured'),
            ('pid_reporting_arrangements', 'PID Reporting Arrangements', false, true, 'structured'),
            ('pid_revision_history', 'PID Revision History', false, true, 'structured'),
            ('pid_approvals', 'PID Approvals', false, true, 'structured'),
            ('pid_distribution', 'PID Distribution', false, true, 'structured')
        ON CONFLICT (table_name) DO UPDATE SET
            table_description = EXCLUDED.table_description,
            table_category = EXCLUDED.table_category,
            updated_at = NOW();
    END IF;
END $$;

DO $$
BEGIN
    RAISE NOTICE 'v214_project_initiation_document_enhancement.sql completed successfully';
END $$;

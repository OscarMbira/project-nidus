-- ============================================================================
-- Communication Management Strategy - Database Schema
-- Version: v190
-- Description: Creates tables for Communication Management Strategy module
-- Date: 2026-01-20
-- ============================================================================
--
-- Purpose:
-- This script creates the database schema for the Communication Management Strategy module,
-- which defines HOW communication will be managed in the project. This is a strategic document
-- that establishes communication management procedures, channels, methods, roles, responsibilities,
-- and timing for all communication activities.
--
-- Prerequisites:
-- - Core tables must exist (projects, users, accounts)
-- - Existing communication_plans and stakeholder_communications tables should exist
--
-- ============================================================================
-- SECTION 1: CREATE ENUM TYPES
-- ============================================================================

-- CMS Status Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cms_status_enum') THEN
        CREATE TYPE cms_status_enum AS ENUM ('draft', 'under_review', 'approved', 'superseded');
    END IF;
END $$;

-- Channel Type Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cms_channel_type_enum') THEN
        CREATE TYPE cms_channel_type_enum AS ENUM ('email', 'meeting', 'face_to_face', 'video_call', 'phone', 'report', 'presentation', 'portal', 'intranet', 'newsletter', 'other');
    END IF;
END $$;

-- Method Type Enum (IAP2 Spectrum)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cms_method_type_enum') THEN
        CREATE TYPE cms_method_type_enum AS ENUM ('inform', 'consult', 'involve', 'collaborate', 'empower');
    END IF;
END $$;

-- Audience Group Type Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cms_audience_type_enum') THEN
        CREATE TYPE cms_audience_type_enum AS ENUM ('project_board', 'project_team', 'stakeholders', 'customers', 'suppliers', 'regulators', 'public', 'other');
    END IF;
END $$;

-- Frequency Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cms_frequency_enum') THEN
        CREATE TYPE cms_frequency_enum AS ENUM ('continuous', 'daily', 'weekly', 'bi_weekly', 'monthly', 'stage_end', 'on_demand');
    END IF;
END $$;

-- Confidentiality Level Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cms_confidentiality_enum') THEN
        CREATE TYPE cms_confidentiality_enum AS ENUM ('public', 'internal', 'confidential', 'restricted');
    END IF;
END $$;

-- Standard Type Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cms_standard_type_enum') THEN
        CREATE TYPE cms_standard_type_enum AS ENUM ('branding', 'tone', 'format', 'language', 'accessibility', 'compliance', 'other');
    END IF;
END $$;

-- Compliance Level Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cms_compliance_level_enum') THEN
        CREATE TYPE cms_compliance_level_enum AS ENUM ('mandatory', 'recommended', 'optional');
    END IF;
END $$;

-- Tool Type Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cms_tool_type_enum') THEN
        CREATE TYPE cms_tool_type_enum AS ENUM ('software', 'platform', 'hardware', 'template', 'framework', 'other');
    END IF;
END $$;

-- Proficiency Level Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cms_proficiency_enum') THEN
        CREATE TYPE cms_proficiency_enum AS ENUM ('none', 'basic', 'intermediate', 'advanced');
    END IF;
END $$;

-- Record Type Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cms_record_type_enum') THEN
        CREATE TYPE cms_record_type_enum AS ENUM ('communication_register', 'meeting_minutes', 'presentation_slides', 'reports', 'emails', 'feedback', 'other');
    END IF;
END $$;

-- Report Type Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cms_report_type_enum') THEN
        CREATE TYPE cms_report_type_enum AS ENUM ('status_report', 'progress_report', 'exception_report', 'highlight_report', 'dashboard', 'summary', 'other');
    END IF;
END $$;

-- Report Frequency Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cms_report_frequency_enum') THEN
        CREATE TYPE cms_report_frequency_enum AS ENUM ('daily', 'weekly', 'bi_weekly', 'monthly', 'stage_end', 'on_demand', 'triggered');
    END IF;
END $$;

-- Distribution Method Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cms_distribution_method_enum') THEN
        CREATE TYPE cms_distribution_method_enum AS ENUM ('email', 'portal', 'meeting', 'document', 'automated');
    END IF;
END $$;

-- Activity Type Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cms_activity_type_enum') THEN
        CREATE TYPE cms_activity_type_enum AS ENUM ('meeting', 'report', 'presentation', 'briefing', 'review', 'workshop', 'other');
    END IF;
END $$;

-- Activity Timing Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cms_activity_timing_enum') THEN
        CREATE TYPE cms_activity_timing_enum AS ENUM ('project_start', 'stage_start', 'stage_end', 'milestone', 'periodic', 'on_demand', 'project_end');
    END IF;
END $$;

-- Role Type Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cms_role_type_enum') THEN
        CREATE TYPE cms_role_type_enum AS ENUM ('project_board', 'project_manager', 'communication_manager', 'team_leader', 'report_author', 'presenter', 'external_communicator', 'other');
    END IF;
END $$;

-- Approval Status Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cms_approval_status_enum') THEN
        CREATE TYPE cms_approval_status_enum AS ENUM ('pending', 'approved', 'rejected');
    END IF;
END $$;

-- ============================================================================
-- SECTION 2: CREATE communication_management_strategies TABLE (Main Table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS communication_management_strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Document Reference
    project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    cms_reference VARCHAR(100) UNIQUE NOT NULL,
    document_ref VARCHAR(100),
    version_number VARCHAR(20) DEFAULT '1.0',
    release VARCHAR(100),

    -- Ownership
    author_id UUID REFERENCES users(id),
    author_name VARCHAR(200),
    owner_id UUID REFERENCES users(id),
    owner_name VARCHAR(200),
    client_id UUID REFERENCES users(id),
    client_name VARCHAR(200),

    -- Introduction Section
    purpose TEXT,
    objectives TEXT,
    scope TEXT,
    strategy_responsibility TEXT,

    -- Communication Management Procedure
    communication_planning_approach TEXT,
    communication_control_approach TEXT,
    communication_assurance_approach TEXT,
    variance_from_corporate TEXT,
    variance_justification TEXT,

    -- References
    customer_communication_requirements TEXT,
    stakeholder_communication_preferences TEXT,
    corporate_communication_policy_reference TEXT,
    programme_communication_policy_reference TEXT,

    -- Status
    status cms_status_enum DEFAULT 'draft',
    approved_date DATE,
    approved_by UUID REFERENCES users(id),

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_cms_project ON communication_management_strategies(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_cms_reference ON communication_management_strategies(cms_reference) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_cms_status ON communication_management_strategies(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_cms_owner ON communication_management_strategies(owner_id) WHERE is_deleted = FALSE;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_cms_updated_at ON communication_management_strategies;
CREATE TRIGGER trg_cms_updated_at
    BEFORE UPDATE ON communication_management_strategies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE communication_management_strategies IS 'Main document for Communication Management Strategy - defines how communication will be managed in the project';
COMMENT ON COLUMN communication_management_strategies.project_id IS 'One strategy per project (UNIQUE constraint)';
COMMENT ON COLUMN communication_management_strategies.cms_reference IS 'Unique reference like CMS-2026-001';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('communication_management_strategies', 'Main document for Communication Management Strategy', false, true, 'communication')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 3: CREATE cms_communication_channels TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cms_communication_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cms_id UUID NOT NULL REFERENCES communication_management_strategies(id) ON DELETE CASCADE,
    channel_name VARCHAR(200) NOT NULL,
    channel_type cms_channel_type_enum NOT NULL,
    channel_description TEXT,
    applicability TEXT,
    effectiveness_rating INTEGER CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 5),
    accessibility_requirements TEXT,
    cost_estimate DECIMAL(12,2),
    is_preferred BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_channels_cms ON cms_communication_channels(cms_id);
CREATE INDEX IF NOT EXISTS idx_cms_channels_type ON cms_communication_channels(channel_type);
CREATE INDEX IF NOT EXISTS idx_cms_channels_preferred ON cms_communication_channels(is_preferred) WHERE is_preferred = TRUE;

COMMENT ON TABLE cms_communication_channels IS 'Communication channels available for the project (email, meetings, reports, etc.)';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('cms_communication_channels', 'Communication channels for Communication Management Strategy', false, true, 'communication')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 4: CREATE cms_communication_methods TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cms_communication_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cms_id UUID NOT NULL REFERENCES communication_management_strategies(id) ON DELETE CASCADE,
    method_name VARCHAR(200) NOT NULL,
    method_type cms_method_type_enum NOT NULL,
    method_description TEXT,
    when_to_use TEXT,
    entry_criteria TEXT,
    exit_criteria TEXT,
    required_participants TEXT,
    documentation_required TEXT,
    is_mandatory BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_methods_cms ON cms_communication_methods(cms_id);
CREATE INDEX IF NOT EXISTS idx_cms_methods_type ON cms_communication_methods(method_type);
CREATE INDEX IF NOT EXISTS idx_cms_methods_mandatory ON cms_communication_methods(is_mandatory) WHERE is_mandatory = TRUE;

COMMENT ON TABLE cms_communication_methods IS 'Communication methods following IAP2 spectrum (inform, consult, involve, collaborate, empower)';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('cms_communication_methods', 'Communication methods for Communication Management Strategy', false, true, 'communication')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 5: CREATE cms_audience_groups TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cms_audience_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cms_id UUID NOT NULL REFERENCES communication_management_strategies(id) ON DELETE CASCADE,
    group_name VARCHAR(200) NOT NULL,
    group_type cms_audience_type_enum NOT NULL,
    group_description TEXT,
    stakeholder_category TEXT,
    communication_needs TEXT,
    frequency_preference cms_frequency_enum,
    channel_preferences TEXT[],
    key_messages TEXT[],
    confidentiality_level cms_confidentiality_enum DEFAULT 'internal',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_audience_cms ON cms_audience_groups(cms_id);
CREATE INDEX IF NOT EXISTS idx_cms_audience_type ON cms_audience_groups(group_type);
CREATE INDEX IF NOT EXISTS idx_cms_audience_confidentiality ON cms_audience_groups(confidentiality_level);

COMMENT ON TABLE cms_audience_groups IS 'Target audience groups for communication (Project Board, Team Members, Customers, etc.)';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('cms_audience_groups', 'Target audience groups for Communication Management Strategy', false, true, 'communication')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 6: CREATE cms_communication_standards TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cms_communication_standards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cms_id UUID NOT NULL REFERENCES communication_management_strategies(id) ON DELETE CASCADE,
    standard_name VARCHAR(200) NOT NULL,
    standard_type cms_standard_type_enum NOT NULL,
    standard_description TEXT,
    applicability TEXT,
    compliance_level cms_compliance_level_enum DEFAULT 'recommended',
    template_reference VARCHAR(200),
    external_link VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_standards_cms ON cms_communication_standards(cms_id);
CREATE INDEX IF NOT EXISTS idx_cms_standards_type ON cms_communication_standards(standard_type);
CREATE INDEX IF NOT EXISTS idx_cms_standards_compliance ON cms_communication_standards(compliance_level);

COMMENT ON TABLE cms_communication_standards IS 'Communication standards (branding, tone, format, language, accessibility)';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('cms_communication_standards', 'Communication standards for Communication Management Strategy', false, true, 'communication')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 7: CREATE cms_tools_technologies TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cms_tools_technologies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cms_id UUID NOT NULL REFERENCES communication_management_strategies(id) ON DELETE CASCADE,
    tool_name VARCHAR(200) NOT NULL,
    tool_type cms_tool_type_enum NOT NULL,
    tool_description TEXT,
    tool_purpose TEXT,
    applicable_to TEXT,
    proficiency_required cms_proficiency_enum DEFAULT 'basic',
    license_required BOOLEAN DEFAULT FALSE,
    license_info TEXT,
    cost DECIMAL(12,2),
    external_link VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_tools_cms ON cms_tools_technologies(cms_id);
CREATE INDEX IF NOT EXISTS idx_cms_tools_type ON cms_tools_technologies(tool_type);

COMMENT ON TABLE cms_tools_technologies IS 'Communication tools and technologies (software, platforms, hardware, templates)';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('cms_tools_technologies', 'Communication tools and technologies for Communication Management Strategy', false, true, 'communication')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 8: CREATE cms_communication_records TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cms_communication_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cms_id UUID NOT NULL REFERENCES communication_management_strategies(id) ON DELETE CASCADE,
    record_name VARCHAR(200) NOT NULL,
    record_type cms_record_type_enum NOT NULL,
    record_description TEXT,
    record_purpose TEXT,
    storage_location TEXT,
    retention_period VARCHAR(100),
    access_control TEXT,
    format_requirements TEXT,
    is_mandatory BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_records_cms ON cms_communication_records(cms_id);
CREATE INDEX IF NOT EXISTS idx_cms_records_type ON cms_communication_records(record_type);
CREATE INDEX IF NOT EXISTS idx_cms_records_mandatory ON cms_communication_records(is_mandatory) WHERE is_mandatory = TRUE;

COMMENT ON TABLE cms_communication_records IS 'Communication records to be maintained (Communication Register, meeting minutes, etc.)';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('cms_communication_records', 'Communication records definitions for Communication Management Strategy', false, true, 'communication')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 9: CREATE cms_reports TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cms_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cms_id UUID NOT NULL REFERENCES communication_management_strategies(id) ON DELETE CASCADE,
    report_name VARCHAR(200) NOT NULL,
    report_type cms_report_type_enum NOT NULL,
    report_description TEXT,
    report_purpose TEXT,
    report_content TEXT,
    frequency cms_report_frequency_enum,
    trigger_conditions TEXT,
    recipients TEXT,
    responsible_role VARCHAR(200),
    template_reference VARCHAR(200),
    distribution_method cms_distribution_method_enum DEFAULT 'email',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_reports_cms ON cms_reports(cms_id);
CREATE INDEX IF NOT EXISTS idx_cms_reports_type ON cms_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_cms_reports_frequency ON cms_reports(frequency);

COMMENT ON TABLE cms_reports IS 'Communication reports to be produced (status reports, progress reports, etc.)';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('cms_reports', 'Communication reports definitions for Communication Management Strategy', false, true, 'communication')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 10: CREATE cms_scheduled_activities TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cms_scheduled_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cms_id UUID NOT NULL REFERENCES communication_management_strategies(id) ON DELETE CASCADE,
    activity_name VARCHAR(200) NOT NULL,
    activity_type cms_activity_type_enum NOT NULL,
    activity_description TEXT,
    activity_purpose TEXT,
    timing cms_activity_timing_enum,
    frequency VARCHAR(100),
    specific_timing TEXT,
    duration_estimate VARCHAR(100),
    participants TEXT,
    outputs TEXT,
    linked_to_communication_register BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_activities_cms ON cms_scheduled_activities(cms_id);
CREATE INDEX IF NOT EXISTS idx_cms_activities_type ON cms_scheduled_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_cms_activities_timing ON cms_scheduled_activities(timing);

COMMENT ON TABLE cms_scheduled_activities IS 'Timing of formal communication activities (meetings, reports, presentations)';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('cms_scheduled_activities', 'Scheduled communication activities for Communication Management Strategy', false, true, 'communication')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 11: CREATE cms_roles_responsibilities TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cms_roles_responsibilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cms_id UUID NOT NULL REFERENCES communication_management_strategies(id) ON DELETE CASCADE,
    role_name VARCHAR(200) NOT NULL,
    role_type cms_role_type_enum NOT NULL,
    role_description TEXT,
    responsibilities TEXT,
    authority_level TEXT,
    assigned_to_id UUID REFERENCES users(id),
    assigned_to_name VARCHAR(200),
    is_mandatory BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_roles_cms ON cms_roles_responsibilities(cms_id);
CREATE INDEX IF NOT EXISTS idx_cms_roles_type ON cms_roles_responsibilities(role_type);
CREATE INDEX IF NOT EXISTS idx_cms_roles_assigned ON cms_roles_responsibilities(assigned_to_id);

COMMENT ON TABLE cms_roles_responsibilities IS 'Communication roles and responsibilities (Communication Manager, Report Author, etc.)';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('cms_roles_responsibilities', 'Communication roles and responsibilities for Communication Management Strategy', false, true, 'communication')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 12: CREATE cms_revision_history TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cms_revision_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cms_id UUID NOT NULL REFERENCES communication_management_strategies(id) ON DELETE CASCADE,
    revision_date DATE NOT NULL DEFAULT CURRENT_DATE,
    previous_revision_date DATE,
    summary_of_changes TEXT,
    changes_marked TEXT,
    revised_by UUID REFERENCES users(id),
    change_request_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_revisions_cms ON cms_revision_history(cms_id);
CREATE INDEX IF NOT EXISTS idx_cms_revisions_date ON cms_revision_history(revision_date);

COMMENT ON TABLE cms_revision_history IS 'Revision history for Communication Management Strategy';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('cms_revision_history', 'Revision history for Communication Management Strategy', false, true, 'communication')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 13: CREATE cms_approvals TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cms_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cms_id UUID NOT NULL REFERENCES communication_management_strategies(id) ON DELETE CASCADE,
    approver_id UUID REFERENCES users(id),
    approver_name VARCHAR(200),
    approver_title VARCHAR(200),
    signature_data TEXT,
    approval_date DATE,
    approval_status cms_approval_status_enum DEFAULT 'pending',
    comments TEXT,
    version_approved VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_approvals_cms ON cms_approvals(cms_id);
CREATE INDEX IF NOT EXISTS idx_cms_approvals_approver ON cms_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_cms_approvals_status ON cms_approvals(approval_status);

COMMENT ON TABLE cms_approvals IS 'Approval tracking for Communication Management Strategy';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('cms_approvals', 'Approval tracking for Communication Management Strategy', false, true, 'communication')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 14: CREATE cms_distribution TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cms_distribution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cms_id UUID NOT NULL REFERENCES communication_management_strategies(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id),
    recipient_name VARCHAR(200),
    recipient_title VARCHAR(200),
    date_of_issue DATE DEFAULT CURRENT_DATE,
    version_distributed VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_distribution_cms ON cms_distribution(cms_id);
CREATE INDEX IF NOT EXISTS idx_cms_distribution_recipient ON cms_distribution(recipient_id);

COMMENT ON TABLE cms_distribution IS 'Distribution list for Communication Management Strategy';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('cms_distribution', 'Distribution list for Communication Management Strategy', false, true, 'communication')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 15: ENHANCE EXISTING TABLES
-- ============================================================================

-- Add cms_id to communication_plans (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'communication_plans') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'communication_plans' AND column_name = 'cms_id'
        ) THEN
            ALTER TABLE communication_plans ADD COLUMN cms_id UUID REFERENCES communication_management_strategies(id) ON DELETE SET NULL;
            CREATE INDEX IF NOT EXISTS idx_communication_plans_cms ON communication_plans(cms_id);
        END IF;
    END IF;
END $$;

-- Add cms_id to stakeholder_communications (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stakeholder_communications') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'stakeholder_communications' AND column_name = 'cms_id'
        ) THEN
            ALTER TABLE stakeholder_communications ADD COLUMN cms_id UUID REFERENCES communication_management_strategies(id) ON DELETE SET NULL;
            CREATE INDEX IF NOT EXISTS idx_stakeholder_communications_cms ON stakeholder_communications(cms_id);
        END IF;
    END IF;
END $$;

-- ============================================================================
-- SECTION 16: CREATE DATABASE FUNCTIONS
-- ============================================================================

-- Function: generate_cms_reference()
CREATE OR REPLACE FUNCTION generate_cms_reference()
RETURNS VARCHAR AS $$
DECLARE
    v_year INTEGER;
    v_sequence INTEGER;
    v_reference VARCHAR(100);
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(cms_reference FROM '\d+$') AS INTEGER)), 0) + 1
    INTO v_sequence
    FROM communication_management_strategies
    WHERE cms_reference LIKE 'CMS-' || v_year || '-%'
      AND is_deleted = FALSE;
    
    v_reference := 'CMS-' || v_year || '-' || LPAD(v_sequence::VARCHAR, 3, '0');
    
    RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_cms_reference() IS 'Generates unique CMS reference number like CMS-2026-001';

-- Function: create_cms_for_project()
CREATE OR REPLACE FUNCTION create_cms_for_project(p_project_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_cms_id UUID;
    v_reference VARCHAR(100);
BEGIN
    -- Generate reference
    v_reference := generate_cms_reference();
    
    -- Create CMS
    INSERT INTO communication_management_strategies (
        project_id,
        cms_reference,
        version_number,
        created_by,
        updated_by,
        status
    ) VALUES (
        p_project_id,
        v_reference,
        '1.0',
        p_user_id,
        p_user_id,
        'draft'
    ) RETURNING id INTO v_cms_id;
    
    RETURN v_cms_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_cms_for_project(UUID, UUID) IS 'Creates a new CMS with default structure for a project';

-- Function: validate_cms_completeness()
CREATE OR REPLACE FUNCTION validate_cms_completeness(p_cms_id UUID)
RETURNS TABLE (
    section_name VARCHAR,
    is_complete BOOLEAN,
    missing_items TEXT[],
    recommendations TEXT
) AS $$
DECLARE
    v_cms RECORD;
    v_missing_items TEXT[];
    v_count INTEGER;
BEGIN
    SELECT * INTO v_cms FROM communication_management_strategies WHERE id = p_cms_id AND is_deleted = FALSE;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Check Introduction Section
    v_missing_items := ARRAY[]::TEXT[];
    IF v_cms.purpose IS NULL OR LENGTH(TRIM(v_cms.purpose)) < 50 THEN
        v_missing_items := array_append(v_missing_items, 'Purpose (minimum 50 characters)');
    END IF;
    IF v_cms.objectives IS NULL OR LENGTH(TRIM(v_cms.objectives)) < 30 THEN
        v_missing_items := array_append(v_missing_items, 'Objectives (minimum 30 characters)');
    END IF;
    IF v_cms.scope IS NULL OR LENGTH(TRIM(v_cms.scope)) < 30 THEN
        v_missing_items := array_append(v_missing_items, 'Scope (minimum 30 characters)');
    END IF;
    
    RETURN QUERY SELECT 
        'Introduction Section'::VARCHAR,
        (array_length(v_missing_items, 1) IS NULL)::BOOLEAN,
        v_missing_items,
        CASE WHEN array_length(v_missing_items, 1) IS NOT NULL 
             THEN 'Complete all introduction fields with sufficient detail'
             ELSE NULL END::TEXT;
    
    -- Check Communication Procedures
    v_missing_items := ARRAY[]::TEXT[];
    IF v_cms.communication_planning_approach IS NULL OR LENGTH(TRIM(v_cms.communication_planning_approach)) < 50 THEN
        v_missing_items := array_append(v_missing_items, 'Communication Planning Approach');
    END IF;
    IF v_cms.communication_control_approach IS NULL OR LENGTH(TRIM(v_cms.communication_control_approach)) < 50 THEN
        v_missing_items := array_append(v_missing_items, 'Communication Control Approach');
    END IF;
    IF v_cms.communication_assurance_approach IS NULL OR LENGTH(TRIM(v_cms.communication_assurance_approach)) < 50 THEN
        v_missing_items := array_append(v_missing_items, 'Communication Assurance Approach');
    END IF;
    
    RETURN QUERY SELECT 
        'Communication Procedures'::VARCHAR,
        (array_length(v_missing_items, 1) IS NULL)::BOOLEAN,
        v_missing_items,
        CASE WHEN array_length(v_missing_items, 1) IS NOT NULL 
             THEN 'Define approaches for planning, control, and assurance'
             ELSE NULL END::TEXT;
    
    -- Check Channels
    SELECT COUNT(*) INTO v_count
    FROM cms_communication_channels
    WHERE cms_id = p_cms_id;
    
    IF v_count = 0 THEN
        RETURN QUERY SELECT 
            'Communication Channels'::VARCHAR,
            FALSE::BOOLEAN,
            ARRAY['At least one communication channel required']::TEXT[],
            'Define at least one communication channel for the project'::TEXT;
    ELSE
        RETURN QUERY SELECT 
            'Communication Channels'::VARCHAR,
            TRUE::BOOLEAN,
            ARRAY[]::TEXT[],
            NULL::TEXT;
    END IF;
    
    -- Check Methods
    SELECT COUNT(*) INTO v_count
    FROM cms_communication_methods
    WHERE cms_id = p_cms_id;
    
    IF v_count = 0 THEN
        RETURN QUERY SELECT 
            'Communication Methods'::VARCHAR,
            FALSE::BOOLEAN,
            ARRAY['At least one communication method required']::TEXT[],
            'Define at least one communication method for the project'::TEXT;
    ELSE
        RETURN QUERY SELECT 
            'Communication Methods'::VARCHAR,
            TRUE::BOOLEAN,
            ARRAY[]::TEXT[],
            NULL::TEXT;
    END IF;
    
    -- Check Audience Groups
    SELECT COUNT(*) INTO v_count
    FROM cms_audience_groups
    WHERE cms_id = p_cms_id;
    
    IF v_count = 0 THEN
        RETURN QUERY SELECT 
            'Audience Groups'::VARCHAR,
            FALSE::BOOLEAN,
            ARRAY['At least one audience group required']::TEXT[],
            'Define at least one target audience group'::TEXT;
    ELSE
        RETURN QUERY SELECT 
            'Audience Groups'::VARCHAR,
            TRUE::BOOLEAN,
            ARRAY[]::TEXT[],
            NULL::TEXT;
    END IF;
    
    -- Check Roles
    SELECT COUNT(*) INTO v_count
    FROM cms_roles_responsibilities
    WHERE cms_id = p_cms_id;
    
    IF v_count = 0 THEN
        RETURN QUERY SELECT 
            'Roles and Responsibilities'::VARCHAR,
            FALSE::BOOLEAN,
            ARRAY['At least one communication role required']::TEXT[],
            'Define at least one communication role and responsibility'::TEXT;
    ELSE
        RETURN QUERY SELECT 
            'Roles and Responsibilities'::VARCHAR,
            TRUE::BOOLEAN,
            ARRAY[]::TEXT[],
            NULL::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_cms_completeness(UUID) IS 'Validates that CMS has all required sections';

-- Trigger: Auto-generate cms_reference on INSERT
CREATE OR REPLACE FUNCTION trg_generate_cms_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cms_reference IS NULL OR NEW.cms_reference = '' THEN
        NEW.cms_reference := generate_cms_reference();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cms_reference ON communication_management_strategies;
CREATE TRIGGER trg_cms_reference
    BEFORE INSERT ON communication_management_strategies
    FOR EACH ROW
    EXECUTE FUNCTION trg_generate_cms_reference();

-- Function: check_cms_conformance()
CREATE OR REPLACE FUNCTION check_cms_conformance(p_cms_id UUID)
RETURNS TABLE (
    requirement_name VARCHAR,
    conformance_status VARCHAR,
    gaps TEXT[],
    recommendations TEXT
) AS $$
DECLARE
    v_cms RECORD;
    v_gaps TEXT[];
BEGIN
    SELECT * INTO v_cms FROM communication_management_strategies WHERE id = p_cms_id AND is_deleted = FALSE;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Check Corporate Policy Conformance
    v_gaps := ARRAY[]::TEXT[];
    IF v_cms.corporate_communication_policy_reference IS NULL OR LENGTH(TRIM(v_cms.corporate_communication_policy_reference)) = 0 THEN
        v_gaps := array_append(v_gaps, 'Corporate communication policy not referenced');
    END IF;
    IF v_cms.variance_from_corporate IS NOT NULL AND (v_cms.variance_justification IS NULL OR LENGTH(TRIM(v_cms.variance_justification)) < 20) THEN
        v_gaps := array_append(v_gaps, 'Variance from corporate standard lacks justification');
    END IF;
    
    RETURN QUERY SELECT 
        'Corporate Policy Conformance'::VARCHAR,
        CASE WHEN array_length(v_gaps, 1) IS NULL THEN 'conformant' ELSE 'non_conformant' END::VARCHAR,
        v_gaps,
        CASE WHEN array_length(v_gaps, 1) IS NOT NULL 
             THEN 'Reference corporate policy and justify any variances'
             ELSE NULL END::TEXT;
    
    -- Check Customer Requirements
    v_gaps := ARRAY[]::TEXT[];
    IF v_cms.customer_communication_requirements IS NULL OR LENGTH(TRIM(v_cms.customer_communication_requirements)) = 0 THEN
        v_gaps := array_append(v_gaps, 'Customer communication requirements not documented');
    END IF;
    
    RETURN QUERY SELECT 
        'Customer Requirements'::VARCHAR,
        CASE WHEN array_length(v_gaps, 1) IS NULL THEN 'conformant' ELSE 'needs_review' END::VARCHAR,
        v_gaps,
        CASE WHEN array_length(v_gaps, 1) IS NOT NULL 
             THEN 'Document customer communication requirements if applicable'
             ELSE NULL END::TEXT;
    
    -- Check Stakeholder Preferences
    v_gaps := ARRAY[]::TEXT[];
    IF v_cms.stakeholder_communication_preferences IS NULL OR LENGTH(TRIM(v_cms.stakeholder_communication_preferences)) = 0 THEN
        v_gaps := array_append(v_gaps, 'Stakeholder communication preferences not documented');
    END IF;
    
    RETURN QUERY SELECT 
        'Stakeholder Preferences'::VARCHAR,
        CASE WHEN array_length(v_gaps, 1) IS NULL THEN 'conformant' ELSE 'needs_review' END::VARCHAR,
        v_gaps,
        CASE WHEN array_length(v_gaps, 1) IS NOT NULL 
             THEN 'Document stakeholder communication preferences'
             ELSE NULL END::TEXT;
    
    -- Check Channel Appropriateness
    v_gaps := ARRAY[]::TEXT[];
    IF NOT EXISTS (SELECT 1 FROM cms_communication_channels WHERE cms_id = p_cms_id AND is_preferred = TRUE) THEN
        v_gaps := array_append(v_gaps, 'No preferred communication channel defined');
    END IF;
    
    RETURN QUERY SELECT 
        'Channel Appropriateness'::VARCHAR,
        CASE WHEN array_length(v_gaps, 1) IS NULL THEN 'conformant' ELSE 'needs_improvement' END::VARCHAR,
        v_gaps,
        CASE WHEN array_length(v_gaps, 1) IS NOT NULL 
             THEN 'Define at least one preferred communication channel'
             ELSE NULL END::TEXT;
    
    -- Check Mandatory Methods
    v_gaps := ARRAY[]::TEXT[];
    IF NOT EXISTS (SELECT 1 FROM cms_communication_methods WHERE cms_id = p_cms_id AND is_mandatory = TRUE) THEN
        v_gaps := array_append(v_gaps, 'No mandatory communication methods specified');
    END IF;
    
    RETURN QUERY SELECT 
        'Mandatory Methods'::VARCHAR,
        CASE WHEN array_length(v_gaps, 1) IS NULL THEN 'conformant' ELSE 'needs_improvement' END::VARCHAR,
        v_gaps,
        CASE WHEN array_length(v_gaps, 1) IS NOT NULL 
             THEN 'Define at least one mandatory communication method'
             ELSE NULL END::TEXT;
    
    -- Check Communication Register in Records
    v_gaps := ARRAY[]::TEXT[];
    IF NOT EXISTS (SELECT 1 FROM cms_communication_records WHERE cms_id = p_cms_id AND record_type = 'communication_register') THEN
        v_gaps := array_append(v_gaps, 'Communication Register not included in records');
    END IF;
    
    RETURN QUERY SELECT 
        'Communication Register'::VARCHAR,
        CASE WHEN array_length(v_gaps, 1) IS NULL THEN 'conformant' ELSE 'non_conformant' END::VARCHAR,
        v_gaps,
        CASE WHEN array_length(v_gaps, 1) IS NOT NULL 
             THEN 'Communication Register must be included in communication records'
             ELSE NULL END::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_cms_conformance(UUID) IS 'Checks conformance to corporate/stakeholder requirements';

-- Function: get_scheduled_communication_activities()
CREATE OR REPLACE FUNCTION get_scheduled_communication_activities(
    p_project_id UUID,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
    activity_id UUID,
    activity_name VARCHAR,
    activity_type VARCHAR,
    scheduled_date DATE,
    participants TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sa.id AS activity_id,
        sa.activity_name,
        sa.activity_type::VARCHAR AS activity_type,
        NULL::DATE AS scheduled_date, -- This would need actual scheduling implementation
        sa.participants
    FROM cms_scheduled_activities sa
    JOIN communication_management_strategies cms ON sa.cms_id = cms.id
    WHERE cms.project_id = p_project_id
      AND cms.is_deleted = FALSE
      AND (
          p_date_from IS NULL OR 
          (sa.timing IN ('periodic', 'milestone') AND sa.frequency IS NOT NULL)
      )
      AND (
          p_date_to IS NULL OR
          (sa.timing IN ('periodic', 'milestone') AND sa.frequency IS NOT NULL)
      )
    ORDER BY sa.display_order, sa.activity_name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_scheduled_communication_activities(UUID, DATE, DATE) IS 'Returns upcoming communication activities for a project';

-- ============================================================================
-- END OF v190_communication_management_strategy_tables.sql
-- ============================================================================

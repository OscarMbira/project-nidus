-- ============================================================================
-- Configuration Management Strategy - Database Schema
-- Version: v192
-- Description: Creates tables for Configuration Management Strategy module
-- Date: 2026-01-20
-- ============================================================================
--
-- Purpose:
-- This script creates the database schema for the Configuration Management Strategy module,
-- which defines HOW configuration management will be performed in the project. This is a strategic document
-- that establishes configuration management procedures, identification methods, version control, status accounting,
-- baseline management, roles, responsibilities, and timing for all configuration management activities.
--
-- Prerequisites:
-- - Core tables must exist (projects, users, accounts)
-- - Existing change_requests table should exist (for integration)
--
-- ============================================================================
-- SECTION 1: CREATE ENUM TYPES
-- ============================================================================

-- Configuration MS Status Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cfg_ms_status_enum') THEN
        CREATE TYPE cfg_ms_status_enum AS ENUM ('draft', 'under_review', 'approved', 'superseded');
    END IF;
END $$;

-- Item Type Classification Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cfg_item_classification_enum') THEN
        CREATE TYPE cfg_item_classification_enum AS ENUM ('major', 'minor', 'component', 'work_product');
    END IF;
END $$;

-- Control Level Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cfg_control_level_enum') THEN
        CREATE TYPE cfg_control_level_enum AS ENUM ('full', 'partial', 'informal', 'none');
    END IF;
END $$;

-- Identification Method Type Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cfg_id_method_type_enum') THEN
        CREATE TYPE cfg_id_method_type_enum AS ENUM ('hierarchical', 'sequential', 'composite', 'custom');
    END IF;
END $$;

-- Version Scheme Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cfg_version_scheme_enum') THEN
        CREATE TYPE cfg_version_scheme_enum AS ENUM ('semantic', 'numeric', 'alpha', 'date_based', 'custom');
    END IF;
END $$;

-- Status Category Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cfg_status_category_enum') THEN
        CREATE TYPE cfg_status_category_enum AS ENUM ('development', 'review', 'approved', 'baseline', 'superseded', 'archived');
    END IF;
END $$;

-- Baseline Control Level Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cfg_baseline_control_enum') THEN
        CREATE TYPE cfg_baseline_control_enum AS ENUM ('strict', 'moderate', 'flexible');
    END IF;
END $$;

-- Audit Type Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cfg_audit_type_enum') THEN
        CREATE TYPE cfg_audit_type_enum AS ENUM ('functional', 'physical', 'in_process', 'combined');
    END IF;
END $$;

-- Audit Frequency Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cfg_audit_frequency_enum') THEN
        CREATE TYPE cfg_audit_frequency_enum AS ENUM ('on_baseline', 'on_milestone', 'periodic', 'on_demand', 'stage_end');
    END IF;
END $$;

-- Tool Type Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cfg_tool_type_enum') THEN
        CREATE TYPE cfg_tool_type_enum AS ENUM ('version_control', 'repository', 'document_management', 'baseline_management', 'audit_tool', 'integrated_system', 'other');
    END IF;
END $$;

-- Proficiency Level Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cfg_proficiency_enum') THEN
        CREATE TYPE cfg_proficiency_enum AS ENUM ('none', 'basic', 'intermediate', 'advanced');
    END IF;
END $$;

-- Record Type Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cfg_record_type_enum') THEN
        CREATE TYPE cfg_record_type_enum AS ENUM ('configuration_item_record', 'baseline_record', 'version_record', 'status_record', 'audit_record', 'change_record', 'other');
    END IF;
END $$;

-- Report Type Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cfg_report_type_enum') THEN
        CREATE TYPE cfg_report_type_enum AS ENUM ('status_report', 'baseline_report', 'version_report', 'audit_report', 'compliance_report', 'summary', 'other');
    END IF;
END $$;

-- Report Frequency Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cfg_report_frequency_enum') THEN
        CREATE TYPE cfg_report_frequency_enum AS ENUM ('daily', 'weekly', 'bi_weekly', 'monthly', 'stage_end', 'on_demand', 'triggered');
    END IF;
END $$;

-- Activity Type Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cfg_activity_type_enum') THEN
        CREATE TYPE cfg_activity_type_enum AS ENUM ('baseline', 'audit', 'review', 'status_update', 'version_release', 'verification', 'other');
    END IF;
END $$;

-- Activity Timing Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cfg_activity_timing_enum') THEN
        CREATE TYPE cfg_activity_timing_enum AS ENUM ('project_start', 'stage_start', 'stage_end', 'milestone', 'periodic', 'on_demand', 'project_end');
    END IF;
END $$;

-- Role Type Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cfg_role_type_enum') THEN
        CREATE TYPE cfg_role_type_enum AS ENUM ('configuration_manager', 'configuration_librarian', 'configuration_auditor', 'product_owner', 'change_authority', 'baseline_authority', 'other');
    END IF;
END $$;

-- Approval Status Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cfg_approval_status_enum') THEN
        CREATE TYPE cfg_approval_status_enum AS ENUM ('pending', 'approved', 'rejected');
    END IF;
END $$;

-- ============================================================================
-- SECTION 2: CREATE configuration_management_strategies TABLE (Main Table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuration_management_strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Document Reference
    project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    cms_reference VARCHAR(100) UNIQUE NOT NULL, -- Note: CMS-CFG prefix to avoid conflict with Communication MS
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

    -- Configuration Management Procedure
    configuration_planning_approach TEXT,
    configuration_control_approach TEXT,
    configuration_assurance_approach TEXT,
    variance_from_corporate TEXT,
    variance_justification TEXT,

    -- References
    customer_configuration_requirements TEXT,
    corporate_configuration_policy_reference TEXT,
    programme_configuration_policy_reference TEXT,
    product_breakdown_structure_reference TEXT,

    -- Status
    status cfg_ms_status_enum DEFAULT 'draft',
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

CREATE INDEX IF NOT EXISTS idx_cfg_ms_project ON configuration_management_strategies(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_cfg_ms_reference ON configuration_management_strategies(cms_reference) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_cfg_ms_status ON configuration_management_strategies(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_cfg_ms_owner ON configuration_management_strategies(owner_id) WHERE is_deleted = FALSE;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_cfg_ms_updated_at ON configuration_management_strategies;
CREATE TRIGGER trg_cfg_ms_updated_at
    BEFORE UPDATE ON configuration_management_strategies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE configuration_management_strategies IS 'Main document for Configuration Management Strategy - defines how configuration management will be performed in the project';
COMMENT ON COLUMN configuration_management_strategies.project_id IS 'One strategy per project (UNIQUE constraint)';
COMMENT ON COLUMN configuration_management_strategies.cms_reference IS 'Unique reference like CMS-CFG-2026-001';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('configuration_management_strategies', 'Main document for Configuration Management Strategy', false, true, 'configuration')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 3: CREATE cfg_item_types TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cfg_item_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cfg_ms_id UUID NOT NULL REFERENCES configuration_management_strategies(id) ON DELETE CASCADE,
    item_type_code VARCHAR(50) NOT NULL,
    item_type_name VARCHAR(200) NOT NULL,
    item_type_description TEXT,
    classification_level cfg_item_classification_enum NOT NULL,
    control_level cfg_control_level_enum NOT NULL,
    baseline_required BOOLEAN DEFAULT FALSE,
    version_control_required BOOLEAN DEFAULT TRUE,
    status_accounting_required BOOLEAN DEFAULT TRUE,
    audit_required BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cfg_item_types_cfg_ms ON cfg_item_types(cfg_ms_id);
CREATE INDEX IF NOT EXISTS idx_cfg_item_types_code ON cfg_item_types(item_type_code);
CREATE INDEX IF NOT EXISTS idx_cfg_item_types_classification ON cfg_item_types(classification_level);

COMMENT ON TABLE cfg_item_types IS 'Configuration item types/classifications (Major, Minor, Component, Work Product)';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('cfg_item_types', 'Configuration item types for Configuration Management Strategy', false, true, 'configuration')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 4: CREATE cfg_identification_methods TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cfg_identification_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cfg_ms_id UUID NOT NULL REFERENCES configuration_management_strategies(id) ON DELETE CASCADE,
    method_name VARCHAR(200) NOT NULL,
    method_type cfg_id_method_type_enum NOT NULL,
    method_description TEXT,
    identification_scheme TEXT,
    naming_convention TEXT,
    numbering_pattern VARCHAR(200),
    examples TEXT[],
    is_default BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cfg_id_methods_cfg_ms ON cfg_identification_methods(cfg_ms_id);
CREATE INDEX IF NOT EXISTS idx_cfg_id_methods_default ON cfg_identification_methods(is_default) WHERE is_default = TRUE;

COMMENT ON TABLE cfg_identification_methods IS 'Configuration identification/numbering methods (hierarchical, sequential, composite, custom)';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('cfg_identification_methods', 'Identification methods for Configuration Management Strategy', false, true, 'configuration')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 5: CREATE cfg_version_control_procedures TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cfg_version_control_procedures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cfg_ms_id UUID NOT NULL REFERENCES configuration_management_strategies(id) ON DELETE CASCADE,
    procedure_name VARCHAR(200) NOT NULL,
    version_scheme cfg_version_scheme_enum NOT NULL,
    procedure_description TEXT,
    version_format VARCHAR(100),
    version_rules TEXT,
    branching_strategy TEXT,
    tagging_convention TEXT,
    release_criteria TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cfg_version_procedures_cfg_ms ON cfg_version_control_procedures(cfg_ms_id);
CREATE INDEX IF NOT EXISTS idx_cfg_version_procedures_scheme ON cfg_version_control_procedures(version_scheme);

COMMENT ON TABLE cfg_version_control_procedures IS 'Version control procedures (semantic, numeric, alpha, date-based, custom)';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('cfg_version_control_procedures', 'Version control procedures for Configuration Management Strategy', false, true, 'configuration')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 6: CREATE cfg_status_definitions TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cfg_status_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cfg_ms_id UUID NOT NULL REFERENCES configuration_management_strategies(id) ON DELETE CASCADE,
    status_code VARCHAR(50) NOT NULL,
    status_name VARCHAR(200) NOT NULL,
    status_description TEXT,
    status_category cfg_status_category_enum NOT NULL,
    is_editable BOOLEAN DEFAULT TRUE,
    requires_approval BOOLEAN DEFAULT FALSE,
    transition_rules TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cfg_status_definitions_cfg_ms ON cfg_status_definitions(cfg_ms_id);
CREATE INDEX IF NOT EXISTS idx_cfg_status_definitions_code ON cfg_status_definitions(status_code);
CREATE INDEX IF NOT EXISTS idx_cfg_status_definitions_category ON cfg_status_definitions(status_category);

COMMENT ON TABLE cfg_status_definitions IS 'Configuration status definitions (WIP, BASELINED, APPROVED, SUPERSEDED, etc.)';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('cfg_status_definitions', 'Status definitions for Configuration Management Strategy', false, true, 'configuration')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 7: CREATE cfg_baseline_procedures TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cfg_baseline_procedures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cfg_ms_id UUID NOT NULL REFERENCES configuration_management_strategies(id) ON DELETE CASCADE,
    baseline_type VARCHAR(200) NOT NULL,
    baseline_type_code VARCHAR(50),
    baseline_description TEXT,
    baseline_purpose TEXT,
    creation_criteria TEXT,
    composition_rules TEXT,
    approval_required BOOLEAN DEFAULT TRUE,
    approval_authority VARCHAR(200),
    control_level cfg_baseline_control_enum DEFAULT 'strict',
    change_control_required BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cfg_baseline_procedures_cfg_ms ON cfg_baseline_procedures(cfg_ms_id);
CREATE INDEX IF NOT EXISTS idx_cfg_baseline_procedures_type ON cfg_baseline_procedures(baseline_type_code);

COMMENT ON TABLE cfg_baseline_procedures IS 'Baseline management procedures (Functional, Design, Product baselines)';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('cfg_baseline_procedures', 'Baseline procedures for Configuration Management Strategy', false, true, 'configuration')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 8: CREATE cfg_audit_procedures TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cfg_audit_procedures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cfg_ms_id UUID NOT NULL REFERENCES configuration_management_strategies(id) ON DELETE CASCADE,
    audit_type cfg_audit_type_enum NOT NULL,
    audit_name VARCHAR(200) NOT NULL,
    audit_description TEXT,
    audit_purpose TEXT,
    audit_frequency cfg_audit_frequency_enum,
    audit_schedule TEXT,
    audit_criteria TEXT,
    required_participants TEXT,
    outputs TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cfg_audit_procedures_cfg_ms ON cfg_audit_procedures(cfg_ms_id);
CREATE INDEX IF NOT EXISTS idx_cfg_audit_procedures_type ON cfg_audit_procedures(audit_type);

COMMENT ON TABLE cfg_audit_procedures IS 'Configuration audit procedures (Functional, Physical, In-Process audits)';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('cfg_audit_procedures', 'Audit procedures for Configuration Management Strategy', false, true, 'configuration')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 9: CREATE cfg_tools_technologies TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cfg_tools_technologies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cfg_ms_id UUID NOT NULL REFERENCES configuration_management_strategies(id) ON DELETE CASCADE,
    tool_name VARCHAR(200) NOT NULL,
    tool_type cfg_tool_type_enum NOT NULL,
    tool_description TEXT,
    tool_purpose TEXT,
    applicable_to TEXT,
    proficiency_required cfg_proficiency_enum DEFAULT 'basic',
    license_required BOOLEAN DEFAULT FALSE,
    license_info TEXT,
    cost DECIMAL(12,2),
    external_link VARCHAR(500),
    is_preferred BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cfg_tools_cfg_ms ON cfg_tools_technologies(cfg_ms_id);
CREATE INDEX IF NOT EXISTS idx_cfg_tools_type ON cfg_tools_technologies(tool_type);
CREATE INDEX IF NOT EXISTS idx_cfg_tools_preferred ON cfg_tools_technologies(is_preferred) WHERE is_preferred = TRUE;

COMMENT ON TABLE cfg_tools_technologies IS 'Configuration management tools and technologies';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('cfg_tools_technologies', 'Tools and technologies for Configuration Management Strategy', false, true, 'configuration')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 10: CREATE cfg_records_requirements TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cfg_records_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cfg_ms_id UUID NOT NULL REFERENCES configuration_management_strategies(id) ON DELETE CASCADE,
    record_name VARCHAR(200) NOT NULL,
    record_type cfg_record_type_enum NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_cfg_records_cfg_ms ON cfg_records_requirements(cfg_ms_id);
CREATE INDEX IF NOT EXISTS idx_cfg_records_type ON cfg_records_requirements(record_type);
CREATE INDEX IF NOT EXISTS idx_cfg_records_mandatory ON cfg_records_requirements(is_mandatory) WHERE is_mandatory = TRUE;

COMMENT ON TABLE cfg_records_requirements IS 'Configuration records requirements (Configuration Item Records, baseline records, etc.)';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('cfg_records_requirements', 'Records requirements for Configuration Management Strategy', false, true, 'configuration')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 11: CREATE cfg_reports TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cfg_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cfg_ms_id UUID NOT NULL REFERENCES configuration_management_strategies(id) ON DELETE CASCADE,
    report_name VARCHAR(200) NOT NULL,
    report_type cfg_report_type_enum NOT NULL,
    report_description TEXT,
    report_purpose TEXT,
    report_content TEXT,
    frequency cfg_report_frequency_enum,
    trigger_conditions TEXT,
    recipients TEXT,
    responsible_role VARCHAR(200),
    template_reference VARCHAR(200),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cfg_reports_cfg_ms ON cfg_reports(cfg_ms_id);
CREATE INDEX IF NOT EXISTS idx_cfg_reports_type ON cfg_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_cfg_reports_frequency ON cfg_reports(frequency);

COMMENT ON TABLE cfg_reports IS 'Configuration reports definition';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('cfg_reports', 'Reports for Configuration Management Strategy', false, true, 'configuration')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 12: CREATE cfg_scheduled_activities TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cfg_scheduled_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cfg_ms_id UUID NOT NULL REFERENCES configuration_management_strategies(id) ON DELETE CASCADE,
    activity_name VARCHAR(200) NOT NULL,
    activity_type cfg_activity_type_enum NOT NULL,
    activity_description TEXT,
    activity_purpose TEXT,
    timing cfg_activity_timing_enum NOT NULL,
    frequency VARCHAR(100),
    specific_timing TEXT,
    duration_estimate VARCHAR(100),
    participants TEXT,
    outputs TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cfg_activities_cfg_ms ON cfg_scheduled_activities(cfg_ms_id);
CREATE INDEX IF NOT EXISTS idx_cfg_activities_type ON cfg_scheduled_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_cfg_activities_timing ON cfg_scheduled_activities(timing);

COMMENT ON TABLE cfg_scheduled_activities IS 'Timing of configuration management activities';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('cfg_scheduled_activities', 'Scheduled activities for Configuration Management Strategy', false, true, 'configuration')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 13: CREATE cfg_roles_responsibilities TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cfg_roles_responsibilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cfg_ms_id UUID NOT NULL REFERENCES configuration_management_strategies(id) ON DELETE CASCADE,
    role_name VARCHAR(200) NOT NULL,
    role_type cfg_role_type_enum NOT NULL,
    role_description TEXT,
    responsibilities TEXT,
    authority_level TEXT,
    assigned_to_id UUID REFERENCES users(id),
    assigned_to_name VARCHAR(200),
    is_mandatory BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cfg_roles_cfg_ms ON cfg_roles_responsibilities(cfg_ms_id);
CREATE INDEX IF NOT EXISTS idx_cfg_roles_type ON cfg_roles_responsibilities(role_type);
CREATE INDEX IF NOT EXISTS idx_cfg_roles_assigned ON cfg_roles_responsibilities(assigned_to_id) WHERE assigned_to_id IS NOT NULL;

COMMENT ON TABLE cfg_roles_responsibilities IS 'Configuration management roles and responsibilities';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('cfg_roles_responsibilities', 'Roles and responsibilities for Configuration Management Strategy', false, true, 'configuration')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 14: CREATE cfg_revision_history TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cfg_revision_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cfg_ms_id UUID NOT NULL REFERENCES configuration_management_strategies(id) ON DELETE CASCADE,
    revision_date DATE NOT NULL,
    previous_revision_date DATE,
    summary_of_changes TEXT NOT NULL,
    changes_marked TEXT,
    revised_by UUID REFERENCES users(id),
    change_request_id UUID REFERENCES change_requests(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cfg_revision_history_cfg_ms ON cfg_revision_history(cfg_ms_id);
CREATE INDEX IF NOT EXISTS idx_cfg_revision_history_date ON cfg_revision_history(revision_date);
CREATE INDEX IF NOT EXISTS idx_cfg_revision_history_change_request ON cfg_revision_history(change_request_id) WHERE change_request_id IS NOT NULL;

COMMENT ON TABLE cfg_revision_history IS 'Revision history for Configuration Management Strategy';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('cfg_revision_history', 'Revision history for Configuration Management Strategy', false, true, 'configuration')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 15: CREATE cfg_approvals TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cfg_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cfg_ms_id UUID NOT NULL REFERENCES configuration_management_strategies(id) ON DELETE CASCADE,
    approver_id UUID REFERENCES users(id),
    approver_name VARCHAR(200),
    approver_title VARCHAR(200),
    signature_data TEXT,
    approval_date DATE,
    approval_status cfg_approval_status_enum DEFAULT 'pending',
    comments TEXT,
    version_approved VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cfg_approvals_cfg_ms ON cfg_approvals(cfg_ms_id);
CREATE INDEX IF NOT EXISTS idx_cfg_approvals_status ON cfg_approvals(approval_status);
CREATE INDEX IF NOT EXISTS idx_cfg_approvals_approver ON cfg_approvals(approver_id);

COMMENT ON TABLE cfg_approvals IS 'Approval records for Configuration Management Strategy';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('cfg_approvals', 'Approvals for Configuration Management Strategy', false, true, 'configuration')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 16: CREATE cfg_distribution TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cfg_distribution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cfg_ms_id UUID NOT NULL REFERENCES configuration_management_strategies(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id),
    recipient_name VARCHAR(200),
    recipient_title VARCHAR(200),
    date_of_issue DATE,
    version_distributed VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cfg_distribution_cfg_ms ON cfg_distribution(cfg_ms_id);
CREATE INDEX IF NOT EXISTS idx_cfg_distribution_recipient ON cfg_distribution(recipient_id);

COMMENT ON TABLE cfg_distribution IS 'Distribution list for Configuration Management Strategy';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('cfg_distribution', 'Distribution list for Configuration Management Strategy', false, true, 'configuration')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 17: CREATE DATABASE FUNCTIONS
-- ============================================================================

-- Function: generate_cfg_ms_reference()
CREATE OR REPLACE FUNCTION generate_cfg_ms_reference()
RETURNS VARCHAR AS $$
DECLARE
    v_year INTEGER;
    v_sequence INTEGER;
    v_reference VARCHAR;
BEGIN
    v_year := EXTRACT(YEAR FROM NOW());
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(cms_reference FROM 'CMS-CFG-' || v_year || '-(.+)$') AS INTEGER)), 0) + 1
    INTO v_sequence
    FROM configuration_management_strategies
    WHERE cms_reference LIKE 'CMS-CFG-' || v_year || '-%'
      AND is_deleted = FALSE;
    
    v_reference := 'CMS-CFG-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0');
    
    RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_cfg_ms_reference() IS 'Generates unique Configuration Management Strategy reference like CMS-CFG-2026-001';

-- Function: create_cfg_ms_for_project()
CREATE OR REPLACE FUNCTION create_cfg_ms_for_project(
    p_project_id UUID,
    p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_cfg_ms_id UUID;
BEGIN
    INSERT INTO configuration_management_strategies (
        project_id,
        author_id,
        owner_id,
        created_by,
        updated_by,
        status
    )
    VALUES (
        p_project_id,
        p_user_id,
        p_user_id,
        p_user_id,
        p_user_id,
        'draft'
    )
    RETURNING id INTO v_cfg_ms_id;
    
    RETURN v_cfg_ms_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_cfg_ms_for_project(UUID, UUID) IS 'Creates Configuration Management Strategy with default structure for a project';

-- Function: create_cfg_ms_from_template()
CREATE OR REPLACE FUNCTION create_cfg_ms_from_template(
    p_project_id UUID,
    p_template_id UUID,
    p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_cfg_ms_id UUID;
BEGIN
    -- Create new Configuration MS from template
    INSERT INTO configuration_management_strategies (
        project_id,
        author_id,
        owner_id,
        created_by,
        updated_by,
        purpose,
        objectives,
        scope,
        configuration_planning_approach,
        configuration_control_approach,
        configuration_assurance_approach,
        corporate_configuration_policy_reference,
        status
    )
    SELECT 
        p_project_id,
        p_user_id,
        p_user_id,
        p_user_id,
        p_user_id,
        purpose,
        objectives,
        scope,
        configuration_planning_approach,
        configuration_control_approach,
        configuration_assurance_approach,
        corporate_configuration_policy_reference,
        'draft'
    FROM configuration_management_strategies
    WHERE id = p_template_id
      AND is_deleted = FALSE
    RETURNING id INTO v_cfg_ms_id;
    
    -- Copy item types
    INSERT INTO cfg_item_types (
        cfg_ms_id, item_type_code, item_type_name, item_type_description,
        classification_level, control_level, baseline_required,
        version_control_required, status_accounting_required, audit_required,
        display_order
    )
    SELECT 
        v_cfg_ms_id, item_type_code, item_type_name, item_type_description,
        classification_level, control_level, baseline_required,
        version_control_required, status_accounting_required, audit_required,
        display_order
    FROM cfg_item_types
    WHERE cfg_ms_id = p_template_id;
    
    -- Copy identification methods
    INSERT INTO cfg_identification_methods (
        cfg_ms_id, method_name, method_type, method_description,
        identification_scheme, naming_convention, numbering_pattern,
        examples, is_default, display_order
    )
    SELECT 
        v_cfg_ms_id, method_name, method_type, method_description,
        identification_scheme, naming_convention, numbering_pattern,
        examples, is_default, display_order
    FROM cfg_identification_methods
    WHERE cfg_ms_id = p_template_id;
    
    -- Copy version control procedures
    INSERT INTO cfg_version_control_procedures (
        cfg_ms_id, procedure_name, version_scheme, procedure_description,
        version_format, version_rules, branching_strategy,
        tagging_convention, release_criteria, display_order
    )
    SELECT 
        v_cfg_ms_id, procedure_name, version_scheme, procedure_description,
        version_format, version_rules, branching_strategy,
        tagging_convention, release_criteria, display_order
    FROM cfg_version_control_procedures
    WHERE cfg_ms_id = p_template_id;
    
    -- Copy status definitions
    INSERT INTO cfg_status_definitions (
        cfg_ms_id, status_code, status_name, status_description,
        status_category, is_editable, requires_approval,
        transition_rules, display_order
    )
    SELECT 
        v_cfg_ms_id, status_code, status_name, status_description,
        status_category, is_editable, requires_approval,
        transition_rules, display_order
    FROM cfg_status_definitions
    WHERE cfg_ms_id = p_template_id;
    
    -- Copy baseline procedures
    INSERT INTO cfg_baseline_procedures (
        cfg_ms_id, baseline_type, baseline_type_code, baseline_description,
        baseline_purpose, creation_criteria, composition_rules,
        approval_required, approval_authority, control_level,
        change_control_required, display_order
    )
    SELECT 
        v_cfg_ms_id, baseline_type, baseline_type_code, baseline_description,
        baseline_purpose, creation_criteria, composition_rules,
        approval_required, approval_authority, control_level,
        change_control_required, display_order
    FROM cfg_baseline_procedures
    WHERE cfg_ms_id = p_template_id;
    
    RETURN v_cfg_ms_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_cfg_ms_from_template(UUID, UUID, UUID) IS 'Creates Configuration Management Strategy from an organization template';

-- Function: validate_cfg_ms_completeness()
CREATE OR REPLACE FUNCTION validate_cfg_ms_completeness(p_cfg_ms_id UUID)
RETURNS TABLE (
    section_name VARCHAR,
    is_complete BOOLEAN,
    missing_items TEXT[],
    recommendations TEXT
) AS $$
DECLARE
    v_cfg_ms RECORD;
    v_count INTEGER;
BEGIN
    SELECT * INTO v_cfg_ms FROM configuration_management_strategies WHERE id = p_cfg_ms_id AND is_deleted = FALSE;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Check Introduction
    IF v_cfg_ms.purpose IS NULL OR LENGTH(TRIM(v_cfg_ms.purpose)) < 50 THEN
        RETURN QUERY SELECT 
            'Introduction'::VARCHAR,
            FALSE::BOOLEAN,
            ARRAY['Purpose must be at least 50 characters']::TEXT[],
            'Provide clear purpose statement (minimum 50 characters)'::TEXT;
    ELSIF v_cfg_ms.objectives IS NULL OR LENGTH(TRIM(v_cfg_ms.objectives)) < 30 THEN
        RETURN QUERY SELECT 
            'Introduction'::VARCHAR,
            FALSE::BOOLEAN,
            ARRAY['Objectives must be at least 30 characters']::TEXT[],
            'Provide clear objectives (minimum 30 characters)'::TEXT;
    ELSIF v_cfg_ms.scope IS NULL OR LENGTH(TRIM(v_cfg_ms.scope)) < 30 THEN
        RETURN QUERY SELECT 
            'Introduction'::VARCHAR,
            FALSE::BOOLEAN,
            ARRAY['Scope must be at least 30 characters']::TEXT[],
            'Provide clear scope definition (minimum 30 characters)'::TEXT;
    ELSE
        RETURN QUERY SELECT 
            'Introduction'::VARCHAR,
            TRUE::BOOLEAN,
            ARRAY[]::TEXT[],
            NULL::TEXT;
    END IF;
    
    -- Check Configuration Procedures
    IF v_cfg_ms.configuration_planning_approach IS NULL OR LENGTH(TRIM(v_cfg_ms.configuration_planning_approach)) < 50 THEN
        RETURN QUERY SELECT 
            'Configuration Procedures'::VARCHAR,
            FALSE::BOOLEAN,
            ARRAY['Configuration planning approach must be at least 50 characters']::TEXT[],
            'Provide configuration planning approach (minimum 50 characters)'::TEXT;
    ELSIF v_cfg_ms.configuration_control_approach IS NULL OR LENGTH(TRIM(v_cfg_ms.configuration_control_approach)) < 50 THEN
        RETURN QUERY SELECT 
            'Configuration Procedures'::VARCHAR,
            FALSE::BOOLEAN,
            ARRAY['Configuration control approach must be at least 50 characters']::TEXT[],
            'Provide configuration control approach (minimum 50 characters)'::TEXT;
    ELSIF v_cfg_ms.configuration_assurance_approach IS NULL OR LENGTH(TRIM(v_cfg_ms.configuration_assurance_approach)) < 50 THEN
        RETURN QUERY SELECT 
            'Configuration Procedures'::VARCHAR,
            FALSE::BOOLEAN,
            ARRAY['Configuration assurance approach must be at least 50 characters']::TEXT[],
            'Provide configuration assurance approach (minimum 50 characters)'::TEXT;
    ELSE
        RETURN QUERY SELECT 
            'Configuration Procedures'::VARCHAR,
            TRUE::BOOLEAN,
            ARRAY[]::TEXT[],
            NULL::TEXT;
    END IF;
    
    -- Check Item Types
    SELECT COUNT(*) INTO v_count
    FROM cfg_item_types
    WHERE cfg_ms_id = p_cfg_ms_id;
    
    IF v_count = 0 THEN
        RETURN QUERY SELECT 
            'Configuration Item Types'::VARCHAR,
            FALSE::BOOLEAN,
            ARRAY['At least one configuration item type required']::TEXT[],
            'Define at least one configuration item type/classification'::TEXT;
    ELSE
        RETURN QUERY SELECT 
            'Configuration Item Types'::VARCHAR,
            TRUE::BOOLEAN,
            ARRAY[]::TEXT[],
            NULL::TEXT;
    END IF;
    
    -- Check Identification Methods
    SELECT COUNT(*) INTO v_count
    FROM cfg_identification_methods
    WHERE cfg_ms_id = p_cfg_ms_id;
    
    IF v_count = 0 THEN
        RETURN QUERY SELECT 
            'Identification Methods'::VARCHAR,
            FALSE::BOOLEAN,
            ARRAY['At least one identification method required']::TEXT[],
            'Define at least one configuration identification method'::TEXT;
    ELSIF NOT EXISTS (SELECT 1 FROM cfg_identification_methods WHERE cfg_ms_id = p_cfg_ms_id AND is_default = TRUE) THEN
        RETURN QUERY SELECT 
            'Identification Methods'::VARCHAR,
            FALSE::BOOLEAN,
            ARRAY['A default identification method must be specified']::TEXT[],
            'Mark at least one identification method as default'::TEXT;
    ELSE
        RETURN QUERY SELECT 
            'Identification Methods'::VARCHAR,
            TRUE::BOOLEAN,
            ARRAY[]::TEXT[],
            NULL::TEXT;
    END IF;
    
    -- Check Version Control Procedures
    SELECT COUNT(*) INTO v_count
    FROM cfg_version_control_procedures
    WHERE cfg_ms_id = p_cfg_ms_id;
    
    IF v_count = 0 THEN
        RETURN QUERY SELECT 
            'Version Control Procedures'::VARCHAR,
            FALSE::BOOLEAN,
            ARRAY['At least one version control procedure required']::TEXT[],
            'Define at least one version control procedure'::TEXT;
    ELSE
        RETURN QUERY SELECT 
            'Version Control Procedures'::VARCHAR,
            TRUE::BOOLEAN,
            ARRAY[]::TEXT[],
            NULL::TEXT;
    END IF;
    
    -- Check Status Definitions
    SELECT COUNT(*) INTO v_count
    FROM cfg_status_definitions
    WHERE cfg_ms_id = p_cfg_ms_id;
    
    IF v_count = 0 THEN
        RETURN QUERY SELECT 
            'Status Definitions'::VARCHAR,
            FALSE::BOOLEAN,
            ARRAY['At least one status definition required']::TEXT[],
            'Define at least one configuration status'::TEXT;
    ELSE
        RETURN QUERY SELECT 
            'Status Definitions'::VARCHAR,
            TRUE::BOOLEAN,
            ARRAY[]::TEXT[],
            NULL::TEXT;
    END IF;
    
    -- Check Baseline Procedures
    SELECT COUNT(*) INTO v_count
    FROM cfg_baseline_procedures
    WHERE cfg_ms_id = p_cfg_ms_id;
    
    IF v_count = 0 THEN
        RETURN QUERY SELECT 
            'Baseline Procedures'::VARCHAR,
            FALSE::BOOLEAN,
            ARRAY['At least one baseline procedure required']::TEXT[],
            'Define at least one baseline procedure'::TEXT;
    ELSE
        RETURN QUERY SELECT 
            'Baseline Procedures'::VARCHAR,
            TRUE::BOOLEAN,
            ARRAY[]::TEXT[],
            NULL::TEXT;
    END IF;
    
    -- Check Roles
    SELECT COUNT(*) INTO v_count
    FROM cfg_roles_responsibilities
    WHERE cfg_ms_id = p_cfg_ms_id;
    
    IF v_count = 0 THEN
        RETURN QUERY SELECT 
            'Roles and Responsibilities'::VARCHAR,
            FALSE::BOOLEAN,
            ARRAY['At least one configuration role required']::TEXT[],
            'Define at least one configuration management role'::TEXT;
    ELSE
        RETURN QUERY SELECT 
            'Roles and Responsibilities'::VARCHAR,
            TRUE::BOOLEAN,
            ARRAY[]::TEXT[],
            NULL::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_cfg_ms_completeness(UUID) IS 'Validates that Configuration Management Strategy has all required sections';

-- Trigger: Auto-generate cms_reference on INSERT
CREATE OR REPLACE FUNCTION trg_generate_cfg_ms_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cms_reference IS NULL OR NEW.cms_reference = '' THEN
        NEW.cms_reference := generate_cfg_ms_reference();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cfg_ms_reference ON configuration_management_strategies;
CREATE TRIGGER trg_cfg_ms_reference
    BEFORE INSERT ON configuration_management_strategies
    FOR EACH ROW
    EXECUTE FUNCTION trg_generate_cfg_ms_reference();

-- Function: check_cfg_ms_conformance()
CREATE OR REPLACE FUNCTION check_cfg_ms_conformance(p_cfg_ms_id UUID)
RETURNS TABLE (
    requirement_name VARCHAR,
    conformance_status VARCHAR,
    gaps TEXT[],
    recommendations TEXT
) AS $$
DECLARE
    v_cfg_ms RECORD;
    v_gaps TEXT[];
BEGIN
    SELECT * INTO v_cfg_ms FROM configuration_management_strategies WHERE id = p_cfg_ms_id AND is_deleted = FALSE;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Check Corporate Policy Conformance
    v_gaps := ARRAY[]::TEXT[];
    IF v_cfg_ms.corporate_configuration_policy_reference IS NULL OR LENGTH(TRIM(v_cfg_ms.corporate_configuration_policy_reference)) = 0 THEN
        v_gaps := array_append(v_gaps, 'Corporate configuration policy not referenced');
    END IF;
    IF v_cfg_ms.variance_from_corporate IS NOT NULL AND (v_cfg_ms.variance_justification IS NULL OR LENGTH(TRIM(v_cfg_ms.variance_justification)) < 20) THEN
        v_gaps := array_append(v_gaps, 'Variance from corporate standard lacks justification');
    END IF;
    
    RETURN QUERY SELECT 
        'Corporate Policy Conformance'::VARCHAR,
        CASE WHEN array_length(v_gaps, 1) IS NULL THEN 'conformant' ELSE 'non_conformant' END::VARCHAR,
        v_gaps,
        CASE WHEN array_length(v_gaps, 1) IS NOT NULL 
             THEN 'Reference corporate policy and justify any variances'
             ELSE NULL END::TEXT;
    
    -- Check Identification Methods Coverage
    v_gaps := ARRAY[]::TEXT[];
    IF NOT EXISTS (SELECT 1 FROM cfg_identification_methods WHERE cfg_ms_id = p_cfg_ms_id AND is_default = TRUE) THEN
        v_gaps := array_append(v_gaps, 'No default identification method defined');
    END IF;
    
    RETURN QUERY SELECT 
        'Identification Methods'::VARCHAR,
        CASE WHEN array_length(v_gaps, 1) IS NULL THEN 'conformant' ELSE 'non_conformant' END::VARCHAR,
        v_gaps,
        CASE WHEN array_length(v_gaps, 1) IS NOT NULL 
             THEN 'Define and mark a default identification method'
             ELSE NULL END::TEXT;
    
    -- Check Status Definitions Coverage
    v_gaps := ARRAY[]::TEXT[];
    IF NOT EXISTS (SELECT 1 FROM cfg_status_definitions WHERE cfg_ms_id = p_cfg_ms_id AND status_category = 'baseline') THEN
        v_gaps := array_append(v_gaps, 'No baseline status definition');
    END IF;
    
    RETURN QUERY SELECT 
        'Status Definitions'::VARCHAR,
        CASE WHEN array_length(v_gaps, 1) IS NULL THEN 'conformant' ELSE 'needs_improvement' END::VARCHAR,
        v_gaps,
        CASE WHEN array_length(v_gaps, 1) IS NOT NULL 
             THEN 'Define at least one baseline status'
             ELSE NULL END::TEXT;
    
    -- Check Configuration Item Records Requirement
    v_gaps := ARRAY[]::TEXT[];
    IF NOT EXISTS (SELECT 1 FROM cfg_records_requirements WHERE cfg_ms_id = p_cfg_ms_id AND record_type = 'configuration_item_record') THEN
        v_gaps := array_append(v_gaps, 'Configuration Item Records not included in records');
    END IF;
    
    RETURN QUERY SELECT 
        'Configuration Item Records'::VARCHAR,
        CASE WHEN array_length(v_gaps, 1) IS NULL THEN 'conformant' ELSE 'non_conformant' END::VARCHAR,
        v_gaps,
        CASE WHEN array_length(v_gaps, 1) IS NOT NULL 
             THEN 'Configuration Item Records must be included in records requirements'
             ELSE NULL END::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_cfg_ms_conformance(UUID) IS 'Checks conformance to corporate/project requirements';

-- Function: get_scheduled_configuration_activities()
CREATE OR REPLACE FUNCTION get_scheduled_configuration_activities(
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
    FROM cfg_scheduled_activities sa
    JOIN configuration_management_strategies cfg_ms ON sa.cfg_ms_id = cfg_ms.id
    WHERE cfg_ms.project_id = p_project_id
      AND cfg_ms.is_deleted = FALSE
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

COMMENT ON FUNCTION get_scheduled_configuration_activities(UUID, DATE, DATE) IS 'Returns upcoming configuration activities for a project';

-- Trigger: Revision history on status change
CREATE OR REPLACE FUNCTION trg_cfg_ms_revision_history_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'approved' THEN
        INSERT INTO cfg_revision_history (
            cfg_ms_id,
            revision_date,
            previous_revision_date,
            summary_of_changes,
            revised_by
        )
        VALUES (
            NEW.id,
            CURRENT_DATE,
            OLD.approved_date,
            'Status changed to approved',
            NEW.updated_by
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cfg_ms_revision_history ON configuration_management_strategies;
CREATE TRIGGER trg_cfg_ms_revision_history
    AFTER UPDATE ON configuration_management_strategies
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION trg_cfg_ms_revision_history_insert();

-- ============================================================================
-- END OF v192_configuration_management_strategy_tables.sql
-- ============================================================================

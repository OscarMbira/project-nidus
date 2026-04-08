-- ============================================================================
-- Configuration Item Record - Database Schema
-- Version: v194
-- Description: Creates tables for Configuration Item Record module
-- Date: 2026-01-20
-- ============================================================================
--
-- Purpose:
-- This script creates the database schema for the Configuration Item Record module,
-- which tracks all configuration items (products/deliverables) and their versions,
-- status changes, baseline inclusion, and related configuration management activities.
-- This is the operational log/register that executes the Configuration Management Strategy (v185).
--
-- Prerequisites:
-- - Core tables must exist (projects, users, accounts)
-- - Configuration Management Strategy tables (v192) must exist
-- - Existing change_requests table should exist
-- - Existing project_product_descriptions table should exist
--
-- ============================================================================
-- SECTION 1: CREATE ENUM TYPES
-- ============================================================================

-- Classification Level Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ci_classification_level_enum') THEN
        CREATE TYPE ci_classification_level_enum AS ENUM ('major', 'minor', 'component', 'work_product');
    END IF;
END $$;

-- Relationship Type Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ci_relationship_type_enum') THEN
        CREATE TYPE ci_relationship_type_enum AS ENUM ('contains', 'depends_on', 'supersedes', 'replaces', 'composed_of', 'other');
    END IF;
END $$;

-- Baseline Status Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ci_baseline_status_enum') THEN
        CREATE TYPE ci_baseline_status_enum AS ENUM ('draft', 'approved', 'superseded', 'archived');
    END IF;
END $$;

-- Baseline Approval Status Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ci_baseline_approval_status_enum') THEN
        CREATE TYPE ci_baseline_approval_status_enum AS ENUM ('pending', 'approved', 'rejected');
    END IF;
END $$;

-- Audit Status Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ci_audit_status_enum') THEN
        CREATE TYPE ci_audit_status_enum AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
    END IF;
END $$;

-- Audit Result Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ci_audit_result_enum') THEN
        CREATE TYPE ci_audit_result_enum AS ENUM ('passed', 'failed', 'conditional', 'pending', 'not_applicable');
    END IF;
END $$;

-- ============================================================================
-- SECTION 2: CREATE configuration_items TABLE (Main Table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuration_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Project and Strategy Links
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    cfg_ms_id UUID NOT NULL REFERENCES configuration_management_strategies(id) ON DELETE CASCADE,
    
    -- Identification
    configuration_item_identifier VARCHAR(100) NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    item_description TEXT,

    -- Product Link
    product_id UUID REFERENCES project_product_descriptions(id),
    product_breakdown_structure_code VARCHAR(100),

    -- Classification
    item_type_id UUID REFERENCES cfg_item_types(id),
    item_type_code VARCHAR(50),
    classification_level ci_classification_level_enum,

    -- Current State
    current_version VARCHAR(50) NOT NULL DEFAULT '1.0',
    current_status_id UUID REFERENCES cfg_status_definitions(id),
    current_status_code VARCHAR(50),
    is_in_baseline BOOLEAN DEFAULT FALSE,
    current_baseline_id UUID, -- Will reference configuration_baselines after it's created

    -- Version Control
    version_scheme_id UUID REFERENCES cfg_version_control_procedures(id),
    latest_version_id UUID, -- Will reference configuration_item_versions after it's created

    -- Identification
    identification_method_id UUID REFERENCES cfg_identification_methods(id),
    identification_scheme TEXT,

    -- Location/Storage
    storage_location TEXT,
    repository_url VARCHAR(500),
    document_url TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT uq_ci_identifier_project UNIQUE (project_id, configuration_item_identifier)
);

CREATE INDEX IF NOT EXISTS idx_ci_project ON configuration_items(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_ci_cfg_ms ON configuration_items(cfg_ms_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_ci_identifier ON configuration_items(configuration_item_identifier) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_ci_product ON configuration_items(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ci_status ON configuration_items(current_status_code) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_ci_type ON configuration_items(item_type_code) WHERE is_deleted = FALSE;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_ci_updated_at ON configuration_items;
CREATE TRIGGER trg_ci_updated_at
    BEFORE UPDATE ON configuration_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE configuration_items IS 'Configuration items (products/deliverables) tracked per Configuration Management Strategy';
COMMENT ON COLUMN configuration_items.cfg_ms_id IS 'Links to Configuration Management Strategy that defines how this item is managed';
COMMENT ON COLUMN configuration_items.configuration_item_identifier IS 'Unique identifier per project (e.g., CI-001, HW-001)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('configuration_items', 'Configuration items tracked per Configuration Management Strategy', false, true, 'configuration')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 3: CREATE configuration_item_versions TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuration_item_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    configuration_item_id UUID NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
    
    -- Version Details
    version_number VARCHAR(50) NOT NULL,
    version_label VARCHAR(100),
    is_current_version BOOLEAN DEFAULT FALSE,

    -- Version Details
    version_date DATE NOT NULL,
    version_created_by UUID REFERENCES users(id),
    version_notes TEXT,
    release_notes TEXT,

    -- Status
    status_id UUID REFERENCES cfg_status_definitions(id),
    status_code VARCHAR(50),
    status_date DATE,

    -- Change Control
    change_request_id UUID REFERENCES change_requests(id),
    change_authorization TEXT,

    -- Baseline
    is_in_baseline BOOLEAN DEFAULT FALSE,
    baseline_id UUID, -- Will reference configuration_baselines after it's created
    baseline_date DATE,

    -- Content
    content_hash VARCHAR(255),
    file_size BIGINT,
    file_type VARCHAR(100),
    checksum VARCHAR(255),

    -- Storage
    storage_location TEXT,
    repository_commit VARCHAR(255),
    document_url TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT uq_ci_version_item_number UNIQUE (configuration_item_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_ci_versions_item ON configuration_item_versions(configuration_item_id);
CREATE INDEX IF NOT EXISTS idx_ci_versions_current ON configuration_item_versions(is_current_version) WHERE is_current_version = TRUE;
CREATE INDEX IF NOT EXISTS idx_ci_versions_baseline ON configuration_item_versions(baseline_id) WHERE baseline_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ci_versions_status ON configuration_item_versions(status_code);

COMMENT ON TABLE configuration_item_versions IS 'Version history for configuration items';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('configuration_item_versions', 'Version history for configuration items', false, true, 'configuration')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 4: CREATE configuration_item_status_history TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuration_item_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    configuration_item_id UUID NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
    version_id UUID REFERENCES configuration_item_versions(id) ON DELETE SET NULL,
    
    -- Status Change Details
    previous_status_id UUID REFERENCES cfg_status_definitions(id),
    previous_status_code VARCHAR(50),
    new_status_id UUID NOT NULL REFERENCES cfg_status_definitions(id),
    new_status_code VARCHAR(50) NOT NULL,

    -- Status Change Details
    status_change_date DATE NOT NULL,
    status_change_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    changed_by_user_id UUID NOT NULL REFERENCES users(id),
    change_reason TEXT,
    change_notes TEXT,

    -- Change Control
    change_request_id UUID REFERENCES change_requests(id),
    requires_approval BOOLEAN DEFAULT FALSE,
    approval_received BOOLEAN DEFAULT FALSE,
    approved_by_user_id UUID REFERENCES users(id),
    approval_date DATE,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ci_status_history_item ON configuration_item_status_history(configuration_item_id);
CREATE INDEX IF NOT EXISTS idx_ci_status_history_version ON configuration_item_status_history(version_id) WHERE version_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ci_status_history_date ON configuration_item_status_history(status_change_date);
CREATE INDEX IF NOT EXISTS idx_ci_status_history_change_request ON configuration_item_status_history(change_request_id) WHERE change_request_id IS NOT NULL;

COMMENT ON TABLE configuration_item_status_history IS 'History of status changes for configuration items';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('configuration_item_status_history', 'Status change history for configuration items', false, true, 'configuration')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 5: CREATE configuration_baselines TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuration_baselines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    cfg_ms_id UUID NOT NULL REFERENCES configuration_management_strategies(id) ON DELETE CASCADE,
    
    -- Baseline Details
    baseline_type_id UUID REFERENCES cfg_baseline_procedures(id),
    baseline_type_code VARCHAR(50),
    baseline_identifier VARCHAR(100) NOT NULL,
    baseline_name VARCHAR(200) NOT NULL,
    baseline_description TEXT,

    -- Baseline Details
    baseline_date DATE NOT NULL,
    baseline_purpose TEXT,
    baseline_status ci_baseline_status_enum DEFAULT 'draft',
    is_current_baseline BOOLEAN DEFAULT FALSE,

    -- Approval
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    approved_by_user_id UUID REFERENCES users(id),
    approval_date DATE,
    approval_status ci_baseline_approval_status_enum DEFAULT 'pending',
    approval_comments TEXT,

    -- Change Control
    change_request_id UUID REFERENCES change_requests(id),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT uq_baseline_identifier UNIQUE (baseline_identifier)
);

CREATE INDEX IF NOT EXISTS idx_baselines_project ON configuration_baselines(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_baselines_cfg_ms ON configuration_baselines(cfg_ms_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_baselines_identifier ON configuration_baselines(baseline_identifier) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_baselines_type ON configuration_baselines(baseline_type_code) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_baselines_status ON configuration_baselines(baseline_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_baselines_current ON configuration_baselines(is_current_baseline) WHERE is_current_baseline = TRUE;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_baseline_updated_at ON configuration_baselines;
CREATE TRIGGER trg_baseline_updated_at
    BEFORE UPDATE ON configuration_baselines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE configuration_baselines IS 'Configuration baselines (groupings of CI versions)';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('configuration_baselines', 'Configuration baselines per Configuration Management Strategy', false, true, 'configuration')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- Add foreign key for current_baseline_id in configuration_items
ALTER TABLE configuration_items 
ADD CONSTRAINT fk_ci_current_baseline 
FOREIGN KEY (current_baseline_id) REFERENCES configuration_baselines(id) ON DELETE SET NULL;

-- Add foreign key for baseline_id in configuration_item_versions
ALTER TABLE configuration_item_versions 
ADD CONSTRAINT fk_ci_version_baseline 
FOREIGN KEY (baseline_id) REFERENCES configuration_baselines(id) ON DELETE SET NULL;

-- ============================================================================
-- SECTION 6: CREATE configuration_baseline_items TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuration_baseline_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    baseline_id UUID NOT NULL REFERENCES configuration_baselines(id) ON DELETE CASCADE,
    configuration_item_id UUID NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES configuration_item_versions(id) ON DELETE CASCADE,

    -- Baseline Item Details
    included_date DATE NOT NULL DEFAULT CURRENT_DATE,
    included_by_user_id UUID NOT NULL REFERENCES users(id),
    inclusion_reason TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT uq_baseline_item UNIQUE (baseline_id, configuration_item_id)
);

CREATE INDEX IF NOT EXISTS idx_baseline_items_baseline ON configuration_baseline_items(baseline_id);
CREATE INDEX IF NOT EXISTS idx_baseline_items_ci ON configuration_baseline_items(configuration_item_id);
CREATE INDEX IF NOT EXISTS idx_baseline_items_version ON configuration_baseline_items(version_id);

COMMENT ON TABLE configuration_baseline_items IS 'Items included in each baseline';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('configuration_baseline_items', 'Configuration items included in baselines', false, true, 'configuration')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 7: CREATE configuration_item_relationships TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuration_item_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_item_id UUID NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
    child_item_id UUID NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
    relationship_type ci_relationship_type_enum NOT NULL,
    relationship_description TEXT,

    -- Version Specific (optional)
    parent_version_id UUID REFERENCES configuration_item_versions(id) ON DELETE SET NULL,
    child_version_id UUID REFERENCES configuration_item_versions(id) ON DELETE SET NULL,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT chk_no_self_reference CHECK (parent_item_id != child_item_id)
);

CREATE INDEX IF NOT EXISTS idx_ci_relationships_parent ON configuration_item_relationships(parent_item_id);
CREATE INDEX IF NOT EXISTS idx_ci_relationships_child ON configuration_item_relationships(child_item_id);
CREATE INDEX IF NOT EXISTS idx_ci_relationships_type ON configuration_item_relationships(relationship_type);

COMMENT ON TABLE configuration_item_relationships IS 'Relationships between configuration items';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('configuration_item_relationships', 'Relationships between configuration items', false, true, 'configuration')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 8: CREATE configuration_item_audits TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuration_item_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    cfg_ms_id UUID NOT NULL REFERENCES configuration_management_strategies(id) ON DELETE CASCADE,
    
    -- Audit Details
    audit_type_id UUID REFERENCES cfg_audit_procedures(id),
    audit_type cfg_audit_type_enum NOT NULL,
    audit_reference VARCHAR(100) NOT NULL,
    audit_name VARCHAR(200) NOT NULL,
    audit_description TEXT,

    -- Audit Details
    audit_date DATE NOT NULL,
    audit_scheduled_date DATE,
    audit_status ci_audit_status_enum DEFAULT 'scheduled',
    audit_result ci_audit_result_enum DEFAULT 'pending',
    audit_findings TEXT,
    audit_recommendations TEXT,

    -- Participants
    auditor_user_id UUID NOT NULL REFERENCES users(id),
    participants UUID[],

    -- Items Audited
    configuration_items_audited UUID[],
    baseline_id UUID REFERENCES configuration_baselines(id),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT uq_audit_reference UNIQUE (audit_reference)
);

CREATE INDEX IF NOT EXISTS idx_ci_audits_project ON configuration_item_audits(project_id);
CREATE INDEX IF NOT EXISTS idx_ci_audits_cfg_ms ON configuration_item_audits(cfg_ms_id);
CREATE INDEX IF NOT EXISTS idx_ci_audits_reference ON configuration_item_audits(audit_reference);
CREATE INDEX IF NOT EXISTS idx_ci_audits_type ON configuration_item_audits(audit_type);
CREATE INDEX IF NOT EXISTS idx_ci_audits_status ON configuration_item_audits(audit_status);
CREATE INDEX IF NOT EXISTS idx_ci_audits_date ON configuration_item_audits(audit_date);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_ci_audit_updated_at ON configuration_item_audits;
CREATE TRIGGER trg_ci_audit_updated_at
    BEFORE UPDATE ON configuration_item_audits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE configuration_item_audits IS 'Configuration audits performed per Configuration Management Strategy';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('configuration_item_audits', 'Configuration audits per Configuration Management Strategy', false, true, 'configuration')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 9: CREATE configuration_item_audit_items TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuration_item_audit_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID NOT NULL REFERENCES configuration_item_audits(id) ON DELETE CASCADE,
    configuration_item_id UUID NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
    version_id UUID REFERENCES configuration_item_versions(id) ON DELETE SET NULL,
    
    audit_criteria TEXT,
    audit_result ci_audit_result_enum DEFAULT 'pending',
    audit_findings TEXT,
    audit_recommendations TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ci_audit_items_audit ON configuration_item_audit_items(audit_id);
CREATE INDEX IF NOT EXISTS idx_ci_audit_items_ci ON configuration_item_audit_items(configuration_item_id);
CREATE INDEX IF NOT EXISTS idx_ci_audit_items_version ON configuration_item_audit_items(version_id) WHERE version_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ci_audit_items_result ON configuration_item_audit_items(audit_result);

COMMENT ON TABLE configuration_item_audit_items IS 'Individual item results from configuration audits';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('configuration_item_audit_items', 'Individual configuration item audit results', false, true, 'configuration')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 10: ADD FOREIGN KEY FOR latest_version_id
-- ============================================================================

ALTER TABLE configuration_items 
ADD CONSTRAINT fk_ci_latest_version 
FOREIGN KEY (latest_version_id) REFERENCES configuration_item_versions(id) ON DELETE SET NULL;

-- ============================================================================
-- SECTION 11: CREATE DATABASE FUNCTIONS
-- ============================================================================

-- Function: generate_ci_identifier()
CREATE OR REPLACE FUNCTION generate_ci_identifier(
    p_project_id UUID,
    p_item_type_code VARCHAR DEFAULT 'CI'
)
RETURNS VARCHAR AS $$
DECLARE
    v_prefix VARCHAR;
    v_sequence INTEGER;
    v_identifier VARCHAR;
BEGIN
    -- Use item type code as prefix, default to 'CI'
    v_prefix := COALESCE(p_item_type_code, 'CI');
    
    -- Get next sequence number for this project and prefix
    SELECT COALESCE(MAX(CAST(SUBSTRING(configuration_item_identifier FROM v_prefix || '-(.+)$') AS INTEGER)), 0) + 1
    INTO v_sequence
    FROM configuration_items
    WHERE project_id = p_project_id
      AND configuration_item_identifier LIKE v_prefix || '-%'
      AND is_deleted = FALSE;
    
    v_identifier := v_prefix || '-' || LPAD(v_sequence::TEXT, 3, '0');
    
    RETURN v_identifier;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_ci_identifier(UUID, VARCHAR) IS 'Generates unique configuration item identifier like CI-001, HW-001';

-- Function: create_configuration_item()
CREATE OR REPLACE FUNCTION create_configuration_item(
    p_project_id UUID,
    p_item_name VARCHAR,
    p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_cfg_ms_id UUID;
    v_ci_id UUID;
    v_identifier VARCHAR;
    v_initial_version_id UUID;
BEGIN
    -- Get Configuration Management Strategy for project
    SELECT id INTO v_cfg_ms_id
    FROM configuration_management_strategies
    WHERE project_id = p_project_id
      AND is_deleted = FALSE
      AND status = 'approved'
    LIMIT 1;
    
    IF v_cfg_ms_id IS NULL THEN
        RAISE EXCEPTION 'No approved Configuration Management Strategy found for project';
    END IF;
    
    -- Generate identifier
    v_identifier := generate_ci_identifier(p_project_id);
    
    -- Create configuration item
    INSERT INTO configuration_items (
        project_id,
        cfg_ms_id,
        configuration_item_identifier,
        item_name,
        current_version,
        created_by,
        updated_by
    )
    VALUES (
        p_project_id,
        v_cfg_ms_id,
        v_identifier,
        p_item_name,
        '1.0',
        p_user_id,
        p_user_id
    )
    RETURNING id INTO v_ci_id;
    
    -- Create initial version
    INSERT INTO configuration_item_versions (
        configuration_item_id,
        version_number,
        version_date,
        version_created_by,
        is_current_version,
        created_by
    )
    VALUES (
        v_ci_id,
        '1.0',
        CURRENT_DATE,
        p_user_id,
        TRUE,
        p_user_id
    )
    RETURNING id INTO v_initial_version_id;
    
    -- Update configuration item with latest version
    UPDATE configuration_items
    SET latest_version_id = v_initial_version_id
    WHERE id = v_ci_id;
    
    RETURN v_ci_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_configuration_item(UUID, VARCHAR, UUID) IS 'Creates new configuration item with initial version';

-- Function: create_ci_version()
CREATE OR REPLACE FUNCTION create_ci_version(
    p_configuration_item_id UUID,
    p_version_number VARCHAR,
    p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_version_id UUID;
BEGIN
    -- Unset current version flags
    UPDATE configuration_item_versions
    SET is_current_version = FALSE
    WHERE configuration_item_id = p_configuration_item_id;
    
    -- Create new version
    INSERT INTO configuration_item_versions (
        configuration_item_id,
        version_number,
        version_date,
        version_created_by,
        is_current_version,
        created_by
    )
    VALUES (
        p_configuration_item_id,
        p_version_number,
        CURRENT_DATE,
        p_user_id,
        TRUE,
        p_user_id
    )
    RETURNING id INTO v_version_id;
    
    -- Update configuration item
    UPDATE configuration_items
    SET current_version = p_version_number,
        latest_version_id = v_version_id,
        updated_by = p_user_id,
        updated_at = NOW()
    WHERE id = p_configuration_item_id;
    
    RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_ci_version(UUID, VARCHAR, UUID) IS 'Creates new version of a configuration item';

-- Function: update_ci_status()
CREATE OR REPLACE FUNCTION update_ci_status(
    p_configuration_item_id UUID,
    p_new_status_id UUID,
    p_user_id UUID,
    p_change_request_id UUID DEFAULT NULL,
    p_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_status_history_id UUID;
    v_old_status_id UUID;
    v_old_status_code VARCHAR;
    v_new_status_code VARCHAR;
BEGIN
    -- Get current status
    SELECT current_status_id, current_status_code INTO v_old_status_id, v_old_status_code
    FROM configuration_items
    WHERE id = p_configuration_item_id;
    
    -- Get new status code
    SELECT status_code INTO v_new_status_code
    FROM cfg_status_definitions
    WHERE id = p_new_status_id;
    
    -- Create status history entry
    INSERT INTO configuration_item_status_history (
        configuration_item_id,
        previous_status_id,
        previous_status_code,
        new_status_id,
        new_status_code,
        status_change_date,
        changed_by_user_id,
        change_reason,
        change_request_id
    )
    VALUES (
        p_configuration_item_id,
        v_old_status_id,
        v_old_status_code,
        p_new_status_id,
        v_new_status_code,
        CURRENT_DATE,
        p_user_id,
        p_reason,
        p_change_request_id
    )
    RETURNING id INTO v_status_history_id;
    
    -- Update configuration item
    UPDATE configuration_items
    SET current_status_id = p_new_status_id,
        current_status_code = v_new_status_code,
        updated_by = p_user_id,
        updated_at = NOW()
    WHERE id = p_configuration_item_id;
    
    RETURN v_status_history_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_ci_status(UUID, UUID, UUID, UUID, TEXT) IS 'Updates configuration item status and creates history entry';

-- Function: create_baseline()
CREATE OR REPLACE FUNCTION create_baseline(
    p_project_id UUID,
    p_baseline_type_id UUID,
    p_baseline_name VARCHAR,
    p_user_id UUID,
    p_ci_version_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS UUID AS $$
DECLARE
    v_cfg_ms_id UUID;
    v_baseline_id UUID;
    v_baseline_type_code VARCHAR;
    v_sequence INTEGER;
    v_baseline_identifier VARCHAR;
    v_version_id UUID;
    v_configuration_item_id UUID;
BEGIN
    -- Get Configuration Management Strategy
    SELECT id INTO v_cfg_ms_id
    FROM configuration_management_strategies
    WHERE project_id = p_project_id
      AND is_deleted = FALSE
      AND status = 'approved'
    LIMIT 1;
    
    IF v_cfg_ms_id IS NULL THEN
        RAISE EXCEPTION 'No approved Configuration Management Strategy found for project';
    END IF;
    
    -- Get baseline type code
    SELECT baseline_type_code INTO v_baseline_type_code
    FROM cfg_baseline_procedures
    WHERE id = p_baseline_type_id;
    
    -- Generate baseline identifier
    SELECT COALESCE(MAX(CAST(SUBSTRING(baseline_identifier FROM v_baseline_type_code || '-(.+)$') AS INTEGER)), 0) + 1
    INTO v_sequence
    FROM configuration_baselines
    WHERE project_id = p_project_id
      AND baseline_identifier LIKE v_baseline_type_code || '-%'
      AND is_deleted = FALSE;
    
    v_baseline_identifier := v_baseline_type_code || '-' || LPAD(v_sequence::TEXT, 3, '0');
    
    -- Create baseline
    INSERT INTO configuration_baselines (
        project_id,
        cfg_ms_id,
        baseline_type_id,
        baseline_type_code,
        baseline_identifier,
        baseline_name,
        baseline_date,
        created_by_user_id,
        created_by,
        updated_by
    )
    VALUES (
        p_project_id,
        v_cfg_ms_id,
        p_baseline_type_id,
        v_baseline_type_code,
        v_baseline_identifier,
        p_baseline_name,
        CURRENT_DATE,
        p_user_id,
        p_user_id,
        p_user_id
    )
    RETURNING id INTO v_baseline_id;
    
    -- Add configuration item versions to baseline
    IF array_length(p_ci_version_ids, 1) > 0 THEN
        FOREACH v_version_id IN ARRAY p_ci_version_ids
        LOOP
            -- Get configuration item ID
            SELECT configuration_item_id INTO v_configuration_item_id
            FROM configuration_item_versions
            WHERE id = v_version_id;
            
            -- Add to baseline items
            INSERT INTO configuration_baseline_items (
                baseline_id,
                configuration_item_id,
                version_id,
                included_by_user_id
            )
            VALUES (
                v_baseline_id,
                v_configuration_item_id,
                v_version_id,
                p_user_id
            );
            
            -- Update version
            UPDATE configuration_item_versions
            SET is_in_baseline = TRUE,
                baseline_id = v_baseline_id,
                baseline_date = CURRENT_DATE
            WHERE id = v_version_id;
            
            -- Update configuration item
            UPDATE configuration_items
            SET is_in_baseline = TRUE,
                current_baseline_id = v_baseline_id
            WHERE id = v_configuration_item_id;
        END LOOP;
    END IF;
    
    RETURN v_baseline_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_baseline(UUID, UUID, VARCHAR, UUID, UUID[]) IS 'Creates baseline from configuration item versions';

-- Function: get_ci_version_history()
CREATE OR REPLACE FUNCTION get_ci_version_history(p_configuration_item_id UUID)
RETURNS TABLE (
    version_id UUID,
    version_number VARCHAR,
    version_date DATE,
    status_code VARCHAR,
    is_current_version BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id AS version_id,
        v.version_number,
        v.version_date,
        v.status_code,
        v.is_current_version
    FROM configuration_item_versions v
    WHERE v.configuration_item_id = p_configuration_item_id
    ORDER BY v.version_date DESC, v.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_ci_version_history(UUID) IS 'Returns complete version history for a configuration item';

-- Function: get_current_baseline()
CREATE OR REPLACE FUNCTION get_current_baseline(
    p_project_id UUID,
    p_baseline_type_code VARCHAR
)
RETURNS UUID AS $$
DECLARE
    v_baseline_id UUID;
BEGIN
    SELECT id INTO v_baseline_id
    FROM configuration_baselines
    WHERE project_id = p_project_id
      AND baseline_type_code = p_baseline_type_code
      AND is_current_baseline = TRUE
      AND is_deleted = FALSE
    ORDER BY baseline_date DESC
    LIMIT 1;
    
    RETURN v_baseline_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_current_baseline(UUID, VARCHAR) IS 'Returns current baseline of specified type for a project';

-- Function: get_baseline_differences()
CREATE OR REPLACE FUNCTION get_baseline_differences(
    p_baseline_id_1 UUID,
    p_baseline_id_2 UUID
)
RETURNS TABLE (
    configuration_item_id UUID,
    item_identifier VARCHAR,
    baseline_1_version VARCHAR,
    baseline_2_version VARCHAR,
    change_type VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH baseline_1_items AS (
        SELECT 
            bi.configuration_item_id,
            ci.configuration_item_identifier AS item_identifier,
            v.version_number AS version_number
        FROM configuration_baseline_items bi
        JOIN configuration_items ci ON ci.id = bi.configuration_item_id
        JOIN configuration_item_versions v ON v.id = bi.version_id
        WHERE bi.baseline_id = p_baseline_id_1
    ),
    baseline_2_items AS (
        SELECT 
            bi.configuration_item_id,
            ci.configuration_item_identifier AS item_identifier,
            v.version_number AS version_number
        FROM configuration_baseline_items bi
        JOIN configuration_items ci ON ci.id = bi.configuration_item_id
        JOIN configuration_item_versions v ON v.id = bi.version_id
        WHERE bi.baseline_id = p_baseline_id_2
    )
    SELECT 
        COALESCE(b1.configuration_item_id, b2.configuration_item_id) AS configuration_item_id,
        COALESCE(b1.item_identifier, b2.item_identifier) AS item_identifier,
        b1.version_number AS baseline_1_version,
        b2.version_number AS baseline_2_version,
        CASE 
            WHEN b1.configuration_item_id IS NULL THEN 'added'
            WHEN b2.configuration_item_id IS NULL THEN 'removed'
            WHEN b1.version_number != b2.version_number THEN 'version_changed'
            ELSE 'unchanged'
        END AS change_type
    FROM baseline_1_items b1
    FULL OUTER JOIN baseline_2_items b2 ON b1.configuration_item_id = b2.configuration_item_id
    WHERE COALESCE(b1.version_number, '') != COALESCE(b2.version_number, '');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_baseline_differences(UUID, UUID) IS 'Compares two baselines and returns differences';

-- Trigger: Auto-generate configuration_item_identifier on INSERT
CREATE OR REPLACE FUNCTION trg_generate_ci_identifier()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.configuration_item_identifier IS NULL OR NEW.configuration_item_identifier = '' THEN
        NEW.configuration_item_identifier := generate_ci_identifier(NEW.project_id, NEW.item_type_code);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ci_identifier ON configuration_items;
CREATE TRIGGER trg_ci_identifier
    BEFORE INSERT ON configuration_items
    FOR EACH ROW
    EXECUTE FUNCTION trg_generate_ci_identifier();

-- ============================================================================
-- END OF v194_configuration_item_record_tables.sql
-- ============================================================================

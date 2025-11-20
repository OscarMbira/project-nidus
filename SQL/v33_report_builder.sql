-- ================================================
-- File: v33_report_builder.sql
-- Description: Custom Report Builder module tables
-- Version: 1.1 (Added cleanup statements for idempotency)
-- Date: 2025-01-17
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v32 must be run first (all core tables must exist)
-- - projects table must exist
-- - users table must exist

-- Purpose:
-- Creates tables for Custom Report Builder module:
-- 1. report_categories - Report categorization
-- 2. report_templates - Pre-built report templates
-- 3. report_definitions - User-created custom reports
-- 4. report_schedules - Scheduled report configurations
-- 5. report_executions - Report execution history
-- 6. report_shares - Report sharing and permissions
-- 7. report_exports - Exported report files

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- CLEANUP: Drop existing tables if they exist (in reverse dependency order)
-- ================================================

DROP TABLE IF EXISTS report_favorites CASCADE;
DROP TABLE IF EXISTS report_shares CASCADE;
DROP TABLE IF EXISTS report_executions CASCADE;
DROP TABLE IF EXISTS report_schedules CASCADE;
DROP TABLE IF EXISTS report_definitions CASCADE;
DROP TABLE IF EXISTS report_templates CASCADE;
DROP TABLE IF EXISTS report_categories CASCADE;

-- Drop views
DROP VIEW IF EXISTS user_report_library CASCADE;

-- ================================================
-- TABLE 1: report_categories
-- Description: Report categorization for organization
-- Category: reporting
-- ================================================

CREATE TABLE IF NOT EXISTS report_categories (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Category Information
    category_name VARCHAR(200) NOT NULL,
    category_description TEXT,
    category_icon VARCHAR(50),
    category_color VARCHAR(20),

    -- Hierarchy
    parent_category_id UUID REFERENCES report_categories(id) ON DELETE SET NULL,
    category_level INTEGER DEFAULT 1,
    category_path VARCHAR(500), -- e.g., 'Projects/Performance/Schedule'

    -- Display
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    -- Notes
    notes TEXT,

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
CREATE INDEX IF NOT EXISTS idx_report_categories_parent ON report_categories(parent_category_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_report_categories_active ON report_categories(is_active) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_report_categories_updated_at ON report_categories;
CREATE TRIGGER trg_report_categories_updated_at
    BEFORE UPDATE ON report_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 2: report_templates
-- Description: Pre-built report templates
-- Category: reporting
-- ================================================

CREATE TABLE IF NOT EXISTS report_templates (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Template Information
    template_name VARCHAR(200) NOT NULL,
    template_description TEXT,
    template_category_id UUID REFERENCES report_categories(id) ON DELETE SET NULL,

    -- Template Type
    template_type VARCHAR(50) DEFAULT 'tabular', -- 'tabular', 'chart', 'dashboard', 'matrix', 'custom'
    report_purpose VARCHAR(100), -- 'operational', 'tactical', 'strategic', 'compliance'

    -- Data Source Configuration
    primary_data_source VARCHAR(100), -- 'projects', 'tasks', 'risks', 'issues', 'resources', etc.
    data_sources JSONB, -- Array of data source configurations
    joins_configuration JSONB, -- Join specifications between tables

    -- Fields Configuration
    fields_configuration JSONB, -- Selected fields, aliases, calculations
    calculated_fields JSONB, -- Custom calculated fields

    -- Filters & Parameters
    default_filters JSONB, -- Default filter configurations
    user_parameters JSONB, -- User-selectable parameters
    dynamic_filters JSONB, -- Context-based filters

    -- Grouping & Sorting
    grouping_configuration JSONB, -- Group by fields
    sorting_configuration JSONB, -- Sort order
    aggregations JSONB, -- SUM, AVG, COUNT, etc.

    -- Visualization
    chart_type VARCHAR(50), -- 'bar', 'line', 'pie', 'scatter', 'heatmap', 'gantt', etc.
    chart_configuration JSONB, -- Chart-specific settings
    layout_configuration JSONB, -- Report layout settings

    -- Formatting
    styling_configuration JSONB, -- Colors, fonts, etc.
    conditional_formatting JSONB, -- Rules for conditional formatting

    -- Metadata
    methodology VARCHAR(50), -- 'all', 'structured', 'scrum', 'kanban', 'agile'
    applicable_to_project_types TEXT[],
    complexity_level VARCHAR(50), -- 'simple', 'intermediate', 'advanced'

    -- Usage
    is_system_template BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    rating_average DECIMAL(3,2),
    rating_count INTEGER DEFAULT 0,

    -- Preview
    preview_image_url TEXT,
    sample_output_url TEXT,

    -- Version
    version VARCHAR(20) DEFAULT '1.0',

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    published_date DATE,

    -- Ownership
    owner_user_id UUID REFERENCES users(id),

    -- Notes
    notes TEXT,
    tags TEXT[],

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
CREATE INDEX IF NOT EXISTS idx_report_templates_category ON report_templates(template_category_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_report_templates_type ON report_templates(template_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_report_templates_methodology ON report_templates(methodology) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_report_templates_public ON report_templates(is_public) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_report_templates_owner ON report_templates(owner_user_id) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_report_templates_updated_at ON report_templates;
CREATE TRIGGER trg_report_templates_updated_at
    BEFORE UPDATE ON report_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 3: report_definitions
-- Description: User-created custom reports
-- Category: reporting
-- ================================================

CREATE TABLE IF NOT EXISTS report_definitions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Report Information
    report_name VARCHAR(200) NOT NULL,
    report_description TEXT,
    report_category_id UUID REFERENCES report_categories(id) ON DELETE SET NULL,

    -- Based on Template
    template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,
    template_version VARCHAR(20),

    -- Report Type
    report_type VARCHAR(50) DEFAULT 'tabular', -- 'tabular', 'chart', 'dashboard', 'matrix', 'custom'

    -- Data Source Configuration (same as templates)
    primary_data_source VARCHAR(100),
    data_sources JSONB,
    joins_configuration JSONB,

    -- Fields Configuration
    fields_configuration JSONB,
    calculated_fields JSONB,

    -- Filters & Parameters
    filters JSONB,
    parameters JSONB,

    -- Grouping & Sorting
    grouping_configuration JSONB,
    sorting_configuration JSONB,
    aggregations JSONB,

    -- Visualization
    chart_type VARCHAR(50),
    chart_configuration JSONB,
    layout_configuration JSONB,

    -- Formatting
    styling_configuration JSONB,
    conditional_formatting JSONB,

    -- Page Settings
    page_size VARCHAR(20) DEFAULT 'A4', -- 'A4', 'Letter', 'Legal', 'A3'
    page_orientation VARCHAR(20) DEFAULT 'portrait', -- 'portrait', 'landscape'
    page_margins JSONB,

    -- Access Control
    visibility VARCHAR(50) DEFAULT 'private', -- 'private', 'shared', 'public', 'organization'
    owner_user_id UUID NOT NULL REFERENCES users(id),

    -- Favorites
    is_favorite BOOLEAN DEFAULT FALSE,
    favorite_count INTEGER DEFAULT 0,

    -- Usage Statistics
    run_count INTEGER DEFAULT 0,
    last_run_at TIMESTAMP,
    average_execution_time_seconds DECIMAL(10,2),

    -- Version Control
    version INTEGER DEFAULT 1,
    is_current_version BOOLEAN DEFAULT TRUE,

    -- Status
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'draft', 'archived'

    -- Notes
    notes TEXT,
    tags TEXT[],

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
CREATE INDEX IF NOT EXISTS idx_report_definitions_category ON report_definitions(report_category_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_report_definitions_template ON report_definitions(template_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_report_definitions_owner ON report_definitions(owner_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_report_definitions_visibility ON report_definitions(visibility) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_report_definitions_status ON report_definitions(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_report_definitions_favorite ON report_definitions(is_favorite) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_report_definitions_updated_at ON report_definitions;
CREATE TRIGGER trg_report_definitions_updated_at
    BEFORE UPDATE ON report_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 4: report_schedules
-- Description: Scheduled report configurations
-- Category: reporting
-- ================================================

CREATE TABLE IF NOT EXISTS report_schedules (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Report Reference
    report_definition_id UUID NOT NULL REFERENCES report_definitions(id) ON DELETE CASCADE,

    -- Schedule Information
    schedule_name VARCHAR(200) NOT NULL,
    schedule_description TEXT,

    -- Schedule Configuration
    frequency VARCHAR(50) NOT NULL, -- 'once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'
    cron_expression VARCHAR(100), -- For custom schedules

    -- Time Settings
    schedule_time TIME DEFAULT '09:00:00',
    schedule_timezone VARCHAR(100) DEFAULT 'UTC',

    -- Weekly Settings
    days_of_week INTEGER[], -- 0=Sunday, 1=Monday, etc.

    -- Monthly Settings
    day_of_month INTEGER, -- 1-31
    week_of_month INTEGER, -- 1-5
    day_of_week_for_month INTEGER, -- For "2nd Tuesday of month"

    -- Date Range
    start_date DATE NOT NULL,
    end_date DATE,
    next_run_date TIMESTAMP,
    last_run_date TIMESTAMP,

    -- Parameters
    parameter_values JSONB, -- Fixed parameter values for scheduled runs

    -- Output Settings
    output_format VARCHAR(50) DEFAULT 'pdf', -- 'pdf', 'excel', 'csv', 'html'
    output_formats TEXT[], -- Multiple formats

    -- Distribution
    email_recipients TEXT[], -- Email addresses
    email_subject VARCHAR(200),
    email_body TEXT,
    attach_report BOOLEAN DEFAULT TRUE,
    send_link_instead BOOLEAN DEFAULT FALSE,

    -- Storage
    save_to_storage BOOLEAN DEFAULT TRUE,
    storage_path VARCHAR(500),
    retention_days INTEGER DEFAULT 90,

    -- Conditions
    run_only_if_data_exists BOOLEAN DEFAULT FALSE,
    minimum_row_count INTEGER,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'running', 'paused', 'failed', 'completed'

    -- Execution Statistics
    successful_runs INTEGER DEFAULT 0,
    failed_runs INTEGER DEFAULT 0,
    last_execution_status VARCHAR(50),
    last_execution_error TEXT,

    -- Ownership
    owner_user_id UUID NOT NULL REFERENCES users(id),

    -- Notes
    notes TEXT,

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
CREATE INDEX IF NOT EXISTS idx_report_schedules_report_id ON report_schedules(report_definition_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_report_schedules_active ON report_schedules(is_active) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_report_schedules_next_run ON report_schedules(next_run_date) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_report_schedules_frequency ON report_schedules(frequency) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_report_schedules_owner ON report_schedules(owner_user_id) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_report_schedules_updated_at ON report_schedules;
CREATE TRIGGER trg_report_schedules_updated_at
    BEFORE UPDATE ON report_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 5: report_executions
-- Description: Report execution history
-- Category: reporting
-- ================================================

CREATE TABLE IF NOT EXISTS report_executions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Report Reference
    report_definition_id UUID NOT NULL REFERENCES report_definitions(id) ON DELETE CASCADE,
    report_schedule_id UUID REFERENCES report_schedules(id) ON DELETE SET NULL,

    -- Execution Information
    execution_reference VARCHAR(100) UNIQUE,
    execution_type VARCHAR(50) DEFAULT 'manual', -- 'manual', 'scheduled', 'api'

    -- Execution Details
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    execution_duration_seconds DECIMAL(10,2),
    execution_status VARCHAR(50) DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'

    -- Parameters Used
    parameters_used JSONB,
    filters_applied JSONB,

    -- Results
    row_count INTEGER,
    data_retrieved_at TIMESTAMP,
    cache_used BOOLEAN DEFAULT FALSE,

    -- Output
    output_format VARCHAR(50), -- 'pdf', 'excel', 'csv', 'html', 'json'
    output_file_url TEXT,
    output_file_size_bytes BIGINT,
    output_file_name VARCHAR(500),

    -- Performance
    query_execution_time_ms INTEGER,
    rendering_time_ms INTEGER,
    total_time_ms INTEGER,

    -- Error Handling
    error_occurred BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    error_stack_trace TEXT,

    -- User Context
    executed_by_user_id UUID REFERENCES users(id),
    ip_address VARCHAR(50),
    user_agent TEXT,

    -- Expiry
    expires_at TIMESTAMP,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_report_executions_report_id ON report_executions(report_definition_id);
CREATE INDEX IF NOT EXISTS idx_report_executions_schedule_id ON report_executions(report_schedule_id);
CREATE INDEX IF NOT EXISTS idx_report_executions_status ON report_executions(execution_status);
CREATE INDEX IF NOT EXISTS idx_report_executions_started_at ON report_executions(started_at);
CREATE INDEX IF NOT EXISTS idx_report_executions_user ON report_executions(executed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_report_executions_reference ON report_executions(execution_reference);

-- ================================================
-- TABLE 6: report_shares
-- Description: Report sharing and permissions
-- Category: reporting
-- ================================================

CREATE TABLE IF NOT EXISTS report_shares (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Report Reference
    report_definition_id UUID NOT NULL REFERENCES report_definitions(id) ON DELETE CASCADE,

    -- Shared With
    shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shared_with_role VARCHAR(100), -- Share with all users having this role
    shared_with_team_id UUID, -- Share with team

    -- Permissions
    can_view BOOLEAN DEFAULT TRUE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    can_share BOOLEAN DEFAULT FALSE,
    can_schedule BOOLEAN DEFAULT FALSE,

    -- Share Details
    shared_by_user_id UUID REFERENCES users(id),
    share_date DATE NOT NULL,
    share_message TEXT,

    -- Access Link
    share_link_token VARCHAR(100) UNIQUE,
    share_link_expires_at TIMESTAMP,
    share_link_password_hash VARCHAR(255),
    allow_anonymous_access BOOLEAN DEFAULT FALSE,

    -- Usage Tracking
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMP,
    revoked_by_user_id UUID REFERENCES users(id),

    -- Notes
    notes TEXT,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    -- Constraints
    CONSTRAINT report_shares_unique_user UNIQUE (report_definition_id, shared_with_user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_report_shares_report_id ON report_shares(report_definition_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_report_shares_user_id ON report_shares(shared_with_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_report_shares_active ON report_shares(is_active) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_report_shares_token ON report_shares(share_link_token) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_report_shares_updated_at ON report_shares;
CREATE TRIGGER trg_report_shares_updated_at
    BEFORE UPDATE ON report_shares
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 7: report_favorites
-- Description: User favorite reports
-- Category: reporting
-- ================================================

CREATE TABLE IF NOT EXISTS report_favorites (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_definition_id UUID REFERENCES report_definitions(id) ON DELETE CASCADE,
    report_template_id UUID REFERENCES report_templates(id) ON DELETE CASCADE,

    -- Favorite Details
    favorited_at TIMESTAMP DEFAULT NOW(),
    display_order INTEGER DEFAULT 0,

    -- Constraints
    CONSTRAINT report_favorites_check CHECK (
        (report_definition_id IS NOT NULL AND report_template_id IS NULL) OR
        (report_definition_id IS NULL AND report_template_id IS NOT NULL)
    ),
    CONSTRAINT report_favorites_unique_definition UNIQUE (user_id, report_definition_id),
    CONSTRAINT report_favorites_unique_template UNIQUE (user_id, report_template_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_report_favorites_user_id ON report_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_report_favorites_report_id ON report_favorites(report_definition_id);
CREATE INDEX IF NOT EXISTS idx_report_favorites_template_id ON report_favorites(report_template_id);

-- ================================================
-- VIEW: user_report_library
-- Description: User's complete report library (own + shared)
-- ================================================

CREATE OR REPLACE VIEW user_report_library AS
SELECT DISTINCT
    rd.id,
    rd.report_name,
    rd.report_description,
    rd.report_type,
    rd.owner_user_id,
    u.email as owner_email,
    rc.category_name,
    rd.visibility,
    rd.last_run_at,
    rd.run_count,
    CASE
        WHEN rf.id IS NOT NULL THEN TRUE
        ELSE FALSE
    END as is_favorite,
    CASE
        WHEN rd.owner_user_id = rd.created_by THEN 'owner'
        WHEN rs.shared_with_user_id = rd.created_by THEN 'shared'
        ELSE 'public'
    END as access_type,
    rs.can_edit,
    rs.can_delete
FROM report_definitions rd
LEFT JOIN users u ON rd.owner_user_id = u.id
LEFT JOIN report_categories rc ON rd.report_category_id = rc.id
LEFT JOIN report_shares rs ON rd.id = rs.report_definition_id AND rs.is_active = TRUE
LEFT JOIN report_favorites rf ON rd.id = rf.report_definition_id
WHERE rd.is_deleted = FALSE
  AND rd.status = 'active';

-- ================================================
-- Register Tables in database_tables Registry
-- ================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('report_categories', 'Report categorization and organization structure', false, true),
  ('report_templates', 'Pre-built report templates for common use cases', false, true),
  ('report_definitions', 'User-created custom report configurations', false, true),
  ('report_schedules', 'Scheduled report execution and distribution configurations', false, true),
  ('report_executions', 'Report execution history and performance tracking', false, true),
  ('report_shares', 'Report sharing permissions and access control', false, true),
  ('report_favorites', 'User favorite reports for quick access', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- ================================================
-- End of v33_report_builder.sql
-- ================================================

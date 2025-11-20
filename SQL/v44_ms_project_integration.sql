-- =====================================================================================
-- Phase 7: Integrations & API Development
-- Version: v44
-- Feature: Microsoft Project Integration
-- Description: Import/Export integration with Microsoft Project files (.mpp, .xml, .xlsx)
-- Author: Development Team
-- Date: 2025-11-18
-- =====================================================================================

-- =====================================================================================
-- Table: ms_project_imports
-- Description: MS Project import history and status
-- =====================================================================================
CREATE TABLE IF NOT EXISTS ms_project_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    user_id UUID NOT NULL REFERENCES users(id),
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    file_path TEXT,
    file_format VARCHAR(10), -- mpp, xml, xlsx
    import_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    tasks_imported INTEGER DEFAULT 0,
    resources_imported INTEGER DEFAULT 0,
    dependencies_imported INTEGER DEFAULT 0,
    milestones_imported INTEGER DEFAULT 0,
    error_log TEXT,
    import_options JSONB, -- Configuration options used during import

    -- Import statistics
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    processing_duration_ms INTEGER,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- =====================================================================================
-- Table: ms_project_exports
-- Description: MS Project export history and status
-- =====================================================================================
CREATE TABLE IF NOT EXISTS ms_project_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    user_id UUID NOT NULL REFERENCES users(id),
    export_format VARCHAR(10) NOT NULL, -- mpp, xml, xlsx
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT,
    file_size BIGINT,
    export_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    tasks_exported INTEGER DEFAULT 0,
    resources_exported INTEGER DEFAULT 0,
    dependencies_exported INTEGER DEFAULT 0,
    milestones_exported INTEGER DEFAULT 0,
    error_log TEXT,
    export_options JSONB, -- Configuration options used during export

    -- Export statistics
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    processing_duration_ms INTEGER,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- =====================================================================================
-- Table: ms_project_field_mappings
-- Description: Field mapping configurations for import/export
-- =====================================================================================
CREATE TABLE IF NOT EXISTS ms_project_field_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id), -- NULL for global mappings
    user_id UUID REFERENCES users(id),
    mapping_name VARCHAR(255) NOT NULL,
    mapping_type VARCHAR(10) NOT NULL, -- import, export, both
    source_field VARCHAR(100) NOT NULL,
    target_field VARCHAR(100) NOT NULL,
    transformation_rule JSONB, -- JSON rules for data transformation
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    CONSTRAINT unique_field_mapping UNIQUE (mapping_name, source_field, target_field)
);

-- =====================================================================================
-- Table: ms_project_task_mappings
-- Description: Track MS Project task ID to Nidus task ID mappings
-- =====================================================================================
CREATE TABLE IF NOT EXISTS ms_project_task_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id UUID NOT NULL REFERENCES ms_project_imports(id) ON DELETE CASCADE,
    ms_project_task_id VARCHAR(100),
    ms_project_task_uid VARCHAR(100),
    nidus_task_id UUID REFERENCES tasks(id),
    task_name VARCHAR(500),
    import_status VARCHAR(20), -- success, failed, skipped

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- =====================================================================================
-- Indexes for Performance
-- =====================================================================================
CREATE INDEX IF NOT EXISTS idx_ms_project_imports_project_id ON ms_project_imports(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_ms_project_imports_user_id ON ms_project_imports(user_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_ms_project_imports_status ON ms_project_imports(import_status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_ms_project_imports_created_at ON ms_project_imports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ms_project_exports_project_id ON ms_project_exports(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_ms_project_exports_user_id ON ms_project_exports(user_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_ms_project_exports_status ON ms_project_exports(export_status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_ms_project_exports_created_at ON ms_project_exports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ms_project_field_mappings_project_id ON ms_project_field_mappings(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_ms_project_field_mappings_type ON ms_project_field_mappings(mapping_type) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_ms_project_task_mappings_import_id ON ms_project_task_mappings(import_id);
CREATE INDEX IF NOT EXISTS idx_ms_project_task_mappings_nidus_task_id ON ms_project_task_mappings(nidus_task_id);

-- =====================================================================================
-- Row Level Security (RLS) Policies
-- =====================================================================================

-- Enable RLS on all tables
ALTER TABLE ms_project_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ms_project_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ms_project_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ms_project_task_mappings ENABLE ROW LEVEL SECURITY;

-- MS Project Imports policies
CREATE POLICY ms_project_imports_own_select ON ms_project_imports
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() AND is_deleted = false);

CREATE POLICY ms_project_imports_own_insert ON ms_project_imports
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY ms_project_imports_own_update ON ms_project_imports
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid() AND is_deleted = false);

-- MS Project Exports policies
CREATE POLICY ms_project_exports_own_select ON ms_project_exports
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() AND is_deleted = false);

CREATE POLICY ms_project_exports_own_insert ON ms_project_exports
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY ms_project_exports_own_update ON ms_project_exports
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid() AND is_deleted = false);

-- Field Mappings policies
CREATE POLICY ms_project_field_mappings_select ON ms_project_field_mappings
    FOR SELECT
    TO authenticated
    USING (
        (user_id = auth.uid() OR user_id IS NULL) AND is_deleted = false
    );

CREATE POLICY ms_project_field_mappings_own_insert ON ms_project_field_mappings
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY ms_project_field_mappings_own_update ON ms_project_field_mappings
    FOR UPDATE
    TO authenticated
    USING ((user_id = auth.uid() OR user_id IS NULL) AND is_deleted = false);

-- Task Mappings policies
CREATE POLICY ms_project_task_mappings_select ON ms_project_task_mappings
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM ms_project_imports mpi
            WHERE mpi.id = ms_project_task_mappings.import_id
            AND mpi.user_id = auth.uid()
        )
    );

-- =====================================================================================
-- Seed Data: Default Field Mappings
-- =====================================================================================
INSERT INTO ms_project_field_mappings (mapping_name, mapping_type, source_field, target_field, is_default, is_active)
VALUES
    -- Task field mappings
    ('Default Import - Task Name', 'import', 'Name', 'task_name', true, true),
    ('Default Import - Start Date', 'import', 'Start', 'start_date', true, true),
    ('Default Import - Finish Date', 'import', 'Finish', 'end_date', true, true),
    ('Default Import - Duration', 'import', 'Duration', 'duration', true, true),
    ('Default Import - Work', 'import', 'Work', 'effort_hours', true, true),
    ('Default Import - Percent Complete', 'import', 'PercentComplete', 'progress_percentage', true, true),
    ('Default Import - Priority', 'import', 'Priority', 'priority', true, true),
    ('Default Import - Notes', 'import', 'Notes', 'description', true, true),
    ('Default Import - Milestone', 'import', 'Milestone', 'is_milestone', true, true),

    -- Resource field mappings
    ('Default Import - Resource Name', 'import', 'Name', 'resource_name', true, true),
    ('Default Import - Resource Type', 'import', 'Type', 'resource_type', true, true),
    ('Default Import - Max Units', 'import', 'MaxUnits', 'availability_percentage', true, true),
    ('Default Import - Standard Rate', 'import', 'StandardRate', 'hourly_rate', true, true),

    -- Export mappings
    ('Default Export - Task Name', 'export', 'task_name', 'Name', true, true),
    ('Default Export - Start Date', 'export', 'start_date', 'Start', true, true),
    ('Default Export - Finish Date', 'export', 'end_date', 'Finish', true, true),
    ('Default Export - Duration', 'export', 'duration', 'Duration', true, true),
    ('Default Export - Progress', 'export', 'progress_percentage', 'PercentComplete', true, true),
    ('Default Export - Priority', 'export', 'priority', 'Priority', true, true),
    ('Default Export - Description', 'export', 'description', 'Notes', true, true)
ON CONFLICT (mapping_name, source_field, target_field) DO NOTHING;

-- =====================================================================================
-- Register tables in database_tables registry
-- =====================================================================================
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('ms_project_imports', 'Microsoft Project import history and status tracking', false, true),
    ('ms_project_exports', 'Microsoft Project export history and status tracking', false, true),
    ('ms_project_field_mappings', 'Field mapping configurations for MS Project import/export', false, true),
    ('ms_project_task_mappings', 'Mapping between MS Project tasks and Nidus tasks', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    updated_at = NOW();

-- =====================================================================================
-- Comments for Documentation
-- =====================================================================================
COMMENT ON TABLE ms_project_imports IS 'Track Microsoft Project file imports with status and statistics';
COMMENT ON TABLE ms_project_exports IS 'Track Microsoft Project file exports with status and statistics';
COMMENT ON TABLE ms_project_field_mappings IS 'Configure field mappings between MS Project and Nidus';
COMMENT ON TABLE ms_project_task_mappings IS 'Track mapping between MS Project tasks and Nidus tasks for sync';

COMMENT ON COLUMN ms_project_field_mappings.transformation_rule IS 'JSON rules for transforming data during import/export';
COMMENT ON COLUMN ms_project_imports.import_options IS 'Configuration options used during import (e.g., skip dependencies, merge mode)';
COMMENT ON COLUMN ms_project_exports.export_options IS 'Configuration options used during export (e.g., include resources, date format)';

-- =====================================================================================
-- End of v44_ms_project_integration.sql
-- =====================================================================================

-- ================================================
-- File: v146_document_governance_tables.sql
-- Description: Document Governance core tables for PMO compliance tracking
-- Version: 1.0
-- Date: 2026-01-08
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v145 must be run first (all core tables must exist)
-- - projects table must exist
-- - programmes table must exist (v37)
-- - users table must exist

-- Purpose:
-- Creates document governance tables for PMO:
-- 1. document_governance_stages - Lookup table for project stages
-- 2. document_types - Document type definitions with mandatory flag
-- 3. project_documents - Document metadata with file storage fields
-- 4. document_versions - Version history for uploaded files
-- 5. programme_documents - Programme-level documents (optional)

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- TABLE 1: document_governance_stages
-- Description: Lookup table for project lifecycle stages
-- Category: governance
-- ================================================

CREATE TABLE IF NOT EXISTS document_governance_stages (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Stage Information
    stage_code VARCHAR(50) UNIQUE NOT NULL, -- 'pre_project', 'initiation', 'planning', 'delivery', 'stage_boundary', 'closure', 'post_project'
    stage_name VARCHAR(200) NOT NULL,
    stage_description TEXT,
    stage_order INTEGER NOT NULL UNIQUE, -- 1-7 for sorting

    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,

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
CREATE INDEX IF NOT EXISTS idx_document_governance_stages_code ON document_governance_stages(stage_code) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_document_governance_stages_order ON document_governance_stages(stage_order) WHERE is_deleted = FALSE;

-- Comments
COMMENT ON TABLE document_governance_stages IS 'Lookup table for project lifecycle stages used in document governance';
COMMENT ON COLUMN document_governance_stages.stage_code IS 'Unique code for stage: pre_project, initiation, planning, delivery, stage_boundary, closure, post_project';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('document_governance_stages', 'Lookup table for project lifecycle stages used in document governance', false, true, 'governance')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 2: document_types
-- Description: Document type definitions with mandatory flag per stage
-- Category: governance
-- ================================================

CREATE TABLE IF NOT EXISTS document_types (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Document Type Information
    name VARCHAR(255) NOT NULL, -- 'Project Initiation Document (PID)', 'Business Case', etc.
    stage_code VARCHAR(50) NOT NULL REFERENCES document_governance_stages(stage_code),
    is_mandatory BOOLEAN DEFAULT FALSE, -- TRUE = mandatory, FALSE = optional

    -- Metadata
    description TEXT,
    category VARCHAR(100), -- 'governance', 'planning', 'delivery', 'quality', 'closure', 'benefits'
    template_url TEXT, -- Optional: link to document template
    expected_format VARCHAR(100), -- Suggested file format (e.g., 'PDF', 'DOCX', 'XLSX')

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    -- Constraints
    CONSTRAINT chk_document_types_category CHECK (category IN ('governance', 'planning', 'delivery', 'quality', 'closure', 'benefits', 'compliance', 'risk'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_document_types_stage ON document_types(stage_code) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_document_types_mandatory ON document_types(is_mandatory) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_document_types_stage_mandatory ON document_types(stage_code, is_mandatory) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_document_types_category ON document_types(category) WHERE is_deleted = FALSE;

-- Comments
COMMENT ON TABLE document_types IS 'Document type definitions with mandatory flag for each project stage';
COMMENT ON COLUMN document_types.is_mandatory IS 'TRUE if document is mandatory for stage gate approval, FALSE if optional';
COMMENT ON COLUMN document_types.category IS 'Document category: governance, planning, delivery, quality, closure, benefits, compliance, risk';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('document_types', 'Document type definitions with mandatory flag for each project stage', false, true, 'governance')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 3: project_documents
-- Description: Project document metadata with file storage integration
-- Category: governance
-- ================================================

CREATE TABLE IF NOT EXISTS project_documents (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign Keys
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    document_type_id UUID NOT NULL REFERENCES document_types(id),

    -- Document Status
    status VARCHAR(50) DEFAULT 'not_started', -- 'not_started', 'draft', 'submitted', 'approved', 'rejected'

    -- Ownership
    owner_user_id UUID REFERENCES users(id), -- Document owner (usually PM)
    approver_user_id UUID REFERENCES users(id), -- Document approver (usually Executive/Board)

    -- Approval Tracking
    approval_date TIMESTAMP,
    submission_date TIMESTAMP,
    rejection_date TIMESTAMP,
    rejection_reason TEXT,
    approval_comments TEXT,

    -- File Storage Fields (Supabase Storage)
    storage_type VARCHAR(20) DEFAULT 'supabase', -- 'supabase', 'external_link'
    file_path TEXT, -- Path in Supabase Storage: {project_id}/{document_type_id}/{version}/filename.ext
    file_name VARCHAR(255), -- Original filename
    file_size BIGINT, -- File size in bytes
    file_type VARCHAR(100), -- MIME type (e.g., 'application/pdf')
    file_extension VARCHAR(10), -- File extension (e.g., 'pdf', 'docx')
    external_url TEXT, -- External link (if storage_type = 'external_link')
    current_version INTEGER DEFAULT 1, -- Current version number

    -- Metadata
    document_version_label VARCHAR(50), -- Optional version label (e.g., 'v1.0', 'Final')
    comments TEXT, -- PMO comments
    notes TEXT, -- Internal notes

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    -- Constraints
    CONSTRAINT chk_project_documents_status CHECK (status IN ('not_started', 'draft', 'submitted', 'approved', 'rejected')),
    CONSTRAINT chk_project_documents_storage_type CHECK (storage_type IN ('supabase', 'external_link')),
    CONSTRAINT chk_project_documents_file_size CHECK (file_size IS NULL OR file_size <= 52428800), -- 50MB max
    CONSTRAINT uq_project_document_type UNIQUE (project_id, document_type_id, is_deleted) -- One document per type per project
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_documents_project ON project_documents(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_documents_type ON project_documents(document_type_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_documents_status ON project_documents(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_documents_owner ON project_documents(owner_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_documents_approver ON project_documents(approver_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_documents_storage_type ON project_documents(storage_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_documents_file_path ON project_documents(file_path) WHERE is_deleted = FALSE AND file_path IS NOT NULL;

-- Comments
COMMENT ON TABLE project_documents IS 'Project document metadata with file storage integration (Supabase Storage or external links)';
COMMENT ON COLUMN project_documents.storage_type IS 'Storage location: supabase (Supabase Storage bucket) or external_link (SharePoint, Google Drive, etc.)';
COMMENT ON COLUMN project_documents.file_path IS 'Full path in Supabase Storage bucket: {project_id}/{document_type_id}/{version}/{uuid}_{filename}';
COMMENT ON COLUMN project_documents.current_version IS 'Current active version number (increments with each upload)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('project_documents', 'Project document metadata with file storage integration', false, true, 'governance')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 4: document_versions
-- Description: Version history for uploaded document files
-- Category: governance
-- ================================================

CREATE TABLE IF NOT EXISTS document_versions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign Keys
    project_document_id UUID NOT NULL REFERENCES project_documents(id) ON DELETE CASCADE,

    -- Version Information
    version_number INTEGER NOT NULL, -- Version sequence (1, 2, 3, ...)
    version_label VARCHAR(50), -- Optional label (e.g., 'Draft', 'v1.0', 'Final')

    -- File Storage Fields
    file_path TEXT NOT NULL, -- Path in Supabase Storage
    file_name VARCHAR(255) NOT NULL, -- Original filename
    file_size BIGINT NOT NULL, -- File size in bytes
    file_type VARCHAR(100), -- MIME type
    file_extension VARCHAR(10), -- File extension
    file_hash VARCHAR(64), -- SHA256 hash for duplicate detection

    -- Version Metadata
    upload_date TIMESTAMP DEFAULT NOW(),
    uploaded_by UUID REFERENCES users(id),
    change_summary TEXT, -- Summary of changes in this version
    is_current BOOLEAN DEFAULT FALSE, -- TRUE for current/active version

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    -- Constraints
    CONSTRAINT chk_document_versions_file_size CHECK (file_size <= 52428800), -- 50MB max
    CONSTRAINT uq_document_version_number UNIQUE (project_document_id, version_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_document_versions_project_document ON document_versions(project_document_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_document_versions_is_current ON document_versions(is_current) WHERE is_deleted = FALSE AND is_current = TRUE;
CREATE INDEX IF NOT EXISTS idx_document_versions_uploaded_by ON document_versions(uploaded_by) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_document_versions_file_hash ON document_versions(file_hash) WHERE is_deleted = FALSE;

-- Comments
COMMENT ON TABLE document_versions IS 'Version history for uploaded document files with full file metadata';
COMMENT ON COLUMN document_versions.is_current IS 'TRUE indicates this is the current/active version of the document';
COMMENT ON COLUMN document_versions.file_hash IS 'SHA256 hash of file content for duplicate detection and integrity checking';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('document_versions', 'Version history for uploaded document files', false, true, 'governance')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 5: programme_documents
-- Description: Programme-level documents (optional extension)
-- Category: governance
-- ================================================

CREATE TABLE IF NOT EXISTS programme_documents (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign Keys
    programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
    document_type_id UUID NOT NULL REFERENCES document_types(id),

    -- Document Status
    status VARCHAR(50) DEFAULT 'not_started',

    -- Ownership
    owner_user_id UUID REFERENCES users(id),
    approver_user_id UUID REFERENCES users(id),

    -- Approval Tracking
    approval_date TIMESTAMP,
    submission_date TIMESTAMP,
    rejection_date TIMESTAMP,
    rejection_reason TEXT,
    approval_comments TEXT,

    -- File Storage Fields
    storage_type VARCHAR(20) DEFAULT 'supabase',
    file_path TEXT,
    file_name VARCHAR(255),
    file_size BIGINT,
    file_type VARCHAR(100),
    file_extension VARCHAR(10),
    external_url TEXT,
    current_version INTEGER DEFAULT 1,

    -- Metadata
    document_version_label VARCHAR(50),
    comments TEXT,
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
    CONSTRAINT chk_programme_documents_status CHECK (status IN ('not_started', 'draft', 'submitted', 'approved', 'rejected')),
    CONSTRAINT chk_programme_documents_storage_type CHECK (storage_type IN ('supabase', 'external_link')),
    CONSTRAINT chk_programme_documents_file_size CHECK (file_size IS NULL OR file_size <= 52428800),
    CONSTRAINT uq_programme_document_type UNIQUE (programme_id, document_type_id, is_deleted)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_programme_documents_programme ON programme_documents(programme_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_programme_documents_type ON programme_documents(document_type_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_programme_documents_status ON programme_documents(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_programme_documents_owner ON programme_documents(owner_user_id) WHERE is_deleted = FALSE;

-- Comments
COMMENT ON TABLE programme_documents IS 'Programme-level documents for multi-project governance';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('programme_documents', 'Programme-level documents for multi-project governance', false, true, 'governance')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TRIGGERS
-- ================================================

-- Trigger for document_governance_stages
DROP TRIGGER IF EXISTS trg_document_governance_stages_before_insert ON document_governance_stages;
CREATE TRIGGER trg_document_governance_stages_before_insert
    BEFORE INSERT ON document_governance_stages
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_document_governance_stages_before_update ON document_governance_stages;
CREATE TRIGGER trg_document_governance_stages_before_update
    BEFORE UPDATE ON document_governance_stages
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Trigger for document_types
DROP TRIGGER IF EXISTS trg_document_types_before_insert ON document_types;
CREATE TRIGGER trg_document_types_before_insert
    BEFORE INSERT ON document_types
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_document_types_before_update ON document_types;
CREATE TRIGGER trg_document_types_before_update
    BEFORE UPDATE ON document_types
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Trigger for project_documents
DROP TRIGGER IF EXISTS trg_project_documents_before_insert ON project_documents;
CREATE TRIGGER trg_project_documents_before_insert
    BEFORE INSERT ON project_documents
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_project_documents_before_update ON project_documents;
CREATE TRIGGER trg_project_documents_before_update
    BEFORE UPDATE ON project_documents
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Trigger for document_versions
DROP TRIGGER IF EXISTS trg_document_versions_before_insert ON document_versions;
CREATE TRIGGER trg_document_versions_before_insert
    BEFORE INSERT ON document_versions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_document_versions_before_update ON document_versions;
CREATE TRIGGER trg_document_versions_before_update
    BEFORE UPDATE ON document_versions
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Trigger for programme_documents
DROP TRIGGER IF EXISTS trg_programme_documents_before_insert ON programme_documents;
CREATE TRIGGER trg_programme_documents_before_insert
    BEFORE INSERT ON programme_documents
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_programme_documents_before_update ON programme_documents;
CREATE TRIGGER trg_programme_documents_before_update
    BEFORE UPDATE ON programme_documents
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_tables_count INTEGER;
BEGIN
    -- Count Document Governance tables
    SELECT COUNT(*)
    INTO v_tables_count
    FROM database_tables
    WHERE table_category = 'governance'
      AND table_name IN ('document_governance_stages', 'document_types', 'project_documents', 'document_versions', 'programme_documents')
      AND is_deleted = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Document Governance Tables Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Tables Created: %', v_tables_count;
    RAISE NOTICE 'Tables: document_governance_stages, document_types, project_documents, document_versions, programme_documents';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v146_document_governance_tables.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================

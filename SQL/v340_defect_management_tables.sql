-- ============================================================================
-- Defect Management Tables
-- Version: v340
-- Description: Creates defects, defect_comments, defect_attachments,
--              defect_history tables; adds defect_id FK to test_case_executions
-- Date: 2026-03-27
-- ============================================================================
--
-- Purpose:
-- Implements a full defect/bug tracking module. Defects can be:
--   a) Auto-created by trigger when a test case execution is marked as 'failed'
--   b) Manually raised by any project member
--
-- Also adds the FK constraint from test_case_executions.defect_id → defects(id)
-- which could not be added in v339 since defects did not yet exist.
--
-- Prerequisites:
-- - v338_test_management_core_tables.sql (test_cases table)
-- - v339_test_runs_tables.sql (test_case_executions table)
-- - projects, users tables must exist
--
-- ============================================================================

-- ============================================================================
-- SECTION 1: DEFECT REFERENCE SEQUENCE
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS defect_ref_seq
    START WITH 1
    INCREMENT BY 1
    NO MAXVALUE
    CACHE 1;

-- ============================================================================
-- SECTION 2: DEFECTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS defects (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    test_case_id UUID REFERENCES test_cases(id) ON DELETE SET NULL,         -- nullable for manual defects
    execution_id UUID REFERENCES test_case_executions(id) ON DELETE SET NULL, -- nullable for manual defects

    -- Defect Identification
    defect_ref  VARCHAR(50) UNIQUE,  -- Auto-generated: DEF-YYYYMMDD-NNNN
    title       VARCHAR(500) NOT NULL,
    description TEXT,

    -- Classification
    severity VARCHAR(50) DEFAULT 'medium'
        CHECK (severity IN ('critical','high','medium','low','trivial')),
    priority VARCHAR(50) DEFAULT 'medium'
        CHECK (priority IN ('critical','high','medium','low')),
    defect_type VARCHAR(50) DEFAULT 'functional'
        CHECK (defect_type IN ('functional','ui','performance','security','data','integration','regression','environment','other')),

    -- Status Lifecycle
    status VARCHAR(50) DEFAULT 'new'
        CHECK (status IN ('new','open','in_progress','resolved','closed','reopened','deferred','duplicate')),

    -- Context
    environment      VARCHAR(100),
    browser_os       VARCHAR(255),
    build_version    VARCHAR(100),
    module_area      VARCHAR(255),

    -- Reproduction
    steps_to_reproduce TEXT,
    expected_behavior  TEXT,
    actual_behavior    TEXT,
    test_data_used     TEXT,

    -- Assignment
    assigned_to  UUID REFERENCES users(id) ON DELETE SET NULL,
    reported_by  UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Resolution
    resolved_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution        TEXT,
    resolution_type   VARCHAR(50)
        CHECK (resolution_type IS NULL OR resolution_type IN (
            'fixed','wont_fix','duplicate','cannot_reproduce','by_design','deferred','not_a_defect'
        )),
    resolved_at    TIMESTAMPTZ,
    due_date       DATE,
    reopen_count   INTEGER DEFAULT 0,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_defects_project_id    ON defects(project_id);
CREATE INDEX IF NOT EXISTS idx_defects_test_case_id  ON defects(test_case_id);
CREATE INDEX IF NOT EXISTS idx_defects_execution_id  ON defects(execution_id);
CREATE INDEX IF NOT EXISTS idx_defects_defect_ref    ON defects(defect_ref);
CREATE INDEX IF NOT EXISTS idx_defects_status        ON defects(status);
CREATE INDEX IF NOT EXISTS idx_defects_severity      ON defects(severity);
CREATE INDEX IF NOT EXISTS idx_defects_priority      ON defects(priority);
CREATE INDEX IF NOT EXISTS idx_defects_assigned_to   ON defects(assigned_to);
CREATE INDEX IF NOT EXISTS idx_defects_is_deleted    ON defects(is_deleted) WHERE is_deleted = FALSE;

-- ============================================================================
-- SECTION 2a: DEFECT_REF AUTO-GENERATION TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_generate_defect_ref()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.defect_ref IS NULL OR NEW.defect_ref = '' THEN
        NEW.defect_ref := 'DEF-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                          LPAD(NEXTVAL('defect_ref_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_defects_generate_ref ON defects;
CREATE TRIGGER trg_defects_generate_ref
    BEFORE INSERT ON defects
    FOR EACH ROW EXECUTE FUNCTION fn_generate_defect_ref();

DROP TRIGGER IF EXISTS trg_defects_before_insert ON defects;
CREATE TRIGGER trg_defects_before_insert
    BEFORE INSERT ON defects
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_defects_before_update ON defects;
CREATE TRIGGER trg_defects_before_update
    BEFORE UPDATE ON defects
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- ============================================================================
-- SECTION 3: DEFECT_COMMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS defect_comments (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    defect_id UUID NOT NULL REFERENCES defects(id) ON DELETE CASCADE,

    -- Content
    comment     TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,  -- Internal notes not visible to all roles

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_defect_comments_defect_id   ON defect_comments(defect_id);
CREATE INDEX IF NOT EXISTS idx_defect_comments_created_by  ON defect_comments(created_by);
CREATE INDEX IF NOT EXISTS idx_defect_comments_is_deleted  ON defect_comments(is_deleted) WHERE is_deleted = FALSE;

DROP TRIGGER IF EXISTS trg_defect_comments_before_insert ON defect_comments;
CREATE TRIGGER trg_defect_comments_before_insert
    BEFORE INSERT ON defect_comments
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_defect_comments_before_update ON defect_comments;
CREATE TRIGGER trg_defect_comments_before_update
    BEFORE UPDATE ON defect_comments
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- ============================================================================
-- SECTION 4: DEFECT_ATTACHMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS defect_attachments (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    defect_id UUID NOT NULL REFERENCES defects(id) ON DELETE CASCADE,

    -- File Metadata
    file_name     VARCHAR(500) NOT NULL,
    file_url      TEXT NOT NULL,          -- Public or signed Supabase Storage URL
    file_path     TEXT NOT NULL,          -- Internal Supabase Storage path
    file_type     VARCHAR(100),           -- MIME type
    file_size     BIGINT,                 -- Bytes
    is_screenshot BOOLEAN DEFAULT FALSE,  -- True when uploaded as a screenshot

    -- Audit
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_defect_attachments_defect_id    ON defect_attachments(defect_id);
CREATE INDEX IF NOT EXISTS idx_defect_attachments_uploaded_by  ON defect_attachments(uploaded_by);

-- ============================================================================
-- SECTION 5: DEFECT_HISTORY TABLE (Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS defect_history (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    defect_id UUID NOT NULL REFERENCES defects(id) ON DELETE CASCADE,

    -- Change Record
    field_changed VARCHAR(100) NOT NULL,
    old_value     TEXT,
    new_value     TEXT,
    change_note   TEXT,   -- Optional context for the change

    -- Audit
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_defect_history_defect_id   ON defect_history(defect_id);
CREATE INDEX IF NOT EXISTS idx_defect_history_changed_by  ON defect_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_defect_history_changed_at  ON defect_history(changed_at);

-- ============================================================================
-- SECTION 6: DEFECT AUDIT TRIGGER
-- Logs field-level changes into defect_history on UPDATE
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_log_defect_history()
RETURNS TRIGGER AS $$
DECLARE
    v_changed_by UUID;
BEGIN
    -- Get the user who made the change
    v_changed_by := NEW.updated_by;

    -- Log each changed field
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO defect_history (defect_id, field_changed, old_value, new_value, changed_by)
        VALUES (NEW.id, 'status', OLD.status, NEW.status, v_changed_by);
    END IF;

    IF OLD.severity IS DISTINCT FROM NEW.severity THEN
        INSERT INTO defect_history (defect_id, field_changed, old_value, new_value, changed_by)
        VALUES (NEW.id, 'severity', OLD.severity, NEW.severity, v_changed_by);
    END IF;

    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
        INSERT INTO defect_history (defect_id, field_changed, old_value, new_value, changed_by)
        VALUES (NEW.id, 'priority', OLD.priority, NEW.priority, v_changed_by);
    END IF;

    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
        INSERT INTO defect_history (defect_id, field_changed, old_value, new_value, changed_by)
        VALUES (NEW.id, 'assigned_to', OLD.assigned_to::TEXT, NEW.assigned_to::TEXT, v_changed_by);
    END IF;

    IF OLD.title IS DISTINCT FROM NEW.title THEN
        INSERT INTO defect_history (defect_id, field_changed, old_value, new_value, changed_by)
        VALUES (NEW.id, 'title', OLD.title, NEW.title, v_changed_by);
    END IF;

    IF OLD.resolution_type IS DISTINCT FROM NEW.resolution_type THEN
        INSERT INTO defect_history (defect_id, field_changed, old_value, new_value, changed_by)
        VALUES (NEW.id, 'resolution_type', OLD.resolution_type, NEW.resolution_type, v_changed_by);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_defects_audit ON defects;
CREATE TRIGGER trg_defects_audit
    AFTER UPDATE ON defects
    FOR EACH ROW EXECUTE FUNCTION fn_log_defect_history();

-- Reopen count increment trigger
CREATE OR REPLACE FUNCTION fn_increment_reopen_count()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IN ('resolved','closed') AND NEW.status = 'reopened' THEN
        NEW.reopen_count := COALESCE(OLD.reopen_count, 0) + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_defects_reopen_count ON defects;
CREATE TRIGGER trg_defects_reopen_count
    BEFORE UPDATE OF status ON defects
    FOR EACH ROW EXECUTE FUNCTION fn_increment_reopen_count();

-- ============================================================================
-- SECTION 7: ADD FK CONSTRAINT TO test_case_executions.defect_id
-- Now that defects table exists we can add the FK
-- ============================================================================

ALTER TABLE test_case_executions
    DROP CONSTRAINT IF EXISTS fk_tce_defect_id;

ALTER TABLE test_case_executions
    ADD CONSTRAINT fk_tce_defect_id
    FOREIGN KEY (defect_id)
    REFERENCES defects(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tce_defect_id ON test_case_executions(defect_id);

-- ============================================================================
-- SECTION 8: DATABASE TABLE REGISTRY
-- ============================================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('defects',             'Defect/bug records linked to test case failures or raised manually', false, true),
    ('defect_comments',     'Comments and notes added to defect records by team members', false, true),
    ('defect_attachments',  'File attachments and screenshots uploaded against defect records', false, true),
    ('defect_history',      'Audit trail of all field-level changes made to defect records', true,  true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table   = EXCLUDED.is_system_table,
    updated_at        = NOW();

-- ============================================================================
-- Daily Log Implementation - Database Tables and Functions
-- Version: v166
-- Description: Complete database schema for Daily Log functionality
-- Date: 2026-01-19
-- ============================================================================
--
-- Purpose:
-- Creates comprehensive database schema for Daily Log functionality.
-- Daily Log is the Project Manager's personal diary/notebook for recording
-- informal items throughout the project lifecycle.
--
-- Prerequisites:
-- - v01 through v07 must be run first (core tables and trigger functions)
-- - projects table must exist (v04_project_core_tables.sql)
-- - users table must exist (v03_user_access_tables.sql)
-- - programmes table must exist (if programme_id is used)
--
-- Key Design:
-- - One daily log per project (UNIQUE constraint on project_id)
-- - Created automatically when project is initiated
-- - Entries are chronologically ordered
-- - Supports escalation to issues/risks
--
-- ============================================================================
-- SECTION 1: DROP EXISTING TABLES (if upgrading)
-- ============================================================================

-- Drop child tables first (if they exist)
DROP TABLE IF EXISTS daily_log_reminders CASCADE;
DROP TABLE IF EXISTS daily_log_comments CASCADE;
DROP TABLE IF EXISTS daily_log_attachments CASCADE;
DROP TABLE IF EXISTS daily_log_entries CASCADE;
DROP TABLE IF EXISTS daily_logs CASCADE;

-- ============================================================================
-- SECTION 2: MAIN TABLE - daily_logs
-- ============================================================================

CREATE TABLE daily_logs (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship (One log per project)
    project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL,

    -- Log Identification
    log_reference VARCHAR(50) UNIQUE NOT NULL, -- e.g., DL-2026-001

    -- Ownership
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    -- Visibility Settings
    visibility VARCHAR(50) DEFAULT 'team' CHECK (visibility IN ('private', 'team', 'stakeholders', 'public')),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_logs_project_id ON daily_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_programme_id ON daily_logs(programme_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_log_reference ON daily_logs(log_reference);
CREATE INDEX IF NOT EXISTS idx_daily_logs_created_by ON daily_logs(created_by);
CREATE INDEX IF NOT EXISTS idx_daily_logs_is_active ON daily_logs(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_daily_logs_is_deleted ON daily_logs(is_deleted) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_daily_logs_before_insert ON daily_logs;
CREATE TRIGGER trg_daily_logs_before_insert
    BEFORE INSERT ON daily_logs
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_daily_logs_before_update ON daily_logs;
CREATE TRIGGER trg_daily_logs_before_update
    BEFORE UPDATE ON daily_logs
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE daily_logs IS 'Daily Log header - one log per project for PM diary entries';
COMMENT ON COLUMN daily_logs.log_reference IS 'Unique reference number (e.g., DL-2026-001)';
COMMENT ON COLUMN daily_logs.visibility IS 'Who can view the log: private (PM only), team, stakeholders, public';
COMMENT ON COLUMN daily_logs.created_by IS 'Project Manager who owns the log';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('daily_logs', 'Daily Log header - one log per project for PM diary entries', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 3: daily_log_entries
-- ============================================================================

CREATE TABLE daily_log_entries (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    daily_log_id UUID NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,

    -- Entry Identification
    entry_number INTEGER NOT NULL, -- Sequential number within the log

    -- Entry Details
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    entry_type VARCHAR(50) NOT NULL CHECK (entry_type IN ('problem', 'action', 'event', 'comment', 'observation', 'decision', 'other')),
    description TEXT NOT NULL,

    -- Responsibility
    person_responsible_id UUID REFERENCES users(id) ON DELETE SET NULL,
    person_responsible_name VARCHAR(200), -- For external people

    -- Target Date
    target_date DATE,

    -- Results/Outcome
    results TEXT, -- Outcome/resolution

    -- Status
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled', 'escalated')),

    -- Priority
    priority VARCHAR(50) CHECK (priority IN ('low', 'medium', 'high')),

    -- Escalation
    escalated_to VARCHAR(50) CHECK (escalated_to IN ('issue', 'risk', 'change_request')),
    escalated_item_id UUID, -- ID of the issue/risk/change if escalated

    -- Categorization
    tags TEXT[], -- Array of tags for categorization

    -- Visibility
    is_private BOOLEAN DEFAULT FALSE, -- PM-only visibility

    -- Completion Tracking
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Audit Fields
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Constraints
ALTER TABLE daily_log_entries ADD CONSTRAINT unique_entry_number_per_log UNIQUE (daily_log_id, entry_number);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_log_entries_daily_log_id ON daily_log_entries(daily_log_id);
CREATE INDEX IF NOT EXISTS idx_daily_log_entries_entry_date ON daily_log_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_log_entries_status ON daily_log_entries(status);
CREATE INDEX IF NOT EXISTS idx_daily_log_entries_target_date ON daily_log_entries(target_date);
CREATE INDEX IF NOT EXISTS idx_daily_log_entries_person_responsible_id ON daily_log_entries(person_responsible_id);
CREATE INDEX IF NOT EXISTS idx_daily_log_entries_entry_type ON daily_log_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_daily_log_entries_escalated_item_id ON daily_log_entries(escalated_item_id);
CREATE INDEX IF NOT EXISTS idx_daily_log_entries_is_deleted ON daily_log_entries(is_deleted) WHERE is_deleted = FALSE;
-- Full-text search on description
CREATE INDEX IF NOT EXISTS idx_daily_log_entries_description_search ON daily_log_entries USING gin(to_tsvector('english', description));
-- GIN index for tags array
CREATE INDEX IF NOT EXISTS idx_daily_log_entries_tags ON daily_log_entries USING gin(tags);

-- Triggers
DROP TRIGGER IF EXISTS trg_daily_log_entries_before_insert ON daily_log_entries;
CREATE TRIGGER trg_daily_log_entries_before_insert
    BEFORE INSERT ON daily_log_entries
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_daily_log_entries_before_update ON daily_log_entries;
CREATE TRIGGER trg_daily_log_entries_before_update
    BEFORE UPDATE ON daily_log_entries
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE daily_log_entries IS 'Individual entries in a daily log';
COMMENT ON COLUMN daily_log_entries.entry_number IS 'Sequential number within the log (1, 2, 3, ...)';
COMMENT ON COLUMN daily_log_entries.entry_type IS 'Type of entry: problem, action, event, comment, observation, decision, other';
COMMENT ON COLUMN daily_log_entries.escalated_item_id IS 'ID of the issue/risk/change if this entry was escalated';
COMMENT ON COLUMN daily_log_entries.is_private IS 'If true, only PM can see this entry regardless of log visibility';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('daily_log_entries', 'Individual entries in a daily log', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 4: daily_log_attachments
-- ============================================================================

CREATE TABLE daily_log_attachments (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    entry_id UUID NOT NULL REFERENCES daily_log_entries(id) ON DELETE CASCADE,

    -- File Information
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER, -- Size in bytes

    -- Upload Tracking
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),

    -- Audit Fields
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_log_attachments_entry_id ON daily_log_attachments(entry_id);
CREATE INDEX IF NOT EXISTS idx_daily_log_attachments_uploaded_by ON daily_log_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_daily_log_attachments_is_deleted ON daily_log_attachments(is_deleted) WHERE is_deleted = FALSE;

-- Comments
COMMENT ON TABLE daily_log_attachments IS 'Supporting documents/files attached to daily log entries';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('daily_log_attachments', 'Supporting documents/files attached to daily log entries', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 5: daily_log_comments
-- ============================================================================

CREATE TABLE daily_log_comments (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    entry_id UUID NOT NULL REFERENCES daily_log_entries(id) ON DELETE CASCADE,

    -- Comment Content
    comment_text TEXT NOT NULL,

    -- Author
    commented_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_log_comments_entry_id ON daily_log_comments(entry_id);
CREATE INDEX IF NOT EXISTS idx_daily_log_comments_commented_by ON daily_log_comments(commented_by);
CREATE INDEX IF NOT EXISTS idx_daily_log_comments_created_at ON daily_log_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_log_comments_is_deleted ON daily_log_comments(is_deleted) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_daily_log_comments_before_insert ON daily_log_comments;
CREATE TRIGGER trg_daily_log_comments_before_insert
    BEFORE INSERT ON daily_log_comments
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_daily_log_comments_before_update ON daily_log_comments;
CREATE TRIGGER trg_daily_log_comments_before_update
    BEFORE UPDATE ON daily_log_comments
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE daily_log_comments IS 'Comments on daily log entries';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('daily_log_comments', 'Comments on daily log entries', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 6: daily_log_reminders
-- ============================================================================

CREATE TABLE daily_log_reminders (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    entry_id UUID NOT NULL REFERENCES daily_log_entries(id) ON DELETE CASCADE,

    -- Reminder Details
    reminder_date DATE NOT NULL,
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_type VARCHAR(50) DEFAULT 'both' CHECK (reminder_type IN ('email', 'notification', 'both')),

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_log_reminders_entry_id ON daily_log_reminders(entry_id);
CREATE INDEX IF NOT EXISTS idx_daily_log_reminders_reminder_date ON daily_log_reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_daily_log_reminders_reminder_sent ON daily_log_reminders(reminder_sent) WHERE reminder_sent = FALSE;

-- Comments
COMMENT ON TABLE daily_log_reminders IS 'Target date reminders for daily log entries';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('daily_log_reminders', 'Target date reminders for daily log entries', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 7: FUNCTIONS
-- ============================================================================

-- ============================================================================
-- FUNCTION: generate_log_reference()
-- Description: Generates unique daily log reference number (DL-YYYY-NNN)
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_log_reference()
RETURNS VARCHAR AS $$
DECLARE
    v_year INTEGER;
    v_sequence INTEGER;
    v_reference VARCHAR(50);
BEGIN
    -- Get current year
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);

    -- Get next sequence number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(log_reference FROM 8) AS INTEGER)), 0) + 1
    INTO v_sequence
    FROM daily_logs
    WHERE log_reference LIKE 'DL-' || v_year || '-%';

    -- Format reference: DL-YYYY-NNN
    v_reference := 'DL-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0');

    RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_log_reference() IS 'Generates unique daily log reference number (DL-YYYY-NNN)';

-- ============================================================================
-- FUNCTION: generate_entry_number(p_daily_log_id UUID)
-- Description: Generates sequential entry number within a log
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_entry_number(p_daily_log_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_next_number INTEGER;
BEGIN
    -- Get next entry number
    SELECT COALESCE(MAX(entry_number), 0) + 1
    INTO v_next_number
    FROM daily_log_entries
    WHERE daily_log_id = p_daily_log_id
      AND is_deleted = FALSE;

    RETURN v_next_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_entry_number(UUID) IS 'Generates sequential entry number within a daily log';

-- ============================================================================
-- FUNCTION: create_daily_log_for_project(p_project_id UUID, p_user_id UUID)
-- Description: Creates daily log when project is initiated
-- ============================================================================

CREATE OR REPLACE FUNCTION create_daily_log_for_project(p_project_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_reference VARCHAR(50);
    v_programme_id UUID;
BEGIN
    -- Check if log already exists
    SELECT id INTO v_log_id
    FROM daily_logs
    WHERE project_id = p_project_id
      AND is_deleted = FALSE;

    IF v_log_id IS NOT NULL THEN
        RETURN v_log_id; -- Log already exists
    END IF;

    -- Get programme_id from project if available
    SELECT programme_id INTO v_programme_id
    FROM projects
    WHERE id = p_project_id;

    -- Generate reference
    v_reference := generate_log_reference();

    -- Create daily log
    INSERT INTO daily_logs (
        project_id,
        programme_id,
        log_reference,
        created_by,
        visibility,
        is_active
    )
    VALUES (
        p_project_id,
        v_programme_id,
        v_reference,
        p_user_id,
        'team', -- Default visibility
        TRUE
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_daily_log_for_project(UUID, UUID) IS 'Creates daily log when project is initiated';

-- ============================================================================
-- FUNCTION: escalate_entry_to_issue(p_entry_id UUID, p_user_id UUID)
-- Description: Promotes a daily log entry to a formal issue
-- Note: This is a placeholder - actual implementation depends on issues table structure
-- ============================================================================

CREATE OR REPLACE FUNCTION escalate_entry_to_issue(p_entry_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_entry RECORD;
    v_issue_id UUID;
BEGIN
    -- Get entry details
    SELECT * INTO v_entry
    FROM daily_log_entries
    WHERE id = p_entry_id
      AND is_deleted = FALSE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Daily log entry not found';
    END IF;

    -- TODO: Create issue record in issues table
    -- This is a placeholder - actual implementation depends on issues table structure
    -- INSERT INTO issues (...) VALUES (...) RETURNING id INTO v_issue_id;

    -- Update entry status
    UPDATE daily_log_entries
    SET status = 'escalated',
        escalated_to = 'issue',
        escalated_item_id = v_issue_id, -- Will be NULL until issues table is implemented
        updated_at = NOW(),
        updated_by = p_user_id
    WHERE id = p_entry_id;

    RETURN v_issue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION escalate_entry_to_issue(UUID, UUID) IS 'Promotes a daily log entry to a formal issue (placeholder - requires issues table)';

-- ============================================================================
-- FUNCTION: escalate_entry_to_risk(p_entry_id UUID, p_user_id UUID)
-- Description: Promotes a daily log entry to a formal risk
-- Note: This is a placeholder - actual implementation depends on risks table structure
-- ============================================================================

CREATE OR REPLACE FUNCTION escalate_entry_to_risk(p_entry_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_entry RECORD;
    v_risk_id UUID;
BEGIN
    -- Get entry details
    SELECT * INTO v_entry
    FROM daily_log_entries
    WHERE id = p_entry_id
      AND is_deleted = FALSE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Daily log entry not found';
    END IF;

    -- TODO: Create risk record in risks table
    -- This is a placeholder - actual implementation depends on risks table structure
    -- INSERT INTO risks (...) VALUES (...) RETURNING id INTO v_risk_id;

    -- Update entry status
    UPDATE daily_log_entries
    SET status = 'escalated',
        escalated_to = 'risk',
        escalated_item_id = v_risk_id, -- Will be NULL until risks table is implemented
        updated_at = NOW(),
        updated_by = p_user_id
    WHERE id = p_entry_id;

    RETURN v_risk_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION escalate_entry_to_risk(UUID, UUID) IS 'Promotes a daily log entry to a formal risk (placeholder - requires risks table)';

-- ============================================================================
-- FUNCTION: get_overdue_entries(p_project_id UUID)
-- Description: Returns entries with target dates that have passed
-- ============================================================================

CREATE OR REPLACE FUNCTION get_overdue_entries(p_project_id UUID)
RETURNS TABLE (
    entry_id UUID,
    entry_number INTEGER,
    description TEXT,
    target_date DATE,
    days_overdue INTEGER,
    person_responsible VARCHAR,
    entry_type VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id AS entry_id,
        e.entry_number,
        e.description,
        e.target_date,
        CURRENT_DATE - e.target_date AS days_overdue,
        COALESCE(u.full_name, e.person_responsible_name, 'Unassigned') AS person_responsible,
        e.entry_type
    FROM daily_log_entries e
    JOIN daily_logs dl ON e.daily_log_id = dl.id
    LEFT JOIN users u ON e.person_responsible_id = u.id
    WHERE dl.project_id = p_project_id
      AND e.target_date IS NOT NULL
      AND e.target_date < CURRENT_DATE
      AND e.status NOT IN ('completed', 'cancelled', 'escalated')
      AND e.is_deleted = FALSE
      AND dl.is_deleted = FALSE
    ORDER BY e.target_date ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_overdue_entries(UUID) IS 'Returns entries with target dates that have passed';

-- ============================================================================
-- FUNCTION: get_daily_log_summary(p_project_id UUID)
-- Description: Returns summary statistics for a project's daily log
-- ============================================================================

CREATE OR REPLACE FUNCTION get_daily_log_summary(p_project_id UUID)
RETURNS TABLE (
    total_entries INTEGER,
    open_entries INTEGER,
    completed_entries INTEGER,
    overdue_entries INTEGER,
    entries_by_type JSONB
) AS $$
DECLARE
    v_log_id UUID;
BEGIN
    -- Get log ID
    SELECT id INTO v_log_id
    FROM daily_logs
    WHERE project_id = p_project_id
      AND is_deleted = FALSE;

    IF v_log_id IS NULL THEN
        RETURN QUERY SELECT 0, 0, 0, 0, '{}'::JSONB;
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER AS total_entries,
        COUNT(*) FILTER (WHERE status IN ('open', 'in_progress'))::INTEGER AS open_entries,
        COUNT(*) FILTER (WHERE status = 'completed')::INTEGER AS completed_entries,
        COUNT(*) FILTER (
            WHERE target_date IS NOT NULL
              AND target_date < CURRENT_DATE
              AND status NOT IN ('completed', 'cancelled', 'escalated')
        )::INTEGER AS overdue_entries,
        jsonb_object_agg(
            entry_type,
            COUNT(*)
        ) FILTER (WHERE entry_type IS NOT NULL) AS entries_by_type
    FROM daily_log_entries
    WHERE daily_log_id = v_log_id
      AND is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_daily_log_summary(UUID) IS 'Returns summary statistics for a project''s daily log';

-- ============================================================================
-- SECTION 8: TRIGGERS
-- ============================================================================

-- ============================================================================
-- TRIGGER: Auto-generate log_reference on INSERT to daily_logs
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_daily_logs_auto_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.log_reference IS NULL OR NEW.log_reference = '' THEN
        NEW.log_reference := generate_log_reference();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_daily_logs_before_insert_reference ON daily_logs;
CREATE TRIGGER trg_daily_logs_before_insert_reference
    BEFORE INSERT ON daily_logs
    FOR EACH ROW
    EXECUTE FUNCTION trg_daily_logs_auto_reference();

-- ============================================================================
-- TRIGGER: Auto-generate entry_number on INSERT to daily_log_entries
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_daily_log_entries_auto_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.entry_number IS NULL OR NEW.entry_number = 0 THEN
        NEW.entry_number := generate_entry_number(NEW.daily_log_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_daily_log_entries_before_insert_number ON daily_log_entries;
CREATE TRIGGER trg_daily_log_entries_before_insert_number
    BEFORE INSERT ON daily_log_entries
    FOR EACH ROW
    EXECUTE FUNCTION trg_daily_log_entries_auto_number();

-- ============================================================================
-- TRIGGER: Auto-create daily log when project is initiated
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_projects_create_daily_log()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get the user who created the project
    v_user_id := NEW.created_by;

    -- If created_by is NULL, try to get from auth context
    IF v_user_id IS NULL THEN
        v_user_id := auth.uid();
    END IF;

    -- Only create log if user_id is available
    IF v_user_id IS NOT NULL THEN
        -- Create daily log (function handles duplicate check)
        PERFORM create_daily_log_for_project(NEW.id, v_user_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_projects_after_insert_daily_log ON projects;
CREATE TRIGGER trg_projects_after_insert_daily_log
    AFTER INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION trg_projects_create_daily_log();

COMMENT ON FUNCTION trg_projects_create_daily_log() IS 'Auto-creates daily log when project is created';

-- ============================================================================
-- TRIGGER: Update completed_at when entry status changes to completed
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_daily_log_entries_completed()
RETURNS TRIGGER AS $$
BEGIN
    -- Set completed_at when status changes to completed
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        NEW.completed_at := NOW();
        NEW.completed_by := auth.uid();
    END IF;

    -- Clear completed_at if status changes away from completed
    IF NEW.status != 'completed' AND OLD.status = 'completed' THEN
        NEW.completed_at := NULL;
        NEW.completed_by := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_daily_log_entries_before_update_completed ON daily_log_entries;
CREATE TRIGGER trg_daily_log_entries_before_update_completed
    BEFORE UPDATE ON daily_log_entries
    FOR EACH ROW
    EXECUTE FUNCTION trg_daily_log_entries_completed();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    tables_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO tables_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('daily_logs', 'daily_log_entries', 'daily_log_attachments', 'daily_log_comments', 'daily_log_reminders');

    IF tables_count != 5 THEN
        RAISE EXCEPTION 'Expected 5 daily log tables, found %', tables_count;
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Daily Log Tables Created Successfully';
    RAISE NOTICE 'Tables: %', tables_count;
    RAISE NOTICE '========================================';
END $$;

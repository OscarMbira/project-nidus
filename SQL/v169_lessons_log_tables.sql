-- ============================================================================
-- Lessons Log Implementation - Database Tables and Functions
-- Version: v169
-- Description: Complete database schema for Lessons Log functionality
-- Date: 2026-01-19
-- ============================================================================
--
-- Purpose:
-- Creates comprehensive database schema for Lessons Log functionality.
-- Lessons Log captures lessons learned throughout the project lifecycle,
-- enabling organizational learning across projects.
--
-- Prerequisites:
-- - v01 through v07 must be run first (core tables and trigger functions)
-- - projects table must exist (v04_project_core_tables.sql)
-- - users table must exist (v03_user_access_tables.sql)
-- - accounts table must exist (for corporate repository, from v84_accounts_and_extensions.sql)
-- - products table must exist (for product linkage)
-- - risks table must exist (for risk linkage)
--
-- Key Design:
-- - One lessons log per project (UNIQUE constraint on project_id)
-- - Created automatically when project is initiated
-- - Lessons can be scoped: Project only, Corporate/Programme, or Both
-- - Corporate lessons are visible across all projects in the organization
--
-- ============================================================================
-- SECTION 1: DROP EXISTING TABLES (if upgrading)
-- ============================================================================

-- Drop child tables first (if they exist)
DROP TABLE IF EXISTS lesson_ratings CASCADE;
DROP TABLE IF EXISTS lesson_actions CASCADE;
DROP TABLE IF EXISTS lesson_attachments CASCADE;
DROP TABLE IF EXISTS lesson_comments CASCADE;
DROP TABLE IF EXISTS corporate_lessons_repository CASCADE;
DROP TABLE IF EXISTS lessons_log_distribution CASCADE;
DROP TABLE IF EXISTS lessons_log_approvals CASCADE;
DROP TABLE IF EXISTS lessons_log_revision_history CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS lessons_logs CASCADE;

-- ============================================================================
-- SECTION 2: MAIN TABLE - lessons_logs
-- ============================================================================

CREATE TABLE lessons_logs (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship (One log per project)
    project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Log Identification
    log_reference VARCHAR(50) UNIQUE NOT NULL, -- e.g., LL-2026-001
    document_ref VARCHAR(100), -- External document reference
    version_number VARCHAR(20) DEFAULT '1.0',
    release VARCHAR(50), -- Release/version identifier

    -- Ownership
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    client_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Process Documentation
    update_process TEXT, -- Defined process for updates
    access_control_notes TEXT, -- Access control documentation

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lessons_logs_project_id ON lessons_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_lessons_logs_log_reference ON lessons_logs(log_reference);
CREATE INDEX IF NOT EXISTS idx_lessons_logs_author_id ON lessons_logs(author_id);
CREATE INDEX IF NOT EXISTS idx_lessons_logs_owner_id ON lessons_logs(owner_id);
CREATE INDEX IF NOT EXISTS idx_lessons_logs_is_active ON lessons_logs(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_lessons_logs_is_deleted ON lessons_logs(is_deleted) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_lessons_logs_before_insert ON lessons_logs;
CREATE TRIGGER trg_lessons_logs_before_insert
    BEFORE INSERT ON lessons_logs
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_lessons_logs_before_update ON lessons_logs;
CREATE TRIGGER trg_lessons_logs_before_update
    BEFORE UPDATE ON lessons_logs
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE lessons_logs IS 'Lessons Log header - one log per project for capturing lessons learned';
COMMENT ON COLUMN lessons_logs.log_reference IS 'Unique reference number (e.g., LL-2026-001)';
COMMENT ON COLUMN lessons_logs.update_process IS 'Defined process for updating the lessons log';
COMMENT ON COLUMN lessons_logs.access_control_notes IS 'Documentation of access control settings';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('lessons_logs', 'Lessons Log header - one log per project for capturing lessons learned', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 3: lessons (Individual Lesson Entries)
-- ============================================================================

CREATE TYPE lesson_scope_type AS ENUM (
    'project',
    'corporate',
    'programme',
    'both_project_corporate',
    'both_project_programme'
);

CREATE TYPE effect_type_enum AS ENUM (
    'positive',
    'negative',
    'neutral'
);

CREATE TYPE risk_type_enum AS ENUM (
    'threat',
    'opportunity'
);

CREATE TYPE lesson_status_enum AS ENUM (
    'logged',
    'under_review',
    'action_required',
    'action_taken',
    'closed',
    'rejected'
);

CREATE TYPE lesson_priority_enum AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);

CREATE TYPE lesson_category_enum AS ENUM (
    'process',
    'technical',
    'resource',
    'communication',
    'stakeholder',
    'quality',
    'schedule',
    'cost',
    'risk',
    'procurement',
    'other'
);

CREATE TABLE lessons (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    lessons_log_id UUID NOT NULL REFERENCES lessons_logs(id) ON DELETE CASCADE,
    lesson_reference VARCHAR(50) UNIQUE NOT NULL, -- e.g., L-2026-001
    lesson_number INTEGER NOT NULL, -- Sequential within log

    -- Lesson Type
    lesson_scope lesson_scope_type NOT NULL DEFAULT 'project',
    is_corporate_lesson BOOLEAN DEFAULT FALSE, -- For quick filtering

    -- Lesson Detail
    title VARCHAR(500) NOT NULL,
    event_description TEXT NOT NULL,
    effect_description TEXT NOT NULL,
    effect_type effect_type_enum NOT NULL,
    cause_description TEXT,
    early_warning_indicators TEXT,
    recommendations TEXT NOT NULL,

    -- Risk Linkage
    was_identified_risk BOOLEAN DEFAULT FALSE,
    risk_type risk_type_enum,
    linked_risk_id UUID, -- FK to risks table (will be added when risks table structure is confirmed)

    -- Context
    related_product_id UUID, -- FK to products table
    related_product_name VARCHAR(200), -- For external products
    project_phase VARCHAR(100),
    project_stage VARCHAR(100),

    -- Status & Priority
    status lesson_status_enum NOT NULL DEFAULT 'logged',
    priority lesson_priority_enum NOT NULL DEFAULT 'medium',

    -- Categorization
    category lesson_category_enum NOT NULL DEFAULT 'other',
    tags TEXT[], -- Additional tags for searchability

    -- Metadata
    date_logged DATE NOT NULL DEFAULT CURRENT_DATE,
    logged_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    logged_by_name VARCHAR(200), -- For external people
    date_actioned DATE,
    actioned_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_notes TEXT,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Constraints
    CONSTRAINT unique_lesson_reference UNIQUE (lesson_reference),
    CONSTRAINT unique_lesson_number_per_log UNIQUE (lessons_log_id, lesson_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lessons_lessons_log_id ON lessons(lessons_log_id);
CREATE INDEX IF NOT EXISTS idx_lessons_lesson_reference ON lessons(lesson_reference);
CREATE INDEX IF NOT EXISTS idx_lessons_lesson_number ON lessons(lessons_log_id, lesson_number);
CREATE INDEX IF NOT EXISTS idx_lessons_lesson_scope ON lessons(lesson_scope);
CREATE INDEX IF NOT EXISTS idx_lessons_is_corporate_lesson ON lessons(is_corporate_lesson) WHERE is_corporate_lesson = TRUE;
CREATE INDEX IF NOT EXISTS idx_lessons_category ON lessons(category);
CREATE INDEX IF NOT EXISTS idx_lessons_status ON lessons(status);
CREATE INDEX IF NOT EXISTS idx_lessons_effect_type ON lessons(effect_type);
CREATE INDEX IF NOT EXISTS idx_lessons_priority ON lessons(priority);
CREATE INDEX IF NOT EXISTS idx_lessons_date_logged ON lessons(date_logged DESC);
CREATE INDEX IF NOT EXISTS idx_lessons_logged_by_id ON lessons(logged_by_id);
CREATE INDEX IF NOT EXISTS idx_lessons_tags ON lessons USING GIN(tags) WHERE tags IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lessons_is_deleted ON lessons(is_deleted) WHERE is_deleted = FALSE;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_lessons_search ON lessons USING GIN(
    to_tsvector('english', 
        COALESCE(title, '') || ' ' || 
        COALESCE(event_description, '') || ' ' || 
        COALESCE(effect_description, '') || ' ' || 
        COALESCE(recommendations, '')
    )
);

-- Triggers
DROP TRIGGER IF EXISTS trg_lessons_before_insert ON lessons;
CREATE TRIGGER trg_lessons_before_insert
    BEFORE INSERT ON lessons
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_lessons_before_update ON lessons;
CREATE TRIGGER trg_lessons_before_update
    BEFORE UPDATE ON lessons
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE lessons IS 'Individual lesson entries within a lessons log';
COMMENT ON COLUMN lessons.lesson_reference IS 'Unique reference number (e.g., L-2026-001)';
COMMENT ON COLUMN lessons.lesson_number IS 'Sequential number within the log';
COMMENT ON COLUMN lessons.lesson_scope IS 'Scope: project only, corporate, programme, or both';
COMMENT ON COLUMN lessons.is_corporate_lesson IS 'Quick filter flag for corporate lessons';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('lessons', 'Individual lesson entries within a lessons log', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 4: lessons_log_revision_history
-- ============================================================================

CREATE TABLE lessons_log_revision_history (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    lessons_log_id UUID NOT NULL REFERENCES lessons_logs(id) ON DELETE CASCADE,

    -- Revision Information
    revision_date DATE NOT NULL DEFAULT CURRENT_DATE,
    previous_revision_date DATE,
    summary_of_changes TEXT NOT NULL,
    changes_marked TEXT, -- Marked changes in document

    -- Author
    revised_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lessons_log_revision_history_log_id ON lessons_log_revision_history(lessons_log_id);
CREATE INDEX IF NOT EXISTS idx_lessons_log_revision_history_revision_date ON lessons_log_revision_history(revision_date DESC);
CREATE INDEX IF NOT EXISTS idx_lessons_log_revision_history_revised_by ON lessons_log_revision_history(revised_by);

-- Comments
COMMENT ON TABLE lessons_log_revision_history IS 'Revision history tracking for lessons log document';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('lessons_log_revision_history', 'Revision history tracking for lessons log document', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 5: lessons_log_approvals
-- ============================================================================

CREATE TABLE lessons_log_approvals (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    lessons_log_id UUID NOT NULL REFERENCES lessons_logs(id) ON DELETE CASCADE,

    -- Approver Information
    approver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    approver_name VARCHAR(200) NOT NULL,
    approver_title VARCHAR(200),

    -- Approval Details
    signature_data TEXT, -- Digital signature or signature image
    approval_date DATE NOT NULL DEFAULT CURRENT_DATE,
    version_approved VARCHAR(20) NOT NULL,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lessons_log_approvals_log_id ON lessons_log_approvals(lessons_log_id);
CREATE INDEX IF NOT EXISTS idx_lessons_log_approvals_approval_date ON lessons_log_approvals(approval_date DESC);
CREATE INDEX IF NOT EXISTS idx_lessons_log_approvals_approver_id ON lessons_log_approvals(approver_id);

-- Comments
COMMENT ON TABLE lessons_log_approvals IS 'Approval records for lessons log document versions';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('lessons_log_approvals', 'Approval records for lessons log document versions', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 6: lessons_log_distribution
-- ============================================================================

CREATE TABLE lessons_log_distribution (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    lessons_log_id UUID NOT NULL REFERENCES lessons_logs(id) ON DELETE CASCADE,

    -- Recipient Information
    recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_name VARCHAR(200) NOT NULL,
    recipient_title VARCHAR(200),

    -- Distribution Details
    date_of_issue DATE NOT NULL DEFAULT CURRENT_DATE,
    version_distributed VARCHAR(20) NOT NULL,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lessons_log_distribution_log_id ON lessons_log_distribution(lessons_log_id);
CREATE INDEX IF NOT EXISTS idx_lessons_log_distribution_date_of_issue ON lessons_log_distribution(date_of_issue DESC);
CREATE INDEX IF NOT EXISTS idx_lessons_log_distribution_recipient_id ON lessons_log_distribution(recipient_id);

-- Comments
COMMENT ON TABLE lessons_log_distribution IS 'Distribution records for lessons log document versions';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('lessons_log_distribution', 'Distribution records for lessons log document versions', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 7: corporate_lessons_repository
-- ============================================================================

CREATE TABLE corporate_lessons_repository (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

    -- Promotion Details
    promoted_date DATE NOT NULL DEFAULT CURRENT_DATE,
    promoted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    applicability_notes TEXT, -- When this lesson applies
    project_type_tags TEXT[], -- Which project types benefit
    industry_tags TEXT[], -- Which industries apply

    -- Engagement Metrics
    is_active BOOLEAN DEFAULT TRUE,
    view_count INTEGER DEFAULT 0,
    usefulness_rating DECIMAL(3,2), -- Average rating (0.00 to 5.00)

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_corporate_lessons_repository_lesson_id ON corporate_lessons_repository(lesson_id);
CREATE INDEX IF NOT EXISTS idx_corporate_lessons_repository_organisation_id ON corporate_lessons_repository(organisation_id);
CREATE INDEX IF NOT EXISTS idx_corporate_lessons_repository_promoted_date ON corporate_lessons_repository(promoted_date DESC);
CREATE INDEX IF NOT EXISTS idx_corporate_lessons_repository_is_active ON corporate_lessons_repository(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_corporate_lessons_repository_project_type_tags ON corporate_lessons_repository USING GIN(project_type_tags) WHERE project_type_tags IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_corporate_lessons_repository_industry_tags ON corporate_lessons_repository USING GIN(industry_tags) WHERE industry_tags IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_corporate_lessons_repository_usefulness_rating ON corporate_lessons_repository(usefulness_rating DESC NULLS LAST);

-- Triggers
DROP TRIGGER IF EXISTS trg_corporate_lessons_repository_before_update ON corporate_lessons_repository;
CREATE TRIGGER trg_corporate_lessons_repository_before_update
    BEFORE UPDATE ON corporate_lessons_repository
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE corporate_lessons_repository IS 'Organization-wide repository of lessons promoted from projects';
COMMENT ON COLUMN corporate_lessons_repository.usefulness_rating IS 'Average rating from lesson_ratings (0.00 to 5.00)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('corporate_lessons_repository', 'Organization-wide repository of lessons promoted from projects', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 8: lesson_comments
-- ============================================================================

CREATE TABLE lesson_comments (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,

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
CREATE INDEX IF NOT EXISTS idx_lesson_comments_lesson_id ON lesson_comments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_comments_commented_by ON lesson_comments(commented_by);
CREATE INDEX IF NOT EXISTS idx_lesson_comments_created_at ON lesson_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lesson_comments_is_deleted ON lesson_comments(is_deleted) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_lesson_comments_before_insert ON lesson_comments;
CREATE TRIGGER trg_lesson_comments_before_insert
    BEFORE INSERT ON lesson_comments
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_lesson_comments_before_update ON lesson_comments;
CREATE TRIGGER trg_lesson_comments_before_update
    BEFORE UPDATE ON lesson_comments
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE lesson_comments IS 'Discussion comments on lessons';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('lesson_comments', 'Discussion comments on lessons', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 9: lesson_attachments
-- ============================================================================

CREATE TABLE lesson_attachments (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,

    -- File Information
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER, -- Size in bytes
    description TEXT, -- Optional description

    -- Upload Tracking
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),

    -- Audit Fields
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lesson_attachments_lesson_id ON lesson_attachments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_attachments_uploaded_by ON lesson_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_lesson_attachments_is_deleted ON lesson_attachments(is_deleted) WHERE is_deleted = FALSE;

-- Comments
COMMENT ON TABLE lesson_attachments IS 'Supporting documents/files attached to lessons';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('lesson_attachments', 'Supporting documents/files attached to lessons', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 10: lesson_actions
-- ============================================================================

CREATE TYPE action_status_enum AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'cancelled'
);

CREATE TABLE lesson_actions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,

    -- Action Details
    action_description TEXT NOT NULL,
    assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_to_name VARCHAR(200), -- For external assignees
    target_date DATE,
    status action_status_enum NOT NULL DEFAULT 'pending',
    completion_notes TEXT,
    completed_date DATE,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lesson_actions_lesson_id ON lesson_actions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_actions_assigned_to_id ON lesson_actions(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_lesson_actions_status ON lesson_actions(status);
CREATE INDEX IF NOT EXISTS idx_lesson_actions_target_date ON lesson_actions(target_date) WHERE target_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lesson_actions_is_deleted ON lesson_actions(is_deleted) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_lesson_actions_before_insert ON lesson_actions;
CREATE TRIGGER trg_lesson_actions_before_insert
    BEFORE INSERT ON lesson_actions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_lesson_actions_before_update ON lesson_actions;
CREATE TRIGGER trg_lesson_actions_before_update
    BEFORE UPDATE ON lesson_actions
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE lesson_actions IS 'Actions derived from lesson recommendations';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('lesson_actions', 'Actions derived from lesson recommendations', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 11: lesson_ratings
-- ============================================================================

CREATE TABLE lesson_ratings (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    rated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    -- Rating Details
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5), -- 1-5 scale
    feedback TEXT,
    was_helpful BOOLEAN NOT NULL DEFAULT TRUE,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_rating_per_user UNIQUE (lesson_id, rated_by)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lesson_ratings_lesson_id ON lesson_ratings(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_ratings_rated_by ON lesson_ratings(rated_by);
CREATE INDEX IF NOT EXISTS idx_lesson_ratings_rating ON lesson_ratings(rating DESC);
CREATE INDEX IF NOT EXISTS idx_lesson_ratings_was_helpful ON lesson_ratings(was_helpful) WHERE was_helpful = TRUE;

-- Comments
COMMENT ON TABLE lesson_ratings IS 'Usefulness ratings for lessons (1-5 scale)';
COMMENT ON COLUMN lesson_ratings.rating IS 'Rating from 1 (not useful) to 5 (very useful)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('lesson_ratings', 'Usefulness ratings for lessons (1-5 scale)', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 12: FUNCTIONS
-- ============================================================================

-- ============================================================================
-- FUNCTION: generate_lessons_log_reference()
-- Description: Generates unique lessons log reference number (LL-YYYY-NNN)
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_lessons_log_reference()
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
    FROM lessons_logs
    WHERE log_reference LIKE 'LL-' || v_year || '-%';

    -- Format reference: LL-YYYY-NNN
    v_reference := 'LL-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0');

    RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_lessons_log_reference() IS 'Generates unique lessons log reference number (LL-YYYY-NNN)';

-- ============================================================================
-- FUNCTION: generate_lesson_reference()
-- Description: Generates unique lesson reference number (L-YYYY-NNN)
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_lesson_reference()
RETURNS VARCHAR AS $$
DECLARE
    v_year INTEGER;
    v_sequence INTEGER;
    v_reference VARCHAR(50);
BEGIN
    -- Get current year
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);

    -- Get next sequence number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(lesson_reference FROM 6) AS INTEGER)), 0) + 1
    INTO v_sequence
    FROM lessons
    WHERE lesson_reference LIKE 'L-' || v_year || '-%';

    -- Format reference: L-YYYY-NNN
    v_reference := 'L-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0');

    RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_lesson_reference() IS 'Generates unique lesson reference number (L-YYYY-NNN)';

-- ============================================================================
-- FUNCTION: generate_lesson_number(p_lessons_log_id UUID)
-- Description: Generates sequential lesson number within a log
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_lesson_number(p_lessons_log_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_next_number INTEGER;
BEGIN
    -- Get next lesson number
    SELECT COALESCE(MAX(lesson_number), 0) + 1
    INTO v_next_number
    FROM lessons
    WHERE lessons_log_id = p_lessons_log_id
      AND is_deleted = FALSE;

    RETURN v_next_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_lesson_number(UUID) IS 'Generates sequential lesson number within a lessons log';

-- ============================================================================
-- FUNCTION: create_lessons_log_for_project(p_project_id UUID, p_user_id UUID)
-- Description: Creates lessons log when project is initiated
-- ============================================================================

CREATE OR REPLACE FUNCTION create_lessons_log_for_project(p_project_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_reference VARCHAR(50);
BEGIN
    -- Check if log already exists
    SELECT id INTO v_log_id
    FROM lessons_logs
    WHERE project_id = p_project_id
      AND is_deleted = FALSE;

    IF v_log_id IS NOT NULL THEN
        RETURN v_log_id; -- Log already exists
    END IF;

    -- Generate reference
    v_reference := generate_lessons_log_reference();

    -- Create lessons log
    INSERT INTO lessons_logs (
        project_id,
        log_reference,
        author_id,
        owner_id,
        created_by,
        is_active
    )
    VALUES (
        p_project_id,
        v_reference,
        p_user_id,
        p_user_id,
        p_user_id,
        TRUE
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_lessons_log_for_project(UUID, UUID) IS 'Creates lessons log when project is initiated';

-- ============================================================================
-- FUNCTION: promote_to_corporate(p_lesson_id UUID, p_user_id UUID, p_organisation_id UUID, p_applicability_notes TEXT, p_project_type_tags TEXT[], p_industry_tags TEXT[])
-- Description: Promotes a lesson to the corporate repository
-- ============================================================================

CREATE OR REPLACE FUNCTION promote_to_corporate(
    p_lesson_id UUID,
    p_user_id UUID,
    p_organisation_id UUID,
    p_applicability_notes TEXT DEFAULT NULL,
    p_project_type_tags TEXT[] DEFAULT NULL,
    p_industry_tags TEXT[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_lesson RECORD;
    v_corporate_id UUID;
BEGIN
    -- Get lesson details
    SELECT * INTO v_lesson
    FROM lessons
    WHERE id = p_lesson_id
      AND is_deleted = FALSE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lesson not found';
    END IF;

    -- Check if already promoted
    SELECT id INTO v_corporate_id
    FROM corporate_lessons_repository
    WHERE lesson_id = p_lesson_id
      AND organisation_id = p_organisation_id
      AND is_active = TRUE;

    IF v_corporate_id IS NOT NULL THEN
        RETURN v_corporate_id; -- Already promoted
    END IF;

    -- Promote to corporate repository
    INSERT INTO corporate_lessons_repository (
        lesson_id,
        organisation_id,
        promoted_date,
        promoted_by,
        applicability_notes,
        project_type_tags,
        industry_tags,
        is_active
    )
    VALUES (
        p_lesson_id,
        p_organisation_id,
        CURRENT_DATE,
        p_user_id,
        p_applicability_notes,
        p_project_type_tags,
        p_industry_tags,
        TRUE
    )
    RETURNING id INTO v_corporate_id;

    -- Update lesson scope if needed
    IF v_lesson.lesson_scope = 'project' THEN
        UPDATE lessons
        SET lesson_scope = 'both_project_corporate',
            is_corporate_lesson = TRUE,
            updated_at = NOW(),
            updated_by = p_user_id
        WHERE id = p_lesson_id;
    END IF;

    RETURN v_corporate_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION promote_to_corporate(UUID, UUID, UUID, TEXT, TEXT[], TEXT[]) IS 'Promotes a lesson to the corporate repository';

-- ============================================================================
-- FUNCTION: get_relevant_corporate_lessons(p_project_id UUID)
-- Description: Returns corporate lessons relevant to a project based on type and tags
-- ============================================================================

CREATE OR REPLACE FUNCTION get_relevant_corporate_lessons(p_project_id UUID)
RETURNS TABLE (
    lesson_id UUID,
    title VARCHAR,
    recommendations TEXT,
    category VARCHAR,
    relevance_score DECIMAL
) AS $$
DECLARE
    v_project RECORD;
    v_organisation_id UUID;
BEGIN
    -- Get project details
    SELECT p.*, a.id as account_id
    INTO v_project
    FROM projects p
    LEFT JOIN accounts a ON p.account_id = a.id
    WHERE p.id = p_project_id
      AND p.is_deleted = FALSE;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    v_organisation_id := v_project.account_id;

    -- Return relevant corporate lessons
    RETURN QUERY
    SELECT
        l.id as lesson_id,
        l.title,
        l.recommendations,
        l.category::VARCHAR,
        CASE
            WHEN v_project.project_type = ANY(clr.project_type_tags) THEN 1.0
            WHEN array_length(clr.project_type_tags, 1) IS NULL THEN 0.5
            ELSE 0.3
        END as relevance_score
    FROM corporate_lessons_repository clr
    JOIN lessons l ON clr.lesson_id = l.id
    WHERE clr.organisation_id = v_organisation_id
      AND clr.is_active = TRUE
      AND l.is_deleted = FALSE
    ORDER BY relevance_score DESC, clr.usefulness_rating DESC NULLS LAST, clr.view_count DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_relevant_corporate_lessons(UUID) IS 'Returns corporate lessons relevant to a project based on type and tags';

-- ============================================================================
-- FUNCTION: get_lessons_by_category(p_lessons_log_id UUID)
-- Description: Returns lessons grouped by category
-- ============================================================================

CREATE OR REPLACE FUNCTION get_lessons_by_category(p_lessons_log_id UUID)
RETURNS TABLE (
    category VARCHAR,
    lesson_count INTEGER,
    lessons JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.category::VARCHAR,
        COUNT(*)::INTEGER as lesson_count,
        jsonb_agg(
            jsonb_build_object(
                'id', l.id,
                'lesson_reference', l.lesson_reference,
                'title', l.title,
                'effect_type', l.effect_type,
                'status', l.status,
                'priority', l.priority,
                'date_logged', l.date_logged
            )
            ORDER BY l.date_logged DESC
        ) as lessons
    FROM lessons l
    WHERE l.lessons_log_id = p_lessons_log_id
      AND l.is_deleted = FALSE
    GROUP BY l.category
    ORDER BY lesson_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_lessons_by_category(UUID) IS 'Returns lessons grouped by category';

-- ============================================================================
-- FUNCTION: get_lessons_summary(p_project_id UUID)
-- Description: Returns summary statistics for a project''s lessons log
-- ============================================================================

CREATE OR REPLACE FUNCTION get_lessons_summary(p_project_id UUID)
RETURNS TABLE (
    total_lessons INTEGER,
    positive_lessons INTEGER,
    negative_lessons INTEGER,
    lessons_by_category JSONB,
    lessons_by_status JSONB,
    corporate_lessons INTEGER,
    actions_pending INTEGER
) AS $$
DECLARE
    v_log_id UUID;
BEGIN
    -- Get lessons log ID
    SELECT id INTO v_log_id
    FROM lessons_logs
    WHERE project_id = p_project_id
      AND is_deleted = FALSE;

    IF v_log_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_lessons,
        COUNT(*) FILTER (WHERE l.effect_type = 'positive')::INTEGER as positive_lessons,
        COUNT(*) FILTER (WHERE l.effect_type = 'negative')::INTEGER as negative_lessons,
        jsonb_object_agg(
            l.category::TEXT,
            COUNT(*)::INTEGER
        ) as lessons_by_category,
        jsonb_object_agg(
            l.status::TEXT,
            COUNT(*)::INTEGER
        ) as lessons_by_status,
        COUNT(*) FILTER (WHERE l.is_corporate_lesson = TRUE)::INTEGER as corporate_lessons,
        (
            SELECT COUNT(*)::INTEGER
            FROM lesson_actions la
            WHERE la.lesson_id IN (SELECT id FROM lessons WHERE lessons_log_id = v_log_id)
              AND la.status IN ('pending', 'in_progress')
              AND la.is_deleted = FALSE
        ) as actions_pending
    FROM lessons l
    WHERE l.lessons_log_id = v_log_id
      AND l.is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_lessons_summary(UUID) IS 'Returns summary statistics for a project''s lessons log';

-- ============================================================================
-- FUNCTION: search_lessons(p_organisation_id UUID, p_search_term TEXT, p_filters JSONB)
-- Description: Searches lessons across the organization
-- ============================================================================

CREATE OR REPLACE FUNCTION search_lessons(
    p_organisation_id UUID,
    p_search_term TEXT DEFAULT NULL,
    p_filters JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE (
    lesson_id UUID,
    title VARCHAR,
    recommendations TEXT,
    project_name VARCHAR,
    relevance_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.id as lesson_id,
        l.title,
        l.recommendations,
        p.project_name,
        ts_rank(
            to_tsvector('english', 
                COALESCE(l.title, '') || ' ' || 
                COALESCE(l.event_description, '') || ' ' || 
                COALESCE(l.recommendations, '')
            ),
            plainto_tsquery('english', COALESCE(p_search_term, ''))
        ) as relevance_score
    FROM lessons l
    JOIN lessons_logs ll ON l.lessons_log_id = ll.id
    JOIN projects p ON ll.project_id = p.id
    WHERE p.account_id = p_organisation_id
      AND l.is_deleted = FALSE
      AND ll.is_deleted = FALSE
      AND p.is_deleted = FALSE
      AND (
        p_search_term IS NULL OR
        to_tsvector('english', 
            COALESCE(l.title, '') || ' ' || 
            COALESCE(l.event_description, '') || ' ' || 
            COALESCE(l.recommendations, '')
        ) @@ plainto_tsquery('english', p_search_term)
      )
      AND (
        (p_filters->>'category')::VARCHAR IS NULL OR l.category = (p_filters->>'category')::lesson_category_enum
      )
      AND (
        (p_filters->>'effect_type')::VARCHAR IS NULL OR l.effect_type = (p_filters->>'effect_type')::effect_type_enum
      )
      AND (
        (p_filters->>'scope')::VARCHAR IS NULL OR l.lesson_scope::TEXT = p_filters->>'scope'
      )
    ORDER BY relevance_score DESC NULLS LAST, l.date_logged DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION search_lessons(UUID, TEXT, JSONB) IS 'Searches lessons across the organization';

-- ============================================================================
-- FUNCTION: update_usefulness_rating(p_lesson_id UUID)
-- Description: Updates average usefulness rating for corporate lessons
-- ============================================================================

CREATE OR REPLACE FUNCTION update_usefulness_rating(p_lesson_id UUID)
RETURNS VOID AS $$
DECLARE
    v_avg_rating DECIMAL(3,2);
BEGIN
    -- Calculate average rating
    SELECT AVG(rating)::DECIMAL(3,2)
    INTO v_avg_rating
    FROM lesson_ratings
    WHERE lesson_id = p_lesson_id;

    -- Update corporate repository if exists
    UPDATE corporate_lessons_repository
    SET usefulness_rating = v_avg_rating,
        updated_at = NOW()
    WHERE lesson_id = p_lesson_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_usefulness_rating(UUID) IS 'Updates average usefulness rating for corporate lessons';

-- ============================================================================
-- SECTION 13: TRIGGERS
-- ============================================================================

-- ============================================================================
-- TRIGGER: Auto-generate log_reference on INSERT to lessons_logs
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_lessons_logs_generate_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.log_reference IS NULL OR NEW.log_reference = '' THEN
        NEW.log_reference := generate_lessons_log_reference();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lessons_logs_before_insert_reference ON lessons_logs;
CREATE TRIGGER trg_lessons_logs_before_insert_reference
    BEFORE INSERT ON lessons_logs
    FOR EACH ROW
    WHEN (NEW.log_reference IS NULL OR NEW.log_reference = '')
    EXECUTE FUNCTION trg_lessons_logs_generate_reference();

-- ============================================================================
-- TRIGGER: Auto-generate lesson_reference on INSERT to lessons
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_lessons_generate_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.lesson_reference IS NULL OR NEW.lesson_reference = '' THEN
        NEW.lesson_reference := generate_lesson_reference();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lessons_before_insert_reference ON lessons;
CREATE TRIGGER trg_lessons_before_insert_reference
    BEFORE INSERT ON lessons
    FOR EACH ROW
    WHEN (NEW.lesson_reference IS NULL OR NEW.lesson_reference = '')
    EXECUTE FUNCTION trg_lessons_generate_reference();

-- ============================================================================
-- TRIGGER: Auto-generate lesson_number on INSERT to lessons
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_lessons_generate_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.lesson_number IS NULL THEN
        NEW.lesson_number := generate_lesson_number(NEW.lessons_log_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lessons_before_insert_number ON lessons;
CREATE TRIGGER trg_lessons_before_insert_number
    BEFORE INSERT ON lessons
    FOR EACH ROW
    WHEN (NEW.lesson_number IS NULL)
    EXECUTE FUNCTION trg_lessons_generate_number();

-- ============================================================================
-- TRIGGER: Auto-create lessons log when project is initiated
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_projects_create_lessons_log()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get project creator
    SELECT created_by INTO v_user_id
    FROM projects
    WHERE id = NEW.id;

    -- Create lessons log
    PERFORM create_lessons_log_for_project(NEW.id, COALESCE(v_user_id, NEW.created_by));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_projects_after_insert_lessons_log ON projects;
CREATE TRIGGER trg_projects_after_insert_lessons_log
    AFTER INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION trg_projects_create_lessons_log();

COMMENT ON FUNCTION trg_projects_create_lessons_log() IS 'Auto-creates lessons log when project is initiated';

-- ============================================================================
-- TRIGGER: Auto-promote to corporate when lesson_scope includes corporate
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_lessons_auto_promote_corporate()
RETURNS TRIGGER AS $$
DECLARE
    v_organisation_id UUID;
BEGIN
    -- Only process if scope includes corporate
    IF NEW.lesson_scope NOT IN ('corporate', 'both_project_corporate', 'both_project_programme') THEN
        RETURN NEW;
    END IF;

    -- Get organisation_id from project
    SELECT p.account_id INTO v_organisation_id
    FROM lessons_logs ll
    JOIN projects p ON ll.project_id = p.id
    WHERE ll.id = NEW.lessons_log_id;

    IF v_organisation_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Promote to corporate (if not already promoted)
    PERFORM promote_to_corporate(
        NEW.id,
        NEW.created_by,
        v_organisation_id,
        NULL, -- applicability_notes
        NULL, -- project_type_tags
        NULL  -- industry_tags
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lessons_after_insert_promote ON lessons;
CREATE TRIGGER trg_lessons_after_insert_promote
    AFTER INSERT ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION trg_lessons_auto_promote_corporate();

COMMENT ON FUNCTION trg_lessons_auto_promote_corporate() IS 'Auto-promotes lesson to corporate repository when scope includes corporate';

-- ============================================================================
-- TRIGGER: Update usefulness_rating when new rating is added
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_lesson_ratings_update_rating()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_usefulness_rating(NEW.lesson_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lesson_ratings_after_insert_rating ON lesson_ratings;
CREATE TRIGGER trg_lesson_ratings_after_insert_rating
    AFTER INSERT ON lesson_ratings
    FOR EACH ROW
    EXECUTE FUNCTION trg_lesson_ratings_update_rating();

DROP TRIGGER IF EXISTS trg_lesson_ratings_after_update_rating ON lesson_ratings;
CREATE TRIGGER trg_lesson_ratings_after_update_rating
    AFTER UPDATE ON lesson_ratings
    FOR EACH ROW
    EXECUTE FUNCTION trg_lesson_ratings_update_rating();

COMMENT ON FUNCTION trg_lesson_ratings_update_rating() IS 'Updates average usefulness rating when rating is added or updated';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    tables_count INTEGER;
    functions_count INTEGER;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO tables_count
    FROM database_tables
    WHERE table_name IN (
        'lessons_logs',
        'lessons',
        'lessons_log_revision_history',
        'lessons_log_approvals',
        'lessons_log_distribution',
        'corporate_lessons_repository',
        'lesson_comments',
        'lesson_attachments',
        'lesson_actions',
        'lesson_ratings'
    );

    -- Count functions
    SELECT COUNT(*) INTO functions_count
    FROM pg_proc
    WHERE proname IN (
        'generate_lessons_log_reference',
        'generate_lesson_reference',
        'generate_lesson_number',
        'create_lessons_log_for_project',
        'promote_to_corporate',
        'get_relevant_corporate_lessons',
        'get_lessons_by_category',
        'get_lessons_summary',
        'search_lessons',
        'update_usefulness_rating'
    );

    IF tables_count < 10 THEN
        RAISE WARNING 'Expected 10 tables, found %', tables_count;
    END IF;

    IF functions_count < 10 THEN
        RAISE WARNING 'Expected 10 functions, found %', functions_count;
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Lessons Log Tables Created';
    RAISE NOTICE 'Tables: %', tables_count;
    RAISE NOTICE 'Functions: %', functions_count;
    RAISE NOTICE '========================================';
END $$;

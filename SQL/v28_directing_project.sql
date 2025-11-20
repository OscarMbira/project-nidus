-- ================================================
-- File: v28_directing_project.sql
-- Description: Structured PM Directing a Project (DP) module tables
-- Version: 1.1 (Fixed table dependency order)
-- Date: 2025-01-17
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v27 must be run first (all core tables must exist)
-- - projects table must exist
-- - users table must exist
-- - roles table must exist

-- Purpose:
-- Creates tables for Structured PM Directing a Project module:
-- 1. project_boards - Project Board composition and configuration
-- 2. board_members - Individual Project Board members
-- 3. board_meetings - Project Board meeting schedule and records (MOVED UP for dependency)
-- 4. board_meeting_attendees - Meeting attendance tracking (MOVED UP for dependency)
-- 5. project_authorizations - Authorization decisions (Stage, Project, Exception)
-- 6. ad_hoc_direction - Ad-hoc direction from Project Board
-- 7. board_decisions - Board decisions and actions log

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- TABLE 1: project_boards
-- Description: Project Board composition and configuration
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS project_boards (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Board Information
    board_name VARCHAR(200) NOT NULL,
    board_description TEXT,
    board_charter TEXT, -- Board charter/terms of reference

    -- Configuration
    meeting_frequency VARCHAR(50), -- 'weekly', 'bi-weekly', 'monthly', 'as-needed'
    meeting_day VARCHAR(20), -- 'Monday', 'Tuesday', etc.
    meeting_time TIME,
    meeting_duration_minutes INTEGER DEFAULT 60,

    -- Status
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'suspended', 'dissolved'
    established_date DATE NOT NULL,
    dissolved_date DATE,

    -- Contact
    board_secretary_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

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
    CONSTRAINT project_boards_unique_project UNIQUE (project_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_boards_project_id ON project_boards(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_boards_status ON project_boards(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_boards_secretary ON project_boards(board_secretary_user_id) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_project_boards_updated_at ON project_boards;
CREATE TRIGGER trg_project_boards_updated_at
    BEFORE UPDATE ON project_boards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 2: board_members
-- Description: Individual Project Board members
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS board_members (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    board_id UUID NOT NULL REFERENCES project_boards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Member Role
    board_role VARCHAR(100) NOT NULL, -- 'Executive', 'Senior User', 'Senior Supplier', 'Member'
    board_role_description TEXT,

    -- Responsibility Areas
    responsibilities TEXT,
    authority_level VARCHAR(50), -- 'decision-maker', 'advisor', 'observer'

    -- Voting Rights
    has_voting_rights BOOLEAN DEFAULT TRUE,
    can_authorize_stages BOOLEAN DEFAULT TRUE,
    can_authorize_exceptions BOOLEAN DEFAULT TRUE,

    -- Status
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'removed'
    appointment_date DATE NOT NULL,
    removal_date DATE,

    -- Contact Preferences
    send_meeting_invites BOOLEAN DEFAULT TRUE,
    send_status_reports BOOLEAN DEFAULT TRUE,
    send_exception_alerts BOOLEAN DEFAULT TRUE,

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
    CONSTRAINT board_members_unique_user_board UNIQUE (board_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_board_members_board_id ON board_members(board_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_board_members_user_id ON board_members(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_board_members_role ON board_members(board_role) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_board_members_status ON board_members(status) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_board_members_updated_at ON board_members;
CREATE TRIGGER trg_board_members_updated_at
    BEFORE UPDATE ON board_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 3: board_meetings
-- Description: Project Board meeting schedule and records
-- Category: structured
-- NOTE: Moved before project_authorizations to resolve dependency
-- ================================================

CREATE TABLE IF NOT EXISTS board_meetings (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    board_id UUID NOT NULL REFERENCES project_boards(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Meeting Information
    meeting_title VARCHAR(200) NOT NULL,
    meeting_type VARCHAR(100) DEFAULT 'regular', -- 'regular', 'ad-hoc', 'emergency', 'stage-gate', 'closure'
    meeting_reference VARCHAR(100), -- Meeting number/code

    -- Schedule
    scheduled_date DATE NOT NULL,
    scheduled_start_time TIME,
    scheduled_end_time TIME,
    scheduled_duration_minutes INTEGER DEFAULT 60,

    -- Actual
    actual_start_time TIMESTAMP,
    actual_end_time TIMESTAMP,

    -- Location
    meeting_location VARCHAR(200),
    meeting_location_type VARCHAR(50) DEFAULT 'virtual', -- 'in-person', 'virtual', 'hybrid'
    meeting_link TEXT, -- Video conference link

    -- Agenda
    agenda TEXT,
    agenda_document_url TEXT,

    -- Minutes
    minutes TEXT,
    minutes_document_url TEXT,
    minutes_approved BOOLEAN DEFAULT FALSE,
    minutes_approved_date DATE,

    -- Attendance
    quorum_required INTEGER,
    quorum_met BOOLEAN,

    -- Status
    status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'in-progress', 'completed', 'cancelled', 'postponed'
    cancellation_reason TEXT,

    -- Follow-up
    next_meeting_date DATE,

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
CREATE INDEX IF NOT EXISTS idx_board_meetings_board_id ON board_meetings(board_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_board_meetings_project_id ON board_meetings(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_board_meetings_date ON board_meetings(scheduled_date) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_board_meetings_status ON board_meetings(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_board_meetings_type ON board_meetings(meeting_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_board_meetings_reference ON board_meetings(meeting_reference) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_board_meetings_updated_at ON board_meetings;
CREATE TRIGGER trg_board_meetings_updated_at
    BEFORE UPDATE ON board_meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 4: board_meeting_attendees
-- Description: Track who attended each board meeting
-- Category: structured
-- NOTE: Moved before project_authorizations to maintain logical order
-- ================================================

CREATE TABLE IF NOT EXISTS board_meeting_attendees (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    meeting_id UUID NOT NULL REFERENCES board_meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Attendance
    attendance_status VARCHAR(50) DEFAULT 'invited', -- 'invited', 'accepted', 'declined', 'attended', 'absent', 'late'
    response_date TIMESTAMP,
    attendance_type VARCHAR(50), -- 'in-person', 'virtual', 'proxy'

    -- Role in Meeting
    meeting_role VARCHAR(100), -- 'Chair', 'Member', 'Secretary', 'Presenter', 'Observer'

    -- Proxy
    proxy_for_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Arrival/Departure
    arrived_at TIMESTAMP,
    departed_at TIMESTAMP,

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
    CONSTRAINT board_meeting_attendees_unique UNIQUE (meeting_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_board_meeting_attendees_meeting_id ON board_meeting_attendees(meeting_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_board_meeting_attendees_user_id ON board_meeting_attendees(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_board_meeting_attendees_status ON board_meeting_attendees(attendance_status) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_board_meeting_attendees_updated_at ON board_meeting_attendees;
CREATE TRIGGER trg_board_meeting_attendees_updated_at
    BEFORE UPDATE ON board_meeting_attendees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 5: project_authorizations
-- Description: Authorization decisions (Stage, Project, Exception)
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS project_authorizations (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    board_id UUID REFERENCES project_boards(id) ON DELETE SET NULL,

    -- Authorization Type
    authorization_type VARCHAR(50) NOT NULL, -- 'project_initiation', 'stage', 'exception', 'project_closure'
    authorization_subject VARCHAR(200) NOT NULL, -- What is being authorized
    authorization_reference VARCHAR(100), -- Reference number/code

    -- Related Items
    stage_boundary_id UUID, -- Will reference stage_boundaries table
    exception_plan_id UUID, -- Will reference exception_plans table (created in v29)

    -- Request Information
    requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
    request_date DATE NOT NULL,
    request_rationale TEXT,

    -- Authorization Decision
    authorization_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'deferred', 'conditional'
    decision_date DATE,
    decision_rationale TEXT,
    conditions TEXT, -- Conditions attached to approval

    -- Approvers
    authorized_by UUID REFERENCES users(id) ON DELETE SET NULL,
    board_meeting_id UUID REFERENCES board_meetings(id) ON DELETE SET NULL,

    -- Financial Limits
    budget_authorized DECIMAL(15,2),
    budget_actual DECIMAL(15,2),

    -- Time Limits
    authorized_start_date DATE,
    authorized_end_date DATE,

    -- Documents
    authorization_document_url TEXT,
    supporting_documents_urls TEXT[],

    -- Validity
    valid_from DATE,
    valid_until DATE,
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_date DATE,
    revoked_by UUID REFERENCES users(id),
    revocation_reason TEXT,

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
CREATE INDEX IF NOT EXISTS idx_project_authorizations_project_id ON project_authorizations(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_authorizations_board_id ON project_authorizations(board_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_authorizations_type ON project_authorizations(authorization_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_authorizations_status ON project_authorizations(authorization_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_authorizations_reference ON project_authorizations(authorization_reference) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_authorizations_requested_by ON project_authorizations(requested_by) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_project_authorizations_updated_at ON project_authorizations;
CREATE TRIGGER trg_project_authorizations_updated_at
    BEFORE UPDATE ON project_authorizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 6: ad_hoc_direction
-- Description: Ad-hoc direction from Project Board
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS ad_hoc_direction (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    board_id UUID REFERENCES project_boards(id) ON DELETE SET NULL,

    -- Direction Information
    direction_subject VARCHAR(200) NOT NULL,
    direction_description TEXT NOT NULL,
    direction_category VARCHAR(100), -- 'guidance', 'instruction', 'clarification', 'escalation', 'other'
    direction_reference VARCHAR(100), -- Reference number

    -- Issued By
    issued_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    issued_date DATE NOT NULL,

    -- Directed To
    directed_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    directed_to_role VARCHAR(100), -- 'Project Manager', 'Team Manager', 'Project Support', etc.

    -- Priority
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    due_date DATE,

    -- Response Required
    response_required BOOLEAN DEFAULT FALSE,
    response_due_date DATE,
    response_text TEXT,
    response_date DATE,
    response_by UUID REFERENCES users(id),

    -- Status
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'acknowledged', 'completed', 'superseded', 'cancelled'
    acknowledged_date DATE,
    acknowledged_by UUID REFERENCES users(id),
    completion_date DATE,

    -- Documents
    attachment_urls TEXT[],

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
CREATE INDEX IF NOT EXISTS idx_ad_hoc_direction_project_id ON ad_hoc_direction(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_ad_hoc_direction_board_id ON ad_hoc_direction(board_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_ad_hoc_direction_issued_by ON ad_hoc_direction(issued_by_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_ad_hoc_direction_directed_to ON ad_hoc_direction(directed_to_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_ad_hoc_direction_status ON ad_hoc_direction(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_ad_hoc_direction_priority ON ad_hoc_direction(priority) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_ad_hoc_direction_category ON ad_hoc_direction(direction_category) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_ad_hoc_direction_updated_at ON ad_hoc_direction;
CREATE TRIGGER trg_ad_hoc_direction_updated_at
    BEFORE UPDATE ON ad_hoc_direction
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 7: board_decisions
-- Description: Board decisions and actions log
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS board_decisions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    meeting_id UUID REFERENCES board_meetings(id) ON DELETE SET NULL,
    board_id UUID NOT NULL REFERENCES project_boards(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Decision Information
    decision_subject VARCHAR(200) NOT NULL,
    decision_description TEXT NOT NULL,
    decision_reference VARCHAR(100), -- Decision number/code
    decision_category VARCHAR(100), -- 'strategic', 'financial', 'risk', 'resource', 'scope', 'schedule', 'other'

    -- Decision Details
    decision_type VARCHAR(50) NOT NULL, -- 'approval', 'rejection', 'deferral', 'conditional', 'recommendation'
    decision_date DATE NOT NULL,
    decision_rationale TEXT,

    -- Related Authorization
    authorization_id UUID REFERENCES project_authorizations(id) ON DELETE SET NULL,

    -- Voting
    votes_for INTEGER DEFAULT 0,
    votes_against INTEGER DEFAULT 0,
    votes_abstain INTEGER DEFAULT 0,
    unanimous BOOLEAN DEFAULT FALSE,

    -- Impact
    impact_on_budget DECIMAL(15,2),
    impact_on_schedule_days INTEGER,
    impact_on_scope TEXT,
    impact_on_risks TEXT,

    -- Action Items
    action_required BOOLEAN DEFAULT FALSE,
    action_owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_due_date DATE,
    action_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in-progress', 'completed', 'overdue'
    action_completion_date DATE,

    -- Review
    review_required BOOLEAN DEFAULT FALSE,
    review_date DATE,
    review_notes TEXT,

    -- Documents
    decision_document_url TEXT,
    supporting_documents_urls TEXT[],

    -- Status
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'superseded', 'revoked'
    superseded_by_decision_id UUID REFERENCES board_decisions(id) ON DELETE SET NULL,

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
CREATE INDEX IF NOT EXISTS idx_board_decisions_board_id ON board_decisions(board_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_board_decisions_project_id ON board_decisions(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_board_decisions_meeting_id ON board_decisions(meeting_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_board_decisions_date ON board_decisions(decision_date) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_board_decisions_type ON board_decisions(decision_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_board_decisions_category ON board_decisions(decision_category) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_board_decisions_status ON board_decisions(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_board_decisions_reference ON board_decisions(decision_reference) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_board_decisions_action_owner ON board_decisions(action_owner_user_id) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_board_decisions_updated_at ON board_decisions;
CREATE TRIGGER trg_board_decisions_updated_at
    BEFORE UPDATE ON board_decisions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- Register Tables in database_tables Registry
-- ================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('project_boards', 'Project Board composition and configuration for Structured PM governance', false, true),
  ('board_members', 'Individual Project Board members with roles and responsibilities', false, true),
  ('board_meetings', 'Project Board meeting schedule, agendas, and minutes', false, true),
  ('board_meeting_attendees', 'Attendance tracking for Project Board meetings', false, true),
  ('project_authorizations', 'Authorization decisions for stages, exceptions, and project milestones', false, true),
  ('ad_hoc_direction', 'Ad-hoc direction and guidance from Project Board to project team', false, true),
  ('board_decisions', 'Board decisions, actions, and outcomes log', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- ================================================
-- End of v28_directing_project.sql
-- ================================================

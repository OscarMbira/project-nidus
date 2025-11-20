-- ================================================
-- File: v22_scrum_events.sql
-- Description: Scrum events tables (Daily Scrum, Sprint Review, Sprint Retrospective)
-- Version: 1.0
-- Date: 2025-01-XX
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v21 must be run first (all core tables must exist)
-- - sprints table must exist (from v08_scrum_tables.sql)
-- - user_stories table must exist (from v08_scrum_tables.sql)
-- - users table must exist

-- Purpose:
-- Creates tables for Scrum events:
-- 1. daily_scrum_notes - Daily standup notes
-- 2. standup_blockers - Blockers identified during standups
-- 3. team_availability - Team member availability tracking
-- 4. sprint_review_feedback - Stakeholder feedback from sprint reviews
-- 5. sprint_review_attendance - Attendance tracking for sprint reviews
-- 6. retrospective_items - Items from sprint retrospectives
-- 7. retrospective_action_items - Action items from retrospectives

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- TABLE 1: daily_scrum_notes
-- Description: Daily standup notes for team members
-- Category: scrum
-- ================================================

CREATE TABLE IF NOT EXISTS daily_scrum_notes (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Standup Date
    standup_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Three Questions
    what_did_i_do_yesterday TEXT,
    what_will_i_do_today TEXT,
    any_blockers TEXT,

    -- Additional Notes
    additional_notes TEXT,
    
    -- Status
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,

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
CREATE INDEX IF NOT EXISTS idx_daily_scrum_notes_sprint_id ON daily_scrum_notes(sprint_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_daily_scrum_notes_user_id ON daily_scrum_notes(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_daily_scrum_notes_standup_date ON daily_scrum_notes(standup_date) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_daily_scrum_notes_project_id ON daily_scrum_notes(project_id) WHERE is_deleted = FALSE;

-- Unique constraint: one standup note per user per sprint per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_scrum_notes_unique 
ON daily_scrum_notes(sprint_id, user_id, standup_date) 
WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_daily_scrum_notes_before_insert ON daily_scrum_notes;
CREATE TRIGGER trg_daily_scrum_notes_before_insert
    BEFORE INSERT ON daily_scrum_notes
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_daily_scrum_notes_before_update ON daily_scrum_notes;
CREATE TRIGGER trg_daily_scrum_notes_before_update
    BEFORE UPDATE ON daily_scrum_notes
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE daily_scrum_notes IS 'Daily standup notes for Scrum team members';
COMMENT ON COLUMN daily_scrum_notes.standup_date IS 'Date of the standup meeting';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('daily_scrum_notes', 'Daily standup notes for Scrum team members', false, true, 'scrum')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 2: standup_blockers
-- Description: Blockers identified during daily standups
-- Category: scrum
-- ================================================

CREATE TABLE IF NOT EXISTS standup_blockers (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    daily_scrum_note_id UUID NOT NULL REFERENCES daily_scrum_notes(id) ON DELETE CASCADE,
    sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Blocker Information
    blocker_description TEXT NOT NULL,
    blocker_priority VARCHAR(50) DEFAULT 'medium',  -- 'low', 'medium', 'high', 'critical'
    blocker_type VARCHAR(50),  -- 'technical', 'resource', 'dependency', 'external', 'other'
    
    -- Resolution
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT,
    
    -- Assignment
    assigned_to_user_id UUID REFERENCES users(id),  -- Who is working on resolving this blocker

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
CREATE INDEX IF NOT EXISTS idx_standup_blockers_daily_scrum_note_id ON standup_blockers(daily_scrum_note_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_standup_blockers_sprint_id ON standup_blockers(sprint_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_standup_blockers_project_id ON standup_blockers(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_standup_blockers_user_id ON standup_blockers(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_standup_blockers_resolved ON standup_blockers(is_resolved) WHERE is_deleted = FALSE AND is_resolved = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_standup_blockers_before_insert ON standup_blockers;
CREATE TRIGGER trg_standup_blockers_before_insert
    BEFORE INSERT ON standup_blockers
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_standup_blockers_before_update ON standup_blockers;
CREATE TRIGGER trg_standup_blockers_before_update
    BEFORE UPDATE ON standup_blockers
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE standup_blockers IS 'Blockers identified during daily standups';
COMMENT ON COLUMN standup_blockers.blocker_priority IS 'Priority level: low, medium, high, critical';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('standup_blockers', 'Blockers identified during daily standups', false, true, 'scrum')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 3: team_availability
-- Description: Team member availability tracking for sprints
-- Category: scrum
-- ================================================

CREATE TABLE IF NOT EXISTS team_availability (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Availability Date
    availability_date DATE NOT NULL,

    -- Availability Status
    availability_status VARCHAR(50) DEFAULT 'available',  -- 'available', 'partial', 'unavailable', 'on_leave'
    hours_available DECIMAL(4,2),  -- Hours available on this date (e.g., 4.0 for half day)
    notes TEXT,  -- Reason for unavailability or partial availability

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
CREATE INDEX IF NOT EXISTS idx_team_availability_sprint_id ON team_availability(sprint_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_team_availability_user_id ON team_availability(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_team_availability_date ON team_availability(availability_date) WHERE is_deleted = FALSE;

-- Unique constraint: one availability record per user per sprint per date
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_availability_unique 
ON team_availability(sprint_id, user_id, availability_date) 
WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_team_availability_before_insert ON team_availability;
CREATE TRIGGER trg_team_availability_before_insert
    BEFORE INSERT ON team_availability
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_team_availability_before_update ON team_availability;
CREATE TRIGGER trg_team_availability_before_update
    BEFORE UPDATE ON team_availability
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE team_availability IS 'Team member availability tracking for sprints';
COMMENT ON COLUMN team_availability.availability_status IS 'Status: available, partial, unavailable, on_leave';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('team_availability', 'Team member availability tracking for sprints', false, true, 'scrum')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 4: sprint_review_feedback
-- Description: Stakeholder feedback from sprint reviews
-- Category: scrum
-- ================================================

CREATE TABLE IF NOT EXISTS sprint_review_feedback (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_story_id UUID REFERENCES user_stories(id) ON DELETE SET NULL,  -- Optional: feedback on specific story
    feedback_provider_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Feedback Content
    feedback_text TEXT NOT NULL,
    feedback_type VARCHAR(50) DEFAULT 'general',  -- 'general', 'story_feedback', 'demo_feedback', 'improvement'
    feedback_rating INTEGER,  -- 1-5 rating (optional)
    
    -- Action Items
    requires_action BOOLEAN DEFAULT FALSE,
    action_item_description TEXT,

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
CREATE INDEX IF NOT EXISTS idx_sprint_review_feedback_sprint_id ON sprint_review_feedback(sprint_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sprint_review_feedback_project_id ON sprint_review_feedback(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sprint_review_feedback_user_story_id ON sprint_review_feedback(user_story_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sprint_review_feedback_provider ON sprint_review_feedback(feedback_provider_user_id) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_sprint_review_feedback_before_insert ON sprint_review_feedback;
CREATE TRIGGER trg_sprint_review_feedback_before_insert
    BEFORE INSERT ON sprint_review_feedback
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_sprint_review_feedback_before_update ON sprint_review_feedback;
CREATE TRIGGER trg_sprint_review_feedback_before_update
    BEFORE UPDATE ON sprint_review_feedback
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE sprint_review_feedback IS 'Stakeholder feedback from sprint reviews';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('sprint_review_feedback', 'Stakeholder feedback from sprint reviews', false, true, 'scrum')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 5: sprint_review_attendance
-- Description: Attendance tracking for sprint reviews
-- Category: scrum
-- ================================================

CREATE TABLE IF NOT EXISTS sprint_review_attendance (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Attendance Information
    attendance_status VARCHAR(50) DEFAULT 'attended',  -- 'attended', 'absent', 'late', 'excused'
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
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
CREATE INDEX IF NOT EXISTS idx_sprint_review_attendance_sprint_id ON sprint_review_attendance(sprint_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sprint_review_attendance_user_id ON sprint_review_attendance(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sprint_review_attendance_date ON sprint_review_attendance(attendance_date) WHERE is_deleted = FALSE;

-- Unique constraint: one attendance record per user per sprint
CREATE UNIQUE INDEX IF NOT EXISTS idx_sprint_review_attendance_unique 
ON sprint_review_attendance(sprint_id, user_id) 
WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_sprint_review_attendance_before_insert ON sprint_review_attendance;
CREATE TRIGGER trg_sprint_review_attendance_before_insert
    BEFORE INSERT ON sprint_review_attendance
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_sprint_review_attendance_before_update ON sprint_review_attendance;
CREATE TRIGGER trg_sprint_review_attendance_before_update
    BEFORE UPDATE ON sprint_review_attendance
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE sprint_review_attendance IS 'Attendance tracking for sprint reviews';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('sprint_review_attendance', 'Attendance tracking for sprint reviews', false, true, 'scrum')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 6: retrospective_items
-- Description: Items from sprint retrospectives
-- Category: scrum
-- ================================================

CREATE TABLE IF NOT EXISTS retrospective_items (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- Who added this item

    -- Item Information
    item_text TEXT NOT NULL,
    item_category VARCHAR(50) NOT NULL,  -- 'went_well', 'didnt_go_well', 'improvements', 'actions', 'appreciations'
    item_type VARCHAR(50) DEFAULT 'general',  -- 'general', 'process', 'technical', 'team', 'communication'
    
    -- Voting/Prioritization
    vote_count INTEGER DEFAULT 0,  -- Number of votes/upvotes this item received
    
    -- Grouping
    grouped_with_item_id UUID REFERENCES retrospective_items(id) ON DELETE SET NULL,  -- For grouping similar items

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
CREATE INDEX IF NOT EXISTS idx_retrospective_items_sprint_id ON retrospective_items(sprint_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_retrospective_items_project_id ON retrospective_items(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_retrospective_items_category ON retrospective_items(item_category) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_retrospective_items_user_id ON retrospective_items(user_id) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_retrospective_items_before_insert ON retrospective_items;
CREATE TRIGGER trg_retrospective_items_before_insert
    BEFORE INSERT ON retrospective_items
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_retrospective_items_before_update ON retrospective_items;
CREATE TRIGGER trg_retrospective_items_before_update
    BEFORE UPDATE ON retrospective_items
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE retrospective_items IS 'Items from sprint retrospectives';
COMMENT ON COLUMN retrospective_items.item_category IS 'Category: went_well, didnt_go_well, improvements, actions, appreciations';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('retrospective_items', 'Items from sprint retrospectives', false, true, 'scrum')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 7: retrospective_action_items
-- Description: Action items from sprint retrospectives
-- Category: scrum
-- ================================================

CREATE TABLE IF NOT EXISTS retrospective_action_items (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    retrospective_item_id UUID REFERENCES retrospective_items(id) ON DELETE SET NULL,  -- Optional: linked to a retro item
    assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Action Item Information
    action_description TEXT NOT NULL,
    action_priority VARCHAR(50) DEFAULT 'medium',  -- 'low', 'medium', 'high', 'critical'
    target_completion_date DATE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'open',  -- 'open', 'in_progress', 'completed', 'cancelled'
    completed_at TIMESTAMP,
    completion_notes TEXT,

    -- Next Sprint Tracking
    carried_to_next_sprint BOOLEAN DEFAULT FALSE,
    next_sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,

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
CREATE INDEX IF NOT EXISTS idx_retrospective_action_items_sprint_id ON retrospective_action_items(sprint_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_retrospective_action_items_project_id ON retrospective_action_items(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_retrospective_action_items_assigned_to ON retrospective_action_items(assigned_to_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_retrospective_action_items_status ON retrospective_action_items(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_retrospective_action_items_next_sprint ON retrospective_action_items(next_sprint_id) WHERE is_deleted = FALSE AND carried_to_next_sprint = TRUE;

-- Triggers
DROP TRIGGER IF EXISTS trg_retrospective_action_items_before_insert ON retrospective_action_items;
CREATE TRIGGER trg_retrospective_action_items_before_insert
    BEFORE INSERT ON retrospective_action_items
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_retrospective_action_items_before_update ON retrospective_action_items;
CREATE TRIGGER trg_retrospective_action_items_before_update
    BEFORE UPDATE ON retrospective_action_items
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE retrospective_action_items IS 'Action items from sprint retrospectives';
COMMENT ON COLUMN retrospective_action_items.status IS 'Status: open, in_progress, completed, cancelled';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('retrospective_action_items', 'Action items from sprint retrospectives', false, true, 'scrum')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_tables_count INTEGER;
BEGIN
    -- Count Scrum events tables
    SELECT COUNT(*)
    INTO v_tables_count
    FROM database_tables
    WHERE table_category = 'scrum'
      AND table_name IN (
          'daily_scrum_notes',
          'standup_blockers',
          'team_availability',
          'sprint_review_feedback',
          'sprint_review_attendance',
          'retrospective_items',
          'retrospective_action_items'
      )
      AND is_deleted = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Scrum Events Tables Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Scrum Events Tables Created: %', v_tables_count;
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v22_scrum_events.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================


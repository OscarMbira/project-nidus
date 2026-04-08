-- ============================================================================
-- Issue Register Implementation - Comprehensive Issue Management Module
-- Version: v174
-- Description: Creates comprehensive Issue Register structure with RFC, Off-spec, and Problem types
-- Date: 2026-01-19
-- ============================================================================
--
-- Purpose:
-- Implements the Issue Register module based on structured project management methodology.
-- The Issue Register is a formal project control document that captures and tracks all issues
-- requiring management attention. Unlike risks (uncertain events that might happen), issues
-- are events or situations that have already happened or are certain to happen.
--
-- Strategy:
-- 1. Create issue_registers header table (one per project)
-- 2. Enhance existing issues table with Issue Register fields
-- 3. Add supporting tables (actions, decisions, status_history, links, watchers, scales)
-- 4. Create functions for reference generation, auto-creation, transfers
-- 5. Set up RLS policies
--
-- Prerequisites:
-- - v25_issue_management.sql must be run first (issues table exists)
-- - v01 through v07 must be run first (core tables and trigger functions)
-- - v84_accounts_and_extensions.sql must be run (accounts table)
-- - projects table must exist
-- - users table must exist
-- - accounts table must exist (for scales)
--
-- ============================================================================
-- SECTION 1: CREATE ISSUE_REGISTERS HEADER TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS issue_registers (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship (One register per project)
    project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Register Identification
    register_reference VARCHAR(50) UNIQUE NOT NULL, -- e.g., IR-2026-001
    document_ref VARCHAR(100), -- External document reference
    version_number VARCHAR(20) DEFAULT '1.0',
    programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL,

    -- Configuration
    update_process TEXT, -- Defined process for updates
    escalation_threshold TEXT, -- When to escalate
    priority_scale JSONB, -- Defined priority scale
    severity_scale JSONB, -- Defined severity scale

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
CREATE INDEX IF NOT EXISTS idx_issue_registers_project_id ON issue_registers(project_id);
CREATE INDEX IF NOT EXISTS idx_issue_registers_register_reference ON issue_registers(register_reference);
CREATE INDEX IF NOT EXISTS idx_issue_registers_is_active ON issue_registers(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_issue_registers_is_deleted ON issue_registers(is_deleted) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_issue_registers_before_insert ON issue_registers;
CREATE TRIGGER trg_issue_registers_before_insert
    BEFORE INSERT ON issue_registers
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_issue_registers_before_update ON issue_registers;
CREATE TRIGGER trg_issue_registers_before_update
    BEFORE UPDATE ON issue_registers
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE issue_registers IS 'Issue Register header - one register per project for comprehensive issue management';
COMMENT ON COLUMN issue_registers.register_reference IS 'Unique reference number (e.g., IR-2026-001)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('issue_registers', 'Issue Register header - one register per project for comprehensive issue management', false, true, 'issues')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 2: ENHANCE EXISTING issues TABLE
-- ============================================================================

-- Add Issue Register fields to existing issues table
DO $$
BEGIN
    -- Add issue_register_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'issue_register_id') THEN
        ALTER TABLE issues ADD COLUMN issue_register_id UUID REFERENCES issue_registers(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_issues_issue_register_id ON issues(issue_register_id) WHERE is_deleted = FALSE;
    END IF;

    -- Add issue_identifier if it doesn't exist (e.g., ISS-2026-001)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'issue_identifier') THEN
        ALTER TABLE issues ADD COLUMN issue_identifier VARCHAR(50);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_issues_issue_identifier_unique 
        ON issues(issue_identifier) WHERE is_deleted = FALSE AND issue_identifier IS NOT NULL;
    END IF;

    -- Add issue_number if it doesn't exist (sequential within register)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'issue_number') THEN
        ALTER TABLE issues ADD COLUMN issue_number INTEGER;
    END IF;

    -- Add Issue Register specific issue_type enum values
    -- Note: We'll use VARCHAR instead of ENUM for flexibility
    -- The existing issue_type column already exists as VARCHAR(50)

    -- Add issue_category enum values if needed (scope, schedule, cost, quality, etc.)
    -- The existing issue_category column already exists as VARCHAR(50)

    -- Add sub_category if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'sub_category') THEN
        ALTER TABLE issues ADD COLUMN sub_category VARCHAR(100);
    END IF;

    -- Add cause_description if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'cause_description') THEN
        ALTER TABLE issues ADD COLUMN cause_description TEXT;
    END IF;

    -- Add priority_rationale if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'priority_rationale') THEN
        ALTER TABLE issues ADD COLUMN priority_rationale TEXT;
    END IF;

    -- Add severity_rationale if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'severity_rationale') THEN
        ALTER TABLE issues ADD COLUMN severity_rationale TEXT;
    END IF;

    -- Add urgency if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'urgency') THEN
        ALTER TABLE issues ADD COLUMN urgency VARCHAR(50); -- 'immediate', 'this_week', 'this_stage', 'can_wait'
    END IF;

    -- Add cost_impact if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'cost_impact') THEN
        ALTER TABLE issues ADD COLUMN cost_impact DECIMAL(15, 2);
    END IF;

    -- Add schedule_impact_days if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'schedule_impact_days') THEN
        ALTER TABLE issues ADD COLUMN schedule_impact_days INTEGER;
    END IF;

    -- Add quality_impact if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'quality_impact') THEN
        ALTER TABLE issues ADD COLUMN quality_impact TEXT;
    END IF;

    -- Add scope_impact if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'scope_impact') THEN
        ALTER TABLE issues ADD COLUMN scope_impact TEXT;
    END IF;

    -- Add affects_baseline if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'affects_baseline') THEN
        ALTER TABLE issues ADD COLUMN affects_baseline BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add date_raised if it doesn't exist (use created_at as fallback)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'date_raised') THEN
        ALTER TABLE issues ADD COLUMN date_raised DATE;
    END IF;

    -- Add raised_by_id if it doesn't exist (map to reported_by_user_id)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'raised_by_id') THEN
        ALTER TABLE issues ADD COLUMN raised_by_id UUID REFERENCES users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_issues_raised_by_id ON issues(raised_by_id) WHERE is_deleted = FALSE;
    END IF;

    -- Add raised_by_name if it doesn't exist (for external reporters)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'raised_by_name') THEN
        ALTER TABLE issues ADD COLUMN raised_by_name VARCHAR(200);
    END IF;

    -- Add author_id if it doesn't exist (who documented the issue)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'author_id') THEN
        ALTER TABLE issues ADD COLUMN author_id UUID REFERENCES users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_issues_author_id ON issues(author_id) WHERE is_deleted = FALSE;
    END IF;

    -- Add author_name if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'author_name') THEN
        ALTER TABLE issues ADD COLUMN author_name VARCHAR(200);
    END IF;

    -- Add owner_id if it doesn't exist (map to assigned_to_user_id)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'owner_id') THEN
        ALTER TABLE issues ADD COLUMN owner_id UUID REFERENCES users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_issues_owner_id ON issues(owner_id) WHERE is_deleted = FALSE;
    END IF;

    -- Add owner_name if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'owner_name') THEN
        ALTER TABLE issues ADD COLUMN owner_name VARCHAR(200);
    END IF;

    -- Add status_date if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'status_date') THEN
        ALTER TABLE issues ADD COLUMN status_date DATE;
    END IF;

    -- Add closure_date if it doesn't exist (map to closed_at)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'closure_date') THEN
        ALTER TABLE issues ADD COLUMN closure_date DATE;
    END IF;

    -- Add closure_reason if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'closure_reason') THEN
        ALTER TABLE issues ADD COLUMN closure_reason TEXT;
    END IF;

    -- Add resolution_description if it doesn't exist (map to resolution_notes)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'resolution_description') THEN
        ALTER TABLE issues ADD COLUMN resolution_description TEXT;
    END IF;

    -- Add resolution_date if it doesn't exist (map to resolved_at)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'resolution_date') THEN
        ALTER TABLE issues ADD COLUMN resolution_date DATE;
    END IF;

    -- Add resolved_by_id if it doesn't exist (map to resolved_by_user_id)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'resolved_by_id') THEN
        ALTER TABLE issues ADD COLUMN resolved_by_id UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    -- Add lessons_captured if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'lessons_captured') THEN
        ALTER TABLE issues ADD COLUMN lessons_captured BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add related_product_id if it doesn't exist (link to products)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'related_product_id') THEN
        ALTER TABLE issues ADD COLUMN related_product_id UUID REFERENCES product_deliverables(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_issues_related_product_id ON issues(related_product_id) WHERE is_deleted = FALSE;
    END IF;

    -- Add related_product_name if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'related_product_name') THEN
        ALTER TABLE issues ADD COLUMN related_product_name VARCHAR(200);
    END IF;

    -- Add transferred_to_risk_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'transferred_to_risk_id') THEN
        ALTER TABLE issues ADD COLUMN transferred_to_risk_id UUID REFERENCES risks(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_issues_transferred_to_risk_id ON issues(transferred_to_risk_id) WHERE is_deleted = FALSE;
    END IF;

    -- Add escalated_from_risk_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'escalated_from_risk_id') THEN
        ALTER TABLE issues ADD COLUMN escalated_from_risk_id UUID REFERENCES risks(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_issues_escalated_from_risk_id ON issues(escalated_from_risk_id) WHERE is_deleted = FALSE;
    END IF;

    -- Add change_request_id if it doesn't exist (for RFCs)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'change_request_id') THEN
        ALTER TABLE issues ADD COLUMN change_request_id UUID REFERENCES change_requests(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_issues_change_request_id ON issues(change_request_id) WHERE is_deleted = FALSE;
    END IF;

    -- Add related_work_package_id if it doesn't exist (map to work_package_id)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'related_work_package_id') THEN
        ALTER TABLE issues ADD COLUMN related_work_package_id UUID REFERENCES work_packages(id) ON DELETE SET NULL;
    END IF;

    -- Update status enum to include Issue Register statuses
    -- Note: status is already VARCHAR(50), so we can use any values
    -- The plan specifies: 'draft', 'raised', 'under_assessment', 'awaiting_decision', 
    -- 'approved', 'rejected', 'deferred', 'in_progress', 'resolved', 'closed', 'cancelled'

    -- Add unique constraint on (issue_register_id, issue_number)
    -- This will be added after we create the constraint function
END $$;

-- Create unique constraint on (issue_register_id, issue_number)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'issues_register_number_unique'
    ) THEN
        CREATE UNIQUE INDEX issues_register_number_unique 
        ON issues(issue_register_id, issue_number) 
        WHERE is_deleted = FALSE AND issue_register_id IS NOT NULL AND issue_number IS NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- SECTION 3: CREATE ISSUE_ACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS issue_actions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,

    -- Action Information
    action_number INTEGER NOT NULL, -- Sequential within issue
    action_description TEXT NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- 'investigation', 'corrective', 'preventive', 'workaround', 'escalation', 'communication', 'other'

    -- Assignment
    assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_to_name VARCHAR(200),

    -- Planning
    target_date DATE,
    estimated_effort_hours DECIMAL(10, 2),
    actual_effort_hours DECIMAL(10, 2),
    estimated_cost DECIMAL(15, 2),
    actual_cost DECIMAL(15, 2),

    -- Status
    status VARCHAR(50) DEFAULT 'planned', -- 'planned', 'in_progress', 'completed', 'cancelled', 'blocked'
    completion_date DATE,
    completion_notes TEXT,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_issue_actions_issue_id ON issue_actions(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_actions_assigned_to_id ON issue_actions(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_issue_actions_status ON issue_actions(status);
CREATE INDEX IF NOT EXISTS idx_issue_actions_target_date ON issue_actions(target_date) WHERE status != 'completed';

-- Unique constraint on (issue_id, action_number)
CREATE UNIQUE INDEX IF NOT EXISTS idx_issue_actions_issue_number_unique 
ON issue_actions(issue_id, action_number);

-- Triggers
DROP TRIGGER IF EXISTS trg_issue_actions_before_insert ON issue_actions;
CREATE TRIGGER trg_issue_actions_before_insert
    BEFORE INSERT ON issue_actions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_issue_actions_before_update ON issue_actions;
CREATE TRIGGER trg_issue_actions_before_update
    BEFORE UPDATE ON issue_actions
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE issue_actions IS 'Resolution actions for issues';
COMMENT ON COLUMN issue_actions.action_type IS 'Type: investigation, corrective, preventive, workaround, escalation, communication, other';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('issue_actions', 'Resolution actions for issues', false, true, 'issues')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 4: CREATE ISSUE_STATUS_HISTORY TABLE
-- ============================================================================

-- Note: issue_history table already exists from v25, but we'll create issue_status_history
-- for more specific status change tracking as per the plan

CREATE TABLE IF NOT EXISTS issue_status_history (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,

    -- Status Change Information
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_date TIMESTAMPTZ DEFAULT NOW(),
    changed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    change_reason TEXT,
    notes TEXT,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_issue_status_history_issue_id ON issue_status_history(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_status_history_changed_date ON issue_status_history(changed_date);
CREATE INDEX IF NOT EXISTS idx_issue_status_history_changed_by ON issue_status_history(changed_by);

-- Comments
COMMENT ON TABLE issue_status_history IS 'Status change audit trail for issues';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('issue_status_history', 'Status change audit trail for issues', false, true, 'issues')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 5: CREATE ISSUE_DECISIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS issue_decisions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,

    -- Decision Information
    decision_date DATE NOT NULL DEFAULT CURRENT_DATE,
    decision_type VARCHAR(50) NOT NULL, -- 'approve', 'reject', 'defer', 'escalate', 'accept_concession', 'request_more_info'
    decision_maker_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    decision_maker_name VARCHAR(200) NOT NULL,
    decision_maker_role VARCHAR(100), -- e.g., Project Board, PM, Change Authority
    decision_rationale TEXT NOT NULL,
    conditions TEXT, -- Any conditions attached
    review_date DATE, -- For deferred items

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_issue_decisions_issue_id ON issue_decisions(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_decisions_decision_date ON issue_decisions(decision_date);
CREATE INDEX IF NOT EXISTS idx_issue_decisions_decision_maker_id ON issue_decisions(decision_maker_id);
CREATE INDEX IF NOT EXISTS idx_issue_decisions_decision_type ON issue_decisions(decision_type);

-- Comments
COMMENT ON TABLE issue_decisions IS 'Decisions made on issues';
COMMENT ON COLUMN issue_decisions.decision_type IS 'Type: approve, reject, defer, escalate, accept_concession, request_more_info';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('issue_decisions', 'Decisions made on issues', false, true, 'issues')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 6: ENHANCE EXISTING issue_comments TABLE
-- ============================================================================

-- Add comment_type enum values if needed
-- The existing comment_type column already exists as VARCHAR(50)
-- Plan specifies: 'general', 'update', 'question', 'answer', 'decision'
-- Existing has: 'comment', 'status_change', 'assignment', 'resolution', 'system'

-- Add is_internal if it doesn't exist (PM-only visibility)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issue_comments' AND column_name = 'is_internal') THEN
        ALTER TABLE issue_comments ADD COLUMN is_internal BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Note: issue_comments already has is_internal_note, so we'll use that

-- ============================================================================
-- SECTION 7: ENHANCE EXISTING issue_attachments TABLE
-- ============================================================================

-- Add attachment_type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issue_attachments' AND column_name = 'attachment_type') THEN
        ALTER TABLE issue_attachments ADD COLUMN attachment_type VARCHAR(50); 
        -- 'evidence', 'analysis', 'proposal', 'decision', 'other'
    END IF;
END $$;

-- ============================================================================
-- SECTION 8: CREATE ISSUE_LINKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS issue_links (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    source_issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    target_issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,

    -- Link Information
    link_type VARCHAR(50) NOT NULL, -- 'related_to', 'duplicate_of', 'caused_by', 'blocks', 'blocked_by', 'parent_of', 'child_of'
    link_description TEXT,

    -- Audit Fields
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraint: prevent self-links
    CONSTRAINT chk_issue_links_no_self_link CHECK (source_issue_id != target_issue_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_issue_links_source_issue_id ON issue_links(source_issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_links_target_issue_id ON issue_links(target_issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_links_link_type ON issue_links(link_type);

-- Comments
COMMENT ON TABLE issue_links IS 'Issue interdependencies';
COMMENT ON COLUMN issue_links.link_type IS 'Type: related_to, duplicate_of, caused_by, blocks, blocked_by, parent_of, child_of';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('issue_links', 'Issue interdependencies', false, true, 'issues')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 9: CREATE ISSUE_WATCHERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS issue_watchers (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Notification Preferences
    notification_preference VARCHAR(50) DEFAULT 'all_updates', -- 'all_updates', 'status_changes', 'decisions_only'

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraint: one watcher entry per user per issue
    CONSTRAINT issue_watchers_unique UNIQUE (issue_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_issue_watchers_issue_id ON issue_watchers(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_watchers_user_id ON issue_watchers(user_id);

-- Comments
COMMENT ON TABLE issue_watchers IS 'Stakeholders watching issues';
COMMENT ON COLUMN issue_watchers.notification_preference IS 'Preference: all_updates, status_changes, decisions_only';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('issue_watchers', 'Stakeholders watching issues', false, true, 'issues')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 10: CREATE ISSUE_PRIORITY_SCALES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS issue_priority_scales (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    organisation_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

    -- Scale Information
    scale_value VARCHAR(50) NOT NULL, -- 'critical', 'high', 'medium', 'low'
    scale_label VARCHAR(100) NOT NULL,
    scale_order INTEGER NOT NULL,
    description TEXT,
    response_time VARCHAR(100), -- Expected response time
    color_code VARCHAR(20), -- Hex color code

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraint: unique scale value per organisation
    CONSTRAINT issue_priority_scales_unique UNIQUE (organisation_id, scale_value)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_issue_priority_scales_organisation_id ON issue_priority_scales(organisation_id);
CREATE INDEX IF NOT EXISTS idx_issue_priority_scales_is_active ON issue_priority_scales(is_active) WHERE is_active = TRUE;

-- Comments
COMMENT ON TABLE issue_priority_scales IS 'Configurable priority scales per organisation';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('issue_priority_scales', 'Configurable priority scales per organisation', false, true, 'issues')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 11: CREATE ISSUE_SEVERITY_SCALES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS issue_severity_scales (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    organisation_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

    -- Scale Information
    scale_value VARCHAR(50) NOT NULL, -- 'critical', 'major', 'moderate', 'minor'
    scale_label VARCHAR(100) NOT NULL,
    scale_order INTEGER NOT NULL,
    description TEXT,
    impact_description TEXT,
    color_code VARCHAR(20), -- Hex color code

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraint: unique scale value per organisation
    CONSTRAINT issue_severity_scales_unique UNIQUE (organisation_id, scale_value)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_issue_severity_scales_organisation_id ON issue_severity_scales(organisation_id);
CREATE INDEX IF NOT EXISTS idx_issue_severity_scales_is_active ON issue_severity_scales(is_active) WHERE is_active = TRUE;

-- Comments
COMMENT ON TABLE issue_severity_scales IS 'Configurable severity scales per organisation';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('issue_severity_scales', 'Configurable severity scales per organisation', false, true, 'issues')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 12: DATABASE FUNCTIONS
-- ============================================================================

-- Function: Generate Issue Register Reference
CREATE OR REPLACE FUNCTION generate_issue_register_reference()
RETURNS VARCHAR AS $$
DECLARE
    v_year INTEGER;
    v_sequence INTEGER;
    v_reference VARCHAR(50);
BEGIN
    v_year := EXTRACT(YEAR FROM NOW());
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(register_reference FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO v_sequence
    FROM issue_registers
    WHERE register_reference LIKE 'IR-' || v_year || '-%'
      AND is_deleted = FALSE;
    
    v_reference := 'IR-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0');
    
    RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate Issue Identifier
CREATE OR REPLACE FUNCTION generate_issue_identifier(p_issue_register_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_year INTEGER;
    v_sequence INTEGER;
    v_identifier VARCHAR(50);
BEGIN
    v_year := EXTRACT(YEAR FROM NOW());
    
    -- Get next issue number for this register
    SELECT COALESCE(MAX(issue_number), 0) + 1
    INTO v_sequence
    FROM issues
    WHERE issue_register_id = p_issue_register_id
      AND is_deleted = FALSE;
    
    v_identifier := 'ISS-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0');
    
    RETURN v_identifier;
END;
$$ LANGUAGE plpgsql;

-- Function: Create Issue Register for Project
CREATE OR REPLACE FUNCTION create_issue_register_for_project(p_project_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_register_id UUID;
    v_reference VARCHAR(50);
    v_organisation_id UUID;
BEGIN
    -- Get organisation_id from project
    SELECT organisation_id INTO v_organisation_id
    FROM projects
    WHERE id = p_project_id;
    
    -- Generate reference
    v_reference := generate_issue_register_reference();
    
    -- Create register
    INSERT INTO issue_registers (
        project_id,
        register_reference,
        version_number,
        created_by,
        updated_by
    ) VALUES (
        p_project_id,
        v_reference,
        '1.0',
        p_user_id,
        p_user_id
    ) RETURNING id INTO v_register_id;
    
    RETURN v_register_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Transfer Issue to Risk
CREATE OR REPLACE FUNCTION transfer_issue_to_risk(p_issue_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_issue RECORD;
    v_risk_id UUID;
    v_risk_register_id UUID;
BEGIN
    -- Get issue details
    SELECT * INTO v_issue
    FROM issues
    WHERE id = p_issue_id;
    
    -- Get or create risk register for the project
    SELECT id INTO v_risk_register_id
    FROM risk_registers
    WHERE project_id = v_issue.project_id
      AND is_deleted = FALSE;
    
    IF v_risk_register_id IS NULL THEN
        -- Create risk register if it doesn't exist
        SELECT create_risk_register_for_project(v_issue.project_id, p_user_id) INTO v_risk_register_id;
    END IF;
    
    -- Create risk from issue
    INSERT INTO risks (
        risk_register_id,
        project_id,
        risk_title,
        risk_description,
        probability,
        impact,
        risk_score,
        status,
        raised_by_user_id,
        created_by,
        updated_by
    ) VALUES (
        v_risk_register_id,
        v_issue.project_id,
        v_issue.issue_title,
        v_issue.issue_description,
        3, -- Default probability
        3, -- Default impact
        9, -- Default score
        'identified',
        COALESCE(v_issue.raised_by_id, v_issue.reported_by_user_id),
        p_user_id,
        p_user_id
    ) RETURNING id INTO v_risk_id;
    
    -- Update issue with risk link
    UPDATE issues
    SET transferred_to_risk_id = v_risk_id,
        status = 'closed',
        closure_reason = 'Transferred to Risk Register',
        updated_by = p_user_id
    WHERE id = p_issue_id;
    
    RETURN v_risk_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Create Issue from Risk
CREATE OR REPLACE FUNCTION create_issue_from_risk(p_risk_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_risk RECORD;
    v_issue_id UUID;
    v_issue_register_id UUID;
    v_issue_identifier VARCHAR(50);
    v_issue_number INTEGER;
BEGIN
    -- Get risk details
    SELECT * INTO v_risk
    FROM risks
    WHERE id = p_risk_id;
    
    -- Get or create issue register for the project
    SELECT id INTO v_issue_register_id
    FROM issue_registers
    WHERE project_id = v_risk.project_id
      AND is_deleted = FALSE;
    
    IF v_issue_register_id IS NULL THEN
        -- Create issue register if it doesn't exist
        SELECT create_issue_register_for_project(v_risk.project_id, p_user_id) INTO v_issue_register_id;
    END IF;
    
    -- Get next issue number
    SELECT COALESCE(MAX(issue_number), 0) + 1 INTO v_issue_number
    FROM issues
    WHERE issue_register_id = v_issue_register_id
      AND is_deleted = FALSE;
    
    -- Generate identifier
    v_issue_identifier := generate_issue_identifier(v_issue_register_id);
    
    -- Create issue from risk
    INSERT INTO issues (
        issue_register_id,
        project_id,
        issue_identifier,
        issue_number,
        issue_title,
        issue_description,
        issue_type,
        priority,
        severity,
        status,
        raised_by_id,
        reported_by_user_id,
        escalated_from_risk_id,
        date_raised,
        created_by,
        updated_by
    ) VALUES (
        v_issue_register_id,
        v_risk.project_id,
        v_issue_identifier,
        v_issue_number,
        v_risk.risk_title,
        v_risk.risk_description || E'\n\nMaterialized from Risk: ' || v_risk.id::TEXT,
        'problem_concern',
        CASE 
            WHEN v_risk.risk_score >= 20 THEN 'critical'
            WHEN v_risk.risk_score >= 12 THEN 'high'
            WHEN v_risk.risk_score >= 6 THEN 'medium'
            ELSE 'low'
        END,
        CASE 
            WHEN v_risk.impact >= 4 THEN 'critical'
            WHEN v_risk.impact >= 3 THEN 'major'
            WHEN v_risk.impact >= 2 THEN 'moderate'
            ELSE 'minor'
        END,
        'raised',
        v_risk.raised_by_user_id,
        v_risk.raised_by_user_id,
        p_risk_id,
        CURRENT_DATE,
        p_user_id,
        p_user_id
    ) RETURNING id INTO v_issue_id;
    
    RETURN v_issue_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Create Change Request from RFC
CREATE OR REPLACE FUNCTION create_change_request_from_rfc(p_issue_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_issue RECORD;
    v_change_request_id UUID;
    v_change_board_id UUID;
BEGIN
    -- Get issue details
    SELECT * INTO v_issue
    FROM issues
    WHERE id = p_issue_id
      AND issue_type = 'request_for_change';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Issue % is not a Request for Change', p_issue_id;
    END IF;
    
    -- Get change board for project (or use default)
    SELECT id INTO v_change_board_id
    FROM change_board
    WHERE project_id = v_issue.project_id
      AND is_deleted = FALSE
    LIMIT 1;
    
    -- Create change request
    INSERT INTO change_requests (
        project_id,
        change_board_id,
        change_title,
        change_description,
        change_type,
        submitted_by,
        submission_date,
        status,
        created_by,
        updated_by
    ) VALUES (
        v_issue.project_id,
        v_change_board_id,
        v_issue.issue_title,
        v_issue.issue_description,
        'scope', -- Default type
        p_user_id,
        CURRENT_DATE,
        'submitted',
        p_user_id,
        p_user_id
    ) RETURNING id INTO v_change_request_id;
    
    -- Update issue with change request link
    UPDATE issues
    SET change_request_id = v_change_request_id,
        status = 'approved',
        updated_by = p_user_id
    WHERE id = p_issue_id;
    
    RETURN v_change_request_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Get Issues by Type
CREATE OR REPLACE FUNCTION get_issues_by_type(p_issue_register_id UUID, p_type VARCHAR)
RETURNS TABLE (
    id UUID,
    issue_identifier VARCHAR,
    issue_title VARCHAR,
    issue_type VARCHAR,
    status VARCHAR,
    priority VARCHAR,
    severity VARCHAR,
    owner_id UUID,
    date_raised DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.issue_identifier,
        i.issue_title,
        i.issue_type,
        i.status,
        i.priority,
        i.severity,
        i.owner_id,
        i.date_raised
    FROM issues i
    WHERE i.issue_register_id = p_issue_register_id
      AND i.issue_type = p_type
      AND i.is_deleted = FALSE
    ORDER BY i.date_raised DESC, i.issue_number;
END;
$$ LANGUAGE plpgsql;

-- Function: Get Issue Summary
CREATE OR REPLACE FUNCTION get_issue_summary(p_project_id UUID)
RETURNS TABLE (
    total_issues INTEGER,
    open_issues INTEGER,
    rfcs_count INTEGER,
    off_specs_count INTEGER,
    problems_count INTEGER,
    critical_issues INTEGER,
    overdue_actions INTEGER,
    issues_by_status JSONB
) AS $$
DECLARE
    v_register_id UUID;
BEGIN
    -- Get issue register for project
    SELECT id INTO v_register_id
    FROM issue_registers
    WHERE project_id = p_project_id
      AND is_deleted = FALSE;
    
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER AS total_issues,
        COUNT(*) FILTER (WHERE status NOT IN ('closed', 'cancelled', 'resolved'))::INTEGER AS open_issues,
        COUNT(*) FILTER (WHERE issue_type = 'request_for_change')::INTEGER AS rfcs_count,
        COUNT(*) FILTER (WHERE issue_type = 'off_specification')::INTEGER AS off_specs_count,
        COUNT(*) FILTER (WHERE issue_type = 'problem_concern')::INTEGER AS problems_count,
        COUNT(*) FILTER (WHERE priority = 'critical' OR severity = 'critical')::INTEGER AS critical_issues,
        (
            SELECT COUNT(*)::INTEGER
            FROM issue_actions ia
            JOIN issues i ON ia.issue_id = i.id
            WHERE i.issue_register_id = v_register_id
              AND ia.status != 'completed'
              AND ia.target_date < CURRENT_DATE
              AND i.is_deleted = FALSE
        ) AS overdue_actions,
        (
            SELECT jsonb_object_agg(status, count)
            FROM (
                SELECT status, COUNT(*)::INTEGER AS count
                FROM issues
                WHERE issue_register_id = v_register_id
                  AND is_deleted = FALSE
                GROUP BY status
            ) s
        ) AS issues_by_status
    FROM issues
    WHERE issue_register_id = v_register_id
      AND is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function: Get Overdue Issue Actions
CREATE OR REPLACE FUNCTION get_overdue_issue_actions(p_project_id UUID)
RETURNS TABLE (
    action_id UUID,
    issue_identifier VARCHAR,
    action_description TEXT,
    target_date DATE,
    days_overdue INTEGER,
    assigned_to VARCHAR
) AS $$
DECLARE
    v_register_id UUID;
BEGIN
    -- Get issue register for project
    SELECT id INTO v_register_id
    FROM issue_registers
    WHERE project_id = p_project_id
      AND is_deleted = FALSE;
    
    RETURN QUERY
    SELECT 
        ia.id AS action_id,
        i.issue_identifier,
        ia.action_description,
        ia.target_date,
        (CURRENT_DATE - ia.target_date)::INTEGER AS days_overdue,
        COALESCE(ia.assigned_to_name, u.full_name, u.email) AS assigned_to
    FROM issue_actions ia
    JOIN issues i ON ia.issue_id = i.id
    LEFT JOIN users u ON ia.assigned_to_id = u.id
    WHERE i.issue_register_id = v_register_id
      AND ia.status != 'completed'
      AND ia.target_date < CURRENT_DATE
      AND i.is_deleted = FALSE
    ORDER BY ia.target_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Function: Get Issue Aging
CREATE OR REPLACE FUNCTION get_issue_aging(p_project_id UUID)
RETURNS TABLE (
    age_bracket VARCHAR,
    issue_count INTEGER,
    issues JSONB
) AS $$
DECLARE
    v_register_id UUID;
BEGIN
    -- Get issue register for project
    SELECT id INTO v_register_id
    FROM issue_registers
    WHERE project_id = p_project_id
      AND is_deleted = FALSE;
    
    RETURN QUERY
    SELECT 
        CASE 
            WHEN age_days < 7 THEN '0-7 days'
            WHEN age_days < 14 THEN '8-14 days'
            WHEN age_days < 30 THEN '15-30 days'
            WHEN age_days < 60 THEN '31-60 days'
            ELSE '60+ days'
        END AS age_bracket,
        COUNT(*)::INTEGER AS issue_count,
        jsonb_agg(
            jsonb_build_object(
                'id', i.id,
                'identifier', i.issue_identifier,
                'title', i.issue_title,
                'status', i.status,
                'age_days', age_days
            )
        ) AS issues
    FROM (
        SELECT 
            i.*,
            (CURRENT_DATE - COALESCE(i.date_raised, i.created_at::DATE))::INTEGER AS age_days
        FROM issues i
        WHERE i.issue_register_id = v_register_id
          AND i.is_deleted = FALSE
          AND i.status NOT IN ('closed', 'cancelled')
    ) i
    GROUP BY age_bracket
    ORDER BY 
        CASE age_bracket
            WHEN '0-7 days' THEN 1
            WHEN '8-14 days' THEN 2
            WHEN '15-30 days' THEN 3
            WHEN '31-60 days' THEN 4
            ELSE 5
        END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 13: TRIGGERS
-- ============================================================================

-- Trigger: Auto-generate register_reference on INSERT
CREATE OR REPLACE FUNCTION trg_issue_registers_generate_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.register_reference IS NULL OR NEW.register_reference = '' THEN
        NEW.register_reference := generate_issue_register_reference();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_issue_registers_before_insert_reference ON issue_registers;
CREATE TRIGGER trg_issue_registers_before_insert_reference
    BEFORE INSERT ON issue_registers
    FOR EACH ROW
    WHEN (NEW.register_reference IS NULL OR NEW.register_reference = '')
    EXECUTE FUNCTION trg_issue_registers_generate_reference();

-- Trigger: Auto-generate issue_identifier and issue_number on INSERT
CREATE OR REPLACE FUNCTION trg_issues_generate_identifier()
RETURNS TRIGGER AS $$
DECLARE
    v_issue_number INTEGER;
BEGIN
    IF NEW.issue_register_id IS NOT NULL THEN
        -- Get next issue number
        SELECT COALESCE(MAX(issue_number), 0) + 1 INTO v_issue_number
        FROM issues
        WHERE issue_register_id = NEW.issue_register_id
          AND is_deleted = FALSE;
        
        NEW.issue_number := v_issue_number;
        
        -- Generate identifier if not provided
        IF NEW.issue_identifier IS NULL OR NEW.issue_identifier = '' THEN
            NEW.issue_identifier := generate_issue_identifier(NEW.issue_register_id);
        END IF;
    END IF;
    
    -- Set date_raised if not provided
    IF NEW.date_raised IS NULL THEN
        NEW.date_raised := CURRENT_DATE;
    END IF;
    
    -- Map reported_by_user_id to raised_by_id if not set
    IF NEW.raised_by_id IS NULL AND NEW.reported_by_user_id IS NOT NULL THEN
        NEW.raised_by_id := NEW.reported_by_user_id;
    END IF;
    
    -- Map assigned_to_user_id to owner_id if not set
    IF NEW.owner_id IS NULL AND NEW.assigned_to_user_id IS NOT NULL THEN
        NEW.owner_id := NEW.assigned_to_user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_issues_before_insert_identifier ON issues;
CREATE TRIGGER trg_issues_before_insert_identifier
    BEFORE INSERT ON issues
    FOR EACH ROW
    EXECUTE FUNCTION trg_issues_generate_identifier();

-- Trigger: Record status changes in history table
CREATE OR REPLACE FUNCTION trg_issues_status_history()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO issue_status_history (
            issue_id,
            previous_status,
            new_status,
            changed_date,
            changed_by,
            change_reason
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            NOW(),
            COALESCE(NEW.updated_by, NEW.created_by),
            'Status changed'
        );
        
        -- Update status_date
        NEW.status_date := CURRENT_DATE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_issues_after_update_status_history ON issues;
CREATE TRIGGER trg_issues_after_update_status_history
    AFTER UPDATE ON issues
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION trg_issues_status_history();

-- Trigger: Auto-create issue register when project initiated
-- Note: This should be called from application logic when project status changes to 'initiated'
-- We'll create a function that can be called manually or from a project trigger

-- ============================================================================
-- SECTION 14: VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_tables_count INTEGER;
BEGIN
    -- Count Issue Register tables
    SELECT COUNT(*)
    INTO v_tables_count
    FROM database_tables
    WHERE table_category = 'issues'
      AND table_name IN (
          'issue_registers',
          'issue_actions',
          'issue_status_history',
          'issue_decisions',
          'issue_links',
          'issue_watchers',
          'issue_priority_scales',
          'issue_severity_scales'
      )
      AND is_deleted = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Issue Register Tables Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'New Issue Register Tables Created: %', v_tables_count;
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v174_issue_register_tables.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ============================================================================
-- END OF FILE
-- ============================================================================

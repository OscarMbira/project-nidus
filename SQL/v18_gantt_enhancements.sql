-- =====================================================
-- Project Nidus - Gantt Chart Enhancements
-- Version: v18
-- Description: Database schema enhancements for Gantt chart functionality
-- Phase: Phase 3 - Week 13 (Day 86)
-- Date: 2025-11-16
-- =====================================================
--
-- This script adds:
-- 1. Enhanced fields to existing tasks table for Gantt functionality
-- 2. project_milestones table for milestone tracking
-- 3. gantt_settings table for user preferences
-- 4. Critical path calculation support
-- 5. Baseline tracking for planned vs actual comparison
--
-- Dependencies:
-- - v06_task_management_tables.sql (tasks table must exist)
-- - v02_system_core_tables.sql (projects table must exist)
--
-- =====================================================

-- =====================================================
-- SECTION 1: ENHANCE EXISTING TASKS TABLE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=== Enhancing tasks table for Gantt chart functionality ===';
END $$;

-- Add baseline date fields for planned vs actual comparison
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS baseline_start_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS b
aseline_end_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS baseline_duration_days INTEGER;

-- Add milestone flag
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN DEFAULT FALSE;

-- Add critical path tracking fields
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_critical_path BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS slack_days INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS earliest_start_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS earliest_finish_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS latest_start_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS latest_finish_date DATE;

-- Add comments to new columns
COMMENT ON COLUMN tasks.baseline_start_date IS 'Original planned start date for baseline comparison';
COMMENT ON COLUMN tasks.baseline_end_date IS 'Original planned end date for baseline comparison';
COMMENT ON COLUMN tasks.baseline_duration_days IS 'Original planned duration in days';
COMMENT ON COLUMN tasks.is_milestone IS 'Flag indicating if this task is a milestone (zero-duration marker)';
COMMENT ON COLUMN tasks.is_critical_path IS 'Flag indicating if task is on the critical path';
COMMENT ON COLUMN tasks.slack_days IS 'Number of days this task can be delayed without affecting project end date';
COMMENT ON COLUMN tasks.earliest_start_date IS 'Earliest possible start date (CPM calculation)';
COMMENT ON COLUMN tasks.earliest_finish_date IS 'Earliest possible finish date (CPM calculation)';
COMMENT ON COLUMN tasks.latest_start_date IS 'Latest allowable start date (CPM calculation)';
COMMENT ON COLUMN tasks.latest_finish_date IS 'Latest allowable finish date (CPM calculation)';

DO $$
BEGIN
    RAISE NOTICE '✅ Enhanced tasks table with Gantt-specific fields';
END $$;

-- =====================================================
-- SECTION 2: PROJECT MILESTONES TABLE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=== Creating project_milestones table ===';
END $$;

CREATE TABLE IF NOT EXISTS project_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

    -- Milestone details
    milestone_name VARCHAR(255) NOT NULL,
    milestone_date DATE NOT NULL,
    description TEXT,
    milestone_type VARCHAR(50) NOT NULL DEFAULT 'custom',
    -- Types: 'project_start', 'project_end', 'phase_gate', 'deliverable', 'review', 'approval', 'custom'

    -- Status
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES auth.users(id),

    -- Display properties
    color VARCHAR(20) DEFAULT '#f59e0b', -- Amber color for milestones
    icon VARCHAR(50) DEFAULT 'flag',
    display_order INTEGER DEFAULT 0,

    -- Standard audit fields
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON project_milestones(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_milestones_task_id ON project_milestones(task_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_milestones_date ON project_milestones(milestone_date) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_milestones_type ON project_milestones(milestone_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_milestones_display_order ON project_milestones(project_id, display_order) WHERE is_deleted = FALSE;

-- Add comments
COMMENT ON TABLE project_milestones IS 'Tracks project milestones for Gantt chart visualization and project tracking';
COMMENT ON COLUMN project_milestones.project_id IS 'Reference to the project this milestone belongs to';
COMMENT ON COLUMN project_milestones.task_id IS 'Optional reference to a task if milestone is task-based';
COMMENT ON COLUMN project_milestones.milestone_name IS 'Name/title of the milestone';
COMMENT ON COLUMN project_milestones.milestone_date IS 'Target date for the milestone';
COMMENT ON COLUMN project_milestones.milestone_type IS 'Type of milestone: project_start, project_end, phase_gate, deliverable, review, approval, custom';
COMMENT ON COLUMN project_milestones.is_completed IS 'Flag indicating if milestone has been achieved';
COMMENT ON COLUMN project_milestones.color IS 'Hex color code for milestone display in Gantt chart';
COMMENT ON COLUMN project_milestones.icon IS 'Icon name for milestone display';
COMMENT ON COLUMN project_milestones.display_order IS 'Order for displaying milestones in lists';

DO $$
BEGIN
    RAISE NOTICE '✅ Created project_milestones table with indexes';
END $$;

-- =====================================================
-- SECTION 3: GANTT SETTINGS TABLE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=== Creating gantt_settings table ===';
END $$;

CREATE TABLE IF NOT EXISTS gantt_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    -- View preferences
    default_view_mode VARCHAR(20) DEFAULT 'Week' NOT NULL,
    -- Options: 'Day', 'Week', 'Month', 'Quarter', 'Year'

    -- Display toggles
    show_critical_path BOOLEAN DEFAULT TRUE NOT NULL,
    show_baselines BOOLEAN DEFAULT FALSE NOT NULL,
    show_progress BOOLEAN DEFAULT TRUE NOT NULL,
    show_resources BOOLEAN DEFAULT TRUE NOT NULL,
    show_dependencies BOOLEAN DEFAULT TRUE NOT NULL,
    show_milestones BOOLEAN DEFAULT TRUE NOT NULL,

    -- Color preferences
    critical_path_color VARCHAR(20) DEFAULT '#ef4444', -- Red
    normal_task_color VARCHAR(20) DEFAULT '#3b82f6', -- Blue
    milestone_color VARCHAR(20) DEFAULT '#f59e0b', -- Amber
    completed_task_color VARCHAR(20) DEFAULT '#10b981', -- Green

    -- Other preferences
    auto_schedule BOOLEAN DEFAULT FALSE NOT NULL,
    highlight_today BOOLEAN DEFAULT TRUE NOT NULL,
    show_weekends BOOLEAN DEFAULT TRUE NOT NULL,

    -- Standard audit fields
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),

    -- Ensure one setting per user per project (or global if project_id is NULL)
    UNIQUE(user_id, project_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_gantt_settings_user_id ON gantt_settings(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_gantt_settings_project_id ON gantt_settings(project_id) WHERE is_deleted = FALSE;

-- Add comments
COMMENT ON TABLE gantt_settings IS 'Stores user preferences for Gantt chart display and behavior';
COMMENT ON COLUMN gantt_settings.user_id IS 'User who owns these settings';
COMMENT ON COLUMN gantt_settings.project_id IS 'Project-specific settings (NULL for global user defaults)';
COMMENT ON COLUMN gantt_settings.default_view_mode IS 'Default zoom level: Day, Week, Month, Quarter, Year';
COMMENT ON COLUMN gantt_settings.show_critical_path IS 'Whether to highlight critical path tasks';
COMMENT ON COLUMN gantt_settings.show_baselines IS 'Whether to show baseline comparison';
COMMENT ON COLUMN gantt_settings.show_progress IS 'Whether to show progress bars on tasks';
COMMENT ON COLUMN gantt_settings.show_resources IS 'Whether to show resource names on task bars';
COMMENT ON COLUMN gantt_settings.auto_schedule IS 'Whether to automatically reschedule dependent tasks';

DO $$
BEGIN
    RAISE NOTICE '✅ Created gantt_settings table with indexes';
END $$;

-- =====================================================
-- SECTION 4: AUDIT TRIGGERS
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=== Creating audit triggers ===';
END $$;

-- Trigger for project_milestones
CREATE TRIGGER set_project_milestones_updated_at
    BEFORE UPDATE ON project_milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for gantt_settings
CREATE TRIGGER set_gantt_settings_updated_at
    BEFORE UPDATE ON gantt_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DO $$
BEGIN
    RAISE NOTICE '✅ Created audit triggers';
END $$;

-- =====================================================
-- SECTION 5: ROW LEVEL SECURITY (RLS)
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=== Setting up Row Level Security ===';
END $$;

-- Enable RLS
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE gantt_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_milestones

-- Select: Users can view milestones for projects they have access to
CREATE POLICY project_milestones_select_policy ON project_milestones
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_milestones.project_id
            AND p.is_deleted = FALSE
            -- Add additional project access checks here based on your RBAC
        )
        AND is_deleted = FALSE
    );

-- Insert: Users can create milestones for projects they can manage
CREATE POLICY project_milestones_insert_policy ON project_milestones
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_milestones.project_id
            AND p.is_deleted = FALSE
            -- Add project manager check here
        )
    );

-- Update: Users can update milestones for projects they manage
CREATE POLICY project_milestones_update_policy ON project_milestones
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_milestones.project_id
            AND p.is_deleted = FALSE
            -- Add project manager check here
        )
        AND is_deleted = FALSE
    );

-- Delete (soft): Users can soft-delete milestones for projects they manage
CREATE POLICY project_milestones_delete_policy ON project_milestones
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_milestones.project_id
            AND p.is_deleted = FALSE
            -- Add project manager check here
        )
        AND is_deleted = FALSE
    )
    WITH CHECK (is_deleted = TRUE);

-- RLS Policies for gantt_settings

-- Select: Users can only view their own settings
CREATE POLICY gantt_settings_select_policy ON gantt_settings
    FOR SELECT
    USING (user_id = auth.uid() AND is_deleted = FALSE);

-- Insert: Users can only create their own settings
CREATE POLICY gantt_settings_insert_policy ON gantt_settings
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Update: Users can only update their own settings
CREATE POLICY gantt_settings_update_policy ON gantt_settings
    FOR UPDATE
    USING (user_id = auth.uid() AND is_deleted = FALSE);

-- Delete: Users can soft-delete their own settings
CREATE POLICY gantt_settings_delete_policy ON gantt_settings
    FOR UPDATE
    USING (user_id = auth.uid() AND is_deleted = FALSE)
    WITH CHECK (is_deleted = TRUE);

DO $$
BEGIN
    RAISE NOTICE '✅ Row Level Security policies created';
END $$;

-- =====================================================
-- SECTION 6: HELPER FUNCTIONS
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=== Creating helper functions ===';
END $$;

-- Function to calculate task duration in business days
CREATE OR REPLACE FUNCTION calculate_task_duration(
    p_start_date DATE,
    p_end_date DATE,
    p_exclude_weekends BOOLEAN DEFAULT TRUE
)
RETURNS INTEGER AS $$
DECLARE
    v_duration INTEGER;
BEGIN
    IF p_exclude_weekends THEN
        -- Calculate business days (excluding weekends)
        SELECT COUNT(*)::INTEGER INTO v_duration
        FROM generate_series(p_start_date, p_end_date, '1 day'::interval) AS day
        WHERE EXTRACT(ISODOW FROM day) < 6; -- Monday=1, Sunday=7
    ELSE
        -- Calculate total days
        v_duration := (p_end_date - p_start_date) + 1;
    END IF;

    RETURN v_duration;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_task_duration IS 'Calculates duration between two dates, optionally excluding weekends';

-- Function to set baseline dates for a task
CREATE OR REPLACE FUNCTION set_task_baseline(p_task_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE tasks
    SET
        baseline_start_date = start_date,
        baseline_end_date = due_date,
        baseline_duration_days = calculate_task_duration(start_date, due_date, TRUE),
        updated_at = NOW()
    WHERE id = p_task_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_task_baseline IS 'Sets baseline dates for a task based on current planned dates';

-- Function to set baseline for all tasks in a project
CREATE OR REPLACE FUNCTION set_project_baseline(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    UPDATE tasks
    SET
        baseline_start_date = start_date,
        baseline_end_date = due_date,
        baseline_duration_days = calculate_task_duration(start_date, due_date, TRUE),
        updated_at = NOW()
    WHERE project_id = p_project_id
    AND is_deleted = FALSE
    AND start_date IS NOT NULL
    AND due_date IS NOT NULL;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_project_baseline IS 'Sets baseline dates for all tasks in a project';

DO $$
BEGIN
    RAISE NOTICE '✅ Helper functions created';
END $$;

-- =====================================================
-- SECTION 7: REGISTER TABLES IN DATABASE REGISTRY
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=== Registering new tables in database_tables registry ===';
END $$;

-- Register project_milestones table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('project_milestones', 'Tracks project milestones for Gantt chart visualization and project progress tracking', FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Register gantt_settings table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('gantt_settings', 'Stores user-specific preferences for Gantt chart display and behavior', FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE '✅ Tables registered in database_tables registry';
END $$;

-- =====================================================
-- SECTION 8: VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=== Verification ===';
    RAISE NOTICE 'Checking table existence...';
END $$;

-- Verify tables exist
DO $$
DECLARE
    v_milestone_exists BOOLEAN;
    v_settings_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'project_milestones'
    ) INTO v_milestone_exists;

    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'gantt_settings'
    ) INTO v_settings_exists;

    IF v_milestone_exists AND v_settings_exists THEN
        RAISE NOTICE '✅ All Gantt tables created successfully';
    ELSE
        RAISE WARNING '⚠️  Some tables may not have been created';
    END IF;
END $$;

-- Verify tasks table enhancements
DO $$
DECLARE
    v_baseline_exists BOOLEAN;
    v_milestone_exists BOOLEAN;
    v_critical_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'tasks'
        AND column_name = 'baseline_start_date'
    ) INTO v_baseline_exists;

    SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'tasks'
        AND column_name = 'is_milestone'
    ) INTO v_milestone_exists;

    SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'tasks'
        AND column_name = 'is_critical_path'
    ) INTO v_critical_exists;

    IF v_baseline_exists AND v_milestone_exists AND v_critical_exists THEN
        RAISE NOTICE '✅ Tasks table enhanced successfully';
    ELSE
        RAISE WARNING '⚠️  Some task table columns may not have been added';
    END IF;
END $$;

-- =====================================================
-- COMPLETION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==================================================';
    RAISE NOTICE '✅ v18_gantt_enhancements.sql completed successfully';
    RAISE NOTICE '==================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '  - Enhanced tasks table with Gantt-specific fields';
    RAISE NOTICE '  - Created project_milestones table';
    RAISE NOTICE '  - Created gantt_settings table';
    RAISE NOTICE '  - Added helper functions for baseline and duration';
    RAISE NOTICE '  - Configured RLS policies';
    RAISE NOTICE '  - Registered tables in database registry';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Run this script in Supabase SQL Editor';
    RAISE NOTICE '  2. Verify all tables and columns created';
    RAISE NOTICE '  3. Test helper functions';
    RAISE NOTICE '  4. Proceed with Gantt component implementation';
    RAISE NOTICE '';
END $$;

-- =====================================================
-- END OF SCRIPT
-- =====================================================

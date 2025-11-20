-- =====================================================
-- Project Nidus - Gantt Chart Enhancements
-- Version: v18 (Clean)
-- Description: Database schema enhancements for Gantt chart functionality
-- Phase: Phase 3 - Week 13 (Day 86)
-- Date: 2025-11-16
-- =====================================================

-- SECTION 1: ENHANCE EXISTING TASKS TABLE
-- Add baseline date fields
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS baseline_start_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS baseline_end_date DATE;
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

-- SECTION 2: PROJECT MILESTONES TABLE
CREATE TABLE IF NOT EXISTS project_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    milestone_name VARCHAR(255) NOT NULL,
    milestone_date DATE NOT NULL,
    description TEXT,
    milestone_type VARCHAR(50) NOT NULL DEFAULT 'custom',
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES auth.users(id),
    color VARCHAR(20) DEFAULT '#f59e0b',
    icon VARCHAR(50) DEFAULT 'flag',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON project_milestones(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_milestones_task_id ON project_milestones(task_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_milestones_date ON project_milestones(milestone_date) WHERE is_deleted = FALSE;

-- SECTION 3: GANTT SETTINGS TABLE
CREATE TABLE IF NOT EXISTS gantt_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    default_view_mode VARCHAR(20) DEFAULT 'Week' NOT NULL,
    show_critical_path BOOLEAN DEFAULT TRUE NOT NULL,
    show_baselines BOOLEAN DEFAULT FALSE NOT NULL,
    show_progress BOOLEAN DEFAULT TRUE NOT NULL,
    show_resources BOOLEAN DEFAULT TRUE NOT NULL,
    show_dependencies BOOLEAN DEFAULT TRUE NOT NULL,
    show_milestones BOOLEAN DEFAULT TRUE NOT NULL,
    critical_path_color VARCHAR(20) DEFAULT '#ef4444',
    normal_task_color VARCHAR(20) DEFAULT '#3b82f6',
    milestone_color VARCHAR(20) DEFAULT '#f59e0b',
    completed_task_color VARCHAR(20) DEFAULT '#10b981',
    auto_schedule BOOLEAN DEFAULT FALSE NOT NULL,
    highlight_today BOOLEAN DEFAULT TRUE NOT NULL,
    show_weekends BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_gantt_settings_user_id ON gantt_settings(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_gantt_settings_project_id ON gantt_settings(project_id) WHERE is_deleted = FALSE;

-- SECTION 4: HELPER FUNCTION FOR UPDATE TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- SECTION 5: AUDIT TRIGGERS
DROP TRIGGER IF EXISTS set_project_milestones_updated_at ON project_milestones;
CREATE TRIGGER set_project_milestones_updated_at
    BEFORE UPDATE ON project_milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_gantt_settings_updated_at ON gantt_settings;
CREATE TRIGGER set_gantt_settings_updated_at
    BEFORE UPDATE ON gantt_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- SECTION 6: RLS POLICIES
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE gantt_settings ENABLE ROW LEVEL SECURITY;

-- Milestones policies
DROP POLICY IF EXISTS project_milestones_select_policy ON project_milestones;
CREATE POLICY project_milestones_select_policy ON project_milestones
    FOR SELECT
    USING (is_deleted = FALSE);

DROP POLICY IF EXISTS project_milestones_insert_policy ON project_milestones;
CREATE POLICY project_milestones_insert_policy ON project_milestones
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS project_milestones_update_policy ON project_milestones;
CREATE POLICY project_milestones_update_policy ON project_milestones
    FOR UPDATE
    USING (is_deleted = FALSE);

-- Gantt settings policies
DROP POLICY IF EXISTS gantt_settings_select_policy ON gantt_settings;
CREATE POLICY gantt_settings_select_policy ON gantt_settings
    FOR SELECT
    USING (user_id = auth.uid() AND is_deleted = FALSE);

DROP POLICY IF EXISTS gantt_settings_insert_policy ON gantt_settings;
CREATE POLICY gantt_settings_insert_policy ON gantt_settings
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS gantt_settings_update_policy ON gantt_settings;
CREATE POLICY gantt_settings_update_policy ON gantt_settings
    FOR UPDATE
    USING (user_id = auth.uid() AND is_deleted = FALSE);

-- SECTION 7: HELPER FUNCTIONS
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
        SELECT COUNT(*)::INTEGER INTO v_duration
        FROM generate_series(p_start_date, p_end_date, '1 day'::interval) AS day
        WHERE EXTRACT(ISODOW FROM day) < 6;
    ELSE
        v_duration := (p_end_date - p_start_date) + 1;
    END IF;
    RETURN v_duration;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- SECTION 8: REGISTER TABLES
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('project_milestones', 'Tracks project milestones for Gantt chart visualization', FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('gantt_settings', 'Stores user-specific preferences for Gantt chart display', FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

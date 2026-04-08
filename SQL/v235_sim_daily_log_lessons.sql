-- =============================================================================
-- v235: Simulator Practice Daily Log & Lessons Tables
-- Purpose: Practice daily logs and lessons logs for simulator learning
-- PRD Reference: Simulator_Feature_Parity_Implementation_Plan.md Phase 1, Task 1.9
-- =============================================================================

-- Create practice_daily_logs table (header)
CREATE TABLE IF NOT EXISTS sim.practice_daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID UNIQUE REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    log_reference VARCHAR(50) UNIQUE NOT NULL,
    visibility VARCHAR(50) DEFAULT 'team' CHECK (visibility IN ('private', 'team', 'stakeholders', 'public')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_daily_logs_project_id 
    ON sim.practice_daily_logs(practice_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_daily_logs_user_id 
    ON sim.practice_daily_logs(user_id) WHERE is_deleted = FALSE;

-- Create practice_daily_log_entries table
CREATE TABLE IF NOT EXISTS sim.practice_daily_log_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_daily_log_id UUID NOT NULL REFERENCES sim.practice_daily_logs(id) ON DELETE CASCADE,
    entry_number INTEGER NOT NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    entry_type VARCHAR(50) NOT NULL CHECK (entry_type IN ('problem', 'action', 'event', 'comment', 'observation', 'decision', 'other')),
    description TEXT NOT NULL,
    person_responsible_id UUID REFERENCES auth.users(id),
    person_responsible_name VARCHAR(200),
    target_date DATE,
    results TEXT,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled', 'escalated')),
    priority VARCHAR(50) CHECK (priority IN ('low', 'medium', 'high')),
    escalated_to VARCHAR(50),
    escalated_item_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_daily_log_entries_log_id 
    ON sim.practice_daily_log_entries(practice_daily_log_id);
CREATE INDEX IF NOT EXISTS idx_practice_daily_log_entries_user_id 
    ON sim.practice_daily_log_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_daily_log_entries_entry_date 
    ON sim.practice_daily_log_entries(entry_date);

-- Create practice_lessons_log table (header)
CREATE TABLE IF NOT EXISTS sim.practice_lessons_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID UNIQUE REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    log_reference VARCHAR(50) UNIQUE NOT NULL,
    version_number VARCHAR(20) DEFAULT '1.0',
    author_id UUID REFERENCES auth.users(id),
    owner_id UUID REFERENCES auth.users(id),
    update_process TEXT,
    access_control_notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_lessons_log_project_id 
    ON sim.practice_lessons_log(practice_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_lessons_log_user_id 
    ON sim.practice_lessons_log(user_id) WHERE is_deleted = FALSE;

-- Create practice_lesson_entries table
CREATE TABLE IF NOT EXISTS sim.practice_lesson_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_lessons_log_id UUID NOT NULL REFERENCES sim.practice_lessons_log(id) ON DELETE CASCADE,
    lesson_number INTEGER NOT NULL,
    lesson_title VARCHAR(200) NOT NULL,
    lesson_description TEXT NOT NULL,
    lesson_scope VARCHAR(50) DEFAULT 'project' CHECK (lesson_scope IN ('project', 'corporate', 'programme', 'both_project_corporate', 'both_project_programme')),
    effect_type VARCHAR(50) DEFAULT 'neutral' CHECK (effect_type IN ('positive', 'negative', 'neutral')),
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(50) DEFAULT 'logged' CHECK (status IN ('logged', 'under_review', 'action_required', 'action_taken', 'closed', 'rejected')),
    identified_date DATE DEFAULT CURRENT_DATE,
    identified_by_user_id UUID REFERENCES auth.users(id),
    lesson_category VARCHAR(100),
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_lesson_entries_log_id 
    ON sim.practice_lesson_entries(practice_lessons_log_id);
CREATE INDEX IF NOT EXISTS idx_practice_lesson_entries_user_id 
    ON sim.practice_lesson_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_lesson_entries_status 
    ON sim.practice_lesson_entries(status);

-- Create practice_lessons_reports table
CREATE TABLE IF NOT EXISTS sim.practice_lessons_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    practice_lessons_log_id UUID REFERENCES sim.practice_lessons_log(id) ON DELETE CASCADE,
    report_reference VARCHAR(100) UNIQUE NOT NULL,
    version_no VARCHAR(20) DEFAULT '1.0',
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    report_status VARCHAR(50) DEFAULT 'draft' CHECK (report_status IN ('draft', 'submitted', 'under_review', 'approved', 'distributed', 'closed')),
    author_id UUID REFERENCES auth.users(id),
    purpose TEXT,
    context TEXT,
    executive_summary TEXT,
    what_went_well_summary TEXT,
    what_did_not_go_well_summary TEXT,
    key_recommendations_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_lessons_reports_project_id 
    ON sim.practice_lessons_reports(practice_project_id);
CREATE INDEX IF NOT EXISTS idx_practice_lessons_reports_user_id 
    ON sim.practice_lessons_reports(user_id);

-- Register tables in database_tables registry
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
    ('sim.practice_daily_logs', 'Practice daily log headers for simulator learning', false, true, 'simulation'),
    ('sim.practice_daily_log_entries', 'Practice daily log entries for simulator learning', false, true, 'simulation'),
    ('sim.practice_lessons_log', 'Practice lessons log headers for simulator learning', false, true, 'simulation'),
    ('sim.practice_lesson_entries', 'Practice lesson entries for simulator learning', false, true, 'simulation'),
    ('sim.practice_lessons_reports', 'Practice lessons reports for simulator learning', false, true, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

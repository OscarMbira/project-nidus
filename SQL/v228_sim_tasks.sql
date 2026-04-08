-- =============================================================================
-- v228: Simulator Practice Tasks Tables
-- Purpose: Practice task management for simulator learning
-- PRD Reference: Simulator_Feature_Parity_Implementation_Plan.md Phase 1, Task 1.2
-- =============================================================================

-- Create practice_tasks table
CREATE TABLE IF NOT EXISTS sim.practice_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Task Identification
    task_code VARCHAR(50),
    task_name VARCHAR(200) NOT NULL,
    task_description TEXT,
    
    -- Relationships
    practice_project_id UUID REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    parent_task_id UUID REFERENCES sim.practice_tasks(id) ON DELETE SET NULL,
    
    -- Task Properties
    task_type VARCHAR(50) DEFAULT 'task' CHECK (task_type IN ('task', 'milestone', 'summary', 'subtask')),
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(50) DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'in_review', 'blocked', 'completed', 'cancelled')),
    
    -- Assignment
    assigned_to_user_id UUID REFERENCES auth.users(id),
    assigned_by_user_id UUID REFERENCES auth.users(id),
    
    -- Timeline
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    due_date DATE,
    
    -- Effort & Duration
    estimated_hours DECIMAL(10, 2),
    actual_hours DECIMAL(10, 2),
    estimated_duration_days INTEGER,
    actual_duration_days INTEGER,
    
    -- Progress
    percentage_complete DECIMAL(5, 2) DEFAULT 0,
    completion_date TIMESTAMPTZ,
    
    -- Additional Properties
    tags TEXT[],
    labels JSONB DEFAULT '{}'::jsonb,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    
    -- Status
    is_milestone BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_reason TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Learning/Scoring
    practice_score INTEGER, -- Learning score for task management quality
    feedback TEXT, -- Learning feedback
    
    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_practice_tasks_dates CHECK (
        (planned_end_date IS NULL OR planned_start_date IS NULL OR planned_end_date >= planned_start_date) AND
        (due_date IS NULL OR planned_start_date IS NULL OR due_date >= planned_start_date)
    ),
    CONSTRAINT chk_practice_tasks_progress CHECK (percentage_complete >= 0 AND percentage_complete <= 100),
    CONSTRAINT chk_practice_tasks_hours CHECK (estimated_hours >= 0 AND actual_hours >= 0)
);

CREATE INDEX IF NOT EXISTS idx_practice_tasks_project_id 
    ON sim.practice_tasks(practice_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_tasks_parent_task_id 
    ON sim.practice_tasks(parent_task_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_tasks_status 
    ON sim.practice_tasks(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_tasks_assigned_to 
    ON sim.practice_tasks(assigned_to_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_tasks_user_id 
    ON sim.practice_tasks(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_tasks_due_date 
    ON sim.practice_tasks(due_date) WHERE is_deleted = FALSE;

-- Create practice_task_assignments table
CREATE TABLE IF NOT EXISTS sim.practice_task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_task_id UUID NOT NULL REFERENCES sim.practice_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assignment_type VARCHAR(50) DEFAULT 'assignee' CHECK (assignment_type IN ('assignee', 'reviewer', 'watcher', 'collaborator')),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by_user_id UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(practice_task_id, user_id, assignment_type)
);

CREATE INDEX IF NOT EXISTS idx_practice_task_assignments_task_id 
    ON sim.practice_task_assignments(practice_task_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_practice_task_assignments_user_id 
    ON sim.practice_task_assignments(user_id) WHERE is_active = TRUE;

-- Create practice_task_comments table
CREATE TABLE IF NOT EXISTS sim.practice_task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_task_id UUID NOT NULL REFERENCES sim.practice_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_practice_task_comments_task_id 
    ON sim.practice_task_comments(practice_task_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_task_comments_user_id 
    ON sim.practice_task_comments(user_id) WHERE is_deleted = FALSE;

-- Create practice_task_attachments table
CREATE TABLE IF NOT EXISTS sim.practice_task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_task_id UUID NOT NULL REFERENCES sim.practice_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(100),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_practice_task_attachments_task_id 
    ON sim.practice_task_attachments(practice_task_id) WHERE is_deleted = FALSE;

-- Register tables in database_tables registry
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
    ('sim.practice_tasks', 'Practice tasks for simulator learning', false, true, 'simulation'),
    ('sim.practice_task_assignments', 'Task-to-user assignments for practice tasks', false, true, 'simulation'),
    ('sim.practice_task_comments', 'Comments on practice tasks', false, true, 'simulation'),
    ('sim.practice_task_attachments', 'File attachments for practice tasks', false, true, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

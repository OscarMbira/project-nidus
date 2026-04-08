-- =============================================================================
-- v227: Simulator Practice Projects Core Tables
-- Purpose: Comprehensive practice projects structure for simulator learning
-- PRD Reference: Simulator_Feature_Parity_Implementation_Plan.md Phase 1, Task 1.1
-- =============================================================================

-- Extend existing sim.practice_projects table with comprehensive fields
-- (v80 created basic version, we're extending it here)

-- First, check if we need to add columns to existing table
DO $$
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'sim' AND table_name = 'practice_projects' AND column_name = 'project_type_id') THEN
        ALTER TABLE sim.practice_projects
        ADD COLUMN project_type_id UUID,
        ADD COLUMN status_id UUID,
        ADD COLUMN priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
        ADD COLUMN planned_start_date DATE,
        ADD COLUMN planned_end_date DATE,
        ADD COLUMN actual_start_date DATE,
        ADD COLUMN actual_end_date DATE,
        ADD COLUMN percentage_complete DECIMAL(5, 2) DEFAULT 0,
        ADD COLUMN health_status VARCHAR(50) CHECK (health_status IN ('green', 'amber', 'red')),
        ADD COLUMN budget_amount DECIMAL(15, 2),
        ADD COLUMN budget_currency VARCHAR(3) DEFAULT 'USD',
        ADD COLUMN actual_cost DECIMAL(15, 2),
        ADD COLUMN owner_user_id UUID REFERENCES auth.users(id),
        ADD COLUMN sponsor_user_id UUID REFERENCES auth.users(id),
        ADD COLUMN methodology_id UUID,
        ADD COLUMN is_archived BOOLEAN DEFAULT FALSE,
        ADD COLUMN archived_at TIMESTAMPTZ,
        ADD COLUMN custom_fields JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN updated_by UUID REFERENCES auth.users(id),
        ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE,
        ADD COLUMN deleted_at TIMESTAMPTZ,
        ADD COLUMN deleted_by UUID REFERENCES auth.users(id);
        
        -- Add constraints
        ALTER TABLE sim.practice_projects
        ADD CONSTRAINT chk_practice_projects_dates CHECK (
            planned_end_date IS NULL OR planned_start_date IS NULL OR planned_end_date >= planned_start_date
        ),
        ADD CONSTRAINT chk_practice_projects_progress CHECK (percentage_complete >= 0 AND percentage_complete <= 100);
    END IF;
END $$;

-- Create practice_project_stages table (for structured PM lifecycle)
CREATE TABLE IF NOT EXISTS sim.practice_project_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    stage_name VARCHAR(200) NOT NULL,
    stage_number INTEGER NOT NULL,
    stage_type VARCHAR(50) DEFAULT 'stage' CHECK (stage_type IN ('stage', 'phase', 'sprint', 'iteration')),
    stage_description TEXT,
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    percentage_complete DECIMAL(5, 2) DEFAULT 0,
    is_current BOOLEAN DEFAULT FALSE,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT chk_practice_stages_dates CHECK (
        planned_end_date IS NULL OR planned_start_date IS NULL OR planned_end_date >= planned_start_date
    ),
    CONSTRAINT chk_practice_stages_progress CHECK (percentage_complete >= 0 AND percentage_complete <= 100)
);

CREATE INDEX IF NOT EXISTS idx_practice_project_stages_project_id 
    ON sim.practice_project_stages(practice_project_id) WHERE is_completed = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_project_stages_is_current 
    ON sim.practice_project_stages(is_current) WHERE is_current = TRUE;
CREATE INDEX IF NOT EXISTS idx_practice_project_stages_user_id 
    ON sim.practice_project_stages(user_id);

-- Create practice_project_memberships table
CREATE TABLE IF NOT EXISTS sim.practice_project_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_name VARCHAR(100) NOT NULL, -- 'project_manager', 'team_member', 'stakeholder', etc.
    is_active BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(practice_project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_practice_project_memberships_project_id 
    ON sim.practice_project_memberships(practice_project_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_practice_project_memberships_user_id 
    ON sim.practice_project_memberships(user_id) WHERE is_active = TRUE;

-- Create practice_project_types table (seed from platform types)
CREATE TABLE IF NOT EXISTS sim.practice_project_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_name VARCHAR(200) NOT NULL,
    type_code VARCHAR(50) UNIQUE NOT NULL,
    type_description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed practice project types from platform (if not exists)
INSERT INTO sim.practice_project_types (type_name, type_code, type_description, display_order)
SELECT 
    type_name,
    'SIM-' || type_code,
    'Practice: ' || COALESCE(type_description, ''),
    ROW_NUMBER() OVER (ORDER BY type_name) - 1
FROM project_types
WHERE is_active = TRUE
ON CONFLICT (type_code) DO NOTHING;

-- Create practice_project_statuses table (seed from platform statuses)
CREATE TABLE IF NOT EXISTS sim.practice_project_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status_name VARCHAR(200) NOT NULL,
    status_code VARCHAR(50) UNIQUE NOT NULL,
    status_description TEXT,
    status_color VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed practice project statuses from platform (if not exists)
INSERT INTO sim.practice_project_statuses (status_name, status_code, status_description, status_color, display_order)
SELECT 
    status_name,
    'SIM-' || status_code,
    'Practice: ' || COALESCE(status_description, ''),
    status_color,
    COALESCE(status_order, ROW_NUMBER() OVER (ORDER BY status_name) - 1)
FROM project_statuses
WHERE is_active = TRUE
ON CONFLICT (status_code) DO NOTHING;

-- Add foreign key constraints to practice_projects
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_practice_projects_type' 
                   AND table_schema = 'sim' AND table_name = 'practice_projects') THEN
        ALTER TABLE sim.practice_projects
        ADD CONSTRAINT fk_practice_projects_type 
        FOREIGN KEY (project_type_id) REFERENCES sim.practice_project_types(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_practice_projects_status' 
                   AND table_schema = 'sim' AND table_name = 'practice_projects') THEN
        ALTER TABLE sim.practice_projects
        ADD CONSTRAINT fk_practice_projects_status 
        FOREIGN KEY (status_id) REFERENCES sim.practice_project_statuses(id);
    END IF;
END $$;

-- Create indexes on practice_projects
CREATE INDEX IF NOT EXISTS idx_practice_projects_user_id 
    ON sim.practice_projects(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_projects_status_id 
    ON sim.practice_projects(status_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_projects_type_id 
    ON sim.practice_projects(project_type_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_projects_health_status 
    ON sim.practice_projects(health_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_projects_is_archived 
    ON sim.practice_projects(is_archived) WHERE is_archived = FALSE;

-- Register tables in database_tables registry
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
    ('sim.practice_project_stages', 'Practice project stages/phases for structured PM lifecycle', false, true, 'simulation'),
    ('sim.practice_project_memberships', 'User memberships in practice projects', false, true, 'simulation'),
    ('sim.practice_project_types', 'Practice project type definitions', false, true, 'simulation'),
    ('sim.practice_project_statuses', 'Practice project status definitions', false, true, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- Update existing practice_projects registration
UPDATE database_tables 
SET table_description = 'Comprehensive practice projects for simulator learning (extended)',
    updated_at = NOW()
WHERE table_name = 'sim.practice_projects';

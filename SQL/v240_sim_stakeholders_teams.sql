-- =============================================================================
-- v240: Simulator Practice Stakeholders & Teams Tables
-- Purpose: Practice stakeholder registers and team management for simulator learning
-- PRD Reference: Simulator_Feature_Parity_Implementation_Plan.md Phase 1, Task 1.14
-- =============================================================================

-- Create practice_stakeholder_register table
CREATE TABLE IF NOT EXISTS sim.practice_stakeholder_register (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    stakeholder_reference VARCHAR(100),
    stakeholder_name VARCHAR(200) NOT NULL,
    stakeholder_title VARCHAR(200),
    stakeholder_organization VARCHAR(200),
    stakeholder_department VARCHAR(200),
    stakeholder_type VARCHAR(100) CHECK (stakeholder_type IN ('internal', 'external', 'customer', 'supplier', 'partner', 'regulator', 'community')),
    stakeholder_category VARCHAR(100) CHECK (stakeholder_category IN ('individual', 'group', 'organization', 'community')),
    stakeholder_role VARCHAR(200),
    email VARCHAR(255),
    phone VARCHAR(50),
    preferred_contact_method VARCHAR(50),
    organization_level VARCHAR(100),
    project_role VARCHAR(200),
    is_decision_maker BOOLEAN DEFAULT FALSE,
    is_influencer BOOLEAN DEFAULT FALSE,
    is_affected_by_project BOOLEAN DEFAULT FALSE,
    availability_hours_per_week DECIMAL(10,2),
    stakeholder_status VARCHAR(50) DEFAULT 'active' CHECK (stakeholder_status IN ('active', 'inactive', 'departed')),
    notes TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_stakeholders_project_id 
    ON sim.practice_stakeholder_register(practice_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_stakeholders_user_id 
    ON sim.practice_stakeholder_register(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_stakeholders_status 
    ON sim.practice_stakeholder_register(stakeholder_status) WHERE is_deleted = FALSE;

-- Create practice_teams table
CREATE TABLE IF NOT EXISTS sim.practice_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    team_name VARCHAR(200) NOT NULL,
    team_description TEXT,
    team_type VARCHAR(50) CHECK (team_type IN ('delivery', 'support', 'cross-functional', 'specialist', 'other')),
    team_lead_user_id UUID REFERENCES auth.users(id),
    team_size INTEGER DEFAULT 0,
    team_status VARCHAR(50) DEFAULT 'active' CHECK (team_status IN ('active', 'inactive', 'disbanded')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_teams_project_id 
    ON sim.practice_teams(practice_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_teams_user_id 
    ON sim.practice_teams(user_id) WHERE is_deleted = FALSE;

-- Create practice_team_members table
CREATE TABLE IF NOT EXISTS sim.practice_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_team_id UUID NOT NULL REFERENCES sim.practice_teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    member_role VARCHAR(100),
    allocation_percentage DECIMAL(5, 2) DEFAULT 100 CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(practice_team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_practice_team_members_team_id 
    ON sim.practice_team_members(practice_team_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_practice_team_members_user_id 
    ON sim.practice_team_members(user_id) WHERE is_active = TRUE;

-- Register tables in database_tables registry
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
    ('sim.practice_stakeholder_register', 'Practice stakeholder register for simulator learning', false, true, 'simulation'),
    ('sim.practice_teams', 'Practice teams for simulator learning', false, true, 'simulation'),
    ('sim.practice_team_members', 'Practice team members for simulator learning', false, true, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

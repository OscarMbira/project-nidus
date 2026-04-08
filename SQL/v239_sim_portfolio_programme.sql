-- =============================================================================
-- v239: Simulator Practice Portfolio & Programme Tables
-- Purpose: Practice portfolios, programmes, and dependencies for simulator learning
-- PRD Reference: Simulator_Feature_Parity_Implementation_Plan.md Phase 1, Task 1.13
-- =============================================================================

-- Create practice_portfolios table
CREATE TABLE IF NOT EXISTS sim.practice_portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_code VARCHAR(100) UNIQUE,
    portfolio_name VARCHAR(200) NOT NULL,
    portfolio_description TEXT,
    portfolio_vision TEXT,
    portfolio_type VARCHAR(100),
    portfolio_category VARCHAR(100),
    portfolio_owner_user_id UUID REFERENCES auth.users(id),
    portfolio_manager_user_id UUID REFERENCES auth.users(id),
    portfolio_start_date DATE,
    portfolio_end_date DATE,
    portfolio_status VARCHAR(50) DEFAULT 'active' CHECK (portfolio_status IN ('planning', 'active', 'on-hold', 'completed', 'cancelled')),
    parent_portfolio_id UUID REFERENCES sim.practice_portfolios(id),
    portfolio_level INTEGER DEFAULT 1,
    strategic_alignment_score DECIMAL(5,2),
    portfolio_goals TEXT,
    total_budget DECIMAL(15,2),
    allocated_budget DECIMAL(15,2),
    budget_currency VARCHAR(3) DEFAULT 'USD',
    total_projects_count INTEGER DEFAULT 0,
    active_projects_count INTEGER DEFAULT 0,
    overall_health_score DECIMAL(5,2),
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_portfolios_user_id 
    ON sim.practice_portfolios(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_portfolios_status 
    ON sim.practice_portfolios(portfolio_status) WHERE is_deleted = FALSE;

-- Create practice_programmes table
CREATE TABLE IF NOT EXISTS sim.practice_programmes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_portfolio_id UUID REFERENCES sim.practice_portfolios(id) ON DELETE SET NULL,
    programme_code VARCHAR(100) UNIQUE,
    programme_name VARCHAR(200) NOT NULL,
    programme_description TEXT,
    programme_vision TEXT,
    programme_type VARCHAR(100),
    programme_owner_user_id UUID REFERENCES auth.users(id),
    programme_manager_user_id UUID REFERENCES auth.users(id),
    programme_start_date DATE,
    programme_end_date DATE,
    programme_status VARCHAR(50) DEFAULT 'planning' CHECK (programme_status IN ('planning', 'active', 'on-hold', 'completed', 'cancelled')),
    programme_goals TEXT,
    total_budget DECIMAL(15,2),
    allocated_budget DECIMAL(15,2),
    budget_currency VARCHAR(3) DEFAULT 'USD',
    total_projects_count INTEGER DEFAULT 0,
    active_projects_count INTEGER DEFAULT 0,
    overall_progress_percentage DECIMAL(5,2) DEFAULT 0,
    overall_health_score DECIMAL(5,2),
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT chk_practice_programmes_dates CHECK (
        programme_end_date IS NULL OR programme_start_date IS NULL OR programme_end_date >= programme_start_date
    )
);

CREATE INDEX IF NOT EXISTS idx_practice_programmes_user_id 
    ON sim.practice_programmes(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_programmes_portfolio_id 
    ON sim.practice_programmes(practice_portfolio_id) WHERE practice_portfolio_id IS NOT NULL;

-- Create practice_portfolio_projects table (linking table)
CREATE TABLE IF NOT EXISTS sim.practice_portfolio_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_portfolio_id UUID NOT NULL REFERENCES sim.practice_portfolios(id) ON DELETE CASCADE,
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    assignment_date DATE DEFAULT CURRENT_DATE,
    assignment_status VARCHAR(50) DEFAULT 'active' CHECK (assignment_status IN ('active', 'proposed', 'pending', 'removed')),
    portfolio_priority VARCHAR(50),
    priority_order INTEGER,
    is_strategic_project BOOLEAN DEFAULT FALSE,
    contribution_to_portfolio_goals TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(practice_portfolio_id, practice_project_id)
);

CREATE INDEX IF NOT EXISTS idx_practice_portfolio_projects_portfolio_id 
    ON sim.practice_portfolio_projects(practice_portfolio_id);
CREATE INDEX IF NOT EXISTS idx_practice_portfolio_projects_project_id 
    ON sim.practice_portfolio_projects(practice_project_id);

-- Create practice_programme_projects table (linking table)
CREATE TABLE IF NOT EXISTS sim.practice_programme_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_programme_id UUID NOT NULL REFERENCES sim.practice_programmes(id) ON DELETE CASCADE,
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    assignment_date DATE DEFAULT CURRENT_DATE,
    assignment_status VARCHAR(50) DEFAULT 'active',
    programme_priority VARCHAR(50),
    priority_order INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(practice_programme_id, practice_project_id)
);

CREATE INDEX IF NOT EXISTS idx_practice_programme_projects_programme_id 
    ON sim.practice_programme_projects(practice_programme_id);
CREATE INDEX IF NOT EXISTS idx_practice_programme_projects_project_id 
    ON sim.practice_programme_projects(practice_project_id);

-- Create practice_dependencies table
CREATE TABLE IF NOT EXISTS sim.practice_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) DEFAULT 'project' CHECK (dependency_type IN ('project', 'programme', 'portfolio', 'external')),
    source_type VARCHAR(50) DEFAULT 'project' CHECK (source_type IN ('project', 'programme', 'portfolio', 'external', 'work_package', 'task')),
    source_id UUID, -- Polymorphic: can reference project, programme, work package, etc.
    source_name VARCHAR(200),
    target_type VARCHAR(50) DEFAULT 'project' CHECK (target_type IN ('project', 'programme', 'portfolio', 'external', 'work_package', 'task')),
    target_id UUID,
    target_name VARCHAR(200),
    dependency_description TEXT,
    dependency_category VARCHAR(50) CHECK (dependency_category IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')),
    lag_days INTEGER DEFAULT 0,
    is_critical BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_dependencies_project_id 
    ON sim.practice_dependencies(practice_project_id);
CREATE INDEX IF NOT EXISTS idx_practice_dependencies_user_id 
    ON sim.practice_dependencies(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_dependencies_source 
    ON sim.practice_dependencies(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_practice_dependencies_target 
    ON sim.practice_dependencies(target_type, target_id);

-- Register tables in database_tables registry
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
    ('sim.practice_portfolios', 'Practice portfolios for simulator learning', false, true, 'simulation'),
    ('sim.practice_programmes', 'Practice programmes for simulator learning', false, true, 'simulation'),
    ('sim.practice_portfolio_projects', 'Practice portfolio-project assignments', false, true, 'simulation'),
    ('sim.practice_programme_projects', 'Practice programme-project assignments', false, true, 'simulation'),
    ('sim.practice_dependencies', 'Practice dependencies for simulator learning', false, true, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

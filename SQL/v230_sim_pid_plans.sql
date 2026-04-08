-- =============================================================================
-- v230: Simulator Practice PID & Plans Tables
-- Purpose: Practice PIDs and plans for simulator learning
-- PRD Reference: Simulator_Feature_Parity_Implementation_Plan.md Phase 1, Task 1.4
-- =============================================================================

-- Create practice_project_initiation_documents table
CREATE TABLE IF NOT EXISTS sim.practice_project_initiation_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    business_case_id UUID REFERENCES sim.practice_business_cases(id),
    project_brief_id UUID REFERENCES sim.practice_project_briefs(id),
    
    -- PID Information
    pid_title VARCHAR(200) NOT NULL,
    pid_description TEXT,
    project_definition TEXT,
    project_objectives TEXT[],
    project_scope TEXT,
    exclusions TEXT,
    interfaces TEXT[],
    
    -- Project Approach
    project_approach TEXT,
    quality_approach TEXT,
    risk_approach TEXT,
    change_control_approach TEXT,
    communication_approach TEXT,
    
    -- Project Management Team
    executive_user_id UUID REFERENCES auth.users(id),
    senior_user_user_id UUID REFERENCES auth.users(id),
    senior_supplier_user_id UUID REFERENCES auth.users(id),
    project_manager_user_id UUID REFERENCES auth.users(id),
    team_manager_user_ids UUID[],
    
    -- Project Controls
    tolerance_levels JSONB DEFAULT '{}'::jsonb,
    reporting_arrangements TEXT,
    monitoring_and_control TEXT,
    
    -- Project Plan Summary
    project_plan_summary JSONB DEFAULT '{}'::jsonb,
    stage_plan_summary JSONB DEFAULT '{}'::jsonb,
    
    -- Status
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    
    -- Document
    document_content JSONB DEFAULT '{}'::jsonb,
    document_version INTEGER DEFAULT 1,
    
    -- Learning/Scoring
    practice_score INTEGER,
    feedback TEXT,
    
    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_pids_project_id 
    ON sim.practice_project_initiation_documents(practice_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_pids_user_id 
    ON sim.practice_project_initiation_documents(user_id) WHERE is_deleted = FALSE;

-- Create practice_project_plans table
CREATE TABLE IF NOT EXISTS sim.practice_project_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID UNIQUE REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    pid_id UUID REFERENCES sim.practice_project_initiation_documents(id),
    
    -- Document Control
    plan_reference VARCHAR(100) UNIQUE NOT NULL,
    version_number VARCHAR(20) DEFAULT '1.0',
    
    -- Plan Overview
    plan_title VARCHAR(500) NOT NULL,
    plan_description TEXT,
    plan_purpose TEXT NOT NULL,
    plan_scope TEXT NOT NULL,
    
    -- Planning Approach
    planning_approach TEXT,
    planning_assumptions TEXT,
    planning_constraints TEXT,
    
    -- Schedule Summary
    planned_start_date DATE NOT NULL,
    planned_end_date DATE NOT NULL,
    project_duration_days INTEGER,
    key_milestones JSONB DEFAULT '[]'::jsonb,
    
    -- Budget Summary
    total_budget DECIMAL(15, 2),
    budget_currency VARCHAR(3) DEFAULT 'USD',
    budget_breakdown JSONB DEFAULT '{}'::jsonb,
    
    -- Resource Summary
    resource_summary TEXT,
    team_structure JSONB DEFAULT '{}'::jsonb,
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'approved', 'baseline', 'superseded')),
    is_baseline BOOLEAN DEFAULT FALSE,
    approved_date DATE,
    approved_by UUID REFERENCES auth.users(id),
    
    -- Learning/Scoring
    practice_score INTEGER,
    feedback TEXT,
    
    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    CONSTRAINT chk_practice_plans_dates CHECK (planned_end_date >= planned_start_date)
);

CREATE INDEX IF NOT EXISTS idx_practice_project_plans_project_id 
    ON sim.practice_project_plans(practice_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_project_plans_user_id 
    ON sim.practice_project_plans(user_id) WHERE is_deleted = FALSE;

-- Create practice_plan_milestones table
CREATE TABLE IF NOT EXISTS sim.practice_plan_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_plan_id UUID REFERENCES sim.practice_project_plans(id) ON DELETE CASCADE,
    milestone_name VARCHAR(200) NOT NULL,
    milestone_description TEXT,
    milestone_date DATE NOT NULL,
    milestone_type VARCHAR(50) DEFAULT 'milestone',
    is_critical BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_plan_milestones_plan_id 
    ON sim.practice_plan_milestones(practice_plan_id);

-- Create practice_plan_resources table
CREATE TABLE IF NOT EXISTS sim.practice_plan_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_plan_id UUID REFERENCES sim.practice_project_plans(id) ON DELETE CASCADE,
    resource_name VARCHAR(200) NOT NULL,
    resource_type VARCHAR(50) DEFAULT 'person' CHECK (resource_type IN ('person', 'equipment', 'material', 'other')),
    resource_description TEXT,
    quantity INTEGER DEFAULT 1,
    unit_cost DECIMAL(10, 2),
    total_cost DECIMAL(15, 2),
    allocation_percentage DECIMAL(5, 2),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_plan_resources_plan_id 
    ON sim.practice_plan_resources(practice_plan_id);

-- Register tables in database_tables registry
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
    ('sim.practice_project_initiation_documents', 'Practice PIDs for simulator learning', false, true, 'simulation'),
    ('sim.practice_project_plans', 'Practice project plans for simulator learning', false, true, 'simulation'),
    ('sim.practice_plan_milestones', 'Practice plan milestones', false, true, 'simulation'),
    ('sim.practice_plan_resources', 'Practice plan resources', false, true, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

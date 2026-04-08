-- =============================================================================
-- v234: Simulator Practice Quality Management Tables
-- Purpose: Practice quality registers and quality management strategies for simulator learning
-- PRD Reference: Simulator_Feature_Parity_Implementation_Plan.md Phase 1, Task 1.8
-- =============================================================================

-- Create practice_quality_register table
CREATE TABLE IF NOT EXISTS sim.practice_quality_register (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    
    -- Product/Deliverable Information
    product_reference VARCHAR(100),
    product_name VARCHAR(200) NOT NULL,
    product_description TEXT,
    product_type VARCHAR(100),
    product_category VARCHAR(100),
    
    -- Quality Information
    quality_method VARCHAR(100),
    quality_responsibilities TEXT,
    quality_owner_user_id UUID REFERENCES auth.users(id),
    
    -- Quality Criteria
    quality_criteria TEXT,
    acceptance_criteria TEXT,
    quality_standards TEXT[],
    compliance_requirements TEXT[],
    
    -- Quality Tolerance
    quality_tolerance_description TEXT,
    defect_tolerance INTEGER,
    
    -- Schedule
    quality_review_planned_date DATE,
    quality_review_actual_date DATE,
    sign_off_required BOOLEAN DEFAULT TRUE,
    sign_off_by_user_id UUID REFERENCES auth.users(id),
    
    -- Status
    quality_status VARCHAR(50) DEFAULT 'pending' CHECK (quality_status IN ('pending', 'in-review', 'passed', 'failed', 'conditional', 'approved')),
    sign_off_status VARCHAR(50),
    sign_off_date DATE,
    
    -- Outcomes
    quality_issues_found INTEGER DEFAULT 0,
    quality_score DECIMAL(5,2),
    pass_criteria_met BOOLEAN,
    
    -- Learning/Scoring
    practice_score INTEGER,
    feedback TEXT,
    
    -- Notes
    notes TEXT,
    
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

CREATE INDEX IF NOT EXISTS idx_practice_quality_register_project_id 
    ON sim.practice_quality_register(practice_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_quality_register_user_id 
    ON sim.practice_quality_register(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_quality_register_status 
    ON sim.practice_quality_register(quality_status) WHERE is_deleted = FALSE;

-- Create practice_quality_management_strategies table (simplified version)
CREATE TABLE IF NOT EXISTS sim.practice_quality_management_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    strategy_name VARCHAR(200) NOT NULL,
    strategy_description TEXT,
    quality_approach TEXT,
    quality_standards JSONB DEFAULT '[]'::jsonb,
    quality_methods JSONB DEFAULT '[]'::jsonb,
    quality_roles JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'baseline')),
    is_baseline BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_qms_project_id 
    ON sim.practice_quality_management_strategies(practice_project_id);
CREATE INDEX IF NOT EXISTS idx_practice_qms_user_id 
    ON sim.practice_quality_management_strategies(user_id);

-- Create practice_quality_activities table
CREATE TABLE IF NOT EXISTS sim.practice_quality_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    practice_quality_register_id UUID REFERENCES sim.practice_quality_register(id) ON DELETE CASCADE,
    activity_identifier VARCHAR(50) UNIQUE,
    activity_name VARCHAR(200) NOT NULL,
    activity_type VARCHAR(50) DEFAULT 'review' CHECK (activity_type IN ('review', 'inspection', 'testing', 'approval', 'audit')),
    activity_description TEXT,
    planned_date DATE,
    actual_date DATE,
    status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
    result VARCHAR(50) CHECK (result IN ('passed', 'failed', 'conditional', 'pending')),
    quality_owner_user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_quality_activities_project_id 
    ON sim.practice_quality_activities(practice_project_id);
CREATE INDEX IF NOT EXISTS idx_practice_quality_activities_register_id 
    ON sim.practice_quality_activities(practice_quality_register_id) WHERE practice_quality_register_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_practice_quality_activities_user_id 
    ON sim.practice_quality_activities(user_id);

-- Register tables in database_tables registry
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
    ('sim.practice_quality_register', 'Practice quality register for simulator learning', false, true, 'simulation'),
    ('sim.practice_quality_management_strategies', 'Practice quality management strategies for simulator learning', false, true, 'simulation'),
    ('sim.practice_quality_activities', 'Practice quality activities for simulator learning', false, true, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

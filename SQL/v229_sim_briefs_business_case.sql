-- =============================================================================
-- v229: Simulator Practice Briefs & Business Case Tables
-- Purpose: Practice briefs and business cases for simulator learning
-- PRD Reference: Simulator_Feature_Parity_Implementation_Plan.md Phase 1, Task 1.3
-- =============================================================================

-- Create practice_project_briefs table
CREATE TABLE IF NOT EXISTS sim.practice_project_briefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    mandate_id UUID REFERENCES sim.project_mandates(id),
    
    -- Brief Information
    brief_title VARCHAR(200) NOT NULL,
    brief_description TEXT,
    project_definition TEXT,
    project_objectives TEXT[],
    project_scope TEXT,
    out_of_scope TEXT,
    
    -- Project Approach
    project_approach TEXT,
    quality_approach TEXT,
    risk_approach TEXT,
    
    -- Team Structure
    executive_user_id UUID REFERENCES auth.users(id),
    senior_user_id UUID REFERENCES auth.users(id),
    project_manager_user_id UUID REFERENCES auth.users(id),
    
    -- Timeline
    target_start_date DATE,
    target_end_date DATE,
    key_milestones JSONB DEFAULT '[]'::jsonb,
    
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

CREATE INDEX IF NOT EXISTS idx_practice_project_briefs_project_id 
    ON sim.practice_project_briefs(practice_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_project_briefs_mandate_id 
    ON sim.practice_project_briefs(mandate_id) WHERE mandate_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_practice_project_briefs_user_id 
    ON sim.practice_project_briefs(user_id) WHERE is_deleted = FALSE;

-- Create practice_business_cases table
CREATE TABLE IF NOT EXISTS sim.practice_business_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    project_brief_id UUID REFERENCES sim.practice_project_briefs(id),
    
    -- Business Case Information
    case_title VARCHAR(200) NOT NULL,
    case_description TEXT,
    business_justification TEXT,
    expected_benefits TEXT,
    expected_costs TEXT,
    expected_risks TEXT,
    
    -- Options Analysis
    options_considered JSONB DEFAULT '[]'::jsonb,
    recommended_option TEXT,
    option_justification TEXT,
    
    -- Financial Analysis
    estimated_cost DECIMAL(15, 2),
    estimated_benefits DECIMAL(15, 2),
    net_present_value DECIMAL(15, 2),
    return_on_investment DECIMAL(5, 2),
    payback_period_months INTEGER,
    
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

CREATE INDEX IF NOT EXISTS idx_practice_business_cases_project_id 
    ON sim.practice_business_cases(practice_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_business_cases_user_id 
    ON sim.practice_business_cases(user_id) WHERE is_deleted = FALSE;

-- Register tables in database_tables registry
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
    ('sim.practice_project_briefs', 'Practice project briefs for simulator learning', false, true, 'simulation'),
    ('sim.practice_business_cases', 'Practice business cases for simulator learning', false, true, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

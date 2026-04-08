-- =============================================================================
-- v232: Simulator Practice Risk Management Tables
-- Purpose: Practice risk registers and risk management strategies for simulator learning
-- PRD Reference: Simulator_Feature_Parity_Implementation_Plan.md Phase 1, Task 1.6
-- =============================================================================

-- Create practice_risk_register table (header)
CREATE TABLE IF NOT EXISTS sim.practice_risk_register (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID UNIQUE REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    register_reference VARCHAR(50) UNIQUE NOT NULL,
    version_number VARCHAR(20) DEFAULT '1.0',
    risk_tolerance_statement TEXT,
    probability_scale JSONB DEFAULT '{}'::jsonb,
    impact_scale JSONB DEFAULT '{}'::jsonb,
    risk_matrix_config JSONB DEFAULT '{}'::jsonb,
    review_frequency VARCHAR(50),
    last_review_date DATE,
    next_review_date DATE,
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

CREATE INDEX IF NOT EXISTS idx_practice_risk_register_project_id 
    ON sim.practice_risk_register(practice_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_risk_register_user_id 
    ON sim.practice_risk_register(user_id) WHERE is_deleted = FALSE;

-- Create practice_risks table (risk entries)
CREATE TABLE IF NOT EXISTS sim.practice_risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    practice_risk_register_id UUID REFERENCES sim.practice_risk_register(id) ON DELETE CASCADE,
    practice_work_package_id UUID REFERENCES sim.practice_work_packages(id),
    
    -- Risk Information
    risk_title VARCHAR(200) NOT NULL,
    risk_description TEXT NOT NULL,
    risk_code VARCHAR(50),
    risk_category VARCHAR(50),
    risk_type VARCHAR(50) DEFAULT 'threat' CHECK (risk_type IN ('threat', 'opportunity')),
    
    -- Assessment
    probability INTEGER DEFAULT 3 CHECK (probability >= 1 AND probability <= 5),
    impact INTEGER DEFAULT 3 CHECK (impact >= 1 AND impact <= 5),
    risk_score INTEGER GENERATED ALWAYS AS (probability * impact) STORED,
    risk_level VARCHAR(50) GENERATED ALWAYS AS (
        CASE 
            WHEN (probability * impact) >= 20 THEN 'critical'
            WHEN (probability * impact) >= 12 THEN 'high'
            WHEN (probability * impact) >= 6 THEN 'medium'
            ELSE 'low'
        END
    ) STORED,
    
    -- Status
    status VARCHAR(50) DEFAULT 'identified' CHECK (status IN ('identified', 'assessed', 'mitigated', 'monitored', 'closed', 'realized')),
    
    -- Ownership
    identified_by_user_id UUID REFERENCES auth.users(id),
    risk_owner_user_id UUID REFERENCES auth.users(id),
    
    -- Response Strategy
    response_strategy VARCHAR(50) CHECK (response_strategy IN ('avoid', 'transfer', 'mitigate', 'accept', 'exploit')),
    response_strategy_description TEXT,
    
    -- Dates
    identified_date DATE DEFAULT CURRENT_DATE,
    target_mitigation_date DATE,
    next_review_date DATE,
    closed_date DATE,
    
    -- Impact Details
    impact_description TEXT,
    affected_areas TEXT[],
    potential_consequences TEXT,
    
    -- Learning/Scoring
    practice_score INTEGER,
    feedback TEXT,
    
    -- Tags
    tags TEXT[],
    
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

CREATE INDEX IF NOT EXISTS idx_practice_risks_project_id 
    ON sim.practice_risks(practice_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_risks_register_id 
    ON sim.practice_risks(practice_risk_register_id) WHERE practice_risk_register_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_practice_risks_user_id 
    ON sim.practice_risks(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_risks_status 
    ON sim.practice_risks(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_risks_risk_level 
    ON sim.practice_risks(risk_level) WHERE is_deleted = FALSE;

-- Create practice_risk_management_strategies table (simplified version)
CREATE TABLE IF NOT EXISTS sim.practice_risk_management_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    strategy_name VARCHAR(200) NOT NULL,
    strategy_description TEXT,
    risk_tolerance_statement TEXT,
    probability_scale JSONB DEFAULT '{}'::jsonb,
    impact_scale JSONB DEFAULT '{}'::jsonb,
    risk_matrix_config JSONB DEFAULT '{}'::jsonb,
    response_strategies JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'baseline')),
    is_baseline BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_rms_project_id 
    ON sim.practice_risk_management_strategies(practice_project_id);
CREATE INDEX IF NOT EXISTS idx_practice_rms_user_id 
    ON sim.practice_risk_management_strategies(user_id);

-- Create practice_rms_templates table
CREATE TABLE IF NOT EXISTS sim.practice_rms_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(200) NOT NULL,
    template_description TEXT,
    template_category VARCHAR(100),
    strategy_structure JSONB DEFAULT '{}'::jsonb,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Register tables in database_tables registry
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
    ('sim.practice_risk_register', 'Practice risk register header for simulator learning', false, true, 'simulation'),
    ('sim.practice_risks', 'Practice risk entries for simulator learning', false, true, 'simulation'),
    ('sim.practice_risk_management_strategies', 'Practice risk management strategies for simulator learning', false, true, 'simulation'),
    ('sim.practice_rms_templates', 'Practice RMS templates for simulator learning', false, true, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

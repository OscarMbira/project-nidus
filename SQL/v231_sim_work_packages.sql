-- =============================================================================
-- v231: Simulator Practice Work Packages Tables
-- Purpose: Practice work packages for simulator learning
-- PRD Reference: Simulator_Feature_Parity_Implementation_Plan.md Phase 1, Task 1.5
-- =============================================================================

-- Create practice_work_packages table
CREATE TABLE IF NOT EXISTS sim.practice_work_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    practice_stage_id UUID REFERENCES sim.practice_project_stages(id),
    assigned_to_user_id UUID REFERENCES auth.users(id),
    
    -- Work Package Information
    work_package_name VARCHAR(200) NOT NULL,
    work_package_description TEXT,
    work_package_code VARCHAR(50),
    
    -- Work Package Details
    objectives TEXT,
    products_deliverables TEXT[],
    quality_criteria TEXT,
    acceptance_criteria TEXT,
    
    -- Dates
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'authorized', 'accepted', 'in_progress', 'completed', 'closed', 'cancelled')),
    authorization_date DATE,
    authorization_by UUID REFERENCES auth.users(id),
    acceptance_date DATE,
    acceptance_by UUID REFERENCES auth.users(id),
    
    -- Progress
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    completion_date DATE,
    
    -- Budget/Cost
    estimated_cost DECIMAL(12,2),
    actual_cost DECIMAL(12,2),
    
    -- Learning/Scoring
    practice_score INTEGER,
    feedback TEXT,
    
    -- Notes
    notes TEXT,
    closure_notes TEXT,
    
    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    CONSTRAINT chk_practice_wp_dates CHECK (
        planned_end_date IS NULL OR planned_start_date IS NULL OR planned_end_date >= planned_start_date
    ),
    CONSTRAINT chk_practice_wp_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

CREATE INDEX IF NOT EXISTS idx_practice_work_packages_project_id 
    ON sim.practice_work_packages(practice_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_work_packages_stage_id 
    ON sim.practice_work_packages(practice_stage_id) WHERE practice_stage_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_practice_work_packages_user_id 
    ON sim.practice_work_packages(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_work_packages_status 
    ON sim.practice_work_packages(status) WHERE is_deleted = FALSE;

-- Create practice_work_package_products table
CREATE TABLE IF NOT EXISTS sim.practice_work_package_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_work_package_id UUID NOT NULL REFERENCES sim.practice_work_packages(id) ON DELETE CASCADE,
    product_name VARCHAR(200) NOT NULL,
    product_description TEXT,
    product_type VARCHAR(50),
    quality_criteria TEXT,
    acceptance_criteria TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_wp_products_wp_id 
    ON sim.practice_work_package_products(practice_work_package_id);

-- Register tables in database_tables registry
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
    ('sim.practice_work_packages', 'Practice work packages for simulator learning', false, true, 'simulation'),
    ('sim.practice_work_package_products', 'Products/deliverables for practice work packages', false, true, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

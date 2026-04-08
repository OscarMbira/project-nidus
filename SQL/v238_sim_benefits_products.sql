-- =============================================================================
-- v238: Simulator Practice Benefits & Product Tables
-- Purpose: Practice benefits review plans and product descriptions for simulator learning
-- PRD Reference: Simulator_Feature_Parity_Implementation_Plan.md Phase 1, Task 1.12
-- =============================================================================

-- Create practice_benefits_review_plans table
CREATE TABLE IF NOT EXISTS sim.practice_benefits_review_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    practice_business_case_id UUID REFERENCES sim.practice_business_cases(id),
    plan_title VARCHAR(300) NOT NULL,
    version_number VARCHAR(20) DEFAULT '1.0',
    plan_date DATE DEFAULT CURRENT_DATE,
    author_user_id UUID REFERENCES auth.users(id),
    owner_user_id UUID REFERENCES auth.users(id),
    scope_description TEXT,
    accountability_description TEXT,
    measurement_approach TEXT,
    measurement_timing_rationale TEXT,
    resources_description TEXT,
    estimated_review_effort_hours DECIMAL(10,2),
    baseline_measures_description TEXT,
    performance_review_approach TEXT,
    performance_review_frequency VARCHAR(50),
    dis_benefits_included BOOLEAN DEFAULT false,
    dis_benefits_description TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_benefits_plans_project_id 
    ON sim.practice_benefits_review_plans(practice_project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_practice_benefits_plans_user_id 
    ON sim.practice_benefits_review_plans(user_id) WHERE is_deleted = false;

-- Create practice_product_descriptions table
CREATE TABLE IF NOT EXISTS sim.practice_product_descriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    pd_reference VARCHAR(100) UNIQUE NOT NULL,
    version_number VARCHAR(20) DEFAULT '1.0',
    author_id UUID REFERENCES auth.users(id),
    owner_id UUID REFERENCES auth.users(id),
    product_title VARCHAR(500) NOT NULL,
    purpose TEXT NOT NULL,
    composition TEXT,
    derivation TEXT,
    development_skills_required TEXT,
    resource_areas TEXT,
    customer_quality_expectations TEXT,
    quality_characteristics TEXT,
    quality_management_system TEXT,
    applicable_standards TEXT,
    satisfaction_targets TEXT,
    product_quality_tolerances TEXT,
    acceptance_method TEXT,
    acceptance_responsibilities TEXT,
    handover_arrangements TEXT,
    phased_handover BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'approved', 'superseded')),
    approved_date DATE,
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_product_descriptions_project_id 
    ON sim.practice_product_descriptions(practice_project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_practice_product_descriptions_user_id 
    ON sim.practice_product_descriptions(user_id) WHERE is_deleted = false;

-- Create practice_project_product_descriptions table
CREATE TABLE IF NOT EXISTS sim.practice_project_product_descriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID UNIQUE REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    ppd_reference VARCHAR(50) UNIQUE NOT NULL,
    version_number VARCHAR(20) DEFAULT '1.0',
    author_id UUID REFERENCES auth.users(id),
    owner_id UUID REFERENCES auth.users(id),
    product_title VARCHAR(200) NOT NULL,
    purpose TEXT NOT NULL,
    composition TEXT,
    derivation TEXT,
    development_skills_required TEXT,
    resource_areas TEXT,
    customer_quality_expectations TEXT,
    quality_characteristics TEXT,
    quality_management_system TEXT,
    applicable_standards TEXT,
    satisfaction_targets TEXT,
    project_quality_tolerances TEXT,
    acceptance_method TEXT,
    acceptance_responsibilities TEXT,
    handover_arrangements TEXT,
    phased_handover BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'approved', 'superseded')),
    approved_date DATE,
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_ppd_project_id 
    ON sim.practice_project_product_descriptions(practice_project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_practice_ppd_user_id 
    ON sim.practice_project_product_descriptions(user_id) WHERE is_deleted = false;

-- Create practice_product_status_accounts table
CREATE TABLE IF NOT EXISTS sim.practice_product_status_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    practice_product_description_id UUID REFERENCES sim.practice_product_descriptions(id),
    psa_reference VARCHAR(100) UNIQUE NOT NULL,
    report_date DATE NOT NULL,
    product_reference VARCHAR(100),
    product_name VARCHAR(200) NOT NULL,
    product_type VARCHAR(50) DEFAULT 'deliverable',
    current_status VARCHAR(50) DEFAULT 'not_started' CHECK (current_status IN ('not_started', 'in_progress', 'completed', 'on_hold', 'cancelled')),
    status_date DATE,
    progress_percentage DECIMAL(5,2) DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    planned_start_date DATE,
    actual_start_date DATE,
    planned_completion_date DATE,
    forecast_completion_date DATE,
    actual_completion_date DATE,
    quality_status VARCHAR(50) DEFAULT 'not_applicable',
    acceptance_status VARCHAR(50) DEFAULT 'not_applicable',
    handover_status VARCHAR(50) DEFAULT 'not_applicable',
    has_issues BOOLEAN DEFAULT false,
    has_blockers BOOLEAN DEFAULT false,
    assigned_to_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_psa_project_id 
    ON sim.practice_product_status_accounts(practice_project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_practice_psa_user_id 
    ON sim.practice_product_status_accounts(user_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_practice_psa_report_date 
    ON sim.practice_product_status_accounts(report_date);

-- Register tables in database_tables registry
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
    ('sim.practice_benefits_review_plans', 'Practice benefits review plans for simulator learning', false, true, 'simulation'),
    ('sim.practice_product_descriptions', 'Practice product descriptions for simulator learning', false, true, 'simulation'),
    ('sim.practice_project_product_descriptions', 'Practice project product descriptions for simulator learning', false, true, 'simulation'),
    ('sim.practice_product_status_accounts', 'Practice product status accounts for simulator learning', false, true, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

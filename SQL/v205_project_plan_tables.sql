-- ============================================================================
-- Plan Documentation Implementation - Project Plan & Stage Plan Tables
-- Version: v205
-- Description: Creates comprehensive Plan Documentation structure for Project Plans and Stage Plans
-- Date: 2026-01-20
-- ============================================================================
--
-- Purpose:
-- Implements comprehensive Plan Documentation functionality based on structured project management methodology.
-- Plan Documentation consists of Project Plan (high-level plan for entire project) and Stage Plan 
-- (detailed plan for each project stage). These plans define what needs to be done, when, by whom, 
-- and how the work will be managed.
--
-- Strategy:
-- 1. Create project_plans main table (one per project)
-- 2. Create stage_plans main table (one per stage)
-- 3. Create 8 supporting tables:
--    - project_plan_milestones
--    - project_plan_resources
--    - stage_plan_milestones
--    - stage_plan_resources
--    - stage_plan_products
--    - plan_revision_history (shared)
--    - plan_approvals (shared)
--    - plan_distribution (shared)
-- 4. Create functions for reference generation, validation, variance analysis
-- 5. Set up triggers for auto-generation and audit
-- 6. Set up RLS policies (in separate file v206)
--
-- Prerequisites:
-- - v01 through v07 must be run first (core tables and trigger functions)
-- - v10_stage_gates_tables.sql must be run (stage_boundaries table exists)
-- - v23_structured_pm_cs.sql must be run (work_packages table exists)
-- - v04_project_core_tables.sql must be run (project_phases table exists)
-- - v07_structured_tables.sql must be run (project_initiation_documents table exists)
-- - projects table must exist
-- - users table must exist
-- - business_cases table exists
-- - project_product_descriptions table exists
-- - quality_management_strategies table exists (v180)
-- - risk_management_strategies table exists (v197)
-- - configuration_management_strategies table exists (v185)
-- - communication_management_strategies table exists (v184)
--
-- Relationship Design:
-- - One Project Plan per project (UNIQUE constraint on project_id)
-- - One Stage Plan per stage (UNIQUE constraint on project_id + stage_number)
--
-- ============================================================================
-- SECTION 1: CREATE PROJECT_PLANS MAIN TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_plans (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship (One plan per project - UNIQUE constraint)
    project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Document Control
    plan_reference VARCHAR(100) UNIQUE NOT NULL, -- e.g., PP-2026-001
    document_ref VARCHAR(200), -- External document reference
    version_number VARCHAR(20) DEFAULT '1.0',
    release VARCHAR(50), -- Release identifier

    -- Document Links
    pid_id UUID REFERENCES project_initiation_documents(id) ON DELETE SET NULL, -- Links to PID
    business_case_id UUID REFERENCES business_cases(id) ON DELETE SET NULL, -- Links to Business Case
    project_product_description_id UUID REFERENCES project_product_descriptions(id) ON DELETE SET NULL, -- Links to PPD

    -- Strategy Links
    quality_management_strategy_id UUID REFERENCES quality_management_strategies(id) ON DELETE SET NULL,
    risk_management_strategy_id UUID REFERENCES risk_management_strategies(id) ON DELETE SET NULL,
    configuration_management_strategy_id UUID REFERENCES configuration_management_strategies(id) ON DELETE SET NULL,
    communication_management_strategy_id UUID REFERENCES communication_management_strategies(id) ON DELETE SET NULL,

    -- Ownership
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    author_name VARCHAR(200), -- For external authors
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Project Manager
    owner_name VARCHAR(200), -- For external owners

    -- Plan Overview
    plan_title VARCHAR(500) NOT NULL, -- Plan title
    plan_description TEXT, -- Plan description
    plan_purpose TEXT NOT NULL, -- Purpose of the plan
    plan_scope TEXT NOT NULL, -- Scope of planning

    -- Planning Approach
    planning_approach TEXT, -- Overall planning approach
    planning_assumptions TEXT, -- Key assumptions
    planning_constraints TEXT, -- Key constraints
    planning_principles TEXT, -- Planning principles

    -- Schedule Summary
    planned_start_date DATE NOT NULL, -- Project planned start
    planned_end_date DATE NOT NULL, -- Project planned end
    project_duration_days INTEGER, -- Calculated duration
    key_milestones JSONB DEFAULT '[]'::jsonb, -- Key project milestones
    stage_summary JSONB DEFAULT '[]'::jsonb, -- Summary of stages

    -- Budget Summary
    total_budget DECIMAL(15, 2), -- Total project budget
    budget_currency VARCHAR(3) DEFAULT 'USD',
    budget_breakdown JSONB DEFAULT '{}'::jsonb, -- Budget by stage/category
    contingency_amount DECIMAL(15, 2), -- Contingency budget
    contingency_percentage DECIMAL(5, 2), -- Contingency percentage

    -- Resource Summary
    resource_summary TEXT, -- Resource requirements summary
    team_structure JSONB DEFAULT '{}'::jsonb, -- Team structure
    resource_allocation JSONB DEFAULT '{}'::jsonb, -- Resource allocation by stage

    -- Risk Summary
    risk_summary TEXT, -- Risk management summary
    key_risks JSONB DEFAULT '[]'::jsonb, -- Key risks from risk register
    risk_mitigation_summary TEXT, -- Mitigation summary

    -- Quality Summary
    quality_summary TEXT, -- Quality management summary
    quality_gates JSONB DEFAULT '[]'::jsonb, -- Quality gates/milestones
    quality_standards TEXT, -- Quality standards

    -- Status
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'approved', 'baseline', 'superseded')),
    is_baseline BOOLEAN DEFAULT FALSE, -- Is this the baseline plan
    baseline_date DATE, -- When plan became baseline
    approved_date DATE, -- Approval date
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Approved by (Project Board)

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Constraints
    CONSTRAINT chk_project_plans_dates CHECK (planned_end_date >= planned_start_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_plans_project_id ON project_plans(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_plans_plan_reference ON project_plans(plan_reference) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_plans_status ON project_plans(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_plans_is_baseline ON project_plans(is_baseline) WHERE is_baseline = TRUE AND is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_plans_pid_id ON project_plans(pid_id) WHERE pid_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_plans_business_case_id ON project_plans(business_case_id) WHERE business_case_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_plans_is_deleted ON project_plans(is_deleted) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_project_plans_before_insert ON project_plans;
CREATE TRIGGER trg_project_plans_before_insert
    BEFORE INSERT ON project_plans
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_project_plans_before_update ON project_plans;
CREATE TRIGGER trg_project_plans_before_update
    BEFORE UPDATE ON project_plans
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Trigger: Auto-calculate duration
CREATE OR REPLACE FUNCTION trg_project_plans_calculate_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.planned_start_date IS NOT NULL AND NEW.planned_end_date IS NOT NULL THEN
        NEW.project_duration_days := (NEW.planned_end_date - NEW.planned_start_date)::INTEGER;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_plans_calculate_duration ON project_plans;
CREATE TRIGGER trg_project_plans_calculate_duration
    BEFORE INSERT OR UPDATE ON project_plans
    FOR EACH ROW
    WHEN (NEW.planned_start_date IS NOT NULL AND NEW.planned_end_date IS NOT NULL)
    EXECUTE FUNCTION trg_project_plans_calculate_duration();

-- Comments
COMMENT ON TABLE project_plans IS 'Project Plan - High-level plan covering the entire project lifecycle';
COMMENT ON COLUMN project_plans.project_id IS 'One-to-one relationship with project (UNIQUE constraint)';
COMMENT ON COLUMN project_plans.plan_reference IS 'Unique plan reference (e.g., PP-2026-001)';
COMMENT ON COLUMN project_plans.status IS 'Plan workflow status: draft, under_review, approved, baseline, superseded';
COMMENT ON COLUMN project_plans.is_baseline IS 'Indicates if this is the baseline plan (only one baseline per project)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('project_plans', 'Project Plan - High-level plan for entire project lifecycle', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 2: CREATE STAGE_PLANS MAIN TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS stage_plans (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stage_boundary_id UUID REFERENCES stage_boundaries(id) ON DELETE SET NULL, -- Links to stage boundary
    project_phase_id UUID REFERENCES project_phases(id) ON DELETE SET NULL, -- Links to project phase
    project_plan_id UUID NOT NULL REFERENCES project_plans(id) ON DELETE CASCADE, -- Links to Project Plan
    
    -- Document Control
    plan_reference VARCHAR(100) UNIQUE NOT NULL, -- e.g., SP-2026-001-STAGE1
    document_ref VARCHAR(200), -- External document reference
    version_number VARCHAR(20) DEFAULT '1.0',
    release VARCHAR(50), -- Release identifier

    -- Stage Information
    stage_name VARCHAR(200) NOT NULL, -- Stage name
    stage_number INTEGER NOT NULL, -- Stage sequence number
    stage_description TEXT, -- Stage description
    stage_objectives TEXT, -- Stage objectives

    -- Ownership
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    author_name VARCHAR(200), -- For external authors
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Stage Manager
    owner_name VARCHAR(200), -- For external owners

    -- Plan Overview
    plan_title VARCHAR(500) NOT NULL, -- Stage plan title
    plan_description TEXT, -- Plan description
    plan_purpose TEXT NOT NULL, -- Purpose of the stage plan
    plan_scope TEXT NOT NULL, -- Scope of stage planning

    -- Planning Approach
    planning_approach TEXT, -- Stage planning approach
    planning_assumptions TEXT, -- Key assumptions
    planning_constraints TEXT, -- Key constraints

    -- Schedule
    planned_start_date DATE NOT NULL, -- Stage planned start
    planned_end_date DATE NOT NULL, -- Stage planned end
    stage_duration_days INTEGER, -- Calculated duration
    key_milestones JSONB DEFAULT '[]'::jsonb, -- Stage milestones
    dependencies JSONB DEFAULT '[]'::jsonb, -- Dependencies on other stages/work packages

    -- Budget
    stage_budget DECIMAL(15, 2), -- Stage budget
    budget_currency VARCHAR(3) DEFAULT 'USD',
    budget_breakdown JSONB DEFAULT '{}'::jsonb, -- Budget by work package/category
    contingency_amount DECIMAL(15, 2), -- Stage contingency

    -- Resources
    resource_requirements TEXT, -- Resource requirements
    team_assignment JSONB DEFAULT '{}'::jsonb, -- Team assignments
    resource_allocation JSONB DEFAULT '{}'::jsonb, -- Resource allocation

    -- Products/Deliverables
    products_summary TEXT, -- Products to be delivered
    products_list JSONB DEFAULT '[]'::jsonb, -- List of products/deliverables
    acceptance_criteria TEXT, -- Acceptance criteria

    -- Work Packages
    work_packages_summary TEXT, -- Work packages summary
    work_packages_list JSONB DEFAULT '[]'::jsonb, -- List of work package IDs/references

    -- Risks
    risk_summary TEXT, -- Stage risk summary
    key_risks JSONB DEFAULT '[]'::jsonb, -- Key risks for this stage

    -- Quality
    quality_summary TEXT, -- Quality management for stage
    quality_gates JSONB DEFAULT '[]'::jsonb, -- Stage quality gates

    -- Status
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'approved', 'baseline', 'in_execution', 'completed', 'superseded')),
    is_baseline BOOLEAN DEFAULT FALSE, -- Is this the baseline plan
    baseline_date DATE, -- When plan became baseline
    approved_date DATE, -- Approval date
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Approved by
    actual_start_date DATE, -- Actual start date
    actual_end_date DATE, -- Actual end date

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Constraints
    CONSTRAINT chk_stage_plans_dates CHECK (planned_end_date >= planned_start_date),
    CONSTRAINT uq_stage_plans_project_stage UNIQUE (project_id, stage_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stage_plans_project_id ON stage_plans(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stage_plans_project_plan_id ON stage_plans(project_plan_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stage_plans_stage_boundary_id ON stage_plans(stage_boundary_id) WHERE stage_boundary_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stage_plans_project_phase_id ON stage_plans(project_phase_id) WHERE project_phase_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stage_plans_stage_number ON stage_plans(project_id, stage_number) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stage_plans_plan_reference ON stage_plans(plan_reference) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stage_plans_status ON stage_plans(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stage_plans_is_baseline ON stage_plans(is_baseline) WHERE is_baseline = TRUE AND is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stage_plans_is_deleted ON stage_plans(is_deleted) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_stage_plans_before_insert ON stage_plans;
CREATE TRIGGER trg_stage_plans_before_insert
    BEFORE INSERT ON stage_plans
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_stage_plans_before_update ON stage_plans;
CREATE TRIGGER trg_stage_plans_before_update
    BEFORE UPDATE ON stage_plans
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Trigger: Auto-calculate duration
CREATE OR REPLACE FUNCTION trg_stage_plans_calculate_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.planned_start_date IS NOT NULL AND NEW.planned_end_date IS NOT NULL THEN
        NEW.stage_duration_days := (NEW.planned_end_date - NEW.planned_start_date)::INTEGER;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stage_plans_calculate_duration ON stage_plans;
CREATE TRIGGER trg_stage_plans_calculate_duration
    BEFORE INSERT OR UPDATE ON stage_plans
    FOR EACH ROW
    WHEN (NEW.planned_start_date IS NOT NULL AND NEW.planned_end_date IS NOT NULL)
    EXECUTE FUNCTION trg_stage_plans_calculate_duration();

-- Comments
COMMENT ON TABLE stage_plans IS 'Stage Plan - Detailed plan for each project stage';
COMMENT ON COLUMN stage_plans.project_id IS 'Project this stage plan belongs to';
COMMENT ON COLUMN stage_plans.stage_number IS 'Stage sequence number (UNIQUE per project)';
COMMENT ON COLUMN stage_plans.plan_reference IS 'Unique plan reference (e.g., SP-2026-001-STAGE1)';
COMMENT ON COLUMN stage_plans.status IS 'Plan workflow status: draft, under_review, approved, baseline, in_execution, completed, superseded';
COMMENT ON COLUMN stage_plans.is_baseline IS 'Indicates if this is the baseline plan (only one baseline per stage)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('stage_plans', 'Stage Plan - Detailed plan for each project stage', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 3: CREATE PROJECT_PLAN_MILESTONES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_plan_milestones (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    project_plan_id UUID NOT NULL REFERENCES project_plans(id) ON DELETE CASCADE,

    -- Milestone Details
    milestone_number INTEGER NOT NULL, -- Sequence number
    milestone_name VARCHAR(500) NOT NULL, -- Milestone name
    milestone_description TEXT, -- Description
    milestone_date DATE NOT NULL, -- Planned date
    milestone_type VARCHAR(50) DEFAULT 'other' CHECK (milestone_type IN ('project_start', 'stage_start', 'stage_end', 'project_end', 'key_deliverable', 'decision_point', 'other')),
    is_critical BOOLEAN DEFAULT FALSE, -- Critical milestone
    dependencies TEXT, -- Dependencies
    display_order INTEGER DEFAULT 0,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_plan_milestones_plan_id ON project_plan_milestones(project_plan_id);
CREATE INDEX IF NOT EXISTS idx_project_plan_milestones_date ON project_plan_milestones(project_plan_id, milestone_date);
CREATE INDEX IF NOT EXISTS idx_project_plan_milestones_type ON project_plan_milestones(milestone_type);
CREATE INDEX IF NOT EXISTS idx_project_plan_milestones_critical ON project_plan_milestones(project_plan_id, is_critical) WHERE is_critical = TRUE;
CREATE INDEX IF NOT EXISTS idx_project_plan_milestones_display_order ON project_plan_milestones(project_plan_id, display_order);

-- Comments
COMMENT ON TABLE project_plan_milestones IS 'Project Plan Milestones - Key milestones for the project plan';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('project_plan_milestones', 'Project Plan Milestones', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 4: CREATE PROJECT_PLAN_RESOURCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_plan_resources (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    project_plan_id UUID NOT NULL REFERENCES project_plans(id) ON DELETE CASCADE,

    -- Resource Details
    resource_type VARCHAR(50) DEFAULT 'other' CHECK (resource_type IN ('human', 'equipment', 'material', 'financial', 'other')),
    resource_name VARCHAR(500) NOT NULL, -- Resource name/description
    resource_description TEXT, -- Description
    quantity_required DECIMAL(15, 2), -- Quantity needed
    unit_of_measure VARCHAR(50), -- Unit (hours, days, units, etc.)
    cost_per_unit DECIMAL(15, 2), -- Cost per unit
    total_cost DECIMAL(15, 2), -- Total cost
    allocation_by_stage JSONB DEFAULT '{}'::jsonb, -- Allocation by stage
    availability_constraints TEXT, -- Availability constraints
    display_order INTEGER DEFAULT 0,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_plan_resources_plan_id ON project_plan_resources(project_plan_id);
CREATE INDEX IF NOT EXISTS idx_project_plan_resources_type ON project_plan_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_project_plan_resources_display_order ON project_plan_resources(project_plan_id, display_order);

-- Trigger: Auto-calculate total_cost
CREATE OR REPLACE FUNCTION trg_project_plan_resources_calculate_cost()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quantity_required IS NOT NULL AND NEW.cost_per_unit IS NOT NULL THEN
        NEW.total_cost := NEW.quantity_required * NEW.cost_per_unit;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_plan_resources_calculate_cost ON project_plan_resources;
CREATE TRIGGER trg_project_plan_resources_calculate_cost
    BEFORE INSERT OR UPDATE ON project_plan_resources
    FOR EACH ROW
    WHEN (NEW.quantity_required IS NOT NULL AND NEW.cost_per_unit IS NOT NULL)
    EXECUTE FUNCTION trg_project_plan_resources_calculate_cost();

-- Comments
COMMENT ON TABLE project_plan_resources IS 'Project Plan Resources - Resource requirements for the project plan';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('project_plan_resources', 'Project Plan Resources', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 5: CREATE STAGE_PLAN_MILESTONES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS stage_plan_milestones (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    stage_plan_id UUID NOT NULL REFERENCES stage_plans(id) ON DELETE CASCADE,

    -- Milestone Details
    milestone_number INTEGER NOT NULL, -- Sequence number
    milestone_name VARCHAR(500) NOT NULL, -- Milestone name
    milestone_description TEXT, -- Description
    milestone_date DATE NOT NULL, -- Planned date
    milestone_type VARCHAR(50) DEFAULT 'other' CHECK (milestone_type IN ('stage_start', 'deliverable', 'quality_gate', 'decision_point', 'stage_end', 'other')),
    is_critical BOOLEAN DEFAULT FALSE, -- Critical milestone
    linked_work_package_id UUID REFERENCES work_packages(id) ON DELETE SET NULL, -- Linked work package
    dependencies TEXT, -- Dependencies
    display_order INTEGER DEFAULT 0,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stage_plan_milestones_plan_id ON stage_plan_milestones(stage_plan_id);
CREATE INDEX IF NOT EXISTS idx_stage_plan_milestones_date ON stage_plan_milestones(stage_plan_id, milestone_date);
CREATE INDEX IF NOT EXISTS idx_stage_plan_milestones_type ON stage_plan_milestones(milestone_type);
CREATE INDEX IF NOT EXISTS idx_stage_plan_milestones_critical ON stage_plan_milestones(stage_plan_id, is_critical) WHERE is_critical = TRUE;
CREATE INDEX IF NOT EXISTS idx_stage_plan_milestones_work_package ON stage_plan_milestones(linked_work_package_id) WHERE linked_work_package_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stage_plan_milestones_display_order ON stage_plan_milestones(stage_plan_id, display_order);

-- Comments
COMMENT ON TABLE stage_plan_milestones IS 'Stage Plan Milestones - Key milestones for the stage plan';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('stage_plan_milestones', 'Stage Plan Milestones', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 6: CREATE STAGE_PLAN_RESOURCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS stage_plan_resources (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    stage_plan_id UUID NOT NULL REFERENCES stage_plans(id) ON DELETE CASCADE,

    -- Resource Details
    resource_type VARCHAR(50) DEFAULT 'other' CHECK (resource_type IN ('human', 'equipment', 'material', 'financial', 'other')),
    resource_name VARCHAR(500) NOT NULL, -- Resource name/description
    resource_description TEXT, -- Description
    quantity_required DECIMAL(15, 2), -- Quantity needed
    unit_of_measure VARCHAR(50), -- Unit
    cost_per_unit DECIMAL(15, 2), -- Cost per unit
    total_cost DECIMAL(15, 2), -- Total cost
    allocation_by_work_package JSONB DEFAULT '{}'::jsonb, -- Allocation by work package
    availability_constraints TEXT, -- Availability constraints
    display_order INTEGER DEFAULT 0,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stage_plan_resources_plan_id ON stage_plan_resources(stage_plan_id);
CREATE INDEX IF NOT EXISTS idx_stage_plan_resources_type ON stage_plan_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_stage_plan_resources_display_order ON stage_plan_resources(stage_plan_id, display_order);

-- Trigger: Auto-calculate total_cost
CREATE OR REPLACE FUNCTION trg_stage_plan_resources_calculate_cost()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quantity_required IS NOT NULL AND NEW.cost_per_unit IS NOT NULL THEN
        NEW.total_cost := NEW.quantity_required * NEW.cost_per_unit;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stage_plan_resources_calculate_cost ON stage_plan_resources;
CREATE TRIGGER trg_stage_plan_resources_calculate_cost
    BEFORE INSERT OR UPDATE ON stage_plan_resources
    FOR EACH ROW
    WHEN (NEW.quantity_required IS NOT NULL AND NEW.cost_per_unit IS NOT NULL)
    EXECUTE FUNCTION trg_stage_plan_resources_calculate_cost();

-- Comments
COMMENT ON TABLE stage_plan_resources IS 'Stage Plan Resources - Resource requirements for the stage plan';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('stage_plan_resources', 'Stage Plan Resources', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 7: CREATE STAGE_PLAN_PRODUCTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS stage_plan_products (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    stage_plan_id UUID NOT NULL REFERENCES stage_plans(id) ON DELETE CASCADE,

    -- Product Details
    product_number INTEGER NOT NULL, -- Sequence number
    product_name VARCHAR(500) NOT NULL, -- Product name
    product_description TEXT, -- Description
    product_type VARCHAR(50) DEFAULT 'other' CHECK (product_type IN ('deliverable', 'interim_product', 'management_product', 'specialist_product', 'other')),
    acceptance_criteria TEXT, -- Acceptance criteria
    planned_completion_date DATE, -- Planned completion
    linked_work_package_id UUID REFERENCES work_packages(id) ON DELETE SET NULL, -- Linked work package
    linked_product_description_id UUID, -- Linked product description (references product_descriptions table when implemented)
    linked_ppd_composition_item_id UUID REFERENCES ppd_composition_items(id) ON DELETE SET NULL, -- Linked PPD composition item (product from PPD)
    display_order INTEGER DEFAULT 0,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stage_plan_products_plan_id ON stage_plan_products(stage_plan_id);
CREATE INDEX IF NOT EXISTS idx_stage_plan_products_type ON stage_plan_products(product_type);
CREATE INDEX IF NOT EXISTS idx_stage_plan_products_work_package ON stage_plan_products(linked_work_package_id) WHERE linked_work_package_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stage_plan_products_product_description ON stage_plan_products(linked_product_description_id) WHERE linked_product_description_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stage_plan_products_ppd_composition ON stage_plan_products(linked_ppd_composition_item_id) WHERE linked_ppd_composition_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stage_plan_products_display_order ON stage_plan_products(stage_plan_id, display_order);
CREATE INDEX IF NOT EXISTS idx_stage_plan_products_completion_date ON stage_plan_products(stage_plan_id, planned_completion_date);

-- Comments
COMMENT ON TABLE stage_plan_products IS 'Stage Plan Products - Products/deliverables for the stage plan';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('stage_plan_products', 'Stage Plan Products', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 8: CREATE PLAN_REVISION_HISTORY TABLE (Shared)
-- ============================================================================

CREATE TABLE IF NOT EXISTS plan_revision_history (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Plan Identification
    plan_type VARCHAR(50) NOT NULL CHECK (plan_type IN ('project_plan', 'stage_plan')),
    plan_id UUID NOT NULL, -- ID of project_plan or stage_plan (no FK due to polymorphic relationship)

    -- Revision Details
    revision_date DATE NOT NULL DEFAULT CURRENT_DATE,
    previous_revision_date DATE,
    version_number VARCHAR(20) NOT NULL, -- Version number
    previous_version_number VARCHAR(20), -- Previous version number
    summary_of_changes TEXT NOT NULL, -- Summary of changes
    changes_marked TEXT, -- Marked up changes
    change_reason TEXT, -- Reason for change
    change_request_id UUID REFERENCES change_requests(id) ON DELETE SET NULL, -- Linked change request
    revised_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_plan_revision_history_plan ON plan_revision_history(plan_type, plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_revision_history_date ON plan_revision_history(plan_type, plan_id, revision_date DESC);
CREATE INDEX IF NOT EXISTS idx_plan_revision_history_version ON plan_revision_history(plan_type, plan_id, version_number);
CREATE INDEX IF NOT EXISTS idx_plan_revision_history_revised_by ON plan_revision_history(revised_by);

-- Comments
COMMENT ON TABLE plan_revision_history IS 'Plan Revision History - Tracks all revisions for both Project Plans and Stage Plans';
COMMENT ON COLUMN plan_revision_history.plan_type IS 'Type of plan: project_plan or stage_plan';
COMMENT ON COLUMN plan_revision_history.plan_id IS 'ID of the plan (references project_plans.id or stage_plans.id based on plan_type)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('plan_revision_history', 'Plan Revision History', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 9: CREATE PLAN_APPROVALS TABLE (Shared)
-- ============================================================================

CREATE TABLE IF NOT EXISTS plan_approvals (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Plan Identification
    plan_type VARCHAR(50) NOT NULL CHECK (plan_type IN ('project_plan', 'stage_plan')),
    plan_id UUID NOT NULL, -- ID of project_plan or stage_plan (no FK due to polymorphic relationship)

    -- Approver Details
    approver_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    approver_name VARCHAR(200) NOT NULL,
    approver_title VARCHAR(200),
    approver_role VARCHAR(50) DEFAULT 'other' CHECK (approver_role IN ('executive', 'senior_user', 'senior_supplier', 'project_manager', 'stage_manager', 'project_board_member', 'other')),
    signature_data TEXT, -- Digital signature or approval token
    approval_date DATE,
    approval_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'conditional')),
    comments TEXT, -- Approval comments
    version_approved VARCHAR(20), -- Which version was approved

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_plan_approvals_plan ON plan_approvals(plan_type, plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_approvals_status ON plan_approvals(plan_type, plan_id, approval_status) WHERE approval_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_plan_approvals_approver ON plan_approvals(approver_id) WHERE approval_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_plan_approvals_date ON plan_approvals(plan_type, plan_id, approval_date DESC);

-- Comments
COMMENT ON TABLE plan_approvals IS 'Plan Approvals - Approval workflow for both Project Plans and Stage Plans';
COMMENT ON COLUMN plan_approvals.plan_type IS 'Type of plan: project_plan or stage_plan';
COMMENT ON COLUMN plan_approvals.plan_id IS 'ID of the plan (references project_plans.id or stage_plans.id based on plan_type)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('plan_approvals', 'Plan Approvals', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 10: CREATE PLAN_DISTRIBUTION TABLE (Shared)
-- ============================================================================

CREATE TABLE IF NOT EXISTS plan_distribution (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Plan Identification
    plan_type VARCHAR(50) NOT NULL CHECK (plan_type IN ('project_plan', 'stage_plan')),
    plan_id UUID NOT NULL, -- ID of project_plan or stage_plan (no FK due to polymorphic relationship)

    -- Recipient Details
    recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_name VARCHAR(200) NOT NULL,
    recipient_title VARCHAR(200),
    date_of_issue DATE NOT NULL DEFAULT CURRENT_DATE,
    version_distributed VARCHAR(20), -- Which version was distributed

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_plan_distribution_plan ON plan_distribution(plan_type, plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_distribution_recipient ON plan_distribution(recipient_id) WHERE recipient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plan_distribution_date ON plan_distribution(plan_type, plan_id, date_of_issue DESC);

-- Comments
COMMENT ON TABLE plan_distribution IS 'Plan Distribution - Distribution list for both Project Plans and Stage Plans';
COMMENT ON COLUMN plan_distribution.plan_type IS 'Type of plan: project_plan or stage_plan';
COMMENT ON COLUMN plan_distribution.plan_id IS 'ID of the plan (references project_plans.id or stage_plans.id based on plan_type)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('plan_distribution', 'Plan Distribution', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 11: DATABASE FUNCTIONS
-- ============================================================================

-- Function: Generate Project Plan Reference
-- Generates unique Project Plan reference number (e.g., PP-2026-001)
CREATE OR REPLACE FUNCTION generate_project_plan_reference(p_project_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_project_ref VARCHAR;
    v_year INTEGER;
    v_sequence INTEGER;
    v_reference VARCHAR;
BEGIN
    -- Get project reference
    SELECT project_reference INTO v_project_ref
    FROM projects
    WHERE id = p_project_id;

    IF v_project_ref IS NULL THEN
        RAISE EXCEPTION 'Could not find project for project_id %', p_project_id;
    END IF;

    -- Get current year
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);

    -- Get next sequence number for this year
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(plan_reference FROM 'PP-' || v_year || '-(.+)$') AS INTEGER)
    ), 0) + 1
    INTO v_sequence
    FROM project_plans
    WHERE plan_reference LIKE 'PP-' || v_year || '-%'
      AND is_deleted = FALSE;

    -- Format: PP-YYYY-NNN
    v_reference := 'PP-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0');

    RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_project_plan_reference(UUID) IS 'Generates unique Project Plan reference (e.g., PP-2026-001)';

-- Function: Generate Stage Plan Reference
-- Generates unique Stage Plan reference number (e.g., SP-2026-001-STAGE1)
CREATE OR REPLACE FUNCTION generate_stage_plan_reference(p_project_id UUID, p_stage_number INTEGER)
RETURNS VARCHAR AS $$
DECLARE
    v_project_ref VARCHAR;
    v_year INTEGER;
    v_sequence INTEGER;
    v_reference VARCHAR;
BEGIN
    -- Get project reference
    SELECT project_reference INTO v_project_ref
    FROM projects
    WHERE id = p_project_id;

    IF v_project_ref IS NULL THEN
        RAISE EXCEPTION 'Could not find project for project_id %', p_project_id;
    END IF;

    -- Get current year
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);

    -- Get next sequence number for this year
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(plan_reference FROM 'SP-' || v_year || '-(.+?)-STAGE') AS INTEGER)
    ), 0) + 1
    INTO v_sequence
    FROM stage_plans
    WHERE plan_reference LIKE 'SP-' || v_year || '-%'
      AND is_deleted = FALSE;

    -- Format: SP-YYYY-NNN-STAGE{N}
    v_reference := 'SP-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0') || '-STAGE' || p_stage_number::TEXT;

    RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_stage_plan_reference(UUID, INTEGER) IS 'Generates unique Stage Plan reference (e.g., SP-2026-001-STAGE1)';

-- Function: Create Stage Plan from Project Plan
-- Creates Stage Plan from Project Plan with defaults
CREATE OR REPLACE FUNCTION create_stage_plan_from_project_plan(
    p_project_plan_id UUID,
    p_stage_number INTEGER,
    p_stage_name VARCHAR
)
RETURNS UUID AS $$
DECLARE
    v_project_plan RECORD;
    v_stage_plan_id UUID;
BEGIN
    -- Get project plan details
    SELECT * INTO v_project_plan
    FROM project_plans
    WHERE id = p_project_plan_id
    AND is_deleted = FALSE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Project Plan not found: %', p_project_plan_id;
    END IF;

    -- Create stage plan with defaults from project plan
    INSERT INTO stage_plans (
        project_id,
        project_plan_id,
        stage_name,
        stage_number,
        plan_title,
        plan_purpose,
        plan_scope,
        planned_start_date,
        planned_end_date,
        budget_currency,
        status,
        created_by
    )
    VALUES (
        v_project_plan.project_id,
        p_project_plan_id,
        p_stage_name,
        p_stage_number,
        'Stage Plan: ' || p_stage_name,
        'Detailed plan for ' || p_stage_name,
        'Planning for ' || p_stage_name || ' stage',
        v_project_plan.planned_start_date, -- Default to project start
        v_project_plan.planned_end_date, -- Default to project end
        v_project_plan.budget_currency,
        'draft',
        v_project_plan.created_by
    )
    RETURNING id INTO v_stage_plan_id;

    -- Generate reference
    UPDATE stage_plans
    SET plan_reference = generate_stage_plan_reference(v_project_plan.project_id, p_stage_number)
    WHERE id = v_stage_plan_id;

    RETURN v_stage_plan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, auth;

COMMENT ON FUNCTION create_stage_plan_from_project_plan(UUID, INTEGER, VARCHAR) IS 'Creates Stage Plan from Project Plan with defaults';

-- Function: Validate Plan Completeness
-- Validates that plan has all required sections
CREATE OR REPLACE FUNCTION validate_plan_completeness(
    p_plan_id UUID,
    p_plan_type VARCHAR
)
RETURNS TABLE (
    section_name VARCHAR,
    is_complete BOOLEAN,
    missing_items TEXT[],
    recommendations TEXT
) AS $$
DECLARE
    v_plan RECORD;
    v_missing TEXT[];
BEGIN
    IF p_plan_type = 'project_plan' THEN
        SELECT * INTO v_plan
        FROM project_plans
        WHERE id = p_plan_id
        AND is_deleted = FALSE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Project Plan not found: %', p_plan_id;
        END IF;

        -- Validate Document Information
        v_missing := ARRAY[]::TEXT[];
        IF v_plan.plan_title IS NULL OR v_plan.plan_title = '' THEN
            v_missing := array_append(v_missing, 'plan_title');
        END IF;
        IF v_plan.plan_purpose IS NULL OR v_plan.plan_purpose = '' THEN
            v_missing := array_append(v_missing, 'plan_purpose');
        END IF;
        IF v_plan.plan_scope IS NULL OR v_plan.plan_scope = '' THEN
            v_missing := array_append(v_missing, 'plan_scope');
        END IF;
        RETURN QUERY SELECT 
            'Document Information'::VARCHAR,
            (array_length(v_missing, 1) IS NULL OR array_length(v_missing, 1) = 0)::BOOLEAN,
            COALESCE(v_missing, ARRAY[]::TEXT[]),
            CASE WHEN array_length(v_missing, 1) > 0 THEN 'Complete plan title, purpose, and scope' ELSE NULL END;

        -- Validate Schedule
        v_missing := ARRAY[]::TEXT[];
        IF v_plan.planned_start_date IS NULL THEN
            v_missing := array_append(v_missing, 'planned_start_date');
        END IF;
        IF v_plan.planned_end_date IS NULL THEN
            v_missing := array_append(v_missing, 'planned_end_date');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM project_plan_milestones WHERE project_plan_id = p_plan_id) THEN
            v_missing := array_append(v_missing, 'at_least_one_milestone');
        END IF;
        RETURN QUERY SELECT 
            'Schedule'::VARCHAR,
            (array_length(v_missing, 1) IS NULL OR array_length(v_missing, 1) = 0)::BOOLEAN,
            COALESCE(v_missing, ARRAY[]::TEXT[]),
            CASE WHEN array_length(v_missing, 1) > 0 THEN 'Define planned dates and add at least one milestone' ELSE NULL END;

        -- Validate Budget
        v_missing := ARRAY[]::TEXT[];
        IF v_plan.total_budget IS NULL THEN
            v_missing := array_append(v_missing, 'total_budget');
        END IF;
        RETURN QUERY SELECT 
            'Budget'::VARCHAR,
            (array_length(v_missing, 1) IS NULL OR array_length(v_missing, 1) = 0)::BOOLEAN,
            COALESCE(v_missing, ARRAY[]::TEXT[]),
            CASE WHEN array_length(v_missing, 1) > 0 THEN 'Define total project budget' ELSE NULL END;

        -- Validate Resources
        v_missing := ARRAY[]::TEXT[];
        IF NOT EXISTS (SELECT 1 FROM project_plan_resources WHERE project_plan_id = p_plan_id) THEN
            v_missing := array_append(v_missing, 'at_least_one_resource');
        END IF;
        RETURN QUERY SELECT 
            'Resources'::VARCHAR,
            (array_length(v_missing, 1) IS NULL OR array_length(v_missing, 1) = 0)::BOOLEAN,
            COALESCE(v_missing, ARRAY[]::TEXT[]),
            CASE WHEN array_length(v_missing, 1) > 0 THEN 'Define at least one resource requirement' ELSE NULL END;

    ELSIF p_plan_type = 'stage_plan' THEN
        SELECT * INTO v_plan
        FROM stage_plans
        WHERE id = p_plan_id
        AND is_deleted = FALSE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Stage Plan not found: %', p_plan_id;
        END IF;

        -- Validate Document Information
        v_missing := ARRAY[]::TEXT[];
        IF v_plan.plan_title IS NULL OR v_plan.plan_title = '' THEN
            v_missing := array_append(v_missing, 'plan_title');
        END IF;
        IF v_plan.stage_name IS NULL OR v_plan.stage_name = '' THEN
            v_missing := array_append(v_missing, 'stage_name');
        END IF;
        IF v_plan.plan_purpose IS NULL OR v_plan.plan_purpose = '' THEN
            v_missing := array_append(v_missing, 'plan_purpose');
        END IF;
        IF v_plan.plan_scope IS NULL OR v_plan.plan_scope = '' THEN
            v_missing := array_append(v_missing, 'plan_scope');
        END IF;
        RETURN QUERY SELECT 
            'Document Information'::VARCHAR,
            (array_length(v_missing, 1) IS NULL OR array_length(v_missing, 1) = 0)::BOOLEAN,
            COALESCE(v_missing, ARRAY[]::TEXT[]),
            CASE WHEN array_length(v_missing, 1) > 0 THEN 'Complete plan title, stage name, purpose, and scope' ELSE NULL END;

        -- Validate Schedule
        v_missing := ARRAY[]::TEXT[];
        IF v_plan.planned_start_date IS NULL THEN
            v_missing := array_append(v_missing, 'planned_start_date');
        END IF;
        IF v_plan.planned_end_date IS NULL THEN
            v_missing := array_append(v_missing, 'planned_end_date');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM stage_plan_milestones WHERE stage_plan_id = p_plan_id) THEN
            v_missing := array_append(v_missing, 'at_least_one_milestone');
        END IF;
        RETURN QUERY SELECT 
            'Schedule'::VARCHAR,
            (array_length(v_missing, 1) IS NULL OR array_length(v_missing, 1) = 0)::BOOLEAN,
            COALESCE(v_missing, ARRAY[]::TEXT[]),
            CASE WHEN array_length(v_missing, 1) > 0 THEN 'Define planned dates and add at least one milestone' ELSE NULL END;

        -- Validate Budget
        v_missing := ARRAY[]::TEXT[];
        IF v_plan.stage_budget IS NULL THEN
            v_missing := array_append(v_missing, 'stage_budget');
        END IF;
        RETURN QUERY SELECT 
            'Budget'::VARCHAR,
            (array_length(v_missing, 1) IS NULL OR array_length(v_missing, 1) = 0)::BOOLEAN,
            COALESCE(v_missing, ARRAY[]::TEXT[]),
            CASE WHEN array_length(v_missing, 1) > 0 THEN 'Define stage budget' ELSE NULL END;

        -- Validate Resources
        v_missing := ARRAY[]::TEXT[];
        IF NOT EXISTS (SELECT 1 FROM stage_plan_resources WHERE stage_plan_id = p_plan_id) THEN
            v_missing := array_append(v_missing, 'at_least_one_resource');
        END IF;
        RETURN QUERY SELECT 
            'Resources'::VARCHAR,
            (array_length(v_missing, 1) IS NULL OR array_length(v_missing, 1) = 0)::BOOLEAN,
            COALESCE(v_missing, ARRAY[]::TEXT[]),
            CASE WHEN array_length(v_missing, 1) > 0 THEN 'Define at least one resource requirement' ELSE NULL END;

        -- Validate Products
        v_missing := ARRAY[]::TEXT[];
        IF NOT EXISTS (SELECT 1 FROM stage_plan_products WHERE stage_plan_id = p_plan_id) THEN
            v_missing := array_append(v_missing, 'at_least_one_product');
        END IF;
        RETURN QUERY SELECT 
            'Products'::VARCHAR,
            (array_length(v_missing, 1) IS NULL OR array_length(v_missing, 1) = 0)::BOOLEAN,
            COALESCE(v_missing, ARRAY[]::TEXT[]),
            CASE WHEN array_length(v_missing, 1) > 0 THEN 'Define at least one product/deliverable' ELSE NULL END;
    ELSE
        RAISE EXCEPTION 'Invalid plan type: %. Must be project_plan or stage_plan', p_plan_type;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_plan_completeness(UUID, VARCHAR) IS 'Validates that plan has all required sections';

-- Function: Check Plan Approval Status
-- Checks plan approval status (all required approvals received)
CREATE OR REPLACE FUNCTION check_plan_approval_status(
    p_plan_id UUID,
    p_plan_type VARCHAR
)
RETURNS TABLE (
    is_approved BOOLEAN,
    required_approvals INTEGER,
    received_approvals INTEGER,
    pending_approvals TEXT[]
) AS $$
DECLARE
    v_required INTEGER := 0;
    v_received INTEGER;
    v_pending TEXT[];
BEGIN
    -- Count required approvals (typically 3 for Project Board: Executive, Senior User, Senior Supplier)
    -- For now, count pending approvals
    SELECT 
        COUNT(*) FILTER (WHERE approval_status = 'pending')::INTEGER,
        COUNT(*) FILTER (WHERE approval_status = 'approved')::INTEGER,
        ARRAY_AGG(approver_name) FILTER (WHERE approval_status = 'pending')
    INTO v_required, v_received, v_pending
    FROM plan_approvals
    WHERE plan_type = p_plan_type
    AND plan_id = p_plan_id;

    -- If no approvals exist, assume approval is required
    IF v_required IS NULL THEN
        v_required := 0;
    END IF;
    IF v_received IS NULL THEN
        v_received := 0;
    END IF;
    IF v_pending IS NULL THEN
        v_pending := ARRAY[]::TEXT[];
    END IF;

    RETURN QUERY SELECT 
        (v_required = 0 AND v_received > 0)::BOOLEAN as is_approved,
        COALESCE(v_required + v_received, 0)::INTEGER as required_approvals,
        COALESCE(v_received, 0)::INTEGER as received_approvals,
        COALESCE(v_pending, ARRAY[]::TEXT[]) as pending_approvals;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_plan_approval_status(UUID, VARCHAR) IS 'Checks plan approval status (all required approvals received)';

-- Function: Get Project Plan by Project
-- Returns Project Plan ID for a project
CREATE OR REPLACE FUNCTION get_project_plan_by_project(p_project_id UUID)
RETURNS UUID AS $$
DECLARE
    v_plan_id UUID;
BEGIN
    SELECT id INTO v_plan_id
    FROM project_plans
    WHERE project_id = p_project_id
    AND is_deleted = FALSE
    ORDER BY created_at DESC
    LIMIT 1;

    RETURN v_plan_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_project_plan_by_project(UUID) IS 'Returns Project Plan ID for a project';

-- Function: Get Stage Plans by Project
-- Returns all Stage Plans for a project
CREATE OR REPLACE FUNCTION get_stage_plans_by_project(p_project_id UUID)
RETURNS TABLE (
    stage_plan_id UUID,
    stage_number INTEGER,
    stage_name VARCHAR,
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.id,
        sp.stage_number,
        sp.stage_name,
        sp.status
    FROM stage_plans sp
    WHERE sp.project_id = p_project_id
    AND sp.is_deleted = FALSE
    ORDER BY sp.stage_number ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_stage_plans_by_project(UUID) IS 'Returns all Stage Plans for a project';

-- Function: Calculate Plan Variance
-- Calculates variance between planned and actual (for completed stages)
CREATE OR REPLACE FUNCTION calculate_plan_variance(p_stage_plan_id UUID)
RETURNS TABLE (
    metric_name VARCHAR,
    planned_value DECIMAL,
    actual_value DECIMAL,
    variance DECIMAL,
    variance_percentage DECIMAL
) AS $$
DECLARE
    v_plan RECORD;
    v_planned_days INTEGER;
    v_actual_days INTEGER;
    v_planned_budget DECIMAL;
    v_actual_budget DECIMAL;
BEGIN
    SELECT * INTO v_plan
    FROM stage_plans
    WHERE id = p_stage_plan_id
    AND is_deleted = FALSE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Stage Plan not found: %', p_stage_plan_id;
    END IF;

    -- Only calculate if stage is completed
    IF v_plan.status != 'completed' OR v_plan.actual_start_date IS NULL OR v_plan.actual_end_date IS NULL THEN
        RETURN;
    END IF;

    -- Calculate schedule variance
    v_planned_days := COALESCE(v_plan.stage_duration_days, 0);
    IF v_plan.actual_start_date IS NOT NULL AND v_plan.actual_end_date IS NOT NULL THEN
        v_actual_days := (v_plan.actual_end_date - v_plan.actual_start_date)::INTEGER;
        
        RETURN QUERY SELECT 
            'Schedule (Days)'::VARCHAR,
            v_planned_days::DECIMAL,
            v_actual_days::DECIMAL,
            (v_actual_days - v_planned_days)::DECIMAL,
            CASE 
                WHEN v_planned_days > 0 THEN 
                    ROUND(((v_actual_days - v_planned_days)::DECIMAL / v_planned_days::DECIMAL) * 100, 2)
                ELSE 0
            END;
    END IF;

    -- Calculate budget variance (if actual cost available from work packages)
    v_planned_budget := COALESCE(v_plan.stage_budget, 0);
    -- Note: Actual budget would need to be calculated from work packages
    -- For now, return planned budget only
    RETURN QUERY SELECT 
        'Budget'::VARCHAR,
        v_planned_budget,
        v_planned_budget, -- Placeholder - actual would come from work packages
        0::DECIMAL,
        0::DECIMAL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_plan_variance(UUID) IS 'Calculates variance between planned and actual (for completed stages)';

-- ============================================================================
-- SECTION 12: TRIGGERS FOR AUTO-GENERATION
-- ============================================================================

-- Trigger: Auto-generate project plan reference on creation
CREATE OR REPLACE FUNCTION trigger_auto_generate_project_plan_reference()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate if not provided
    IF NEW.plan_reference IS NULL OR NEW.plan_reference = '' THEN
        NEW.plan_reference := generate_project_plan_reference(NEW.project_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_plans_auto_generate_reference ON project_plans;
CREATE TRIGGER trg_project_plans_auto_generate_reference
    BEFORE INSERT ON project_plans
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_generate_project_plan_reference();

-- Trigger: Auto-generate stage plan reference on creation
CREATE OR REPLACE FUNCTION trigger_auto_generate_stage_plan_reference()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate if not provided
    IF NEW.plan_reference IS NULL OR NEW.plan_reference = '' THEN
        NEW.plan_reference := generate_stage_plan_reference(NEW.project_id, NEW.stage_number);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stage_plans_auto_generate_reference ON stage_plans;
CREATE TRIGGER trg_stage_plans_auto_generate_reference
    BEFORE INSERT ON stage_plans
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_generate_stage_plan_reference();

-- Trigger: Ensure only one baseline project plan per project
CREATE OR REPLACE FUNCTION trigger_ensure_one_baseline_project_plan()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting this plan as baseline, unset others
    IF NEW.is_baseline = TRUE THEN
        UPDATE project_plans
        SET is_baseline = FALSE,
            baseline_date = NULL
        WHERE project_id = NEW.project_id
        AND id != NEW.id
        AND is_baseline = TRUE
        AND is_deleted = FALSE;
        
        -- Set baseline date
        IF NEW.baseline_date IS NULL THEN
            NEW.baseline_date := CURRENT_DATE;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_plans_one_baseline ON project_plans;
CREATE TRIGGER trg_project_plans_one_baseline
    BEFORE INSERT OR UPDATE ON project_plans
    FOR EACH ROW
    WHEN (NEW.is_baseline = TRUE)
    EXECUTE FUNCTION trigger_ensure_one_baseline_project_plan();

-- Trigger: Ensure only one baseline stage plan per stage
CREATE OR REPLACE FUNCTION trigger_ensure_one_baseline_stage_plan()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting this plan as baseline, unset others for the same stage
    IF NEW.is_baseline = TRUE THEN
        UPDATE stage_plans
        SET is_baseline = FALSE,
            baseline_date = NULL
        WHERE project_id = NEW.project_id
        AND stage_number = NEW.stage_number
        AND id != NEW.id
        AND is_baseline = TRUE
        AND is_deleted = FALSE;
        
        -- Set baseline date
        IF NEW.baseline_date IS NULL THEN
            NEW.baseline_date := CURRENT_DATE;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stage_plans_one_baseline ON stage_plans;
CREATE TRIGGER trg_stage_plans_one_baseline
    BEFORE INSERT OR UPDATE ON stage_plans
    FOR EACH ROW
    WHEN (NEW.is_baseline = TRUE)
    EXECUTE FUNCTION trigger_ensure_one_baseline_stage_plan();

-- ============================================================================
-- END OF FILE
-- ============================================================================

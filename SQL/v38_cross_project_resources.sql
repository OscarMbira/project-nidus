-- ================================================
-- File: v38_cross_project_resources.sql
-- Description: Cross-Project Resource Management module tables
-- Version: 1.0
-- Date: 2025-01-XX
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v37 must be run first (all core tables must exist)
-- - v27_resource_planning.sql must be run (resource tables must exist)
-- - projects table must exist
-- - portfolios table must exist (optional)
-- - programmes table must exist (optional)

-- Purpose:
-- Creates tables for Cross-Project Resource Management module:
-- 1. cross_project_resource_allocations - Resource allocations across multiple projects
-- 2. resource_capacity_plans - Capacity planning across projects/portfolios/programmes
-- 3. resource_conflicts - Enhanced conflict detection and resolution
-- 4. resource_forecasts - Resource demand forecasting
-- 5. cross_project_utilization - Utilization tracking across projects
-- 6. resource_skills_matching - Skills-based resource matching

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- CLEANUP: Drop existing tables if they exist (in reverse dependency order)
-- ================================================

DROP TABLE IF EXISTS resource_skills_matching CASCADE;
DROP TABLE IF EXISTS cross_project_utilization CASCADE;
DROP TABLE IF EXISTS resource_forecasts CASCADE;
DROP TABLE IF EXISTS resource_capacity_plans CASCADE;
DROP TABLE IF EXISTS cross_project_resource_allocations CASCADE;

-- Note: resource_conflicts table already exists in v27, we'll enhance it with cross-project fields if needed

-- ================================================
-- TABLE 1: cross_project_resource_allocations
-- Description: Resource allocations across multiple projects
-- Category: resource
-- ================================================

CREATE TABLE IF NOT EXISTS cross_project_resource_allocations (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Resource Reference
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    
    -- Allocation Context (can be at project, portfolio, or programme level)
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,
    programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL,
    
    -- Allocation Details
    allocation_start_date DATE NOT NULL,
    allocation_end_date DATE,
    allocation_percentage DECIMAL(5,2) NOT NULL DEFAULT 100.00, -- 0-100% of resource capacity
    allocated_hours_per_week DECIMAL(10,2), -- Hours per week if percentage-based allocation
    
    -- Allocation Type
    allocation_type VARCHAR(50) DEFAULT 'dedicated', -- 'dedicated', 'shared', 'on-demand', 'part-time'
    allocation_status VARCHAR(50) DEFAULT 'planned', -- 'planned', 'confirmed', 'active', 'completed', 'cancelled'
    
    -- Priority & Criticality
    allocation_priority VARCHAR(50), -- 'critical', 'high', 'medium', 'low'
    is_critical_resource BOOLEAN DEFAULT FALSE,
    
    -- Allocation Owner
    allocated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    allocation_notes TEXT,
    
    -- Utilization Tracking
    actual_utilization_percentage DECIMAL(5,2), -- Actual utilization vs. allocated
    utilization_tracking_enabled BOOLEAN DEFAULT TRUE,
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT cross_project_allocations_dates_check CHECK (
        allocation_end_date IS NULL OR allocation_start_date IS NULL OR 
        allocation_end_date >= allocation_start_date
    ),
    CONSTRAINT cross_project_allocations_percentage_check CHECK (
        allocation_percentage >= 0 AND allocation_percentage <= 100
    ),
    CONSTRAINT cross_project_allocations_context_check CHECK (
        project_id IS NOT NULL OR portfolio_id IS NOT NULL OR programme_id IS NOT NULL
    )
);

-- Indexes for cross_project_resource_allocations
CREATE INDEX IF NOT EXISTS idx_cross_project_allocations_resource ON cross_project_resource_allocations(resource_id);
CREATE INDEX IF NOT EXISTS idx_cross_project_allocations_project ON cross_project_resource_allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_cross_project_allocations_portfolio ON cross_project_resource_allocations(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_cross_project_allocations_programme ON cross_project_resource_allocations(programme_id);
CREATE INDEX IF NOT EXISTS idx_cross_project_allocations_status ON cross_project_resource_allocations(allocation_status);
CREATE INDEX IF NOT EXISTS idx_cross_project_allocations_dates ON cross_project_resource_allocations(allocation_start_date, allocation_end_date);
CREATE INDEX IF NOT EXISTS idx_cross_project_allocations_deleted ON cross_project_resource_allocations(is_deleted) WHERE is_deleted = false;

-- Partial unique index to prevent duplicate active allocations for same resource/project combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_cross_project_allocations_unique ON cross_project_resource_allocations(resource_id, project_id, allocation_start_date, allocation_end_date) 
WHERE is_deleted = false AND allocation_status IN ('planned', 'confirmed', 'active');

-- Trigger to update updated_at
CREATE TRIGGER update_cross_project_allocations_updated_at
    BEFORE UPDATE ON cross_project_resource_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 2: resource_capacity_plans
-- Description: Capacity planning across projects/portfolios/programmes
-- Category: resource
-- ================================================

CREATE TABLE IF NOT EXISTS resource_capacity_plans (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Resource Reference
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    
    -- Planning Context
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,
    programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL,
    plan_scope VARCHAR(50) DEFAULT 'project', -- 'project', 'portfolio', 'programme', 'enterprise'
    
    -- Planning Period
    plan_start_date DATE NOT NULL,
    plan_end_date DATE NOT NULL,
    plan_type VARCHAR(50) DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly', 'quarterly'
    
    -- Capacity Planning
    planned_capacity_hours DECIMAL(10,2), -- Total planned capacity hours
    planned_allocation_hours DECIMAL(10,2), -- Total planned allocation hours
    available_capacity_hours DECIMAL(10,2) GENERATED ALWAYS AS (
        COALESCE(planned_capacity_hours, 0) - COALESCE(planned_allocation_hours, 0)
    ) STORED,
    capacity_utilization_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN planned_capacity_hours > 0 THEN 
                (COALESCE(planned_allocation_hours, 0) / planned_capacity_hours * 100)
            ELSE 0
        END
    ) STORED,
    
    -- Plan Status
    plan_status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'approved', 'active', 'archived'
    is_over_capacity BOOLEAN GENERATED ALWAYS AS (
        COALESCE(planned_allocation_hours, 0) > COALESCE(planned_capacity_hours, 0)
    ) STORED,
    
    -- Plan Owner
    plan_owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    plan_notes TEXT,
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT resource_capacity_plans_dates_check CHECK (
        plan_end_date >= plan_start_date
    )
);

-- Indexes for resource_capacity_plans
CREATE INDEX IF NOT EXISTS idx_resource_capacity_plans_resource ON resource_capacity_plans(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_capacity_plans_portfolio ON resource_capacity_plans(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_resource_capacity_plans_programme ON resource_capacity_plans(programme_id);
CREATE INDEX IF NOT EXISTS idx_resource_capacity_plans_status ON resource_capacity_plans(plan_status);
CREATE INDEX IF NOT EXISTS idx_resource_capacity_plans_dates ON resource_capacity_plans(plan_start_date, plan_end_date);
CREATE INDEX IF NOT EXISTS idx_resource_capacity_plans_over_capacity ON resource_capacity_plans(is_over_capacity) WHERE is_over_capacity = true;
CREATE INDEX IF NOT EXISTS idx_resource_capacity_plans_deleted ON resource_capacity_plans(is_deleted) WHERE is_deleted = false;

-- Trigger to update updated_at
CREATE TRIGGER update_resource_capacity_plans_updated_at
    BEFORE UPDATE ON resource_capacity_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 3: resource_forecasts
-- Description: Resource demand forecasting
-- Category: resource
-- ================================================

CREATE TABLE IF NOT EXISTS resource_forecasts (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Forecast Context
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,
    programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL,
    forecast_scope VARCHAR(50) DEFAULT 'project', -- 'project', 'portfolio', 'programme', 'enterprise'
    
    -- Forecast Period
    forecast_start_date DATE NOT NULL,
    forecast_end_date DATE NOT NULL,
    forecast_type VARCHAR(50) DEFAULT 'monthly', -- 'weekly', 'monthly', 'quarterly', 'annually'
    
    -- Resource Type/Category Forecast (aggregate forecasting)
    resource_category VARCHAR(100), -- 'developer', 'designer', 'manager', etc.
    resource_type VARCHAR(50), -- 'human', 'equipment', 'facility'
    
    -- Demand Forecast
    forecasted_demand_count INTEGER, -- Number of resources needed
    forecasted_demand_hours DECIMAL(10,2), -- Total hours needed
    forecasted_availability_count INTEGER, -- Number of resources available
    forecasted_availability_hours DECIMAL(10,2), -- Total hours available
    demand_supply_gap_count INTEGER GENERATED ALWAYS AS (
        COALESCE(forecasted_demand_count, 0) - COALESCE(forecasted_availability_count, 0)
    ) STORED,
    demand_supply_gap_hours DECIMAL(10,2) GENERATED ALWAYS AS (
        COALESCE(forecasted_demand_hours, 0) - COALESCE(forecasted_availability_hours, 0)
    ) STORED,
    
    -- Forecast Confidence
    forecast_confidence_level VARCHAR(50), -- 'high', 'medium', 'low'
    forecast_confidence_percentage DECIMAL(5,2), -- 0-100%
    
    -- Forecast Methodology
    forecast_methodology VARCHAR(100), -- 'historical', 'trend', 'expert_judgment', 'machine_learning'
    forecast_notes TEXT,
    
    -- Forecast Owner
    forecast_owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    last_updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT resource_forecasts_dates_check CHECK (
        forecast_end_date >= forecast_start_date
    )
);

-- Indexes for resource_forecasts
CREATE INDEX IF NOT EXISTS idx_resource_forecasts_portfolio ON resource_forecasts(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_resource_forecasts_programme ON resource_forecasts(programme_id);
CREATE INDEX IF NOT EXISTS idx_resource_forecasts_category ON resource_forecasts(resource_category);
CREATE INDEX IF NOT EXISTS idx_resource_forecasts_type ON resource_forecasts(resource_type);
CREATE INDEX IF NOT EXISTS idx_resource_forecasts_dates ON resource_forecasts(forecast_start_date, forecast_end_date);
CREATE INDEX IF NOT EXISTS idx_resource_forecasts_gap ON resource_forecasts(demand_supply_gap_count) WHERE demand_supply_gap_count > 0;
CREATE INDEX IF NOT EXISTS idx_resource_forecasts_deleted ON resource_forecasts(is_deleted) WHERE is_deleted = false;

-- Trigger to update updated_at
CREATE TRIGGER update_resource_forecasts_updated_at
    BEFORE UPDATE ON resource_forecasts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 4: cross_project_utilization
-- Description: Utilization tracking across projects
-- Category: resource
-- ================================================

CREATE TABLE IF NOT EXISTS cross_project_utilization (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Resource Reference
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    
    -- Utilization Period
    utilization_period_start_date DATE NOT NULL,
    utilization_period_end_date DATE NOT NULL,
    period_type VARCHAR(50) DEFAULT 'week', -- 'day', 'week', 'month', 'quarter'
    
    -- Total Capacity
    total_capacity_hours DECIMAL(10,2) NOT NULL,
    
    -- Project Allocations (aggregated)
    total_allocated_hours DECIMAL(10,2) DEFAULT 0,
    allocated_projects_count INTEGER DEFAULT 0,
    
    -- Actual Utilization
    actual_worked_hours DECIMAL(10,2) DEFAULT 0,
    actual_utilization_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_capacity_hours > 0 THEN 
                (COALESCE(actual_worked_hours, 0) / total_capacity_hours * 100)
            ELSE 0
        END
    ) STORED,
    
    -- Allocation vs. Actual
    allocation_utilization_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_allocated_hours > 0 THEN 
                (COALESCE(actual_worked_hours, 0) / total_allocated_hours * 100)
            ELSE 0
        END
    ) STORED,
    
    -- Utilization Metrics
    billable_hours DECIMAL(10,2) DEFAULT 0,
    non_billable_hours DECIMAL(10,2) DEFAULT 0,
    idle_hours DECIMAL(10,2) GENERATED ALWAYS AS (
        COALESCE(total_capacity_hours, 0) - COALESCE(actual_worked_hours, 0)
    ) STORED,
    
    -- Utilization Status
    utilization_status VARCHAR(50), -- 'under-utilized', 'optimal', 'over-utilized', 'over-allocated'
    
    -- Calculated At
    calculated_at TIMESTAMP DEFAULT NOW(),
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT cross_project_utilization_dates_check CHECK (
        utilization_period_end_date >= utilization_period_start_date
    )
);

-- Indexes for cross_project_utilization
CREATE INDEX IF NOT EXISTS idx_cross_project_utilization_resource ON cross_project_utilization(resource_id);
CREATE INDEX IF NOT EXISTS idx_cross_project_utilization_period ON cross_project_utilization(utilization_period_start_date, utilization_period_end_date);
CREATE INDEX IF NOT EXISTS idx_cross_project_utilization_status ON cross_project_utilization(utilization_status);
CREATE INDEX IF NOT EXISTS idx_cross_project_utilization_deleted ON cross_project_utilization(is_deleted) WHERE is_deleted = false;

-- Partial unique index for resource and period
CREATE UNIQUE INDEX IF NOT EXISTS idx_cross_project_utilization_unique ON cross_project_utilization(resource_id, utilization_period_start_date, utilization_period_end_date, period_type)
WHERE is_deleted = false;

-- Trigger to update updated_at
CREATE TRIGGER update_cross_project_utilization_updated_at
    BEFORE UPDATE ON cross_project_utilization
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 5: resource_skills_matching
-- Description: Skills-based resource matching
-- Category: resource
-- ================================================

CREATE TABLE IF NOT EXISTS resource_skills_matching (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Matching Context
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,
    programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL,
    
    -- Required Skills/Competencies
    required_skills TEXT[], -- Array of required skill names
    required_competency_levels JSONB, -- JSON: {"skill_name": "level"} where level is 1-5
    minimum_match_score DECIMAL(5,2), -- Minimum matching score required (0-100)
    
    -- Matching Results (candidate resources with scores)
    matched_resources JSONB, -- Array of {resource_id, match_score, matched_skills, missing_skills}
    
    -- Matching Status
    matching_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in-progress', 'completed', 'no-match'
    best_match_resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
    best_match_score DECIMAL(5,2),
    
    -- Matching Criteria
    matching_algorithm VARCHAR(100) DEFAULT 'weighted_skills', -- 'weighted_skills', 'exact_match', 'fuzzy_match', 'ml_based'
    matching_weights JSONB, -- Weights for different factors (skills, experience, availability, etc.)
    
    -- Matching Metadata
    total_resources_evaluated INTEGER DEFAULT 0,
    matching_notes TEXT,
    
    -- Matching Request
    requested_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    requested_at TIMESTAMP DEFAULT NOW(),
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes for resource_skills_matching
CREATE INDEX IF NOT EXISTS idx_resource_skills_matching_project ON resource_skills_matching(project_id);
CREATE INDEX IF NOT EXISTS idx_resource_skills_matching_task ON resource_skills_matching(task_id);
CREATE INDEX IF NOT EXISTS idx_resource_skills_matching_portfolio ON resource_skills_matching(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_resource_skills_matching_programme ON resource_skills_matching(programme_id);
CREATE INDEX IF NOT EXISTS idx_resource_skills_matching_status ON resource_skills_matching(matching_status);
CREATE INDEX IF NOT EXISTS idx_resource_skills_matching_best_match ON resource_skills_matching(best_match_resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_skills_matching_deleted ON resource_skills_matching(is_deleted) WHERE is_deleted = false;

-- Trigger to update updated_at
CREATE TRIGGER update_resource_skills_matching_updated_at
    BEFORE UPDATE ON resource_skills_matching
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- ENHANCE EXISTING resource_conflicts TABLE
-- Note: resource_conflicts table exists in v27_resource_planning.sql
-- We'll add a comment and potentially add cross-project fields
-- ================================================

-- Add cross-project context fields to resource_conflicts if they don't exist
DO $$
BEGIN
    -- Add portfolio_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resource_conflicts' 
        AND column_name = 'portfolio_id'
    ) THEN
        ALTER TABLE resource_conflicts 
        ADD COLUMN portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_resource_conflicts_portfolio 
        ON resource_conflicts(portfolio_id) WHERE is_deleted = false;
    END IF;
    
    -- Add programme_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resource_conflicts' 
        AND column_name = 'programme_id'
    ) THEN
        ALTER TABLE resource_conflicts 
        ADD COLUMN programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_resource_conflicts_programme 
        ON resource_conflicts(programme_id) WHERE is_deleted = false;
    END IF;
    
    -- Add cross_project_conflict flag if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resource_conflicts' 
        AND column_name = 'is_cross_project_conflict'
    ) THEN
        ALTER TABLE resource_conflicts 
        ADD COLUMN is_cross_project_conflict BOOLEAN DEFAULT FALSE;
        
        CREATE INDEX IF NOT EXISTS idx_resource_conflicts_cross_project 
        ON resource_conflicts(is_cross_project_conflict) WHERE is_cross_project_conflict = true AND is_deleted = false;
    END IF;
    
    RAISE NOTICE 'Enhanced resource_conflicts table with cross-project fields';
END $$;

-- ================================================
-- REGISTER TABLES IN database_tables
-- ================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('cross_project_resource_allocations', 'Resource allocations across multiple projects, portfolios, and programmes', false, true, 'resource'),
  ('resource_capacity_plans', 'Capacity planning across projects, portfolios, and programmes', false, true, 'resource'),
  ('resource_forecasts', 'Resource demand forecasting for planning', false, true, 'resource'),
  ('cross_project_utilization', 'Resource utilization tracking across multiple projects', false, true, 'resource'),
  ('resource_skills_matching', 'Skills-based resource matching and recommendation', false, true, 'resource')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  table_category = EXCLUDED.table_category,
  updated_at = NOW();

-- Update resource_conflicts table description
UPDATE database_tables 
SET 
  table_description = 'Resource conflict detection and resolution (enhanced with cross-project support)',
  updated_at = NOW()
WHERE table_name = 'resource_conflicts';

-- ================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================

-- Enable RLS on all tables
ALTER TABLE cross_project_resource_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_capacity_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_project_utilization ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_skills_matching ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies should be created based on your organization's security requirements
-- Example policies (commented out - customize as needed):
-- CREATE POLICY "Users can view cross-project allocations for their projects"
--   ON cross_project_resource_allocations FOR SELECT
--   USING (
--     is_deleted = false AND (
--       EXISTS (SELECT 1 FROM project_members WHERE project_id = cross_project_resource_allocations.project_id AND user_id = auth.uid())
--       OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'resource_manager'))
--     )
--   );

-- ================================================
-- End of v38_cross_project_resources.sql
-- ================================================


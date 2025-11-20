-- ================================================
-- File: v39_inter_project_dependencies.sql
-- Description: Inter-Project Dependencies module tables
-- Version: 1.0
-- Date: 2025-01-XX
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v38 must be run first (all core tables must exist)
-- - projects table must exist
-- - portfolios table must exist (optional)
-- - programmes table must exist (optional)

-- Purpose:
-- Creates tables for Inter-Project Dependencies module:
-- 1. inter_project_dependencies - Dependencies between projects across portfolios/programmes
-- 2. dependency_impacts - Impact analysis for dependencies
-- 3. dependency_resolutions - Resolution tracking for dependency issues
-- 4. dependency_critical_paths - Critical path analysis across projects

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- CLEANUP: Drop existing tables if they exist (in reverse dependency order)
-- ================================================

DROP TABLE IF EXISTS dependency_critical_paths CASCADE;
DROP TABLE IF EXISTS dependency_resolutions CASCADE;
DROP TABLE IF EXISTS dependency_impacts CASCADE;
DROP TABLE IF EXISTS inter_project_dependencies CASCADE;

-- ================================================
-- TABLE 1: inter_project_dependencies
-- Description: Dependencies between projects across portfolios/programmes
-- Category: dependency
-- ================================================

CREATE TABLE IF NOT EXISTS inter_project_dependencies (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Dependency Code (unique identifier)
    dependency_code VARCHAR(100) NOT NULL,
    
    -- Dependency Information
    dependency_name VARCHAR(200) NOT NULL,
    dependency_description TEXT,
    
    -- Context (can be at project, portfolio, or programme level)
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,
    programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL,
    
    -- Source Project (the project that provides the dependency)
    source_project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Target Project (the project that depends on the source)
    target_project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Dependency Type
    dependency_type VARCHAR(50) NOT NULL DEFAULT 'finish-to-start', 
    -- 'finish-to-start' (FS), 'start-to-start' (SS), 'finish-to-finish' (FF), 
    -- 'start-to-finish' (SF), 'logical', 'resource', 'benefit', 'deliverable'
    
    -- Dependency Strength
    dependency_strength VARCHAR(50) DEFAULT 'hard', -- 'hard', 'soft', 'logical'
    
    -- Dependency Criticality
    dependency_criticality VARCHAR(50) DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
    is_critical_path BOOLEAN DEFAULT FALSE,
    
    -- Dependency Timeline
    lag_days INTEGER DEFAULT 0, -- Days between source completion/start and target start/start
    lead_days INTEGER DEFAULT 0, -- Days before source that target can start (negative lag)
    
    -- Expected Impact
    expected_impact_days INTEGER, -- Expected delay if dependency fails (days)
    impact_description TEXT, -- Description of impact if dependency fails
    
    -- Dependency Status
    dependency_status VARCHAR(50) DEFAULT 'identified', 
    -- 'identified', 'confirmed', 'active', 'at_risk', 'blocked', 'resolved', 'cancelled'
    
    -- Resolution Status
    resolution_status VARCHAR(50), -- 'none', 'mitigated', 'resolved', 'accepted', 'escalated'
    
    -- Dependency Dates
    dependency_identified_date DATE,
    dependency_confirmed_date DATE,
    dependency_active_date DATE,
    dependency_resolved_date DATE,
    
    -- Dependency Owner
    dependency_owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Risk Assessment
    risk_level VARCHAR(50), -- 'low', 'medium', 'high', 'critical'
    risk_description TEXT,
    probability_of_failure DECIMAL(5,2), -- 0-100%
    mitigation_plan TEXT,
    
    -- Deliverable/Resource Link (optional)
    required_deliverable_id UUID, -- Link to specific deliverable if applicable
    required_resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
    
    -- Notes
    notes TEXT,
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT inter_project_dependencies_source_target_check CHECK (source_project_id != target_project_id),
    CONSTRAINT inter_project_dependencies_type_check CHECK (
        dependency_type IN ('finish-to-start', 'start-to-start', 'finish-to-finish', 
                           'start-to-finish', 'logical', 'resource', 'benefit', 'deliverable')
    ),
    CONSTRAINT inter_project_dependencies_strength_check CHECK (
        dependency_strength IN ('hard', 'soft', 'logical')
    ),
    CONSTRAINT inter_project_dependencies_criticality_check CHECK (
        dependency_criticality IN ('critical', 'high', 'medium', 'low')
    ),
    CONSTRAINT inter_project_dependencies_status_check CHECK (
        dependency_status IN ('identified', 'confirmed', 'active', 'at_risk', 'blocked', 'resolved', 'cancelled')
    ),
    CONSTRAINT inter_project_dependencies_probability_check CHECK (
        probability_of_failure IS NULL OR (probability_of_failure >= 0 AND probability_of_failure <= 100)
    )
);

-- Indexes for inter_project_dependencies
CREATE INDEX IF NOT EXISTS idx_inter_project_dependencies_code ON inter_project_dependencies(dependency_code) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_inter_project_dependencies_source ON inter_project_dependencies(source_project_id);
CREATE INDEX IF NOT EXISTS idx_inter_project_dependencies_target ON inter_project_dependencies(target_project_id);
CREATE INDEX IF NOT EXISTS idx_inter_project_dependencies_portfolio ON inter_project_dependencies(portfolio_id) WHERE portfolio_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inter_project_dependencies_programme ON inter_project_dependencies(programme_id) WHERE programme_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inter_project_dependencies_type ON inter_project_dependencies(dependency_type);
CREATE INDEX IF NOT EXISTS idx_inter_project_dependencies_status ON inter_project_dependencies(dependency_status);
CREATE INDEX IF NOT EXISTS idx_inter_project_dependencies_criticality ON inter_project_dependencies(dependency_criticality);
CREATE INDEX IF NOT EXISTS idx_inter_project_dependencies_critical_path ON inter_project_dependencies(is_critical_path) WHERE is_critical_path = true;
CREATE INDEX IF NOT EXISTS idx_inter_project_dependencies_deleted ON inter_project_dependencies(is_deleted) WHERE is_deleted = false;

-- Partial unique index for dependency code (unique within context)
CREATE UNIQUE INDEX IF NOT EXISTS idx_inter_project_dependencies_code_unique ON inter_project_dependencies(COALESCE(portfolio_id, '00000000-0000-0000-0000-000000000000'::UUID), COALESCE(programme_id, '00000000-0000-0000-0000-000000000000'::UUID), dependency_code)
WHERE is_deleted = false;

-- Trigger to update updated_at
CREATE TRIGGER update_inter_project_dependencies_updated_at
    BEFORE UPDATE ON inter_project_dependencies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 2: dependency_impacts
-- Description: Impact analysis for dependencies
-- Category: dependency
-- ================================================

CREATE TABLE IF NOT EXISTS dependency_impacts (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Dependency Reference
    dependency_id UUID NOT NULL REFERENCES inter_project_dependencies(id) ON DELETE CASCADE,
    
    -- Impact Type
    impact_type VARCHAR(50) NOT NULL, -- 'schedule', 'cost', 'resource', 'quality', 'scope', 'risk'
    
    -- Impact Details
    impact_severity VARCHAR(50) DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
    impact_description TEXT NOT NULL,
    
    -- Quantitative Impact
    schedule_impact_days INTEGER, -- Days of delay
    cost_impact_amount DECIMAL(15,2), -- Cost impact
    cost_impact_currency VARCHAR(3) DEFAULT 'USD',
    resource_impact_hours DECIMAL(10,2), -- Resource hours impacted
    
    -- Impacted Projects/Entities
    impacted_project_ids UUID[], -- Array of project IDs that would be affected
    impacted_task_ids UUID[], -- Array of task IDs that would be affected
    
    -- Impact Status
    impact_status VARCHAR(50) DEFAULT 'potential', -- 'potential', 'realized', 'mitigated', 'avoided'
    
    -- Impact Dates
    impact_assessed_date DATE DEFAULT CURRENT_DATE,
    impact_realized_date DATE,
    
    -- Impact Owner
    impact_assessor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Notes
    notes TEXT,
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT dependency_impacts_type_check CHECK (
        impact_type IN ('schedule', 'cost', 'resource', 'quality', 'scope', 'risk')
    ),
    CONSTRAINT dependency_impacts_severity_check CHECK (
        impact_severity IN ('critical', 'high', 'medium', 'low')
    ),
    CONSTRAINT dependency_impacts_status_check CHECK (
        impact_status IN ('potential', 'realized', 'mitigated', 'avoided')
    )
);

-- Indexes for dependency_impacts
CREATE INDEX IF NOT EXISTS idx_dependency_impacts_dependency ON dependency_impacts(dependency_id);
CREATE INDEX IF NOT EXISTS idx_dependency_impacts_type ON dependency_impacts(impact_type);
CREATE INDEX IF NOT EXISTS idx_dependency_impacts_severity ON dependency_impacts(impact_severity);
CREATE INDEX IF NOT EXISTS idx_dependency_impacts_status ON dependency_impacts(impact_status);
CREATE INDEX IF NOT EXISTS idx_dependency_impacts_deleted ON dependency_impacts(is_deleted) WHERE is_deleted = false;

-- Trigger to update updated_at
CREATE TRIGGER update_dependency_impacts_updated_at
    BEFORE UPDATE ON dependency_impacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 3: dependency_resolutions
-- Description: Resolution tracking for dependency issues
-- Category: dependency
-- ================================================

CREATE TABLE IF NOT EXISTS dependency_resolutions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Dependency Reference
    dependency_id UUID NOT NULL REFERENCES inter_project_dependencies(id) ON DELETE CASCADE,
    
    -- Resolution Information
    resolution_type VARCHAR(50) NOT NULL, -- 'mitigation', 'acceptance', 'escalation', 'workaround', 'elimination'
    resolution_description TEXT NOT NULL,
    
    -- Resolution Details
    resolution_status VARCHAR(50) DEFAULT 'planned', -- 'planned', 'in_progress', 'completed', 'failed', 'cancelled'
    resolution_priority VARCHAR(50) DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
    
    -- Resolution Timeline
    resolution_start_date DATE,
    resolution_due_date DATE,
    resolution_completed_date DATE,
    
    -- Resolution Owner
    resolution_owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_assignee_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Resolution Actions
    actions_taken TEXT[], -- Array of actions taken
    action_items TEXT[], -- Array of action items
    
    -- Resolution Effectiveness
    resolution_effectiveness VARCHAR(50), -- 'highly_effective', 'effective', 'partial', 'ineffective'
    resolution_notes TEXT,
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT dependency_resolutions_type_check CHECK (
        resolution_type IN ('mitigation', 'acceptance', 'escalation', 'workaround', 'elimination')
    ),
    CONSTRAINT dependency_resolutions_status_check CHECK (
        resolution_status IN ('planned', 'in_progress', 'completed', 'failed', 'cancelled')
    ),
    CONSTRAINT dependency_resolutions_priority_check CHECK (
        resolution_priority IN ('critical', 'high', 'medium', 'low')
    )
);

-- Indexes for dependency_resolutions
CREATE INDEX IF NOT EXISTS idx_dependency_resolutions_dependency ON dependency_resolutions(dependency_id);
CREATE INDEX IF NOT EXISTS idx_dependency_resolutions_type ON dependency_resolutions(resolution_type);
CREATE INDEX IF NOT EXISTS idx_dependency_resolutions_status ON dependency_resolutions(resolution_status);
CREATE INDEX IF NOT EXISTS idx_dependency_resolutions_owner ON dependency_resolutions(resolution_owner_user_id);
CREATE INDEX IF NOT EXISTS idx_dependency_resolutions_assignee ON dependency_resolutions(resolution_assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_dependency_resolutions_deleted ON dependency_resolutions(is_deleted) WHERE is_deleted = false;

-- Trigger to update updated_at
CREATE TRIGGER update_dependency_resolutions_updated_at
    BEFORE UPDATE ON dependency_resolutions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 4: dependency_critical_paths
-- Description: Critical path analysis across projects
-- Category: dependency
-- ================================================

CREATE TABLE IF NOT EXISTS dependency_critical_paths (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Context
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,
    programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL,
    
    -- Critical Path Analysis
    critical_path_name VARCHAR(200) NOT NULL,
    critical_path_description TEXT,
    
    -- Path Details
    path_project_ids UUID[] NOT NULL, -- Ordered array of project IDs in the critical path
    path_dependency_ids UUID[] NOT NULL, -- Ordered array of dependency IDs in the critical path
    
    -- Path Metrics
    total_path_duration_days INTEGER, -- Total duration of critical path in days
    total_path_slack_days INTEGER DEFAULT 0, -- Total slack/float in the path
    is_active BOOLEAN DEFAULT TRUE, -- Whether this is the current active critical path
    
    -- Path Analysis
    analysis_date DATE DEFAULT CURRENT_DATE,
    analyzed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Path Status
    path_status VARCHAR(50) DEFAULT 'current', -- 'current', 'historical', 'projected'
    
    -- Notes
    notes TEXT,
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT dependency_critical_paths_status_check CHECK (
        path_status IN ('current', 'historical', 'projected')
    )
);

-- Indexes for dependency_critical_paths
CREATE INDEX IF NOT EXISTS idx_dependency_critical_paths_portfolio ON dependency_critical_paths(portfolio_id) WHERE portfolio_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dependency_critical_paths_programme ON dependency_critical_paths(programme_id) WHERE programme_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dependency_critical_paths_active ON dependency_critical_paths(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_dependency_critical_paths_status ON dependency_critical_paths(path_status);
CREATE INDEX IF NOT EXISTS idx_dependency_critical_paths_deleted ON dependency_critical_paths(is_deleted) WHERE is_deleted = false;

-- Trigger to update updated_at
CREATE TRIGGER update_dependency_critical_paths_updated_at
    BEFORE UPDATE ON dependency_critical_paths
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- REGISTER TABLES IN database_tables
-- ================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('inter_project_dependencies', 'Dependencies between projects across portfolios and programmes', false, true, 'dependency'),
  ('dependency_impacts', 'Impact analysis for inter-project dependencies', false, true, 'dependency'),
  ('dependency_resolutions', 'Resolution tracking for dependency issues', false, true, 'dependency'),
  ('dependency_critical_paths', 'Critical path analysis across projects', false, true, 'dependency')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  table_category = EXCLUDED.table_category,
  updated_at = NOW();

-- ================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================

-- Enable RLS on all tables
ALTER TABLE inter_project_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependency_impacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependency_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependency_critical_paths ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies should be created based on your organization's security requirements
-- Example policies (commented out - customize as needed):
-- CREATE POLICY "Users can view dependencies for their projects"
--   ON inter_project_dependencies FOR SELECT
--   USING (
--     is_deleted = false AND (
--       EXISTS (SELECT 1 FROM project_members WHERE project_id = inter_project_dependencies.source_project_id AND user_id = auth.uid())
--       OR EXISTS (SELECT 1 FROM project_members WHERE project_id = inter_project_dependencies.target_project_id AND user_id = auth.uid())
--       OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'portfolio_manager', 'programme_manager'))
--     )
--   );

-- ================================================
-- HELPER FUNCTIONS
-- ================================================

-- Function to detect circular dependencies
CREATE OR REPLACE FUNCTION detect_circular_dependency(
    p_source_project_id UUID,
    p_target_project_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_found BOOLEAN := FALSE;
    v_current_project_id UUID;
    v_visited_projects UUID[] := ARRAY[p_source_project_id];
    v_next_projects UUID[] := ARRAY[p_target_project_id];
BEGIN
    -- Check if target depends on source (directly)
    IF EXISTS (
        SELECT 1 FROM inter_project_dependencies
        WHERE source_project_id = p_target_project_id
        AND target_project_id = p_source_project_id
        AND is_deleted = false
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Check if adding this dependency would create a cycle
    -- Traverse from target to see if we reach source
    WHILE array_length(v_next_projects, 1) > 0 AND NOT v_found LOOP
        v_current_project_id := v_next_projects[1];
        v_next_projects := v_next_projects[2:];
        
        -- If we've already visited this project, skip
        IF v_current_project_id = ANY(v_visited_projects) THEN
            CONTINUE;
        END IF;
        
        v_visited_projects := array_append(v_visited_projects, v_current_project_id);
        
        -- If current project is the source, we have a cycle
        IF v_current_project_id = p_source_project_id THEN
            v_found := TRUE;
        ELSE
            -- Add all projects that current project depends on
            SELECT array_agg(target_project_id)
            INTO v_next_projects
            FROM inter_project_dependencies
            WHERE source_project_id = v_current_project_id
            AND is_deleted = false
            AND target_project_id NOT IN (SELECT unnest(v_visited_projects));
            
            IF v_next_projects IS NULL THEN
                v_next_projects := ARRAY[]::UUID[];
            END IF;
        END IF;
    END LOOP;
    
    RETURN v_found;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION detect_circular_dependency IS 'Detects if adding a dependency from source to target would create a circular dependency';

-- ================================================
-- End of v39_inter_project_dependencies.sql
-- ================================================


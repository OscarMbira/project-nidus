-- ================================================
-- File: v41_strategic_alignment.sql
-- Description: Strategic Alignment Tools module tables
-- Version: 1.0
-- Date: 2025-01-XX
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v40 must be run first (all core tables must exist)
-- - projects table must exist
-- - portfolios table must exist (optional)

-- Purpose:
-- Creates tables for Strategic Alignment Tools module:
-- 1. strategic_objectives - Strategic objectives at organizational/portfolio level
-- 2. objective_hierarchies - Hierarchy relationships between objectives
-- 3. project_objective_mappings - Map projects to strategic objectives
-- 4. strategic_contributions - Track strategic contributions from projects
-- 5. alignment_scores - Alignment scoring and tracking
-- 6. strategic_reports - Strategic alignment reports

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- CLEANUP: Drop existing tables if they exist (in reverse dependency order)
-- ================================================

DROP TABLE IF EXISTS strategic_reports CASCADE;
DROP TABLE IF EXISTS alignment_scores CASCADE;
DROP TABLE IF EXISTS strategic_contributions CASCADE;
DROP TABLE IF EXISTS project_objective_mappings CASCADE;
DROP TABLE IF EXISTS objective_hierarchies CASCADE;
DROP TABLE IF EXISTS strategic_objectives CASCADE;

-- ================================================
-- TABLE 1: strategic_objectives
-- Description: Strategic objectives at organizational/portfolio level
-- Category: strategy
-- ================================================

CREATE TABLE IF NOT EXISTS strategic_objectives (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Objective Code (unique identifier)
    objective_code VARCHAR(100) NOT NULL,
    
    -- Objective Information
    objective_name VARCHAR(200) NOT NULL,
    objective_description TEXT,
    
    -- Context (can be at portfolio or organizational level)
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,
    
    -- Objective Category & Type
    objective_category VARCHAR(50) NOT NULL DEFAULT 'strategic',
    -- 'strategic', 'financial', 'operational', 'customer', 'employee', 'innovation', 'compliance', 'sustainability'
    
    objective_type VARCHAR(50) NOT NULL DEFAULT 'outcome',
    -- 'outcome', 'output', 'activity', 'capability', 'initiative'
    
    objective_level VARCHAR(50) NOT NULL DEFAULT 'strategic',
    -- 'strategic', 'tactical', 'operational'
    
    -- Objective Hierarchy
    parent_objective_id UUID REFERENCES strategic_objectives(id) ON DELETE SET NULL,
    
    -- Objective Owner
    objective_owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Objective Metrics
    success_criteria TEXT, -- How success will be measured
    measurement_unit VARCHAR(50), -- Unit for measurement
    target_value DECIMAL(15,2), -- Target value for the objective
    current_value DECIMAL(15,2), -- Current value
    baseline_value DECIMAL(15,2), -- Baseline value
    
    -- Objective Timeline
    objective_start_date DATE,
    objective_target_date DATE NOT NULL,
    objective_completion_date DATE,
    
    -- Objective Status
    objective_status VARCHAR(50) DEFAULT 'active',
    -- 'active', 'on_hold', 'completed', 'cancelled', 'achieved', 'missed'
    
    -- Objective Priority
    priority VARCHAR(50) DEFAULT 'medium',
    -- 'critical', 'high', 'medium', 'low'
    
    -- Strategic Alignment
    strategic_importance DECIMAL(5,2) DEFAULT 50.00, -- 0-100% importance to strategy
    strategic_impact VARCHAR(50) DEFAULT 'medium',
    -- 'critical', 'high', 'medium', 'low'
    
    -- Objectives Relationship (OKR-style)
    objective_weight DECIMAL(5,2) DEFAULT 100.00, -- Weight in portfolio (0-100%)
    
    -- Notes and Links
    notes TEXT,
    related_objectives UUID[], -- Array of related objective IDs
    strategic_links TEXT[], -- Links to strategic documents/initiatives
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT strategic_objectives_category_check CHECK (
        objective_category IN ('strategic', 'financial', 'operational', 'customer', 'employee', 'innovation', 'compliance', 'sustainability')
    ),
    CONSTRAINT strategic_objectives_type_check CHECK (
        objective_type IN ('outcome', 'output', 'activity', 'capability', 'initiative')
    ),
    CONSTRAINT strategic_objectives_level_check CHECK (
        objective_level IN ('strategic', 'tactical', 'operational')
    ),
    CONSTRAINT strategic_objectives_status_check CHECK (
        objective_status IN ('active', 'on_hold', 'completed', 'cancelled', 'achieved', 'missed')
    ),
    CONSTRAINT strategic_objectives_priority_check CHECK (
        priority IN ('critical', 'high', 'medium', 'low')
    ),
    CONSTRAINT strategic_objectives_importance_check CHECK (
        strategic_importance >= 0 AND strategic_importance <= 100
    ),
    CONSTRAINT strategic_objectives_weight_check CHECK (
        objective_weight >= 0 AND objective_weight <= 100
    )
);

-- Indexes for strategic_objectives
CREATE INDEX IF NOT EXISTS idx_strategic_objectives_code ON strategic_objectives(objective_code) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_strategic_objectives_portfolio ON strategic_objectives(portfolio_id) WHERE portfolio_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_strategic_objectives_parent ON strategic_objectives(parent_objective_id) WHERE parent_objective_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_strategic_objectives_category ON strategic_objectives(objective_category);
CREATE INDEX IF NOT EXISTS idx_strategic_objectives_type ON strategic_objectives(objective_type);
CREATE INDEX IF NOT EXISTS idx_strategic_objectives_level ON strategic_objectives(objective_level);
CREATE INDEX IF NOT EXISTS idx_strategic_objectives_status ON strategic_objectives(objective_status);
CREATE INDEX IF NOT EXISTS idx_strategic_objectives_priority ON strategic_objectives(priority);
CREATE INDEX IF NOT EXISTS idx_strategic_objectives_deleted ON strategic_objectives(is_deleted) WHERE is_deleted = false;

-- Partial unique index for objective code (unique within context)
CREATE UNIQUE INDEX IF NOT EXISTS idx_strategic_objectives_code_unique ON strategic_objectives(
    COALESCE(portfolio_id, '00000000-0000-0000-0000-000000000000'::UUID),
    objective_code
) WHERE is_deleted = false;

-- Trigger to update updated_at
CREATE TRIGGER update_strategic_objectives_updated_at
    BEFORE UPDATE ON strategic_objectives
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 2: objective_hierarchies
-- Description: Hierarchy relationships between objectives
-- Category: strategy
-- ================================================

CREATE TABLE IF NOT EXISTS objective_hierarchies (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Objective References
    parent_objective_id UUID NOT NULL REFERENCES strategic_objectives(id) ON DELETE CASCADE,
    child_objective_id UUID NOT NULL REFERENCES strategic_objectives(id) ON DELETE CASCADE,
    
    -- Hierarchy Details
    hierarchy_type VARCHAR(50) DEFAULT 'parent_child',
    -- 'parent_child', 'related', 'dependency', 'contributes_to', 'supports'
    
    hierarchy_level INTEGER DEFAULT 1, -- Depth in hierarchy (1 = direct child)
    contribution_percentage DECIMAL(5,2) DEFAULT 100.00, -- How much child contributes to parent (0-100%)
    
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
    CONSTRAINT objective_hierarchies_parent_child_check CHECK (parent_objective_id != child_objective_id),
    CONSTRAINT objective_hierarchies_type_check CHECK (
        hierarchy_type IN ('parent_child', 'related', 'dependency', 'contributes_to', 'supports')
    ),
    CONSTRAINT objective_hierarchies_contribution_check CHECK (
        contribution_percentage >= 0 AND contribution_percentage <= 100
    )
);

-- Indexes for objective_hierarchies
CREATE INDEX IF NOT EXISTS idx_objective_hierarchies_parent ON objective_hierarchies(parent_objective_id);
CREATE INDEX IF NOT EXISTS idx_objective_hierarchies_child ON objective_hierarchies(child_objective_id);
CREATE INDEX IF NOT EXISTS idx_objective_hierarchies_type ON objective_hierarchies(hierarchy_type);
CREATE INDEX IF NOT EXISTS idx_objective_hierarchies_deleted ON objective_hierarchies(is_deleted) WHERE is_deleted = false;

-- Partial unique index to prevent duplicate hierarchies
CREATE UNIQUE INDEX IF NOT EXISTS idx_objective_hierarchies_unique ON objective_hierarchies(parent_objective_id, child_objective_id, hierarchy_type)
WHERE is_deleted = false;

-- Trigger to update updated_at
CREATE TRIGGER update_objective_hierarchies_updated_at
    BEFORE UPDATE ON objective_hierarchies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 3: project_objective_mappings
-- Description: Map projects to strategic objectives
-- Category: strategy
-- ================================================

CREATE TABLE IF NOT EXISTS project_objective_mappings (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Project Reference
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Objective Reference
    objective_id UUID NOT NULL REFERENCES strategic_objectives(id) ON DELETE CASCADE,
    
    -- Mapping Details
    mapping_type VARCHAR(50) DEFAULT 'contributes_to',
    -- 'contributes_to', 'directly_achieves', 'supports', 'enables', 'depends_on'
    
    contribution_percentage DECIMAL(5,2) DEFAULT 100.00, -- How much project contributes to objective (0-100%)
    contribution_description TEXT, -- How the project contributes
    
    -- Contribution Timeline
    contribution_start_date DATE,
    contribution_end_date DATE,
    
    -- Contribution Status
    contribution_status VARCHAR(50) DEFAULT 'active',
    -- 'active', 'completed', 'on_hold', 'cancelled'
    
    -- Strategic Alignment Score
    alignment_score DECIMAL(5,2), -- 0-100 alignment score
    alignment_confidence VARCHAR(50) DEFAULT 'medium',
    -- 'high', 'medium', 'low'
    
    -- Mapping Owner
    mapped_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    mapped_date DATE DEFAULT CURRENT_DATE,
    
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
    CONSTRAINT project_objective_mappings_type_check CHECK (
        mapping_type IN ('contributes_to', 'directly_achieves', 'supports', 'enables', 'depends_on')
    ),
    CONSTRAINT project_objective_mappings_contribution_check CHECK (
        contribution_percentage >= 0 AND contribution_percentage <= 100
    ),
    CONSTRAINT project_objective_mappings_status_check CHECK (
        contribution_status IN ('active', 'completed', 'on_hold', 'cancelled')
    ),
    CONSTRAINT project_objective_mappings_score_check CHECK (
        alignment_score IS NULL OR (alignment_score >= 0 AND alignment_score <= 100)
    ),
    CONSTRAINT project_objective_mappings_confidence_check CHECK (
        alignment_confidence IN ('high', 'medium', 'low')
    )
);

-- Indexes for project_objective_mappings
CREATE INDEX IF NOT EXISTS idx_project_objective_mappings_project ON project_objective_mappings(project_id);
CREATE INDEX IF NOT EXISTS idx_project_objective_mappings_objective ON project_objective_mappings(objective_id);
CREATE INDEX IF NOT EXISTS idx_project_objective_mappings_type ON project_objective_mappings(mapping_type);
CREATE INDEX IF NOT EXISTS idx_project_objective_mappings_status ON project_objective_mappings(contribution_status);
CREATE INDEX IF NOT EXISTS idx_project_objective_mappings_score ON project_objective_mappings(alignment_score);
CREATE INDEX IF NOT EXISTS idx_project_objective_mappings_deleted ON project_objective_mappings(is_deleted) WHERE is_deleted = false;

-- Partial unique index to prevent duplicate mappings
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_objective_mappings_unique ON project_objective_mappings(project_id, objective_id, mapping_type)
WHERE is_deleted = false;

-- Trigger to update updated_at
CREATE TRIGGER update_project_objective_mappings_updated_at
    BEFORE UPDATE ON project_objective_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 4: strategic_contributions
-- Description: Track strategic contributions from projects
-- Category: strategy
-- ================================================

CREATE TABLE IF NOT EXISTS strategic_contributions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Project Reference
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Objective Reference
    objective_id UUID NOT NULL REFERENCES strategic_objectives(id) ON DELETE CASCADE,
    
    -- Contribution Details
    contribution_type VARCHAR(50) DEFAULT 'direct',
    -- 'direct', 'indirect', 'enabling', 'supporting'
    
    contribution_value DECIMAL(15,2), -- Quantitative contribution value
    contribution_unit VARCHAR(50), -- Unit of contribution
    
    contribution_description TEXT NOT NULL, -- Description of contribution
    contribution_evidence TEXT[], -- Array of evidence/document references
    
    -- Contribution Period
    contribution_period_start DATE,
    contribution_period_end DATE,
    contribution_date DATE DEFAULT CURRENT_DATE, -- When contribution was recorded
    
    -- Contribution Status
    contribution_status VARCHAR(50) DEFAULT 'planned',
    -- 'planned', 'in_progress', 'realized', 'partially_realized', 'not_realized'
    
    -- Contribution Assessment
    contribution_confidence VARCHAR(50) DEFAULT 'medium',
    -- 'high', 'medium', 'low'
    
    contribution_assessed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    contribution_assessed_date DATE,
    
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
    CONSTRAINT strategic_contributions_type_check CHECK (
        contribution_type IN ('direct', 'indirect', 'enabling', 'supporting')
    ),
    CONSTRAINT strategic_contributions_status_check CHECK (
        contribution_status IN ('planned', 'in_progress', 'realized', 'partially_realized', 'not_realized')
    ),
    CONSTRAINT strategic_contributions_confidence_check CHECK (
        contribution_confidence IN ('high', 'medium', 'low')
    )
);

-- Indexes for strategic_contributions
CREATE INDEX IF NOT EXISTS idx_strategic_contributions_project ON strategic_contributions(project_id);
CREATE INDEX IF NOT EXISTS idx_strategic_contributions_objective ON strategic_contributions(objective_id);
CREATE INDEX IF NOT EXISTS idx_strategic_contributions_type ON strategic_contributions(contribution_type);
CREATE INDEX IF NOT EXISTS idx_strategic_contributions_status ON strategic_contributions(contribution_status);
CREATE INDEX IF NOT EXISTS idx_strategic_contributions_date ON strategic_contributions(contribution_date);
CREATE INDEX IF NOT EXISTS idx_strategic_contributions_deleted ON strategic_contributions(is_deleted) WHERE is_deleted = false;

-- Trigger to update updated_at
CREATE TRIGGER update_strategic_contributions_updated_at
    BEFORE UPDATE ON strategic_contributions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 5: alignment_scores
-- Description: Alignment scoring and tracking
-- Category: strategy
-- ================================================

CREATE TABLE IF NOT EXISTS alignment_scores (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Context
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    
    -- Score Calculation
    score_date DATE DEFAULT CURRENT_DATE NOT NULL,
    overall_alignment_score DECIMAL(5,2) NOT NULL, -- 0-100 overall alignment score
    
    -- Score Breakdown (0-100 each)
    strategic_alignment_score DECIMAL(5,2), -- Alignment to strategic objectives
    financial_alignment_score DECIMAL(5,2), -- Alignment to financial objectives
    operational_alignment_score DECIMAL(5,2), -- Alignment to operational objectives
    
    -- Score Components
    objectives_mapped_count INTEGER DEFAULT 0, -- Number of objectives mapped to
    objectives_active_count INTEGER DEFAULT 0, -- Number of active objective mappings
    contribution_total_percentage DECIMAL(5,2) DEFAULT 0.00, -- Total contribution percentage across all objectives
    
    -- Score Assessment
    score_confidence VARCHAR(50) DEFAULT 'medium',
    -- 'high', 'medium', 'low'
    
    score_calculation_method VARCHAR(100), -- Method used to calculate score
    score_calculation_details JSONB, -- Detailed calculation breakdown
    
    -- Score Owner
    calculated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
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
    CONSTRAINT alignment_scores_context_check CHECK (
        portfolio_id IS NOT NULL OR project_id IS NOT NULL
    ),
    CONSTRAINT alignment_scores_overall_check CHECK (
        overall_alignment_score >= 0 AND overall_alignment_score <= 100
    ),
    CONSTRAINT alignment_scores_breakdown_check CHECK (
        (strategic_alignment_score IS NULL OR (strategic_alignment_score >= 0 AND strategic_alignment_score <= 100)) AND
        (financial_alignment_score IS NULL OR (financial_alignment_score >= 0 AND financial_alignment_score <= 100)) AND
        (operational_alignment_score IS NULL OR (operational_alignment_score >= 0 AND operational_alignment_score <= 100))
    ),
    CONSTRAINT alignment_scores_confidence_check CHECK (
        score_confidence IN ('high', 'medium', 'low')
    )
);

-- Indexes for alignment_scores
CREATE INDEX IF NOT EXISTS idx_alignment_scores_portfolio ON alignment_scores(portfolio_id) WHERE portfolio_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alignment_scores_project ON alignment_scores(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alignment_scores_date ON alignment_scores(score_date);
CREATE INDEX IF NOT EXISTS idx_alignment_scores_overall ON alignment_scores(overall_alignment_score);
CREATE INDEX IF NOT EXISTS idx_alignment_scores_deleted ON alignment_scores(is_deleted) WHERE is_deleted = false;

-- Trigger to update updated_at
CREATE TRIGGER update_alignment_scores_updated_at
    BEFORE UPDATE ON alignment_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 6: strategic_reports
-- Description: Strategic alignment reports
-- Category: strategy
-- ================================================

CREATE TABLE IF NOT EXISTS strategic_reports (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Report Context
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    
    -- Report Information
    report_name VARCHAR(200) NOT NULL,
    report_description TEXT,
    report_type VARCHAR(50) DEFAULT 'alignment',
    -- 'alignment', 'contribution', 'objective_status', 'portfolio_optimization', 'comprehensive'
    
    -- Report Period
    report_start_date DATE,
    report_end_date DATE,
    report_date DATE DEFAULT CURRENT_DATE,
    
    -- Report Content (JSON)
    report_data JSONB, -- Structured report data
    
    -- Report Status
    report_status VARCHAR(50) DEFAULT 'draft',
    -- 'draft', 'final', 'archived'
    
    -- Report Owner
    report_owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    generated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Report Files
    report_file_url TEXT, -- URL to generated report file (PDF, Excel, etc.)
    
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
    CONSTRAINT strategic_reports_type_check CHECK (
        report_type IN ('alignment', 'contribution', 'objective_status', 'portfolio_optimization', 'comprehensive')
    ),
    CONSTRAINT strategic_reports_status_check CHECK (
        report_status IN ('draft', 'final', 'archived')
    ),
    CONSTRAINT strategic_reports_context_check CHECK (
        portfolio_id IS NOT NULL OR project_id IS NOT NULL
    )
);

-- Indexes for strategic_reports
CREATE INDEX IF NOT EXISTS idx_strategic_reports_portfolio ON strategic_reports(portfolio_id) WHERE portfolio_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_strategic_reports_project ON strategic_reports(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_strategic_reports_type ON strategic_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_strategic_reports_status ON strategic_reports(report_status);
CREATE INDEX IF NOT EXISTS idx_strategic_reports_date ON strategic_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_strategic_reports_deleted ON strategic_reports(is_deleted) WHERE is_deleted = false;

-- Trigger to update updated_at
CREATE TRIGGER update_strategic_reports_updated_at
    BEFORE UPDATE ON strategic_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- REGISTER TABLES IN database_tables
-- ================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('strategic_objectives', 'Strategic objectives at organizational/portfolio level', false, true, 'strategy'),
  ('objective_hierarchies', 'Hierarchy relationships between objectives', false, true, 'strategy'),
  ('project_objective_mappings', 'Map projects to strategic objectives', false, true, 'strategy'),
  ('strategic_contributions', 'Track strategic contributions from projects', false, true, 'strategy'),
  ('alignment_scores', 'Alignment scoring and tracking', false, true, 'strategy'),
  ('strategic_reports', 'Strategic alignment reports', false, true, 'strategy')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  table_category = EXCLUDED.table_category,
  updated_at = NOW();

-- ================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================

-- Enable RLS on all tables
ALTER TABLE strategic_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE objective_hierarchies ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_objective_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alignment_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_reports ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies should be created based on your organization's security requirements

-- ================================================
-- HELPER FUNCTIONS
-- ================================================

-- Function to calculate alignment score for a project
CREATE OR REPLACE FUNCTION calculate_project_alignment_score(
    p_project_id UUID
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    v_total_score DECIMAL(10,2) := 0;
    v_total_weight DECIMAL(10,2) := 0;
    v_objective RECORD;
    v_alignment_score DECIMAL(5,2);
BEGIN
    -- Calculate alignment score based on project-objective mappings
    FOR v_objective IN
        SELECT 
            pom.objective_id,
            pom.contribution_percentage,
            pom.alignment_score,
            so.strategic_importance,
            so.objective_weight
        FROM project_objective_mappings pom
        JOIN strategic_objectives so ON so.id = pom.objective_id
        WHERE pom.project_id = p_project_id
        AND pom.is_deleted = false
        AND so.is_deleted = false
        AND pom.contribution_status = 'active'
    LOOP
        -- Use alignment_score if available, otherwise calculate from contribution and importance
        v_alignment_score := COALESCE(
            v_objective.alignment_score,
            (v_objective.contribution_percentage / 100.0) * (v_objective.strategic_importance / 100.0) * 100
        );
        
        -- Weight by objective weight
        v_total_score := v_total_score + (v_alignment_score * COALESCE(v_objective.objective_weight, 100) / 100.0);
        v_total_weight := v_total_weight + COALESCE(v_objective.objective_weight, 100);
    END LOOP;
    
    IF v_total_weight = 0 THEN
        RETURN NULL;
    END IF;
    
    -- Calculate weighted average
    v_alignment_score := (v_total_score / v_total_weight) * 100;
    
    -- Cap at 100
    IF v_alignment_score > 100 THEN
        v_alignment_score := 100;
    END IF;
    
    RETURN v_alignment_score;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_project_alignment_score IS 'Calculates alignment score for a project based on objective mappings';

-- ================================================
-- End of v41_strategic_alignment.sql
-- ================================================


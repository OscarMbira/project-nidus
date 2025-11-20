-- ================================================
-- File: v40_benefits_realization.sql
-- Description: Benefits Realization Tracking module tables
-- Version: 1.0
-- Date: 2025-01-XX
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v39 must be run first (all core tables must exist)
-- - projects table must exist
-- - portfolios table must exist (optional)
-- - programmes table must exist (optional)

-- Purpose:
-- Creates tables for Benefits Realization Tracking module:
-- 1. benefits - Standalone benefits (can be associated with portfolios, programmes, or projects)
-- 2. benefit_measures - Measurement definitions for benefits
-- 3. benefit_measurements - Actual measurements over time
-- 4. benefit_targets - Target values for benefits
-- 5. benefit_attributions - Attribution of benefits to projects/programmes
-- 6. benefit_realization_reports - Benefits realization reports

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- CLEANUP: Drop existing tables if they exist (in reverse dependency order)
-- ================================================

DROP TABLE IF EXISTS benefit_realization_reports CASCADE;
DROP TABLE IF EXISTS benefit_attributions CASCADE;
DROP TABLE IF EXISTS benefit_targets CASCADE;
DROP TABLE IF EXISTS benefit_measurements CASCADE;
DROP TABLE IF EXISTS benefit_measures CASCADE;
DROP TABLE IF EXISTS benefits CASCADE;

-- ================================================
-- TABLE 1: benefits
-- Description: Standalone benefits (can be associated with portfolios, programmes, or projects)
-- Category: benefit
-- ================================================

CREATE TABLE IF NOT EXISTS benefits (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Benefit Code (unique identifier)
    benefit_code VARCHAR(100) NOT NULL,
    
    -- Benefit Information
    benefit_name VARCHAR(200) NOT NULL,
    benefit_description TEXT,
    
    -- Context (can be at portfolio, programme, or project level)
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,
    programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    
    -- Benefit Category & Type
    benefit_category VARCHAR(50) NOT NULL DEFAULT 'financial',
    -- 'financial', 'operational', 'strategic', 'compliance', 'customer', 'employee', 'technology', 'environmental'
    
    benefit_type VARCHAR(50) NOT NULL DEFAULT 'quantifiable',
    -- 'quantifiable', 'qualitative', 'intangible'
    
    -- Benefit Owner
    benefit_owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Benefit Measurement
    measurement_unit VARCHAR(50), 
    -- 'currency', 'percentage', 'count', 'hours', 'score', 'text', 'customer_satisfaction', 'employee_satisfaction'
    
    -- Baseline & Target Values
    baseline_value DECIMAL(15,2),
    target_value DECIMAL(15,2),
    
    -- Current & Realized Values
    current_value DECIMAL(15,2),
    realized_value DECIMAL(15,2),
    
    -- Benefit Status & Timeline
    benefit_status VARCHAR(50) DEFAULT 'identified',
    -- 'identified', 'planned', 'in_progress', 'realized', 'partially_realized', 'lost', 'cancelled'
    
    expected_realization_date DATE,
    actual_realization_date DATE,
    
    -- Benefit Tracking
    tracking_frequency VARCHAR(50) DEFAULT 'monthly',
    -- 'weekly', 'monthly', 'quarterly', 'annually', 'on_demand'
    
    last_measured_date DATE,
    next_measurement_date DATE,
    
    -- Benefit Value (Financial)
    estimated_value DECIMAL(15,2), -- Estimated financial value
    realized_value_currency DECIMAL(15,2), -- Realized financial value
    value_currency VARCHAR(3) DEFAULT 'USD',
    
    -- Benefit Attribution
    attribution_methodology TEXT, -- How benefits are attributed to projects/programmes
    attribution_percentage DECIMAL(5,2) DEFAULT 100.00, -- Percentage attributed to this context
    
    -- Benefit Risk
    realization_probability DECIMAL(5,2), -- 0-100% probability of realization
    risk_factors TEXT, -- Factors that may impact realization
    
    -- Notes and Evidence
    notes TEXT,
    evidence_documents TEXT[], -- Array of document references/URLs
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT benefits_category_check CHECK (
        benefit_category IN ('financial', 'operational', 'strategic', 'compliance', 'customer', 'employee', 'technology', 'environmental')
    ),
    CONSTRAINT benefits_type_check CHECK (
        benefit_type IN ('quantifiable', 'qualitative', 'intangible')
    ),
    CONSTRAINT benefits_status_check CHECK (
        benefit_status IN ('identified', 'planned', 'in_progress', 'realized', 'partially_realized', 'lost', 'cancelled')
    ),
    CONSTRAINT benefits_frequency_check CHECK (
        tracking_frequency IN ('weekly', 'monthly', 'quarterly', 'annually', 'on_demand')
    ),
    CONSTRAINT benefits_probability_check CHECK (
        realization_probability IS NULL OR (realization_probability >= 0 AND realization_probability <= 100)
    ),
    CONSTRAINT benefits_attribution_check CHECK (
        attribution_percentage >= 0 AND attribution_percentage <= 100
    ),
    CONSTRAINT benefits_context_check CHECK (
        portfolio_id IS NOT NULL OR programme_id IS NOT NULL OR project_id IS NOT NULL
    )
);

-- Indexes for benefits
CREATE INDEX IF NOT EXISTS idx_benefits_code ON benefits(benefit_code) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_benefits_portfolio ON benefits(portfolio_id) WHERE portfolio_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_benefits_programme ON benefits(programme_id) WHERE programme_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_benefits_project ON benefits(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_benefits_category ON benefits(benefit_category);
CREATE INDEX IF NOT EXISTS idx_benefits_type ON benefits(benefit_type);
CREATE INDEX IF NOT EXISTS idx_benefits_status ON benefits(benefit_status);
CREATE INDEX IF NOT EXISTS idx_benefits_owner ON benefits(benefit_owner_user_id);
CREATE INDEX IF NOT EXISTS idx_benefits_deleted ON benefits(is_deleted) WHERE is_deleted = false;

-- Partial unique index for benefit code (unique within context)
CREATE UNIQUE INDEX IF NOT EXISTS idx_benefits_code_unique ON benefits(
    COALESCE(portfolio_id, '00000000-0000-0000-0000-000000000000'::UUID),
    COALESCE(programme_id, '00000000-0000-0000-0000-000000000000'::UUID),
    COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::UUID),
    benefit_code
) WHERE is_deleted = false;

-- Trigger to update updated_at
CREATE TRIGGER update_benefits_updated_at
    BEFORE UPDATE ON benefits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 2: benefit_measures
-- Description: Measurement definitions for benefits
-- Category: benefit
-- ================================================

CREATE TABLE IF NOT EXISTS benefit_measures (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Benefit Reference
    benefit_id UUID NOT NULL REFERENCES benefits(id) ON DELETE CASCADE,
    
    -- Measure Information
    measure_name VARCHAR(200) NOT NULL,
    measure_description TEXT,
    measure_unit VARCHAR(50) NOT NULL, -- Same as benefit measurement_unit
    measure_type VARCHAR(50) DEFAULT 'direct', -- 'direct', 'indirect', 'proxy', 'leading_indicator'
    
    -- Measure Calculation
    calculation_method VARCHAR(100), -- 'sum', 'average', 'max', 'min', 'custom'
    calculation_formula TEXT, -- Custom calculation formula if needed
    
    -- Measure Collection
    collection_method VARCHAR(100), -- 'manual', 'automated', 'survey', 'system', 'financial'
    collection_frequency VARCHAR(50) DEFAULT 'monthly', -- 'weekly', 'monthly', 'quarterly', 'annually'
    data_source TEXT, -- Where the data comes from
    
    -- Measure Owner
    measure_owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
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
    CONSTRAINT benefit_measures_type_check CHECK (
        measure_type IN ('direct', 'indirect', 'proxy', 'leading_indicator')
    ),
    CONSTRAINT benefit_measures_frequency_check CHECK (
        collection_frequency IN ('weekly', 'monthly', 'quarterly', 'annually', 'on_demand')
    )
);

-- Indexes for benefit_measures
CREATE INDEX IF NOT EXISTS idx_benefit_measures_benefit ON benefit_measures(benefit_id);
CREATE INDEX IF NOT EXISTS idx_benefit_measures_type ON benefit_measures(measure_type);
CREATE INDEX IF NOT EXISTS idx_benefit_measures_deleted ON benefit_measures(is_deleted) WHERE is_deleted = false;

-- Trigger to update updated_at
CREATE TRIGGER update_benefit_measures_updated_at
    BEFORE UPDATE ON benefit_measures
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 3: benefit_measurements
-- Description: Actual measurements over time
-- Category: benefit
-- ================================================

CREATE TABLE IF NOT EXISTS benefit_measurements (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Benefit Reference
    benefit_id UUID NOT NULL REFERENCES benefits(id) ON DELETE CASCADE,
    measure_id UUID REFERENCES benefit_measures(id) ON DELETE SET NULL,
    
    -- Measurement Information
    measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    measurement_value DECIMAL(15,2) NOT NULL,
    measurement_unit VARCHAR(50),
    
    -- Measurement Context
    measurement_period VARCHAR(50), -- 'daily', 'weekly', 'monthly', 'quarterly', 'annually', 'cumulative'
    measurement_type VARCHAR(50) DEFAULT 'actual', -- 'actual', 'forecast', 'planned', 'baseline'
    
    -- Measurement Quality
    data_quality VARCHAR(50) DEFAULT 'good', -- 'excellent', 'good', 'fair', 'poor', 'unknown'
    data_source TEXT, -- Where this measurement came from
    verified BOOLEAN DEFAULT FALSE,
    verified_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_date DATE,
    
    -- Measurement Notes
    notes TEXT,
    supporting_evidence TEXT[], -- Array of document references/URLs
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT benefit_measurements_type_check CHECK (
        measurement_type IN ('actual', 'forecast', 'planned', 'baseline')
    ),
    CONSTRAINT benefit_measurements_quality_check CHECK (
        data_quality IN ('excellent', 'good', 'fair', 'poor', 'unknown')
    )
);

-- Indexes for benefit_measurements
CREATE INDEX IF NOT EXISTS idx_benefit_measurements_benefit ON benefit_measurements(benefit_id);
CREATE INDEX IF NOT EXISTS idx_benefit_measurements_measure ON benefit_measurements(measure_id);
CREATE INDEX IF NOT EXISTS idx_benefit_measurements_date ON benefit_measurements(measurement_date);
CREATE INDEX IF NOT EXISTS idx_benefit_measurements_type ON benefit_measurements(measurement_type);
CREATE INDEX IF NOT EXISTS idx_benefit_measurements_deleted ON benefit_measurements(is_deleted) WHERE is_deleted = false;

-- Trigger to update updated_at
CREATE TRIGGER update_benefit_measurements_updated_at
    BEFORE UPDATE ON benefit_measurements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 4: benefit_targets
-- Description: Target values for benefits
-- Category: benefit
-- ================================================

CREATE TABLE IF NOT EXISTS benefit_targets (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Benefit Reference
    benefit_id UUID NOT NULL REFERENCES benefits(id) ON DELETE CASCADE,
    
    -- Target Information
    target_name VARCHAR(200) NOT NULL,
    target_description TEXT,
    
    -- Target Values
    target_value DECIMAL(15,2) NOT NULL,
    target_unit VARCHAR(50),
    target_type VARCHAR(50) DEFAULT 'absolute', -- 'absolute', 'percentage', 'relative'
    
    -- Target Timeline
    target_date DATE NOT NULL,
    baseline_date DATE, -- Date for baseline comparison
    baseline_value DECIMAL(15,2), -- Baseline value for comparison
    
    -- Target Status
    target_status VARCHAR(50) DEFAULT 'active', -- 'active', 'achieved', 'missed', 'cancelled'
    achievement_date DATE, -- Date when target was achieved (if applicable)
    
    -- Target Owner
    target_owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
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
    CONSTRAINT benefit_targets_type_check CHECK (
        target_type IN ('absolute', 'percentage', 'relative')
    ),
    CONSTRAINT benefit_targets_status_check CHECK (
        target_status IN ('active', 'achieved', 'missed', 'cancelled')
    )
);

-- Indexes for benefit_targets
CREATE INDEX IF NOT EXISTS idx_benefit_targets_benefit ON benefit_targets(benefit_id);
CREATE INDEX IF NOT EXISTS idx_benefit_targets_date ON benefit_targets(target_date);
CREATE INDEX IF NOT EXISTS idx_benefit_targets_status ON benefit_targets(target_status);
CREATE INDEX IF NOT EXISTS idx_benefit_targets_deleted ON benefit_targets(is_deleted) WHERE is_deleted = false;

-- Trigger to update updated_at
CREATE TRIGGER update_benefit_targets_updated_at
    BEFORE UPDATE ON benefit_targets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 5: benefit_attributions
-- Description: Attribution of benefits to projects/programmes
-- Category: benefit
-- ================================================

CREATE TABLE IF NOT EXISTS benefit_attributions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Benefit Reference
    benefit_id UUID NOT NULL REFERENCES benefits(id) ON DELETE CASCADE,
    
    -- Attribution Context
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,
    programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    
    -- Attribution Details
    attribution_percentage DECIMAL(5,2) NOT NULL DEFAULT 100.00, -- 0-100% of benefit attributed
    attribution_methodology TEXT, -- How attribution was calculated
    attribution_justification TEXT, -- Why this attribution is valid
    
    -- Attribution Status
    attribution_status VARCHAR(50) DEFAULT 'proposed', -- 'proposed', 'approved', 'rejected', 'reviewed'
    attribution_confidence VARCHAR(50) DEFAULT 'medium', -- 'high', 'medium', 'low'
    
    -- Attribution Owner
    attributed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    approval_date DATE,
    
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
    CONSTRAINT benefit_attributions_percentage_check CHECK (
        attribution_percentage >= 0 AND attribution_percentage <= 100
    ),
    CONSTRAINT benefit_attributions_status_check CHECK (
        attribution_status IN ('proposed', 'approved', 'rejected', 'reviewed')
    ),
    CONSTRAINT benefit_attributions_confidence_check CHECK (
        attribution_confidence IN ('high', 'medium', 'low')
    ),
    CONSTRAINT benefit_attributions_context_check CHECK (
        portfolio_id IS NOT NULL OR programme_id IS NOT NULL OR project_id IS NOT NULL
    )
);

-- Indexes for benefit_attributions
CREATE INDEX IF NOT EXISTS idx_benefit_attributions_benefit ON benefit_attributions(benefit_id);
CREATE INDEX IF NOT EXISTS idx_benefit_attributions_portfolio ON benefit_attributions(portfolio_id) WHERE portfolio_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_benefit_attributions_programme ON benefit_attributions(programme_id) WHERE programme_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_benefit_attributions_project ON benefit_attributions(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_benefit_attributions_status ON benefit_attributions(attribution_status);
CREATE INDEX IF NOT EXISTS idx_benefit_attributions_deleted ON benefit_attributions(is_deleted) WHERE is_deleted = false;

-- Trigger to update updated_at
CREATE TRIGGER update_benefit_attributions_updated_at
    BEFORE UPDATE ON benefit_attributions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 6: benefit_realization_reports
-- Description: Benefits realization reports
-- Category: benefit
-- ================================================

CREATE TABLE IF NOT EXISTS benefit_realization_reports (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Report Context
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,
    programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    
    -- Report Information
    report_name VARCHAR(200) NOT NULL,
    report_description TEXT,
    report_type VARCHAR(50) DEFAULT 'benefits_realization',
    -- 'benefits_realization', 'benefits_vs_costs', 'benefits_forecast', 'benefits_attribution', 'comprehensive'
    
    -- Report Period
    report_start_date DATE,
    report_end_date DATE,
    report_date DATE DEFAULT CURRENT_DATE,
    
    -- Report Content (JSON)
    report_data JSONB, -- Structured report data
    
    -- Report Status
    report_status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'final', 'archived'
    
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
    CONSTRAINT benefit_realization_reports_type_check CHECK (
        report_type IN ('benefits_realization', 'benefits_vs_costs', 'benefits_forecast', 'benefits_attribution', 'comprehensive')
    ),
    CONSTRAINT benefit_realization_reports_status_check CHECK (
        report_status IN ('draft', 'final', 'archived')
    ),
    CONSTRAINT benefit_realization_reports_context_check CHECK (
        portfolio_id IS NOT NULL OR programme_id IS NOT NULL OR project_id IS NOT NULL
    )
);

-- Indexes for benefit_realization_reports
CREATE INDEX IF NOT EXISTS idx_benefit_realization_reports_portfolio ON benefit_realization_reports(portfolio_id) WHERE portfolio_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_benefit_realization_reports_programme ON benefit_realization_reports(programme_id) WHERE programme_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_benefit_realization_reports_project ON benefit_realization_reports(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_benefit_realization_reports_type ON benefit_realization_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_benefit_realization_reports_status ON benefit_realization_reports(report_status);
CREATE INDEX IF NOT EXISTS idx_benefit_realization_reports_date ON benefit_realization_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_benefit_realization_reports_deleted ON benefit_realization_reports(is_deleted) WHERE is_deleted = false;

-- Trigger to update updated_at
CREATE TRIGGER update_benefit_realization_reports_updated_at
    BEFORE UPDATE ON benefit_realization_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- REGISTER TABLES IN database_tables
-- ================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('benefits', 'Standalone benefits (can be associated with portfolios, programmes, or projects)', false, true, 'benefit'),
  ('benefit_measures', 'Measurement definitions for benefits', false, true, 'benefit'),
  ('benefit_measurements', 'Actual measurements over time', false, true, 'benefit'),
  ('benefit_targets', 'Target values for benefits', false, true, 'benefit'),
  ('benefit_attributions', 'Attribution of benefits to projects/programmes', false, true, 'benefit'),
  ('benefit_realization_reports', 'Benefits realization reports', false, true, 'benefit')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  table_category = EXCLUDED.table_category,
  updated_at = NOW();

-- ================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================

-- Enable RLS on all tables
ALTER TABLE benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefit_measures ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefit_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefit_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefit_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefit_realization_reports ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies should be created based on your organization's security requirements
-- Example policies (commented out - customize as needed):
-- CREATE POLICY "Users can view benefits for their projects"
--   ON benefits FOR SELECT
--   USING (
--     is_deleted = false AND (
--       EXISTS (SELECT 1 FROM project_members WHERE project_id = benefits.project_id AND user_id = auth.uid())
--       OR EXISTS (SELECT 1 FROM programme_members WHERE programme_id = benefits.programme_id AND user_id = auth.uid())
--       OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'portfolio_manager', 'programme_manager'))
--     )
--   );

-- ================================================
-- HELPER FUNCTIONS
-- ================================================

-- Function to calculate benefits realization percentage
CREATE OR REPLACE FUNCTION calculate_benefit_realization(
    p_benefit_id UUID
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    v_benefit RECORD;
    v_current_value DECIMAL(15,2);
    v_target_value DECIMAL(15,2);
    v_realization DECIMAL(5,2);
BEGIN
    SELECT * INTO v_benefit FROM benefits WHERE id = p_benefit_id AND is_deleted = false;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- Use current_value or realized_value if available
    v_current_value := COALESCE(v_benefit.realized_value, v_benefit.current_value, 0);
    v_target_value := COALESCE(v_benefit.target_value, 1);
    
    IF v_target_value = 0 THEN
        RETURN NULL;
    END IF;
    
    -- Calculate realization percentage
    v_realization := (v_current_value / v_target_value) * 100;
    
    -- Cap at 100%
    IF v_realization > 100 THEN
        v_realization := 100;
    END IF;
    
    RETURN v_realization;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_benefit_realization IS 'Calculates the benefits realization percentage for a given benefit';

-- ================================================
-- End of v40_benefits_realization.sql
-- ================================================


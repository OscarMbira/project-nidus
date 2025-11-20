-- ================================================
-- File: v26_risk_management.sql
-- Description: Risk Management tables (universal across all methodologies)
-- Version: 1.0
-- Date: 2025-01-XX
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v25 must be run first (all core tables must exist)
-- - projects table must exist
-- - users table must exist
-- - issues table must exist (from v25_issue_management.sql)

-- Purpose:
-- Creates tables for universal Risk Management:
-- 1. risks - Risk register
-- 2. risk_assessments - Risk assessment history
-- 3. risk_mitigations - Risk mitigation plans
-- 4. risk_monitoring - Risk monitoring records
-- 5. assumptions - Project assumptions tracking
-- 6. dependencies_register - Dependencies tracking
-- 7. raid_log view - Combined view of Risks, Assumptions, Issues, Dependencies

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- TABLE 1: risks
-- Description: Risk register (universal across methodologies)
-- Category: risks
-- ================================================

CREATE TABLE IF NOT EXISTS risks (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    work_package_id UUID REFERENCES work_packages(id) ON DELETE SET NULL,  -- Optional: link to work package
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,  -- Optional: link to task
    related_risk_id UUID REFERENCES risks(id) ON DELETE SET NULL,  -- For linked/related risks

    -- Risk Information
    risk_title VARCHAR(200) NOT NULL,
    risk_description TEXT NOT NULL,
    risk_code VARCHAR(50),  -- Unique code (e.g., RISK-001)
    
    -- Categorization
    risk_category VARCHAR(50),  -- 'technical', 'schedule', 'resource', 'financial', 'quality', 'external', 'organizational', 'other'
    risk_type VARCHAR(50) DEFAULT 'threat',  -- 'threat', 'opportunity'
    
    -- Assessment
    probability INTEGER DEFAULT 3,  -- 1-5 scale (1=Very Low, 5=Very High)
    impact INTEGER DEFAULT 3,  -- 1-5 scale (1=Very Low, 5=Very High)
    risk_score INTEGER GENERATED ALWAYS AS (probability * impact) STORED,  -- Calculated: probability × impact
    
    -- Risk Level (derived from score)
    risk_level VARCHAR(50) GENERATED ALWAYS AS (
        CASE 
            WHEN (probability * impact) >= 20 THEN 'critical'
            WHEN (probability * impact) >= 12 THEN 'high'
            WHEN (probability * impact) >= 6 THEN 'medium'
            ELSE 'low'
        END
    ) STORED,
    
    -- Status
    status VARCHAR(50) DEFAULT 'identified',  -- 'identified', 'assessed', 'mitigated', 'monitored', 'closed', 'realized'
    
    -- Ownership
    identified_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    risk_owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP,
    
    -- Response Strategy
    response_strategy VARCHAR(50),  -- 'avoid', 'transfer', 'mitigate', 'accept', 'exploit' (for opportunities)
    response_strategy_description TEXT,
    
    -- Dates
    identified_date DATE NOT NULL DEFAULT CURRENT_DATE,
    target_mitigation_date DATE,
    next_review_date DATE,
    closed_date DATE,
    
    -- Impact Details
    impact_description TEXT,
    affected_areas TEXT[],  -- Array of affected areas/components
    potential_consequences TEXT,
    
    -- Escalation
    is_escalated BOOLEAN DEFAULT FALSE,
    escalated_at TIMESTAMP,
    escalated_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    escalation_reason TEXT,
    
    -- Tags
    tags TEXT[],  -- Array of tags for filtering/searching

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_risks_project_id ON risks(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_risks_work_package_id ON risks(work_package_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_risks_task_id ON risks(task_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_risks_risk_level ON risks(risk_level) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_risks_risk_score ON risks(risk_score) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_risks_owner ON risks(risk_owner_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_risks_code ON risks(risk_code) WHERE is_deleted = FALSE AND risk_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_risks_escalated ON risks(is_escalated) WHERE is_deleted = FALSE AND is_escalated = TRUE;
CREATE INDEX IF NOT EXISTS idx_risks_next_review ON risks(next_review_date) WHERE is_deleted = FALSE AND next_review_date IS NOT NULL;

-- Unique constraint for risk code per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_risks_code_unique 
ON risks(project_id, risk_code) 
WHERE is_deleted = FALSE AND risk_code IS NOT NULL;

-- Triggers
DROP TRIGGER IF EXISTS trg_risks_before_insert ON risks;
CREATE TRIGGER trg_risks_before_insert
    BEFORE INSERT ON risks
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_risks_before_update ON risks;
CREATE TRIGGER trg_risks_before_update
    BEFORE UPDATE ON risks
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE risks IS 'Risk register (universal across all methodologies)';
COMMENT ON COLUMN risks.probability IS 'Probability on 1-5 scale (1=Very Low, 5=Very High)';
COMMENT ON COLUMN risks.impact IS 'Impact on 1-5 scale (1=Very Low, 5=Very High)';
COMMENT ON COLUMN risks.risk_score IS 'Calculated as probability × impact (1-25)';
COMMENT ON COLUMN risks.status IS 'Status: identified, assessed, mitigated, monitored, closed, realized';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('risks', 'Risk register (universal across all methodologies)', false, true, 'risks')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 2: risk_assessments
-- Description: Risk assessment history
-- Category: risks
-- ================================================

CREATE TABLE IF NOT EXISTS risk_assessments (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    assessed_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Assessment Information
    assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    assessment_type VARCHAR(50) DEFAULT 'initial',  -- 'initial', 'review', 'reassessment'
    
    -- Assessment Values
    probability INTEGER NOT NULL,  -- 1-5
    impact INTEGER NOT NULL,  -- 1-5
    risk_score INTEGER GENERATED ALWAYS AS (probability * impact) STORED,
    
    -- Assessment Details
    probability_rationale TEXT,  -- Why this probability?
    impact_rationale TEXT,  -- Why this impact?
    assessment_notes TEXT,
    
    -- Changes
    probability_change INTEGER,  -- Change from previous assessment
    impact_change INTEGER,  -- Change from previous assessment
    trend VARCHAR(50),  -- 'increasing', 'decreasing', 'stable'

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_risk_assessments_risk_id ON risk_assessments(risk_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_risk_assessments_date ON risk_assessments(assessment_date) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_risk_assessments_before_insert ON risk_assessments;
CREATE TRIGGER trg_risk_assessments_before_insert
    BEFORE INSERT ON risk_assessments
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_risk_assessments_before_update ON risk_assessments;
CREATE TRIGGER trg_risk_assessments_before_update
    BEFORE UPDATE ON risk_assessments
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE risk_assessments IS 'Risk assessment history';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('risk_assessments', 'Risk assessment history', false, true, 'risks')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 3: risk_mitigations
-- Description: Risk mitigation plans
-- Category: risks
-- ================================================

CREATE TABLE IF NOT EXISTS risk_mitigations (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Mitigation Information
    mitigation_action TEXT NOT NULL,
    mitigation_description TEXT,
    mitigation_type VARCHAR(50),  -- 'preventive', 'contingency', 'corrective'
    
    -- Status
    status VARCHAR(50) DEFAULT 'planned',  -- 'planned', 'in_progress', 'completed', 'cancelled'
    
    -- Dates
    planned_start_date DATE,
    planned_completion_date DATE,
    actual_start_date DATE,
    actual_completion_date DATE,
    
    -- Effectiveness
    effectiveness_rating INTEGER,  -- 1-5 scale (how effective is this mitigation?)
    effectiveness_notes TEXT,
    
    -- Cost
    estimated_cost DECIMAL(12,2),
    actual_cost DECIMAL(12,2),
    
    -- Progress
    progress_percentage DECIMAL(5,2) DEFAULT 0,  -- 0-100
    
    -- Notes
    notes TEXT,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_risk_mitigations_risk_id ON risk_mitigations(risk_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_risk_mitigations_status ON risk_mitigations(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_risk_mitigations_assigned_to ON risk_mitigations(assigned_to_user_id) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_risk_mitigations_before_insert ON risk_mitigations;
CREATE TRIGGER trg_risk_mitigations_before_insert
    BEFORE INSERT ON risk_mitigations
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_risk_mitigations_before_update ON risk_mitigations;
CREATE TRIGGER trg_risk_mitigations_before_update
    BEFORE UPDATE ON risk_mitigations
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE risk_mitigations IS 'Risk mitigation plans';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('risk_mitigations', 'Risk mitigation plans', false, true, 'risks')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 4: risk_monitoring
-- Description: Risk monitoring records
-- Category: risks
-- ================================================

CREATE TABLE IF NOT EXISTS risk_monitoring (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    monitored_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Monitoring Information
    monitoring_date DATE NOT NULL DEFAULT CURRENT_DATE,
    monitoring_type VARCHAR(50) DEFAULT 'regular',  -- 'regular', 'triggered', 'escalation'
    
    -- Status Update
    current_status VARCHAR(50),  -- Current status of the risk
    status_change_reason TEXT,
    
    -- Assessment Update
    current_probability INTEGER,  -- Current probability (1-5)
    current_impact INTEGER,  -- Current impact (1-5)
    current_risk_score INTEGER GENERATED ALWAYS AS (COALESCE(current_probability, 0) * COALESCE(current_impact, 0)) STORED,
    
    -- Monitoring Notes
    monitoring_notes TEXT,
    early_warning_indicators TEXT,  -- Early warning signs observed
    trends_observed TEXT,
    
    -- Actions Required
    actions_required TEXT,
    next_review_date DATE,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_risk_monitoring_risk_id ON risk_monitoring(risk_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_risk_monitoring_date ON risk_monitoring(monitoring_date) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_risk_monitoring_next_review ON risk_monitoring(next_review_date) WHERE is_deleted = FALSE AND next_review_date IS NOT NULL;

-- Triggers
DROP TRIGGER IF EXISTS trg_risk_monitoring_before_insert ON risk_monitoring;
CREATE TRIGGER trg_risk_monitoring_before_insert
    BEFORE INSERT ON risk_monitoring
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_risk_monitoring_before_update ON risk_monitoring;
CREATE TRIGGER trg_risk_monitoring_before_update
    BEFORE UPDATE ON risk_monitoring
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE risk_monitoring IS 'Risk monitoring records';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('risk_monitoring', 'Risk monitoring records', false, true, 'risks')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 5: assumptions
-- Description: Project assumptions tracking
-- Category: risks
-- ================================================

CREATE TABLE IF NOT EXISTS assumptions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    work_package_id UUID REFERENCES work_packages(id) ON DELETE SET NULL,

    -- Assumption Information
    assumption_title VARCHAR(200) NOT NULL,
    assumption_description TEXT NOT NULL,
    assumption_code VARCHAR(50),
    
    -- Categorization
    assumption_category VARCHAR(50),  -- 'technical', 'resource', 'schedule', 'business', 'external', 'other'
    
    -- Status
    status VARCHAR(50) DEFAULT 'active',  -- 'active', 'validated', 'invalidated', 'closed'
    
    -- Validation
    validation_date DATE,
    validated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    validation_notes TEXT,
    
    -- Impact
    impact_if_invalid TEXT,  -- What happens if this assumption is invalid?
    impact_severity VARCHAR(50),  -- 'low', 'medium', 'high', 'critical'
    
    -- Ownership
    identified_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Dates
    identified_date DATE NOT NULL DEFAULT CURRENT_DATE,
    next_review_date DATE,
    closed_date DATE,
    
    -- Tags
    tags TEXT[],

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assumptions_project_id ON assumptions(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_assumptions_status ON assumptions(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_assumptions_code ON assumptions(assumption_code) WHERE is_deleted = FALSE AND assumption_code IS NOT NULL;

-- Unique constraint for assumption code per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_assumptions_code_unique 
ON assumptions(project_id, assumption_code) 
WHERE is_deleted = FALSE AND assumption_code IS NOT NULL;

-- Triggers
DROP TRIGGER IF EXISTS trg_assumptions_before_insert ON assumptions;
CREATE TRIGGER trg_assumptions_before_insert
    BEFORE INSERT ON assumptions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_assumptions_before_update ON assumptions;
CREATE TRIGGER trg_assumptions_before_update
    BEFORE UPDATE ON assumptions
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE assumptions IS 'Project assumptions tracking';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('assumptions', 'Project assumptions tracking', false, true, 'risks')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 6: dependencies_register
-- Description: Dependencies tracking
-- Category: risks
-- ================================================

CREATE TABLE IF NOT EXISTS dependencies_register (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    dependent_on_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,  -- External project dependency
    work_package_id UUID REFERENCES work_packages(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

    -- Dependency Information
    dependency_title VARCHAR(200) NOT NULL,
    dependency_description TEXT NOT NULL,
    dependency_code VARCHAR(50),
    
    -- Dependency Type
    dependency_type VARCHAR(50) DEFAULT 'external',  -- 'internal', 'external', 'technical', 'resource', 'schedule', 'other'
    dependency_direction VARCHAR(50) DEFAULT 'outgoing',  -- 'incoming', 'outgoing'
    
    -- Status
    status VARCHAR(50) DEFAULT 'identified',  -- 'identified', 'confirmed', 'at_risk', 'fulfilled', 'failed'
    
    -- Dependency Details
    dependency_source VARCHAR(200),  -- Who/what is the source of this dependency?
    dependency_target VARCHAR(200),  -- Who/what depends on this?
    criticality VARCHAR(50) DEFAULT 'medium',  -- 'low', 'medium', 'high', 'critical'
    
    -- Dates
    identified_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_fulfillment_date DATE,
    actual_fulfillment_date DATE,
    next_review_date DATE,
    
    -- Impact
    impact_if_not_met TEXT,  -- What happens if this dependency is not met?
    mitigation_plan TEXT,  -- Plan if dependency fails
    
    -- Ownership
    identified_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Tags
    tags TEXT[],

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dependencies_project_id ON dependencies_register(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_dependencies_status ON dependencies_register(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_dependencies_type ON dependencies_register(dependency_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_dependencies_code ON dependencies_register(dependency_code) WHERE is_deleted = FALSE AND dependency_code IS NOT NULL;

-- Unique constraint for dependency code per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_dependencies_code_unique 
ON dependencies_register(project_id, dependency_code) 
WHERE is_deleted = FALSE AND dependency_code IS NOT NULL;

-- Triggers
DROP TRIGGER IF EXISTS trg_dependencies_before_insert ON dependencies_register;
CREATE TRIGGER trg_dependencies_before_insert
    BEFORE INSERT ON dependencies_register
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_dependencies_before_update ON dependencies_register;
CREATE TRIGGER trg_dependencies_before_update
    BEFORE UPDATE ON dependencies_register
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE dependencies_register IS 'Dependencies tracking';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('dependencies_register', 'Dependencies tracking', false, true, 'risks')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- VIEW: raid_log
-- Description: Combined view of Risks, Assumptions, Issues, Dependencies (RAID)
-- Category: risks
-- ================================================

CREATE OR REPLACE VIEW raid_log AS
SELECT 
    'risk' AS raid_type,
    r.id,
    r.project_id,
    r.risk_code AS code,
    r.risk_title AS title,
    r.risk_description AS description,
    r.risk_category AS category,
    r.status,
    r.risk_level AS priority_level,
    r.risk_owner_user_id AS owner_user_id,
    r.identified_date AS identified_date,
    r.next_review_date AS next_review_date,
    r.created_at,
    r.updated_at
FROM risks r
WHERE r.is_deleted = FALSE

UNION ALL

SELECT 
    'assumption' AS raid_type,
    a.id,
    a.project_id,
    a.assumption_code AS code,
    a.assumption_title AS title,
    a.assumption_description AS description,
    a.assumption_category AS category,
    a.status,
    a.impact_severity AS priority_level,
    a.owner_user_id,
    a.identified_date AS identified_date,
    a.next_review_date AS next_review_date,
    a.created_at,
    a.updated_at
FROM assumptions a
WHERE a.is_deleted = FALSE

UNION ALL

SELECT 
    'issue' AS raid_type,
    i.id,
    i.project_id,
    i.issue_code AS code,
    i.issue_title AS title,
    i.issue_description AS description,
    i.issue_category AS category,
    i.status,
    i.priority AS priority_level,
    i.assigned_to_user_id AS owner_user_id,
    i.created_at::DATE AS identified_date,
    NULL AS next_review_date,
    i.created_at,
    i.updated_at
FROM issues i
WHERE i.is_deleted = FALSE

UNION ALL

SELECT 
    'dependency' AS raid_type,
    d.id,
    d.project_id,
    d.dependency_code AS code,
    d.dependency_title AS title,
    d.dependency_description AS description,
    d.dependency_type AS category,
    d.status,
    d.criticality AS priority_level,
    d.owner_user_id,
    d.identified_date AS identified_date,
    d.next_review_date AS next_review_date,
    d.created_at,
    d.updated_at
FROM dependencies_register d
WHERE d.is_deleted = FALSE;

-- Comments
COMMENT ON VIEW raid_log IS 'Combined view of Risks, Assumptions, Issues, Dependencies (RAID log)';

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_tables_count INTEGER;
BEGIN
    -- Count Risk Management tables
    SELECT COUNT(*)
    INTO v_tables_count
    FROM database_tables
    WHERE table_category = 'risks'
      AND table_name IN (
          'risks',
          'risk_assessments',
          'risk_mitigations',
          'risk_monitoring',
          'assumptions',
          'dependencies_register'
      )
      AND is_deleted = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Risk Management Tables Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Risk Tables Created: %', v_tables_count;
    RAISE NOTICE 'RAID Log View Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v26_risk_management.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================


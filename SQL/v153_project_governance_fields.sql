-- ================================================
-- File: v153_project_governance_fields.sql
-- Description: Add governance fields for PMO project authorisation
-- Version: 1.0
-- Date: 2026-01-12
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- Phase: 2 of 6 - PMO Project Creation Governance Upgrade
-- ================================================

-- Prerequisites:
-- - v152_project_intake_lifecycle.sql must be run first
-- - v04_project_core_tables.sql must be run (projects table exists)
-- - v03_user_access_tables.sql must be run (users table exists)

-- Purpose:
-- Adds all governance fields required by PMO Project Creation PRD:
-- A) Governance & Authority
-- B) Business Justification
-- C) Lifecycle & Controls
-- D) Financial Controls
-- E) Risk & Complexity Pre-Assessment
-- F) Document Governance Metadata
-- G) Resource & Capacity Indicators

-- ================================================
-- SECTION A: GOVERNANCE & AUTHORITY
-- ================================================

-- Add executive/sponsor and authority fields
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS executive_user_id UUID REFERENCES users(id);

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS board_required BOOLEAN DEFAULT FALSE;

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS funding_authority_user_id UUID REFERENCES users(id);

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS approving_authority_user_id UUID REFERENCES users(id);

-- Add comments
COMMENT ON COLUMN projects.executive_user_id IS 'Project Executive/Sponsor (mandatory for authorisation)';
COMMENT ON COLUMN projects.board_required IS 'Whether project board is required (Yes/No)';
COMMENT ON COLUMN projects.funding_authority_user_id IS 'User responsible for funding decisions';
COMMENT ON COLUMN projects.approving_authority_user_id IS 'User responsible for stage gate approvals';

-- Create project_board_members table for many-to-many relationship
CREATE TABLE IF NOT EXISTS project_board_members (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Board Member Details
    board_role VARCHAR(100), -- 'Senior User', 'Senior Supplier', 'Project Executive', etc.
    appointed_at TIMESTAMP DEFAULT NOW(),
    appointed_by UUID REFERENCES users(id),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    -- Unique constraint: one user can only have one role per project board
    CONSTRAINT uq_project_board_members UNIQUE(project_id, user_id)
);

-- Indexes for project_board_members
CREATE INDEX IF NOT EXISTS idx_project_board_members_project_id ON project_board_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_board_members_user_id ON project_board_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_board_members_is_active ON project_board_members(is_active) WHERE is_deleted = FALSE;

-- Triggers for project_board_members
DROP TRIGGER IF EXISTS trg_project_board_members_before_insert ON project_board_members;
CREATE TRIGGER trg_project_board_members_before_insert
    BEFORE INSERT ON project_board_members
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_project_board_members_before_update ON project_board_members;
CREATE TRIGGER trg_project_board_members_before_update
    BEFORE UPDATE ON project_board_members
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE project_board_members IS 'Project board member assignments for governance';
COMMENT ON COLUMN project_board_members.board_role IS 'Role on the board: Senior User, Senior Supplier, Project Executive, etc.';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('project_board_members', 'Project board member assignments for governance', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ================================================
-- SECTION B: BUSINESS JUSTIFICATION
-- ================================================

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS business_objective TEXT;

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS strategic_alignment VARCHAR(100);

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS expected_benefits_summary TEXT;

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS benefit_owner_user_id UUID REFERENCES users(id);

-- Comments
COMMENT ON COLUMN projects.business_objective IS 'Business problem statement or objective (mandatory for authorisation)';
COMMENT ON COLUMN projects.strategic_alignment IS 'How project aligns to organizational strategy';
COMMENT ON COLUMN projects.expected_benefits_summary IS 'High-level summary of expected benefits';
COMMENT ON COLUMN projects.benefit_owner_user_id IS 'User responsible for benefits realization';

-- ================================================
-- SECTION C: LIFECYCLE & CONTROLS
-- ================================================

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS delivery_methodology VARCHAR(50);

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS lifecycle_template VARCHAR(100);

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS stage_model VARCHAR(50);

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS stage_gate_enforcement VARCHAR(50) DEFAULT 'required';

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS tolerance_time_days INTEGER;

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS tolerance_cost_percentage DECIMAL(5,2);

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS tolerance_scope_description TEXT;

-- Comments
COMMENT ON COLUMN projects.delivery_methodology IS 'Delivery approach: PRINCE2, Agile, Hybrid, Waterfall, Structured';
COMMENT ON COLUMN projects.lifecycle_template IS 'Lifecycle template applied to this project';
COMMENT ON COLUMN projects.stage_model IS 'Stage model: fixed (predefined stages) or flexible (adaptive)';
COMMENT ON COLUMN projects.stage_gate_enforcement IS 'Stage gate enforcement: required (hard gate) or advisory (soft gate)';
COMMENT ON COLUMN projects.tolerance_time_days IS 'Time tolerance in days (+/-)';
COMMENT ON COLUMN projects.tolerance_cost_percentage IS 'Cost tolerance as percentage (+/-)';
COMMENT ON COLUMN projects.tolerance_scope_description IS 'Description of acceptable scope variance';

-- ================================================
-- SECTION D: FINANCIAL CONTROLS
-- ================================================

-- Update existing budget_currency column if needed, or add if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'budget_currency'
    ) THEN
        ALTER TABLE projects ADD COLUMN budget_currency VARCHAR(3) DEFAULT 'USD';
    END IF;
END $$;

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS budget_type VARCHAR(50);

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS funding_source VARCHAR(200);

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS budget_approval_status VARCHAR(50);

-- Comments
COMMENT ON COLUMN projects.budget_currency IS 'Currency code (ISO 4217): USD, EUR, GBP, etc.';
COMMENT ON COLUMN projects.budget_type IS 'Budget type: capex (capital expenditure), opex (operational expenditure), or mixed';
COMMENT ON COLUMN projects.funding_source IS 'Source of funding (department, grant, client, etc.)';
COMMENT ON COLUMN projects.budget_approval_status IS 'Budget approval status: pending, approved, rejected';

-- ================================================
-- SECTION E: RISK & COMPLEXITY PRE-ASSESSMENT
-- ================================================

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS initial_risk_rating VARCHAR(50);

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS complexity_rating VARCHAR(50);

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS delivery_complexity VARCHAR(50);

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS regulatory_impact BOOLEAN DEFAULT FALSE;

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS data_sensitivity VARCHAR(50);

-- Comments
COMMENT ON COLUMN projects.initial_risk_rating IS 'Initial risk assessment: low, medium, high';
COMMENT ON COLUMN projects.complexity_rating IS 'Project complexity: low, medium, high';
COMMENT ON COLUMN projects.delivery_complexity IS 'Delivery complexity: single_vendor, multi_vendor';
COMMENT ON COLUMN projects.regulatory_impact IS 'Whether project has regulatory/compliance impact';
COMMENT ON COLUMN projects.data_sensitivity IS 'Data sensitivity level: public, internal, confidential';

-- ================================================
-- SECTION F: DOCUMENT GOVERNANCE METADATA
-- ================================================

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS mandate_status VARCHAR(50);

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS business_case_status VARCHAR(50);

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS rfp_reference VARCHAR(200);

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS funding_approval_status VARCHAR(50);

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS document_repository_url TEXT;

-- Comments
COMMENT ON COLUMN projects.mandate_status IS 'Project mandate document status: draft, approved, missing';
COMMENT ON COLUMN projects.business_case_status IS 'Business case document status: draft, approved, missing';
COMMENT ON COLUMN projects.rfp_reference IS 'Reference to RFP document (if applicable)';
COMMENT ON COLUMN projects.funding_approval_status IS 'Funding approval document status: pending, approved, rejected';
COMMENT ON COLUMN projects.document_repository_url IS 'Link to external document repository (SharePoint, etc.)';

-- ================================================
-- SECTION G: RESOURCE & CAPACITY INDICATORS (ADVISORY)
-- ================================================

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS estimated_effort VARCHAR(50);

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS key_skills_required TEXT;

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS external_vendors_required BOOLEAN DEFAULT FALSE;

-- Comments
COMMENT ON COLUMN projects.estimated_effort IS 'Estimated effort: small, medium, large';
COMMENT ON COLUMN projects.key_skills_required IS 'Key skills/competencies required for delivery';
COMMENT ON COLUMN projects.external_vendors_required IS 'Whether external vendors are required';

-- ================================================
-- ADD INDEXES FOR PERFORMANCE
-- ================================================

CREATE INDEX IF NOT EXISTS idx_projects_executive_user_id ON projects(executive_user_id);
CREATE INDEX IF NOT EXISTS idx_projects_benefit_owner_user_id ON projects(benefit_owner_user_id);
CREATE INDEX IF NOT EXISTS idx_projects_funding_authority_user_id ON projects(funding_authority_user_id);
CREATE INDEX IF NOT EXISTS idx_projects_approving_authority_user_id ON projects(approving_authority_user_id);
CREATE INDEX IF NOT EXISTS idx_projects_delivery_methodology ON projects(delivery_methodology) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_projects_initial_risk_rating ON projects(initial_risk_rating) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_projects_complexity_rating ON projects(complexity_rating) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_projects_board_required ON projects(board_required) WHERE is_deleted = FALSE;

-- ================================================
-- ADD CHECK CONSTRAINTS
-- ================================================

-- Delivery methodology constraint
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS chk_projects_delivery_methodology;

ALTER TABLE projects
ADD CONSTRAINT chk_projects_delivery_methodology
CHECK (delivery_methodology IN ('PRINCE2', 'Agile', 'Hybrid', 'Waterfall', 'Structured') OR delivery_methodology IS NULL);

-- Stage model constraint
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS chk_projects_stage_model;

ALTER TABLE projects
ADD CONSTRAINT chk_projects_stage_model
CHECK (stage_model IN ('fixed', 'flexible') OR stage_model IS NULL);

-- Stage gate enforcement constraint
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS chk_projects_stage_gate_enforcement;

ALTER TABLE projects
ADD CONSTRAINT chk_projects_stage_gate_enforcement
CHECK (stage_gate_enforcement IN ('required', 'advisory') OR stage_gate_enforcement IS NULL);

-- Risk rating constraint
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS chk_projects_initial_risk_rating;

ALTER TABLE projects
ADD CONSTRAINT chk_projects_initial_risk_rating
CHECK (initial_risk_rating IN ('low', 'medium', 'high') OR initial_risk_rating IS NULL);

-- Complexity rating constraint
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS chk_projects_complexity_rating;

ALTER TABLE projects
ADD CONSTRAINT chk_projects_complexity_rating
CHECK (complexity_rating IN ('low', 'medium', 'high') OR complexity_rating IS NULL);

-- Delivery complexity constraint
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS chk_projects_delivery_complexity;

ALTER TABLE projects
ADD CONSTRAINT chk_projects_delivery_complexity
CHECK (delivery_complexity IN ('single_vendor', 'multi_vendor') OR delivery_complexity IS NULL);

-- Data sensitivity constraint
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS chk_projects_data_sensitivity;

ALTER TABLE projects
ADD CONSTRAINT chk_projects_data_sensitivity
CHECK (data_sensitivity IN ('public', 'internal', 'confidential') OR data_sensitivity IS NULL);

-- Budget type constraint
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS chk_projects_budget_type;

ALTER TABLE projects
ADD CONSTRAINT chk_projects_budget_type
CHECK (budget_type IN ('capex', 'opex', 'mixed') OR budget_type IS NULL);

-- Document status constraints
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS chk_projects_mandate_status;

ALTER TABLE projects
ADD CONSTRAINT chk_projects_mandate_status
CHECK (mandate_status IN ('draft', 'approved', 'missing') OR mandate_status IS NULL);

ALTER TABLE projects
DROP CONSTRAINT IF EXISTS chk_projects_business_case_status;

ALTER TABLE projects
ADD CONSTRAINT chk_projects_business_case_status
CHECK (business_case_status IN ('draft', 'approved', 'missing') OR business_case_status IS NULL);

ALTER TABLE projects
DROP CONSTRAINT IF EXISTS chk_projects_budget_approval_status;

ALTER TABLE projects
ADD CONSTRAINT chk_projects_budget_approval_status
CHECK (budget_approval_status IN ('pending', 'approved', 'rejected') OR budget_approval_status IS NULL);

ALTER TABLE projects
DROP CONSTRAINT IF EXISTS chk_projects_funding_approval_status;

ALTER TABLE projects
ADD CONSTRAINT chk_projects_funding_approval_status
CHECK (funding_approval_status IN ('pending', 'approved', 'rejected') OR funding_approval_status IS NULL);

-- Estimated effort constraint
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS chk_projects_estimated_effort;

ALTER TABLE projects
ADD CONSTRAINT chk_projects_estimated_effort
CHECK (estimated_effort IN ('small', 'medium', 'large') OR estimated_effort IS NULL);

-- Tolerance constraints
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS chk_projects_tolerance_time_days;

ALTER TABLE projects
ADD CONSTRAINT chk_projects_tolerance_time_days
CHECK (tolerance_time_days IS NULL OR tolerance_time_days >= 0);

ALTER TABLE projects
DROP CONSTRAINT IF EXISTS chk_projects_tolerance_cost_percentage;

ALTER TABLE projects
ADD CONSTRAINT chk_projects_tolerance_cost_percentage
CHECK (tolerance_cost_percentage IS NULL OR (tolerance_cost_percentage >= 0 AND tolerance_cost_percentage <= 100));

-- ================================================
-- UPDATE TABLE REGISTRATION
-- ================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('projects', 'Main project records with comprehensive governance fields for PMO authorisation', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_governance_columns_count INTEGER;
    v_board_members_table_exists BOOLEAN;
    v_constraints_count INTEGER;
BEGIN
    -- Count new governance columns
    SELECT COUNT(*) INTO v_governance_columns_count
    FROM information_schema.columns
    WHERE table_name = 'projects'
      AND column_name IN (
          'executive_user_id', 'board_required', 'funding_authority_user_id',
          'approving_authority_user_id', 'business_objective', 'strategic_alignment',
          'expected_benefits_summary', 'benefit_owner_user_id', 'delivery_methodology',
          'lifecycle_template', 'stage_model', 'stage_gate_enforcement',
          'tolerance_time_days', 'tolerance_cost_percentage', 'tolerance_scope_description',
          'budget_type', 'funding_source', 'budget_approval_status',
          'initial_risk_rating', 'complexity_rating', 'delivery_complexity',
          'regulatory_impact', 'data_sensitivity', 'mandate_status',
          'business_case_status', 'rfp_reference', 'funding_approval_status',
          'document_repository_url', 'estimated_effort', 'key_skills_required',
          'external_vendors_required'
      );

    -- Check if project_board_members table exists
    SELECT EXISTS(
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'project_board_members'
    ) INTO v_board_members_table_exists;

    -- Count check constraints
    SELECT COUNT(*) INTO v_constraints_count
    FROM information_schema.table_constraints
    WHERE table_name = 'projects'
      AND constraint_type = 'CHECK'
      AND constraint_name LIKE 'chk_projects_%';

    -- Verification results
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Phase 2: Project Governance Fields Migration';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Governance columns added: % of 31 expected', v_governance_columns_count;
    RAISE NOTICE 'project_board_members table exists: %', v_board_members_table_exists;
    RAISE NOTICE 'Check constraints created: %', v_constraints_count;
    RAISE NOTICE '================================================';

    RAISE NOTICE 'SECTION A - Governance & Authority: 4 columns + board_members table';
    RAISE NOTICE 'SECTION B - Business Justification: 4 columns';
    RAISE NOTICE 'SECTION C - Lifecycle & Controls: 7 columns';
    RAISE NOTICE 'SECTION D - Financial Controls: 3 columns';
    RAISE NOTICE 'SECTION E - Risk & Complexity: 5 columns';
    RAISE NOTICE 'SECTION F - Document Governance: 5 columns';
    RAISE NOTICE 'SECTION G - Resource & Capacity: 3 columns';
    RAISE NOTICE '================================================';

    IF v_governance_columns_count < 31 THEN
        RAISE WARNING 'Expected 31 governance columns, found %', v_governance_columns_count;
    END IF;

    IF NOT v_board_members_table_exists THEN
        RAISE EXCEPTION 'project_board_members table was not created';
    END IF;

    RAISE NOTICE 'v153_project_governance_fields.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================

-- Next Steps:
-- 1. Create frontend components for each governance section
-- 2. Update ProjectsCreate.jsx to include all sections
-- 3. Update formData state to capture all new fields
-- 4. Proceed to Phase 3: Readiness validation

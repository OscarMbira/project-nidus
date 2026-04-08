-- ============================================================================
-- Business Case Tables - Database Schema
-- Version: v260
-- Description: Complete database schema for Business Case functionality
-- Date: 2026-02-23
-- ============================================================================
--
-- Purpose:
-- Creates comprehensive database schema for Business Case documents.
-- The Business Case justifies the project investment throughout the lifecycle.
-- It is created during Initiation and updated at each stage boundary.
--
-- Prerequisites:
-- - Core tables must exist (projects, programmes, users)
-- - trigger_set_created_fields() and trigger_update_audit_fields() must exist
-- - database_tables registry table must exist
--
-- Key Design Decisions:
-- - project_id is NULLABLE: business cases can exist before project creation
-- - programme_id is NULLABLE: for programme-level business cases
-- - Reference auto-generated: BC-YYYY-NNN format
-- - Options stored separately for easy comparison
-- - Benefits and dis-benefits stored separately for clarity
--
-- ============================================================================
-- SECTION 1: DROP EXISTING TABLES (safe re-run)
-- ============================================================================

DROP TABLE IF EXISTS business_case_distribution CASCADE;
DROP TABLE IF EXISTS business_case_approvals CASCADE;
DROP TABLE IF EXISTS business_case_revisions CASCADE;
DROP TABLE IF EXISTS business_case_dis_benefits CASCADE;
DROP TABLE IF EXISTS business_case_benefits CASCADE;
DROP TABLE IF EXISTS business_case_options CASCADE;
DROP TABLE IF EXISTS business_cases CASCADE;

-- ============================================================================
-- SECTION 2: MAIN TABLE - business_cases
-- ============================================================================

CREATE TABLE business_cases (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships (NULLABLE — can exist pre-project)
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL,

    -- Document Identification
    case_reference VARCHAR(50) UNIQUE NOT NULL,              -- e.g., BC-2026-001
    case_title VARCHAR(300) NOT NULL,

    -- Document Status
    document_status VARCHAR(50) DEFAULT 'draft'
        CHECK (document_status IN ('draft', 'submitted', 'approved', 'rejected', 'superseded', 'archived')),
    version_number VARCHAR(20) DEFAULT '1.0',

    -- Dates
    created_date DATE DEFAULT CURRENT_DATE,
    project_created_date TIMESTAMPTZ,                        -- When linked to project

    -- Section 1: Executive Summary
    executive_summary TEXT,
    strategic_alignment TEXT,                                -- How it aligns to organisational strategy

    -- Section 2: Reasons
    reasons_for_project TEXT,                                -- Why the project is needed
    problem_statement TEXT,                                  -- Problem being solved

    -- Section 3: Business Options (summary — detailed options in business_case_options table)
    recommended_option VARCHAR(100)                          -- 'do_nothing' | 'do_minimum' | 'do_something'
        CHECK (recommended_option IN ('do_nothing', 'do_minimum', 'do_something', 'other')),
    option_justification TEXT,                               -- Why this option was recommended

    -- Section 6: Timescale
    timescale_description TEXT,
    start_date DATE,
    end_date DATE,
    key_milestones TEXT,

    -- Section 7: Costs
    estimated_development_cost NUMERIC(15, 2),
    estimated_ongoing_cost NUMERIC(15, 2),
    total_investment_cost NUMERIC(15, 2) GENERATED ALWAYS AS
        (COALESCE(estimated_development_cost, 0) + COALESCE(estimated_ongoing_cost, 0)) STORED,
    funding_source TEXT,
    cost_assumptions TEXT,

    -- Section 8: Investment Appraisal
    npv NUMERIC(15, 2),                                      -- Net Present Value
    roi_percentage NUMERIC(8, 4),                            -- Return on Investment %
    payback_period_months INTEGER,                           -- Months to payback
    discount_rate NUMERIC(5, 4),                             -- Discount rate used for NPV
    investment_appraisal_notes TEXT,

    -- Section 9: Major Risks
    major_risks TEXT,                                        -- Summary of key risks
    overall_risk_rating VARCHAR(20)
        CHECK (overall_risk_rating IN ('low', 'medium', 'high', 'critical')),

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_business_cases_project_id ON business_cases(project_id)
    WHERE is_deleted = false AND project_id IS NOT NULL;
CREATE INDEX idx_business_cases_programme_id ON business_cases(programme_id)
    WHERE is_deleted = false AND programme_id IS NOT NULL;
CREATE INDEX idx_business_cases_document_status ON business_cases(document_status)
    WHERE is_deleted = false;
CREATE INDEX idx_business_cases_created_by ON business_cases(created_by)
    WHERE is_deleted = false;
CREATE INDEX idx_business_cases_created_date ON business_cases(created_date)
    WHERE is_deleted = false;
CREATE UNIQUE INDEX idx_business_cases_case_reference ON business_cases(case_reference)
    WHERE is_deleted = false;

-- Triggers
DROP TRIGGER IF EXISTS trg_business_cases_before_insert ON business_cases;
CREATE TRIGGER trg_business_cases_before_insert
    BEFORE INSERT ON business_cases
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_business_cases_before_update ON business_cases;
CREATE TRIGGER trg_business_cases_before_update
    BEFORE UPDATE ON business_cases
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE business_cases IS 'Business Case documents justifying project investment throughout the lifecycle';
COMMENT ON COLUMN business_cases.case_reference IS 'Unique reference: BC-YYYY-NNN (auto-generated)';
COMMENT ON COLUMN business_cases.document_status IS 'Status: draft, submitted, approved, rejected, superseded, archived';
COMMENT ON COLUMN business_cases.project_id IS 'NULLABLE: Business case can exist before project creation';
COMMENT ON COLUMN business_cases.recommended_option IS 'Selected option: do_nothing, do_minimum, do_something, other';
COMMENT ON COLUMN business_cases.total_investment_cost IS 'Auto-calculated: development + ongoing costs';

-- Register
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('business_cases', 'Business Case documents justifying project investment throughout the lifecycle', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 3: AUTO-GENERATE REFERENCE TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_business_case_reference()
RETURNS VARCHAR AS $$
DECLARE
    v_year VARCHAR(4);
    v_counter INTEGER;
    v_reference VARCHAR(50);
BEGIN
    v_year := TO_CHAR(NOW(), 'YYYY');

    SELECT COALESCE(MAX(
        CAST(SUBSTRING(case_reference FROM '[0-9]+$') AS INTEGER)
    ), 0) + 1
    INTO v_counter
    FROM business_cases
    WHERE case_reference LIKE 'BC-' || v_year || '-%'
      AND is_deleted = false;

    v_reference := 'BC-' || v_year || '-' || LPAD(v_counter::TEXT, 3, '0');
    RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_business_case_reference() IS 'Generates unique business case reference (e.g., BC-2026-001)';

-- Trigger: Auto-generate case_reference on INSERT
CREATE OR REPLACE FUNCTION trg_business_cases_generate_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.case_reference IS NULL OR NEW.case_reference = '' THEN
        NEW.case_reference := generate_business_case_reference();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_business_cases_generate_reference ON business_cases;
CREATE TRIGGER trg_business_cases_generate_reference
    BEFORE INSERT ON business_cases
    FOR EACH ROW EXECUTE FUNCTION trg_business_cases_generate_reference();

-- ============================================================================
-- SECTION 4: business_case_options (Options Comparison)
-- ============================================================================

CREATE TABLE business_case_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_case_id UUID NOT NULL REFERENCES business_cases(id) ON DELETE CASCADE,

    option_number INTEGER NOT NULL CHECK (option_number IN (1, 2, 3, 4, 5)),
    option_type VARCHAR(50) NOT NULL
        CHECK (option_type IN ('do_nothing', 'do_minimum', 'do_something', 'alternative')),
    option_title VARCHAR(200) NOT NULL,
    description TEXT,

    -- Financial comparison
    estimated_cost NUMERIC(15, 2),
    estimated_benefits TEXT,

    -- Qualitative comparison
    advantages TEXT,
    disadvantages TEXT,
    risks_summary TEXT,

    -- Recommendation
    is_recommended BOOLEAN DEFAULT false,

    display_order INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_business_case_options_case_id ON business_case_options(business_case_id)
    WHERE is_deleted = false;
CREATE INDEX idx_business_case_options_is_recommended ON business_case_options(business_case_id, is_recommended)
    WHERE is_deleted = false;

DROP TRIGGER IF EXISTS trg_business_case_options_before_insert ON business_case_options;
CREATE TRIGGER trg_business_case_options_before_insert
    BEFORE INSERT ON business_case_options
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_business_case_options_before_update ON business_case_options;
CREATE TRIGGER trg_business_case_options_before_update
    BEFORE UPDATE ON business_case_options
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

COMMENT ON TABLE business_case_options IS 'Business options considered in the business case (do nothing / do minimum / do something)';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('business_case_options', 'Business options compared in the business case (do nothing, do minimum, do something)', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ============================================================================
-- SECTION 5: business_case_benefits (Expected Benefits)
-- ============================================================================

CREATE TABLE business_case_benefits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_case_id UUID NOT NULL REFERENCES business_cases(id) ON DELETE CASCADE,

    benefit_description TEXT NOT NULL,
    benefit_type VARCHAR(50) DEFAULT 'financial'
        CHECK (benefit_type IN ('financial', 'non_financial', 'strategic', 'operational', 'reputational')),
    measurement_method TEXT,
    target_value VARCHAR(200),                               -- e.g., "20% cost reduction", "$500K savings"
    target_date DATE,
    benefit_owner VARCHAR(200),
    realization_timing VARCHAR(100),                         -- e.g., "During project", "6 months post-completion"

    display_order INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_business_case_benefits_case_id ON business_case_benefits(business_case_id)
    WHERE is_deleted = false;
CREATE INDEX idx_business_case_benefits_type ON business_case_benefits(benefit_type)
    WHERE is_deleted = false;

DROP TRIGGER IF EXISTS trg_business_case_benefits_before_insert ON business_case_benefits;
CREATE TRIGGER trg_business_case_benefits_before_insert
    BEFORE INSERT ON business_case_benefits
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_business_case_benefits_before_update ON business_case_benefits;
CREATE TRIGGER trg_business_case_benefits_before_update
    BEFORE UPDATE ON business_case_benefits
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

COMMENT ON TABLE business_case_benefits IS 'Expected benefits of the project as documented in the business case';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('business_case_benefits', 'Expected measurable benefits from the project as documented in the business case', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ============================================================================
-- SECTION 6: business_case_dis_benefits (Dis-benefits)
-- ============================================================================

CREATE TABLE business_case_dis_benefits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_case_id UUID NOT NULL REFERENCES business_cases(id) ON DELETE CASCADE,

    dis_benefit_description TEXT NOT NULL,
    impact_description TEXT,                                 -- Who/what is impacted
    severity VARCHAR(20) DEFAULT 'medium'
        CHECK (severity IN ('low', 'medium', 'high')),
    mitigation TEXT,                                         -- How the dis-benefit is managed
    affected_stakeholders TEXT,

    display_order INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_business_case_dis_benefits_case_id ON business_case_dis_benefits(business_case_id)
    WHERE is_deleted = false;

DROP TRIGGER IF EXISTS trg_business_case_dis_benefits_before_insert ON business_case_dis_benefits;
CREATE TRIGGER trg_business_case_dis_benefits_before_insert
    BEFORE INSERT ON business_case_dis_benefits
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_business_case_dis_benefits_before_update ON business_case_dis_benefits;
CREATE TRIGGER trg_business_case_dis_benefits_before_update
    BEFORE UPDATE ON business_case_dis_benefits
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

COMMENT ON TABLE business_case_dis_benefits IS 'Negative consequences (dis-benefits) arising from the project';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('business_case_dis_benefits', 'Negative consequences (dis-benefits) arising from the project as documented in the business case', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ============================================================================
-- SECTION 7: business_case_revisions (Version History)
-- ============================================================================

CREATE TABLE business_case_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_case_id UUID NOT NULL REFERENCES business_cases(id) ON DELETE CASCADE,

    version_number VARCHAR(20) NOT NULL,
    revision_date DATE NOT NULL DEFAULT CURRENT_DATE,
    summary_of_changes TEXT NOT NULL,
    document_status VARCHAR(50),
    revised_by UUID REFERENCES users(id) ON DELETE SET NULL,
    revised_by_name VARCHAR(200),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_business_case_revisions_case_id ON business_case_revisions(business_case_id);
CREATE INDEX idx_business_case_revisions_revision_date ON business_case_revisions(revision_date);

COMMENT ON TABLE business_case_revisions IS 'Version history for business case documents';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('business_case_revisions', 'Version history for business case documents', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ============================================================================
-- SECTION 8: business_case_approvals (Approval Workflow)
-- ============================================================================

CREATE TABLE business_case_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_case_id UUID NOT NULL REFERENCES business_cases(id) ON DELETE CASCADE,

    approver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    approver_name VARCHAR(200),
    approver_title VARCHAR(200),

    approval_status VARCHAR(50) DEFAULT 'pending'
        CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approval_date DATE,
    comments TEXT,
    version_reviewed VARCHAR(20),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_business_case_approvals_case_id ON business_case_approvals(business_case_id);
CREATE INDEX idx_business_case_approvals_status ON business_case_approvals(approval_status);
CREATE INDEX idx_business_case_approvals_approver_id ON business_case_approvals(approver_id);

DROP TRIGGER IF EXISTS trg_business_case_approvals_before_insert ON business_case_approvals;
CREATE TRIGGER trg_business_case_approvals_before_insert
    BEFORE INSERT ON business_case_approvals
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_business_case_approvals_before_update ON business_case_approvals;
CREATE TRIGGER trg_business_case_approvals_before_update
    BEFORE UPDATE ON business_case_approvals
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

COMMENT ON TABLE business_case_approvals IS 'Approval workflow records for business case documents';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('business_case_approvals', 'Approval workflow records for business case documents', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ============================================================================
-- SECTION 9: business_case_distribution (Distribution List)
-- ============================================================================

CREATE TABLE business_case_distribution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_case_id UUID NOT NULL REFERENCES business_cases(id) ON DELETE CASCADE,

    recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_name VARCHAR(200) NOT NULL,
    recipient_title VARCHAR(200),
    date_of_issue DATE DEFAULT CURRENT_DATE,
    version_distributed VARCHAR(20),
    distribution_status VARCHAR(50) DEFAULT 'sent'
        CHECK (distribution_status IN ('sent', 'read', 'acknowledged')),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_business_case_distribution_case_id ON business_case_distribution(business_case_id);
CREATE INDEX idx_business_case_distribution_recipient_id ON business_case_distribution(recipient_id);

COMMENT ON TABLE business_case_distribution IS 'Distribution list for business case documents';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('business_case_distribution', 'Distribution list for business case documents', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ============================================================================
-- SECTION 10: DATABASE FUNCTIONS
-- ============================================================================

-- Function: can_edit_business_case
CREATE OR REPLACE FUNCTION can_edit_business_case(p_case_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_status VARCHAR(50);
BEGIN
    SELECT document_status INTO v_status
    FROM business_cases
    WHERE id = p_case_id AND is_deleted = false;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Only draft and rejected cases can be edited
    RETURN v_status IN ('draft', 'rejected');
END;
$$;

COMMENT ON FUNCTION can_edit_business_case(UUID) IS 'Returns true if the business case can be edited (draft or rejected status only)';

-- ============================================================================
-- SECTION 11: VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_tables_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_tables_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
          'business_cases',
          'business_case_options',
          'business_case_benefits',
          'business_case_dis_benefits',
          'business_case_revisions',
          'business_case_approvals',
          'business_case_distribution'
      );

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Business Case Tables Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Tables verified: % / 7', v_tables_count;
    RAISE NOTICE 'v260_business_case_tables.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ============================================================================
-- END OF FILE
-- ============================================================================

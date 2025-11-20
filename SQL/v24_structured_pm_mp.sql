-- ================================================
-- File: v24_structured_pm_mp.sql
-- Description: Structured PM Managing Product Delivery (MP) module tables
-- Version: 1.0
-- Date: 2025-01-XX
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v23 must be run first (all core tables must exist)
-- - projects table must exist
-- - work_packages table must exist (from v23_structured_pm_cs.sql)
-- - users table must exist

-- Purpose:
-- Creates tables for Structured PM Managing Product Delivery module:
-- 1. product_deliverables - Product definitions and delivery tracking
-- 2. quality_criteria - Quality criteria for products
-- 3. acceptance_records - Product acceptance records
-- 4. product_handover - Product handover documentation

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- TABLE 1: product_deliverables
-- Description: Product definitions and delivery tracking
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS product_deliverables (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    work_package_id UUID REFERENCES work_packages(id) ON DELETE SET NULL,
    stage_boundary_id UUID REFERENCES stage_boundaries(id) ON DELETE SET NULL,

    -- Product Information
    product_name VARCHAR(200) NOT NULL,
    product_description TEXT,
    product_code VARCHAR(50),  -- Unique code for the product
    product_type VARCHAR(50) DEFAULT 'deliverable',  -- 'deliverable', 'output', 'outcome', 'benefit'
    
    -- Product Details
    product_specification TEXT,  -- Detailed specification
    acceptance_criteria TEXT,  -- Acceptance criteria
    quality_standards TEXT,  -- Quality standards to meet
    
    -- Status
    status VARCHAR(50) DEFAULT 'not_started',  -- 'not_started', 'in_progress', 'completed', 'accepted', 'rejected', 'handed_over'
    
    -- Dates
    planned_completion_date DATE,
    actual_completion_date DATE,
    acceptance_date DATE,
    handover_date DATE,
    
    -- Assignment
    assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- Team Manager/Lead responsible
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Quality
    quality_status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'in_review', 'approved', 'rejected'
    quality_review_date DATE,
    quality_reviewer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    quality_notes TEXT,
    
    -- Acceptance
    accepted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    acceptance_notes TEXT,
    
    -- Version Control
    version_number VARCHAR(20) DEFAULT '1.0',
    is_latest_version BOOLEAN DEFAULT TRUE,
    previous_version_id UUID REFERENCES product_deliverables(id) ON DELETE SET NULL,
    
    -- Notes
    notes TEXT,
    handover_notes TEXT,

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
CREATE INDEX IF NOT EXISTS idx_product_deliverables_project_id ON product_deliverables(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_product_deliverables_work_package_id ON product_deliverables(work_package_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_product_deliverables_stage_boundary_id ON product_deliverables(stage_boundary_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_product_deliverables_status ON product_deliverables(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_product_deliverables_code ON product_deliverables(product_code) WHERE is_deleted = FALSE AND product_code IS NOT NULL;

-- Unique constraint for product code per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_deliverables_code_unique 
ON product_deliverables(project_id, product_code) 
WHERE is_deleted = FALSE AND product_code IS NOT NULL;

-- Triggers
DROP TRIGGER IF EXISTS trg_product_deliverables_before_insert ON product_deliverables;
CREATE TRIGGER trg_product_deliverables_before_insert
    BEFORE INSERT ON product_deliverables
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_product_deliverables_before_update ON product_deliverables;
CREATE TRIGGER trg_product_deliverables_before_update
    BEFORE UPDATE ON product_deliverables
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE product_deliverables IS 'Product definitions and delivery tracking for Structured PM';
COMMENT ON COLUMN product_deliverables.status IS 'Status: not_started, in_progress, completed, accepted, rejected, handed_over';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('product_deliverables', 'Product definitions and delivery tracking for Structured PM', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 2: quality_criteria
-- Description: Quality criteria for products
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS quality_criteria (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    product_deliverable_id UUID NOT NULL REFERENCES product_deliverables(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Criteria Information
    criteria_name VARCHAR(200) NOT NULL,
    criteria_description TEXT,
    criteria_type VARCHAR(50) DEFAULT 'functional',  -- 'functional', 'non_functional', 'performance', 'security', 'usability', 'other'
    
    -- Standards
    quality_standard VARCHAR(100),  -- e.g., 'ISO 9001', 'Company Standard', etc.
    measurement_method TEXT,  -- How to measure/verify
    acceptance_threshold TEXT,  -- Threshold for acceptance
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'in_review', 'passed', 'failed', 'waived'
    reviewed_date DATE,
    reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    review_notes TEXT,
    
    -- Evidence
    evidence_attachments TEXT[],  -- Array of attachment URLs/paths
    evidence_notes TEXT,

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
CREATE INDEX IF NOT EXISTS idx_quality_criteria_product_id ON quality_criteria(product_deliverable_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_quality_criteria_project_id ON quality_criteria(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_quality_criteria_status ON quality_criteria(status) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_quality_criteria_before_insert ON quality_criteria;
CREATE TRIGGER trg_quality_criteria_before_insert
    BEFORE INSERT ON quality_criteria
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_quality_criteria_before_update ON quality_criteria;
CREATE TRIGGER trg_quality_criteria_before_update
    BEFORE UPDATE ON quality_criteria
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE quality_criteria IS 'Quality criteria for products in Structured PM';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('quality_criteria', 'Quality criteria for products in Structured PM', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 3: acceptance_records
-- Description: Product acceptance records
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS acceptance_records (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    product_deliverable_id UUID NOT NULL REFERENCES product_deliverables(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    accepted_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Acceptance Information
    acceptance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    acceptance_status VARCHAR(50) DEFAULT 'accepted',  -- 'accepted', 'conditionally_accepted', 'rejected'
    acceptance_notes TEXT,
    conditions TEXT,  -- Conditions if conditionally accepted
    
    -- Quality Review
    quality_review_completed BOOLEAN DEFAULT FALSE,
    all_quality_criteria_met BOOLEAN DEFAULT FALSE,
    quality_review_notes TEXT,
    
    -- Sign-off
    sign_off_date DATE,
    sign_off_document_url TEXT,  -- URL to signed document
    
    -- Rejection
    rejection_reason TEXT,
    rejection_date DATE,

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
CREATE INDEX IF NOT EXISTS idx_acceptance_records_product_id ON acceptance_records(product_deliverable_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_acceptance_records_project_id ON acceptance_records(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_acceptance_records_accepted_by ON acceptance_records(accepted_by_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_acceptance_records_status ON acceptance_records(acceptance_status) WHERE is_deleted = FALSE;

-- Unique constraint: one acceptance record per product (latest)
CREATE UNIQUE INDEX IF NOT EXISTS idx_acceptance_records_unique 
ON acceptance_records(product_deliverable_id) 
WHERE is_deleted = FALSE AND acceptance_status = 'accepted';

-- Triggers
DROP TRIGGER IF EXISTS trg_acceptance_records_before_insert ON acceptance_records;
CREATE TRIGGER trg_acceptance_records_before_insert
    BEFORE INSERT ON acceptance_records
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_acceptance_records_before_update ON acceptance_records;
CREATE TRIGGER trg_acceptance_records_before_update
    BEFORE UPDATE ON acceptance_records
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE acceptance_records IS 'Product acceptance records for Structured PM';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('acceptance_records', 'Product acceptance records for Structured PM', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 4: product_handover
-- Description: Product handover documentation
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS product_handover (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    product_deliverable_id UUID NOT NULL REFERENCES product_deliverables(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    handed_over_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    received_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Handover Information
    handover_date DATE NOT NULL DEFAULT CURRENT_DATE,
    handover_type VARCHAR(50) DEFAULT 'formal',  -- 'formal', 'informal', 'partial', 'complete'
    handover_status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'in_progress', 'completed', 'acknowledged'
    
    -- Documentation
    handover_documentation TEXT,  -- Handover documentation/notes
    handover_checklist JSONB,  -- Checklist items (array of {item, status, notes})
    supporting_documents TEXT[],  -- Array of document URLs/paths
    
    -- Acceptance
    received_acknowledgment BOOLEAN DEFAULT FALSE,
    acknowledgment_date DATE,
    acknowledgment_notes TEXT,
    
    -- Training/Support
    training_provided BOOLEAN DEFAULT FALSE,
    training_notes TEXT,
    support_requirements TEXT,
    support_duration_days INTEGER,
    
    -- Notes
    handover_notes TEXT,
    post_handover_notes TEXT,

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
CREATE INDEX IF NOT EXISTS idx_product_handover_product_id ON product_handover(product_deliverable_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_product_handover_project_id ON product_handover(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_product_handover_handed_over_by ON product_handover(handed_over_by_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_product_handover_received_by ON product_handover(received_by_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_product_handover_status ON product_handover(handover_status) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_product_handover_before_insert ON product_handover;
CREATE TRIGGER trg_product_handover_before_insert
    BEFORE INSERT ON product_handover
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_product_handover_before_update ON product_handover;
CREATE TRIGGER trg_product_handover_before_update
    BEFORE UPDATE ON product_handover
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE product_handover IS 'Product handover documentation for Structured PM';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('product_handover', 'Product handover documentation for Structured PM', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_tables_count INTEGER;
BEGIN
    -- Count Managing Product Delivery tables
    SELECT COUNT(*)
    INTO v_tables_count
    FROM database_tables
    WHERE table_category = 'structured'
      AND table_name IN (
          'product_deliverables',
          'quality_criteria',
          'acceptance_records',
          'product_handover'
      )
      AND is_deleted = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Managing Product Delivery Tables Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'MP Tables Created: %', v_tables_count;
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v24_structured_pm_mp.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================


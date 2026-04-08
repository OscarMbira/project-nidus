-- ============================================================================
-- Product Status Account Implementation - Product Status Register
-- Version: v211
-- Description: Creates comprehensive Product Status Account structure for tracking product status, progress, and history
-- Date: 2026-01-20
-- ============================================================================
--
-- Purpose:
-- Implements the Product Status Account module based on structured project management methodology.
-- A Product Status Account is an operational register/log that tracks the current status, progress,
-- and status history of products/deliverables throughout the project lifecycle. It provides a
-- comprehensive "account" (summary) of where each product stands, including status transitions,
-- progress indicators, planned vs. actual dates, quality status, acceptance status, and any issues
-- or blockers.
--
-- Strategy:
-- 1. Create product_status_accounts main table (multiple per project, one per product per report date)
-- 2. Create 7 supporting tables:
--    - psa_status_history (status change history)
--    - psa_progress_snapshots (progress history)
--    - psa_linked_issues (linked issues/blockers)
--    - psa_quality_checks (quality check history)
--    - psa_acceptance_checks (acceptance check history)
--    - psa_milestones (product milestones)
--    - psa_dependencies (product dependencies)
-- 3. Create functions for reference generation, creation from related items, status summary
-- 4. Set up triggers for auto-generation, status synchronization, and audit
-- 5. Link to existing tables (product_deliverables, product_descriptions, work_packages, etc.)
-- 6. Set up RLS policies (in separate file v212)
--
-- Prerequisites:
-- - v01 through v07 must be run first (core tables and trigger functions)
-- - v24_structured_pm_mp.sql must be run (product_deliverables table)
-- - v207_product_description_tables.sql must be run (product_descriptions table)
-- - v177_project_product_description_tables.sql must be run (ppd_composition_items table)
-- - v194_configuration_item_record_tables.sql must be run (configuration_items table - optional)
-- - projects table must exist
-- - users table must exist
-- - work_packages table must exist
-- - issues table must exist
-- - change_requests table must exist
--
-- Relationship Design:
-- - Multiple Product Status Accounts per project (one per product/deliverable per report date)
-- - One Product Status Account per product_deliverable per report date (UNIQUE constraint)
-- - Links to Product Descriptions, Product Deliverables, Work Packages, Configuration Items
--
-- ============================================================================
-- SECTION 1: CREATE ENUM TYPES
-- ============================================================================

-- Product Type Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'psa_product_type_enum') THEN
        CREATE TYPE psa_product_type_enum AS ENUM ('deliverable', 'output', 'outcome', 'benefit', 'document', 'software', 'hardware', 'service', 'other');
    END IF;
END $$;

-- Current Status Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'psa_status_enum') THEN
        CREATE TYPE psa_status_enum AS ENUM ('not_started', 'planned', 'in_progress', 'under_review', 'quality_check', 'completed', 'accepted', 'rejected', 'handed_over', 'on_hold', 'cancelled');
    END IF;
END $$;

-- Progress Indicator Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'psa_progress_indicator_enum') THEN
        CREATE TYPE psa_progress_indicator_enum AS ENUM ('on_track', 'at_risk', 'delayed', 'ahead_of_schedule');
    END IF;
END $$;

-- Quality Status Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'psa_quality_status_enum') THEN
        CREATE TYPE psa_quality_status_enum AS ENUM ('not_applicable', 'pending', 'in_review', 'passed', 'failed', 'conditional', 'waived');
    END IF;
END $$;

-- Acceptance Status Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'psa_acceptance_status_enum') THEN
        CREATE TYPE psa_acceptance_status_enum AS ENUM ('not_applicable', 'pending', 'accepted', 'rejected', 'conditionally_accepted', 'deferred');
    END IF;
END $$;

-- Handover Status Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'psa_handover_status_enum') THEN
        CREATE TYPE psa_handover_status_enum AS ENUM ('not_applicable', 'pending', 'handed_over', 'not_required');
    END IF;
END $$;

-- Version Status Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'psa_version_status_enum') THEN
        CREATE TYPE psa_version_status_enum AS ENUM ('draft', 'baseline', 'superseded', 'current');
    END IF;
END $$;

-- Issue Type Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'psa_issue_type_enum') THEN
        CREATE TYPE psa_issue_type_enum AS ENUM ('issue', 'blocker', 'risk', 'change_request');
    END IF;
END $$;

-- Quality Check Type Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'psa_quality_check_type_enum') THEN
        CREATE TYPE psa_quality_check_type_enum AS ENUM ('review', 'inspection', 'testing', 'approval', 'audit');
    END IF;
END $$;

-- Milestone Type Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'psa_milestone_type_enum') THEN
        CREATE TYPE psa_milestone_type_enum AS ENUM ('start', 'progress', 'quality_gate', 'acceptance_gate', 'completion', 'handover');
    END IF;
END $$;

-- Milestone Status Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'psa_milestone_status_enum') THEN
        CREATE TYPE psa_milestone_status_enum AS ENUM ('upcoming', 'in_progress', 'achieved', 'missed', 'cancelled');
    END IF;
END $$;

-- Dependency Type Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'psa_dependency_type_enum') THEN
        CREATE TYPE psa_dependency_type_enum AS ENUM ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish');
    END IF;
END $$;

-- Dependency Status Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'psa_dependency_status_enum') THEN
        CREATE TYPE psa_dependency_status_enum AS ENUM ('satisfied', 'pending', 'blocked');
    END IF;
END $$;

-- ============================================================================
-- SECTION 2: MAIN TABLE - product_status_accounts
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_status_accounts (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship (Multiple accounts per project, one per product per report date)
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Document Identification
    psa_reference VARCHAR(100) UNIQUE NOT NULL, -- e.g., PSA-2026-001
    report_date DATE NOT NULL, -- Date of this status account

    -- Product Links
    product_description_id UUID REFERENCES product_descriptions(id) ON DELETE SET NULL, -- Links to Product Description (v207)
    product_deliverable_id UUID REFERENCES product_deliverables(id) ON DELETE SET NULL, -- Links to Product Deliverable
    ppd_composition_item_id UUID REFERENCES ppd_composition_items(id) ON DELETE SET NULL, -- Links to PPD composition item
    configuration_item_id UUID REFERENCES configuration_items(id) ON DELETE SET NULL, -- Links to Configuration Item Record (v194)
    work_package_id UUID REFERENCES work_packages(id) ON DELETE SET NULL, -- Links to Work Package

    -- Product Identification
    product_reference VARCHAR(100), -- Product reference/code
    product_name VARCHAR(200) NOT NULL, -- Product name
    product_type psa_product_type_enum DEFAULT 'deliverable',
    product_category VARCHAR(100), -- Product category

    -- Current Status
    current_status psa_status_enum DEFAULT 'not_started',
    status_date DATE, -- Date status was set
    status_set_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Who set the status
    status_notes TEXT, -- Notes about current status

    -- Progress Tracking
    progress_percentage DECIMAL(5,2) DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    progress_indicator psa_progress_indicator_enum DEFAULT 'on_track',
    last_progress_update DATE, -- Last time progress was updated
    progress_notes TEXT, -- Progress notes

    -- Schedule Tracking
    planned_start_date DATE,
    actual_start_date DATE,
    planned_completion_date DATE,
    forecast_completion_date DATE,
    actual_completion_date DATE,
    schedule_variance_days INTEGER, -- Schedule variance in days

    -- Quality Status
    quality_status psa_quality_status_enum DEFAULT 'not_applicable',
    quality_review_date DATE,
    quality_reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    quality_notes TEXT,

    -- Acceptance Status
    acceptance_status psa_acceptance_status_enum DEFAULT 'not_applicable',
    acceptance_date DATE,
    accepted_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    acceptance_notes TEXT,

    -- Handover Status
    handover_status psa_handover_status_enum DEFAULT 'not_applicable',
    handover_date DATE,
    handed_over_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
    handover_notes TEXT,

    -- Issues & Blockers
    has_issues BOOLEAN DEFAULT false,
    issue_count INTEGER DEFAULT 0,
    has_blockers BOOLEAN DEFAULT false,
    blocker_count INTEGER DEFAULT 0,
    issue_summary TEXT, -- Summary of issues/blockers

    -- Assigned Resources
    assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Product owner/team manager
    team_name VARCHAR(200), -- Assigned team
    work_package_assigned BOOLEAN DEFAULT false,

    -- Version Information
    current_version VARCHAR(50), -- Current product version
    baseline_version VARCHAR(50), -- Baseline version
    version_status psa_version_status_enum DEFAULT 'draft',

    -- Status Account Summary
    status_summary TEXT, -- Overall status summary
    key_achievements TEXT, -- Key achievements since last report
    next_milestones TEXT, -- Next milestones
    risks_and_issues TEXT, -- Risks and issues summary
    actions_required TEXT, -- Actions required

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_psa_project_id ON product_status_accounts(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_psa_product_deliverable_id ON product_status_accounts(product_deliverable_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_psa_product_description_id ON product_status_accounts(product_description_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_psa_current_status ON product_status_accounts(current_status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_psa_report_date ON product_status_accounts(report_date) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_psa_progress_indicator ON product_status_accounts(progress_indicator) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_psa_work_package_id ON product_status_accounts(work_package_id) WHERE is_deleted = false;

-- Unique constraint: One status account per product deliverable per report date
CREATE UNIQUE INDEX IF NOT EXISTS idx_psa_deliverable_report_date_unique 
ON product_status_accounts(product_deliverable_id, report_date) 
WHERE is_deleted = false AND product_deliverable_id IS NOT NULL;

-- ============================================================================
-- SECTION 3: STATUS HISTORY TABLE - psa_status_history
-- ============================================================================

CREATE TABLE IF NOT EXISTS psa_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_status_account_id UUID NOT NULL REFERENCES product_status_accounts(id) ON DELETE CASCADE,
    previous_status VARCHAR(50), -- Previous status
    new_status VARCHAR(50) NOT NULL, -- New status
    status_change_date DATE NOT NULL, -- Date of change
    status_changed_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL, -- Who changed status
    status_change_reason TEXT, -- Reason for change
    change_request_id UUID REFERENCES change_requests(id) ON DELETE SET NULL, -- Related change request
    notes TEXT, -- Additional notes
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_psa_status_history_psa_id ON psa_status_history(product_status_account_id);
CREATE INDEX IF NOT EXISTS idx_psa_status_history_date ON psa_status_history(status_change_date);

-- ============================================================================
-- SECTION 4: PROGRESS SNAPSHOTS TABLE - psa_progress_snapshots
-- ============================================================================

CREATE TABLE IF NOT EXISTS psa_progress_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_status_account_id UUID NOT NULL REFERENCES product_status_accounts(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL, -- Date of progress snapshot
    progress_percentage DECIMAL(5,2) NOT NULL CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    progress_indicator VARCHAR(50), -- Progress indicator at snapshot
    planned_completion_date DATE, -- Planned date at snapshot
    forecast_completion_date DATE, -- Forecast date at snapshot
    schedule_variance_days INTEGER, -- Variance at snapshot
    progress_notes TEXT, -- Progress notes at snapshot
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_psa_progress_snapshots_psa_id ON psa_progress_snapshots(product_status_account_id);
CREATE INDEX IF NOT EXISTS idx_psa_progress_snapshots_date ON psa_progress_snapshots(product_status_account_id, snapshot_date);

-- ============================================================================
-- SECTION 5: LINKED ISSUES TABLE - psa_linked_issues
-- ============================================================================

CREATE TABLE IF NOT EXISTS psa_linked_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_status_account_id UUID NOT NULL REFERENCES product_status_accounts(id) ON DELETE CASCADE,
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE, -- Linked issue
    issue_type psa_issue_type_enum DEFAULT 'issue', -- Type of issue
    issue_summary VARCHAR(500), -- Brief summary
    linked_date DATE NOT NULL DEFAULT CURRENT_DATE, -- When linked
    resolved_date DATE, -- When resolved
    is_resolved BOOLEAN DEFAULT false, -- Is resolved
    impact_on_product TEXT, -- Impact on product
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_psa_linked_issues_psa_id ON psa_linked_issues(product_status_account_id);
CREATE INDEX IF NOT EXISTS idx_psa_linked_issues_issue_id ON psa_linked_issues(issue_id);
CREATE INDEX IF NOT EXISTS idx_psa_linked_issues_resolved ON psa_linked_issues(is_resolved) WHERE is_resolved = false;

-- ============================================================================
-- SECTION 6: QUALITY CHECKS TABLE - psa_quality_checks
-- ============================================================================

CREATE TABLE IF NOT EXISTS psa_quality_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_status_account_id UUID NOT NULL REFERENCES product_status_accounts(id) ON DELETE CASCADE,
    quality_check_date DATE NOT NULL, -- Date of quality check
    quality_check_type psa_quality_check_type_enum DEFAULT 'review', -- Type of check
    quality_status VARCHAR(50), -- Status of check
    checked_by_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Who checked
    quality_result TEXT, -- Result of check
    issues_found INTEGER DEFAULT 0, -- Issues found
    passed BOOLEAN, -- Passed check
    notes TEXT, -- Quality check notes
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_psa_quality_checks_psa_id ON psa_quality_checks(product_status_account_id);
CREATE INDEX IF NOT EXISTS idx_psa_quality_checks_date ON psa_quality_checks(quality_check_date);

-- ============================================================================
-- SECTION 7: ACCEPTANCE CHECKS TABLE - psa_acceptance_checks
-- ============================================================================

CREATE TABLE IF NOT EXISTS psa_acceptance_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_status_account_id UUID NOT NULL REFERENCES product_status_accounts(id) ON DELETE CASCADE,
    acceptance_check_date DATE NOT NULL, -- Date of acceptance check
    acceptance_criterion_id UUID REFERENCES pd_acceptance_criteria(id) ON DELETE SET NULL, -- Related acceptance criterion
    acceptance_status VARCHAR(50), -- Status of check
    checked_by_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Who checked
    acceptance_result TEXT, -- Result of check
    passed BOOLEAN, -- Passed check
    notes TEXT, -- Acceptance check notes
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_psa_acceptance_checks_psa_id ON psa_acceptance_checks(product_status_account_id);
CREATE INDEX IF NOT EXISTS idx_psa_acceptance_checks_criterion_id ON psa_acceptance_checks(acceptance_criterion_id);
CREATE INDEX IF NOT EXISTS idx_psa_acceptance_checks_date ON psa_acceptance_checks(acceptance_check_date);

-- ============================================================================
-- SECTION 8: MILESTONES TABLE - psa_milestones
-- ============================================================================

CREATE TABLE IF NOT EXISTS psa_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_status_account_id UUID NOT NULL REFERENCES product_status_accounts(id) ON DELETE CASCADE,
    milestone_name VARCHAR(200) NOT NULL, -- Milestone name
    milestone_description TEXT, -- Milestone description
    milestone_type psa_milestone_type_enum DEFAULT 'progress', -- Type of milestone
    planned_date DATE NOT NULL, -- Planned milestone date
    forecast_date DATE, -- Forecast milestone date
    actual_date DATE, -- Actual milestone date
    milestone_status psa_milestone_status_enum DEFAULT 'upcoming', -- Milestone status
    achievement_notes TEXT, -- Notes when achieved
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_psa_milestones_psa_id ON psa_milestones(product_status_account_id);
CREATE INDEX IF NOT EXISTS idx_psa_milestones_status ON psa_milestones(milestone_status);
CREATE INDEX IF NOT EXISTS idx_psa_milestones_planned_date ON psa_milestones(planned_date);

-- ============================================================================
-- SECTION 9: DEPENDENCIES TABLE - psa_dependencies
-- ============================================================================

CREATE TABLE IF NOT EXISTS psa_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_status_account_id UUID NOT NULL REFERENCES product_status_accounts(id) ON DELETE CASCADE,
    dependent_product_status_account_id UUID REFERENCES product_status_accounts(id) ON DELETE SET NULL, -- Dependent product
    dependent_product_deliverable_id UUID REFERENCES product_deliverables(id) ON DELETE SET NULL, -- Dependent product deliverable
    dependency_type psa_dependency_type_enum DEFAULT 'finish_to_start', -- Dependency type
    dependency_description TEXT, -- Description of dependency
    is_critical BOOLEAN DEFAULT false, -- Critical dependency
    dependency_status psa_dependency_status_enum DEFAULT 'pending', -- Status of dependency
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_psa_dependencies_psa_id ON psa_dependencies(product_status_account_id);
CREATE INDEX IF NOT EXISTS idx_psa_dependencies_dependent_psa_id ON psa_dependencies(dependent_product_status_account_id);
CREATE INDEX IF NOT EXISTS idx_psa_dependencies_dependent_deliverable_id ON psa_dependencies(dependent_product_deliverable_id);
CREATE INDEX IF NOT EXISTS idx_psa_dependencies_status ON psa_dependencies(dependency_status);

-- ============================================================================
-- SECTION 10: TRIGGERS
-- ============================================================================

-- Trigger: Auto-generate psa_reference on INSERT
CREATE OR REPLACE FUNCTION trigger_generate_psa_reference()
RETURNS TRIGGER AS $$
DECLARE
    v_year INTEGER;
    v_next_num INTEGER;
    v_reference VARCHAR;
BEGIN
    IF NEW.psa_reference IS NULL OR NEW.psa_reference = '' THEN
        v_year := EXTRACT(YEAR FROM CURRENT_DATE);
        
        -- Get next number for this year
        SELECT COALESCE(MAX(CAST(SUBSTRING(psa_reference FROM 'PSA-\d{4}-(\d+)') AS INTEGER)), 0) + 1
        INTO v_next_num
        FROM product_status_accounts
        WHERE psa_reference LIKE 'PSA-' || v_year || '-%';
        
        NEW.psa_reference := 'PSA-' || v_year || '-' || LPAD(v_next_num::TEXT, 3, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_status_accounts_before_insert ON product_status_accounts;
CREATE TRIGGER trg_product_status_accounts_before_insert
    BEFORE INSERT ON product_status_accounts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_psa_reference();

-- Trigger: Record status changes in history
CREATE OR REPLACE FUNCTION record_psa_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only record if status actually changed
    IF OLD.current_status IS DISTINCT FROM NEW.current_status THEN
        INSERT INTO psa_status_history (
            product_status_account_id,
            previous_status,
            new_status,
            status_change_date,
            status_changed_by,
            status_change_reason,
            notes
        ) VALUES (
            NEW.id,
            OLD.current_status::TEXT,
            NEW.current_status::TEXT,
            COALESCE(NEW.status_date, CURRENT_DATE),
            NEW.status_set_by,
            NEW.status_notes,
            NEW.status_notes
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_status_accounts_status_change ON product_status_accounts;
CREATE TRIGGER trg_product_status_accounts_status_change
    AFTER UPDATE OF current_status ON product_status_accounts
    FOR EACH ROW
    WHEN (OLD.current_status IS DISTINCT FROM NEW.current_status)
    EXECUTE FUNCTION record_psa_status_change();

-- Trigger: Update updated_at
DROP TRIGGER IF EXISTS trg_product_status_accounts_before_update ON product_status_accounts;
CREATE TRIGGER trg_product_status_accounts_before_update
    BEFORE UPDATE ON product_status_accounts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_audit_fields();

-- Trigger: Set created fields
DROP TRIGGER IF EXISTS trg_product_status_accounts_before_insert_audit ON product_status_accounts;
CREATE TRIGGER trg_product_status_accounts_before_insert_audit
    BEFORE INSERT ON product_status_accounts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_created_fields();

-- Trigger: Auto-update Product Status Account when product deliverable status changes
CREATE OR REPLACE FUNCTION trg_product_deliverable_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_psa_id UUID;
BEGIN
    -- Only trigger if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.product_deliverable_id IS NOT NULL THEN
        -- Get or create PSA for today's report date
        SELECT id INTO v_psa_id
        FROM product_status_accounts
        WHERE product_deliverable_id = NEW.id
          AND report_date = CURRENT_DATE
          AND is_deleted = false
        LIMIT 1;
        
        IF v_psa_id IS NULL THEN
            -- Create new PSA
            SELECT create_psa_for_product_deliverable(NEW.id, CURRENT_DATE, NEW.updated_by) INTO v_psa_id;
        ELSE
            -- Update existing PSA
            UPDATE product_status_accounts
            SET
                current_status = NEW.status::TEXT::psa_status_enum,
                status_date = CURRENT_DATE,
                status_set_by = NEW.updated_by,
                updated_by = NEW.updated_by,
                updated_at = NOW()
            WHERE id = v_psa_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger should be added to product_deliverables table
-- DROP TRIGGER IF EXISTS trg_product_deliverable_status_change ON product_deliverables;
-- CREATE TRIGGER trg_product_deliverable_status_change
--     AFTER UPDATE OF status ON product_deliverables
--     FOR EACH ROW
--     WHEN (OLD.status IS DISTINCT FROM NEW.status)
--     EXECUTE FUNCTION trg_product_deliverable_status_change();

-- ============================================================================
-- SECTION 11: DATABASE FUNCTIONS
-- ============================================================================

-- Function: Generate PSA Reference
CREATE OR REPLACE FUNCTION generate_psa_reference()
RETURNS VARCHAR AS $$
DECLARE
    v_year INTEGER;
    v_next_num INTEGER;
    v_reference VARCHAR;
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Get next number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(psa_reference FROM 'PSA-\d{4}-(\d+)') AS INTEGER)), 0) + 1
    INTO v_next_num
    FROM product_status_accounts
    WHERE psa_reference LIKE 'PSA-' || v_year || '-%';
    
    v_reference := 'PSA-' || v_year || '-' || LPAD(v_next_num::TEXT, 3, '0');
    
    RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

-- Function: Create PSA for Product Deliverable
CREATE OR REPLACE FUNCTION create_psa_for_product_deliverable(
    p_product_deliverable_id UUID,
    p_user_id UUID,
    p_report_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID AS $$
DECLARE
    v_psa_id UUID;
    v_deliverable RECORD;
BEGIN
    -- Get product deliverable
    SELECT * INTO v_deliverable
    FROM product_deliverables
    WHERE id = p_product_deliverable_id
      AND is_deleted = false;
    
    IF v_deliverable IS NULL THEN
        RAISE EXCEPTION 'Product deliverable not found';
    END IF;
    
    -- Check if PSA already exists for this deliverable and report date
    SELECT id INTO v_psa_id
    FROM product_status_accounts
    WHERE product_deliverable_id = p_product_deliverable_id
      AND report_date = p_report_date
      AND is_deleted = false;
    
    IF v_psa_id IS NOT NULL THEN
        RETURN v_psa_id;
    END IF;
    
    -- Create Product Status Account
    INSERT INTO product_status_accounts (
        project_id,
        report_date,
        product_deliverable_id,
        product_name,
        product_reference,
        product_type,
        current_status,
        status_date,
        status_set_by,
        planned_start_date,
        planned_completion_date,
        actual_completion_date,
        quality_status,
        quality_review_date,
        acceptance_status,
        acceptance_date,
        handover_status,
        handover_date,
        assigned_to_id,
        work_package_id,
        work_package_assigned,
        created_by,
        updated_by
    ) VALUES (
        v_deliverable.project_id,
        p_report_date,
        p_product_deliverable_id,
        v_deliverable.product_name,
        v_deliverable.product_code,
        v_deliverable.product_type::TEXT::psa_product_type_enum,
        v_deliverable.status::TEXT::psa_status_enum,
        CURRENT_DATE,
        p_user_id,
        NULL, -- Can be set from work package
        v_deliverable.planned_completion_date,
        v_deliverable.actual_completion_date,
        v_deliverable.quality_status::TEXT::psa_quality_status_enum,
        v_deliverable.quality_review_date,
        CASE 
            WHEN v_deliverable.acceptance_date IS NOT NULL THEN 'accepted'::psa_acceptance_status_enum
            ELSE 'pending'::psa_acceptance_status_enum
        END,
        v_deliverable.acceptance_date,
        CASE 
            WHEN v_deliverable.handover_date IS NOT NULL THEN 'handed_over'::psa_handover_status_enum
            ELSE 'pending'::psa_handover_status_enum
        END,
        v_deliverable.handover_date,
        v_deliverable.assigned_to_user_id,
        v_deliverable.work_package_id,
        (v_deliverable.work_package_id IS NOT NULL),
        p_user_id,
        p_user_id
    ) RETURNING id INTO v_psa_id;
    
    RETURN v_psa_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Create PSA for Product Description
CREATE OR REPLACE FUNCTION create_psa_for_product_description(
    p_product_description_id UUID,
    p_user_id UUID,
    p_report_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID AS $$
DECLARE
    v_psa_id UUID;
    v_pd RECORD;
BEGIN
    -- Get product description
    SELECT * INTO v_pd
    FROM product_descriptions
    WHERE id = p_product_description_id
      AND is_deleted = false;
    
    IF v_pd IS NULL THEN
        RAISE EXCEPTION 'Product description not found';
    END IF;
    
    -- Check if PSA already exists for this PD and report date
    SELECT id INTO v_psa_id
    FROM product_status_accounts
    WHERE product_description_id = p_product_description_id
      AND report_date = p_report_date
      AND is_deleted = false;
    
    IF v_psa_id IS NOT NULL THEN
        RETURN v_psa_id;
    END IF;
    
    -- Create Product Status Account
    INSERT INTO product_status_accounts (
        project_id,
        report_date,
        product_description_id,
        product_name,
        product_reference,
        current_status,
        status_date,
        status_set_by,
        created_by,
        updated_by
    ) VALUES (
        v_pd.project_id,
        p_report_date,
        p_product_description_id,
        v_pd.product_title,
        v_pd.pd_reference,
        'not_started'::psa_status_enum,
        CURRENT_DATE,
        p_user_id,
        p_user_id,
        p_user_id
    ) RETURNING id INTO v_psa_id;
    
    RETURN v_psa_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Update PSA from Product Deliverable
CREATE OR REPLACE FUNCTION update_psa_from_product_deliverable(
    p_product_deliverable_id UUID,
    p_report_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID AS $$
DECLARE
    v_psa_id UUID;
    v_deliverable RECORD;
BEGIN
    -- Get product deliverable
    SELECT * INTO v_deliverable
    FROM product_deliverables
    WHERE id = p_product_deliverable_id
      AND is_deleted = false;
    
    IF v_deliverable IS NULL THEN
        RAISE EXCEPTION 'Product deliverable not found';
    END IF;
    
    -- Get or create PSA
    SELECT id INTO v_psa_id
    FROM product_status_accounts
    WHERE product_deliverable_id = p_product_deliverable_id
      AND report_date = p_report_date
      AND is_deleted = false;
    
    IF v_psa_id IS NULL THEN
        -- Create new PSA
        SELECT create_psa_for_product_deliverable(p_product_deliverable_id, v_deliverable.updated_by, p_report_date) INTO v_psa_id;
    ELSE
        -- Update existing PSA
        UPDATE product_status_accounts
        SET
            current_status = v_deliverable.status::TEXT::psa_status_enum,
            status_date = CURRENT_DATE,
            planned_completion_date = v_deliverable.planned_completion_date,
            actual_completion_date = v_deliverable.actual_completion_date,
            quality_status = v_deliverable.quality_status::TEXT::psa_quality_status_enum,
            quality_review_date = v_deliverable.quality_review_date,
            acceptance_status = CASE 
                WHEN v_deliverable.acceptance_date IS NOT NULL THEN 'accepted'::psa_acceptance_status_enum
                ELSE 'pending'::psa_acceptance_status_enum
            END,
            acceptance_date = v_deliverable.acceptance_date,
            handover_status = CASE 
                WHEN v_deliverable.handover_date IS NOT NULL THEN 'handed_over'::psa_handover_status_enum
                ELSE 'pending'::psa_handover_status_enum
            END,
            handover_date = v_deliverable.handover_date,
            updated_by = v_deliverable.updated_by,
            updated_at = NOW()
        WHERE id = v_psa_id;
    END IF;
    
    RETURN v_psa_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Get PSA by Product Deliverable
CREATE OR REPLACE FUNCTION get_psa_by_product_deliverable(
    p_product_deliverable_id UUID,
    p_report_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID AS $$
DECLARE
    v_psa_id UUID;
BEGIN
    SELECT id INTO v_psa_id
    FROM product_status_accounts
    WHERE product_deliverable_id = p_product_deliverable_id
      AND report_date = p_report_date
      AND is_deleted = false
    ORDER BY created_at DESC
    LIMIT 1;
    
    RETURN v_psa_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Get PSA Status Summary
CREATE OR REPLACE FUNCTION get_psa_status_summary(
    p_project_id UUID,
    p_report_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_products INTEGER,
    not_started INTEGER,
    in_progress INTEGER,
    completed INTEGER,
    accepted INTEGER,
    on_hold INTEGER,
    at_risk INTEGER,
    delayed INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_products,
        COUNT(*) FILTER (WHERE current_status = 'not_started')::INTEGER as not_started,
        COUNT(*) FILTER (WHERE current_status = 'in_progress')::INTEGER as in_progress,
        COUNT(*) FILTER (WHERE current_status = 'completed')::INTEGER as completed,
        COUNT(*) FILTER (WHERE current_status = 'accepted')::INTEGER as accepted,
        COUNT(*) FILTER (WHERE current_status = 'on_hold')::INTEGER as on_hold,
        COUNT(*) FILTER (WHERE progress_indicator = 'at_risk')::INTEGER as at_risk,
        COUNT(*) FILTER (WHERE progress_indicator = 'delayed')::INTEGER as delayed
    FROM product_status_accounts
    WHERE project_id = p_project_id
      AND report_date = p_report_date
      AND is_deleted = false;
END;
$$ LANGUAGE plpgsql;

-- Function: Get PSA Trend
CREATE OR REPLACE FUNCTION get_psa_trend(
    p_product_status_account_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    snapshot_date DATE,
    progress_percentage DECIMAL,
    progress_indicator VARCHAR,
    schedule_variance_days INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ps.snapshot_date,
        ps.progress_percentage,
        ps.progress_indicator,
        ps.schedule_variance_days
    FROM psa_progress_snapshots ps
    WHERE ps.product_status_account_id = p_product_status_account_id
      AND ps.snapshot_date BETWEEN p_start_date AND p_end_date
    ORDER BY ps.snapshot_date ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 12: COMMENTS
-- ============================================================================

COMMENT ON TABLE product_status_accounts IS 'Product Status Account - operational register tracking product status, progress, and history';
COMMENT ON TABLE psa_status_history IS 'Status change history for Product Status Accounts';
COMMENT ON TABLE psa_progress_snapshots IS 'Progress history snapshots for trend analysis';
COMMENT ON TABLE psa_linked_issues IS 'Linked issues, blockers, risks, and change requests';
COMMENT ON TABLE psa_quality_checks IS 'Quality check history';
COMMENT ON TABLE psa_acceptance_checks IS 'Acceptance check history';
COMMENT ON TABLE psa_milestones IS 'Product milestones tracking';
COMMENT ON TABLE psa_dependencies IS 'Product dependencies';

-- ============================================================================
-- SECTION 13: REGISTER TABLES
-- ============================================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES 
    ('product_status_accounts', 'Product Status Account - operational register for product status tracking', false, true, 'product_management'),
    ('psa_status_history', 'Status change history for Product Status Accounts', false, true, 'product_management'),
    ('psa_progress_snapshots', 'Progress history snapshots for Product Status Accounts', false, true, 'product_management'),
    ('psa_linked_issues', 'Linked issues, blockers, risks for Product Status Accounts', false, true, 'product_management'),
    ('psa_quality_checks', 'Quality check history for Product Status Accounts', false, true, 'product_management'),
    ('psa_acceptance_checks', 'Acceptance check history for Product Status Accounts', false, true, 'product_management'),
    ('psa_milestones', 'Product milestones for Product Status Accounts', false, true, 'product_management'),
    ('psa_dependencies', 'Product dependencies for Product Status Accounts', false, true, 'product_management')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- COMPLETION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Product Status Account tables and functions created';
END $$;

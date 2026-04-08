-- ============================================================================
-- Work Package Enhancement
-- Version: v216
-- Description: Enhance work_packages table and create supporting tables
-- Date: 2026-01-20
-- ============================================================================
--
-- Purpose:
-- Enhances the existing work_packages table with additional fields and creates
-- 9 supporting tables for detailed work package management.
--
-- Prerequisites:
-- - v23_structured_pm_cs.sql must be run first (work_packages table exists)
-- - All core tables must exist
--
-- ============================================================================
-- SECTION 1: ENHANCE work_packages TABLE
-- ============================================================================

DO $$
BEGIN
    -- Add wp_reference (UNIQUE)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'work_packages' AND column_name = 'wp_reference') THEN
        ALTER TABLE work_packages
        ADD COLUMN wp_reference VARCHAR(50);
        
        CREATE UNIQUE INDEX IF NOT EXISTS idx_work_packages_wp_reference 
        ON work_packages(wp_reference) 
        WHERE wp_reference IS NOT NULL AND is_deleted = false;
    END IF;

    -- Add version_number, release, document_ref
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'work_packages' AND column_name = 'version_number') THEN
        ALTER TABLE work_packages ADD COLUMN version_number VARCHAR(50) DEFAULT '1.0';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'work_packages' AND column_name = 'release') THEN
        ALTER TABLE work_packages ADD COLUMN release VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'work_packages' AND column_name = 'document_ref') THEN
        ALTER TABLE work_packages ADD COLUMN document_ref VARCHAR(200);
    END IF;

    -- Add assignment fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'work_packages' AND column_name = 'assigned_to_name') THEN
        ALTER TABLE work_packages ADD COLUMN assigned_to_name VARCHAR(200);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'work_packages' AND column_name = 'team_name') THEN
        ALTER TABLE work_packages ADD COLUMN team_name VARCHAR(200);
    END IF;

    -- Add work definition fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'work_packages' AND column_name = 'work_description') THEN
        ALTER TABLE work_packages ADD COLUMN work_description TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'work_packages' AND column_name = 'scope') THEN
        ALTER TABLE work_packages ADD COLUMN scope TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'work_packages' AND column_name = 'assumptions') THEN
        ALTER TABLE work_packages ADD COLUMN assumptions TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'work_packages' AND column_name = 'constraints') THEN
        ALTER TABLE work_packages ADD COLUMN constraints TEXT;
    END IF;

    -- Add expected_outcomes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'work_packages' AND column_name = 'expected_outcomes') THEN
        ALTER TABLE work_packages ADD COLUMN expected_outcomes TEXT;
    END IF;

    -- Add quality fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'work_packages' AND column_name = 'quality_methods') THEN
        ALTER TABLE work_packages ADD COLUMN quality_methods TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'work_packages' AND column_name = 'quality_responsibilities') THEN
        ALTER TABLE work_packages ADD COLUMN quality_responsibilities TEXT;
    END IF;

    -- Add forecast dates
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'work_packages' AND column_name = 'forecast_start_date') THEN
        ALTER TABLE work_packages ADD COLUMN forecast_start_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'work_packages' AND column_name = 'forecast_end_date') THEN
        ALTER TABLE work_packages ADD COLUMN forecast_end_date DATE;
    END IF;

    -- Add effort fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'work_packages' AND column_name = 'effort_estimate') THEN
        ALTER TABLE work_packages ADD COLUMN effort_estimate DECIMAL(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'work_packages' AND column_name = 'effort_actual') THEN
        ALTER TABLE work_packages ADD COLUMN effort_actual DECIMAL(10,2);
    END IF;

    -- Add resources and skills
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'work_packages' AND column_name = 'resources_required') THEN
        ALTER TABLE work_packages ADD COLUMN resources_required TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'work_packages' AND column_name = 'skills_required') THEN
        ALTER TABLE work_packages ADD COLUMN skills_required TEXT;
    END IF;

    -- Add reporting fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'work_packages' AND column_name = 'reporting_arrangements') THEN
        ALTER TABLE work_packages ADD COLUMN reporting_arrangements TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'work_packages' AND column_name = 'checkpoint_frequency') THEN
        ALTER TABLE work_packages ADD COLUMN checkpoint_frequency VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'work_packages' AND column_name = 'report_format') THEN
        ALTER TABLE work_packages ADD COLUMN report_format VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'work_packages' AND column_name = 'report_recipients') THEN
        ALTER TABLE work_packages ADD COLUMN report_recipients TEXT;
    END IF;

    -- Add progress_indicator
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'work_packages' AND column_name = 'progress_indicator') THEN
        ALTER TABLE work_packages ADD COLUMN progress_indicator VARCHAR(50)
        CHECK (progress_indicator IN ('on_track', 'at_risk', 'delayed', 'ahead_of_schedule'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'work_packages' AND column_name = 'last_progress_update') THEN
        ALTER TABLE work_packages ADD COLUMN last_progress_update DATE;
    END IF;

    -- Add notes fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'work_packages' AND column_name = 'authorization_notes') THEN
        ALTER TABLE work_packages ADD COLUMN authorization_notes TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'work_packages' AND column_name = 'acceptance_notes') THEN
        ALTER TABLE work_packages ADD COLUMN acceptance_notes TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'work_packages' AND column_name = 'completion_notes') THEN
        ALTER TABLE work_packages ADD COLUMN completion_notes TEXT;
    END IF;

    -- Ensure work_description is NOT NULL (update existing NULLs first)
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'work_packages' AND column_name = 'work_description'
               AND is_nullable = 'YES') THEN
        UPDATE work_packages SET work_description = work_package_description WHERE work_description IS NULL;
        ALTER TABLE work_packages ALTER COLUMN work_description SET NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- SECTION 2: CREATE ENUM TYPES
-- ============================================================================

-- Product type enum
DO $$ BEGIN
    CREATE TYPE wp_product_type_enum AS ENUM (
        'deliverable', 'document', 'software', 'hardware', 'service', 'report', 'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Quality criteria type enum
DO $$ BEGIN
    CREATE TYPE wp_quality_criteria_type_enum AS ENUM (
        'functional', 'performance', 'quality', 'usability', 'security', 'compliance', 'operational', 'maintenance', 'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Quality method enum
DO $$ BEGIN
    CREATE TYPE wp_quality_method_enum AS ENUM (
        'review', 'inspection', 'testing', 'approval', 'audit'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Quality status enum
DO $$ BEGIN
    CREATE TYPE wp_quality_status_enum AS ENUM (
        'pending', 'in_review', 'passed', 'failed', 'waived'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Acceptance criteria category enum
DO $$ BEGIN
    CREATE TYPE wp_acceptance_criteria_category_enum AS ENUM (
        'functional', 'performance', 'quality', 'usability', 'security', 'compliance', 'operational', 'maintenance', 'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Acceptance status enum
DO $$ BEGIN
    CREATE TYPE wp_acceptance_status_enum AS ENUM (
        'pending', 'passed', 'failed', 'waived', 'deferred'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Product delivery status enum
DO $$ BEGIN
    CREATE TYPE wp_product_delivery_status_enum AS ENUM (
        'not_started', 'in_progress', 'completed', 'delivered', 'accepted', 'rejected'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Resource type enum
DO $$ BEGIN
    CREATE TYPE wp_resource_type_enum AS ENUM (
        'person', 'equipment', 'facility', 'material', 'service', 'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Report type enum
DO $$ BEGIN
    CREATE TYPE wp_report_type_enum AS ENUM (
        'checkpoint_report', 'highlight_report', 'exception_report', 'ad_hoc', 'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Report format enum
DO $$ BEGIN
    CREATE TYPE wp_report_format_enum AS ENUM (
        'written', 'verbal', 'dashboard', 'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Acceptance type enum
DO $$ BEGIN
    CREATE TYPE wp_acceptance_type_enum AS ENUM (
        'authorization', 'acceptance', 'completion', 'closure'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Acceptance status enum (for acceptances table)
DO $$ BEGIN
    CREATE TYPE wp_acceptance_status_type_enum AS ENUM (
        'pending', 'accepted', 'rejected', 'conditional'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- SECTION 3: CREATE wp_products TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS wp_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_package_id UUID NOT NULL REFERENCES work_packages(id) ON DELETE CASCADE,
    product_number INTEGER NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    product_description TEXT,
    product_type wp_product_type_enum DEFAULT 'deliverable',
    linked_product_deliverable_id UUID REFERENCES product_deliverables(id) ON DELETE SET NULL,
    linked_product_description_id UUID REFERENCES product_descriptions(id) ON DELETE SET NULL,
    quality_criteria TEXT,
    acceptance_criteria TEXT,
    delivery_status wp_product_delivery_status_enum DEFAULT 'not_started',
    delivery_date DATE,
    acceptance_date DATE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(work_package_id, product_number)
);

CREATE INDEX IF NOT EXISTS idx_wp_products_work_package_id ON wp_products(work_package_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_wp_products_product_deliverable_id ON wp_products(linked_product_deliverable_id) WHERE linked_product_deliverable_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wp_products_product_description_id ON wp_products(linked_product_description_id) WHERE linked_product_description_id IS NOT NULL;

-- ============================================================================
-- SECTION 4: CREATE wp_quality_criteria TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS wp_quality_criteria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_package_id UUID NOT NULL REFERENCES work_packages(id) ON DELETE CASCADE,
    criteria_number INTEGER NOT NULL,
    criteria_reference VARCHAR(50),
    criteria_title VARCHAR(200) NOT NULL,
    criteria_description TEXT NOT NULL,
    criteria_type wp_quality_criteria_type_enum DEFAULT 'quality',
    quality_method wp_quality_method_enum,
    quality_responsible VARCHAR(200),
    quality_status wp_quality_status_enum DEFAULT 'pending',
    quality_date DATE,
    quality_result TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(work_package_id, criteria_reference)
);

CREATE INDEX IF NOT EXISTS idx_wp_quality_criteria_work_package_id ON wp_quality_criteria(work_package_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_wp_quality_criteria_status ON wp_quality_criteria(quality_status) WHERE is_deleted = false;

-- ============================================================================
-- SECTION 5: CREATE wp_acceptance_criteria TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS wp_acceptance_criteria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_package_id UUID NOT NULL REFERENCES work_packages(id) ON DELETE CASCADE,
    criteria_number INTEGER NOT NULL,
    criteria_reference VARCHAR(50),
    criteria_title VARCHAR(200) NOT NULL,
    criteria_description TEXT NOT NULL,
    criteria_category wp_acceptance_criteria_category_enum DEFAULT 'functional',
    acceptance_method TEXT,
    acceptance_responsible VARCHAR(200),
    acceptance_status wp_acceptance_status_enum DEFAULT 'pending',
    acceptance_date DATE,
    acceptance_result TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(work_package_id, criteria_reference)
);

CREATE INDEX IF NOT EXISTS idx_wp_acceptance_criteria_work_package_id ON wp_acceptance_criteria(work_package_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_wp_acceptance_criteria_status ON wp_acceptance_criteria(acceptance_status) WHERE is_deleted = false;

-- ============================================================================
-- SECTION 6: CREATE wp_resources TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS wp_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_package_id UUID NOT NULL REFERENCES work_packages(id) ON DELETE CASCADE,
    resource_type wp_resource_type_enum DEFAULT 'person',
    resource_name VARCHAR(200) NOT NULL,
    resource_description TEXT,
    quantity_required DECIMAL(10,2),
    unit_of_measure VARCHAR(50),
    cost_estimate DECIMAL(12,2),
    cost_actual DECIMAL(12,2),
    allocated BOOLEAN DEFAULT false,
    allocation_date DATE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_wp_resources_work_package_id ON wp_resources(work_package_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_wp_resources_type ON wp_resources(resource_type) WHERE is_deleted = false;

-- ============================================================================
-- SECTION 7: CREATE wp_reporting_arrangements TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS wp_reporting_arrangements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_package_id UUID NOT NULL REFERENCES work_packages(id) ON DELETE CASCADE,
    report_type wp_report_type_enum DEFAULT 'checkpoint_report',
    report_frequency VARCHAR(50),
    report_recipients TEXT,
    report_format wp_report_format_enum DEFAULT 'written',
    report_template VARCHAR(200),
    report_owner UUID REFERENCES users(id) ON DELETE SET NULL,
    report_description TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_wp_reporting_arrangements_work_package_id ON wp_reporting_arrangements(work_package_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_wp_reporting_arrangements_type ON wp_reporting_arrangements(report_type) WHERE is_deleted = false;

-- ============================================================================
-- SECTION 8: CREATE wp_status_history TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS wp_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_package_id UUID NOT NULL REFERENCES work_packages(id) ON DELETE CASCADE,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    status_change_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status_changed_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    status_change_reason TEXT,
    change_request_id UUID REFERENCES change_requests(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wp_status_history_work_package_id ON wp_status_history(work_package_id);
CREATE INDEX IF NOT EXISTS idx_wp_status_history_date ON wp_status_history(status_change_date);
CREATE INDEX IF NOT EXISTS idx_wp_status_history_changed_by ON wp_status_history(status_changed_by);

-- ============================================================================
-- SECTION 9: CREATE wp_progress_snapshots TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS wp_progress_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_package_id UUID NOT NULL REFERENCES work_packages(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    progress_indicator VARCHAR(50),
    effort_completed DECIMAL(10,2),
    cost_incurred DECIMAL(12,2),
    schedule_variance_days INTEGER,
    progress_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_wp_progress_snapshots_work_package_id ON wp_progress_snapshots(work_package_id);
CREATE INDEX IF NOT EXISTS idx_wp_progress_snapshots_date ON wp_progress_snapshots(snapshot_date);

-- ============================================================================
-- SECTION 10: CREATE wp_acceptances TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS wp_acceptances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_package_id UUID NOT NULL REFERENCES work_packages(id) ON DELETE CASCADE,
    acceptance_type wp_acceptance_type_enum NOT NULL,
    accepted_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    accepted_by_name VARCHAR(200),
    acceptance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    acceptance_status wp_acceptance_status_type_enum DEFAULT 'pending',
    acceptance_conditions TEXT,
    comments TEXT,
    signature_data TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wp_acceptances_work_package_id ON wp_acceptances(work_package_id);
CREATE INDEX IF NOT EXISTS idx_wp_acceptances_type ON wp_acceptances(acceptance_type);
CREATE INDEX IF NOT EXISTS idx_wp_acceptances_date ON wp_acceptances(acceptance_date);

-- ============================================================================
-- SECTION 11: CREATE DATABASE FUNCTIONS
-- ============================================================================

-- ============================================================================
-- SECTION 11.5: DROP EXISTING TRIGGERS (before recreating functions)
-- ============================================================================

-- Drop any existing triggers that might be using old function names
DROP TRIGGER IF EXISTS trg_work_packages_generate_reference ON work_packages;

-- ============================================================================
-- SECTION 11: DATABASE FUNCTIONS
-- ============================================================================

-- Generate Work Package Reference (standalone function for direct calls)
-- Note: This function is for programmatic use. Triggers use trigger_generate_wp_reference() instead.
-- Drop existing function if it exists (in case it was previously a trigger function)
-- Use CASCADE to drop any dependent triggers
DROP FUNCTION IF EXISTS generate_wp_reference() CASCADE;

CREATE OR REPLACE FUNCTION generate_wp_reference()
RETURNS VARCHAR AS $$
DECLARE
    v_year VARCHAR(4);
    v_sequence INTEGER;
    v_reference VARCHAR(50);
BEGIN
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(wp_reference FROM 'WP-' || v_year || '-(.+)') AS INTEGER)), 0) + 1
    INTO v_sequence
    FROM work_packages
    WHERE wp_reference LIKE 'WP-' || v_year || '-%'
      AND is_deleted = false;
    
    v_reference := 'WP-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0');
    
    RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_wp_reference() IS 'Generates unique Work Package reference (WP-YYYY-NNN) - for programmatic use only, not for triggers';

-- Generate Quality Criteria Reference
CREATE OR REPLACE FUNCTION generate_qc_reference(p_wp_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_sequence INTEGER;
    v_reference VARCHAR(50);
BEGIN
    -- Get next sequence number for this work package
    SELECT COALESCE(MAX(criteria_number), 0) + 1
    INTO v_sequence
    FROM wp_quality_criteria
    WHERE work_package_id = p_wp_id
      AND is_deleted = false;
    
    v_reference := 'QC-' || LPAD(v_sequence::TEXT, 3, '0');
    
    RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

-- Generate Acceptance Criteria Reference
CREATE OR REPLACE FUNCTION generate_ac_reference(p_wp_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_sequence INTEGER;
    v_reference VARCHAR(50);
BEGIN
    -- Get next sequence number for this work package
    SELECT COALESCE(MAX(criteria_number), 0) + 1
    INTO v_sequence
    FROM wp_acceptance_criteria
    WHERE work_package_id = p_wp_id
      AND is_deleted = false;
    
    v_reference := 'AC-' || LPAD(v_sequence::TEXT, 3, '0');
    
    RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 12: CREATE TRIGGERS
-- ============================================================================

-- Trigger function: Auto-generate wp_reference on INSERT
CREATE OR REPLACE FUNCTION trigger_generate_wp_reference()
RETURNS TRIGGER AS $$
DECLARE
    v_year VARCHAR(4);
    v_sequence INTEGER;
    v_reference VARCHAR(50);
BEGIN
    IF NEW.wp_reference IS NULL OR NEW.wp_reference = '' THEN
        v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
        
        -- Get next sequence number for this year
        SELECT COALESCE(MAX(CAST(SUBSTRING(wp_reference FROM 'WP-' || v_year || '-(.+)') AS INTEGER)), 0) + 1
        INTO v_sequence
        FROM work_packages
        WHERE wp_reference LIKE 'WP-' || v_year || '-%'
          AND is_deleted = false;
        
        v_reference := 'WP-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0');
        NEW.wp_reference := v_reference;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate wp_reference on INSERT
DROP TRIGGER IF EXISTS trg_work_packages_generate_reference ON work_packages;
CREATE TRIGGER trg_work_packages_generate_reference
    BEFORE INSERT ON work_packages
    FOR EACH ROW
    WHEN (NEW.wp_reference IS NULL OR NEW.wp_reference = '')
    EXECUTE FUNCTION trigger_generate_wp_reference();

-- Trigger function: Auto-generate quality criteria reference and number
CREATE OR REPLACE FUNCTION trigger_generate_qc_reference()
RETURNS TRIGGER AS $$
DECLARE
    v_sequence INTEGER;
    v_reference VARCHAR(50);
BEGIN
    IF NEW.criteria_number IS NULL OR NEW.criteria_number = 0 THEN
        -- Get next sequence number for this work package
        SELECT COALESCE(MAX(criteria_number), 0) + 1
        INTO v_sequence
        FROM wp_quality_criteria
        WHERE work_package_id = NEW.work_package_id
          AND is_deleted = false;
        
        NEW.criteria_number := v_sequence;
    ELSE
        v_sequence := NEW.criteria_number;
    END IF;
    
    IF NEW.criteria_reference IS NULL OR NEW.criteria_reference = '' THEN
        NEW.criteria_reference := 'QC-' || LPAD(v_sequence::TEXT, 3, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate quality criteria reference
DROP TRIGGER IF EXISTS trg_wp_quality_criteria_generate_reference ON wp_quality_criteria;
CREATE TRIGGER trg_wp_quality_criteria_generate_reference
    BEFORE INSERT ON wp_quality_criteria
    FOR EACH ROW
    WHEN (NEW.criteria_reference IS NULL OR NEW.criteria_reference = '')
    EXECUTE FUNCTION trigger_generate_qc_reference();

-- Trigger function: Auto-generate acceptance criteria reference
CREATE OR REPLACE FUNCTION trigger_generate_ac_reference()
RETURNS TRIGGER AS $$
DECLARE
    v_sequence INTEGER;
    v_reference VARCHAR(50);
BEGIN
    IF NEW.criteria_reference IS NULL OR NEW.criteria_reference = '' THEN
        -- Get next sequence number for this work package
        SELECT COALESCE(MAX(criteria_number), 0) + 1
        INTO v_sequence
        FROM wp_acceptance_criteria
        WHERE work_package_id = NEW.work_package_id
          AND is_deleted = false;
        
        v_reference := 'AC-' || LPAD(v_sequence::TEXT, 3, '0');
        NEW.criteria_reference := v_reference;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate acceptance criteria reference and number
DROP TRIGGER IF EXISTS trg_wp_acceptance_criteria_generate_reference ON wp_acceptance_criteria;
CREATE TRIGGER trg_wp_acceptance_criteria_generate_reference
    BEFORE INSERT ON wp_acceptance_criteria
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_ac_reference();

-- Record status changes in history
CREATE OR REPLACE FUNCTION record_wp_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO wp_status_history (
            work_package_id,
            previous_status,
            new_status,
            status_change_date,
            status_changed_by,
            notes
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            CURRENT_DATE,
            NEW.updated_by,
            CASE 
                WHEN NEW.status = 'authorized' THEN NEW.authorization_notes
                WHEN NEW.status = 'accepted' THEN NEW.acceptance_notes
                WHEN NEW.status = 'completed' THEN NEW.completion_notes
                ELSE NULL
            END
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_work_packages_status_history ON work_packages;
CREATE TRIGGER trg_work_packages_status_history
    AFTER UPDATE OF status ON work_packages
    FOR EACH ROW
    EXECUTE FUNCTION record_wp_status_change();

-- ============================================================================
-- SECTION 13: REGISTER TABLES
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'database_tables') THEN
        -- Register main table (already registered, but update if needed)
        INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
        VALUES ('work_packages', 'Work packages for Structured PM stage execution', false, true, 'structured')
        ON CONFLICT (table_name) DO UPDATE SET
            table_description = EXCLUDED.table_description,
            table_category = EXCLUDED.table_category,
            updated_at = NOW();

        -- Register supporting tables
        INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
        VALUES 
            ('wp_products', 'Work Package Products/Deliverables', false, true, 'structured'),
            ('wp_quality_criteria', 'Work Package Quality Criteria', false, true, 'structured'),
            ('wp_acceptance_criteria', 'Work Package Acceptance Criteria', false, true, 'structured'),
            ('wp_resources', 'Work Package Resources', false, true, 'structured'),
            ('wp_reporting_arrangements', 'Work Package Reporting Arrangements', false, true, 'structured'),
            ('wp_status_history', 'Work Package Status History', false, true, 'structured'),
            ('wp_progress_snapshots', 'Work Package Progress Snapshots', false, true, 'structured'),
            ('wp_acceptances', 'Work Package Acceptances', false, true, 'structured')
        ON CONFLICT (table_name) DO UPDATE SET
            table_description = EXCLUDED.table_description,
            table_category = EXCLUDED.table_category,
            updated_at = NOW();
    END IF;
END $$;

DO $$
BEGIN
    RAISE NOTICE 'v216_work_package_enhancement.sql completed successfully';
END $$;

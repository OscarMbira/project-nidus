-- ============================================================================
-- Project Mandate CRUD Implementation - Database Tables and Functions
-- Version: v160
-- Description: Complete database schema for Project Mandate CRUD operations
-- Date: 2025-01-28
-- ============================================================================
--
-- Purpose:
-- Creates comprehensive database schema for Project Mandate functionality.
-- Project Mandate is a PRE-PROJECT document that triggers project initiation.
-- Key design: project_id is NULLABLE - mandates can exist independently before projects.
--
-- Prerequisites:
-- - v01 through v06 must be run first (core tables and trigger functions)
-- - projects table must exist (v04_project_core_tables.sql)
-- - programmes table should exist (if programme management is enabled)
-- - users table must exist (v02_system_core_tables.sql)
--
-- Critical Design Decision:
-- - project_id is NULLABLE - mandates can exist BEFORE projects are created
-- - Once approved, mandate triggers project creation and gets linked
-- - UNIQUE constraint on project_id WHERE project_id IS NOT NULL (one mandate per project)
--
-- ============================================================================
-- SECTION 1: MAIN TABLE - project_mandates
-- ============================================================================

-- Drop existing table if it exists (to replace v07 version)
DROP TABLE IF EXISTS mandate_customers_users CASCADE;
DROP TABLE IF EXISTS mandate_dependencies CASCADE;
DROP TABLE IF EXISTS mandate_deliverables CASCADE;
DROP TABLE IF EXISTS mandate_associated_documents CASCADE;
DROP TABLE IF EXISTS mandate_document_history CASCADE;
DROP TABLE IF EXISTS mandate_approvals CASCADE;
DROP TABLE IF EXISTS mandate_reviewers CASCADE;
DROP TABLE IF EXISTS project_mandates CASCADE;

-- Create main project_mandates table
CREATE TABLE project_mandates (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship (NULLABLE - pre-project document)
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL, -- NULLABLE: Can exist before project
    
    -- Mandate Identification
    mandate_reference VARCHAR(50) UNIQUE NOT NULL, -- Unique reference (e.g., MAN-2026-001)
    mandate_title VARCHAR(200) NOT NULL, -- Short descriptive title
    
    -- Document Status
    document_status VARCHAR(50) DEFAULT 'draft' CHECK (document_status IN ('draft', 'submitted', 'approved', 'rejected', 'archived')),
    version_number VARCHAR(20) DEFAULT '1.0',
    
    -- Dates
    created_date DATE DEFAULT CURRENT_DATE,
    printed_date DATE,
    project_created_date TIMESTAMPTZ, -- When project was created from this mandate
    
    -- Section 1: Purpose
    purpose TEXT NOT NULL, -- Section 1: Document purpose and intent
    
    -- Section 2: Authority
    authority_responsible TEXT, -- Section 2: Who authorizes costs/resources
    
    -- Section 3: Background
    background TEXT NOT NULL, -- Section 3: Context and need for project
    
    -- Programme Linkage
    is_standalone BOOLEAN DEFAULT true, -- Standalone project or part of programme
    programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL, -- NULLABLE: If part of programme
    
    -- Section 4: Objectives
    project_objectives TEXT NOT NULL, -- Section 4: Measurable objectives
    
    -- Section 5: Scope
    scope TEXT, -- Section 5: Major deliverables (can be added progressively)
    scope_exclusions TEXT, -- What's NOT in scope (often unknown at start)
    
    -- Section 6: Constraints
    constraints TEXT, -- Section 6: Resource, time, location constraints
    
    -- Section 7: Interfaces
    interfaces TEXT, -- Section 7: Internal/external interfaces
    
    -- Section 8: Quality Expectations
    quality_expectations TEXT, -- Section 8: Time vs Cost vs Quality priorities
    quality_priority VARCHAR(20) DEFAULT 'balanced' CHECK (quality_priority IN ('time', 'cost', 'quality', 'balanced')),
    
    -- Section 9: Outline Business Case
    outline_business_case TEXT NOT NULL, -- Section 9: High-level business justification
    
    -- Section 11: Proposed Roles
    proposed_executive_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Section 11: Proposed Executive
    proposed_executive_name VARCHAR(200), -- For external executives or when ID not available
    proposed_pm_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Section 11: Proposed PM
    proposed_pm_name VARCHAR(200), -- For external PMs or when ID not available
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

-- UNIQUE constraint on project_id WHERE project_id IS NOT NULL (one mandate per project when linked)
CREATE UNIQUE INDEX idx_project_mandates_unique_project 
ON project_mandates(project_id) 
WHERE project_id IS NOT NULL AND is_deleted = FALSE;

-- UNIQUE constraint on mandate_reference for tracking unlinked mandates
CREATE UNIQUE INDEX idx_project_mandates_mandate_reference 
ON project_mandates(mandate_reference) 
WHERE is_deleted = FALSE;

-- CHECK constraint: If is_standalone = false, then programme_id must be NOT NULL
ALTER TABLE project_mandates ADD CONSTRAINT chk_mandate_programme 
CHECK (is_standalone = true OR programme_id IS NOT NULL);

-- Indexes for performance
CREATE INDEX idx_project_mandates_project_id ON project_mandates(project_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_project_mandates_document_status ON project_mandates(document_status) WHERE is_deleted = FALSE;
CREATE INDEX idx_project_mandates_created_by ON project_mandates(created_by) WHERE is_deleted = FALSE;
CREATE INDEX idx_project_mandates_created_date ON project_mandates(created_date) WHERE is_deleted = FALSE;
CREATE INDEX idx_project_mandates_programme_id ON project_mandates(programme_id) WHERE is_deleted = FALSE AND programme_id IS NOT NULL;

-- Triggers
DROP TRIGGER IF EXISTS trg_project_mandates_before_insert ON project_mandates;
CREATE TRIGGER trg_project_mandates_before_insert
    BEFORE INSERT ON project_mandates
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_project_mandates_before_update ON project_mandates;
CREATE TRIGGER trg_project_mandates_before_update
    BEFORE UPDATE ON project_mandates
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Trigger to auto-generate mandate_reference if not provided
CREATE OR REPLACE FUNCTION generate_mandate_reference_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_year INTEGER;
    v_seq INTEGER;
    v_ref VARCHAR(50);
BEGIN
    -- Only generate if not provided
    IF NEW.mandate_reference IS NULL OR NEW.mandate_reference = '' THEN
        v_year := EXTRACT(YEAR FROM CURRENT_DATE);
        
        -- Get next sequence number for this year
        SELECT COALESCE(MAX(CAST(SUBSTRING(mandate_reference FROM '\d+$') AS INTEGER)), 0) + 1
        INTO v_seq
        FROM project_mandates
        WHERE mandate_reference LIKE 'MAN-' || v_year || '-%'
          AND is_deleted = FALSE;
        
        -- Format: MAN-YYYY-XXX (3 digits with leading zeros)
        v_ref := 'MAN-' || v_year || '-' || LPAD(v_seq::TEXT, 3, '0');
        
        NEW.mandate_reference := v_ref;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_mandates_generate_reference ON project_mandates;
CREATE TRIGGER trg_project_mandates_generate_reference
    BEFORE INSERT ON project_mandates
    FOR EACH ROW EXECUTE FUNCTION generate_mandate_reference_trigger();

-- Comments
COMMENT ON TABLE project_mandates IS 'Project Mandate documents - PRE-PROJECT documents that trigger project initiation';
COMMENT ON COLUMN project_mandates.project_id IS 'NULLABLE: Mandates can exist independently before projects are created. Populated after approval triggers project creation.';
COMMENT ON COLUMN project_mandates.mandate_reference IS 'Unique mandate reference (e.g., MAN-2026-001) for tracking unlinked mandates';
COMMENT ON COLUMN project_mandates.document_status IS 'Status: draft, submitted, approved, rejected, archived';
COMMENT ON COLUMN project_mandates.project_created_date IS 'Timestamp when project was created from this approved mandate';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('project_mandates', 'Project Mandate documents - Pre-project documents that trigger project initiation', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 2: mandate_reviewers
-- ============================================================================

CREATE TABLE mandate_reviewers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mandate_id UUID NOT NULL REFERENCES project_mandates(id) ON DELETE CASCADE,
    reviewer_name VARCHAR(200) NOT NULL,
    reviewer_organisation VARCHAR(200),
    review_date DATE,
    review_status VARCHAR(50) DEFAULT 'pending' CHECK (review_status IN ('pending', 'reviewed', 'rejected')),
    review_comments TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_mandate_reviewers_mandate_id ON mandate_reviewers(mandate_id);
CREATE INDEX idx_mandate_reviewers_review_status ON mandate_reviewers(review_status);

DROP TRIGGER IF EXISTS trg_mandate_reviewers_before_insert ON mandate_reviewers;
CREATE TRIGGER trg_mandate_reviewers_before_insert
    BEFORE INSERT ON mandate_reviewers
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

COMMENT ON TABLE mandate_reviewers IS 'Reviewers assigned to review project mandates';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('mandate_reviewers', 'Reviewers assigned to review project mandates', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ============================================================================
-- SECTION 3: mandate_approvals
-- ============================================================================

CREATE TABLE mandate_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mandate_id UUID NOT NULL REFERENCES project_mandates(id) ON DELETE CASCADE,
    approver_name VARCHAR(200) NOT NULL,
    approver_organisation VARCHAR(200),
    approval_date DATE,
    approval_status VARCHAR(50) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approval_comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_mandate_approvals_mandate_id ON mandate_approvals(mandate_id);
CREATE INDEX idx_mandate_approvals_approval_status ON mandate_approvals(approval_status);

DROP TRIGGER IF EXISTS trg_mandate_approvals_before_insert ON mandate_approvals;
CREATE TRIGGER trg_mandate_approvals_before_insert
    BEFORE INSERT ON mandate_approvals
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_mandate_approvals_before_update ON mandate_approvals;
CREATE TRIGGER trg_mandate_approvals_before_update
    BEFORE UPDATE ON mandate_approvals
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

COMMENT ON TABLE mandate_approvals IS 'Approval records for project mandates';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('mandate_approvals', 'Approval records for project mandates', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ============================================================================
-- SECTION 4: mandate_document_history
-- ============================================================================

CREATE TABLE mandate_document_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mandate_id UUID NOT NULL REFERENCES project_mandates(id) ON DELETE CASCADE,
    version_number VARCHAR(20) NOT NULL,
    summary_of_changes TEXT,
    document_status VARCHAR(50),
    date_published DATE,
    changed_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mandate_document_history_mandate_id ON mandate_document_history(mandate_id);
CREATE INDEX idx_mandate_document_history_version_number ON mandate_document_history(version_number);

COMMENT ON TABLE mandate_document_history IS 'Version history for project mandates';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('mandate_document_history', 'Version history for project mandates', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ============================================================================
-- SECTION 5: mandate_associated_documents
-- ============================================================================

CREATE TABLE mandate_associated_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mandate_id UUID NOT NULL REFERENCES project_mandates(id) ON DELETE CASCADE,
    document_type VARCHAR(50) CHECK (document_type IN ('estimate', 'risk_assessment', 'feasibility_study', 'business_case', 'other')),
    document_title VARCHAR(200) NOT NULL,
    document_description TEXT,
    document_url VARCHAR(500), -- External link
    document_file_path VARCHAR(500), -- Internal file
    reference_number VARCHAR(100),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_mandate_associated_documents_mandate_id ON mandate_associated_documents(mandate_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_mandate_associated_documents_document_type ON mandate_associated_documents(document_type) WHERE is_deleted = FALSE;

DROP TRIGGER IF EXISTS trg_mandate_associated_documents_before_insert ON mandate_associated_documents;
CREATE TRIGGER trg_mandate_associated_documents_before_insert
    BEFORE INSERT ON mandate_associated_documents
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_mandate_associated_documents_before_update ON mandate_associated_documents;
CREATE TRIGGER trg_mandate_associated_documents_before_update
    BEFORE UPDATE ON mandate_associated_documents
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

COMMENT ON TABLE mandate_associated_documents IS 'Associated documents linked to project mandates (Section 10)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('mandate_associated_documents', 'Associated documents linked to project mandates', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ============================================================================
-- SECTION 6: mandate_deliverables
-- ============================================================================

CREATE TABLE mandate_deliverables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mandate_id UUID NOT NULL REFERENCES project_mandates(id) ON DELETE CASCADE,
    deliverable_name VARCHAR(200) NOT NULL,
    deliverable_description TEXT,
    is_in_scope BOOLEAN DEFAULT true, -- True = in scope, False = explicitly out of scope
    is_major_deliverable BOOLEAN DEFAULT true,
    estimated_completion VARCHAR(100), -- Rough timeframe (e.g., "Q2 2026", "6 months")
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_mandate_deliverables_mandate_id ON mandate_deliverables(mandate_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_mandate_deliverables_is_in_scope ON mandate_deliverables(is_in_scope) WHERE is_deleted = FALSE;

DROP TRIGGER IF EXISTS trg_mandate_deliverables_before_insert ON mandate_deliverables;
CREATE TRIGGER trg_mandate_deliverables_before_insert
    BEFORE INSERT ON mandate_deliverables
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_mandate_deliverables_before_update ON mandate_deliverables;
CREATE TRIGGER trg_mandate_deliverables_before_update
    BEFORE UPDATE ON mandate_deliverables
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

COMMENT ON TABLE mandate_deliverables IS 'Deliverables for project mandates (Section 5 - Scope)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('mandate_deliverables', 'Deliverables for project mandates', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ============================================================================
-- SECTION 7: mandate_dependencies
-- ============================================================================

CREATE TABLE mandate_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mandate_id UUID NOT NULL REFERENCES project_mandates(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) CHECK (dependency_type IN ('internal', 'external', 'interdependency', 'unknown')),
    dependency_description TEXT NOT NULL,
    impact_during_project BOOLEAN DEFAULT true, -- Impacts during project life
    impact_after_implementation BOOLEAN DEFAULT false, -- Exists after implementation
    related_project_id UUID REFERENCES projects(id) ON DELETE SET NULL, -- May not know which project yet
    related_programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL,
    dependency_status VARCHAR(50) DEFAULT 'identified' CHECK (dependency_status IN ('identified', 'analysed', 'managed')),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_mandate_dependencies_mandate_id ON mandate_dependencies(mandate_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_mandate_dependencies_dependency_type ON mandate_dependencies(dependency_type) WHERE is_deleted = FALSE;
CREATE INDEX idx_mandate_dependencies_related_project_id ON mandate_dependencies(related_project_id) WHERE is_deleted = FALSE AND related_project_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_mandate_dependencies_before_insert ON mandate_dependencies;
CREATE TRIGGER trg_mandate_dependencies_before_insert
    BEFORE INSERT ON mandate_dependencies
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_mandate_dependencies_before_update ON mandate_dependencies;
CREATE TRIGGER trg_mandate_dependencies_before_update
    BEFORE UPDATE ON mandate_dependencies
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

COMMENT ON TABLE mandate_dependencies IS 'Dependencies and interdependencies for project mandates (Section 7)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('mandate_dependencies', 'Dependencies and interdependencies for project mandates', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ============================================================================
-- SECTION 8: mandate_customers_users
-- ============================================================================

CREATE TABLE mandate_customers_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mandate_id UUID NOT NULL REFERENCES project_mandates(id) ON DELETE CASCADE,
    stakeholder_type VARCHAR(50) CHECK (stakeholder_type IN ('customer', 'user', 'interested_party')),
    stakeholder_name VARCHAR(200) NOT NULL,
    stakeholder_organisation VARCHAR(200),
    stakeholder_role VARCHAR(200),
    contact_email VARCHAR(200),
    is_primary BOOLEAN DEFAULT false, -- Primary customer/user
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_mandate_customers_users_mandate_id ON mandate_customers_users(mandate_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_mandate_customers_users_stakeholder_type ON mandate_customers_users(stakeholder_type) WHERE is_deleted = FALSE;

DROP TRIGGER IF EXISTS trg_mandate_customers_users_before_insert ON mandate_customers_users;
CREATE TRIGGER trg_mandate_customers_users_before_insert
    BEFORE INSERT ON mandate_customers_users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_mandate_customers_users_before_update ON mandate_customers_users;
CREATE TRIGGER trg_mandate_customers_users_before_update
    BEFORE UPDATE ON mandate_customers_users
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

COMMENT ON TABLE mandate_customers_users IS 'Customers, users, and interested parties for project mandates (Section 12)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('mandate_customers_users', 'Customers, users, and interested parties for project mandates', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ============================================================================
-- SECTION 9: DATABASE FUNCTIONS
-- ============================================================================

-- Function: get_mandate_by_id
CREATE OR REPLACE FUNCTION get_mandate_by_id(p_mandate_id UUID)
RETURNS TABLE (
    mandate_id UUID,
    project_id UUID,
    mandate_reference VARCHAR,
    mandate_title VARCHAR,
    document_status VARCHAR,
    version_number VARCHAR,
    created_date DATE,
    purpose TEXT,
    background TEXT,
    project_objectives TEXT,
    outline_business_case TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    created_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.id,
        pm.project_id,
        pm.mandate_reference,
        pm.mandate_title,
        pm.document_status,
        pm.version_number,
        pm.created_date,
        pm.purpose,
        pm.background,
        pm.project_objectives,
        pm.outline_business_case,
        pm.is_active,
        pm.created_at,
        pm.created_by
    FROM project_mandates pm
    WHERE pm.id = p_mandate_id
      AND pm.is_deleted = FALSE;
END;
$$;

COMMENT ON FUNCTION get_mandate_by_id(UUID) IS 'Returns mandate by ID (works for both linked and unlinked mandates)';

-- Function: get_mandate_by_project
CREATE OR REPLACE FUNCTION get_mandate_by_project(p_project_id UUID)
RETURNS TABLE (
    mandate_id UUID,
    mandate_reference VARCHAR,
    mandate_title VARCHAR,
    document_status VARCHAR,
    version_number VARCHAR,
    created_date DATE,
    project_created_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.id,
        pm.mandate_reference,
        pm.mandate_title,
        pm.document_status,
        pm.version_number,
        pm.created_date,
        pm.project_created_date
    FROM project_mandates pm
    WHERE pm.project_id = p_project_id
      AND pm.is_deleted = FALSE
    LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_mandate_by_project(UUID) IS 'Returns the mandate linked to a project';

-- Function: get_unlinked_mandates
CREATE OR REPLACE FUNCTION get_unlinked_mandates(p_organisation_id UUID DEFAULT NULL)
RETURNS TABLE (
    mandate_id UUID,
    mandate_reference VARCHAR,
    mandate_title VARCHAR,
    document_status VARCHAR,
    created_date DATE,
    created_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.id,
        pm.mandate_reference,
        pm.mandate_title,
        pm.document_status,
        pm.created_date,
        pm.created_by
    FROM project_mandates pm
    WHERE pm.project_id IS NULL
      AND pm.document_status = 'approved'
      AND pm.is_deleted = FALSE
      AND pm.is_active = TRUE
    ORDER BY pm.created_date DESC, pm.mandate_reference;
END;
$$;

COMMENT ON FUNCTION get_unlinked_mandates(UUID) IS 'Returns all approved mandates that have not been linked to projects yet';

-- Function: can_edit_mandate
CREATE OR REPLACE FUNCTION can_edit_mandate(p_mandate_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_mandate RECORD;
BEGIN
    SELECT document_status, project_id INTO v_mandate
    FROM project_mandates
    WHERE id = p_mandate_id
      AND is_deleted = FALSE;
    
    -- Mandate doesn't exist
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Cannot edit approved or archived mandates
    IF v_mandate.document_status IN ('approved', 'archived') THEN
        RETURN FALSE;
    END IF;
    
    -- Cannot edit if already linked to project
    IF v_mandate.project_id IS NOT NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Can edit if draft, submitted, or rejected
    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION can_edit_mandate(UUID, UUID) IS 'Checks if a mandate can be edited by a user';

-- Function: create_project_from_mandate (CRITICAL FUNCTION)
CREATE OR REPLACE FUNCTION create_project_from_mandate(p_mandate_id UUID, p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_mandate RECORD;
    v_new_project_id UUID;
    v_organisation_id UUID;
BEGIN
    -- Get mandate details
    SELECT * INTO v_mandate
    FROM project_mandates
    WHERE id = p_mandate_id
      AND is_deleted = FALSE;
    
    -- Validate mandate exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Mandate not found';
    END IF;
    
    -- Validate mandate is approved
    IF v_mandate.document_status != 'approved' THEN
        RAISE EXCEPTION 'Mandate must be approved before creating project';
    END IF;
    
    -- Validate mandate not already linked
    IF v_mandate.project_id IS NOT NULL THEN
        RAISE EXCEPTION 'Mandate is already linked to a project';
    END IF;
    
    -- Get user's organisation (required for project creation)
    SELECT organisation_id INTO v_organisation_id
    FROM users
    WHERE id = p_user_id
    LIMIT 1;
    
    IF v_organisation_id IS NULL THEN
        RAISE EXCEPTION 'User must belong to an organisation';
    END IF;
    
    -- Create new project record
    INSERT INTO projects (
        name,
        description,
        organisation_id,
        executive_id,
        manager_id,
        status,
        created_by,
        updated_by
    )
    VALUES (
        v_mandate.mandate_title,
        COALESCE(v_mandate.background, ''),
        v_organisation_id,
        v_mandate.proposed_executive_id,
        v_mandate.proposed_pm_id,
        'initiated',
        p_user_id,
        p_user_id
    )
    RETURNING id INTO v_new_project_id;
    
    -- Link mandate to project
    UPDATE project_mandates
    SET 
        project_id = v_new_project_id,
        project_created_date = NOW(),
        updated_by = p_user_id,
        updated_at = NOW()
    WHERE id = p_mandate_id;
    
    -- TODO: Copy deliverables to project_scope table (if exists)
    -- TODO: Copy stakeholders to project_members table (if exists)
    
    RETURN v_new_project_id;
END;
$$;

COMMENT ON FUNCTION create_project_from_mandate(UUID, UUID) IS 'Creates a new project from an approved mandate and links them. Returns the new project ID.';

-- Function: generate_mandate_reference
CREATE OR REPLACE FUNCTION generate_mandate_reference()
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_year INTEGER;
    v_seq INTEGER;
    v_ref VARCHAR(50);
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(mandate_reference FROM '\d+$') AS INTEGER)), 0) + 1
    INTO v_seq
    FROM project_mandates
    WHERE mandate_reference LIKE 'MAN-' || v_year || '-%'
      AND is_deleted = FALSE;
    
    -- Format: MAN-YYYY-XXX (3 digits with leading zeros)
    v_ref := 'MAN-' || v_year || '-' || LPAD(v_seq::TEXT, 3, '0');
    
    RETURN v_ref;
END;
$$;

COMMENT ON FUNCTION generate_mandate_reference() IS 'Generates unique mandate reference number (e.g., MAN-2026-001)';

-- Function: archive_mandate
CREATE OR REPLACE FUNCTION archive_mandate(p_mandate_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE project_mandates
    SET 
        document_status = 'archived',
        is_active = FALSE,
        updated_by = p_user_id,
        updated_at = NOW()
    WHERE id = p_mandate_id
      AND is_deleted = FALSE;
    
    RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION archive_mandate(UUID, UUID) IS 'Archives a mandate when no longer needed';

-- ============================================================================
-- SECTION 10: RLS POLICIES (Placeholder - to be implemented based on requirements)
-- ============================================================================

-- Note: RLS policies should be implemented based on your specific access control requirements
-- For now, we'll use SECURITY DEFINER functions which bypass RLS

-- Example RLS policies would go here:
-- ALTER TABLE project_mandates ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY mandate_select_policy ON project_mandates FOR SELECT USING (...);
-- etc.

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_tables_count INTEGER;
BEGIN
    -- Count mandate-related tables
    SELECT COUNT(*)
    INTO v_tables_count
    FROM database_tables
    WHERE table_name LIKE 'mandate%' OR table_name = 'project_mandates';
    
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Project Mandate Tables Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Mandate Tables Created: %', v_tables_count;
    RAISE NOTICE 'Expected: 8 tables';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v160_project_mandate_tables.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ============================================================================
-- END OF FILE
-- ============================================================================

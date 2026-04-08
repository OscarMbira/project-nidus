-- ============================================================================
-- Project Brief CRUD Implementation - Database Tables and Functions
-- Version: v163
-- Description: Complete database schema for Project Brief CRUD operations
-- Date: 2026-01-16
-- ============================================================================
--
-- Purpose:
-- Creates comprehensive database schema for Project Brief functionality.
-- Project Brief is created AFTER project creation and mandate approval,
-- and BEFORE detailed business case creation.
--
-- Prerequisites:
-- - v01 through v07 must be run first (core tables and trigger functions)
-- - projects table must exist (v04_project_core_tables.sql)
-- - project_mandates table must exist (v160_project_mandate_tables.sql)
-- - users table must exist (v02_system_core_tables.sql)
--
-- Key Design:
-- - One brief per project (UNIQUE constraint on project_id)
-- - Links to originating mandate (mandate_id FK)
-- - Comprehensive schema matching Project_Brief_Implementation_Plan.md
--
-- ============================================================================
-- SECTION 1: DROP EXISTING TABLES (if upgrading from v07)
-- ============================================================================

-- Drop child tables first (if they exist)
DROP TABLE IF EXISTS brief_tolerances CASCADE;
DROP TABLE IF EXISTS brief_references CASCADE;
DROP TABLE IF EXISTS brief_role_descriptions CASCADE;
DROP TABLE IF EXISTS brief_product_descriptions CASCADE;
DROP TABLE IF EXISTS brief_objectives CASCADE;
DROP TABLE IF EXISTS brief_distribution CASCADE;
DROP TABLE IF EXISTS brief_approvals CASCADE;
DROP TABLE IF EXISTS brief_revision_history CASCADE;

-- Drop and recreate main table to match comprehensive schema
DROP TABLE IF EXISTS project_briefs CASCADE;

-- ============================================================================
-- SECTION 2: MAIN TABLE - project_briefs
-- ============================================================================

CREATE TABLE project_briefs (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship (One brief per project)
    project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    mandate_id UUID REFERENCES project_mandates(id) ON DELETE SET NULL,

    -- Document Identification
    brief_reference VARCHAR(50) UNIQUE NOT NULL, -- e.g., PB-2026-001
    document_ref VARCHAR(200), -- External document reference
    version_number VARCHAR(20) DEFAULT '1.0',
    release VARCHAR(50), -- Release/version identifier

    -- Document Authorship
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    author_name VARCHAR(200), -- For external authors
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    owner_name VARCHAR(200), -- For external owners
    client_id UUID REFERENCES users(id) ON DELETE SET NULL,
    client_name VARCHAR(200), -- For external clients

    -- Document Status
    document_status VARCHAR(50) DEFAULT 'draft' CHECK (document_status IN ('draft', 'under_review', 'approved', 'rejected', 'superseded')),
    
    -- Dates
    created_date DATE DEFAULT CURRENT_DATE,
    approved_date DATE,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,

    -- Section 3: Project Definition
    background TEXT, -- Context from mandate, expanded
    project_objectives TEXT, -- SMART objectives covering time, cost, quality, scope, risk, benefits
    desired_outcomes TEXT, -- What success looks like
    project_scope TEXT, -- What's included
    scope_exclusions TEXT, -- What's explicitly NOT included
    constraints TEXT, -- Limitations (resources, time, budget, regulatory)
    assumptions TEXT, -- What we're assuming to be true
    project_tolerances TEXT, -- Acceptable variances (time, cost, scope, quality, risk, benefits)
    users_and_interested_parties TEXT, -- Stakeholders
    interfaces TEXT, -- Links to other projects/programmes/systems

    -- Section 4: Outline Business Case
    outline_business_case_summary TEXT, -- Reasons for project and business option selected
    business_option_selected VARCHAR(100), -- Which option from mandate (do nothing, do minimal, do something)

    -- Section 5: Project Product Description
    product_description TEXT, -- Overall description of what will be delivered
    customer_quality_expectations TEXT, -- Quality standards expected
    user_acceptance_criteria TEXT, -- How users will accept the product
    operations_maintenance_criteria TEXT, -- O&M acceptance criteria

    -- Section 6: Project Approach
    project_approach_description TEXT, -- How the project will be delivered
    solution_type VARCHAR(50) CHECK (solution_type IN ('bespoke', 'off_the_shelf', 'hybrid', 'customized_existing')),
    delivery_approach VARCHAR(50) CHECK (delivery_approach IN ('in_house', 'contracted', 'hybrid')),
    development_approach VARCHAR(50) CHECK (development_approach IN ('new_design', 'modification', 'integration')),
    operational_environment TEXT, -- Environment solution must fit into
    approach_justification TEXT, -- Why this approach was selected
    approach_selection_id UUID, -- FK to project_approach_selection (if table exists)

    -- Section 7 & 8: Team Structure and Roles
    team_structure_description TEXT, -- Overview of team organization
    team_structure_diagram_url VARCHAR(500), -- Org chart image URL
    lessons_learned_reviewed BOOLEAN DEFAULT FALSE, -- Have lessons been reviewed?
    lessons_review_summary TEXT, -- Summary of lessons reviewed

    -- Metadata
    is_consistent_with_csr BOOLEAN, -- Consistent with Corporate Social Responsibility?
    csr_notes TEXT, -- CSR compliance notes

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_briefs_project_id ON project_briefs(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_briefs_mandate_id ON project_briefs(mandate_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_briefs_brief_reference ON project_briefs(brief_reference) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_briefs_document_status ON project_briefs(document_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_briefs_author_id ON project_briefs(author_id) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_project_briefs_before_insert ON project_briefs;
CREATE TRIGGER trg_project_briefs_before_insert
    BEFORE INSERT ON project_briefs
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_project_briefs_before_update ON project_briefs;
CREATE TRIGGER trg_project_briefs_before_update
    BEFORE UPDATE ON project_briefs
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE project_briefs IS 'Project Brief documents for Structured PM Starting Up a Project process';
COMMENT ON COLUMN project_briefs.brief_reference IS 'Unique reference number (e.g., PB-2026-001)';
COMMENT ON COLUMN project_briefs.document_status IS 'Status: draft, under_review, approved, rejected, superseded';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('project_briefs', 'Project Brief documents for Structured PM Starting Up a Project process', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 3: brief_revision_history
-- ============================================================================

CREATE TABLE brief_revision_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brief_id UUID NOT NULL REFERENCES project_briefs(id) ON DELETE CASCADE,
    revision_date DATE NOT NULL DEFAULT CURRENT_DATE,
    previous_revision_date DATE,
    summary_of_changes TEXT NOT NULL,
    changes_marked TEXT, -- Tracked changes
    revised_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brief_revision_history_brief_id ON brief_revision_history(brief_id);
CREATE INDEX IF NOT EXISTS idx_brief_revision_history_revision_date ON brief_revision_history(revision_date);

COMMENT ON TABLE brief_revision_history IS 'Revision history for project briefs';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('brief_revision_history', 'Revision history for project briefs', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ============================================================================
-- SECTION 4: brief_approvals
-- ============================================================================

CREATE TABLE brief_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brief_id UUID NOT NULL REFERENCES project_briefs(id) ON DELETE CASCADE,
    approver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    approver_name VARCHAR(200) NOT NULL,
    approver_title VARCHAR(200),
    signature_data TEXT, -- Digital signature or signature image
    approval_date DATE,
    approval_status VARCHAR(50) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    comments TEXT,
    version_approved VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brief_approvals_brief_id ON brief_approvals(brief_id);
CREATE INDEX IF NOT EXISTS idx_brief_approvals_approval_status ON brief_approvals(approval_status);
CREATE INDEX IF NOT EXISTS idx_brief_approvals_approver_id ON brief_approvals(approver_id);

DROP TRIGGER IF EXISTS trg_brief_approvals_before_update ON brief_approvals;
CREATE TRIGGER trg_brief_approvals_before_update
    BEFORE UPDATE ON brief_approvals
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

COMMENT ON TABLE brief_approvals IS 'Approval records for project briefs';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('brief_approvals', 'Approval records for project briefs', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ============================================================================
-- SECTION 5: brief_distribution
-- ============================================================================

CREATE TABLE brief_distribution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brief_id UUID NOT NULL REFERENCES project_briefs(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_name VARCHAR(200) NOT NULL,
    recipient_title VARCHAR(200),
    date_of_issue DATE NOT NULL DEFAULT CURRENT_DATE,
    version_distributed VARCHAR(20) NOT NULL,
    distribution_status VARCHAR(50) DEFAULT 'sent' CHECK (distribution_status IN ('sent', 'read', 'acknowledged')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brief_distribution_brief_id ON brief_distribution(brief_id);
CREATE INDEX IF NOT EXISTS idx_brief_distribution_recipient_id ON brief_distribution(recipient_id);
CREATE INDEX IF NOT EXISTS idx_brief_distribution_status ON brief_distribution(distribution_status);

COMMENT ON TABLE brief_distribution IS 'Distribution list for project briefs';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('brief_distribution', 'Distribution list for project briefs', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ============================================================================
-- SECTION 6: brief_objectives
-- ============================================================================

CREATE TABLE brief_objectives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brief_id UUID NOT NULL REFERENCES project_briefs(id) ON DELETE CASCADE,
    objective_text TEXT NOT NULL,
    objective_type VARCHAR(50) NOT NULL CHECK (objective_type IN ('time', 'cost', 'quality', 'scope', 'risk', 'benefit')),
    
    -- SMART Criteria Flags
    is_specific BOOLEAN DEFAULT FALSE,
    is_measurable BOOLEAN DEFAULT FALSE,
    is_achievable BOOLEAN DEFAULT FALSE,
    is_realistic BOOLEAN DEFAULT FALSE,
    is_time_bound BOOLEAN DEFAULT FALSE,
    
    smart_validation_notes TEXT, -- Validation feedback
    target_value VARCHAR(200), -- Measurable target (e.g., "80%", "$50K")
    target_date DATE, -- Time-bound date
    
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brief_objectives_brief_id ON brief_objectives(brief_id);
CREATE INDEX IF NOT EXISTS idx_brief_objectives_objective_type ON brief_objectives(objective_type);
CREATE INDEX IF NOT EXISTS idx_brief_objectives_display_order ON brief_objectives(brief_id, display_order);

DROP TRIGGER IF EXISTS trg_brief_objectives_before_update ON brief_objectives;
CREATE TRIGGER trg_brief_objectives_before_update
    BEFORE UPDATE ON brief_objectives
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

COMMENT ON TABLE brief_objectives IS 'SMART objectives for project briefs';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('brief_objectives', 'SMART objectives for project briefs', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ============================================================================
-- SECTION 7: brief_product_descriptions
-- ============================================================================

CREATE TABLE brief_product_descriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brief_id UUID NOT NULL REFERENCES project_briefs(id) ON DELETE CASCADE,
    product_name VARCHAR(200) NOT NULL,
    product_description TEXT NOT NULL,
    purpose TEXT, -- Why this product is needed
    composition TEXT, -- What it consists of
    derivation TEXT, -- What it's based on (existing products, standards)
    format_presentation TEXT, -- How it will be presented
    quality_criteria TEXT, -- Quality standards
    quality_tolerance TEXT, -- Acceptable variances
    quality_method TEXT, -- How quality will be assessed
    is_main_product BOOLEAN DEFAULT FALSE, -- Main project product vs supporting
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brief_product_descriptions_brief_id ON brief_product_descriptions(brief_id);
CREATE INDEX IF NOT EXISTS idx_brief_product_descriptions_is_main_product ON brief_product_descriptions(brief_id, is_main_product);
CREATE INDEX IF NOT EXISTS idx_brief_product_descriptions_display_order ON brief_product_descriptions(brief_id, display_order);

DROP TRIGGER IF EXISTS trg_brief_product_descriptions_before_update ON brief_product_descriptions;
CREATE TRIGGER trg_brief_product_descriptions_before_update
    BEFORE UPDATE ON brief_product_descriptions
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

COMMENT ON TABLE brief_product_descriptions IS 'Product descriptions for project briefs';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('brief_product_descriptions', 'Product descriptions for project briefs', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ============================================================================
-- SECTION 8: brief_role_descriptions
-- ============================================================================

CREATE TABLE brief_role_descriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brief_id UUID NOT NULL REFERENCES project_briefs(id) ON DELETE CASCADE,
    role_name VARCHAR(200) NOT NULL, -- Executive, PM, Team Manager, etc.
    role_category VARCHAR(50) NOT NULL CHECK (role_category IN ('executive', 'project_board', 'project_manager', 'team_manager', 'project_assurance', 'project_support', 'specialist', 'other')),
    role_description TEXT,
    key_responsibilities TEXT,
    authority_level TEXT, -- Decision-making authority
    reporting_to VARCHAR(200), -- Reports to which role
    required_skills TEXT,
    required_experience TEXT,
    time_commitment VARCHAR(100), -- FTE, days per week, etc.
    assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- If already assigned
    assigned_to_name VARCHAR(200), -- Name if external
    is_mandatory BOOLEAN DEFAULT FALSE, -- Must be filled before initiation
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brief_role_descriptions_brief_id ON brief_role_descriptions(brief_id);
CREATE INDEX IF NOT EXISTS idx_brief_role_descriptions_role_category ON brief_role_descriptions(role_category);
CREATE INDEX IF NOT EXISTS idx_brief_role_descriptions_is_mandatory ON brief_role_descriptions(brief_id, is_mandatory);
CREATE INDEX IF NOT EXISTS idx_brief_role_descriptions_assigned_to_user_id ON brief_role_descriptions(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_brief_role_descriptions_display_order ON brief_role_descriptions(brief_id, display_order);

DROP TRIGGER IF EXISTS trg_brief_role_descriptions_before_update ON brief_role_descriptions;
CREATE TRIGGER trg_brief_role_descriptions_before_update
    BEFORE UPDATE ON brief_role_descriptions
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

COMMENT ON TABLE brief_role_descriptions IS 'Role descriptions for project briefs';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('brief_role_descriptions', 'Role descriptions for project briefs', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ============================================================================
-- SECTION 9: brief_references
-- ============================================================================

CREATE TABLE brief_references (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brief_id UUID NOT NULL REFERENCES project_briefs(id) ON DELETE CASCADE,
    reference_type VARCHAR(50) NOT NULL CHECK (reference_type IN ('mandate', 'lesson_learned', 'feasibility_study', 'business_case_outline', 'standard', 'policy', 'other_project', 'document', 'other')),
    reference_title VARCHAR(200) NOT NULL,
    reference_description TEXT,
    reference_url VARCHAR(500), -- External link
    reference_document_id UUID, -- Internal document ID (generic FK)
    mandate_id UUID REFERENCES project_mandates(id) ON DELETE SET NULL, -- If reference is mandate
    lesson_id UUID, -- FK to lessons_learned (if table exists)
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brief_references_brief_id ON brief_references(brief_id);
CREATE INDEX IF NOT EXISTS idx_brief_references_reference_type ON brief_references(reference_type);
CREATE INDEX IF NOT EXISTS idx_brief_references_mandate_id ON brief_references(mandate_id);
CREATE INDEX IF NOT EXISTS idx_brief_references_display_order ON brief_references(brief_id, display_order);

COMMENT ON TABLE brief_references IS 'References and associated documents for project briefs';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('brief_references', 'References and associated documents for project briefs', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ============================================================================
-- SECTION 10: brief_tolerances
-- ============================================================================

CREATE TABLE brief_tolerances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brief_id UUID NOT NULL REFERENCES project_briefs(id) ON DELETE CASCADE,
    tolerance_type VARCHAR(50) NOT NULL CHECK (tolerance_type IN ('time', 'cost', 'quality', 'scope', 'risk', 'benefit')),
    tolerance_description TEXT NOT NULL,
    lower_limit VARCHAR(100), -- e.g., "-10%", "-2 weeks"
    upper_limit VARCHAR(100), -- e.g., "+15%", "+1 month"
    absolute_value VARCHAR(100), -- e.g., "+/- $50K"
    escalation_required BOOLEAN DEFAULT FALSE, -- Must escalate if breached
    notes TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brief_tolerances_brief_id ON brief_tolerances(brief_id);
CREATE INDEX IF NOT EXISTS idx_brief_tolerances_tolerance_type ON brief_tolerances(tolerance_type);
CREATE INDEX IF NOT EXISTS idx_brief_tolerances_display_order ON brief_tolerances(brief_id, display_order);

COMMENT ON TABLE brief_tolerances IS 'Project tolerances for project briefs';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('brief_tolerances', 'Project tolerances for project briefs', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ============================================================================
-- SECTION 11: DATABASE FUNCTIONS
-- ============================================================================

-- Function: Generate unique brief reference
CREATE OR REPLACE FUNCTION generate_brief_reference()
RETURNS VARCHAR AS $$
DECLARE
    v_year VARCHAR(4);
    v_counter INTEGER;
    v_reference VARCHAR(50);
BEGIN
    v_year := TO_CHAR(NOW(), 'YYYY');
    
    -- Find the highest counter for this year
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(brief_reference FROM '[0-9]+$') AS INTEGER)
    ), 0) + 1
    INTO v_counter
    FROM project_briefs
    WHERE brief_reference LIKE 'PB-' || v_year || '-%'
      AND is_deleted = FALSE;
    
    -- Format: PB-YYYY-XXX (e.g., PB-2026-001)
    v_reference := 'PB-' || v_year || '-' || LPAD(v_counter::TEXT, 3, '0');
    
    RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_brief_reference() IS 'Generates unique brief reference number (e.g., PB-2026-001)';

-- Function: Create brief from mandate (auto-populate)
CREATE OR REPLACE FUNCTION create_brief_from_mandate(
    p_mandate_id UUID,
    p_project_id UUID,
    p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_brief_id UUID;
    v_mandate RECORD;
    v_deliverable RECORD;
    v_role RECORD;
BEGIN
    -- Get mandate data
    SELECT * INTO v_mandate
    FROM project_mandates
    WHERE id = p_mandate_id AND is_deleted = FALSE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Mandate not found: %', p_mandate_id;
    END IF;
    
    -- Create brief with mandate data
    INSERT INTO project_briefs (
        project_id,
        mandate_id,
        brief_reference,
        version_number,
        author_id,
        owner_id,
        document_status,
        created_date,
        background,
        project_objectives,
        outline_business_case_summary,
        project_scope,
        constraints,
        customer_quality_expectations,
        created_by,
        updated_by
    ) VALUES (
        p_project_id,
        p_mandate_id,
        generate_brief_reference(),
        '1.0',
        p_user_id,
        p_user_id,
        'draft',
        CURRENT_DATE,
        v_mandate.background,
        v_mandate.project_objectives,
        v_mandate.outline_business_case,
        v_mandate.scope,
        v_mandate.constraints,
        v_mandate.quality_expectations,
        p_user_id,
        p_user_id
    ) RETURNING id INTO v_brief_id;
    
    -- Copy deliverables as product descriptions
    FOR v_deliverable IN
        SELECT * FROM mandate_deliverables
        WHERE mandate_id = p_mandate_id AND is_deleted = FALSE
    LOOP
        INSERT INTO brief_product_descriptions (
            brief_id,
            product_name,
            product_description,
            purpose,
            display_order,
            created_at,
            updated_at
        ) VALUES (
            v_brief_id,
            v_deliverable.deliverable_name,
            v_deliverable.deliverable_description,
            v_deliverable.purpose,
            v_deliverable.display_order,
            NOW(),
            NOW()
        );
    END LOOP;
    
    -- Copy proposed roles
    IF v_mandate.proposed_executive_id IS NOT NULL OR v_mandate.proposed_executive_name IS NOT NULL THEN
        INSERT INTO brief_role_descriptions (
            brief_id,
            role_name,
            role_category,
            assigned_to_user_id,
            assigned_to_name,
            is_mandatory,
            display_order,
            created_at,
            updated_at
        ) VALUES (
            v_brief_id,
            'Executive',
            'executive',
            v_mandate.proposed_executive_id,
            v_mandate.proposed_executive_name,
            TRUE,
            1,
            NOW(),
            NOW()
        );
    END IF;
    
    IF v_mandate.proposed_pm_id IS NOT NULL OR v_mandate.proposed_pm_name IS NOT NULL THEN
        INSERT INTO brief_role_descriptions (
            brief_id,
            role_name,
            role_category,
            assigned_to_user_id,
            assigned_to_name,
            is_mandatory,
            display_order,
            created_at,
            updated_at
        ) VALUES (
            v_brief_id,
            'Project Manager',
            'project_manager',
            v_mandate.proposed_pm_id,
            v_mandate.proposed_pm_name,
            TRUE,
            2,
            NOW(),
            NOW()
        );
    END IF;
    
    -- Add mandate as reference
    INSERT INTO brief_references (
        brief_id,
        reference_type,
        reference_title,
        reference_description,
        mandate_id,
        display_order,
        created_at
    ) VALUES (
        v_brief_id,
        'mandate',
        'Project Mandate: ' || v_mandate.mandate_title,
        'Originating project mandate',
        p_mandate_id,
        1,
        NOW()
    );
    
    RETURN v_brief_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_brief_from_mandate(UUID, UUID, UUID) IS 'Creates project brief pre-populated with mandate data';

-- Function: Validate SMART objectives
CREATE OR REPLACE FUNCTION validate_smart_objectives(p_brief_id UUID)
RETURNS TABLE (
    objective_id UUID,
    is_smart BOOLEAN,
    missing_criteria TEXT[],
    recommendations TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        bo.id AS objective_id,
        (bo.is_specific AND bo.is_measurable AND bo.is_achievable AND bo.is_realistic AND bo.is_time_bound) AS is_smart,
        ARRAY_REMOVE(ARRAY[
            CASE WHEN NOT bo.is_specific THEN 'Specific' END,
            CASE WHEN NOT bo.is_measurable THEN 'Measurable' END,
            CASE WHEN NOT bo.is_achievable THEN 'Achievable' END,
            CASE WHEN NOT bo.is_realistic THEN 'Realistic' END,
            CASE WHEN NOT bo.is_time_bound THEN 'Time-bound' END
        ], NULL) AS missing_criteria,
        CASE
            WHEN NOT bo.is_specific THEN 'Make objective more specific - include What, Why, Who, Where, Which'
            WHEN NOT bo.is_measurable THEN 'Add measurable target value or metric'
            WHEN NOT bo.is_achievable THEN 'Ensure objective is realistic given available resources'
            WHEN NOT bo.is_realistic THEN 'Verify objective aligns with constraints and other objectives'
            WHEN NOT bo.is_time_bound THEN 'Add specific deadline or timeframe'
            ELSE 'Objective meets all SMART criteria'
        END AS recommendations
    FROM brief_objectives bo
    WHERE bo.brief_id = p_brief_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_smart_objectives(UUID) IS 'Validates that objectives meet SMART criteria';

-- Function: Check brief quality criteria
CREATE OR REPLACE FUNCTION check_brief_quality_criteria(p_brief_id UUID)
RETURNS TABLE (
    criterion_name VARCHAR,
    is_met BOOLEAN,
    notes TEXT
) AS $$
DECLARE
    v_brief RECORD;
    v_word_count INTEGER;
    v_objective_count INTEGER;
    v_smart_count INTEGER;
BEGIN
    -- Get brief data
    SELECT * INTO v_brief
    FROM project_briefs
    WHERE id = p_brief_id AND is_deleted = FALSE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Brief not found: %', p_brief_id;
    END IF;
    
    -- 1. Brief is concise (word count check)
    v_word_count := (
        LENGTH(COALESCE(v_brief.background, '')) +
        LENGTH(COALESCE(v_brief.project_objectives, '')) +
        LENGTH(COALESCE(v_brief.project_scope, '')) +
        LENGTH(COALESCE(v_brief.outline_business_case_summary, ''))
    ) / 5; -- Rough word count estimate
    
    RETURN QUERY SELECT
        'Brief is concise'::VARCHAR,
        (v_word_count < 5000)::BOOLEAN,
        ('Word count: ' || v_word_count || ' (target: <5000)')::TEXT;
    
    -- 2. Accurately reflects mandate
    RETURN QUERY SELECT
        'Accurately reflects mandate'::VARCHAR,
        (v_brief.mandate_id IS NOT NULL)::BOOLEAN,
        CASE WHEN v_brief.mandate_id IS NULL THEN 'No mandate linked' ELSE 'Mandate linked' END;
    
    -- 3. Approach considers range of solutions
    RETURN QUERY SELECT
        'Approach considers range of solutions'::VARCHAR,
        (v_brief.solution_type IS NOT NULL AND v_brief.delivery_approach IS NOT NULL AND v_brief.development_approach IS NOT NULL)::BOOLEAN,
        CASE
            WHEN v_brief.solution_type IS NULL THEN 'Solution type not selected'
            WHEN v_brief.delivery_approach IS NULL THEN 'Delivery approach not selected'
            WHEN v_brief.development_approach IS NULL THEN 'Development approach not selected'
            ELSE 'Multiple approaches considered'
        END;
    
    -- 4. Approach maximizes success chance
    RETURN QUERY SELECT
        'Approach maximizes success chance'::VARCHAR,
        (v_brief.approach_justification IS NOT NULL AND LENGTH(v_brief.approach_justification) > 50)::BOOLEAN,
        CASE
            WHEN v_brief.approach_justification IS NULL THEN 'No justification provided'
            WHEN LENGTH(v_brief.approach_justification) <= 50 THEN 'Justification too brief'
            ELSE 'Justification provided'
        END;
    
    -- 5. Consistent with CSR directive
    RETURN QUERY SELECT
        'Consistent with CSR directive'::VARCHAR,
        (v_brief.is_consistent_with_csr IS NOT NULL)::BOOLEAN,
        CASE
            WHEN v_brief.is_consistent_with_csr IS NULL THEN 'CSR compliance not checked'
            WHEN v_brief.is_consistent_with_csr = TRUE THEN 'CSR compliant'
            ELSE 'CSR notes: ' || COALESCE(v_brief.csr_notes, 'None')
        END;
    
    -- 6. Objectives are SMART
    SELECT COUNT(*), COUNT(*) FILTER (WHERE is_specific AND is_measurable AND is_achievable AND is_realistic AND is_time_bound)
    INTO v_objective_count, v_smart_count
    FROM brief_objectives
    WHERE brief_id = p_brief_id;
    
    RETURN QUERY SELECT
        'Objectives are SMART'::VARCHAR,
        (v_objective_count > 0 AND v_smart_count::DECIMAL / NULLIF(v_objective_count, 0) >= 0.8)::BOOLEAN,
        (v_smart_count || ' of ' || v_objective_count || ' objectives fully SMART (target: 80%)')::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_brief_quality_criteria(UUID) IS 'Validates brief against quality criteria from template';

-- Function: Get brief by project
CREATE OR REPLACE FUNCTION get_brief_by_project(p_project_id UUID)
RETURNS TABLE (
    brief_id UUID,
    brief_reference VARCHAR,
    document_status VARCHAR,
    mandate_id UUID,
    created_date DATE,
    approved_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pb.id,
        pb.brief_reference,
        pb.document_status,
        pb.mandate_id,
        pb.created_date,
        pb.approved_date
    FROM project_briefs pb
    WHERE pb.project_id = p_project_id
      AND pb.is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_brief_by_project(UUID) IS 'Returns brief for a project';

-- ============================================================================
-- SECTION 12: TRIGGERS
-- ============================================================================

-- Trigger: Auto-generate brief_reference on INSERT
CREATE OR REPLACE FUNCTION trg_project_briefs_generate_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.brief_reference IS NULL OR NEW.brief_reference = '' THEN
        NEW.brief_reference := generate_brief_reference();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_briefs_generate_reference_trigger ON project_briefs;
CREATE TRIGGER trg_project_briefs_generate_reference_trigger
    BEFORE INSERT ON project_briefs
    FOR EACH ROW
    EXECUTE FUNCTION trg_project_briefs_generate_reference();

-- ============================================================================
-- COMPLETION SUMMARY
-- ============================================================================

DO $$
DECLARE
    v_table_count INTEGER;
    v_function_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
          'project_briefs',
          'brief_revision_history',
          'brief_approvals',
          'brief_distribution',
          'brief_objectives',
          'brief_product_descriptions',
          'brief_role_descriptions',
          'brief_references',
          'brief_tolerances'
      );
    
    SELECT COUNT(*) INTO v_function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN (
          'generate_brief_reference',
          'create_brief_from_mandate',
          'validate_smart_objectives',
          'check_brief_quality_criteria',
          'get_brief_by_project'
      );
    
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Project Brief Database Migration Complete';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Tables Created: %', v_table_count;
    RAISE NOTICE 'Functions Created: %', v_function_count;
    RAISE NOTICE '================================================';
END $$;

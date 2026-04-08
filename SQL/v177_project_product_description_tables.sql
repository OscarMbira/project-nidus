-- ============================================================================
-- Project Product Description Implementation - Comprehensive PPD Module
-- Version: v177
-- Description: Creates comprehensive Project Product Description structure
-- Date: 2026-01-19
-- ============================================================================
--
-- Purpose:
-- Implements the Project Product Description module based on structured project management methodology.
-- The Project Product Description is a fundamental document that describes what the project will deliver
-- as its final output. It defines the purpose, composition, quality expectations, and acceptance criteria
-- for the overall project product.
--
-- Strategy:
-- 1. Create project_product_descriptions main table (one per project)
-- 2. Create supporting tables (composition, derivations, acceptance criteria, quality expectations, skills, etc.)
-- 3. Create functions for reference generation, validation, acceptance tracking
-- 4. Set up triggers for auto-generation and validation
-- 5. Set up RLS policies (in separate file)
--
-- Prerequisites:
-- - v01 through v07 must be run first (core tables and trigger functions)
-- - v160_project_mandate_tables.sql must be run (project_mandates table)
-- - v24_structured_pm_mp.sql must be run (product_deliverables table)
-- - projects table must exist
-- - users table must exist
-- - accounts table must exist (for organisation-level access)
--
-- ============================================================================
-- SECTION 1: MAIN TABLE - project_product_descriptions
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_product_descriptions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship (One description per project)
    project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Document Identification
    ppd_reference VARCHAR(50) UNIQUE NOT NULL, -- e.g., PPD-2026-001
    document_ref VARCHAR(200), -- External document reference
    version_number VARCHAR(20) DEFAULT '1.0',
    release VARCHAR(50), -- Release identifier

    -- Ownership
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    author_name VARCHAR(200), -- For external authors
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    owner_name VARCHAR(200), -- For external owners
    client_id UUID REFERENCES users(id) ON DELETE SET NULL,
    client_name VARCHAR(200), -- For external clients

    -- Core Content
    product_title VARCHAR(200) NOT NULL, -- Name by which the project is known
    purpose TEXT NOT NULL, -- Purpose the project product will fulfill and who will use it
    composition TEXT, -- Description of major products to be delivered
    derivation TEXT, -- Source products from which this is derived

    -- Skills & Resources
    development_skills_required TEXT, -- Skills needed to develop the product
    resource_areas TEXT, -- Which areas should supply resources

    -- Quality & Acceptance
    customer_quality_expectations TEXT, -- Quality expected and standards/processes
    quality_characteristics TEXT, -- Key quality characteristics (fast/slow, large/small)
    quality_management_system TEXT, -- Customer's QMS elements to use
    applicable_standards TEXT, -- Other standards to apply
    satisfaction_targets TEXT, -- Customer/staff satisfaction targets

    -- Tolerances
    project_quality_tolerances TEXT, -- Tolerances for acceptance criteria

    -- Acceptance Process
    acceptance_method TEXT, -- How acceptance will be confirmed
    acceptance_responsibilities TEXT, -- Who confirms acceptance
    handover_arrangements TEXT, -- Complex handover details if applicable
    phased_handover BOOLEAN DEFAULT false, -- Whether phased handover planned

    -- Status
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'approved', 'superseded')),
    approved_date DATE,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,

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
CREATE INDEX IF NOT EXISTS idx_ppd_project_id ON project_product_descriptions(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_ppd_status ON project_product_descriptions(status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_ppd_ppd_reference ON project_product_descriptions(ppd_reference) WHERE is_deleted = false;

-- ============================================================================
-- SECTION 2: COMPOSITION ITEMS - ppd_composition_items
-- ============================================================================

CREATE TABLE IF NOT EXISTS ppd_composition_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ppd_id UUID NOT NULL REFERENCES project_product_descriptions(id) ON DELETE CASCADE,
    item_number INTEGER NOT NULL, -- Display order
    product_name VARCHAR(200) NOT NULL,
    product_description TEXT,
    product_type VARCHAR(50) DEFAULT 'deliverable' CHECK (product_type IN ('deliverable', 'service', 'capability', 'document', 'system', 'process', 'other')),
    is_mandatory BOOLEAN DEFAULT true, -- Must be delivered
    planned_delivery_stage VARCHAR(100), -- Which stage/phase
    linked_product_id UUID REFERENCES product_deliverables(id) ON DELETE SET NULL, -- Link to detailed product description
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Ensure unique item numbers per PPD
    UNIQUE(ppd_id, item_number)
);

CREATE INDEX IF NOT EXISTS idx_ppd_composition_ppd_id ON ppd_composition_items(ppd_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_ppd_composition_product_id ON ppd_composition_items(linked_product_id) WHERE is_deleted = false;

-- ============================================================================
-- SECTION 3: DERIVATIONS - ppd_derivations
-- ============================================================================

CREATE TABLE IF NOT EXISTS ppd_derivations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ppd_id UUID NOT NULL REFERENCES project_product_descriptions(id) ON DELETE CASCADE,
    derivation_type VARCHAR(50) NOT NULL CHECK (derivation_type IN ('existing_product', 'design_specification', 'feasibility_report', 'project_mandate', 'requirements_document', 'standard', 'regulation', 'other')),
    derivation_title VARCHAR(200) NOT NULL,
    derivation_description TEXT,
    derivation_reference VARCHAR(200), -- External reference
    linked_document_id UUID, -- Internal document link (no FK as document storage may vary)
    mandate_id UUID REFERENCES project_mandates(id) ON DELETE SET NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ppd_derivations_ppd_id ON ppd_derivations(ppd_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_ppd_derivations_mandate_id ON ppd_derivations(mandate_id) WHERE is_deleted = false;

-- ============================================================================
-- SECTION 4: ACCEPTANCE CRITERIA - ppd_acceptance_criteria
-- ============================================================================

CREATE TABLE IF NOT EXISTS ppd_acceptance_criteria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ppd_id UUID NOT NULL REFERENCES project_product_descriptions(id) ON DELETE CASCADE,
    criteria_number INTEGER NOT NULL, -- For reference (AC-001, AC-002)
    criteria_reference VARCHAR(50), -- e.g., AC-001
    criteria_title VARCHAR(200) NOT NULL, -- Brief title
    criteria_description TEXT NOT NULL, -- Full description
    criteria_category VARCHAR(50) DEFAULT 'functional' CHECK (criteria_category IN ('functional', 'performance', 'quality', 'usability', 'security', 'compliance', 'operational', 'maintenance', 'other')),
    stakeholder_group VARCHAR(50) DEFAULT 'all' CHECK (stakeholder_group IN ('users', 'operations', 'maintenance', 'management', 'regulatory', 'all')),
    priority VARCHAR(50) DEFAULT 'should_have' CHECK (priority IN ('must_have', 'should_have', 'could_have', 'wont_have')),

    -- Measurability
    measurement_method TEXT, -- How it will be measured
    target_value VARCHAR(100), -- Quantifiable target
    tolerance_lower VARCHAR(100), -- Lower tolerance limit
    tolerance_upper VARCHAR(100), -- Upper tolerance limit
    unit_of_measure VARCHAR(50), -- e.g., seconds, %, count

    -- Validation Flags
    is_measurable BOOLEAN DEFAULT false, -- Validated as measurable
    is_realistic BOOLEAN DEFAULT false, -- Validated as individually realistic
    is_provable_in_project BOOLEAN DEFAULT true, -- Can be proven during project
    proxy_measure TEXT, -- If not directly provable, what proxy measure
    validation_notes TEXT, -- Notes from validation

    -- Status
    acceptance_status VARCHAR(50) DEFAULT 'pending' CHECK (acceptance_status IN ('pending', 'passed', 'failed', 'waived', 'deferred')),
    acceptance_date DATE,
    acceptance_notes TEXT,
    accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Metadata
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Ensure unique criteria numbers per PPD
    UNIQUE(ppd_id, criteria_number)
);

CREATE INDEX IF NOT EXISTS idx_ppd_criteria_ppd_id ON ppd_acceptance_criteria(ppd_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_ppd_criteria_status ON ppd_acceptance_criteria(acceptance_status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_ppd_criteria_priority ON ppd_acceptance_criteria(priority) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_ppd_criteria_stakeholder ON ppd_acceptance_criteria(stakeholder_group) WHERE is_deleted = false;

-- ============================================================================
-- SECTION 5: QUALITY EXPECTATIONS - ppd_quality_expectations
-- ============================================================================

CREATE TABLE IF NOT EXISTS ppd_quality_expectations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ppd_id UUID NOT NULL REFERENCES project_product_descriptions(id) ON DELETE CASCADE,
    expectation_category VARCHAR(50) DEFAULT 'other' CHECK (expectation_category IN ('performance', 'reliability', 'usability', 'security', 'maintainability', 'portability', 'scalability', 'compliance', 'other')),
    expectation_description TEXT NOT NULL,
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    source VARCHAR(200), -- Who/what is the source of this expectation
    standard_reference VARCHAR(200), -- Related standard if any
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ppd_quality_ppd_id ON ppd_quality_expectations(ppd_id) WHERE is_deleted = false;

-- ============================================================================
-- SECTION 6: SKILLS REQUIRED - ppd_skills_required
-- ============================================================================

CREATE TABLE IF NOT EXISTS ppd_skills_required (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ppd_id UUID NOT NULL REFERENCES project_product_descriptions(id) ON DELETE CASCADE,
    skill_name VARCHAR(200) NOT NULL,
    skill_description TEXT,
    skill_category VARCHAR(50) DEFAULT 'technical' CHECK (skill_category IN ('technical', 'management', 'domain', 'soft_skills', 'certification', 'other')),
    proficiency_level VARCHAR(50) DEFAULT 'intermediate' CHECK (proficiency_level IN ('basic', 'intermediate', 'advanced', 'expert')),
    required_for TEXT, -- Which composition items need this skill
    resource_area VARCHAR(200), -- Which area should provide this
    is_critical BOOLEAN DEFAULT false, -- Critical skill
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ppd_skills_ppd_id ON ppd_skills_required(ppd_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_ppd_skills_critical ON ppd_skills_required(is_critical) WHERE is_deleted = false;

-- ============================================================================
-- SECTION 7: ACCEPTANCE RESPONSIBILITIES - ppd_acceptance_responsibilities
-- ============================================================================

CREATE TABLE IF NOT EXISTS ppd_acceptance_responsibilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ppd_id UUID NOT NULL REFERENCES project_product_descriptions(id) ON DELETE CASCADE,
    role_name VARCHAR(200) NOT NULL, -- Role responsible for acceptance
    role_category VARCHAR(50) DEFAULT 'other' CHECK (role_category IN ('user', 'operations', 'maintenance', 'management', 'quality', 'regulatory', 'executive', 'other')),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Specific person if known
    user_name VARCHAR(200), -- Name if external
    acceptance_scope TEXT, -- What they are responsible for accepting
    criteria_ids UUID[], -- Which acceptance criteria they own
    authority_level VARCHAR(50) DEFAULT 'reviewer' CHECK (authority_level IN ('final', 'recommender', 'reviewer')),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ppd_responsibilities_ppd_id ON ppd_acceptance_responsibilities(ppd_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_ppd_responsibilities_user_id ON ppd_acceptance_responsibilities(user_id) WHERE is_deleted = false;

-- ============================================================================
-- SECTION 8: REVISION HISTORY - ppd_revision_history
-- ============================================================================

CREATE TABLE IF NOT EXISTS ppd_revision_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ppd_id UUID NOT NULL REFERENCES project_product_descriptions(id) ON DELETE CASCADE,
    revision_date DATE NOT NULL DEFAULT CURRENT_DATE,
    previous_revision_date DATE, -- Date of previous revision
    summary_of_changes TEXT NOT NULL,
    changes_marked TEXT, -- Tracked changes if applicable
    revised_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    change_request_id UUID, -- FK to change_requests if from change control (no FK as table may not exist yet)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppd_revision_ppd_id ON ppd_revision_history(ppd_id);
CREATE INDEX IF NOT EXISTS idx_ppd_revision_date ON ppd_revision_history(revision_date);

-- ============================================================================
-- SECTION 9: APPROVALS - ppd_approvals
-- ============================================================================

CREATE TABLE IF NOT EXISTS ppd_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ppd_id UUID NOT NULL REFERENCES project_product_descriptions(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    approver_name VARCHAR(200) NOT NULL,
    approver_title VARCHAR(200),
    signature_data TEXT, -- Signature data if captured
    approval_date DATE NOT NULL DEFAULT CURRENT_DATE,
    approval_status VARCHAR(50) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    comments TEXT, -- Approval comments
    version_approved VARCHAR(20), -- Version number approved
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ppd_approvals_ppd_id ON ppd_approvals(ppd_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_ppd_approvals_status ON ppd_approvals(approval_status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_ppd_approvals_approver ON ppd_approvals(approver_id) WHERE is_deleted = false;

-- ============================================================================
-- SECTION 10: DISTRIBUTION - ppd_distribution
-- ============================================================================

CREATE TABLE IF NOT EXISTS ppd_distribution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ppd_id UUID NOT NULL REFERENCES project_product_descriptions(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_name VARCHAR(200) NOT NULL,
    recipient_title VARCHAR(200),
    date_of_issue DATE NOT NULL DEFAULT CURRENT_DATE,
    version_distributed VARCHAR(20), -- Version distributed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ppd_distribution_ppd_id ON ppd_distribution(ppd_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_ppd_distribution_recipient ON ppd_distribution(recipient_id) WHERE is_deleted = false;

-- ============================================================================
-- SECTION 11: TRIGGERS - Auto-generation and Audit
-- ============================================================================

-- Trigger: Auto-generate ppd_reference on INSERT
CREATE OR REPLACE FUNCTION trg_ppd_generate_reference()
RETURNS TRIGGER AS $$
DECLARE
    v_year INTEGER;
    v_sequence INTEGER;
    v_reference VARCHAR(50);
BEGIN
    -- Only generate if not provided
    IF NEW.ppd_reference IS NULL OR NEW.ppd_reference = '' THEN
        v_year := EXTRACT(YEAR FROM CURRENT_DATE);
        
        -- Get next sequence number for this year
        SELECT COALESCE(MAX(
            CAST(SUBSTRING(ppd_reference FROM 'PPD-' || v_year || '-(.+)$') AS INTEGER)
        ), 0) + 1
        INTO v_sequence
        FROM project_product_descriptions
        WHERE ppd_reference LIKE 'PPD-' || v_year || '-%'
          AND is_deleted = false;
        
        -- Format: PPD-YYYY-NNN
        v_reference := 'PPD-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0');
        
        NEW.ppd_reference := v_reference;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_product_descriptions_generate_reference ON project_product_descriptions;
CREATE TRIGGER trg_project_product_descriptions_generate_reference
    BEFORE INSERT ON project_product_descriptions
    FOR EACH ROW
    EXECUTE FUNCTION trg_ppd_generate_reference();

-- Trigger: Auto-generate criteria_reference on INSERT
CREATE OR REPLACE FUNCTION trg_ppd_criteria_generate_reference()
RETURNS TRIGGER AS $$
DECLARE
    v_reference VARCHAR(50);
BEGIN
    -- Only generate if not provided
    IF NEW.criteria_reference IS NULL OR NEW.criteria_reference = '' THEN
        -- Format: AC-NNN (zero-padded)
        v_reference := 'AC-' || LPAD(NEW.criteria_number::TEXT, 3, '0');
        NEW.criteria_reference := v_reference;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ppd_acceptance_criteria_generate_reference ON ppd_acceptance_criteria;
CREATE TRIGGER trg_ppd_acceptance_criteria_generate_reference
    BEFORE INSERT ON ppd_acceptance_criteria
    FOR EACH ROW
    EXECUTE FUNCTION trg_ppd_criteria_generate_reference();

-- Trigger: Update updated_at timestamp
DROP TRIGGER IF EXISTS trg_ppd_update_timestamp ON project_product_descriptions;
CREATE TRIGGER trg_ppd_update_timestamp
    BEFORE UPDATE ON project_product_descriptions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_audit_fields();

-- Trigger: Set created fields
DROP TRIGGER IF EXISTS trg_ppd_set_created_fields ON project_product_descriptions;
CREATE TRIGGER trg_ppd_set_created_fields
    BEFORE INSERT ON project_product_descriptions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_created_fields();

-- ============================================================================
-- SECTION 12: FUNCTIONS - Reference Generation and Validation
-- ============================================================================

-- Function: Generate PPD Reference
CREATE OR REPLACE FUNCTION generate_ppd_reference()
RETURNS VARCHAR AS $$
DECLARE
    v_year INTEGER;
    v_sequence INTEGER;
    v_reference VARCHAR(50);
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(ppd_reference FROM 'PPD-' || v_year || '-(.+)$') AS INTEGER)
    ), 0) + 1
    INTO v_sequence
    FROM project_product_descriptions
    WHERE ppd_reference LIKE 'PPD-' || v_year || '-%'
      AND is_deleted = false;
    
    -- Format: PPD-YYYY-NNN
    v_reference := 'PPD-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0');
    
    RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_ppd_reference() IS 'Generates unique PPD reference number (PPD-YYYY-NNN)';

-- Function: Generate Criteria Reference
CREATE OR REPLACE FUNCTION generate_criteria_reference(p_ppd_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_criteria_number INTEGER;
    v_reference VARCHAR(50);
BEGIN
    -- Get next criteria number for this PPD
    SELECT COALESCE(MAX(criteria_number), 0) + 1
    INTO v_criteria_number
    FROM ppd_acceptance_criteria
    WHERE ppd_id = p_ppd_id
      AND is_deleted = false;
    
    -- Format: AC-NNN
    v_reference := 'AC-' || LPAD(v_criteria_number::TEXT, 3, '0');
    
    RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_criteria_reference(UUID) IS 'Generates acceptance criteria reference (AC-NNN)';

-- Function: Create PPD from Mandate
CREATE OR REPLACE FUNCTION create_ppd_from_mandate(p_mandate_id UUID, p_project_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_ppd_id UUID;
    v_mandate RECORD;
    v_deliverable RECORD;
    v_item_number INTEGER := 1;
BEGIN
    -- Get mandate details
    SELECT * INTO v_mandate
    FROM project_mandates
    WHERE id = p_mandate_id
      AND is_deleted = false;
    
    IF v_mandate IS NULL THEN
        RAISE EXCEPTION 'Mandate not found';
    END IF;
    
    -- Create PPD
    INSERT INTO project_product_descriptions (
        project_id,
        ppd_reference,
        version_number,
        product_title,
        purpose,
        derivation,
        author_id,
        owner_id,
        created_by,
        updated_by,
        status
    ) VALUES (
        p_project_id,
        generate_ppd_reference(),
        '1.0',
        v_mandate.mandate_title,
        COALESCE(v_mandate.mandate_description, ''),
        'Derived from Project Mandate: ' || v_mandate.mandate_title,
        p_user_id,
        p_user_id,
        p_user_id,
        p_user_id,
        'draft'
    ) RETURNING id INTO v_ppd_id;
    
    -- Add mandate as derivation
    INSERT INTO ppd_derivations (
        ppd_id,
        derivation_type,
        derivation_title,
        derivation_description,
        mandate_id,
        display_order,
        created_by
    ) VALUES (
        v_ppd_id,
        'project_mandate',
        v_mandate.mandate_title,
        v_mandate.mandate_description,
        p_mandate_id,
        1,
        p_user_id
    );
    
    -- Copy deliverables from mandate to composition
    FOR v_deliverable IN 
        SELECT * FROM mandate_deliverables
        WHERE mandate_id = p_mandate_id
          AND is_deleted = false
        ORDER BY display_order, id
    LOOP
        INSERT INTO ppd_composition_items (
            ppd_id,
            item_number,
            product_name,
            product_description,
            product_type,
            is_mandatory,
            created_by,
            updated_by
        ) VALUES (
            v_ppd_id,
            v_item_number,
            v_deliverable.deliverable_name,
            v_deliverable.deliverable_description,
            COALESCE(v_deliverable.deliverable_type, 'deliverable'),
            COALESCE(v_deliverable.is_in_scope, true),
            p_user_id,
            p_user_id
        );
        
        v_item_number := v_item_number + 1;
    END LOOP;
    
    RETURN v_ppd_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_ppd_from_mandate(UUID, UUID, UUID) IS 'Creates PPD pre-populated from project mandate';

-- Function: Validate Acceptance Criteria
CREATE OR REPLACE FUNCTION validate_acceptance_criteria(p_ppd_id UUID)
RETURNS TABLE (
    criteria_id UUID,
    is_valid BOOLEAN,
    issues TEXT[],
    recommendations TEXT
) AS $$
DECLARE
    v_criteria RECORD;
    v_issue_list TEXT[];
    v_recommendations TEXT;
BEGIN
    FOR v_criteria IN 
        SELECT * FROM ppd_acceptance_criteria
        WHERE ppd_id = p_ppd_id
          AND is_deleted = false
    LOOP
        v_issue_list := ARRAY[]::TEXT[];
        v_recommendations := '';
        
        -- Check measurability
        IF v_criteria.measurement_method IS NULL OR trim(v_criteria.measurement_method) = '' THEN
            v_issue_list := v_issue_list || 'No measurement method defined';
            v_recommendations := v_recommendations || 'Define how this criterion will be measured. ';
        END IF;
        
        IF v_criteria.priority = 'must_have' AND (v_criteria.target_value IS NULL OR trim(v_criteria.target_value) = '') THEN
            v_issue_list := v_issue_list || 'No target value for must-have criterion';
            v_recommendations := v_recommendations || 'Specify a measurable target value. ';
        END IF;
        
        -- Check provability
        IF NOT v_criteria.is_provable_in_project AND (v_criteria.proxy_measure IS NULL OR trim(v_criteria.proxy_measure) = '') THEN
            v_issue_list := v_issue_list || 'Cannot be proven in project and no proxy measure defined';
            v_recommendations := v_recommendations || 'Define a proxy measure or adjust criterion. ';
        END IF;
        
        -- Check completeness
        IF v_criteria.criteria_description IS NULL OR length(trim(v_criteria.criteria_description)) < 30 THEN
            v_issue_list := v_issue_list || 'Description too brief (minimum 30 characters)';
            v_recommendations := v_recommendations || 'Provide more detailed description. ';
        END IF;
        
        RETURN QUERY SELECT 
            v_criteria.id,
            (array_length(v_issue_list, 1) IS NULL)::BOOLEAN AS is_valid,
            v_issue_list AS issues,
            trim(v_recommendations) AS recommendations;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_acceptance_criteria(UUID) IS 'Validates that all acceptance criteria meet quality standards';

-- Function: Check Criteria Consistency
CREATE OR REPLACE FUNCTION check_criteria_consistency(p_ppd_id UUID)
RETURNS TABLE (
    conflict_type VARCHAR,
    criteria_1_id UUID,
    criteria_2_id UUID,
    conflict_description TEXT
) AS $$
DECLARE
    v_criteria_1 RECORD;
    v_criteria_2 RECORD;
BEGIN
    -- Check for time-cost-quality triangle conflicts
    FOR v_criteria_1 IN 
        SELECT * FROM ppd_acceptance_criteria
        WHERE ppd_id = p_ppd_id
          AND is_deleted = false
          AND (LOWER(criteria_description) LIKE '%maximum%quality%' 
               OR LOWER(criteria_description) LIKE '%highest%quality%'
               OR LOWER(criteria_description) LIKE '%best%quality%')
    LOOP
        FOR v_criteria_2 IN 
            SELECT * FROM ppd_acceptance_criteria
            WHERE ppd_id = p_ppd_id
              AND is_deleted = false
              AND id != v_criteria_1.id
              AND ((LOWER(criteria_description) LIKE '%minimum%cost%' 
                    OR LOWER(criteria_description) LIKE '%lowest%cost%'
                    OR LOWER(criteria_description) LIKE '%cheapest%')
                   OR (LOWER(criteria_description) LIKE '%fastest%delivery%'
                       OR LOWER(criteria_description) LIKE '%earliest%delivery%'
                       OR LOWER(criteria_description) LIKE '%quickest%'))
        LOOP
            RETURN QUERY SELECT 
                'time_cost_quality_triangle'::VARCHAR,
                v_criteria_1.id,
                v_criteria_2.id,
                'High quality, low cost, and fast delivery rarely achievable together'::TEXT;
        END LOOP;
    END LOOP;
    
    -- Check for scope-budget conflicts
    FOR v_criteria_1 IN 
        SELECT * FROM ppd_acceptance_criteria
        WHERE ppd_id = p_ppd_id
          AND is_deleted = false
          AND (LOWER(criteria_description) LIKE '%maximum%feature%'
               OR LOWER(criteria_description) LIKE '%all%features%'
               OR LOWER(criteria_description) LIKE '%comprehensive%')
    LOOP
        FOR v_criteria_2 IN 
            SELECT * FROM ppd_acceptance_criteria
            WHERE ppd_id = p_ppd_id
              AND is_deleted = false
              AND id != v_criteria_1.id
              AND (LOWER(criteria_description) LIKE '%minimum%budget%'
                   OR LOWER(criteria_description) LIKE '%lowest%cost%')
        LOOP
            RETURN QUERY SELECT 
                'scope_budget_conflict'::VARCHAR,
                v_criteria_1.id,
                v_criteria_2.id,
                'Maximum features incompatible with minimum budget'::TEXT;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_criteria_consistency(UUID) IS 'Checks if criteria are consistent as a set (no conflicts)';

-- Function: Get Acceptance Status
CREATE OR REPLACE FUNCTION get_acceptance_status(p_project_id UUID)
RETURNS TABLE (
    total_criteria INTEGER,
    passed_criteria INTEGER,
    failed_criteria INTEGER,
    pending_criteria INTEGER,
    acceptance_percentage DECIMAL,
    can_close_project BOOLEAN
) AS $$
DECLARE
    v_ppd_id UUID;
    v_total INTEGER;
    v_passed INTEGER;
    v_failed INTEGER;
    v_pending INTEGER;
    v_percentage DECIMAL;
    v_must_have_failed INTEGER;
BEGIN
    -- Get PPD for project
    SELECT id INTO v_ppd_id
    FROM project_product_descriptions
    WHERE project_id = p_project_id
      AND is_deleted = false
    LIMIT 1;
    
    IF v_ppd_id IS NULL THEN
        RETURN QUERY SELECT 0, 0, 0, 0, 0::DECIMAL, false;
        RETURN;
    END IF;
    
    -- Count criteria
    SELECT 
        COUNT(*)::INTEGER,
        COUNT(*) FILTER (WHERE acceptance_status = 'passed')::INTEGER,
        COUNT(*) FILTER (WHERE acceptance_status = 'failed')::INTEGER,
        COUNT(*) FILTER (WHERE acceptance_status = 'pending')::INTEGER
    INTO v_total, v_passed, v_failed, v_pending
    FROM ppd_acceptance_criteria
    WHERE ppd_id = v_ppd_id
      AND is_deleted = false;
    
    -- Calculate percentage
    IF v_total > 0 THEN
        v_percentage := (v_passed::DECIMAL / v_total::DECIMAL) * 100;
    ELSE
        v_percentage := 0;
    END IF;
    
    -- Check if must-have criteria failed
    SELECT COUNT(*)::INTEGER INTO v_must_have_failed
    FROM ppd_acceptance_criteria
    WHERE ppd_id = v_ppd_id
      AND is_deleted = false
      AND priority = 'must_have'
      AND acceptance_status IN ('failed', 'pending');
    
    -- Can close if all must-have criteria passed and no failed criteria
    RETURN QUERY SELECT 
        v_total,
        v_passed,
        v_failed,
        v_pending,
        v_percentage,
        (v_must_have_failed = 0 AND v_failed = 0)::BOOLEAN AS can_close_project;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_acceptance_status(UUID) IS 'Returns overall acceptance status for a project';

-- Function: Record Criteria Acceptance
CREATE OR REPLACE FUNCTION record_criteria_acceptance(p_criteria_id UUID, p_status VARCHAR, p_user_id UUID, p_notes TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    v_ppd_id UUID;
BEGIN
    -- Get PPD ID
    SELECT ppd_id INTO v_ppd_id
    FROM ppd_acceptance_criteria
    WHERE id = p_criteria_id
      AND is_deleted = false;
    
    IF v_ppd_id IS NULL THEN
        RAISE EXCEPTION 'Acceptance criterion not found';
    END IF;
    
    -- Update criteria
    UPDATE ppd_acceptance_criteria
    SET acceptance_status = p_status,
        acceptance_date = CURRENT_DATE,
        acceptance_notes = p_notes,
        accepted_by = p_user_id,
        updated_at = NOW(),
        updated_by = p_user_id
    WHERE id = p_criteria_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION record_criteria_acceptance(UUID, VARCHAR, UUID, TEXT) IS 'Records acceptance result for a criterion';

-- ============================================================================
-- SECTION 13: REGISTER TABLES IN DATABASE_TABLES
-- ============================================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES 
    ('project_product_descriptions', 'Project Product Description - Overall project deliverable description', false, true, 'structured'),
    ('ppd_composition_items', 'PPD Composition Items - Major products/deliverables', false, true, 'structured'),
    ('ppd_derivations', 'PPD Derivations - Source products/documents', false, true, 'structured'),
    ('ppd_acceptance_criteria', 'PPD Acceptance Criteria - Acceptance criteria for project product', false, true, 'structured'),
    ('ppd_quality_expectations', 'PPD Quality Expectations - Customer quality expectations', false, true, 'structured'),
    ('ppd_skills_required', 'PPD Skills Required - Development skills needed', false, true, 'structured'),
    ('ppd_acceptance_responsibilities', 'PPD Acceptance Responsibilities - Who accepts what', false, true, 'structured'),
    ('ppd_revision_history', 'PPD Revision History - Version history', false, true, 'structured'),
    ('ppd_approvals', 'PPD Approvals - Approval records', false, true, 'structured'),
    ('ppd_distribution', 'PPD Distribution - Distribution list', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE project_product_descriptions IS 'Project Product Description - Describes what the project will deliver as its final output';
COMMENT ON TABLE ppd_composition_items IS 'Major products/deliverables that make up the project product';
COMMENT ON TABLE ppd_derivations IS 'Source products/documents from which PPD is derived';
COMMENT ON TABLE ppd_acceptance_criteria IS 'Acceptance criteria that must be met for project product acceptance';
COMMENT ON TABLE ppd_quality_expectations IS 'Customer quality expectations for the project product';
COMMENT ON TABLE ppd_skills_required IS 'Development skills required to build the project product';
COMMENT ON TABLE ppd_acceptance_responsibilities IS 'Who is responsible for accepting which parts of the project product';
COMMENT ON TABLE ppd_revision_history IS 'Version history of PPD changes';
COMMENT ON TABLE ppd_approvals IS 'Approval records for PPD';
COMMENT ON TABLE ppd_distribution IS 'Distribution list for PPD';

DO $$
BEGIN
    RAISE NOTICE 'v177_project_product_description_tables.sql completed successfully';
END $$;

-- ============================================================================
-- Product Description Implementation - Individual Product Descriptions
-- Version: v207
-- Description: Creates comprehensive Product Description structure for individual products/deliverables
-- Date: 2026-01-20
-- ============================================================================
--
-- Purpose:
-- Implements the Product Description module based on structured project management methodology.
-- A Product Description is a formal document that describes an individual product/deliverable in detail.
-- It defines the purpose, composition, quality expectations, acceptance criteria, and development 
-- requirements for a specific product - essentially defining what "done" looks like for that individual product.
-- This is different from Project Product Description (PPD) which describes the overall project deliverable.
--
-- Strategy:
-- 1. Create product_descriptions main table (multiple per project, one per product)
-- 2. Create 9 supporting tables:
--    - pd_composition_items (sub-products if composite)
--    - pd_derivations (source products/specifications)
--    - pd_acceptance_criteria (acceptance criteria items)
--    - pd_quality_expectations (detailed quality expectations)
--    - pd_skills_required (development skills)
--    - pd_acceptance_responsibilities (who accepts what)
--    - pd_revision_history (version history)
--    - pd_approvals (approval records)
--    - pd_distribution (distribution list)
-- 3. Create functions for reference generation, validation, creation from related items
-- 4. Set up triggers for auto-generation and audit
-- 5. Enhance existing tables (product_deliverables, ppd_composition_items) with product_description_id
-- 6. Set up RLS policies (in separate file v208)
--
-- Prerequisites:
-- - v01 through v07 must be run first (core tables and trigger functions)
-- - v24_structured_pm_mp.sql must be run (product_deliverables table)
-- - v177_project_product_description_tables.sql must be run (ppd_composition_items table)
-- - v194_configuration_item_record_tables.sql must be run (configuration_items table - optional)
-- - projects table must exist
-- - users table must exist
-- - change_requests table must exist
-- - project_mandates table must exist
--
-- Relationship Design:
-- - Multiple Product Descriptions per project (one per product/deliverable)
-- - One Product Description per product_deliverable (UNIQUE constraint if linked)
-- - One Product Description per ppd_composition_item (UNIQUE constraint if linked)
--
-- ============================================================================
-- SECTION 1: CREATE ENUM TYPES
-- ============================================================================

-- Product Description Status Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pd_status_enum') THEN
        CREATE TYPE pd_status_enum AS ENUM ('draft', 'under_review', 'approved', 'superseded');
    END IF;
END $$;

-- Sub-Product Type Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pd_sub_product_type_enum') THEN
        CREATE TYPE pd_sub_product_type_enum AS ENUM ('component', 'module', 'feature', 'document', 'service', 'capability', 'other');
    END IF;
END $$;

-- Derivation Type Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pd_derivation_type_enum') THEN
        CREATE TYPE pd_derivation_type_enum AS ENUM ('existing_product', 'design_specification', 'feasibility_report', 'requirements_document', 'project_mandate', 'ppd', 'standard', 'regulation', 'other');
    END IF;
END $$;

-- Acceptance Criteria Category Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pd_criteria_category_enum') THEN
        CREATE TYPE pd_criteria_category_enum AS ENUM ('functional', 'performance', 'quality', 'usability', 'security', 'compliance', 'operational', 'maintenance', 'other');
    END IF;
END $$;

-- Stakeholder Group Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pd_stakeholder_group_enum') THEN
        CREATE TYPE pd_stakeholder_group_enum AS ENUM ('users', 'operations', 'maintenance', 'management', 'regulatory', 'all');
    END IF;
END $$;

-- Priority Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pd_priority_enum') THEN
        CREATE TYPE pd_priority_enum AS ENUM ('must_have', 'should_have', 'could_have', 'wont_have');
    END IF;
END $$;

-- Acceptance Status Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pd_acceptance_status_enum') THEN
        CREATE TYPE pd_acceptance_status_enum AS ENUM ('pending', 'passed', 'failed', 'waived', 'deferred');
    END IF;
END $$;

-- Quality Expectation Category Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pd_quality_category_enum') THEN
        CREATE TYPE pd_quality_category_enum AS ENUM ('performance', 'reliability', 'usability', 'security', 'maintainability', 'portability', 'scalability', 'compliance', 'other');
    END IF;
END $$;

-- Quality Priority Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pd_quality_priority_enum') THEN
        CREATE TYPE pd_quality_priority_enum AS ENUM ('critical', 'high', 'medium', 'low');
    END IF;
END $$;

-- Skill Category Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pd_skill_category_enum') THEN
        CREATE TYPE pd_skill_category_enum AS ENUM ('technical', 'management', 'domain', 'soft_skills', 'certification', 'other');
    END IF;
END $$;

-- Proficiency Level Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pd_proficiency_level_enum') THEN
        CREATE TYPE pd_proficiency_level_enum AS ENUM ('basic', 'intermediate', 'advanced', 'expert');
    END IF;
END $$;

-- Responsibility Type Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pd_responsibility_type_enum') THEN
        CREATE TYPE pd_responsibility_type_enum AS ENUM ('accepts_product', 'accepts_subset', 'signs_off', 'approves', 'reviews');
    END IF;
END $$;

-- Approval Status Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pd_approval_status_enum') THEN
        CREATE TYPE pd_approval_status_enum AS ENUM ('pending', 'approved', 'rejected');
    END IF;
END $$;

-- ============================================================================
-- SECTION 2: MAIN TABLE - product_descriptions
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_descriptions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship (Multiple descriptions per project)
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Document Identification
    pd_reference VARCHAR(100) UNIQUE NOT NULL, -- e.g., PD-2026-001
    document_ref VARCHAR(200), -- External document reference
    version_number VARCHAR(20) DEFAULT '1.0',
    release VARCHAR(50), -- Release identifier

    -- Product Links
    product_deliverable_id UUID REFERENCES product_deliverables(id) ON DELETE SET NULL, -- Links to delivery tracking
    ppd_composition_item_id UUID REFERENCES ppd_composition_items(id) ON DELETE SET NULL, -- Links to PPD composition
    configuration_item_id UUID REFERENCES configuration_items(id) ON DELETE SET NULL, -- Links to Configuration Item Record (v194)

    -- Ownership
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    author_name VARCHAR(200), -- For external authors
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    owner_name VARCHAR(200), -- For external owners
    client_id UUID REFERENCES users(id) ON DELETE SET NULL,
    client_name VARCHAR(200), -- For external clients

    -- Core Content
    product_title VARCHAR(500) NOT NULL, -- Name of the product
    purpose TEXT NOT NULL, -- Purpose the product will fulfill and who will use it
    composition TEXT, -- Description of sub-products if composite product
    derivation TEXT, -- Source products/specifications from which this is derived

    -- Skills & Resources
    development_skills_required TEXT, -- Skills needed to develop this product
    resource_areas TEXT, -- Which areas should supply resources

    -- Quality & Acceptance
    customer_quality_expectations TEXT, -- Quality expected and standards/processes for this product
    quality_characteristics TEXT, -- Key quality characteristics (fast/slow, large/small)
    quality_management_system TEXT, -- Customer's QMS elements to use
    applicable_standards TEXT, -- Other standards to apply
    satisfaction_targets TEXT, -- Customer/staff satisfaction targets

    -- Tolerances
    product_quality_tolerances TEXT, -- Tolerances for acceptance criteria

    -- Acceptance Process
    acceptance_method TEXT, -- How acceptance will be confirmed
    acceptance_responsibilities TEXT, -- Who confirms acceptance
    handover_arrangements TEXT, -- Complex handover details if applicable
    phased_handover BOOLEAN DEFAULT false, -- Whether phased handover planned

    -- Status
    status pd_status_enum DEFAULT 'draft',
    approved_date DATE,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Constraints
    CONSTRAINT uk_pd_product_deliverable UNIQUE NULLS NOT DISTINCT (product_deliverable_id),
    CONSTRAINT uk_pd_ppd_composition UNIQUE NULLS NOT DISTINCT (ppd_composition_item_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_descriptions_project_id ON product_descriptions(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_product_descriptions_pd_reference ON product_descriptions(pd_reference) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_product_descriptions_status ON product_descriptions(status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_product_descriptions_product_deliverable_id ON product_descriptions(product_deliverable_id) WHERE product_deliverable_id IS NOT NULL AND is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_product_descriptions_ppd_composition_item_id ON product_descriptions(ppd_composition_item_id) WHERE ppd_composition_item_id IS NOT NULL AND is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_product_descriptions_configuration_item_id ON product_descriptions(configuration_item_id) WHERE configuration_item_id IS NOT NULL AND is_deleted = false;

-- ============================================================================
-- SECTION 3: COMPOSITION ITEMS - pd_composition_items
-- ============================================================================

CREATE TABLE IF NOT EXISTS pd_composition_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_description_id UUID NOT NULL REFERENCES product_descriptions(id) ON DELETE CASCADE,
    item_number INTEGER NOT NULL, -- Display order
    sub_product_name VARCHAR(200) NOT NULL,
    sub_product_description TEXT,
    sub_product_type pd_sub_product_type_enum DEFAULT 'component',
    linked_product_description_id UUID REFERENCES product_descriptions(id) ON DELETE SET NULL, -- Link to another Product Description if detailed
    linked_product_deliverable_id UUID REFERENCES product_deliverables(id) ON DELETE SET NULL, -- Link to delivery tracking
    is_mandatory BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Ensure unique item numbers per Product Description
    UNIQUE(product_description_id, item_number)
);

CREATE INDEX IF NOT EXISTS idx_pd_composition_items_pd_id ON pd_composition_items(product_description_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_pd_composition_items_linked_pd_id ON pd_composition_items(linked_product_description_id) WHERE linked_product_description_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pd_composition_items_linked_deliverable_id ON pd_composition_items(linked_product_deliverable_id) WHERE linked_product_deliverable_id IS NOT NULL;

-- ============================================================================
-- SECTION 4: DERIVATIONS - pd_derivations
-- ============================================================================

CREATE TABLE IF NOT EXISTS pd_derivations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_description_id UUID NOT NULL REFERENCES product_descriptions(id) ON DELETE CASCADE,
    derivation_type pd_derivation_type_enum NOT NULL,
    derivation_title VARCHAR(200) NOT NULL,
    derivation_description TEXT,
    derivation_reference VARCHAR(200), -- External reference
    linked_document_id UUID, -- Internal document link (no FK as document storage may vary)
    linked_ppd_id UUID REFERENCES project_product_descriptions(id) ON DELETE SET NULL, -- Link to Project Product Description
    linked_ppd_composition_item_id UUID REFERENCES ppd_composition_items(id) ON DELETE SET NULL,
    mandate_id UUID REFERENCES project_mandates(id) ON DELETE SET NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pd_derivations_pd_id ON pd_derivations(product_description_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_pd_derivations_display_order ON pd_derivations(product_description_id, display_order);

-- ============================================================================
-- SECTION 5: ACCEPTANCE CRITERIA - pd_acceptance_criteria
-- ============================================================================

CREATE TABLE IF NOT EXISTS pd_acceptance_criteria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_description_id UUID NOT NULL REFERENCES product_descriptions(id) ON DELETE CASCADE,
    criteria_number INTEGER, -- For reference
    criteria_reference VARCHAR(50), -- e.g., AC-001
    criteria_title VARCHAR(200) NOT NULL, -- Brief title
    criteria_description TEXT NOT NULL, -- Full description
    criteria_category pd_criteria_category_enum DEFAULT 'functional',
    stakeholder_group pd_stakeholder_group_enum DEFAULT 'all',
    priority pd_priority_enum DEFAULT 'must_have',

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
    validation_notes TEXT,

    -- Status
    acceptance_status pd_acceptance_status_enum DEFAULT 'pending',
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

    -- Ensure unique criteria references per Product Description
    UNIQUE(product_description_id, criteria_reference)
);

CREATE INDEX IF NOT EXISTS idx_pd_acceptance_criteria_pd_id ON pd_acceptance_criteria(product_description_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_pd_acceptance_criteria_reference ON pd_acceptance_criteria(criteria_reference) WHERE criteria_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pd_acceptance_criteria_status ON pd_acceptance_criteria(acceptance_status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_pd_acceptance_criteria_display_order ON pd_acceptance_criteria(product_description_id, display_order);

-- ============================================================================
-- SECTION 6: QUALITY EXPECTATIONS - pd_quality_expectations
-- ============================================================================

CREATE TABLE IF NOT EXISTS pd_quality_expectations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_description_id UUID NOT NULL REFERENCES product_descriptions(id) ON DELETE CASCADE,
    expectation_category pd_quality_category_enum DEFAULT 'other',
    expectation_description TEXT NOT NULL,
    priority pd_quality_priority_enum DEFAULT 'medium',
    source VARCHAR(200), -- Who/what is the source of this expectation
    standard_reference VARCHAR(200), -- Related standard if any
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pd_quality_expectations_pd_id ON pd_quality_expectations(product_description_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_pd_quality_expectations_display_order ON pd_quality_expectations(product_description_id, display_order);

-- ============================================================================
-- SECTION 7: SKILLS REQUIRED - pd_skills_required
-- ============================================================================

CREATE TABLE IF NOT EXISTS pd_skills_required (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_description_id UUID NOT NULL REFERENCES product_descriptions(id) ON DELETE CASCADE,
    skill_name VARCHAR(200) NOT NULL,
    skill_description TEXT,
    skill_category pd_skill_category_enum DEFAULT 'technical',
    proficiency_level pd_proficiency_level_enum DEFAULT 'intermediate',
    required_for TEXT, -- Which parts of product need this skill
    resource_area VARCHAR(200), -- Which area should provide this
    is_critical BOOLEAN DEFAULT false, -- Critical skill
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pd_skills_required_pd_id ON pd_skills_required(product_description_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_pd_skills_required_critical ON pd_skills_required(product_description_id, is_critical) WHERE is_critical = true;
CREATE INDEX IF NOT EXISTS idx_pd_skills_required_display_order ON pd_skills_required(product_description_id, display_order);

-- ============================================================================
-- SECTION 8: ACCEPTANCE RESPONSIBILITIES - pd_acceptance_responsibilities
-- ============================================================================

CREATE TABLE IF NOT EXISTS pd_acceptance_responsibilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_description_id UUID NOT NULL REFERENCES product_descriptions(id) ON DELETE CASCADE,
    responsibility_type pd_responsibility_type_enum DEFAULT 'accepts_product',
    role_name VARCHAR(200) NOT NULL, -- e.g., "Product Owner", "Operations Manager"
    role_description TEXT,
    assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_to_name VARCHAR(200),
    acceptance_criteria_ids UUID[], -- Which acceptance criteria this role accepts
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pd_acceptance_responsibilities_pd_id ON pd_acceptance_responsibilities(product_description_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_pd_acceptance_responsibilities_assigned_to ON pd_acceptance_responsibilities(assigned_to_id) WHERE assigned_to_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pd_acceptance_responsibilities_display_order ON pd_acceptance_responsibilities(product_description_id, display_order);

-- ============================================================================
-- SECTION 9: REVISION HISTORY - pd_revision_history
-- ============================================================================

CREATE TABLE IF NOT EXISTS pd_revision_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_description_id UUID NOT NULL REFERENCES product_descriptions(id) ON DELETE CASCADE,
    revision_date DATE NOT NULL,
    previous_revision_date DATE,
    summary_of_changes TEXT NOT NULL,
    changes_marked TEXT,
    revised_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    change_request_id UUID REFERENCES change_requests(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pd_revision_history_pd_id ON pd_revision_history(product_description_id);
CREATE INDEX IF NOT EXISTS idx_pd_revision_history_revision_date ON pd_revision_history(product_description_id, revision_date DESC);

-- ============================================================================
-- SECTION 10: APPROVALS - pd_approvals
-- ============================================================================

CREATE TABLE IF NOT EXISTS pd_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_description_id UUID NOT NULL REFERENCES product_descriptions(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    approver_name VARCHAR(200) NOT NULL,
    approver_title VARCHAR(200),
    signature_data TEXT, -- For future signature capture
    approval_date DATE,
    approval_status pd_approval_status_enum DEFAULT 'pending',
    comments TEXT,
    version_approved VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pd_approvals_pd_id ON pd_approvals(product_description_id);
CREATE INDEX IF NOT EXISTS idx_pd_approvals_status ON pd_approvals(approval_status);
CREATE INDEX IF NOT EXISTS idx_pd_approvals_approver_id ON pd_approvals(approver_id);

-- ============================================================================
-- SECTION 11: DISTRIBUTION - pd_distribution
-- ============================================================================

CREATE TABLE IF NOT EXISTS pd_distribution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_description_id UUID NOT NULL REFERENCES product_descriptions(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_name VARCHAR(200) NOT NULL,
    recipient_title VARCHAR(200),
    date_of_issue DATE NOT NULL,
    version_distributed VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pd_distribution_pd_id ON pd_distribution(product_description_id);
CREATE INDEX IF NOT EXISTS idx_pd_distribution_recipient_id ON pd_distribution(recipient_id) WHERE recipient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pd_distribution_date ON pd_distribution(date_of_issue DESC);

-- ============================================================================
-- SECTION 12: ENHANCE EXISTING TABLES
-- ============================================================================

-- Add product_description_id to product_deliverables
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_deliverables' 
        AND column_name = 'product_description_id'
    ) THEN
        ALTER TABLE product_deliverables 
        ADD COLUMN product_description_id UUID REFERENCES product_descriptions(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_product_deliverables_product_description_id 
        ON product_deliverables(product_description_id) 
        WHERE product_description_id IS NOT NULL AND is_deleted = false;
    END IF;
END $$;

-- Add product_description_id to ppd_composition_items
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ppd_composition_items' 
        AND column_name = 'product_description_id'
    ) THEN
        ALTER TABLE ppd_composition_items 
        ADD COLUMN product_description_id UUID REFERENCES product_descriptions(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_ppd_composition_items_product_description_id 
        ON ppd_composition_items(product_description_id) 
        WHERE product_description_id IS NOT NULL AND is_deleted = false;
    END IF;
END $$;

-- ============================================================================
-- SECTION 13: DATABASE FUNCTIONS
-- ============================================================================

-- Function: Generate Product Description Reference
CREATE OR REPLACE FUNCTION generate_pd_reference(p_project_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_project_ref VARCHAR;
    v_year INTEGER;
    v_sequence INTEGER;
    v_reference VARCHAR;
BEGIN
    -- Get project reference (if available)
    SELECT project_reference INTO v_project_ref
    FROM projects
    WHERE id = p_project_id;
    
    -- Get current year
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(pd_reference FROM 'PD-' || v_year || '-(.+)$') AS INTEGER)
    ), 0) + 1
    INTO v_sequence
    FROM product_descriptions
    WHERE pd_reference LIKE 'PD-' || v_year || '-%'
      AND is_deleted = false;
    
    -- Format: PD-YYYY-NNN
    v_reference := 'PD-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0');
    
    RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

-- Function: Create Product Description from Product Deliverable
CREATE OR REPLACE FUNCTION create_pd_for_product_deliverable(
    p_product_deliverable_id UUID,
    p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_pd_id UUID;
    v_deliverable RECORD;
BEGIN
    -- Get deliverable details
    SELECT * INTO v_deliverable
    FROM product_deliverables
    WHERE id = p_product_deliverable_id
      AND is_deleted = false;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product deliverable not found';
    END IF;
    
    -- Check if PD already exists
    SELECT id INTO v_pd_id
    FROM product_descriptions
    WHERE product_deliverable_id = p_product_deliverable_id
      AND is_deleted = false;
    
    IF v_pd_id IS NOT NULL THEN
        RAISE EXCEPTION 'Product Description already exists for this deliverable';
    END IF;
    
    -- Generate reference
    DECLARE
        v_reference VARCHAR;
    BEGIN
        v_reference := generate_pd_reference(v_deliverable.project_id);
        
        -- Create Product Description
        INSERT INTO product_descriptions (
            project_id,
            pd_reference,
            product_deliverable_id,
            product_title,
            purpose,
            acceptance_criteria,
            author_id,
            owner_id,
            created_by,
            status
        ) VALUES (
            v_deliverable.project_id,
            v_reference,
            p_product_deliverable_id,
            v_deliverable.product_name,
            COALESCE(v_deliverable.product_description, 'Product Description for ' || v_deliverable.product_name),
            v_deliverable.acceptance_criteria,
            p_user_id,
            v_deliverable.assigned_to_user_id,
            p_user_id,
            'draft'
        ) RETURNING id INTO v_pd_id;
        
        RETURN v_pd_id;
    END;
END;
$$ LANGUAGE plpgsql;

-- Function: Create Product Description from PPD Composition Item
CREATE OR REPLACE FUNCTION create_pd_from_ppd_composition_item(
    p_ppd_composition_item_id UUID,
    p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_pd_id UUID;
    v_composition_item RECORD;
    v_ppd RECORD;
BEGIN
    -- Get composition item details
    SELECT ci.*, ppd.project_id INTO v_composition_item
    FROM ppd_composition_items ci
    JOIN project_product_descriptions ppd ON ci.ppd_id = ppd.id
    WHERE ci.id = p_ppd_composition_item_id
      AND ci.is_deleted = false;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'PPD composition item not found';
    END IF;
    
    -- Check if PD already exists
    SELECT id INTO v_pd_id
    FROM product_descriptions
    WHERE ppd_composition_item_id = p_ppd_composition_item_id
      AND is_deleted = false;
    
    IF v_pd_id IS NOT NULL THEN
        RAISE EXCEPTION 'Product Description already exists for this composition item';
    END IF;
    
    -- Generate reference
    DECLARE
        v_reference VARCHAR;
    BEGIN
        v_reference := generate_pd_reference(v_composition_item.project_id);
        
        -- Create Product Description
        INSERT INTO product_descriptions (
            project_id,
            pd_reference,
            ppd_composition_item_id,
            product_title,
            purpose,
            composition,
            author_id,
            created_by,
            status
        ) VALUES (
            v_composition_item.project_id,
            v_reference,
            p_ppd_composition_item_id,
            v_composition_item.product_name,
            COALESCE(v_composition_item.product_description, 'Product Description for ' || v_composition_item.product_name),
            v_composition_item.product_description,
            p_user_id,
            p_user_id,
            'draft'
        ) RETURNING id INTO v_pd_id;
        
        RETURN v_pd_id;
    END;
END;
$$ LANGUAGE plpgsql;

-- Function: Validate Product Description Completeness
CREATE OR REPLACE FUNCTION validate_pd_completeness(p_pd_id UUID)
RETURNS TABLE (
    section_name VARCHAR,
    is_complete BOOLEAN,
    missing_items TEXT[],
    recommendations TEXT
) AS $$
DECLARE
    v_pd RECORD;
    v_criteria_count INTEGER;
    v_quality_count INTEGER;
    v_skills_count INTEGER;
BEGIN
    -- Get Product Description
    SELECT * INTO v_pd
    FROM product_descriptions
    WHERE id = p_pd_id
      AND is_deleted = false;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product Description not found';
    END IF;
    
    -- Check Introduction section
    IF v_pd.product_title IS NULL OR LENGTH(TRIM(v_pd.product_title)) < 3 THEN
        RETURN QUERY SELECT 
            'Introduction'::VARCHAR,
            false::BOOLEAN,
            ARRAY['Product title is required (minimum 3 characters)']::TEXT[],
            'Enter a clear product title'::TEXT;
    ELSE
        RETURN QUERY SELECT 
            'Introduction'::VARCHAR,
            true::BOOLEAN,
            ARRAY[]::TEXT[],
            NULL::TEXT;
    END IF;
    
    -- Check Purpose
    IF v_pd.purpose IS NULL OR LENGTH(TRIM(v_pd.purpose)) < 50 THEN
        RETURN QUERY SELECT 
            'Purpose'::VARCHAR,
            false::BOOLEAN,
            ARRAY['Purpose is required (minimum 50 characters)']::TEXT[],
            'Describe the purpose the product will fulfill and who will use it'::TEXT;
    ELSE
        RETURN QUERY SELECT 
            'Purpose'::VARCHAR,
            true::BOOLEAN,
            ARRAY[]::TEXT[],
            NULL::TEXT;
    END IF;
    
    -- Check Acceptance Criteria
    SELECT COUNT(*) INTO v_criteria_count
    FROM pd_acceptance_criteria
    WHERE product_description_id = p_pd_id
      AND is_deleted = false;
    
    IF v_criteria_count = 0 THEN
        RETURN QUERY SELECT 
            'Acceptance Criteria'::VARCHAR,
            false::BOOLEAN,
            ARRAY['At least one acceptance criterion is required']::TEXT[],
            'Add acceptance criteria to define what "done" looks like'::TEXT;
    ELSE
        RETURN QUERY SELECT 
            'Acceptance Criteria'::VARCHAR,
            true::BOOLEAN,
            ARRAY[]::TEXT[],
            NULL::TEXT;
    END IF;
    
    -- Check Quality Expectations
    SELECT COUNT(*) INTO v_quality_count
    FROM pd_quality_expectations
    WHERE product_description_id = p_pd_id
      AND is_deleted = false;
    
    IF v_quality_count = 0 AND (v_pd.customer_quality_expectations IS NULL OR LENGTH(TRIM(v_pd.customer_quality_expectations)) = 0) THEN
        RETURN QUERY SELECT 
            'Quality Expectations'::VARCHAR,
            false::BOOLEAN,
            ARRAY['Quality expectations should be defined']::TEXT[],
            'Add quality expectations or detailed quality expectations'::TEXT;
    ELSE
        RETURN QUERY SELECT 
            'Quality Expectations'::VARCHAR,
            true::BOOLEAN,
            ARRAY[]::TEXT[],
            NULL::TEXT;
    END IF;
    
    -- Check Skills Required
    SELECT COUNT(*) INTO v_skills_count
    FROM pd_skills_required
    WHERE product_description_id = p_pd_id
      AND is_deleted = false;
    
    IF v_skills_count = 0 AND (v_pd.development_skills_required IS NULL OR LENGTH(TRIM(v_pd.development_skills_required)) = 0) THEN
        RETURN QUERY SELECT 
            'Skills Required'::VARCHAR,
            false::BOOLEAN,
            ARRAY['Development skills should be identified']::TEXT[],
            'Add skills required or detailed skills list'::TEXT;
    ELSE
        RETURN QUERY SELECT 
            'Skills Required'::VARCHAR,
            true::BOOLEAN,
            ARRAY[]::TEXT[],
            NULL::TEXT;
    END IF;
    
    -- Check Acceptance Responsibilities
    IF v_pd.acceptance_responsibilities IS NULL OR LENGTH(TRIM(v_pd.acceptance_responsibilities)) = 0 THEN
        RETURN QUERY SELECT 
            'Acceptance Responsibilities'::VARCHAR,
            false::BOOLEAN,
            ARRAY['Acceptance responsibilities should be defined']::TEXT[],
            'Define who will accept the product'::TEXT;
    ELSE
        RETURN QUERY SELECT 
            'Acceptance Responsibilities'::VARCHAR,
            true::BOOLEAN,
            ARRAY[]::TEXT[],
            NULL::TEXT;
    END IF;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function: Validate Acceptance Criteria Quality
CREATE OR REPLACE FUNCTION validate_acceptance_criteria_quality(p_pd_id UUID)
RETURNS TABLE (
    criteria_reference VARCHAR,
    criteria_title VARCHAR,
    is_measurable BOOLEAN,
    is_realistic BOOLEAN,
    is_provable BOOLEAN,
    issues TEXT[],
    recommendations TEXT
) AS $$
DECLARE
    v_criterion RECORD;
    v_issues TEXT[];
BEGIN
    FOR v_criterion IN 
        SELECT * FROM pd_acceptance_criteria
        WHERE product_description_id = p_pd_id
          AND is_deleted = false
        ORDER BY display_order
    LOOP
        v_issues := ARRAY[]::TEXT[];
        
        -- Check measurability
        IF NOT v_criterion.is_measurable THEN
            IF v_criterion.measurement_method IS NULL OR LENGTH(TRIM(v_criterion.measurement_method)) = 0 THEN
                v_issues := array_append(v_issues, 'Missing measurement method');
            END IF;
            IF v_criterion.target_value IS NULL OR LENGTH(TRIM(v_criterion.target_value)) = 0 THEN
                v_issues := array_append(v_issues, 'Missing target value');
            END IF;
        END IF;
        
        -- Check realism
        IF NOT v_criterion.is_realistic THEN
            v_issues := array_append(v_issues, 'Criterion not validated as realistic');
        END IF;
        
        -- Check provability
        IF NOT v_criterion.is_provable_in_project THEN
            IF v_criterion.proxy_measure IS NULL OR LENGTH(TRIM(v_criterion.proxy_measure)) = 0 THEN
                v_issues := array_append(v_issues, 'Not provable in project and no proxy measure defined');
            END IF;
        END IF;
        
        RETURN QUERY SELECT 
            v_criterion.criteria_reference,
            v_criterion.criteria_title,
            v_criterion.is_measurable,
            v_criterion.is_realistic,
            v_criterion.is_provable_in_project,
            v_issues,
            CASE 
                WHEN array_length(v_issues, 1) > 0 THEN 'Review and address the issues listed'
                ELSE NULL
            END;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function: Get Product Description by Product Deliverable
CREATE OR REPLACE FUNCTION get_pd_by_product_deliverable(p_product_deliverable_id UUID)
RETURNS UUID AS $$
DECLARE
    v_pd_id UUID;
BEGIN
    SELECT id INTO v_pd_id
    FROM product_descriptions
    WHERE product_deliverable_id = p_product_deliverable_id
      AND is_deleted = false
    LIMIT 1;
    
    RETURN v_pd_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Get Product Description by Composition Item
CREATE OR REPLACE FUNCTION get_pd_by_composition_item(p_ppd_composition_item_id UUID)
RETURNS UUID AS $$
DECLARE
    v_pd_id UUID;
BEGIN
    SELECT id INTO v_pd_id
    FROM product_descriptions
    WHERE ppd_composition_item_id = p_ppd_composition_item_id
      AND is_deleted = false
    LIMIT 1;
    
    RETURN v_pd_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate Acceptance Criteria Reference for Product Descriptions
-- Note: This is different from generate_criteria_reference in v177 (for PPD acceptance criteria)
-- We use a different function name (generate_pd_criteria_reference) to avoid conflicts
CREATE OR REPLACE FUNCTION generate_pd_criteria_reference(p_pd_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_sequence INTEGER;
    v_reference VARCHAR;
BEGIN
    -- Get next sequence number
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(criteria_reference FROM 'AC-(.+)$') AS INTEGER)
    ), 0) + 1
    INTO v_sequence
    FROM pd_acceptance_criteria
    WHERE product_description_id = p_pd_id
      AND criteria_reference LIKE 'AC-%'
      AND is_deleted = false;
    
    -- Format: AC-NNN
    v_reference := 'AC-' || LPAD(v_sequence::TEXT, 3, '0');
    
    RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 14: TRIGGERS
-- ============================================================================

-- Trigger: Auto-generate pd_reference on INSERT
CREATE OR REPLACE FUNCTION trigger_generate_pd_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.pd_reference IS NULL OR NEW.pd_reference = '' THEN
        NEW.pd_reference := generate_pd_reference(NEW.project_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_product_descriptions_generate_reference
    BEFORE INSERT ON product_descriptions
    FOR EACH ROW
    WHEN (NEW.pd_reference IS NULL OR NEW.pd_reference = '')
    EXECUTE FUNCTION trigger_generate_pd_reference();

-- Trigger: Auto-generate criteria_reference on INSERT
CREATE OR REPLACE FUNCTION trigger_generate_criteria_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.criteria_reference IS NULL OR NEW.criteria_reference = '' THEN
        NEW.criteria_reference := generate_pd_criteria_reference(NEW.product_description_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pd_acceptance_criteria_generate_reference
    BEFORE INSERT ON pd_acceptance_criteria
    FOR EACH ROW
    WHEN (NEW.criteria_reference IS NULL OR NEW.criteria_reference = '')
    EXECUTE FUNCTION trigger_generate_criteria_reference();

-- Trigger: Auto-increment criteria_number
CREATE OR REPLACE FUNCTION trigger_auto_increment_criteria_number()
RETURNS TRIGGER AS $$
DECLARE
    v_max_number INTEGER;
BEGIN
    IF NEW.criteria_number IS NULL THEN
        SELECT COALESCE(MAX(criteria_number), 0) + 1
        INTO v_max_number
        FROM pd_acceptance_criteria
        WHERE product_description_id = NEW.product_description_id
          AND is_deleted = false;
        
        NEW.criteria_number := v_max_number;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pd_acceptance_criteria_auto_number
    BEFORE INSERT ON pd_acceptance_criteria
    FOR EACH ROW
    WHEN (NEW.criteria_number IS NULL)
    EXECUTE FUNCTION trigger_auto_increment_criteria_number();

-- Trigger: Audit trail for all tables
CREATE TRIGGER trigger_product_descriptions_audit
    BEFORE INSERT OR UPDATE ON product_descriptions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trigger_product_descriptions_update_audit
    BEFORE UPDATE ON product_descriptions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_audit_fields();

-- Apply audit triggers to child tables
CREATE TRIGGER trigger_pd_composition_items_audit
    BEFORE INSERT OR UPDATE ON pd_composition_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trigger_pd_composition_items_update_audit
    BEFORE UPDATE ON pd_composition_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_audit_fields();

CREATE TRIGGER trigger_pd_acceptance_criteria_audit
    BEFORE INSERT OR UPDATE ON pd_acceptance_criteria
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trigger_pd_acceptance_criteria_update_audit
    BEFORE UPDATE ON pd_acceptance_criteria
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_audit_fields();

CREATE TRIGGER trigger_pd_acceptance_responsibilities_audit
    BEFORE INSERT OR UPDATE ON pd_acceptance_responsibilities
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trigger_pd_acceptance_responsibilities_update_audit
    BEFORE UPDATE ON pd_acceptance_responsibilities
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_audit_fields();

-- ============================================================================
-- SECTION 15: REGISTER TABLES IN database_tables
-- ============================================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES 
    ('product_descriptions', 'Individual Product Descriptions - formal specifications for products/deliverables', false, true, 'product_management'),
    ('pd_composition_items', 'Sub-products/components for composite products', false, true, 'product_management'),
    ('pd_derivations', 'Source products/specifications from which product is derived', false, true, 'product_management'),
    ('pd_acceptance_criteria', 'Acceptance criteria items with validation', false, true, 'product_management'),
    ('pd_quality_expectations', 'Detailed quality expectations', false, true, 'product_management'),
    ('pd_skills_required', 'Development skills required', false, true, 'product_management'),
    ('pd_acceptance_responsibilities', 'Who accepts what - acceptance responsibilities', false, true, 'product_management'),
    ('pd_revision_history', 'Product Description revision history', false, true, 'product_management'),
    ('pd_approvals', 'Product Description approval records', false, true, 'product_management'),
    ('pd_distribution', 'Product Description distribution list', false, true, 'product_management')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

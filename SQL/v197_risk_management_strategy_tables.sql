-- ============================================================================
-- Risk Management Strategy Implementation - Comprehensive RMS Module
-- Version: v197
-- Description: Creates comprehensive Risk Management Strategy structure
-- Date: 2026-01-19
-- ============================================================================
--
-- Purpose:
-- Implements the Risk Management Strategy module based on structured project management methodology.
-- The Risk Management Strategy defines HOW risk management will be achieved in the project. It establishes
-- the risk management procedures, tools, techniques, roles, responsibilities, and timing for all
-- risk activities.
--
-- Strategy:
-- 1. Create risk_management_strategies main table (one per project)
-- 2. Create supporting tables (standards, identification methods, assessment scales, risk matrix,
--    response strategies, tools, templates, records, reports, activities, roles)
-- 3. Create functions for reference generation, validation, conformance checking, integration with Risk Register
-- 4. Set up triggers for auto-generation and validation
-- 5. Set up RLS policies (in separate file)
--
-- Prerequisites:
-- - v01 through v07 must be run first (core tables and trigger functions)
-- - v172_risk_register_enhancement.sql (Risk Register tables - for integration)
-- - projects table must exist
-- - users table must exist
-- - accounts table must exist (for organisation-level access)
-- - risk_registers table exists (v172) - for integration
--
-- ============================================================================
-- SECTION 1: MAIN TABLE - risk_management_strategies
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_management_strategies (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship (One strategy per project)
    project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Document Identification
    rms_reference VARCHAR(50) UNIQUE NOT NULL, -- e.g., RMS-2026-001
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

    -- Introduction Section
    purpose TEXT NOT NULL, -- Purpose of the strategy
    objectives TEXT NOT NULL, -- Risk management objectives for the project
    scope TEXT NOT NULL, -- Scope of risk management
    strategy_responsibility TEXT, -- Who is responsible for the strategy

    -- Risk Management Procedure
    risk_identification_approach TEXT NOT NULL, -- Approach to risk identification
    risk_assessment_approach TEXT NOT NULL, -- Approach to risk assessment
    risk_response_approach TEXT NOT NULL, -- Approach to risk response
    risk_monitoring_approach TEXT, -- Approach to risk monitoring
    variance_from_corporate TEXT, -- Any variance from corporate standards
    variance_justification TEXT, -- Justification for variance

    -- References
    customer_risk_standards_reference TEXT, -- Customer's risk management elements to use
    supplier_risk_standards_reference TEXT, -- Supplier's risk management elements to use
    corporate_risk_policy_reference TEXT, -- Corporate policy reference
    programme_risk_policy_reference TEXT, -- Programme policy reference

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
CREATE INDEX IF NOT EXISTS idx_rms_project_id ON risk_management_strategies(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_rms_status ON risk_management_strategies(status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_rms_reference ON risk_management_strategies(rms_reference) WHERE is_deleted = false;

-- ============================================================================
-- SECTION 2: RISK STANDARDS - rms_risk_standards
-- ============================================================================

CREATE TABLE IF NOT EXISTS rms_risk_standards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rms_id UUID NOT NULL REFERENCES risk_management_strategies(id) ON DELETE CASCADE,
    standard_code VARCHAR(100) NOT NULL, -- e.g., ISO 31000, PMI Risk Management
    standard_name VARCHAR(200) NOT NULL,
    standard_version VARCHAR(50), -- Version of the standard
    standard_description TEXT,
    standard_type VARCHAR(50) DEFAULT 'international' CHECK (standard_type IN ('international', 'national', 'industry', 'corporate', 'customer', 'other')),
    applicability TEXT, -- How/where it applies
    compliance_level VARCHAR(50) DEFAULT 'recommended' CHECK (compliance_level IN ('mandatory', 'recommended', 'optional')),
    external_link VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rms_standards_rms_id ON rms_risk_standards(rms_id);
CREATE INDEX IF NOT EXISTS idx_rms_standards_type ON rms_risk_standards(standard_type);
CREATE INDEX IF NOT EXISTS idx_rms_standards_compliance ON rms_risk_standards(compliance_level);

-- ============================================================================
-- SECTION 3: IDENTIFICATION METHODS - rms_identification_methods
-- ============================================================================

CREATE TABLE IF NOT EXISTS rms_identification_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rms_id UUID NOT NULL REFERENCES risk_management_strategies(id) ON DELETE CASCADE,
    method_name VARCHAR(200) NOT NULL, -- e.g., Brainstorming, Delphi, Checklist, SWOT
    method_type VARCHAR(50) DEFAULT 'workshop' CHECK (method_type IN ('workshop', 'interview', 'checklist', 'analysis', 'review', 'expert_judgment', 'other')),
    method_description TEXT NOT NULL,
    when_to_use TEXT, -- When this method should be applied
    participants_required TEXT, -- Who should participate
    frequency VARCHAR(100), -- How often to use
    documentation_required TEXT, -- What to document
    is_mandatory BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rms_methods_rms_id ON rms_identification_methods(rms_id);
CREATE INDEX IF NOT EXISTS idx_rms_methods_type ON rms_identification_methods(method_type);
CREATE INDEX IF NOT EXISTS idx_rms_methods_mandatory ON rms_identification_methods(is_mandatory);

-- ============================================================================
-- SECTION 4: ASSESSMENT SCALES - rms_assessment_scales
-- ============================================================================

CREATE TABLE IF NOT EXISTS rms_assessment_scales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rms_id UUID NOT NULL REFERENCES risk_management_strategies(id) ON DELETE CASCADE,
    scale_type VARCHAR(50) NOT NULL CHECK (scale_type IN ('probability', 'impact', 'proximity')),
    scale_name VARCHAR(200) NOT NULL, -- e.g., Probability Scale, Cost Impact Scale
    scale_description TEXT,
    scale_config JSONB NOT NULL, -- Scale configuration (values, labels, ranges)
    applicable_to TEXT, -- Which risk types/categories
    is_default BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rms_scales_rms_id ON rms_assessment_scales(rms_id);
CREATE INDEX IF NOT EXISTS idx_rms_scales_type ON rms_assessment_scales(scale_type);
CREATE INDEX IF NOT EXISTS idx_rms_scales_default ON rms_assessment_scales(is_default);

-- ============================================================================
-- SECTION 5: RISK MATRIX - rms_risk_matrix
-- ============================================================================

CREATE TABLE IF NOT EXISTS rms_risk_matrix (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rms_id UUID NOT NULL REFERENCES risk_management_strategies(id) ON DELETE CASCADE,
    matrix_name VARCHAR(200) NOT NULL,
    matrix_description TEXT,
    probability_axis_config JSONB NOT NULL, -- Probability axis configuration
    impact_axis_config JSONB NOT NULL, -- Impact axis configuration
    risk_levels_config JSONB NOT NULL, -- Risk level thresholds and colors
    matrix_type VARCHAR(50) DEFAULT 'standard' CHECK (matrix_type IN ('standard', 'custom', 'qualitative', 'quantitative')),
    applicable_to TEXT, -- Which risk types/categories
    is_default BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rms_matrix_rms_id ON rms_risk_matrix(rms_id);
CREATE INDEX IF NOT EXISTS idx_rms_matrix_type ON rms_risk_matrix(matrix_type);
CREATE INDEX IF NOT EXISTS idx_rms_matrix_default ON rms_risk_matrix(is_default);

-- ============================================================================
-- SECTION 6: RESPONSE STRATEGIES - rms_response_strategies
-- ============================================================================

CREATE TABLE IF NOT EXISTS rms_response_strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rms_id UUID NOT NULL REFERENCES risk_management_strategies(id) ON DELETE CASCADE,
    strategy_name VARCHAR(200) NOT NULL, -- e.g., Avoid, Reduce, Transfer, Accept, Exploit, Enhance
    strategy_type VARCHAR(50) NOT NULL CHECK (strategy_type IN ('avoid', 'reduce', 'transfer', 'accept', 'share', 'exploit', 'enhance', 'reject')),
    applicable_to VARCHAR(50) DEFAULT 'both' CHECK (applicable_to IN ('threat', 'opportunity', 'both')),
    strategy_description TEXT NOT NULL,
    when_to_use TEXT, -- When this strategy should be applied
    implementation_guidance TEXT, -- How to implement
    examples TEXT, -- Example scenarios
    is_mandatory_for_levels TEXT[], -- Required for which risk levels (e.g., ['high', 'very_high'])
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rms_response_rms_id ON rms_response_strategies(rms_id);
CREATE INDEX IF NOT EXISTS idx_rms_response_type ON rms_response_strategies(strategy_type);
CREATE INDEX IF NOT EXISTS idx_rms_response_applicable ON rms_response_strategies(applicable_to);

-- ============================================================================
-- SECTION 7: TOOLS & TECHNIQUES - rms_tools_techniques
-- ============================================================================

CREATE TABLE IF NOT EXISTS rms_tools_techniques (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rms_id UUID NOT NULL REFERENCES risk_management_strategies(id) ON DELETE CASCADE,
    tool_name VARCHAR(200) NOT NULL,
    tool_type VARCHAR(50) DEFAULT 'software' CHECK (tool_type IN ('software', 'methodology', 'technique', 'checklist', 'framework', 'template', 'other')),
    tool_description TEXT NOT NULL,
    tool_purpose TEXT NOT NULL, -- What it's used for
    applicable_to TEXT, -- Which risk management steps it applies to
    proficiency_required VARCHAR(50) DEFAULT 'basic' CHECK (proficiency_required IN ('none', 'basic', 'intermediate', 'advanced')),
    license_required BOOLEAN DEFAULT false,
    license_info TEXT,
    external_link VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rms_tools_rms_id ON rms_tools_techniques(rms_id);
CREATE INDEX IF NOT EXISTS idx_rms_tools_type ON rms_tools_techniques(tool_type);

-- ============================================================================
-- SECTION 8: TEMPLATES & FORMS - rms_templates_forms
-- ============================================================================

CREATE TABLE IF NOT EXISTS rms_templates_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rms_id UUID NOT NULL REFERENCES risk_management_strategies(id) ON DELETE CASCADE,
    template_name VARCHAR(200) NOT NULL, -- e.g., Risk Register Template, Risk Assessment Form
    template_type VARCHAR(50) DEFAULT 'other' CHECK (template_type IN ('risk_register', 'risk_assessment', 'risk_response_plan', 'risk_review', 'risk_report', 'other')),
    template_description TEXT,
    template_purpose TEXT NOT NULL, -- What it's used for
    when_to_use TEXT,
    template_url VARCHAR(500), -- Link to template
    template_document_id UUID, -- Internal document reference
    is_mandatory BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rms_templates_rms_id ON rms_templates_forms(rms_id);
CREATE INDEX IF NOT EXISTS idx_rms_templates_type ON rms_templates_forms(template_type);

-- ============================================================================
-- SECTION 9: RISK RECORDS - rms_records
-- ============================================================================

CREATE TABLE IF NOT EXISTS rms_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rms_id UUID NOT NULL REFERENCES risk_management_strategies(id) ON DELETE CASCADE,
    record_name VARCHAR(200) NOT NULL,
    record_type VARCHAR(50) DEFAULT 'other' CHECK (record_type IN ('risk_register', 'risk_assessments', 'response_plans', 'risk_reviews', 'risk_reports', 'escalation_records', 'other')),
    record_description TEXT NOT NULL,
    record_purpose TEXT NOT NULL,
    storage_location TEXT, -- Where records will be stored
    retention_period VARCHAR(100), -- How long to keep
    access_control TEXT, -- Who can access
    format_requirements TEXT,
    is_mandatory BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rms_records_rms_id ON rms_records(rms_id);
CREATE INDEX IF NOT EXISTS idx_rms_records_type ON rms_records(record_type);
CREATE INDEX IF NOT EXISTS idx_rms_records_mandatory ON rms_records(is_mandatory);

-- ============================================================================
-- SECTION 10: RISK REPORTS - rms_reports
-- ============================================================================

CREATE TABLE IF NOT EXISTS rms_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rms_id UUID NOT NULL REFERENCES risk_management_strategies(id) ON DELETE CASCADE,
    report_name VARCHAR(200) NOT NULL,
    report_type VARCHAR(50) DEFAULT 'other' CHECK (report_type IN ('risk_status', 'risk_matrix', 'risk_trends', 'response_status', 'risk_exposure', 'exception_report', 'other')),
    report_description TEXT NOT NULL,
    report_purpose TEXT NOT NULL,
    report_content TEXT, -- What to include
    frequency VARCHAR(50) DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'bi_weekly', 'monthly', 'stage_end', 'on_demand', 'triggered')),
    trigger_conditions TEXT, -- If triggered, what triggers it
    recipients TEXT NOT NULL, -- Who receives the report
    responsible_role VARCHAR(200) NOT NULL, -- Who produces it
    template_reference VARCHAR(200),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rms_reports_rms_id ON rms_reports(rms_id);
CREATE INDEX IF NOT EXISTS idx_rms_reports_type ON rms_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_rms_reports_frequency ON rms_reports(frequency);

-- ============================================================================
-- SECTION 11: SCHEDULED ACTIVITIES - rms_scheduled_activities
-- ============================================================================

CREATE TABLE IF NOT EXISTS rms_scheduled_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rms_id UUID NOT NULL REFERENCES risk_management_strategies(id) ON DELETE CASCADE,
    activity_name VARCHAR(200) NOT NULL,
    activity_type VARCHAR(50) DEFAULT 'risk_review' CHECK (activity_type IN ('risk_identification', 'risk_assessment', 'risk_review', 'risk_workshop', 'risk_audit', 'stage_gate_review', 'other')),
    activity_description TEXT NOT NULL,
    activity_purpose TEXT NOT NULL,
    timing VARCHAR(50) DEFAULT 'periodic' CHECK (timing IN ('project_start', 'stage_start', 'stage_end', 'milestone', 'periodic', 'on_demand', 'project_end')),
    frequency VARCHAR(100), -- If periodic, how often
    specific_timing TEXT, -- Specific timing details
    duration_estimate VARCHAR(100), -- Estimated duration
    participants TEXT, -- Who participates
    outputs TEXT, -- What it produces
    linked_to_risk_register BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rms_activities_rms_id ON rms_scheduled_activities(rms_id);
CREATE INDEX IF NOT EXISTS idx_rms_activities_type ON rms_scheduled_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_rms_activities_timing ON rms_scheduled_activities(timing);

-- ============================================================================
-- SECTION 12: ROLES & RESPONSIBILITIES - rms_roles_responsibilities
-- ============================================================================

CREATE TABLE IF NOT EXISTS rms_roles_responsibilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rms_id UUID NOT NULL REFERENCES risk_management_strategies(id) ON DELETE CASCADE,
    role_name VARCHAR(200) NOT NULL, -- e.g., Project Assurance (Risk), Risk Manager
    role_type VARCHAR(50) DEFAULT 'other' CHECK (role_type IN ('project_board', 'project_assurance', 'project_manager', 'team_manager', 'risk_manager', 'risk_owner', 'external_auditor', 'corporate_risk', 'programme_risk', 'other')),
    role_description TEXT NOT NULL,
    responsibilities TEXT NOT NULL, -- Specific risk responsibilities
    authority_level TEXT, -- Decision-making authority
    independence_level VARCHAR(50) DEFAULT 'project_team' CHECK (independence_level IN ('project_team', 'project_independent', 'corporate', 'external')),
    assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_to_name VARCHAR(200), -- For external assignees
    is_mandatory BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rms_roles_rms_id ON rms_roles_responsibilities(rms_id);
CREATE INDEX IF NOT EXISTS idx_rms_roles_type ON rms_roles_responsibilities(role_type);
CREATE INDEX IF NOT EXISTS idx_rms_roles_independence ON rms_roles_responsibilities(independence_level);
CREATE INDEX IF NOT EXISTS idx_rms_roles_assigned ON rms_roles_responsibilities(assigned_to_id);

-- ============================================================================
-- SECTION 13: REVISION HISTORY - rms_revision_history
-- ============================================================================

CREATE TABLE IF NOT EXISTS rms_revision_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rms_id UUID NOT NULL REFERENCES risk_management_strategies(id) ON DELETE CASCADE,
    revision_date DATE NOT NULL DEFAULT CURRENT_DATE,
    previous_revision_date DATE, -- Date of previous revision
    summary_of_changes TEXT NOT NULL,
    changes_marked TEXT, -- Tracked changes if applicable
    revised_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    change_request_id UUID, -- FK to change_requests if from change control (no FK as table may not exist yet)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rms_revision_rms_id ON rms_revision_history(rms_id);
CREATE INDEX IF NOT EXISTS idx_rms_revision_date ON rms_revision_history(revision_date);

-- ============================================================================
-- SECTION 14: APPROVALS - rms_approvals
-- ============================================================================

CREATE TABLE IF NOT EXISTS rms_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rms_id UUID NOT NULL REFERENCES risk_management_strategies(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_rms_approvals_rms_id ON rms_approvals(rms_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_rms_approvals_status ON rms_approvals(approval_status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_rms_approvals_approver ON rms_approvals(approver_id) WHERE is_deleted = false;

-- ============================================================================
-- SECTION 15: DISTRIBUTION - rms_distribution
-- ============================================================================

CREATE TABLE IF NOT EXISTS rms_distribution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rms_id UUID NOT NULL REFERENCES risk_management_strategies(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_rms_distribution_rms_id ON rms_distribution(rms_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_rms_distribution_recipient ON rms_distribution(recipient_id) WHERE is_deleted = false;

-- ============================================================================
-- SECTION 16: TRIGGERS - Auto-generation and Audit
-- ============================================================================

-- Trigger: Auto-generate rms_reference on INSERT
CREATE OR REPLACE FUNCTION trg_rms_generate_reference()
RETURNS TRIGGER AS $$
DECLARE
    v_year INTEGER;
    v_sequence INTEGER;
    v_reference VARCHAR(50);
BEGIN
    -- Only generate if not provided
    IF NEW.rms_reference IS NULL OR NEW.rms_reference = '' THEN
        v_year := EXTRACT(YEAR FROM CURRENT_DATE);
        
        -- Get next sequence number for this year
        SELECT COALESCE(MAX(
            CAST(SUBSTRING(rms_reference FROM 'RMS-' || v_year || '-(.+)$') AS INTEGER)
        ), 0) + 1
        INTO v_sequence
        FROM risk_management_strategies
        WHERE rms_reference LIKE 'RMS-' || v_year || '-%'
          AND is_deleted = false;
        
        -- Format: RMS-YYYY-NNN
        v_reference := 'RMS-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0');
        
        NEW.rms_reference := v_reference;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_risk_management_strategies_generate_reference ON risk_management_strategies;
CREATE TRIGGER trg_risk_management_strategies_generate_reference
    BEFORE INSERT ON risk_management_strategies
    FOR EACH ROW
    EXECUTE FUNCTION trg_rms_generate_reference();

-- Trigger: Update updated_at timestamp
DROP TRIGGER IF EXISTS trg_rms_update_timestamp ON risk_management_strategies;
CREATE TRIGGER trg_rms_update_timestamp
    BEFORE UPDATE ON risk_management_strategies
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_audit_fields();

-- Trigger: Set created fields
DROP TRIGGER IF EXISTS trg_rms_set_created_fields ON risk_management_strategies;
CREATE TRIGGER trg_rms_set_created_fields
    BEFORE INSERT ON risk_management_strategies
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_created_fields();

-- ============================================================================
-- SECTION 17: FUNCTIONS - Reference Generation and Validation
-- ============================================================================

-- Function: Generate RMS Reference
CREATE OR REPLACE FUNCTION generate_rms_reference()
RETURNS VARCHAR AS $$
DECLARE
    v_year INTEGER;
    v_sequence INTEGER;
    v_reference VARCHAR(50);
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(rms_reference FROM 'RMS-' || v_year || '-(.+)$') AS INTEGER)
    ), 0) + 1
    INTO v_sequence
    FROM risk_management_strategies
    WHERE rms_reference LIKE 'RMS-' || v_year || '-%'
      AND is_deleted = false;
    
    -- Format: RMS-YYYY-NNN
    v_reference := 'RMS-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0');
    
    RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_rms_reference() IS 'Generates unique RMS reference number (RMS-YYYY-NNN)';

-- Function: Create RMS for Project
CREATE OR REPLACE FUNCTION create_rms_for_project(p_project_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_rms_id UUID;
BEGIN
    -- Create RMS with default structure
    INSERT INTO risk_management_strategies (
        project_id,
        rms_reference,
        version_number,
        purpose,
        objectives,
        scope,
        risk_identification_approach,
        risk_assessment_approach,
        risk_response_approach,
        risk_monitoring_approach,
        status,
        created_by,
        updated_by
    ) VALUES (
        p_project_id,
        generate_rms_reference(),
        '1.0',
        'Define risk management approach for this project',
        'Identify, assess, and manage risks effectively throughout the project',
        'All project risks (threats and opportunities)',
        'Risk identification through workshops, reviews, and expert judgment',
        'Risk assessment using probability and impact scales',
        'Risk response through appropriate strategies (avoid, reduce, transfer, accept, exploit, enhance)',
        'Continuous monitoring and review of risks',
        'draft',
        p_user_id,
        p_user_id
    ) RETURNING id INTO v_rms_id;
    
    -- Add Risk Register as a mandatory record
    INSERT INTO rms_records (
        rms_id,
        record_name,
        record_type,
        record_description,
        record_purpose,
        storage_location,
        is_mandatory,
        display_order,
        created_by
    ) VALUES (
        v_rms_id,
        'Risk Register',
        'risk_register',
        'Central register of all identified risks and their management',
        'Track all project risks, assessments, responses, and status',
        'Project repository',
        true,
        1,
        p_user_id
    );
    
    RETURN v_rms_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_rms_for_project(UUID, UUID) IS 'Creates RMS with default structure for a project';

-- Function: Validate RMS Completeness
CREATE OR REPLACE FUNCTION validate_rms_completeness(p_rms_id UUID)
RETURNS TABLE (
    section_name VARCHAR,
    is_complete BOOLEAN,
    missing_items TEXT[],
    recommendations TEXT
) AS $$
DECLARE
    v_rms RECORD;
    v_standards_count INTEGER;
    v_methods_count INTEGER;
    v_scales_count INTEGER;
    v_roles_count INTEGER;
    v_independent_roles_count INTEGER;
    v_records_count INTEGER;
BEGIN
    -- Get RMS
    SELECT * INTO v_rms
    FROM risk_management_strategies
    WHERE id = p_rms_id
      AND is_deleted = false;
    
    IF v_rms IS NULL THEN
        RETURN QUERY SELECT 'RMS not found'::VARCHAR, false::BOOLEAN, ARRAY[]::TEXT[], 'RMS does not exist'::TEXT;
        RETURN;
    END IF;
    
    -- Count items in each section
    SELECT COUNT(*) INTO v_standards_count FROM rms_risk_standards WHERE rms_id = p_rms_id;
    SELECT COUNT(*) INTO v_methods_count FROM rms_identification_methods WHERE rms_id = p_rms_id;
    SELECT COUNT(*) INTO v_scales_count FROM rms_assessment_scales WHERE rms_id = p_rms_id;
    SELECT COUNT(*) INTO v_roles_count FROM rms_roles_responsibilities WHERE rms_id = p_rms_id;
    SELECT COUNT(*) INTO v_independent_roles_count FROM rms_roles_responsibilities WHERE rms_id = p_rms_id AND independence_level IN ('project_independent', 'corporate', 'external');
    SELECT COUNT(*) INTO v_records_count FROM rms_records WHERE rms_id = p_rms_id;
    
    -- Check Introduction section
    RETURN QUERY SELECT 
        'Introduction'::VARCHAR,
        (v_rms.purpose IS NOT NULL AND length(trim(v_rms.purpose)) >= 50 
         AND v_rms.objectives IS NOT NULL AND length(trim(v_rms.objectives)) >= 30
         AND v_rms.scope IS NOT NULL AND length(trim(v_rms.scope)) >= 30)::BOOLEAN,
        CASE 
            WHEN v_rms.purpose IS NULL OR length(trim(v_rms.purpose)) < 50 THEN ARRAY['Purpose must be at least 50 characters']::TEXT[]
            WHEN v_rms.objectives IS NULL OR length(trim(v_rms.objectives)) < 30 THEN ARRAY['Objectives must be at least 30 characters']::TEXT[]
            WHEN v_rms.scope IS NULL OR length(trim(v_rms.scope)) < 30 THEN ARRAY['Scope must be at least 30 characters']::TEXT[]
            ELSE ARRAY[]::TEXT[]
        END,
        CASE 
            WHEN v_rms.purpose IS NULL OR length(trim(v_rms.purpose)) < 50 THEN 'Provide clear purpose (minimum 50 characters)'::TEXT
            WHEN v_rms.objectives IS NULL OR length(trim(v_rms.objectives)) < 30 THEN 'Define risk management objectives (minimum 30 characters)'::TEXT
            WHEN v_rms.scope IS NULL OR length(trim(v_rms.scope)) < 30 THEN 'Define scope of risk management (minimum 30 characters)'::TEXT
            ELSE ''::TEXT
        END;
    
    -- Check Risk Procedures section
    RETURN QUERY SELECT 
        'Risk Procedures'::VARCHAR,
        (v_rms.risk_identification_approach IS NOT NULL AND length(trim(v_rms.risk_identification_approach)) >= 50
         AND v_rms.risk_assessment_approach IS NOT NULL AND length(trim(v_rms.risk_assessment_approach)) >= 50
         AND v_rms.risk_response_approach IS NOT NULL AND length(trim(v_rms.risk_response_approach)) >= 50)::BOOLEAN,
        CASE 
            WHEN v_rms.risk_identification_approach IS NULL OR length(trim(v_rms.risk_identification_approach)) < 50 THEN ARRAY['Risk identification approach must be at least 50 characters']::TEXT[]
            WHEN v_rms.risk_assessment_approach IS NULL OR length(trim(v_rms.risk_assessment_approach)) < 50 THEN ARRAY['Risk assessment approach must be at least 50 characters']::TEXT[]
            WHEN v_rms.risk_response_approach IS NULL OR length(trim(v_rms.risk_response_approach)) < 50 THEN ARRAY['Risk response approach must be at least 50 characters']::TEXT[]
            WHEN v_rms.variance_from_corporate IS NOT NULL AND (v_rms.variance_justification IS NULL OR length(trim(v_rms.variance_justification)) < 20) THEN ARRAY['Variance justification required if variance specified']::TEXT[]
            ELSE ARRAY[]::TEXT[]
        END,
        CASE 
            WHEN v_rms.risk_identification_approach IS NULL OR length(trim(v_rms.risk_identification_approach)) < 50 THEN 'Define risk identification approach (minimum 50 characters)'::TEXT
            WHEN v_rms.risk_assessment_approach IS NULL OR length(trim(v_rms.risk_assessment_approach)) < 50 THEN 'Define risk assessment approach (minimum 50 characters)'::TEXT
            WHEN v_rms.risk_response_approach IS NULL OR length(trim(v_rms.risk_response_approach)) < 50 THEN 'Define risk response approach (minimum 50 characters)'::TEXT
            WHEN v_rms.variance_from_corporate IS NOT NULL AND (v_rms.variance_justification IS NULL OR length(trim(v_rms.variance_justification)) < 20) THEN 'Justify any variance from corporate standards'::TEXT
            ELSE ''::TEXT
        END;
    
    -- Check Risk Standards
    RETURN QUERY SELECT 
        'Risk Standards'::VARCHAR,
        (v_standards_count > 0)::BOOLEAN,
        CASE WHEN v_standards_count = 0 THEN ARRAY['No risk standards defined']::TEXT[] ELSE ARRAY[]::TEXT[] END,
        CASE WHEN v_standards_count = 0 THEN 'Add at least one risk standard to apply (e.g., ISO 31000)'::TEXT ELSE ''::TEXT END;
    
    -- Check Identification Methods
    RETURN QUERY SELECT 
        'Identification Methods'::VARCHAR,
        (v_methods_count > 0)::BOOLEAN,
        CASE WHEN v_methods_count = 0 THEN ARRAY['No identification methods defined']::TEXT[] ELSE ARRAY[]::TEXT[] END,
        CASE WHEN v_methods_count = 0 THEN 'Add at least one risk identification method (workshop, checklist, etc.)'::TEXT ELSE ''::TEXT END;
    
    -- Check Assessment Scales
    RETURN QUERY SELECT 
        'Assessment Scales'::VARCHAR,
        (v_scales_count >= 2)::BOOLEAN,
        CASE 
            WHEN v_scales_count = 0 THEN ARRAY['No assessment scales defined']::TEXT[]
            WHEN v_scales_count < 2 THEN ARRAY['At least probability and impact scales should be defined']::TEXT[]
            ELSE ARRAY[]::TEXT[]
        END,
        CASE 
            WHEN v_scales_count = 0 THEN 'Define probability and impact assessment scales'::TEXT
            WHEN v_scales_count < 2 THEN 'Ensure both probability and impact scales are defined'::TEXT
            ELSE ''::TEXT
        END;
    
    -- Check Risk Roles
    RETURN QUERY SELECT 
        'Risk Roles'::VARCHAR,
        (v_roles_count > 0 AND v_independent_roles_count > 0)::BOOLEAN,
        CASE 
            WHEN v_roles_count = 0 THEN ARRAY['No risk roles defined']::TEXT[]
            WHEN v_independent_roles_count = 0 THEN ARRAY['No independent risk role defined (must have at least one role at Project Independent level or higher)']::TEXT[]
            ELSE ARRAY[]::TEXT[]
        END,
        CASE 
            WHEN v_roles_count = 0 THEN 'Define risk roles and responsibilities'::TEXT
            WHEN v_independent_roles_count = 0 THEN 'Add at least one independent risk role (Project Assurance, Corporate Risk, or External Auditor)'::TEXT
            ELSE ''::TEXT
        END;
    
    -- Check Risk Records
    RETURN QUERY SELECT 
        'Risk Records'::VARCHAR,
        (v_records_count > 0 AND EXISTS (SELECT 1 FROM rms_records WHERE rms_id = p_rms_id AND record_type = 'risk_register' AND is_mandatory = true))::BOOLEAN,
        CASE 
            WHEN v_records_count = 0 THEN ARRAY['No risk records defined']::TEXT[]
            WHEN NOT EXISTS (SELECT 1 FROM rms_records WHERE rms_id = p_rms_id AND record_type = 'risk_register') THEN ARRAY['Risk Register must be included in records']::TEXT[]
            ELSE ARRAY[]::TEXT[]
        END,
        CASE 
            WHEN v_records_count = 0 THEN 'Define risk records to be maintained'::TEXT
            WHEN NOT EXISTS (SELECT 1 FROM rms_records WHERE rms_id = p_rms_id AND record_type = 'risk_register') THEN 'Ensure Risk Register is included as a mandatory record'::TEXT
            ELSE ''::TEXT
        END;
    
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_rms_completeness(UUID) IS 'Validates that RMS has all required sections';

-- Function: Check RMS Conformance
CREATE OR REPLACE FUNCTION check_rms_conformance(p_rms_id UUID)
RETURNS TABLE (
    standard_name VARCHAR,
    conformance_status VARCHAR,
    gaps TEXT[],
    recommendations TEXT
) AS $$
DECLARE
    v_rms RECORD;
    v_corporate_policy_exists BOOLEAN;
    v_customer_risk_specified BOOLEAN;
    v_supplier_risk_specified BOOLEAN;
BEGIN
    -- Get RMS
    SELECT * INTO v_rms
    FROM risk_management_strategies
    WHERE id = p_rms_id
      AND is_deleted = false;
    
    IF v_rms IS NULL THEN
        RETURN;
    END IF;
    
    -- Check corporate policy conformance
    IF v_rms.corporate_risk_policy_reference IS NOT NULL AND trim(v_rms.corporate_risk_policy_reference) != '' THEN
        v_corporate_policy_exists := true;
        
        RETURN QUERY SELECT 
            'Corporate Risk Policy'::VARCHAR,
            CASE 
                WHEN v_rms.variance_from_corporate IS NOT NULL AND trim(v_rms.variance_from_corporate) != '' THEN 'Variance'::VARCHAR
                ELSE 'Conforms'::VARCHAR
            END,
            CASE 
                WHEN v_rms.variance_from_corporate IS NOT NULL AND (v_rms.variance_justification IS NULL OR length(trim(v_rms.variance_justification)) < 20) THEN ARRAY['Variance not justified']::TEXT[]
                ELSE ARRAY[]::TEXT[]
            END,
            CASE 
                WHEN v_rms.variance_from_corporate IS NOT NULL AND (v_rms.variance_justification IS NULL OR length(trim(v_rms.variance_justification)) < 20) THEN 'Provide justification for variance from corporate policy'::TEXT
                ELSE ''::TEXT
            END;
    ELSE
        RETURN QUERY SELECT 
            'Corporate Risk Policy'::VARCHAR,
            'Not Referenced'::VARCHAR,
            ARRAY['Corporate risk policy not referenced']::TEXT[],
            'Reference corporate risk policy if it exists'::TEXT;
    END IF;
    
    -- Check customer risk standards conformance
    IF v_rms.customer_risk_standards_reference IS NOT NULL AND trim(v_rms.customer_risk_standards_reference) != '' THEN
        v_customer_risk_specified := true;
        
        RETURN QUERY SELECT 
            'Customer Risk Standards'::VARCHAR,
            'Referenced'::VARCHAR,
            ARRAY[]::TEXT[],
            'Verify that RMS approach aligns with customer risk management requirements'::TEXT;
    END IF;
    
    -- Check supplier risk standards conformance
    IF v_rms.supplier_risk_standards_reference IS NOT NULL AND trim(v_rms.supplier_risk_standards_reference) != '' THEN
        v_supplier_risk_specified := true;
        
        RETURN QUERY SELECT 
            'Supplier Risk Standards'::VARCHAR,
            'Referenced'::VARCHAR,
            ARRAY[]::TEXT[],
            'Ensure supplier risk management elements are properly integrated'::TEXT;
    END IF;
    
    -- Check standards alignment
    IF EXISTS (SELECT 1 FROM rms_risk_standards WHERE rms_id = p_rms_id AND compliance_level = 'mandatory') THEN
        RETURN QUERY SELECT 
            'Mandatory Standards'::VARCHAR,
            'Defined'::VARCHAR,
            ARRAY[]::TEXT[],
            'Ensure all mandatory standards are properly implemented'::TEXT;
    END IF;
    
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_rms_conformance(UUID) IS 'Checks conformance to corporate/customer standards';

-- Function: Apply RMS to Risk Register
CREATE OR REPLACE FUNCTION apply_rms_to_risk_register(p_rms_id UUID, p_risk_register_id UUID)
RETURNS VOID AS $$
DECLARE
    v_probability_scale JSONB;
    v_impact_scale JSONB;
    v_matrix_config JSONB;
BEGIN
    -- Get default probability scale from RMS
    SELECT scale_config INTO v_probability_scale
    FROM rms_assessment_scales
    WHERE rms_id = p_rms_id
      AND scale_type = 'probability'
      AND is_default = true
    LIMIT 1;
    
    -- Get default impact scale from RMS
    SELECT scale_config INTO v_impact_scale
    FROM rms_assessment_scales
    WHERE rms_id = p_rms_id
      AND scale_type = 'impact'
      AND is_default = true
    LIMIT 1;
    
    -- Get default matrix configuration from RMS
    SELECT jsonb_build_object(
        'probability_axis', probability_axis_config,
        'impact_axis', impact_axis_config,
        'risk_levels', risk_levels_config
    ) INTO v_matrix_config
    FROM rms_risk_matrix
    WHERE rms_id = p_rms_id
      AND is_default = true
    LIMIT 1;
    
    -- Update Risk Register with RMS configuration
    UPDATE risk_registers
    SET 
        probability_scale = COALESCE(v_probability_scale, probability_scale),
        impact_scale = COALESCE(v_impact_scale, impact_scale),
        risk_matrix_config = COALESCE(v_matrix_config, risk_matrix_config),
        updated_at = NOW(),
        updated_by = (SELECT created_by FROM risk_management_strategies WHERE id = p_rms_id)
    WHERE id = p_risk_register_id;
    
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION apply_rms_to_risk_register(UUID, UUID) IS 'Applies RMS scales and matrix configuration to Risk Register';

-- Function: Get Scheduled Risk Activities
CREATE OR REPLACE FUNCTION get_scheduled_risk_activities(p_project_id UUID, p_date_from DATE DEFAULT NULL, p_date_to DATE DEFAULT NULL)
RETURNS TABLE (
    activity_id UUID,
    activity_name VARCHAR,
    activity_type VARCHAR,
    scheduled_date DATE,
    participants TEXT
) AS $$
DECLARE
    v_rms_id UUID;
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    -- Get RMS for project
    SELECT id INTO v_rms_id
    FROM risk_management_strategies
    WHERE project_id = p_project_id
      AND is_deleted = false
    LIMIT 1;
    
    IF v_rms_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Default date range if not provided
    v_start_date := COALESCE(p_date_from, CURRENT_DATE);
    v_end_date := COALESCE(p_date_to, CURRENT_DATE + INTERVAL '6 months');
    
    -- Note: This is a simplified version. A full implementation would need to:
    -- 1. Parse timing fields (e.g., 'stage_end', 'milestone', 'periodic')
    -- 2. Calculate actual dates based on project schedule
    -- 3. Handle periodic frequencies
    
    -- For now, return activities that are marked as 'on_demand' or have specific_timing set
    RETURN QUERY
    SELECT 
        rsa.id AS activity_id,
        rsa.activity_name,
        rsa.activity_type,
        CURRENT_DATE AS scheduled_date, -- Placeholder - would need actual date calculation
        rsa.participants
    FROM rms_scheduled_activities rsa
    WHERE rsa.rms_id = v_rms_id
      AND (rsa.timing = 'on_demand' OR rsa.specific_timing IS NOT NULL)
    ORDER BY rsa.display_order, rsa.activity_name;
    
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_scheduled_risk_activities(UUID, DATE, DATE) IS 'Returns upcoming risk activities for a project';

-- ============================================================================
-- SECTION 18: REGISTER TABLES IN DATABASE_TABLES
-- ============================================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES 
    ('risk_management_strategies', 'Risk Management Strategy - Defines HOW risk management will be achieved', false, true, 'structured'),
    ('rms_risk_standards', 'RMS Risk Standards - Standards to apply', false, true, 'structured'),
    ('rms_identification_methods', 'RMS Identification Methods - Risk identification methods', false, true, 'structured'),
    ('rms_assessment_scales', 'RMS Assessment Scales - Probability, impact, and proximity scales', false, true, 'structured'),
    ('rms_risk_matrix', 'RMS Risk Matrix - Risk matrix configuration', false, true, 'structured'),
    ('rms_response_strategies', 'RMS Response Strategies - Risk response strategies', false, true, 'structured'),
    ('rms_tools_techniques', 'RMS Tools & Techniques - Tools and techniques for risk management', false, true, 'structured'),
    ('rms_templates_forms', 'RMS Templates & Forms - Templates and forms to use', false, true, 'structured'),
    ('rms_records', 'RMS Records - Risk records to maintain', false, true, 'structured'),
    ('rms_reports', 'RMS Reports - Risk reports to generate', false, true, 'structured'),
    ('rms_scheduled_activities', 'RMS Scheduled Activities - Timing of risk activities', false, true, 'structured'),
    ('rms_roles_responsibilities', 'RMS Roles & Responsibilities - Risk roles', false, true, 'structured'),
    ('rms_revision_history', 'RMS Revision History - Version history', false, true, 'structured'),
    ('rms_approvals', 'RMS Approvals - Approval records', false, true, 'structured'),
    ('rms_distribution', 'RMS Distribution - Distribution list', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE risk_management_strategies IS 'Risk Management Strategy - Defines HOW risk management will be achieved in the project';
COMMENT ON TABLE rms_risk_standards IS 'Risk standards to apply in the project';
COMMENT ON TABLE rms_identification_methods IS 'Risk identification methods (workshop, checklist, analysis, etc.)';
COMMENT ON TABLE rms_assessment_scales IS 'Risk assessment scales (probability, impact, proximity)';
COMMENT ON TABLE rms_risk_matrix IS 'Risk matrix configuration';
COMMENT ON TABLE rms_response_strategies IS 'Risk response strategies (avoid, reduce, transfer, accept, exploit, enhance)';
COMMENT ON TABLE rms_tools_techniques IS 'Tools and techniques for risk management';
COMMENT ON TABLE rms_templates_forms IS 'Templates and forms to use for risk activities';
COMMENT ON TABLE rms_records IS 'Risk records to maintain';
COMMENT ON TABLE rms_reports IS 'Risk reports to generate';
COMMENT ON TABLE rms_scheduled_activities IS 'Timing of formal risk activities (reviews, workshops, audits)';
COMMENT ON TABLE rms_roles_responsibilities IS 'Risk roles and responsibilities';
COMMENT ON TABLE rms_revision_history IS 'Version history of RMS changes';
COMMENT ON TABLE rms_approvals IS 'Approval records for RMS';
COMMENT ON TABLE rms_distribution IS 'Distribution list for RMS';

DO $$
BEGIN
    RAISE NOTICE 'v197_risk_management_strategy_tables.sql completed successfully';
END $$;

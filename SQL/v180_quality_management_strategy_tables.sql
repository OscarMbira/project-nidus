-- ============================================================================
-- Quality Management Strategy Implementation - Comprehensive QMS Module
-- Version: v180
-- Description: Creates comprehensive Quality Management Strategy structure
-- Date: 2026-01-19
-- ============================================================================
--
-- Purpose:
-- Implements the Quality Management Strategy module based on structured project management methodology.
-- The Quality Management Strategy defines HOW quality will be achieved in the project. It establishes
-- the quality management procedures, tools, techniques, roles, responsibilities, and timing for all
-- quality activities.
--
-- Strategy:
-- 1. Create quality_management_strategies main table (one per project)
-- 2. Create supporting tables (standards, methods, metrics, tools, templates, records, reports, activities, roles)
-- 3. Create functions for reference generation, validation, conformance checking
-- 4. Set up triggers for auto-generation and validation
-- 5. Set up RLS policies (in separate file)
--
-- Prerequisites:
-- - v01 through v07 must be run first (core tables and trigger functions)
-- - v177_project_product_description_tables.sql (PPD tables - for linking quality expectations)
-- - projects table must exist
-- - users table must exist
-- - accounts table must exist (for organisation-level access)
-- - quality_register table exists (v32_quality_management.sql) - for integration
--
-- ============================================================================
-- SECTION 1: MAIN TABLE - quality_management_strategies
-- ============================================================================

CREATE TABLE IF NOT EXISTS quality_management_strategies (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship (One strategy per project)
    project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Document Identification
    qms_reference VARCHAR(50) UNIQUE NOT NULL, -- e.g., QMS-2026-001
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
    objectives TEXT NOT NULL, -- Quality objectives for the project
    scope TEXT NOT NULL, -- Scope of quality management
    strategy_responsibility TEXT, -- Who is responsible for the strategy

    -- Quality Management Procedure
    quality_planning_approach TEXT, -- Approach to quality planning
    quality_control_approach TEXT NOT NULL, -- Approach to quality control
    quality_assurance_approach TEXT NOT NULL, -- Approach to quality assurance
    variance_from_corporate TEXT, -- Any variance from corporate standards
    variance_justification TEXT, -- Justification for variance

    -- References
    customer_qms_reference TEXT, -- Customer's QMS elements to use
    supplier_qms_reference TEXT, -- Supplier's QMS elements to use
    corporate_quality_policy_reference TEXT, -- Corporate policy reference
    programme_quality_policy_reference TEXT, -- Programme policy reference

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
CREATE INDEX IF NOT EXISTS idx_qms_project_id ON quality_management_strategies(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_qms_status ON quality_management_strategies(status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_qms_reference ON quality_management_strategies(qms_reference) WHERE is_deleted = false;

-- ============================================================================
-- SECTION 2: QUALITY STANDARDS - qms_quality_standards
-- ============================================================================

CREATE TABLE IF NOT EXISTS qms_quality_standards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qms_id UUID NOT NULL REFERENCES quality_management_strategies(id) ON DELETE CASCADE,
    standard_code VARCHAR(100) NOT NULL, -- e.g., ISO 9001, ISO 27001
    standard_name VARCHAR(200) NOT NULL,
    standard_version VARCHAR(50), -- Version of the standard
    standard_description TEXT,
    standard_type VARCHAR(50) DEFAULT 'international' CHECK (standard_type IN ('international', 'national', 'industry', 'corporate', 'customer', 'other')),
    applicability TEXT, -- How/where it applies
    compliance_level VARCHAR(50) DEFAULT 'recommended' CHECK (compliance_level IN ('mandatory', 'recommended', 'optional')),
    certification_required BOOLEAN DEFAULT false,
    external_link VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_qms_standards_qms_id ON qms_quality_standards(qms_id);
CREATE INDEX IF NOT EXISTS idx_qms_standards_type ON qms_quality_standards(standard_type);
CREATE INDEX IF NOT EXISTS idx_qms_standards_compliance ON qms_quality_standards(compliance_level);

-- ============================================================================
-- SECTION 3: QUALITY METHODS - qms_quality_methods
-- ============================================================================

CREATE TABLE IF NOT EXISTS qms_quality_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qms_id UUID NOT NULL REFERENCES quality_management_strategies(id) ON DELETE CASCADE,
    method_name VARCHAR(200) NOT NULL, -- e.g., Inspection, Review, Testing
    method_type VARCHAR(50) DEFAULT 'review' CHECK (method_type IN ('inspection', 'review', 'testing', 'audit', 'pilot', 'walkthrough', 'demonstration', 'analysis', 'other')),
    method_description TEXT NOT NULL,
    when_to_use TEXT, -- When this method should be applied
    entry_criteria TEXT, -- Criteria to start
    exit_criteria TEXT, -- Criteria to complete
    required_participants TEXT, -- Who must participate
    documentation_required TEXT, -- What to document
    is_mandatory BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_qms_methods_qms_id ON qms_quality_methods(qms_id);
CREATE INDEX IF NOT EXISTS idx_qms_methods_type ON qms_quality_methods(method_type);
CREATE INDEX IF NOT EXISTS idx_qms_methods_mandatory ON qms_quality_methods(is_mandatory);

-- ============================================================================
-- SECTION 4: QUALITY METRICS - qms_quality_metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS qms_quality_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qms_id UUID NOT NULL REFERENCES quality_management_strategies(id) ON DELETE CASCADE,
    metric_name VARCHAR(200) NOT NULL,
    metric_description TEXT NOT NULL,
    metric_category VARCHAR(50) DEFAULT 'other' CHECK (metric_category IN ('defect', 'coverage', 'performance', 'compliance', 'process', 'customer_satisfaction', 'other')),
    measurement_method TEXT NOT NULL, -- How to measure
    unit_of_measure VARCHAR(50), -- e.g., %, count, hours
    target_value VARCHAR(100), -- Target value
    threshold_warning VARCHAR(100), -- Warning threshold
    threshold_critical VARCHAR(100), -- Critical threshold
    collection_frequency VARCHAR(50) DEFAULT 'weekly' CHECK (collection_frequency IN ('continuous', 'daily', 'weekly', 'stage_end', 'on_demand')),
    responsible_role VARCHAR(200), -- Who collects/reports
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_qms_metrics_qms_id ON qms_quality_metrics(qms_id);
CREATE INDEX IF NOT EXISTS idx_qms_metrics_category ON qms_quality_metrics(metric_category);
CREATE INDEX IF NOT EXISTS idx_qms_metrics_frequency ON qms_quality_metrics(collection_frequency);

-- ============================================================================
-- SECTION 5: TEMPLATES & FORMS - qms_templates_forms
-- ============================================================================

CREATE TABLE IF NOT EXISTS qms_templates_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qms_id UUID NOT NULL REFERENCES quality_management_strategies(id) ON DELETE CASCADE,
    template_name VARCHAR(200) NOT NULL, -- e.g., Product Description, Quality Register
    template_type VARCHAR(50) DEFAULT 'other' CHECK (template_type IN ('product_description', 'quality_register', 'test_plan', 'review_record', 'audit_checklist', 'inspection_form', 'other')),
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

CREATE INDEX IF NOT EXISTS idx_qms_templates_qms_id ON qms_templates_forms(qms_id);
CREATE INDEX IF NOT EXISTS idx_qms_templates_type ON qms_templates_forms(template_type);

-- ============================================================================
-- SECTION 6: TOOLS & TECHNIQUES - qms_tools_techniques
-- ============================================================================

CREATE TABLE IF NOT EXISTS qms_tools_techniques (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qms_id UUID NOT NULL REFERENCES quality_management_strategies(id) ON DELETE CASCADE,
    tool_name VARCHAR(200) NOT NULL,
    tool_type VARCHAR(50) DEFAULT 'software' CHECK (tool_type IN ('software', 'methodology', 'technique', 'checklist', 'framework', 'other')),
    tool_description TEXT NOT NULL,
    tool_purpose TEXT NOT NULL, -- What it's used for
    applicable_to TEXT, -- Which QM steps it applies to
    proficiency_required VARCHAR(50) DEFAULT 'basic' CHECK (proficiency_required IN ('none', 'basic', 'intermediate', 'advanced')),
    license_required BOOLEAN DEFAULT false,
    license_info TEXT,
    external_link VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_qms_tools_qms_id ON qms_tools_techniques(qms_id);
CREATE INDEX IF NOT EXISTS idx_qms_tools_type ON qms_tools_techniques(tool_type);

-- ============================================================================
-- SECTION 7: QUALITY RECORDS - qms_records
-- ============================================================================

CREATE TABLE IF NOT EXISTS qms_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qms_id UUID NOT NULL REFERENCES quality_management_strategies(id) ON DELETE CASCADE,
    record_name VARCHAR(200) NOT NULL,
    record_type VARCHAR(50) DEFAULT 'other' CHECK (record_type IN ('quality_register', 'test_results', 'review_records', 'audit_reports', 'inspection_records', 'metrics_data', 'approval_records', 'other')),
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

CREATE INDEX IF NOT EXISTS idx_qms_records_qms_id ON qms_records(qms_id);
CREATE INDEX IF NOT EXISTS idx_qms_records_type ON qms_records(record_type);
CREATE INDEX IF NOT EXISTS idx_qms_records_mandatory ON qms_records(is_mandatory);

-- ============================================================================
-- SECTION 8: QUALITY REPORTS - qms_reports
-- ============================================================================

CREATE TABLE IF NOT EXISTS qms_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qms_id UUID NOT NULL REFERENCES quality_management_strategies(id) ON DELETE CASCADE,
    report_name VARCHAR(200) NOT NULL,
    report_type VARCHAR(50) DEFAULT 'other' CHECK (report_type IN ('quality_status', 'metrics_report', 'audit_report', 'compliance_report', 'exception_report', 'trend_report', 'other')),
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

CREATE INDEX IF NOT EXISTS idx_qms_reports_qms_id ON qms_reports(qms_id);
CREATE INDEX IF NOT EXISTS idx_qms_reports_type ON qms_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_qms_reports_frequency ON qms_reports(frequency);

-- ============================================================================
-- SECTION 9: SCHEDULED ACTIVITIES - qms_scheduled_activities
-- ============================================================================

CREATE TABLE IF NOT EXISTS qms_scheduled_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qms_id UUID NOT NULL REFERENCES quality_management_strategies(id) ON DELETE CASCADE,
    activity_name VARCHAR(200) NOT NULL,
    activity_type VARCHAR(50) DEFAULT 'review' CHECK (activity_type IN ('audit', 'review', 'inspection', 'assessment', 'milestone_check', 'gate_review', 'other')),
    activity_description TEXT NOT NULL,
    activity_purpose TEXT NOT NULL,
    timing VARCHAR(50) DEFAULT 'periodic' CHECK (timing IN ('project_start', 'stage_start', 'stage_end', 'milestone', 'periodic', 'on_demand', 'project_end')),
    frequency VARCHAR(100), -- If periodic, how often
    specific_timing TEXT, -- Specific timing details
    duration_estimate VARCHAR(100), -- Estimated duration
    participants TEXT, -- Who participates
    outputs TEXT, -- What it produces
    linked_to_quality_register BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_qms_activities_qms_id ON qms_scheduled_activities(qms_id);
CREATE INDEX IF NOT EXISTS idx_qms_activities_type ON qms_scheduled_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_qms_activities_timing ON qms_scheduled_activities(timing);

-- ============================================================================
-- SECTION 10: ROLES & RESPONSIBILITIES - qms_roles_responsibilities
-- ============================================================================

CREATE TABLE IF NOT EXISTS qms_roles_responsibilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qms_id UUID NOT NULL REFERENCES quality_management_strategies(id) ON DELETE CASCADE,
    role_name VARCHAR(200) NOT NULL, -- e.g., Project Assurance, Quality Manager
    role_type VARCHAR(50) DEFAULT 'other' CHECK (role_type IN ('project_board', 'project_assurance', 'project_manager', 'team_manager', 'quality_reviewer', 'external_auditor', 'corporate_qa', 'programme_qa', 'other')),
    role_description TEXT NOT NULL,
    responsibilities TEXT NOT NULL, -- Specific quality responsibilities
    authority_level TEXT, -- Decision-making authority
    independence_level VARCHAR(50) DEFAULT 'project_team' CHECK (independence_level IN ('project_team', 'project_independent', 'corporate', 'external')),
    assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_to_name VARCHAR(200), -- For external assignees
    is_mandatory BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_qms_roles_qms_id ON qms_roles_responsibilities(qms_id);
CREATE INDEX IF NOT EXISTS idx_qms_roles_type ON qms_roles_responsibilities(role_type);
CREATE INDEX IF NOT EXISTS idx_qms_roles_independence ON qms_roles_responsibilities(independence_level);
CREATE INDEX IF NOT EXISTS idx_qms_roles_assigned ON qms_roles_responsibilities(assigned_to_id);

-- ============================================================================
-- SECTION 11: REVISION HISTORY - qms_revision_history
-- ============================================================================

CREATE TABLE IF NOT EXISTS qms_revision_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qms_id UUID NOT NULL REFERENCES quality_management_strategies(id) ON DELETE CASCADE,
    revision_date DATE NOT NULL DEFAULT CURRENT_DATE,
    previous_revision_date DATE, -- Date of previous revision
    summary_of_changes TEXT NOT NULL,
    changes_marked TEXT, -- Tracked changes if applicable
    revised_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    change_request_id UUID, -- FK to change_requests if from change control (no FK as table may not exist yet)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qms_revision_qms_id ON qms_revision_history(qms_id);
CREATE INDEX IF NOT EXISTS idx_qms_revision_date ON qms_revision_history(revision_date);

-- ============================================================================
-- SECTION 12: APPROVALS - qms_approvals
-- ============================================================================

CREATE TABLE IF NOT EXISTS qms_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qms_id UUID NOT NULL REFERENCES quality_management_strategies(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_qms_approvals_qms_id ON qms_approvals(qms_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_qms_approvals_status ON qms_approvals(approval_status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_qms_approvals_approver ON qms_approvals(approver_id) WHERE is_deleted = false;

-- ============================================================================
-- SECTION 13: DISTRIBUTION - qms_distribution
-- ============================================================================

CREATE TABLE IF NOT EXISTS qms_distribution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qms_id UUID NOT NULL REFERENCES quality_management_strategies(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_qms_distribution_qms_id ON qms_distribution(qms_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_qms_distribution_recipient ON qms_distribution(recipient_id) WHERE is_deleted = false;

-- ============================================================================
-- SECTION 14: TRIGGERS - Auto-generation and Audit
-- ============================================================================

-- Trigger: Auto-generate qms_reference on INSERT
CREATE OR REPLACE FUNCTION trg_qms_generate_reference()
RETURNS TRIGGER AS $$
DECLARE
    v_year INTEGER;
    v_sequence INTEGER;
    v_reference VARCHAR(50);
BEGIN
    -- Only generate if not provided
    IF NEW.qms_reference IS NULL OR NEW.qms_reference = '' THEN
        v_year := EXTRACT(YEAR FROM CURRENT_DATE);
        
        -- Get next sequence number for this year
        SELECT COALESCE(MAX(
            CAST(SUBSTRING(qms_reference FROM 'QMS-' || v_year || '-(.+)$') AS INTEGER)
        ), 0) + 1
        INTO v_sequence
        FROM quality_management_strategies
        WHERE qms_reference LIKE 'QMS-' || v_year || '-%'
          AND is_deleted = false;
        
        -- Format: QMS-YYYY-NNN
        v_reference := 'QMS-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0');
        
        NEW.qms_reference := v_reference;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_quality_management_strategies_generate_reference ON quality_management_strategies;
CREATE TRIGGER trg_quality_management_strategies_generate_reference
    BEFORE INSERT ON quality_management_strategies
    FOR EACH ROW
    EXECUTE FUNCTION trg_qms_generate_reference();

-- Trigger: Update updated_at timestamp
DROP TRIGGER IF EXISTS trg_qms_update_timestamp ON quality_management_strategies;
CREATE TRIGGER trg_qms_update_timestamp
    BEFORE UPDATE ON quality_management_strategies
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_audit_fields();

-- Trigger: Set created fields
DROP TRIGGER IF EXISTS trg_qms_set_created_fields ON quality_management_strategies;
CREATE TRIGGER trg_qms_set_created_fields
    BEFORE INSERT ON quality_management_strategies
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_created_fields();

-- ============================================================================
-- SECTION 15: FUNCTIONS - Reference Generation and Validation
-- ============================================================================

-- Function: Generate QMS Reference
CREATE OR REPLACE FUNCTION generate_qms_reference()
RETURNS VARCHAR AS $$
DECLARE
    v_year INTEGER;
    v_sequence INTEGER;
    v_reference VARCHAR(50);
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(qms_reference FROM 'QMS-' || v_year || '-(.+)$') AS INTEGER)
    ), 0) + 1
    INTO v_sequence
    FROM quality_management_strategies
    WHERE qms_reference LIKE 'QMS-' || v_year || '-%'
      AND is_deleted = false;
    
    -- Format: QMS-YYYY-NNN
    v_reference := 'QMS-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0');
    
    RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_qms_reference() IS 'Generates unique QMS reference number (QMS-YYYY-NNN)';

-- Function: Create QMS for Project
CREATE OR REPLACE FUNCTION create_qms_for_project(p_project_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_qms_id UUID;
BEGIN
    -- Create QMS with default structure
    INSERT INTO quality_management_strategies (
        project_id,
        qms_reference,
        version_number,
        purpose,
        objectives,
        scope,
        quality_control_approach,
        quality_assurance_approach,
        status,
        created_by,
        updated_by
    ) VALUES (
        p_project_id,
        generate_qms_reference(),
        '1.0',
        'Define quality management approach for this project',
        'Ensure project deliverables meet quality expectations',
        'All project deliverables and processes',
        'Quality control through inspections, reviews, and testing',
        'Quality assurance through audits and compliance checks',
        'draft',
        p_user_id,
        p_user_id
    ) RETURNING id INTO v_qms_id;
    
    -- Add Quality Register as a mandatory record
    INSERT INTO qms_records (
        qms_id,
        record_name,
        record_type,
        record_description,
        record_purpose,
        storage_location,
        is_mandatory,
        display_order,
        created_by
    ) VALUES (
        v_qms_id,
        'Quality Register',
        'quality_register',
        'Central register of all quality-related activities and results',
        'Track quality activities, inspections, reviews, and outcomes',
        'Project repository',
        true,
        1,
        p_user_id
    );
    
    RETURN v_qms_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_qms_for_project(UUID, UUID) IS 'Creates QMS with default structure for a project';

-- Function: Validate QMS Completeness
CREATE OR REPLACE FUNCTION validate_qms_completeness(p_qms_id UUID)
RETURNS TABLE (
    section_name VARCHAR,
    is_complete BOOLEAN,
    missing_items TEXT[],
    recommendations TEXT
) AS $$
DECLARE
    v_qms RECORD;
    v_standards_count INTEGER;
    v_methods_count INTEGER;
    v_metrics_count INTEGER;
    v_roles_count INTEGER;
    v_independent_roles_count INTEGER;
    v_records_count INTEGER;
BEGIN
    -- Get QMS
    SELECT * INTO v_qms
    FROM quality_management_strategies
    WHERE id = p_qms_id
      AND is_deleted = false;
    
    IF v_qms IS NULL THEN
        RETURN QUERY SELECT 'QMS not found'::VARCHAR, false::BOOLEAN, ARRAY[]::TEXT[], 'QMS does not exist'::TEXT;
        RETURN;
    END IF;
    
    -- Count items in each section
    SELECT COUNT(*) INTO v_standards_count FROM qms_quality_standards WHERE qms_id = p_qms_id;
    SELECT COUNT(*) INTO v_methods_count FROM qms_quality_methods WHERE qms_id = p_qms_id;
    SELECT COUNT(*) INTO v_metrics_count FROM qms_quality_metrics WHERE qms_id = p_qms_id;
    SELECT COUNT(*) INTO v_roles_count FROM qms_roles_responsibilities WHERE qms_id = p_qms_id;
    SELECT COUNT(*) INTO v_independent_roles_count FROM qms_roles_responsibilities WHERE qms_id = p_qms_id AND independence_level IN ('project_independent', 'corporate', 'external');
    SELECT COUNT(*) INTO v_records_count FROM qms_records WHERE qms_id = p_qms_id;
    
    -- Check Introduction section
    RETURN QUERY SELECT 
        'Introduction'::VARCHAR,
        (v_qms.purpose IS NOT NULL AND length(trim(v_qms.purpose)) >= 50 
         AND v_qms.objectives IS NOT NULL AND length(trim(v_qms.objectives)) >= 30
         AND v_qms.scope IS NOT NULL AND length(trim(v_qms.scope)) >= 30)::BOOLEAN,
        CASE 
            WHEN v_qms.purpose IS NULL OR length(trim(v_qms.purpose)) < 50 THEN ARRAY['Purpose must be at least 50 characters']::TEXT[]
            WHEN v_qms.objectives IS NULL OR length(trim(v_qms.objectives)) < 30 THEN ARRAY['Objectives must be at least 30 characters']::TEXT[]
            WHEN v_qms.scope IS NULL OR length(trim(v_qms.scope)) < 30 THEN ARRAY['Scope must be at least 30 characters']::TEXT[]
            ELSE ARRAY[]::TEXT[]
        END,
        CASE 
            WHEN v_qms.purpose IS NULL OR length(trim(v_qms.purpose)) < 50 THEN 'Provide clear purpose (minimum 50 characters)'::TEXT
            WHEN v_qms.objectives IS NULL OR length(trim(v_qms.objectives)) < 30 THEN 'Define quality objectives (minimum 30 characters)'::TEXT
            WHEN v_qms.scope IS NULL OR length(trim(v_qms.scope)) < 30 THEN 'Define scope of quality management (minimum 30 characters)'::TEXT
            ELSE ''::TEXT
        END;
    
    -- Check Quality Procedures section
    RETURN QUERY SELECT 
        'Quality Procedures'::VARCHAR,
        (v_qms.quality_control_approach IS NOT NULL AND length(trim(v_qms.quality_control_approach)) >= 50
         AND v_qms.quality_assurance_approach IS NOT NULL AND length(trim(v_qms.quality_assurance_approach)) >= 50)::BOOLEAN,
        CASE 
            WHEN v_qms.quality_control_approach IS NULL OR length(trim(v_qms.quality_control_approach)) < 50 THEN ARRAY['Quality control approach must be at least 50 characters']::TEXT[]
            WHEN v_qms.quality_assurance_approach IS NULL OR length(trim(v_qms.quality_assurance_approach)) < 50 THEN ARRAY['Quality assurance approach must be at least 50 characters']::TEXT[]
            WHEN v_qms.variance_from_corporate IS NOT NULL AND (v_qms.variance_justification IS NULL OR length(trim(v_qms.variance_justification)) < 20) THEN ARRAY['Variance justification required if variance specified']::TEXT[]
            ELSE ARRAY[]::TEXT[]
        END,
        CASE 
            WHEN v_qms.quality_control_approach IS NULL OR length(trim(v_qms.quality_control_approach)) < 50 THEN 'Define quality control approach (minimum 50 characters)'::TEXT
            WHEN v_qms.quality_assurance_approach IS NULL OR length(trim(v_qms.quality_assurance_approach)) < 50 THEN 'Define quality assurance approach (minimum 50 characters)'::TEXT
            WHEN v_qms.variance_from_corporate IS NOT NULL AND (v_qms.variance_justification IS NULL OR length(trim(v_qms.variance_justification)) < 20) THEN 'Justify any variance from corporate standards'::TEXT
            ELSE ''::TEXT
        END;
    
    -- Check Quality Standards
    RETURN QUERY SELECT 
        'Quality Standards'::VARCHAR,
        (v_standards_count > 0)::BOOLEAN,
        CASE WHEN v_standards_count = 0 THEN ARRAY['No quality standards defined']::TEXT[] ELSE ARRAY[]::TEXT[] END,
        CASE WHEN v_standards_count = 0 THEN 'Add at least one quality standard to apply'::TEXT ELSE ''::TEXT END;
    
    -- Check Quality Methods
    RETURN QUERY SELECT 
        'Quality Methods'::VARCHAR,
        (v_methods_count > 0)::BOOLEAN,
        CASE WHEN v_methods_count = 0 THEN ARRAY['No quality methods defined']::TEXT[] ELSE ARRAY[]::TEXT[] END,
        CASE WHEN v_methods_count = 0 THEN 'Add at least one quality method (review, inspection, testing, etc.)'::TEXT ELSE ''::TEXT END;
    
    -- Check Quality Roles
    RETURN QUERY SELECT 
        'Quality Roles'::VARCHAR,
        (v_roles_count > 0 AND v_independent_roles_count > 0)::BOOLEAN,
        CASE 
            WHEN v_roles_count = 0 THEN ARRAY['No quality roles defined']::TEXT[]
            WHEN v_independent_roles_count = 0 THEN ARRAY['No independent quality role defined (must have at least one role at Project Independent level or higher)']::TEXT[]
            ELSE ARRAY[]::TEXT[]
        END,
        CASE 
            WHEN v_roles_count = 0 THEN 'Define quality roles and responsibilities'::TEXT
            WHEN v_independent_roles_count = 0 THEN 'Add at least one independent quality role (Project Assurance, Corporate QA, or External Auditor)'::TEXT
            ELSE ''::TEXT
        END;
    
    -- Check Quality Records
    RETURN QUERY SELECT 
        'Quality Records'::VARCHAR,
        (v_records_count > 0 AND EXISTS (SELECT 1 FROM qms_records WHERE qms_id = p_qms_id AND record_type = 'quality_register' AND is_mandatory = true))::BOOLEAN,
        CASE 
            WHEN v_records_count = 0 THEN ARRAY['No quality records defined']::TEXT[]
            WHEN NOT EXISTS (SELECT 1 FROM qms_records WHERE qms_id = p_qms_id AND record_type = 'quality_register') THEN ARRAY['Quality Register must be included in records']::TEXT[]
            ELSE ARRAY[]::TEXT[]
        END,
        CASE 
            WHEN v_records_count = 0 THEN 'Define quality records to be maintained'::TEXT
            WHEN NOT EXISTS (SELECT 1 FROM qms_records WHERE qms_id = p_qms_id AND record_type = 'quality_register') THEN 'Ensure Quality Register is included as a mandatory record'::TEXT
            ELSE ''::TEXT
        END;
    
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_qms_completeness(UUID) IS 'Validates that QMS has all required sections';

-- Function: Check QMS Conformance
CREATE OR REPLACE FUNCTION check_qms_conformance(p_qms_id UUID)
RETURNS TABLE (
    standard_name VARCHAR,
    conformance_status VARCHAR,
    gaps TEXT[],
    recommendations TEXT
) AS $$
DECLARE
    v_qms RECORD;
    v_corporate_policy_exists BOOLEAN;
    v_customer_qms_specified BOOLEAN;
    v_supplier_qms_specified BOOLEAN;
BEGIN
    -- Get QMS
    SELECT * INTO v_qms
    FROM quality_management_strategies
    WHERE id = p_qms_id
      AND is_deleted = false;
    
    IF v_qms IS NULL THEN
        RETURN;
    END IF;
    
    -- Check corporate policy conformance
    IF v_qms.corporate_quality_policy_reference IS NOT NULL AND trim(v_qms.corporate_quality_policy_reference) != '' THEN
        v_corporate_policy_exists := true;
        
        RETURN QUERY SELECT 
            'Corporate Quality Policy'::VARCHAR,
            CASE 
                WHEN v_qms.variance_from_corporate IS NOT NULL AND trim(v_qms.variance_from_corporate) != '' THEN 'Variance'::VARCHAR
                ELSE 'Conforms'::VARCHAR
            END,
            CASE 
                WHEN v_qms.variance_from_corporate IS NOT NULL AND (v_qms.variance_justification IS NULL OR length(trim(v_qms.variance_justification)) < 20) THEN ARRAY['Variance not justified']::TEXT[]
                ELSE ARRAY[]::TEXT[]
            END,
            CASE 
                WHEN v_qms.variance_from_corporate IS NOT NULL AND (v_qms.variance_justification IS NULL OR length(trim(v_qms.variance_justification)) < 20) THEN 'Provide justification for variance from corporate policy'::TEXT
                ELSE ''::TEXT
            END;
    ELSE
        RETURN QUERY SELECT 
            'Corporate Quality Policy'::VARCHAR,
            'Not Referenced'::VARCHAR,
            ARRAY['Corporate quality policy not referenced']::TEXT[],
            'Reference corporate quality policy if it exists'::TEXT;
    END IF;
    
    -- Check customer QMS conformance
    IF v_qms.customer_qms_reference IS NOT NULL AND trim(v_qms.customer_qms_reference) != '' THEN
        v_customer_qms_specified := true;
        
        RETURN QUERY SELECT 
            'Customer QMS'::VARCHAR,
            'Referenced'::VARCHAR,
            ARRAY[]::TEXT[],
            'Verify that QMS approach aligns with customer QMS requirements'::TEXT;
    END IF;
    
    -- Check supplier QMS conformance
    IF v_qms.supplier_qms_reference IS NOT NULL AND trim(v_qms.supplier_qms_reference) != '' THEN
        v_supplier_qms_specified := true;
        
        RETURN QUERY SELECT 
            'Supplier QMS'::VARCHAR,
            'Referenced'::VARCHAR,
            ARRAY[]::TEXT[],
            'Ensure supplier QMS elements are properly integrated'::TEXT;
    END IF;
    
    -- Check standards alignment
    IF EXISTS (SELECT 1 FROM qms_quality_standards WHERE qms_id = p_qms_id AND compliance_level = 'mandatory') THEN
        RETURN QUERY SELECT 
            'Mandatory Standards'::VARCHAR,
            'Defined'::VARCHAR,
            ARRAY[]::TEXT[],
            'Ensure all mandatory standards are properly implemented'::TEXT;
    END IF;
    
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_qms_conformance(UUID) IS 'Checks conformance to corporate/customer standards';

-- Function: Get Scheduled Quality Activities
CREATE OR REPLACE FUNCTION get_scheduled_quality_activities(p_project_id UUID, p_date_from DATE DEFAULT NULL, p_date_to DATE DEFAULT NULL)
RETURNS TABLE (
    activity_id UUID,
    activity_name VARCHAR,
    activity_type VARCHAR,
    scheduled_date DATE,
    participants TEXT
) AS $$
DECLARE
    v_qms_id UUID;
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    -- Get QMS for project
    SELECT id INTO v_qms_id
    FROM quality_management_strategies
    WHERE project_id = p_project_id
      AND is_deleted = false
    LIMIT 1;
    
    IF v_qms_id IS NULL THEN
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
        qsa.id AS activity_id,
        qsa.activity_name,
        qsa.activity_type,
        CURRENT_DATE AS scheduled_date, -- Placeholder - would need actual date calculation
        qsa.participants
    FROM qms_scheduled_activities qsa
    WHERE qsa.qms_id = v_qms_id
      AND (qsa.timing = 'on_demand' OR qsa.specific_timing IS NOT NULL)
    ORDER BY qsa.display_order, qsa.activity_name;
    
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_scheduled_quality_activities(UUID, DATE, DATE) IS 'Returns upcoming quality activities for a project';

-- ============================================================================
-- SECTION 16: REGISTER TABLES IN DATABASE_TABLES
-- ============================================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES 
    ('quality_management_strategies', 'Quality Management Strategy - Defines HOW quality will be achieved', false, true, 'structured'),
    ('qms_quality_standards', 'QMS Quality Standards - Standards to apply', false, true, 'structured'),
    ('qms_quality_methods', 'QMS Quality Methods - Quality control methods', false, true, 'structured'),
    ('qms_quality_metrics', 'QMS Quality Metrics - Quality metrics to track', false, true, 'structured'),
    ('qms_templates_forms', 'QMS Templates & Forms - Templates and forms to use', false, true, 'structured'),
    ('qms_tools_techniques', 'QMS Tools & Techniques - Tools and techniques for quality', false, true, 'structured'),
    ('qms_records', 'QMS Records - Quality records to maintain', false, true, 'structured'),
    ('qms_reports', 'QMS Reports - Quality reports to generate', false, true, 'structured'),
    ('qms_scheduled_activities', 'QMS Scheduled Activities - Timing of quality activities', false, true, 'structured'),
    ('qms_roles_responsibilities', 'QMS Roles & Responsibilities - Quality roles', false, true, 'structured'),
    ('qms_revision_history', 'QMS Revision History - Version history', false, true, 'structured'),
    ('qms_approvals', 'QMS Approvals - Approval records', false, true, 'structured'),
    ('qms_distribution', 'QMS Distribution - Distribution list', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE quality_management_strategies IS 'Quality Management Strategy - Defines HOW quality will be achieved in the project';
COMMENT ON TABLE qms_quality_standards IS 'Quality standards to apply in the project';
COMMENT ON TABLE qms_quality_methods IS 'Quality control methods (inspection, review, testing, etc.)';
COMMENT ON TABLE qms_quality_metrics IS 'Quality metrics to track and measure';
COMMENT ON TABLE qms_templates_forms IS 'Templates and forms to use for quality activities';
COMMENT ON TABLE qms_tools_techniques IS 'Tools and techniques for quality management';
COMMENT ON TABLE qms_records IS 'Quality records to maintain';
COMMENT ON TABLE qms_reports IS 'Quality reports to generate';
COMMENT ON TABLE qms_scheduled_activities IS 'Timing of formal quality activities (audits, reviews)';
COMMENT ON TABLE qms_roles_responsibilities IS 'Quality roles and responsibilities';
COMMENT ON TABLE qms_revision_history IS 'Version history of QMS changes';
COMMENT ON TABLE qms_approvals IS 'Approval records for QMS';
COMMENT ON TABLE qms_distribution IS 'Distribution list for QMS';

DO $$
BEGIN
    RAISE NOTICE 'v180_quality_management_strategy_tables.sql completed successfully';
END $$;

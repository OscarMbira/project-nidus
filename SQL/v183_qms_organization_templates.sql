-- ============================================================================
-- QMS Organization Templates
-- Version: v183
-- Description: Organization-level Quality Management Strategy templates
-- Date: 2026-01-19
-- ============================================================================
--
-- Purpose:
-- Creates organization-level QMS templates that PMO Admins can manage and use
-- to quickly create new QMS for projects. Templates can include pre-populated
-- standards, methods, metrics, tools, records, reports, activities, and roles.
--
-- Prerequisites:
-- - v180_quality_management_strategy_tables.sql must be run first
-- - v181_quality_management_strategy_rls_policies.sql
-- - accounts table must exist (for organization-level access)
--
-- ============================================================================
-- SECTION 1: ORGANIZATION QMS TEMPLATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS qms_organization_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Organization
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    
    -- Template Identification
    template_name VARCHAR(200) NOT NULL,
    template_description TEXT,
    template_category VARCHAR(100), -- 'default', 'industry', 'project_type', 'custom'
    is_default BOOLEAN DEFAULT false, -- Only one default per organization
    
    -- Template Content (copied to QMS when used)
    purpose TEXT,
    objectives TEXT,
    scope TEXT,
    strategy_responsibility TEXT,
    quality_planning_approach TEXT,
    quality_control_approach TEXT,
    quality_assurance_approach TEXT,
    variance_from_corporate TEXT,
    variance_justification TEXT,
    customer_qms_reference TEXT,
    supplier_qms_reference TEXT,
    corporate_quality_policy_reference TEXT,
    programme_quality_policy_reference TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false, -- Share with other organizations
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT qms_org_templates_unique_default UNIQUE (account_id, is_default) 
        DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT qms_org_templates_default_check CHECK (
        (is_default = true AND is_deleted = false) OR is_default = false
    )
);

CREATE INDEX IF NOT EXISTS idx_qms_org_templates_account ON qms_organization_templates(account_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_qms_org_templates_default ON qms_organization_templates(account_id, is_default) WHERE is_deleted = false AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_qms_org_templates_category ON qms_organization_templates(template_category) WHERE is_deleted = false;

-- ============================================================================
-- SECTION 2: TEMPLATE STANDARDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS qms_template_standards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES qms_organization_templates(id) ON DELETE CASCADE,
    
    -- Standard data (same structure as qms_quality_standards)
    standard_code VARCHAR(100) NOT NULL,
    standard_name VARCHAR(200) NOT NULL,
    standard_version VARCHAR(50),
    standard_description TEXT,
    standard_type VARCHAR(50) DEFAULT 'international',
    applicability TEXT,
    compliance_level VARCHAR(50) DEFAULT 'recommended',
    certification_required BOOLEAN DEFAULT false,
    external_link VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_qms_template_standards_template ON qms_template_standards(template_id);
CREATE INDEX IF NOT EXISTS idx_qms_template_standards_type ON qms_template_standards(standard_type);

-- ============================================================================
-- SECTION 3: TEMPLATE METHODS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS qms_template_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES qms_organization_templates(id) ON DELETE CASCADE,
    
    method_name VARCHAR(200) NOT NULL,
    method_type VARCHAR(50) DEFAULT 'review',
    method_description TEXT NOT NULL,
    when_to_use TEXT,
    entry_criteria TEXT,
    exit_criteria TEXT,
    required_participants TEXT,
    documentation_required TEXT,
    is_mandatory BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_qms_template_methods_template ON qms_template_methods(template_id);
CREATE INDEX IF NOT EXISTS idx_qms_template_methods_type ON qms_template_methods(method_type);

-- ============================================================================
-- SECTION 4: TEMPLATE METRICS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS qms_template_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES qms_organization_templates(id) ON DELETE CASCADE,
    
    metric_name VARCHAR(200) NOT NULL,
    metric_description TEXT NOT NULL,
    metric_category VARCHAR(50) DEFAULT 'other',
    measurement_method TEXT NOT NULL,
    unit_of_measure VARCHAR(50),
    target_value VARCHAR(100),
    threshold_warning VARCHAR(100),
    threshold_critical VARCHAR(100),
    collection_frequency VARCHAR(50) DEFAULT 'weekly',
    responsible_role VARCHAR(200),
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_qms_template_metrics_template ON qms_template_metrics(template_id);
CREATE INDEX IF NOT EXISTS idx_qms_template_metrics_category ON qms_template_metrics(metric_category);

-- ============================================================================
-- SECTION 5: TEMPLATE ROLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS qms_template_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES qms_organization_templates(id) ON DELETE CASCADE,
    
    role_name VARCHAR(200) NOT NULL,
    role_type VARCHAR(50) DEFAULT 'other',
    role_description TEXT NOT NULL,
    responsibilities TEXT NOT NULL,
    authority_level TEXT,
    independence_level VARCHAR(50) DEFAULT 'project_team',
    is_mandatory BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_qms_template_roles_template ON qms_template_roles(template_id);
CREATE INDEX IF NOT EXISTS idx_qms_template_roles_independence ON qms_template_roles(independence_level);

-- ============================================================================
-- SECTION 6: FUNCTIONS
-- ============================================================================

-- Function: Create QMS from Template
CREATE OR REPLACE FUNCTION create_qms_from_template(p_project_id UUID, p_template_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_qms_id UUID;
    v_template RECORD;
BEGIN
    -- Get template
    SELECT * INTO v_template
    FROM qms_organization_templates
    WHERE id = p_template_id
      AND is_deleted = false
      AND is_active = true;
    
    IF v_template IS NULL THEN
        RAISE EXCEPTION 'Template not found or inactive';
    END IF;
    
    -- Create QMS from template
    INSERT INTO quality_management_strategies (
        project_id,
        qms_reference,
        version_number,
        purpose,
        objectives,
        scope,
        strategy_responsibility,
        quality_planning_approach,
        quality_control_approach,
        quality_assurance_approach,
        variance_from_corporate,
        variance_justification,
        customer_qms_reference,
        supplier_qms_reference,
        corporate_quality_policy_reference,
        programme_quality_policy_reference,
        status,
        created_by,
        updated_by
    ) VALUES (
        p_project_id,
        generate_qms_reference(),
        '1.0',
        v_template.purpose,
        v_template.objectives,
        v_template.scope,
        v_template.strategy_responsibility,
        v_template.quality_planning_approach,
        v_template.quality_control_approach,
        v_template.quality_assurance_approach,
        v_template.variance_from_corporate,
        v_template.variance_justification,
        v_template.customer_qms_reference,
        v_template.supplier_qms_reference,
        v_template.corporate_quality_policy_reference,
        v_template.programme_quality_policy_reference,
        'draft',
        p_user_id,
        p_user_id
    ) RETURNING id INTO v_qms_id;
    
    -- Copy standards
    INSERT INTO qms_quality_standards (
        qms_id, standard_code, standard_name, standard_version, standard_description,
        standard_type, applicability, compliance_level, certification_required,
        external_link, display_order, created_by
    )
    SELECT 
        v_qms_id, standard_code, standard_name, standard_version, standard_description,
        standard_type, applicability, compliance_level, certification_required,
        external_link, display_order, p_user_id
    FROM qms_template_standards
    WHERE template_id = p_template_id;
    
    -- Copy methods
    INSERT INTO qms_quality_methods (
        qms_id, method_name, method_type, method_description, when_to_use,
        entry_criteria, exit_criteria, required_participants, documentation_required,
        is_mandatory, display_order, created_by
    )
    SELECT 
        v_qms_id, method_name, method_type, method_description, when_to_use,
        entry_criteria, exit_criteria, required_participants, documentation_required,
        is_mandatory, display_order, p_user_id
    FROM qms_template_methods
    WHERE template_id = p_template_id;
    
    -- Copy metrics
    INSERT INTO qms_quality_metrics (
        qms_id, metric_name, metric_description, metric_category, measurement_method,
        unit_of_measure, target_value, threshold_warning, threshold_critical,
        collection_frequency, responsible_role, display_order, created_by
    )
    SELECT 
        v_qms_id, metric_name, metric_description, metric_category, measurement_method,
        unit_of_measure, target_value, threshold_warning, threshold_critical,
        collection_frequency, responsible_role, display_order, p_user_id
    FROM qms_template_metrics
    WHERE template_id = p_template_id;
    
    -- Copy roles
    INSERT INTO qms_roles_responsibilities (
        qms_id, role_name, role_type, role_description, responsibilities,
        authority_level, independence_level, is_mandatory, display_order, created_by
    )
    SELECT 
        v_qms_id, role_name, role_type, role_description, responsibilities,
        authority_level, independence_level, is_mandatory, display_order, p_user_id
    FROM qms_template_roles
    WHERE template_id = p_template_id;
    
    -- Always add Quality Register as mandatory record
    INSERT INTO qms_records (
        qms_id, record_name, record_type, record_description, record_purpose,
        storage_location, is_mandatory, display_order, created_by
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

COMMENT ON FUNCTION create_qms_from_template(UUID, UUID, UUID) IS 'Creates QMS from organization template, copying all standards, methods, metrics, and roles';

-- Function: Ensure only one default template per organization
CREATE OR REPLACE FUNCTION ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        -- Unset other defaults for this organization
        UPDATE qms_organization_templates
        SET is_default = false,
            updated_at = NOW()
        WHERE account_id = NEW.account_id
          AND id != NEW.id
          AND is_default = true
          AND is_deleted = false;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single default
DROP TRIGGER IF EXISTS trg_qms_org_templates_single_default ON qms_organization_templates;
CREATE TRIGGER trg_qms_org_templates_single_default
    BEFORE INSERT OR UPDATE ON qms_organization_templates
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_template();

-- ============================================================================
-- SECTION 7: RLS POLICIES
-- ============================================================================

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON qms_organization_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE ON qms_template_standards TO authenticated;
GRANT SELECT, INSERT, UPDATE ON qms_template_methods TO authenticated;
GRANT SELECT, INSERT, UPDATE ON qms_template_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON qms_template_roles TO authenticated;

-- Enable RLS
ALTER TABLE qms_organization_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms_template_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms_template_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms_template_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms_template_roles ENABLE ROW LEVEL SECURITY;

-- Helper function to check template access
CREATE OR REPLACE FUNCTION check_qms_template_access(p_template_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM qms_organization_templates t
        JOIN accounts a ON t.account_id = a.id
        JOIN users u ON a.owner_user_id = u.id
        WHERE t.id = p_template_id
          AND t.is_deleted = false
          AND a.is_deleted = false
          AND u.auth_user_id = auth.uid()
        UNION
        -- User is member of account via projects
        SELECT 1 FROM qms_organization_templates t
        JOIN accounts a ON t.account_id = a.id
        JOIN projects p ON p.account_id = a.id
        JOIN user_projects up ON up.project_id = p.id
        JOIN users u ON up.user_id = u.id
        WHERE t.id = p_template_id
          AND t.is_deleted = false
          AND a.is_deleted = false
          AND p.is_deleted = false
          AND up.is_deleted = false
          AND u.auth_user_id = auth.uid()
        UNION
        -- PMO Admin or System Admin
        SELECT 1 FROM qms_organization_templates t
        JOIN user_roles ur ON ur.user_id = (
            SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1
        )
        JOIN roles r ON ur.role_id = r.id
        WHERE t.id = p_template_id
          AND t.is_deleted = false
          AND r.role_name IN ('pmo_admin', 'System Admin')
          AND ur.is_active = true
          AND ur.is_deleted = false
        UNION
        -- Public templates
        SELECT 1 FROM qms_organization_templates t
        WHERE t.id = p_template_id
          AND t.is_deleted = false
          AND t.is_public = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Templates policies
DROP POLICY IF EXISTS policy_qms_templates_select ON qms_organization_templates;
DROP POLICY IF EXISTS policy_qms_templates_insert ON qms_organization_templates;
DROP POLICY IF EXISTS policy_qms_templates_update ON qms_organization_templates;

CREATE POLICY policy_qms_templates_select ON qms_organization_templates
    FOR SELECT
    USING (
        is_deleted = false
        AND (
            -- User is account owner
            EXISTS (
                SELECT 1 FROM accounts a
                JOIN users u ON a.owner_user_id = u.id
                WHERE a.id = qms_organization_templates.account_id
                  AND u.auth_user_id = auth.uid()
                  AND a.is_deleted = false
            )
            -- OR user is member of account via projects
            OR EXISTS (
                SELECT 1 FROM accounts a
                JOIN projects p ON p.account_id = a.id
                JOIN user_projects up ON up.project_id = p.id
                JOIN users u ON up.user_id = u.id
                WHERE a.id = qms_organization_templates.account_id
                  AND u.auth_user_id = auth.uid()
                  AND a.is_deleted = false
                  AND p.is_deleted = false
                  AND up.is_deleted = false
            )
            -- OR user is PMO admin
            OR EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN users u ON ur.user_id = u.id
                JOIN roles r ON ur.role_id = r.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = true
                  AND ur.is_deleted = false
            )
            -- OR template is public
            OR is_public = true
        )
    );

CREATE POLICY policy_qms_templates_insert ON qms_organization_templates
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN users u ON ur.user_id = u.id
            JOIN roles r ON ur.role_id = r.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = true
              AND ur.is_deleted = false
        )
    );

CREATE POLICY policy_qms_templates_update ON qms_organization_templates
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN users u ON ur.user_id = u.id
            JOIN roles r ON ur.role_id = r.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = true
              AND ur.is_deleted = false
        )
    );

-- Child tables policies
CREATE POLICY policy_qms_template_standards_select ON qms_template_standards
    FOR SELECT
    USING (check_qms_template_access(template_id));

CREATE POLICY policy_qms_template_standards_insert ON qms_template_standards
    FOR INSERT
    WITH CHECK (check_qms_template_access(template_id));

CREATE POLICY policy_qms_template_standards_update ON qms_template_methods
    FOR UPDATE
    USING (check_qms_template_access(template_id));

CREATE POLICY policy_qms_template_methods_select ON qms_template_methods
    FOR SELECT
    USING (check_qms_template_access(template_id));

CREATE POLICY policy_qms_template_methods_insert ON qms_template_methods
    FOR INSERT
    WITH CHECK (check_qms_template_access(template_id));

CREATE POLICY policy_qms_template_methods_update ON qms_template_methods
    FOR UPDATE
    USING (check_qms_template_access(template_id));

CREATE POLICY policy_qms_template_metrics_select ON qms_template_metrics
    FOR SELECT
    USING (check_qms_template_access(template_id));

CREATE POLICY policy_qms_template_metrics_insert ON qms_template_metrics
    FOR INSERT
    WITH CHECK (check_qms_template_access(template_id));

CREATE POLICY policy_qms_template_metrics_update ON qms_template_metrics
    FOR UPDATE
    USING (check_qms_template_access(template_id));

CREATE POLICY policy_qms_template_roles_select ON qms_template_roles
    FOR SELECT
    USING (check_qms_template_access(template_id));

CREATE POLICY policy_qms_template_roles_insert ON qms_template_roles
    FOR INSERT
    WITH CHECK (check_qms_template_access(template_id));

CREATE POLICY policy_qms_template_roles_update ON qms_template_roles
    FOR UPDATE
    USING (check_qms_template_access(template_id));

-- ============================================================================
-- SECTION 8: REGISTER TABLES
-- ============================================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES 
    ('qms_organization_templates', 'Organization-level QMS templates', false, true, 'structured'),
    ('qms_template_standards', 'QMS template quality standards', false, true, 'structured'),
    ('qms_template_methods', 'QMS template quality methods', false, true, 'structured'),
    ('qms_template_metrics', 'QMS template quality metrics', false, true, 'structured'),
    ('qms_template_roles', 'QMS template quality roles', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

COMMENT ON TABLE qms_organization_templates IS 'Organization-level Quality Management Strategy templates';
COMMENT ON TABLE qms_template_standards IS 'Quality standards in organization templates';
COMMENT ON TABLE qms_template_methods IS 'Quality methods in organization templates';
COMMENT ON TABLE qms_template_metrics IS 'Quality metrics in organization templates';
COMMENT ON TABLE qms_template_roles IS 'Quality roles in organization templates';

DO $$
BEGIN
    RAISE NOTICE 'v183_qms_organization_templates.sql completed successfully';
END $$;

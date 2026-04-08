-- ============================================================================
-- RMS Organization Templates
-- Version: v200
-- Description: Organization-level Risk Management Strategy templates
-- Date: 2026-01-19
-- ============================================================================
--
-- Purpose:
-- Creates organization-level RMS templates that PMO Admins can manage and use
-- to quickly create new RMS for projects. Templates can include pre-populated
-- standards, methods, scales, matrices, strategies, tools, templates, records,
-- reports, activities, and roles.
--
-- Prerequisites:
-- - v197_risk_management_strategy_tables.sql must be run first
-- - v198_risk_management_strategy_rls_policies.sql
-- - accounts table must exist (for organization-level access)
--
-- ============================================================================
-- SECTION 1: ORGANIZATION RMS TEMPLATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS rms_organization_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Organization
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    
    -- Template Identification
    template_name VARCHAR(200) NOT NULL,
    template_description TEXT,
    template_category VARCHAR(100), -- 'default', 'industry', 'project_type', 'custom'
    is_default BOOLEAN DEFAULT false, -- Only one default per organization
    
    -- Template Content (copied to RMS when used)
    purpose TEXT,
    objectives TEXT,
    scope TEXT,
    strategy_responsibility TEXT,
    risk_identification_approach TEXT,
    risk_assessment_approach TEXT,
    risk_response_approach TEXT,
    risk_monitoring_approach TEXT,
    variance_from_corporate TEXT,
    variance_justification TEXT,
    customer_risk_standards_reference TEXT,
    supplier_risk_standards_reference TEXT,
    corporate_risk_policy_reference TEXT,
    programme_risk_policy_reference TEXT,
    
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
    CONSTRAINT rms_org_templates_unique_default UNIQUE (account_id, is_default) 
        DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT rms_org_templates_default_check CHECK (
        (is_default = true AND is_deleted = false) OR is_default = false
    )
);

CREATE INDEX IF NOT EXISTS idx_rms_org_templates_account ON rms_organization_templates(account_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_rms_org_templates_default ON rms_organization_templates(account_id, is_default) WHERE is_deleted = false AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_rms_org_templates_category ON rms_organization_templates(template_category) WHERE is_deleted = false;

-- ============================================================================
-- SECTION 2: TEMPLATE CHILD TABLES
-- ============================================================================

-- Template Standards
CREATE TABLE IF NOT EXISTS rms_template_standards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES rms_organization_templates(id) ON DELETE CASCADE,
    standard_code VARCHAR(100),
    standard_name VARCHAR(200) NOT NULL,
    standard_type VARCHAR(50),
    standard_description TEXT,
    applicability TEXT,
    compliance_level VARCHAR(50) DEFAULT 'recommended',
    template_reference TEXT,
    external_link VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rms_template_standards_template ON rms_template_standards(template_id);

-- Template Methods
CREATE TABLE IF NOT EXISTS rms_template_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES rms_organization_templates(id) ON DELETE CASCADE,
    method_name VARCHAR(200) NOT NULL,
    method_type VARCHAR(50) DEFAULT 'workshop',
    method_description TEXT NOT NULL,
    when_to_use TEXT,
    participants_required TEXT,
    frequency VARCHAR(100),
    documentation_required TEXT,
    is_mandatory BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rms_template_methods_template ON rms_template_methods(template_id);

-- Template Scales
CREATE TABLE IF NOT EXISTS rms_template_scales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES rms_organization_templates(id) ON DELETE CASCADE,
    scale_type VARCHAR(50) NOT NULL CHECK (scale_type IN ('probability', 'impact', 'proximity')),
    scale_name VARCHAR(200) NOT NULL,
    scale_description TEXT,
    scale_config JSONB NOT NULL,
    applicable_to TEXT,
    is_default BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rms_template_scales_template ON rms_template_scales(template_id);

-- Template Matrix
CREATE TABLE IF NOT EXISTS rms_template_matrix (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES rms_organization_templates(id) ON DELETE CASCADE,
    matrix_name VARCHAR(200) NOT NULL,
    matrix_description TEXT,
    probability_axis_config JSONB NOT NULL,
    impact_axis_config JSONB NOT NULL,
    risk_levels_config JSONB NOT NULL,
    matrix_type VARCHAR(50) DEFAULT 'standard',
    applicable_to TEXT,
    is_default BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rms_template_matrix_template ON rms_template_matrix(template_id);

-- Template Strategies
CREATE TABLE IF NOT EXISTS rms_template_strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES rms_organization_templates(id) ON DELETE CASCADE,
    strategy_name VARCHAR(200) NOT NULL,
    strategy_type VARCHAR(50) NOT NULL,
    strategy_description TEXT NOT NULL,
    applicable_to VARCHAR(50),
    when_to_use TEXT,
    implementation_guidance TEXT,
    examples TEXT,
    is_mandatory_for_levels TEXT[],
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rms_template_strategies_template ON rms_template_strategies(template_id);

-- Template Roles
CREATE TABLE IF NOT EXISTS rms_template_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES rms_organization_templates(id) ON DELETE CASCADE,
    role_name VARCHAR(200) NOT NULL,
    role_description TEXT NOT NULL,
    independence_level VARCHAR(50),
    responsibilities TEXT[],
    required_qualifications TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rms_template_roles_template ON rms_template_roles(template_id);

-- ============================================================================
-- SECTION 3: FUNCTION TO CREATE RMS FROM TEMPLATE
-- ============================================================================

CREATE OR REPLACE FUNCTION create_rms_from_template(
    p_project_id UUID,
    p_template_id UUID,
    p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_rms_id UUID;
    v_template RECORD;
BEGIN
    -- Get template
    SELECT * INTO v_template
    FROM rms_organization_templates
    WHERE id = p_template_id
      AND is_deleted = false
      AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template not found or inactive';
    END IF;

    -- Create RMS
    SELECT create_rms_for_project(p_project_id, p_user_id) INTO v_rms_id;

    -- Copy template content to RMS
    UPDATE risk_management_strategies
    SET
        purpose = v_template.purpose,
        objectives = v_template.objectives,
        scope = v_template.scope,
        strategy_responsibility = v_template.strategy_responsibility,
        risk_identification_approach = v_template.risk_identification_approach,
        risk_assessment_approach = v_template.risk_assessment_approach,
        risk_response_approach = v_template.risk_response_approach,
        risk_monitoring_approach = v_template.risk_monitoring_approach,
        variance_from_corporate = v_template.variance_from_corporate,
        variance_justification = v_template.variance_justification,
        customer_risk_standards_reference = v_template.customer_risk_standards_reference,
        supplier_risk_standards_reference = v_template.supplier_risk_standards_reference,
        corporate_risk_policy_reference = v_template.corporate_risk_policy_reference,
        programme_risk_policy_reference = v_template.programme_risk_policy_reference,
        updated_by = p_user_id
    WHERE id = v_rms_id;

    -- Copy standards
    INSERT INTO rms_risk_standards (
        rms_id, standard_code, standard_name, standard_type, standard_description,
        applicability, compliance_level, template_reference, external_link,
        display_order, created_by
    )
    SELECT
        v_rms_id, standard_code, standard_name, standard_type, standard_description,
        applicability, compliance_level, template_reference, external_link,
        display_order, p_user_id
    FROM rms_template_standards
    WHERE template_id = p_template_id;

    -- Copy methods
    INSERT INTO rms_identification_methods (
        rms_id, method_name, method_type, method_description, when_to_use,
        participants_required, frequency, documentation_required, is_mandatory,
        display_order, created_by
    )
    SELECT
        v_rms_id, method_name, method_type, method_description, when_to_use,
        participants_required, frequency, documentation_required, is_mandatory,
        display_order, p_user_id
    FROM rms_template_methods
    WHERE template_id = p_template_id;

    -- Copy scales
    INSERT INTO rms_assessment_scales (
        rms_id, scale_type, scale_name, scale_description, scale_config,
        applicable_to, is_default, display_order, created_by
    )
    SELECT
        v_rms_id, scale_type, scale_name, scale_description, scale_config,
        applicable_to, is_default, display_order, p_user_id
    FROM rms_template_scales
    WHERE template_id = p_template_id;

    -- Copy matrix
    INSERT INTO rms_risk_matrix (
        rms_id, matrix_name, matrix_description, probability_axis_config,
        impact_axis_config, risk_levels_config, matrix_type, applicable_to,
        is_default, display_order, created_by
    )
    SELECT
        v_rms_id, matrix_name, matrix_description, probability_axis_config,
        impact_axis_config, risk_levels_config, matrix_type, applicable_to,
        is_default, display_order, p_user_id
    FROM rms_template_matrix
    WHERE template_id = p_template_id;

    -- Copy strategies
    INSERT INTO rms_response_strategies (
        rms_id, strategy_name, strategy_type, strategy_description, applicable_to,
        when_to_use, implementation_guidance, examples, is_mandatory_for_levels,
        display_order, created_by
    )
    SELECT
        v_rms_id, strategy_name, strategy_type, strategy_description, applicable_to,
        when_to_use, implementation_guidance, examples, is_mandatory_for_levels,
        display_order, p_user_id
    FROM rms_template_strategies
    WHERE template_id = p_template_id;

    -- Copy roles
    INSERT INTO rms_roles_responsibilities (
        rms_id, role_name, role_description, independence_level, responsibilities,
        required_qualifications, display_order, created_by
    )
    SELECT
        v_rms_id, role_name, role_description, independence_level, responsibilities,
        required_qualifications, display_order, p_user_id
    FROM rms_template_roles
    WHERE template_id = p_template_id;

    -- Add revision history entry
    INSERT INTO rms_revision_history (
        rms_id, version_number, revision_reason, changes_summary, revised_by
    )
    VALUES (
        v_rms_id,
        (SELECT COALESCE(MAX(version_number), 0) + 1 FROM rms_revision_history WHERE rms_id = v_rms_id),
        'Created from template: ' || v_template.template_name,
        'RMS created from organization template',
        p_user_id
    );

    RETURN v_rms_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECTION 4: TRIGGER TO ENSURE SINGLE DEFAULT TEMPLATE
-- ============================================================================

CREATE OR REPLACE FUNCTION ensure_single_default_rms_template()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        -- Unset other defaults for this organization
        UPDATE rms_organization_templates
        SET is_default = false
        WHERE account_id = NEW.account_id
          AND id != NEW.id
          AND is_deleted = false;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_default_rms_template
    BEFORE INSERT OR UPDATE ON rms_organization_templates
    FOR EACH ROW
    WHEN (NEW.is_default = true)
    EXECUTE FUNCTION ensure_single_default_rms_template();

-- ============================================================================
-- SECTION 5: RLS POLICIES
-- ============================================================================

ALTER TABLE rms_organization_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE rms_template_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE rms_template_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE rms_template_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE rms_template_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE rms_template_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE rms_template_roles ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON rms_organization_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE ON rms_template_standards TO authenticated;
GRANT SELECT, INSERT, UPDATE ON rms_template_methods TO authenticated;
GRANT SELECT, INSERT, UPDATE ON rms_template_scales TO authenticated;
GRANT SELECT, INSERT, UPDATE ON rms_template_matrix TO authenticated;
GRANT SELECT, INSERT, UPDATE ON rms_template_strategies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON rms_template_roles TO authenticated;

-- Helper function for template access
CREATE OR REPLACE FUNCTION user_has_template_access(p_template_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM rms_organization_templates t
        JOIN accounts a ON t.account_id = a.id
        JOIN users u ON u.account_id = a.id
        WHERE t.id = p_template_id
          AND t.is_deleted = false
          AND (
              u.auth_user_id = auth.uid()
              OR EXISTS (
                  SELECT 1 FROM user_roles ur
                  JOIN users u2 ON ur.user_id = u2.id
                  JOIN roles r ON ur.role_id = r.id
                  WHERE u2.auth_user_id = auth.uid()
                    AND r.role_name IN ('pmo_admin', 'System Admin')
                    AND ur.is_active = TRUE
                    AND ur.is_deleted = FALSE
              )
          )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Template policies
CREATE POLICY policy_rms_templates_select ON rms_organization_templates
    FOR SELECT
    USING (
        is_deleted = false
        AND (
            is_public = true
            OR user_has_template_access(id)
        )
    );

CREATE POLICY policy_rms_templates_modify ON rms_organization_templates
    FOR ALL
    USING (
        is_deleted = false
        AND user_has_template_access(id)
    )
    WITH CHECK (
        is_deleted = false
        AND user_has_template_access(id)
    );

-- Child table policies
CREATE POLICY policy_rms_template_standards_all ON rms_template_standards
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM rms_organization_templates t
            WHERE t.id = rms_template_standards.template_id
              AND user_has_template_access(t.id)
        )
    );

CREATE POLICY policy_rms_template_methods_all ON rms_template_methods
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM rms_organization_templates t
            WHERE t.id = rms_template_methods.template_id
              AND user_has_template_access(t.id)
        )
    );

CREATE POLICY policy_rms_template_scales_all ON rms_template_scales
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM rms_organization_templates t
            WHERE t.id = rms_template_scales.template_id
              AND user_has_template_access(t.id)
        )
    );

CREATE POLICY policy_rms_template_matrix_all ON rms_template_matrix
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM rms_organization_templates t
            WHERE t.id = rms_template_matrix.template_id
              AND user_has_template_access(t.id)
        )
    );

CREATE POLICY policy_rms_template_strategies_all ON rms_template_strategies
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM rms_organization_templates t
            WHERE t.id = rms_template_strategies.template_id
              AND user_has_template_access(t.id)
        )
    );

CREATE POLICY policy_rms_template_roles_all ON rms_template_roles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM rms_organization_templates t
            WHERE t.id = rms_template_roles.template_id
              AND user_has_template_access(t.id)
        )
    );

DO $$
BEGIN
    RAISE NOTICE 'v200_rms_organization_templates.sql completed successfully';
    RAISE NOTICE 'Organization RMS templates tables and functions created';
END $$;

-- ============================================================================
-- Simulator RFP Document Register - Mirror Tables
-- Version: v259
-- Created: 2026-02-18
-- Description: Creates sim schema mirror tables for the RFP Document Register.
--              Mirrors all public schema RFP tables into the sim schema.
-- Tables: sim.rfp_documents, sim.rfp_line_items, sim.rfp_business_areas,
--         sim.rfp_scope_entities, sim.rfp_attachments
-- ============================================================================

-- Ensure sim schema exists
CREATE SCHEMA IF NOT EXISTS sim;

-- ============================================================================
-- 1. HELPER FUNCTION: sim.is_pmo_admin_user() for sim schema
-- ============================================================================

CREATE OR REPLACE FUNCTION sim.is_pmo_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        JOIN public.users u ON ur.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
        AND r.role_name IN ('pmo_admin', 'PMO Admin', 'system_admin', 'System Admin', 'super_admin')
        AND ur.is_active = TRUE
        AND ur.is_deleted = FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- 2. TABLE: sim.rfp_documents
-- ============================================================================

CREATE TABLE IF NOT EXISTS sim.rfp_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organisation_id UUID NOT NULL,
    project_id UUID,
    programme_id UUID,

    rfp_reference VARCHAR(50) NOT NULL,
    rfp_title VARCHAR(500) NOT NULL,
    rfp_description TEXT,
    rfp_category VARCHAR(100),

    service_provider_name VARCHAR(300),
    service_provider_code VARCHAR(50),
    service_provider_contact_person VARCHAR(200),
    service_provider_email VARCHAR(200),
    service_provider_phone VARCHAR(50),

    contract_value NUMERIC(15,2),
    currency VARCHAR(10) DEFAULT 'USD',

    status VARCHAR(20) NOT NULL DEFAULT 'draft',

    original_issue_date DATE,
    provider_selected_date DATE,
    contract_start_date DATE,
    contract_end_date DATE,
    loaded_date DATE DEFAULT CURRENT_DATE,

    original_document_ref VARCHAR(200),
    total_line_items INTEGER DEFAULT 0,
    notes TEXT,

    document_state VARCHAR(20) DEFAULT 'draft',
    version_number INTEGER DEFAULT 1,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),

    CONSTRAINT sim_rfp_documents_status_check CHECK (status IN ('draft', 'active', 'closed', 'on_hold')),
    CONSTRAINT sim_rfp_documents_document_state_check CHECK (document_state IN ('draft', 'active', 'closed', 'on_hold'))
);

COMMENT ON TABLE sim.rfp_documents IS 'Simulator mirror: Master RFP document register for practice/simulation scenarios.';

CREATE INDEX IF NOT EXISTS idx_sim_rfp_documents_org_id ON sim.rfp_documents(organisation_id);
CREATE INDEX IF NOT EXISTS idx_sim_rfp_documents_status ON sim.rfp_documents(status);
CREATE INDEX IF NOT EXISTS idx_sim_rfp_documents_is_deleted ON sim.rfp_documents(is_deleted);

-- ============================================================================
-- 3. TABLE: sim.rfp_line_items
-- ============================================================================

CREATE TABLE IF NOT EXISTS sim.rfp_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfp_id UUID NOT NULL REFERENCES sim.rfp_documents(id) ON DELETE CASCADE,

    item_number INTEGER NOT NULL,
    reference_number VARCHAR(100),
    scope_entity VARCHAR(200),
    business_area VARCHAR(200),
    description TEXT NOT NULL,
    vendor_response TEXT,

    priority VARCHAR(20) DEFAULT 'must_have',
    requirement_type VARCHAR(50) DEFAULT 'functional',
    is_mandatory BOOLEAN DEFAULT TRUE,
    acceptance_criteria TEXT,
    estimated_effort VARCHAR(200),
    dependency_notes TEXT,

    sort_order INTEGER,
    group_name VARCHAR(200),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),

    CONSTRAINT sim_rfp_line_items_priority_check CHECK (priority IN ('must_have', 'should_have', 'nice_to_have', 'future_consideration')),
    CONSTRAINT sim_rfp_line_items_req_type_check CHECK (requirement_type IN ('functional', 'non_functional', 'technical', 'operational', 'compliance', 'integration')),
    CONSTRAINT sim_rfp_line_items_unique_item UNIQUE (rfp_id, item_number)
);

COMMENT ON TABLE sim.rfp_line_items IS 'Simulator mirror: Individual RFP requirement line items.';

CREATE INDEX IF NOT EXISTS idx_sim_rfp_line_items_rfp_id ON sim.rfp_line_items(rfp_id);
CREATE INDEX IF NOT EXISTS idx_sim_rfp_line_items_is_deleted ON sim.rfp_line_items(is_deleted);

-- ============================================================================
-- 4. TABLE: sim.rfp_business_areas (Lookup)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sim.rfp_business_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL,
    area_code VARCHAR(20),
    area_name VARCHAR(200) NOT NULL,
    display_name VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE sim.rfp_business_areas IS 'Simulator mirror: RFP business area lookup table.';

-- ============================================================================
-- 5. TABLE: sim.rfp_scope_entities (Lookup)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sim.rfp_scope_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL,
    entity_code VARCHAR(20),
    entity_name VARCHAR(200) NOT NULL,
    display_name VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE sim.rfp_scope_entities IS 'Simulator mirror: RFP scope/entity lookup table.';

-- ============================================================================
-- 6. TABLE: sim.rfp_attachments
-- ============================================================================

CREATE TABLE IF NOT EXISTS sim.rfp_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfp_id UUID NOT NULL REFERENCES sim.rfp_documents(id) ON DELETE CASCADE,

    file_name VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    file_type VARCHAR(100),
    attachment_category VARCHAR(50) DEFAULT 'general',
    description TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),

    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),

    CONSTRAINT sim_rfp_attachments_category_check CHECK (attachment_category IN ('general', 'original_rfp', 'vendor_submission', 'contract', 'supporting_doc'))
);

COMMENT ON TABLE sim.rfp_attachments IS 'Simulator mirror: RFP file attachments.';

CREATE INDEX IF NOT EXISTS idx_sim_rfp_attachments_rfp_id ON sim.rfp_attachments(rfp_id);

-- ============================================================================
-- 7. TRIGGER: Auto-update total_line_items for sim
-- ============================================================================

CREATE OR REPLACE FUNCTION sim.update_rfp_line_item_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE sim.rfp_documents
        SET total_line_items = (
            SELECT COUNT(*) FROM sim.rfp_line_items
            WHERE rfp_id = NEW.rfp_id AND is_deleted = FALSE
        ),
        updated_at = NOW()
        WHERE id = NEW.rfp_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE sim.rfp_documents
        SET total_line_items = (
            SELECT COUNT(*) FROM sim.rfp_line_items
            WHERE rfp_id = OLD.rfp_id AND is_deleted = FALSE
        ),
        updated_at = NOW()
        WHERE id = OLD.rfp_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sim_update_rfp_line_item_count ON sim.rfp_line_items;
CREATE TRIGGER trg_sim_update_rfp_line_item_count
    AFTER INSERT OR UPDATE OF is_deleted OR DELETE ON sim.rfp_line_items
    FOR EACH ROW
    EXECUTE FUNCTION sim.update_rfp_line_item_count();

-- ============================================================================
-- 8. GRANTS for sim schema
-- ============================================================================

GRANT USAGE ON SCHEMA sim TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.rfp_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.rfp_line_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.rfp_business_areas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.rfp_scope_entities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.rfp_attachments TO authenticated;

-- ============================================================================
-- 9. RLS POLICIES for sim tables (same pattern as public schema)
-- ============================================================================

-- sim.rfp_documents
ALTER TABLE sim.rfp_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sim_rfp_documents_select" ON sim.rfp_documents;
CREATE POLICY "sim_rfp_documents_select" ON sim.rfp_documents
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

DROP POLICY IF EXISTS "sim_rfp_documents_insert" ON sim.rfp_documents;
CREATE POLICY "sim_rfp_documents_insert" ON sim.rfp_documents
    FOR INSERT TO authenticated
    WITH CHECK (sim.is_pmo_admin_user());

DROP POLICY IF EXISTS "sim_rfp_documents_update" ON sim.rfp_documents;
CREATE POLICY "sim_rfp_documents_update" ON sim.rfp_documents
    FOR UPDATE TO authenticated
    USING (sim.is_pmo_admin_user() AND is_deleted = FALSE)
    WITH CHECK (sim.is_pmo_admin_user());

DROP POLICY IF EXISTS "sim_rfp_documents_delete" ON sim.rfp_documents;
CREATE POLICY "sim_rfp_documents_delete" ON sim.rfp_documents
    FOR DELETE TO authenticated
    USING (sim.is_pmo_admin_user());

-- sim.rfp_line_items
ALTER TABLE sim.rfp_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sim_rfp_line_items_select" ON sim.rfp_line_items;
CREATE POLICY "sim_rfp_line_items_select" ON sim.rfp_line_items
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

DROP POLICY IF EXISTS "sim_rfp_line_items_insert" ON sim.rfp_line_items;
CREATE POLICY "sim_rfp_line_items_insert" ON sim.rfp_line_items
    FOR INSERT TO authenticated
    WITH CHECK (sim.is_pmo_admin_user());

DROP POLICY IF EXISTS "sim_rfp_line_items_update" ON sim.rfp_line_items;
CREATE POLICY "sim_rfp_line_items_update" ON sim.rfp_line_items
    FOR UPDATE TO authenticated
    USING (sim.is_pmo_admin_user() AND is_deleted = FALSE)
    WITH CHECK (sim.is_pmo_admin_user());

DROP POLICY IF EXISTS "sim_rfp_line_items_delete" ON sim.rfp_line_items;
CREATE POLICY "sim_rfp_line_items_delete" ON sim.rfp_line_items
    FOR DELETE TO authenticated
    USING (sim.is_pmo_admin_user());

-- sim.rfp_business_areas
ALTER TABLE sim.rfp_business_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sim_rfp_business_areas_select" ON sim.rfp_business_areas;
CREATE POLICY "sim_rfp_business_areas_select" ON sim.rfp_business_areas
    FOR SELECT TO authenticated USING (is_active = TRUE);

DROP POLICY IF EXISTS "sim_rfp_business_areas_insert" ON sim.rfp_business_areas;
CREATE POLICY "sim_rfp_business_areas_insert" ON sim.rfp_business_areas
    FOR INSERT TO authenticated WITH CHECK (sim.is_pmo_admin_user());

DROP POLICY IF EXISTS "sim_rfp_business_areas_update" ON sim.rfp_business_areas;
CREATE POLICY "sim_rfp_business_areas_update" ON sim.rfp_business_areas
    FOR UPDATE TO authenticated
    USING (sim.is_pmo_admin_user()) WITH CHECK (sim.is_pmo_admin_user());

DROP POLICY IF EXISTS "sim_rfp_business_areas_delete" ON sim.rfp_business_areas;
CREATE POLICY "sim_rfp_business_areas_delete" ON sim.rfp_business_areas
    FOR DELETE TO authenticated USING (sim.is_pmo_admin_user());

-- sim.rfp_scope_entities
ALTER TABLE sim.rfp_scope_entities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sim_rfp_scope_entities_select" ON sim.rfp_scope_entities;
CREATE POLICY "sim_rfp_scope_entities_select" ON sim.rfp_scope_entities
    FOR SELECT TO authenticated USING (is_active = TRUE);

DROP POLICY IF EXISTS "sim_rfp_scope_entities_insert" ON sim.rfp_scope_entities;
CREATE POLICY "sim_rfp_scope_entities_insert" ON sim.rfp_scope_entities
    FOR INSERT TO authenticated WITH CHECK (sim.is_pmo_admin_user());

DROP POLICY IF EXISTS "sim_rfp_scope_entities_update" ON sim.rfp_scope_entities;
CREATE POLICY "sim_rfp_scope_entities_update" ON sim.rfp_scope_entities
    FOR UPDATE TO authenticated
    USING (sim.is_pmo_admin_user()) WITH CHECK (sim.is_pmo_admin_user());

DROP POLICY IF EXISTS "sim_rfp_scope_entities_delete" ON sim.rfp_scope_entities;
CREATE POLICY "sim_rfp_scope_entities_delete" ON sim.rfp_scope_entities
    FOR DELETE TO authenticated USING (sim.is_pmo_admin_user());

-- sim.rfp_attachments
ALTER TABLE sim.rfp_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sim_rfp_attachments_select" ON sim.rfp_attachments;
CREATE POLICY "sim_rfp_attachments_select" ON sim.rfp_attachments
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

DROP POLICY IF EXISTS "sim_rfp_attachments_insert" ON sim.rfp_attachments;
CREATE POLICY "sim_rfp_attachments_insert" ON sim.rfp_attachments
    FOR INSERT TO authenticated WITH CHECK (sim.is_pmo_admin_user());

DROP POLICY IF EXISTS "sim_rfp_attachments_update" ON sim.rfp_attachments;
CREATE POLICY "sim_rfp_attachments_update" ON sim.rfp_attachments
    FOR UPDATE TO authenticated
    USING (sim.is_pmo_admin_user() AND is_deleted = FALSE) WITH CHECK (sim.is_pmo_admin_user());

DROP POLICY IF EXISTS "sim_rfp_attachments_delete" ON sim.rfp_attachments;
CREATE POLICY "sim_rfp_attachments_delete" ON sim.rfp_attachments
    FOR DELETE TO authenticated USING (sim.is_pmo_admin_user());

-- ============================================================================
-- 10. REGISTER sim TABLES IN database_tables
-- ============================================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('sim.rfp_documents', 'Simulator mirror: Master RFP document register for practice scenarios.', false, true),
    ('sim.rfp_line_items', 'Simulator mirror: Individual RFP requirement line items.', false, true),
    ('sim.rfp_business_areas', 'Simulator mirror: RFP business area lookup table.', true, true),
    ('sim.rfp_scope_entities', 'Simulator mirror: RFP scope/entity lookup table.', true, true),
    ('sim.rfp_attachments', 'Simulator mirror: RFP file attachments.', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    updated_at = NOW();

-- ============================================================================
-- 11. COMPLETION NOTICE
-- ============================================================================

DO $$ BEGIN
    RAISE NOTICE 'Migration v259 - Simulator RFP Document Register tables created successfully';
    RAISE NOTICE 'Tables: sim.rfp_documents, sim.rfp_line_items, sim.rfp_business_areas, sim.rfp_scope_entities, sim.rfp_attachments';
END $$;

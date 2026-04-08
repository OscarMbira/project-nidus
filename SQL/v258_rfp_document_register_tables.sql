-- ============================================================================
-- RFP Document Register - Database Foundation
-- Version: v258
-- Created: 2026-02-18
-- Description: Creates core tables for the RFP Document Register feature.
--              PMO loads/captures RFP details for already-selected service
--              providers. PMO Admin has full CRUD, all other roles read-only.
-- Tables: rfp_documents, rfp_line_items, rfp_business_areas,
--         rfp_scope_entities, rfp_attachments
-- ============================================================================

-- ============================================================================
-- 1. HELPER FUNCTION: is_pmo_admin_user()
-- Reusable check for PMO Admin role across all RFP table policies
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_pmo_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        JOIN users u ON ur.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
        AND r.role_name IN ('pmo_admin', 'PMO Admin', 'system_admin', 'System Admin', 'super_admin')
        AND ur.is_active = TRUE
        AND ur.is_deleted = FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_pmo_admin_user() IS 'Returns TRUE if the current authenticated user has the PMO Admin (or higher) role. Used for RFP and other PMO-scoped RLS policies.';

-- ============================================================================
-- 2. TABLE: rfp_documents (Master RFP Record)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rfp_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Organisation & Project Context
    organisation_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL,

    -- RFP Identity
    rfp_reference VARCHAR(50) NOT NULL,
    rfp_title VARCHAR(500) NOT NULL,
    rfp_description TEXT,
    rfp_category VARCHAR(100),

    -- Selected Service Provider (already chosen - not a bidding process)
    service_provider_name VARCHAR(300),
    service_provider_code VARCHAR(50),
    service_provider_contact_person VARCHAR(200),
    service_provider_email VARCHAR(200),
    service_provider_phone VARCHAR(50),

    -- Financial
    contract_value NUMERIC(15,2),
    currency VARCHAR(10) DEFAULT 'USD',

    -- Lifecycle (simple: draft -> active -> closed)
    status VARCHAR(20) NOT NULL DEFAULT 'draft',

    -- Key Dates
    original_issue_date DATE,
    provider_selected_date DATE,
    contract_start_date DATE,
    contract_end_date DATE,
    loaded_date DATE DEFAULT CURRENT_DATE,

    -- Document Info
    original_document_ref VARCHAR(200),
    total_line_items INTEGER DEFAULT 0,
    notes TEXT,

    -- Document Governance
    document_state VARCHAR(20) DEFAULT 'draft',
    version_number INTEGER DEFAULT 1,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),

    -- Constraints
    CONSTRAINT rfp_documents_status_check CHECK (status IN ('draft', 'active', 'closed', 'on_hold')),
    CONSTRAINT rfp_documents_document_state_check CHECK (document_state IN ('draft', 'active', 'closed', 'on_hold'))
);

COMMENT ON TABLE rfp_documents IS 'Master RFP document register. PMO loads RFP details for already-selected service providers.';
COMMENT ON COLUMN rfp_documents.rfp_reference IS 'Auto-generated or manually entered RFP reference number';
COMMENT ON COLUMN rfp_documents.service_provider_name IS 'Name of the already-selected service provider';
COMMENT ON COLUMN rfp_documents.loaded_date IS 'Date when PMO loaded this RFP into the system';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rfp_documents_organisation_id ON rfp_documents(organisation_id);
CREATE INDEX IF NOT EXISTS idx_rfp_documents_project_id ON rfp_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_rfp_documents_programme_id ON rfp_documents(programme_id);
CREATE INDEX IF NOT EXISTS idx_rfp_documents_status ON rfp_documents(status);
CREATE INDEX IF NOT EXISTS idx_rfp_documents_created_by ON rfp_documents(created_by);
CREATE INDEX IF NOT EXISTS idx_rfp_documents_is_deleted ON rfp_documents(is_deleted);
CREATE INDEX IF NOT EXISTS idx_rfp_documents_rfp_reference ON rfp_documents(rfp_reference);

-- ============================================================================
-- 3. TABLE: rfp_line_items (Individual Requirement Rows from Excel/CSV)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rfp_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfp_id UUID NOT NULL REFERENCES rfp_documents(id) ON DELETE CASCADE,

    -- From Excel Columns (matching the reference image)
    item_number INTEGER NOT NULL,
    reference_number VARCHAR(100),
    scope_entity VARCHAR(200),
    business_area VARCHAR(200),
    description TEXT NOT NULL,
    vendor_response TEXT,

    -- Extended Fields (best practice)
    priority VARCHAR(20) DEFAULT 'must_have',
    requirement_type VARCHAR(50) DEFAULT 'functional',
    is_mandatory BOOLEAN DEFAULT TRUE,
    acceptance_criteria TEXT,
    estimated_effort VARCHAR(200),
    dependency_notes TEXT,

    -- Ordering & Grouping
    sort_order INTEGER,
    group_name VARCHAR(200),

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),

    -- Constraints
    CONSTRAINT rfp_line_items_priority_check CHECK (priority IN ('must_have', 'should_have', 'nice_to_have', 'future_consideration')),
    CONSTRAINT rfp_line_items_requirement_type_check CHECK (requirement_type IN ('functional', 'non_functional', 'technical', 'operational', 'compliance', 'integration')),
    CONSTRAINT rfp_line_items_unique_item_number UNIQUE (rfp_id, item_number)
);

COMMENT ON TABLE rfp_line_items IS 'Individual RFP requirement line items. Maps directly to rows in the uploaded Excel/CSV file.';
COMMENT ON COLUMN rfp_line_items.item_number IS 'Sequential number (S/No from Excel)';
COMMENT ON COLUMN rfp_line_items.reference_number IS 'Delta ID / Reference No. from the original RFP document';
COMMENT ON COLUMN rfp_line_items.vendor_response IS 'Selected service provider response/comments as-is from their submission';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rfp_line_items_rfp_id ON rfp_line_items(rfp_id);
CREATE INDEX IF NOT EXISTS idx_rfp_line_items_business_area ON rfp_line_items(business_area);
CREATE INDEX IF NOT EXISTS idx_rfp_line_items_scope_entity ON rfp_line_items(scope_entity);
CREATE INDEX IF NOT EXISTS idx_rfp_line_items_is_deleted ON rfp_line_items(is_deleted);
CREATE INDEX IF NOT EXISTS idx_rfp_line_items_sort_order ON rfp_line_items(rfp_id, sort_order);

-- ============================================================================
-- 4. TABLE: rfp_business_areas (Lookup)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rfp_business_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    area_code VARCHAR(20),
    area_name VARCHAR(200) NOT NULL,
    display_name VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE rfp_business_areas IS 'Lookup table for RFP business area categories (e.g., Credit, Trade Finance, Corporate Banking)';

CREATE INDEX IF NOT EXISTS idx_rfp_business_areas_org_id ON rfp_business_areas(organisation_id);
CREATE INDEX IF NOT EXISTS idx_rfp_business_areas_active ON rfp_business_areas(is_active);

-- ============================================================================
-- 5. TABLE: rfp_scope_entities (Lookup)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rfp_scope_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    entity_code VARCHAR(20),
    entity_name VARCHAR(200) NOT NULL,
    display_name VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE rfp_scope_entities IS 'Lookup table for RFP scope/entity options (e.g., DRC Only, Group-wide)';

CREATE INDEX IF NOT EXISTS idx_rfp_scope_entities_org_id ON rfp_scope_entities(organisation_id);
CREATE INDEX IF NOT EXISTS idx_rfp_scope_entities_active ON rfp_scope_entities(is_active);

-- ============================================================================
-- 6. TABLE: rfp_attachments
-- ============================================================================

CREATE TABLE IF NOT EXISTS rfp_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfp_id UUID NOT NULL REFERENCES rfp_documents(id) ON DELETE CASCADE,

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

    -- Constraints
    CONSTRAINT rfp_attachments_category_check CHECK (attachment_category IN ('general', 'original_rfp', 'vendor_submission', 'contract', 'supporting_doc'))
);

COMMENT ON TABLE rfp_attachments IS 'File attachments linked to RFP documents (original RFP file, vendor submission, contract, etc.)';

CREATE INDEX IF NOT EXISTS idx_rfp_attachments_rfp_id ON rfp_attachments(rfp_id);
CREATE INDEX IF NOT EXISTS idx_rfp_attachments_is_deleted ON rfp_attachments(is_deleted);

-- ============================================================================
-- 7. TRIGGER: Auto-update total_line_items count on rfp_documents
-- ============================================================================

CREATE OR REPLACE FUNCTION update_rfp_line_item_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE rfp_documents
        SET total_line_items = (
            SELECT COUNT(*) FROM rfp_line_items
            WHERE rfp_id = NEW.rfp_id AND is_deleted = FALSE
        ),
        updated_at = NOW()
        WHERE id = NEW.rfp_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE rfp_documents
        SET total_line_items = (
            SELECT COUNT(*) FROM rfp_line_items
            WHERE rfp_id = OLD.rfp_id AND is_deleted = FALSE
        ),
        updated_at = NOW()
        WHERE id = OLD.rfp_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_rfp_line_item_count ON rfp_line_items;
CREATE TRIGGER trg_update_rfp_line_item_count
    AFTER INSERT OR UPDATE OF is_deleted OR DELETE ON rfp_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_rfp_line_item_count();

-- ============================================================================
-- 8. TRIGGER: Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_rfp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rfp_documents_updated_at ON rfp_documents;
CREATE TRIGGER trg_rfp_documents_updated_at
    BEFORE UPDATE ON rfp_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_rfp_updated_at();

DROP TRIGGER IF EXISTS trg_rfp_line_items_updated_at ON rfp_line_items;
CREATE TRIGGER trg_rfp_line_items_updated_at
    BEFORE UPDATE ON rfp_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_rfp_updated_at();

-- ============================================================================
-- 9. GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON rfp_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rfp_line_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rfp_business_areas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rfp_scope_entities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rfp_attachments TO authenticated;

GRANT SELECT ON rfp_documents TO anon;
GRANT SELECT ON rfp_line_items TO anon;
GRANT SELECT ON rfp_business_areas TO anon;
GRANT SELECT ON rfp_scope_entities TO anon;

-- ============================================================================
-- 10. RLS POLICIES: rfp_documents
-- ============================================================================

ALTER TABLE rfp_documents ENABLE ROW LEVEL SECURITY;

-- SELECT: All authenticated users in the same organisation
DROP POLICY IF EXISTS "rfp_documents_select_policy" ON rfp_documents;
CREATE POLICY "rfp_documents_select_policy" ON rfp_documents
    FOR SELECT TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            -- PMO Admin / System Admin can see all in their org
            public.is_pmo_admin_user()
            -- Creator can see their own
            OR created_by = auth.uid()
            -- Members of linked project can see
            OR (
                project_id IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM user_projects up
                    JOIN users u ON up.user_id = u.id
                    WHERE u.auth_user_id = auth.uid()
                    AND up.project_id = rfp_documents.project_id
                    AND up.is_deleted = FALSE
                )
            )
            -- Organisation members can see
            OR EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                AND ur.is_active = TRUE
                AND ur.is_deleted = FALSE
            )
        )
    );

-- INSERT: PMO Admin only
DROP POLICY IF EXISTS "rfp_documents_insert_policy" ON rfp_documents;
CREATE POLICY "rfp_documents_insert_policy" ON rfp_documents
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_pmo_admin_user()
    );

-- UPDATE: PMO Admin only
DROP POLICY IF EXISTS "rfp_documents_update_policy" ON rfp_documents;
CREATE POLICY "rfp_documents_update_policy" ON rfp_documents
    FOR UPDATE TO authenticated
    USING (
        public.is_pmo_admin_user()
        AND is_deleted = FALSE
    )
    WITH CHECK (
        public.is_pmo_admin_user()
    );

-- DELETE: PMO Admin only (soft delete via UPDATE, but policy needed for hard delete)
DROP POLICY IF EXISTS "rfp_documents_delete_policy" ON rfp_documents;
CREATE POLICY "rfp_documents_delete_policy" ON rfp_documents
    FOR DELETE TO authenticated
    USING (
        public.is_pmo_admin_user()
    );

-- ============================================================================
-- 11. RLS POLICIES: rfp_line_items
-- ============================================================================

ALTER TABLE rfp_line_items ENABLE ROW LEVEL SECURITY;

-- SELECT: Anyone who can see the parent rfp_document
DROP POLICY IF EXISTS "rfp_line_items_select_policy" ON rfp_line_items;
CREATE POLICY "rfp_line_items_select_policy" ON rfp_line_items
    FOR SELECT TO authenticated
    USING (
        is_deleted = FALSE
        AND EXISTS (
            SELECT 1 FROM rfp_documents rd
            WHERE rd.id = rfp_line_items.rfp_id
            AND rd.is_deleted = FALSE
        )
    );

-- INSERT: PMO Admin only
DROP POLICY IF EXISTS "rfp_line_items_insert_policy" ON rfp_line_items;
CREATE POLICY "rfp_line_items_insert_policy" ON rfp_line_items
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_pmo_admin_user()
    );

-- UPDATE: PMO Admin only
DROP POLICY IF EXISTS "rfp_line_items_update_policy" ON rfp_line_items;
CREATE POLICY "rfp_line_items_update_policy" ON rfp_line_items
    FOR UPDATE TO authenticated
    USING (
        public.is_pmo_admin_user()
        AND is_deleted = FALSE
    )
    WITH CHECK (
        public.is_pmo_admin_user()
    );

-- DELETE: PMO Admin only
DROP POLICY IF EXISTS "rfp_line_items_delete_policy" ON rfp_line_items;
CREATE POLICY "rfp_line_items_delete_policy" ON rfp_line_items
    FOR DELETE TO authenticated
    USING (
        public.is_pmo_admin_user()
    );

-- ============================================================================
-- 12. RLS POLICIES: rfp_business_areas (Lookup)
-- ============================================================================

ALTER TABLE rfp_business_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rfp_business_areas_select_policy" ON rfp_business_areas;
CREATE POLICY "rfp_business_areas_select_policy" ON rfp_business_areas
    FOR SELECT TO authenticated
    USING (is_active = TRUE);

DROP POLICY IF EXISTS "rfp_business_areas_insert_policy" ON rfp_business_areas;
CREATE POLICY "rfp_business_areas_insert_policy" ON rfp_business_areas
    FOR INSERT TO authenticated
    WITH CHECK (public.is_pmo_admin_user());

DROP POLICY IF EXISTS "rfp_business_areas_update_policy" ON rfp_business_areas;
CREATE POLICY "rfp_business_areas_update_policy" ON rfp_business_areas
    FOR UPDATE TO authenticated
    USING (public.is_pmo_admin_user())
    WITH CHECK (public.is_pmo_admin_user());

DROP POLICY IF EXISTS "rfp_business_areas_delete_policy" ON rfp_business_areas;
CREATE POLICY "rfp_business_areas_delete_policy" ON rfp_business_areas
    FOR DELETE TO authenticated
    USING (public.is_pmo_admin_user());

-- ============================================================================
-- 13. RLS POLICIES: rfp_scope_entities (Lookup)
-- ============================================================================

ALTER TABLE rfp_scope_entities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rfp_scope_entities_select_policy" ON rfp_scope_entities;
CREATE POLICY "rfp_scope_entities_select_policy" ON rfp_scope_entities
    FOR SELECT TO authenticated
    USING (is_active = TRUE);

DROP POLICY IF EXISTS "rfp_scope_entities_insert_policy" ON rfp_scope_entities;
CREATE POLICY "rfp_scope_entities_insert_policy" ON rfp_scope_entities
    FOR INSERT TO authenticated
    WITH CHECK (public.is_pmo_admin_user());

DROP POLICY IF EXISTS "rfp_scope_entities_update_policy" ON rfp_scope_entities;
CREATE POLICY "rfp_scope_entities_update_policy" ON rfp_scope_entities
    FOR UPDATE TO authenticated
    USING (public.is_pmo_admin_user())
    WITH CHECK (public.is_pmo_admin_user());

DROP POLICY IF EXISTS "rfp_scope_entities_delete_policy" ON rfp_scope_entities;
CREATE POLICY "rfp_scope_entities_delete_policy" ON rfp_scope_entities
    FOR DELETE TO authenticated
    USING (public.is_pmo_admin_user());

-- ============================================================================
-- 14. RLS POLICIES: rfp_attachments
-- ============================================================================

ALTER TABLE rfp_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rfp_attachments_select_policy" ON rfp_attachments;
CREATE POLICY "rfp_attachments_select_policy" ON rfp_attachments
    FOR SELECT TO authenticated
    USING (
        is_deleted = FALSE
        AND EXISTS (
            SELECT 1 FROM rfp_documents rd
            WHERE rd.id = rfp_attachments.rfp_id
            AND rd.is_deleted = FALSE
        )
    );

DROP POLICY IF EXISTS "rfp_attachments_insert_policy" ON rfp_attachments;
CREATE POLICY "rfp_attachments_insert_policy" ON rfp_attachments
    FOR INSERT TO authenticated
    WITH CHECK (public.is_pmo_admin_user());

DROP POLICY IF EXISTS "rfp_attachments_update_policy" ON rfp_attachments;
CREATE POLICY "rfp_attachments_update_policy" ON rfp_attachments
    FOR UPDATE TO authenticated
    USING (public.is_pmo_admin_user() AND is_deleted = FALSE)
    WITH CHECK (public.is_pmo_admin_user());

DROP POLICY IF EXISTS "rfp_attachments_delete_policy" ON rfp_attachments;
CREATE POLICY "rfp_attachments_delete_policy" ON rfp_attachments
    FOR DELETE TO authenticated
    USING (public.is_pmo_admin_user());

-- ============================================================================
-- 15. REGISTER TABLES IN database_tables
-- ============================================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('rfp_documents', 'Master RFP document register. PMO loads RFP details for already-selected service providers.', false, true),
    ('rfp_line_items', 'Individual RFP requirement line items mapped from uploaded Excel/CSV files.', false, true),
    ('rfp_business_areas', 'Lookup table for RFP business area categories (e.g., Credit, Trade Finance).', true, true),
    ('rfp_scope_entities', 'Lookup table for RFP scope/entity options (e.g., DRC Only, Group-wide).', true, true),
    ('rfp_attachments', 'File attachments linked to RFP documents (original RFP, vendor submission, contract).', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    updated_at = NOW();

-- ============================================================================
-- 16. COMPLETION NOTICE
-- ============================================================================

DO $$ BEGIN
    RAISE NOTICE 'Migration v258 - RFP Document Register tables created successfully';
    RAISE NOTICE 'Tables: rfp_documents, rfp_line_items, rfp_business_areas, rfp_scope_entities, rfp_attachments';
    RAISE NOTICE 'Helper function: is_pmo_admin_user()';
    RAISE NOTICE 'RLS: PMO Admin full CRUD, all other roles SELECT only';
END $$;

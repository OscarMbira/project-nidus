-- ================================================
-- File: v151_document_governance_rls_policies.sql
-- Description: Row Level Security (RLS) policies for document governance tables
-- Version: 1.0
-- Date: 2026-01-08
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v146_document_governance_tables.sql must be run first
-- - v09_rls_policies.sql (for helper functions/patterns)

-- Purpose:
-- Enables Row Level Security on all document governance tables and creates policies for:
-- - PMO Admin: Full access (all operations)
-- - Project Manager: Read/Write own project documents
-- - Executive: Read assigned project documents
-- - Programme Manager: Read/Write own programme documents
-- - Team Members: Read project documents for their projects

-- ================================================
-- SECTION 1: HELPER FUNCTION FOR PMO ADMIN CHECK
-- ================================================

-- Function to check if user is PMO Admin (org.admin permission)
CREATE OR REPLACE FUNCTION is_pmo_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = user_id
          AND p.permission_code = 'org.admin'
          AND ur.is_active = TRUE
          AND ur.is_deleted = FALSE
          AND rp.is_active = TRUE
          AND rp.is_deleted = FALSE
          AND p.is_active = TRUE
          AND p.is_deleted = FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- SECTION 2: document_governance_stages TABLE
-- ================================================

ALTER TABLE document_governance_stages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "document_governance_stages_select" ON document_governance_stages;
DROP POLICY IF EXISTS "document_governance_stages_pmo_admin_all" ON document_governance_stages;

-- Policy: All authenticated users can read stages
CREATE POLICY "document_governance_stages_select"
    ON document_governance_stages FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy: PMO Admin can manage stages
CREATE POLICY "document_governance_stages_pmo_admin_all"
    ON document_governance_stages FOR ALL
    USING (
        is_pmo_admin(
            (SELECT id FROM users WHERE auth_user_id = auth.uid())
        )
    );

-- ================================================
-- SECTION 3: document_types TABLE
-- ================================================

ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "document_types_select" ON document_types;
DROP POLICY IF EXISTS "document_types_pmo_admin_all" ON document_types;

-- Policy: All authenticated users can read document types
CREATE POLICY "document_types_select"
    ON document_types FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy: PMO Admin can manage document types
CREATE POLICY "document_types_pmo_admin_all"
    ON document_types FOR ALL
    USING (
        is_pmo_admin(
            (SELECT id FROM users WHERE auth_user_id = auth.uid())
        )
    );

-- ================================================
-- SECTION 4: project_documents TABLE
-- ================================================

ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "project_documents_pmo_admin_all" ON project_documents;
DROP POLICY IF EXISTS "project_documents_pm_manage" ON project_documents;
DROP POLICY IF EXISTS "project_documents_executive_read" ON project_documents;
DROP POLICY IF EXISTS "project_documents_team_read" ON project_documents;
DROP POLICY IF EXISTS "project_documents_owner_update" ON project_documents;
DROP POLICY IF EXISTS "project_documents_approver_update" ON project_documents;

-- Policy: PMO Admin can do everything
CREATE POLICY "project_documents_pmo_admin_all"
    ON project_documents FOR ALL
    USING (
        is_pmo_admin(
            (SELECT id FROM users WHERE auth_user_id = auth.uid())
        )
    );

-- Policy: Project Manager can read/write documents for their projects
CREATE POLICY "project_documents_pm_manage"
    ON project_documents FOR ALL
    USING (
        project_id IN (
            SELECT p.id
            FROM projects p
            JOIN user_projects up ON p.id = up.project_id
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND up.access_level IN ('owner', 'admin', 'pm')
              AND up.is_active = TRUE
              AND up.is_deleted = FALSE
              AND p.is_deleted = FALSE
        )
    )
    WITH CHECK (
        project_id IN (
            SELECT p.id
            FROM projects p
            JOIN user_projects up ON p.id = up.project_id
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND up.access_level IN ('owner', 'admin', 'pm')
              AND up.is_active = TRUE
              AND up.is_deleted = FALSE
              AND p.is_deleted = FALSE
        )
    );

-- Policy: Executive can read documents for assigned projects
CREATE POLICY "project_documents_executive_read"
    ON project_documents FOR SELECT
    USING (
        project_id IN (
            SELECT p.id
            FROM projects p
            JOIN project_assignments pa ON p.id = pa.project_id
            JOIN users u ON pa.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND pa.assignment_type = 'EXECUTIVE'
              AND pa.is_active = TRUE
              AND pa.is_deleted = FALSE
              AND p.is_deleted = FALSE
        )
    );

-- Policy: Team members can read documents for their projects
CREATE POLICY "project_documents_team_read"
    ON project_documents FOR SELECT
    USING (
        project_id IN (
            SELECT p.id
            FROM projects p
            JOIN user_projects up ON p.id = up.project_id
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND up.is_active = TRUE
              AND up.is_deleted = FALSE
              AND p.is_deleted = FALSE
        )
    );

-- Policy: Document owner can update their own documents
CREATE POLICY "project_documents_owner_update"
    ON project_documents FOR UPDATE
    USING (
        owner_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
    WITH CHECK (
        owner_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    );

-- Policy: Approver can update document status (approve/reject)
CREATE POLICY "project_documents_approver_update"
    ON project_documents FOR UPDATE
    USING (
        approver_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND status IN ('submitted', 'draft')
    )
    WITH CHECK (
        approver_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    );

-- ================================================
-- SECTION 5: document_versions TABLE
-- ================================================

ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "document_versions_pmo_admin_all" ON document_versions;
DROP POLICY IF EXISTS "document_versions_read" ON document_versions;
DROP POLICY IF EXISTS "document_versions_pm_insert" ON document_versions;
DROP POLICY IF EXISTS "document_versions_owner_insert" ON document_versions;

-- Policy: PMO Admin can do everything
CREATE POLICY "document_versions_pmo_admin_all"
    ON document_versions FOR ALL
    USING (
        is_pmo_admin(
            (SELECT id FROM users WHERE auth_user_id = auth.uid())
        )
    );

-- Policy: Users can read versions for documents they have access to
CREATE POLICY "document_versions_read"
    ON document_versions FOR SELECT
    USING (
        project_document_id IN (
            SELECT id FROM project_documents
            WHERE project_id IN (
                SELECT p.id
                FROM projects p
                JOIN user_projects up ON p.id = up.project_id
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.is_active = TRUE
                  AND up.is_deleted = FALSE
                  AND p.is_deleted = FALSE
            )
            OR project_id IN (
                SELECT p.id
                FROM projects p
                JOIN project_assignments pa ON p.id = pa.project_id
                JOIN users u ON pa.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND pa.assignment_type = 'EXECUTIVE'
                  AND pa.is_active = TRUE
                  AND pa.is_deleted = FALSE
                  AND p.is_deleted = FALSE
            )
        )
    );

-- Policy: Project Manager can create versions for their project documents
CREATE POLICY "document_versions_pm_insert"
    ON document_versions FOR INSERT
    WITH CHECK (
        project_document_id IN (
            SELECT pd.id
            FROM project_documents pd
            JOIN projects p ON pd.project_id = p.id
            JOIN user_projects up ON p.id = up.project_id
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND up.access_level IN ('owner', 'admin', 'pm')
              AND up.is_active = TRUE
              AND up.is_deleted = FALSE
              AND p.is_deleted = FALSE
        )
    );

-- Policy: Document owner can create versions
CREATE POLICY "document_versions_owner_insert"
    ON document_versions FOR INSERT
    WITH CHECK (
        project_document_id IN (
            SELECT id FROM project_documents
            WHERE owner_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        )
    );

-- ================================================
-- SECTION 6: programme_documents TABLE
-- ================================================

ALTER TABLE programme_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "programme_documents_pmo_admin_all" ON programme_documents;
DROP POLICY IF EXISTS "programme_documents_pgm_manage" ON programme_documents;
DROP POLICY IF EXISTS "programme_documents_user_read" ON programme_documents;

-- Policy: PMO Admin can do everything
CREATE POLICY "programme_documents_pmo_admin_all"
    ON programme_documents FOR ALL
    USING (
        is_pmo_admin(
            (SELECT id FROM users WHERE auth_user_id = auth.uid())
        )
    );

-- Policy: Programme Manager can read/write documents for their programmes
CREATE POLICY "programme_documents_pgm_manage"
    ON programme_documents FOR ALL
    USING (
        programme_id IN (
            SELECT p.id
            FROM programmes p
            JOIN users u ON p.programme_manager_user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND p.is_deleted = FALSE
        )
    )
    WITH CHECK (
        programme_id IN (
            SELECT p.id
            FROM programmes p
            JOIN users u ON p.programme_manager_user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND p.is_deleted = FALSE
        )
    );

-- Policy: Users can read programme documents for programmes containing their projects
CREATE POLICY "programme_documents_user_read"
    ON programme_documents FOR SELECT
    USING (
        programme_id IN (
            SELECT DISTINCT prog.id
            FROM programmes prog
            JOIN programme_projects pp ON prog.id = pp.programme_id
            JOIN projects p ON pp.project_id = p.id
            JOIN user_projects up ON p.id = up.project_id
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND up.is_active = TRUE
              AND up.is_deleted = FALSE
              AND p.is_deleted = FALSE
              AND prog.is_deleted = FALSE
        )
    );

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_policies_count INTEGER;
BEGIN
    -- Count RLS policies created
    SELECT COUNT(*)
    INTO v_policies_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('document_governance_stages', 'document_types', 'project_documents', 'document_versions', 'programme_documents');

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Document Governance RLS Policies Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Policies Created: %', v_policies_count;
    RAISE NOTICE 'Tables Protected: document_governance_stages, document_types, project_documents, document_versions, programme_documents';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v151_document_governance_rls_policies.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================

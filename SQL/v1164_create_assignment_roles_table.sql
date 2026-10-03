-- ================================================
-- File: v1164_create_assignment_roles_table.sql
-- Description: Create assignment_roles lookup table with RLS policies
--              (mirrors v121 countries / v1161 currencies)
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Purpose:
-- resource_assignments.role_in_assignment (VARCHAR(100), see v27) was a free-text field
-- with no DB-backed option list — a hardcoding violation per CLAUDE.md rule 25.1. This
-- table replaces the free-text "e.g., Lead, Contributor, Reviewer" input with a proper
-- lookup list (RACI-style roles people actually use on a resource assignment).

-- ================================================
-- CREATE ASSIGNMENT_ROLES TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS assignment_roles (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Role Information
    code VARCHAR(50) UNIQUE NOT NULL,   -- short code (e.g., 'lead', 'contributor')
    name VARCHAR(100) NOT NULL,         -- display name (e.g., 'Lead')
    description TEXT,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_assignment_roles_code_unique ON assignment_roles(code) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_assignment_roles_is_active ON assignment_roles(is_active) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_assignment_roles_sort_order ON assignment_roles(sort_order) WHERE is_deleted = FALSE;

-- Triggers (reuse the same generic audit-field trigger functions countries/currencies use)
CREATE TRIGGER trg_assignment_roles_before_insert
    BEFORE INSERT ON assignment_roles
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_assignment_roles_before_update
    BEFORE UPDATE ON assignment_roles
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE assignment_roles IS 'Lookup table for resource_assignments.role_in_assignment — RACI-style role options (Lead, Contributor, Reviewer, etc.)';
COMMENT ON COLUMN assignment_roles.code IS 'Short machine code for the role';
COMMENT ON COLUMN assignment_roles.name IS 'Display name shown in dropdowns';
COMMENT ON COLUMN assignment_roles.is_active IS 'Whether this role is active and should appear in dropdowns';

-- ================================================
-- RLS POLICIES
-- ================================================

ALTER TABLE assignment_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_assignment_roles_select_authenticated
    ON assignment_roles FOR SELECT
    TO authenticated
    USING (is_active = TRUE AND is_deleted = FALSE);

CREATE POLICY policy_assignment_roles_admin_all
    ON assignment_roles FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            AND r.role_name IN ('System Admin', 'Superuser')
            AND ur.is_deleted = FALSE
            AND r.is_deleted = FALSE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            AND r.role_name IN ('System Admin', 'Superuser')
            AND ur.is_deleted = FALSE
            AND r.is_deleted = FALSE
        )
    );

-- ================================================
-- SEED DATA
-- ================================================

INSERT INTO assignment_roles (code, name, description, sort_order, is_active)
VALUES
    ('lead', 'Lead', 'Owns and drives the assignment to completion', 10, true),
    ('contributor', 'Contributor', 'Actively works on the assignment', 20, true),
    ('reviewer', 'Reviewer', 'Reviews output before it is considered done', 30, true),
    ('approver', 'Approver', 'Gives final sign-off', 40, true),
    ('consulted', 'Consulted', 'Provides input before work proceeds (RACI: Consulted)', 50, true),
    ('informed', 'Informed', 'Kept up to date on progress (RACI: Informed)', 60, true),
    ('support', 'Support', 'Provides supporting effort alongside the lead', 70, true),
    ('observer', 'Observer', 'Observes without active responsibility', 80, true)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- ================================================
-- REGISTER TABLE
-- ================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('assignment_roles', 'Lookup table for resource assignment role options (Lead, Contributor, Reviewer, etc.)', false, true, 'system')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_role_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_role_count
    FROM assignment_roles
    WHERE is_active = TRUE AND is_deleted = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Assignment Roles Table Created';
    RAISE NOTICE 'Active Roles: %', v_role_count;
    RAISE NOTICE '================================================';
END $$;

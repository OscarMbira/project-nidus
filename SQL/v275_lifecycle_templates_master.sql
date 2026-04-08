-- ================================================
-- File: v275_lifecycle_templates_master.sql
-- Description: Lifecycle templates lookup table (PMO-managed) used on Project Create form.
--   Stores reusable lifecycle template names per organisation, but readable by all
--   authenticated users for dropdowns (similar to project_types).
-- Prerequisites: accounts, users, projects tables.
-- ================================================

CREATE TABLE IF NOT EXISTS lifecycle_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_templates_account_id ON lifecycle_templates(account_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_lifecycle_templates_name ON lifecycle_templates(name) WHERE is_deleted = false;

ALTER TABLE lifecycle_templates ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read lifecycle templates for dropdowns / PMO Admin
DROP POLICY IF EXISTS policy_lifecycle_templates_select ON lifecycle_templates;
CREATE POLICY policy_lifecycle_templates_select ON lifecycle_templates
    FOR SELECT TO authenticated
    USING (true);

-- Inserts: only allow owners to insert for their own accounts
DROP POLICY IF EXISTS policy_lifecycle_templates_insert ON lifecycle_templates;
CREATE POLICY policy_lifecycle_templates_insert ON lifecycle_templates
    FOR INSERT TO authenticated
    WITH CHECK (
        account_id IN (
            SELECT a.id FROM accounts a
            WHERE a.owner_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
            AND (a.is_deleted = false OR a.is_deleted IS NULL)
        )
    );

-- Updates: only allow owners to update templates for their accounts
DROP POLICY IF EXISTS policy_lifecycle_templates_update ON lifecycle_templates;
CREATE POLICY policy_lifecycle_templates_update ON lifecycle_templates
    FOR UPDATE TO authenticated
    USING (
        account_id IN (
            SELECT a.id FROM accounts a
            WHERE a.owner_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
            AND (a.is_deleted = false OR a.is_deleted IS NULL)
        )
    );

-- Deletes: only allow owners to delete templates for their accounts
DROP POLICY IF EXISTS policy_lifecycle_templates_delete ON lifecycle_templates;
CREATE POLICY policy_lifecycle_templates_delete ON lifecycle_templates
    FOR DELETE TO authenticated
    USING (
        account_id IN (
            SELECT a.id FROM accounts a
            WHERE a.owner_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
            AND (a.is_deleted = false OR a.is_deleted IS NULL)
        )
    );

-- Register table in registry
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('lifecycle_templates', 'PMO-managed lifecycle template labels for project delivery', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();


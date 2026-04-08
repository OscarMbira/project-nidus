-- ================================================
-- File: v271_budget_categories_master.sql
-- Description: Master table for budget category labels (e.g. Machinery, Labour); PMO manages, used in project budget rows.
-- Prerequisites: accounts table.
-- ================================================

CREATE TABLE IF NOT EXISTS budget_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_budget_categories_account_id ON budget_categories(account_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_budget_categories_name ON budget_categories(name) WHERE is_deleted = false;

ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;

-- RLS: same pattern as funding_sources (account owner or user with project in that account)
DROP POLICY IF EXISTS policy_budget_categories_select ON budget_categories;
CREATE POLICY policy_budget_categories_select ON budget_categories
    FOR SELECT TO authenticated
    USING (
        account_id IN (
            SELECT a.id FROM accounts a
            WHERE a.owner_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
            AND (a.is_deleted = false OR a.is_deleted IS NULL)
        )
        OR account_id IN (
            SELECT p.account_id FROM projects p
            WHERE p.account_id IS NOT NULL AND (p.is_deleted = false OR p.is_deleted IS NULL)
            AND (
                p.owner_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
                OR EXISTS (
                    SELECT 1 FROM user_projects up
                    WHERE up.project_id = p.id AND up.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1) AND (up.is_deleted = false OR up.is_deleted IS NULL)
                )
            )
        )
    );

DROP POLICY IF EXISTS policy_budget_categories_insert ON budget_categories;
CREATE POLICY policy_budget_categories_insert ON budget_categories
    FOR INSERT TO authenticated
    WITH CHECK (
        account_id IN (
            SELECT a.id FROM accounts a
            WHERE a.owner_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
            AND (a.is_deleted = false OR a.is_deleted IS NULL)
        )
    );

DROP POLICY IF EXISTS policy_budget_categories_update ON budget_categories;
CREATE POLICY policy_budget_categories_update ON budget_categories
    FOR UPDATE TO authenticated
    USING (
        account_id IN (
            SELECT a.id FROM accounts a
            WHERE a.owner_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
            AND (a.is_deleted = false OR a.is_deleted IS NULL)
        )
    );

DROP POLICY IF EXISTS policy_budget_categories_delete ON budget_categories;
CREATE POLICY policy_budget_categories_delete ON budget_categories
    FOR DELETE TO authenticated
    USING (
        account_id IN (
            SELECT a.id FROM accounts a
            WHERE a.owner_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
            AND (a.is_deleted = false OR a.is_deleted IS NULL)
        )
    );

COMMENT ON TABLE budget_categories IS 'PMO-managed budget category labels per organisation (e.g. Machinery, Labour); used in project financial controls.';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('budget_categories', 'PMO-managed budget category labels per organisation', false, true)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, updated_at = NOW();

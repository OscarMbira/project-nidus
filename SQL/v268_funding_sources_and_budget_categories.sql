-- ================================================
-- File: v268_funding_sources_and_budget_categories.sql
-- Description: Funding sources (PMO master data) and project budget categories for Financial Controls.
-- Prerequisites: accounts, projects tables exist.
-- ================================================

-- ================================================
-- 1. funding_sources (PMO-populated lookup per organisation)
-- ================================================
CREATE TABLE IF NOT EXISTS funding_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_funding_sources_account_id ON funding_sources(account_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_funding_sources_name ON funding_sources(name) WHERE is_deleted = false;

ALTER TABLE funding_sources ENABLE ROW LEVEL SECURITY;

-- RLS: users see funding sources for accounts they own (accounts.owner_user_id = users.id)
DROP POLICY IF EXISTS policy_funding_sources_select ON funding_sources;
CREATE POLICY policy_funding_sources_select ON funding_sources
    FOR SELECT TO authenticated
    USING (
        account_id IN (
            SELECT a.id FROM accounts a
            WHERE a.owner_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
            AND (a.is_deleted = false OR a.is_deleted IS NULL)
        )
    );

DROP POLICY IF EXISTS policy_funding_sources_insert ON funding_sources;
CREATE POLICY policy_funding_sources_insert ON funding_sources
    FOR INSERT TO authenticated
    WITH CHECK (
        account_id IN (
            SELECT a.id FROM accounts a
            WHERE a.owner_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
            AND (a.is_deleted = false OR a.is_deleted IS NULL)
        )
    );

DROP POLICY IF EXISTS policy_funding_sources_update ON funding_sources;
CREATE POLICY policy_funding_sources_update ON funding_sources
    FOR UPDATE TO authenticated
    USING (
        account_id IN (
            SELECT a.id FROM accounts a
            WHERE a.owner_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
            AND (a.is_deleted = false OR a.is_deleted IS NULL)
        )
    );

DROP POLICY IF EXISTS policy_funding_sources_delete ON funding_sources;
CREATE POLICY policy_funding_sources_delete ON funding_sources
    FOR DELETE TO authenticated
    USING (
        account_id IN (
            SELECT a.id FROM accounts a
            WHERE a.owner_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
            AND (a.is_deleted = false OR a.is_deleted IS NULL)
        )
    );

COMMENT ON TABLE funding_sources IS 'PMO-managed funding sources per organisation (e.g. Donors, IT Department)';

-- ================================================
-- 2. project_budget_categories (per-project budget lines)
-- ================================================
CREATE TABLE IF NOT EXISTS project_budget_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    category_name VARCHAR(200) NOT NULL,
    budget_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    funding_source_id UUID REFERENCES funding_sources(id) ON DELETE SET NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_budget_categories_project_id ON project_budget_categories(project_id);
CREATE INDEX IF NOT EXISTS idx_project_budget_categories_funding_source ON project_budget_categories(funding_source_id);

ALTER TABLE project_budget_categories ENABLE ROW LEVEL SECURITY;

-- RLS: project access = member, owner, or PMO admin for project's org (account via accounts.owner_user_id)
CREATE OR REPLACE FUNCTION can_access_project_budget(p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects p
    INNER JOIN users u ON u.auth_user_id = auth.uid()
    WHERE p.id = p_project_id AND (
      p.owner_user_id = u.id
      OR EXISTS (SELECT 1 FROM user_projects up WHERE up.project_id = p.id AND up.user_id = u.id AND up.is_deleted = false)
      OR (
        p.account_id IN (SELECT a.id FROM accounts a WHERE a.owner_user_id = u.id AND (a.is_deleted = false OR a.is_deleted IS NULL))
        AND EXISTS (SELECT 1 FROM user_roles ur INNER JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id AND r.role_name = 'pmo_admin' AND ur.is_active = true)
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS policy_project_budget_categories_select ON project_budget_categories;
CREATE POLICY policy_project_budget_categories_select ON project_budget_categories
    FOR SELECT TO authenticated USING (can_access_project_budget(project_id));

DROP POLICY IF EXISTS policy_project_budget_categories_insert ON project_budget_categories;
CREATE POLICY policy_project_budget_categories_insert ON project_budget_categories
    FOR INSERT TO authenticated WITH CHECK (can_access_project_budget(project_id));

DROP POLICY IF EXISTS policy_project_budget_categories_update ON project_budget_categories;
CREATE POLICY policy_project_budget_categories_update ON project_budget_categories
    FOR UPDATE TO authenticated USING (can_access_project_budget(project_id));

DROP POLICY IF EXISTS policy_project_budget_categories_delete ON project_budget_categories;
CREATE POLICY policy_project_budget_categories_delete ON project_budget_categories
    FOR DELETE TO authenticated USING (can_access_project_budget(project_id));

COMMENT ON TABLE project_budget_categories IS 'Budget breakdown by category per project; sum = project total budget';

-- Register tables
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('funding_sources', 'PMO-managed funding sources per organisation', false, true),
    ('project_budget_categories', 'Project budget breakdown by category and funding source', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

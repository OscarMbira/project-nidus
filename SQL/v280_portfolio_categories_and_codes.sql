-- =============================================================================
-- v280: Portfolio Categories & Auto Code Generation
-- Purpose:
--  1) Add portfolio_categories master table for dropdown categories
--  2) Add generate_portfolio_code() + trigger for automatic portfolio_code
-- Schema: public (platform)
-- Date: 2026-03-09
-- =============================================================================

-- =============================================================================
-- SECTION 1: portfolio_categories (PMO master data)
-- =============================================================================

CREATE TABLE IF NOT EXISTS portfolio_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_categories_account_id
    ON portfolio_categories(account_id)
    WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_portfolio_categories_name
    ON portfolio_categories(name)
    WHERE is_deleted = FALSE;

ALTER TABLE portfolio_categories ENABLE ROW LEVEL SECURITY;

-- RLS: same pattern as budget_categories (account owner or user with project in that account)
DROP POLICY IF EXISTS policy_portfolio_categories_select ON portfolio_categories;
CREATE POLICY policy_portfolio_categories_select ON portfolio_categories
    FOR SELECT TO authenticated
    USING (
        account_id IN (
            SELECT a.id FROM accounts a
            WHERE a.owner_user_id = (
                SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1
            )
            AND (a.is_deleted = FALSE OR a.is_deleted IS NULL)
        )
        OR account_id IN (
            SELECT p.account_id
            FROM projects p
            WHERE p.account_id IS NOT NULL
              AND (p.is_deleted = FALSE OR p.is_deleted IS NULL)
              AND (
                  p.owner_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
                  OR EXISTS (
                      SELECT 1
                      FROM user_projects up
                      WHERE up.project_id = p.id
                        AND up.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
                        AND (up.is_deleted = FALSE OR up.is_deleted IS NULL)
                  )
              )
        )
    );

DROP POLICY IF EXISTS policy_portfolio_categories_insert ON portfolio_categories;
CREATE POLICY policy_portfolio_categories_insert ON portfolio_categories
    FOR INSERT TO authenticated
    WITH CHECK (
        account_id IN (
            SELECT a.id FROM accounts a
            WHERE a.owner_user_id = (
                SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1
            )
            AND (a.is_deleted = FALSE OR a.is_deleted IS NULL)
        )
    );

DROP POLICY IF EXISTS policy_portfolio_categories_update ON portfolio_categories;
CREATE POLICY policy_portfolio_categories_update ON portfolio_categories
    FOR UPDATE TO authenticated
    USING (
        account_id IN (
            SELECT a.id FROM accounts a
            WHERE a.owner_user_id = (
                SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1
            )
            AND (a.is_deleted = FALSE OR a.is_deleted IS NULL)
        )
    );

DROP POLICY IF EXISTS policy_portfolio_categories_delete ON portfolio_categories;
CREATE POLICY policy_portfolio_categories_delete ON portfolio_categories
    FOR DELETE TO authenticated
    USING (
        account_id IN (
            SELECT a.id FROM accounts a
            WHERE a.owner_user_id = (
                SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1
            )
            AND (a.is_deleted = FALSE OR a.is_deleted IS NULL)
        )
    );

COMMENT ON TABLE portfolio_categories IS
  'PMO-managed portfolio category labels per organisation (e.g. IT, Business, Infrastructure); used by portfolios.portfolio_category.';

-- Register table in database_tables registry
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('portfolio_categories', 'PMO-managed portfolio category labels per organisation', FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at        = NOW();

-- =============================================================================
-- SECTION 2: Portfolio Code Auto-Generation
-- =============================================================================

-- Function: generate_portfolio_code
-- Purpose: Generates unique portfolio_code in format PORT-YYYY-XXX (e.g. PORT-2026-001)
CREATE OR REPLACE FUNCTION generate_portfolio_code()
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_year INTEGER;
    v_seq  INTEGER;
    v_ref  VARCHAR(50);
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);

    -- Get next sequence number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(portfolio_code FROM '\d+$') AS INTEGER)), 0) + 1
    INTO v_seq
    FROM portfolios
    WHERE portfolio_code LIKE 'PORT-' || v_year || '-%'
      AND is_deleted = FALSE;

    -- Format: PORT-YYYY-XXX (3 digits with leading zeros)
    v_ref := 'PORT-' || v_year || '-' || LPAD(v_seq::TEXT, 3, '0');

    RETURN v_ref;
END;
$$;

COMMENT ON FUNCTION generate_portfolio_code() IS
  'Generates unique portfolio code (e.g., PORT-2026-001) for portfolios.portfolio_code.';

-- Trigger: auto-populate portfolio_code on INSERT when not provided
CREATE OR REPLACE FUNCTION generate_portfolio_code_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.portfolio_code IS NULL OR NEW.portfolio_code = '' THEN
        NEW.portfolio_code := generate_portfolio_code();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_portfolios_code ON portfolios;
CREATE TRIGGER trg_portfolios_code
    BEFORE INSERT ON portfolios
    FOR EACH ROW
    EXECUTE FUNCTION generate_portfolio_code_trigger();


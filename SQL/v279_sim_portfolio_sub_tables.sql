-- =============================================================================
-- v279: Simulator Practice Portfolio Sub-Tables
-- Purpose: Add members, budgets, reports, and governance sub-tables for the
--          Portfolio sub-pages feature (Simulator parity with Platform v216).
-- Date: 2026-03-09
-- =============================================================================

-- =============================================================================
-- SECTION 1: practice_portfolio_members
-- =============================================================================

CREATE TABLE IF NOT EXISTS sim.practice_portfolio_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_portfolio_id UUID NOT NULL REFERENCES sim.practice_portfolios(id) ON DELETE CASCADE,
    member_name VARCHAR(200),
    member_email VARCHAR(255),
    member_role VARCHAR(100),
    assignment_status VARCHAR(50) DEFAULT 'active'
        CHECK (assignment_status IN ('active', 'inactive')),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_prac_portfolio_members_portfolio
    ON sim.practice_portfolio_members(practice_portfolio_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_prac_portfolio_members_user
    ON sim.practice_portfolio_members(user_id) WHERE is_deleted = FALSE;

-- =============================================================================
-- SECTION 2: practice_portfolio_budgets
-- =============================================================================

CREATE TABLE IF NOT EXISTS sim.practice_portfolio_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_portfolio_id UUID NOT NULL REFERENCES sim.practice_portfolios(id) ON DELETE CASCADE,
    budget_name VARCHAR(200) NOT NULL,
    budget_type VARCHAR(100),
    budget_currency VARCHAR(3) DEFAULT 'USD',
    approved_amount DECIMAL(15,2),
    actual_spent DECIMAL(15,2) DEFAULT 0,
    remaining_amount DECIMAL(15,2),
    budget_status VARCHAR(50) DEFAULT 'draft'
        CHECK (budget_status IN ('draft', 'approved', 'active', 'closed', 'cancelled')),
    budget_year INTEGER,
    budget_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_prac_portfolio_budgets_portfolio
    ON sim.practice_portfolio_budgets(practice_portfolio_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_prac_portfolio_budgets_user
    ON sim.practice_portfolio_budgets(user_id) WHERE is_deleted = FALSE;

-- =============================================================================
-- SECTION 3: practice_portfolio_reports
-- =============================================================================

CREATE TABLE IF NOT EXISTS sim.practice_portfolio_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_portfolio_id UUID NOT NULL REFERENCES sim.practice_portfolios(id) ON DELETE CASCADE,
    report_name VARCHAR(200) NOT NULL,
    report_type VARCHAR(100),
    report_period VARCHAR(100),
    report_date DATE DEFAULT CURRENT_DATE,
    generation_status VARCHAR(50) DEFAULT 'pending'
        CHECK (generation_status IN ('pending', 'in_progress', 'completed', 'distributed', 'cancelled')),
    report_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_prac_portfolio_reports_portfolio
    ON sim.practice_portfolio_reports(practice_portfolio_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_prac_portfolio_reports_user
    ON sim.practice_portfolio_reports(user_id) WHERE is_deleted = FALSE;

-- =============================================================================
-- SECTION 4: practice_portfolio_governance
-- =============================================================================

CREATE TABLE IF NOT EXISTS sim.practice_portfolio_governance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_portfolio_id UUID NOT NULL REFERENCES sim.practice_portfolios(id) ON DELETE CASCADE,
    governance_model VARCHAR(100),
    review_frequency VARCHAR(50),
    last_review_date DATE,
    next_review_date DATE,
    decision_authority VARCHAR(200),
    governance_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    UNIQUE(practice_portfolio_id)
);

CREATE INDEX IF NOT EXISTS idx_prac_portfolio_governance_portfolio
    ON sim.practice_portfolio_governance(practice_portfolio_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_prac_portfolio_governance_user
    ON sim.practice_portfolio_governance(user_id) WHERE is_deleted = FALSE;

-- =============================================================================
-- SECTION 5: RLS Policies
-- =============================================================================

ALTER TABLE sim.practice_portfolio_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_portfolio_budgets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_portfolio_reports    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_portfolio_governance ENABLE ROW LEVEL SECURITY;

-- Members: owned by user
CREATE POLICY "prac_portfolio_members_user_access" ON sim.practice_portfolio_members
    FOR ALL TO authenticated
    USING (user_id = sim.get_current_user_id())
    WITH CHECK (user_id = sim.get_current_user_id());

-- Budgets: owned by user
CREATE POLICY "prac_portfolio_budgets_user_access" ON sim.practice_portfolio_budgets
    FOR ALL TO authenticated
    USING (user_id = sim.get_current_user_id())
    WITH CHECK (user_id = sim.get_current_user_id());

-- Reports: owned by user
CREATE POLICY "prac_portfolio_reports_user_access" ON sim.practice_portfolio_reports
    FOR ALL TO authenticated
    USING (user_id = sim.get_current_user_id())
    WITH CHECK (user_id = sim.get_current_user_id());

-- Governance: owned by user
CREATE POLICY "prac_portfolio_governance_user_access" ON sim.practice_portfolio_governance
    FOR ALL TO authenticated
    USING (user_id = sim.get_current_user_id())
    WITH CHECK (user_id = sim.get_current_user_id());

-- =============================================================================
-- SECTION 6: Register tables in database_tables registry
-- =============================================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
    ('sim.practice_portfolio_members',   'Simulator practice portfolio team members',             false, true, 'simulation'),
    ('sim.practice_portfolio_budgets',   'Simulator practice portfolio budget records',            false, true, 'simulation'),
    ('sim.practice_portfolio_reports',   'Simulator practice portfolio reports',                  false, true, 'simulation'),
    ('sim.practice_portfolio_governance','Simulator practice portfolio governance settings',       false, true, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category    = EXCLUDED.table_category,
    updated_at        = NOW();

-- =============================================================================
-- SECTION 7: Verification
-- =============================================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM information_schema.tables
    WHERE table_schema = 'sim'
      AND table_name IN (
          'practice_portfolio_members',
          'practice_portfolio_budgets',
          'practice_portfolio_reports',
          'practice_portfolio_governance'
      );

    RAISE NOTICE '==============================================';
    RAISE NOTICE 'v279 Sim Portfolio Sub-Tables Applied';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Tables created: % of 4', v_count;
    RAISE NOTICE '==============================================';
END $$;

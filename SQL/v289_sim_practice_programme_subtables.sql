-- =============================================================================
-- v289: Simulator Practice Programme Sub-tables
-- Purpose: Create programme sub-tables for the simulator (members, budgets,
--          reports, governance) to match v279 which created portfolio sub-tables.
--          All tables use user-scoped RLS (same pattern as v279).
-- =============================================================================

-- =============================================================================
-- TABLE: sim.practice_programme_members
-- =============================================================================

CREATE TABLE IF NOT EXISTS sim.practice_programme_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_programme_id UUID NOT NULL REFERENCES sim.practice_programmes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    member_name VARCHAR(200),
    member_email VARCHAR(200),
    member_role VARCHAR(100),
    assignment_status VARCHAR(50) DEFAULT 'active'
        CHECK (assignment_status IN ('active', 'inactive', 'pending')),
    start_date DATE,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    UNIQUE (practice_programme_id, member_email, is_deleted)
);

CREATE INDEX IF NOT EXISTS idx_prac_prog_members_programme
    ON sim.practice_programme_members(practice_programme_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_prac_prog_members_user
    ON sim.practice_programme_members(user_id) WHERE is_deleted = FALSE;

-- =============================================================================
-- TABLE: sim.practice_programme_budgets
-- =============================================================================

CREATE TABLE IF NOT EXISTS sim.practice_programme_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_programme_id UUID NOT NULL REFERENCES sim.practice_programmes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    budget_type VARCHAR(100),
    budget_amount DECIMAL(15,2),
    spent_amount DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    period_start DATE,
    period_end DATE,
    budget_status VARCHAR(50) DEFAULT 'active'
        CHECK (budget_status IN ('draft', 'active', 'closed', 'overrun')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_prac_prog_budgets_programme
    ON sim.practice_programme_budgets(practice_programme_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_prac_prog_budgets_user
    ON sim.practice_programme_budgets(user_id) WHERE is_deleted = FALSE;

-- =============================================================================
-- TABLE: sim.practice_programme_reports
-- =============================================================================

CREATE TABLE IF NOT EXISTS sim.practice_programme_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_programme_id UUID NOT NULL REFERENCES sim.practice_programmes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    report_title VARCHAR(300) NOT NULL,
    report_type VARCHAR(100),
    report_period_start DATE,
    report_period_end DATE,
    overall_status VARCHAR(50) DEFAULT 'on_track'
        CHECK (overall_status IN ('on_track', 'at_risk', 'off_track', 'completed')),
    summary TEXT,
    key_achievements TEXT,
    issues_raised TEXT,
    next_period_plans TEXT,
    report_status VARCHAR(50) DEFAULT 'draft'
        CHECK (report_status IN ('draft', 'submitted', 'approved', 'published')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_prac_prog_reports_programme
    ON sim.practice_programme_reports(practice_programme_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_prac_prog_reports_user
    ON sim.practice_programme_reports(user_id) WHERE is_deleted = FALSE;

-- =============================================================================
-- TABLE: sim.practice_programme_governance
-- =============================================================================

CREATE TABLE IF NOT EXISTS sim.practice_programme_governance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_programme_id UUID NOT NULL REFERENCES sim.practice_programmes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    governance_model VARCHAR(100) DEFAULT 'centralized'
        CHECK (governance_model IN ('centralized', 'decentralized', 'hybrid', 'steering_committee')),
    review_frequency VARCHAR(50) DEFAULT 'monthly'
        CHECK (review_frequency IN ('weekly', 'bi-weekly', 'monthly', 'quarterly')),
    steering_committee_members TEXT,
    decision_authority VARCHAR(200),
    escalation_process TEXT,
    governance_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    UNIQUE(practice_programme_id)
);

CREATE INDEX IF NOT EXISTS idx_prac_prog_governance_programme
    ON sim.practice_programme_governance(practice_programme_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_prac_prog_governance_user
    ON sim.practice_programme_governance(user_id) WHERE is_deleted = FALSE;

-- =============================================================================
-- RLS Policies (user-scoped — same pattern as v279)
-- =============================================================================

ALTER TABLE sim.practice_programme_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_programme_budgets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_programme_reports    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_programme_governance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prac_programme_members_user_access" ON sim.practice_programme_members
    FOR ALL TO authenticated
    USING (user_id = sim.get_current_user_id())
    WITH CHECK (user_id = sim.get_current_user_id());

CREATE POLICY "prac_programme_budgets_user_access" ON sim.practice_programme_budgets
    FOR ALL TO authenticated
    USING (user_id = sim.get_current_user_id())
    WITH CHECK (user_id = sim.get_current_user_id());

CREATE POLICY "prac_programme_reports_user_access" ON sim.practice_programme_reports
    FOR ALL TO authenticated
    USING (user_id = sim.get_current_user_id())
    WITH CHECK (user_id = sim.get_current_user_id());

CREATE POLICY "prac_programme_governance_user_access" ON sim.practice_programme_governance
    FOR ALL TO authenticated
    USING (user_id = sim.get_current_user_id())
    WITH CHECK (user_id = sim.get_current_user_id());

-- =============================================================================
-- Register tables in database_tables registry
-- =============================================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
    ('sim.practice_programme_members',    'Simulator practice programme team members',         false, true, 'simulation'),
    ('sim.practice_programme_budgets',    'Simulator practice programme budget records',        false, true, 'simulation'),
    ('sim.practice_programme_reports',    'Simulator practice programme reports',               false, true, 'simulation'),
    ('sim.practice_programme_governance', 'Simulator practice programme governance settings',   false, true, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- =============================================================================
-- Verification
-- =============================================================================

DO $$
DECLARE
    v_members    INTEGER;
    v_budgets    INTEGER;
    v_reports    INTEGER;
    v_governance INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_members    FROM pg_policies WHERE tablename = 'practice_programme_members';
    SELECT COUNT(*) INTO v_budgets    FROM pg_policies WHERE tablename = 'practice_programme_budgets';
    SELECT COUNT(*) INTO v_reports    FROM pg_policies WHERE tablename = 'practice_programme_reports';
    SELECT COUNT(*) INTO v_governance FROM pg_policies WHERE tablename = 'practice_programme_governance';

    RAISE NOTICE '================================================';
    RAISE NOTICE 'v289 Sim Practice Programme Sub-tables Applied';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'practice_programme_members    policies: %', v_members;
    RAISE NOTICE 'practice_programme_budgets    policies: %', v_budgets;
    RAISE NOTICE 'practice_programme_reports    policies: %', v_reports;
    RAISE NOTICE 'practice_programme_governance policies: %', v_governance;
    RAISE NOTICE '================================================';
END $$;

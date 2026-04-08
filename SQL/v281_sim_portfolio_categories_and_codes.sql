-- =============================================================================
-- v281: Simulator Practice Portfolio Categories & Auto Code Generation
-- Purpose:
--  1) Add sim.practice_portfolio_categories table for dropdown categories
--  2) Add sim.generate_sim_portfolio_code() + trigger for automatic portfolio_code
-- Schema: sim
-- Date: 2026-03-09
-- =============================================================================

-- =============================================================================
-- SECTION 1: practice_portfolio_categories (per-user simulator lookup)
-- =============================================================================

CREATE TABLE IF NOT EXISTS sim.practice_portfolio_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_prac_portfolio_categories_user
    ON sim.practice_portfolio_categories(user_id) WHERE is_deleted = FALSE;

ALTER TABLE sim.practice_portfolio_categories ENABLE ROW LEVEL SECURITY;

-- RLS: simple per-user isolation using sim.get_current_user_id()
DROP POLICY IF EXISTS prac_portfolio_categories_all ON sim.practice_portfolio_categories;
CREATE POLICY prac_portfolio_categories_all ON sim.practice_portfolio_categories
    FOR ALL TO authenticated
    USING (user_id = sim.get_current_user_id())
    WITH CHECK (user_id = sim.get_current_user_id());

COMMENT ON TABLE sim.practice_portfolio_categories IS
  'Simulator practice portfolio category labels per user (e.g. IT, Business, Infrastructure); used by sim.practice_portfolios.portfolio_category.';

-- Register table in database_tables registry
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('sim.practice_portfolio_categories', 'Simulator practice portfolio category labels per user', FALSE, TRUE, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  table_category    = EXCLUDED.table_category,
  updated_at        = NOW();

-- =============================================================================
-- SECTION 2: Practice Portfolio Code Auto-Generation
-- =============================================================================

-- Function: sim.generate_sim_portfolio_code
-- Purpose: Generates unique practice portfolio_code in format SIM-PORT-YYYY-XXX (e.g. SIM-PORT-2026-001)
CREATE OR REPLACE FUNCTION sim.generate_sim_portfolio_code()
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
    FROM sim.practice_portfolios
    WHERE portfolio_code LIKE 'SIM-PORT-' || v_year || '-%'
      AND is_deleted = FALSE;

    -- Format: SIM-PORT-YYYY-XXX (3 digits with leading zeros)
    v_ref := 'SIM-PORT-' || v_year || '-' || LPAD(v_seq::TEXT, 3, '0');

    RETURN v_ref;
END;
$$;

COMMENT ON FUNCTION sim.generate_sim_portfolio_code() IS
  'Generates unique simulator practice portfolio code (e.g., SIM-PORT-2026-001).';

-- Trigger: auto-populate portfolio_code on INSERT when not provided
CREATE OR REPLACE FUNCTION sim.generate_sim_portfolio_code_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.portfolio_code IS NULL OR NEW.portfolio_code = '' THEN
        NEW.portfolio_code := sim.generate_sim_portfolio_code();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_practice_portfolios_code ON sim.practice_portfolios;
CREATE TRIGGER trg_practice_portfolios_code
    BEFORE INSERT ON sim.practice_portfolios
    FOR EACH ROW
    EXECUTE FUNCTION sim.generate_sim_portfolio_code_trigger();


-- =============================================================================
-- v283: Simulator practice_portfolios – governance and custom_fields (parity with Platform)
-- Purpose: Add columns for governance and budget line items (custom_fields).
-- Prerequisites: v239 (sim.practice_portfolios).
-- Schema: sim
-- =============================================================================

-- Governance (same as Platform portfolios)
ALTER TABLE sim.practice_portfolios
  ADD COLUMN IF NOT EXISTS governance_model VARCHAR(100),
  ADD COLUMN IF NOT EXISTS review_frequency VARCHAR(50);

-- Store budget breakdown and budget type (mirrors Platform custom_fields.portfolio_budget_items)
ALTER TABLE sim.practice_portfolios
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN sim.practice_portfolios.governance_model IS 'Governance model: centralized, decentralized, hybrid';
COMMENT ON COLUMN sim.practice_portfolios.review_frequency IS 'Review frequency: weekly, bi-weekly, monthly, quarterly';
COMMENT ON COLUMN sim.practice_portfolios.custom_fields IS 'JSON: portfolio_budget_items (array), portfolio_budget_type (string)';

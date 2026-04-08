-- =============================================================================
-- v292: Portfolio & Practice Portfolio Mission Fields
-- Purpose: Add portfolio_mission text column to Platform portfolios and
--          Simulator practice_portfolios for capturing mission alongside vision.
-- Schema: public (portfolios), sim (practice_portfolios)
-- Safe to re-run: uses ADD COLUMN IF NOT EXISTS
-- =============================================================================

-- Platform portfolios: add mission field
ALTER TABLE portfolios
  ADD COLUMN IF NOT EXISTS portfolio_mission TEXT;

COMMENT ON COLUMN portfolios.portfolio_mission IS
  'Mission statement for this portfolio (complements portfolio_vision).';

-- Simulator practice_portfolios: add mission field
ALTER TABLE sim.practice_portfolios
  ADD COLUMN IF NOT EXISTS portfolio_mission TEXT;

COMMENT ON COLUMN sim.practice_portfolios.portfolio_mission IS
  'Mission statement for this practice portfolio (complements portfolio_vision).';


-- ============================================================================
-- v1233: Add notes column to the Cost Actuals ledger (Platform + Simulator)
-- ============================================================================
-- Adds a free-text `notes` field distinct from `description` (description =
-- what the transaction covers; notes = additional commentary/context), same
-- pattern as the budget-line/overall notes added to Project Budget (v1225).
-- ============================================================================

ALTER TABLE public.cost_actuals ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE sim.cost_actuals ADD COLUMN IF NOT EXISTS notes TEXT;

DO $$ BEGIN
  RAISE NOTICE 'v1233_cost_actuals_notes.sql applied successfully';
END $$;

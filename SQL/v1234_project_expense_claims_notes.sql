-- ============================================================================
-- v1234: Add notes column to Expense Claims (Platform + Simulator)
-- ============================================================================
-- Adds a free-text `notes` field distinct from `description` (description =
-- what the claim covers; notes = additional commentary/context), same pattern
-- as v1233's cost_actuals.notes and the earlier budget-line/overall notes.
-- ============================================================================

ALTER TABLE public.project_expense_claims ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE sim.project_expense_claims ADD COLUMN IF NOT EXISTS notes TEXT;

DO $$ BEGIN
  RAISE NOTICE 'v1234_project_expense_claims_notes.sql applied successfully';
END $$;

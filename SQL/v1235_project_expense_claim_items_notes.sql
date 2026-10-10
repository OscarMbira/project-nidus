-- ============================================================================
-- v1235: Add notes column to expense claim line items (Platform + Simulator)
-- ============================================================================
-- Lets each itemized line (not just the overall claim) carry its own notes,
-- e.g. per-item context on a multi-item receipt.
-- ============================================================================

ALTER TABLE public.project_expense_claim_items ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE sim.project_expense_claim_items ADD COLUMN IF NOT EXISTS notes TEXT;

DO $$ BEGIN
  RAISE NOTICE 'v1235_project_expense_claim_items_notes.sql applied successfully';
END $$;

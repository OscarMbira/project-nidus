-- v1069: Business case budget categories (Costs & Investment enhancement)
-- Adds project-style budget lines to public.business_cases for PM business cases.

ALTER TABLE public.business_cases
  ADD COLUMN IF NOT EXISTS budget_currency VARCHAR(10) DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS budget_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS budget_approval_status VARCHAR(30),
  ADD COLUMN IF NOT EXISTS budget_categories JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.business_cases.budget_currency IS 'Currency for budget category amounts (e.g. USD)';
COMMENT ON COLUMN public.business_cases.budget_type IS 'capex | opex | mixed';
COMMENT ON COLUMN public.business_cases.budget_approval_status IS 'pending | approved | rejected';
COMMENT ON COLUMN public.business_cases.budget_categories IS
  'JSONB array of { category_name, amount, funding_source_id } budget lines';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'business_cases_budget_type_check'
  ) THEN
    ALTER TABLE public.business_cases
      ADD CONSTRAINT business_cases_budget_type_check
      CHECK (budget_type IS NULL OR budget_type IN ('capex', 'opex', 'mixed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'business_cases_budget_approval_status_check'
  ) THEN
    ALTER TABLE public.business_cases
      ADD CONSTRAINT business_cases_budget_approval_status_check
      CHECK (
        budget_approval_status IS NULL
        OR budget_approval_status IN ('pending', 'approved', 'rejected')
      );
  END IF;
END $$;

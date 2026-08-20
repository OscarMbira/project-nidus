-- =============================================================================
-- v860: Organisation bulk-approve soft cap for form instances
-- Column on public.accounts (org = account). Default 1000; editable in org settings.
-- =============================================================================

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS form_bulk_approve_max INTEGER NOT NULL DEFAULT 1000;

COMMENT ON COLUMN public.accounts.form_bulk_approve_max IS
  'Max draft form_instances that may be approved in one bulk action (v860). Default 1000.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_accounts_form_bulk_approve_max'
  ) THEN
    ALTER TABLE public.accounts
      ADD CONSTRAINT chk_accounts_form_bulk_approve_max
      CHECK (form_bulk_approve_max BETWEEN 1 AND 10000);
  END IF;
END $$;

UPDATE public.accounts
SET form_bulk_approve_max = COALESCE(form_bulk_approve_max, 1000)
WHERE COALESCE(is_deleted, FALSE) = FALSE
  AND (form_bulk_approve_max IS NULL OR form_bulk_approve_max < 1);

DO $$
BEGIN
  RAISE NOTICE 'v860_accounts_form_bulk_approve_max.sql applied';
END $$;

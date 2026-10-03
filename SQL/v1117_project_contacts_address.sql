-- =============================================================================
-- v1117: project_contacts — multi-value address
-- Prerequisites: v1020 (project_contacts), v1092 (primary email / phone)
--
-- Contact Directory stores several addresses as a newline-joined list, the
-- same way as email and phone. primary_address records which line is preferred.
-- Idempotent — safe to re-run.
-- =============================================================================

ALTER TABLE public.project_contacts
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS primary_address TEXT;

COMMENT ON COLUMN public.project_contacts.address IS
  'v1117: newline-joined postal or street addresses (Contact Directory).';
COMMENT ON COLUMN public.project_contacts.primary_address IS
  'v1117: preferred address among the newline-joined address list.';

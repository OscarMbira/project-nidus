-- =============================================================================
-- v1092: project_contacts — primary email / primary phone flags
-- Prerequisites: v1020 (project_contacts)
--
-- Contact Directory stores multi-line email/phone (newline-joined). These
-- columns record which line is the primary contact method for display and
-- quick dial/mail. Values should match one of the lines in email / phone.
-- Idempotent — safe to re-run.
-- =============================================================================

ALTER TABLE public.project_contacts
  ADD COLUMN IF NOT EXISTS primary_email TEXT,
  ADD COLUMN IF NOT EXISTS primary_phone TEXT;

COMMENT ON COLUMN public.project_contacts.primary_email IS
  'v1092: primary email among the newline-joined email list (Contact Directory).';
COMMENT ON COLUMN public.project_contacts.primary_phone IS
  'v1092: primary phone among the newline-joined phone list (Contact Directory).';

-- Backfill: first non-blank line becomes primary when unset
UPDATE public.project_contacts
SET primary_email = NULLIF(trim(split_part(replace(email, E'\r\n', E'\n'), E'\n', 1)), '')
WHERE COALESCE(is_deleted, FALSE) = FALSE
  AND primary_email IS NULL
  AND NULLIF(trim(email), '') IS NOT NULL;

UPDATE public.project_contacts
SET primary_phone = NULLIF(trim(split_part(replace(phone, E'\r\n', E'\n'), E'\n', 1)), '')
WHERE COALESCE(is_deleted, FALSE) = FALSE
  AND primary_phone IS NULL
  AND NULLIF(trim(phone), '') IS NOT NULL;

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1092: project_contacts.primary_email / primary_phone added';
  RAISE NOTICE '================================================';
END $$;

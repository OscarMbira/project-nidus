-- v1218: affected_standard becomes multi-value (newline-joined list, like the other
-- non-conformance text fields). VARCHAR(200) truncated longer lists, so widen to TEXT.
-- Safe to run more than once: changing a column already of type text is a no-op.

ALTER TABLE public.quality_defects
  ALTER COLUMN affected_standard TYPE TEXT;

-- Verification: expect data_type = 'text'
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'quality_defects'
  AND column_name = 'affected_standard';

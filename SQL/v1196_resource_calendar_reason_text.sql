-- ============================================================================
-- v1196: Widen resource calendar reason so several reasons can be stored
-- ============================================================================
-- Add Calendar Entry captures Reason as a multi-value list. The UI stores one
-- reason per line in unavailability_reason. VARCHAR(255) rejects a longer list.
-- TEXT keeps existing short values and allows as many reasons as needed.
-- Safe to re-run.
-- ============================================================================

ALTER TABLE public.resource_calendar
  ALTER COLUMN unavailability_reason TYPE TEXT;

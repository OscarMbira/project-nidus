-- ============================================================================
-- v1198: Add the missing notifications.updated_at column
-- ============================================================================
-- trigger_notifications_updated_at (v30) sets NEW.updated_at on every UPDATE, but
-- public.notifications has no updated_at column, so marking a notification read fails with
-- "record \"new\" has no field \"updated_at\"". Adds the column and backfills it.
-- Safe to re-run.
-- ============================================================================

ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.notifications
SET updated_at = COALESCE(created_at, NOW())
WHERE updated_at IS NULL;

NOTIFY pgrst, 'reload schema';

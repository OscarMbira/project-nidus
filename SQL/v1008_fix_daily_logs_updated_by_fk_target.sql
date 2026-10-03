-- v1008_fix_daily_logs_updated_by_fk_target.sql
--
-- Corrects v1007's mistake. v1007 assumed trigger_update_audit_fields() (v01) sets
-- NEW.updated_by := auth.uid() directly, and pointed daily_logs.updated_by at
-- auth.users(id) to match. But v102_fix_audit_triggers_user_id_lookup.sql later
-- redefined trigger_update_audit_fields() to look up the internal public.users.id
-- from auth.uid() first, and assign THAT — the same fix already applied to every
-- other table's updated_by column. v1007 was checking the wrong (superseded)
-- version of the function.
--
-- Confirmed live: the FK violation reported (130f71c4-ec71-4b07-9f53-479ffef7cd27)
-- is this user's public.users.id, not their auth.users.id — proving v102's
-- lookup-then-assign behavior is what's actually running.

ALTER TABLE public.daily_logs DROP CONSTRAINT IF EXISTS daily_logs_updated_by_fkey;
ALTER TABLE public.daily_logs
  ADD CONSTRAINT daily_logs_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.daily_logs.updated_by IS
  'User (public.users.id) who last updated this log — set by trigger_update_audit_fields() '
  '(v102), which resolves auth.uid() to the internal user id before assigning. Matches the '
  'FK target of created_by/deleted_by on this same table.';

DO $$
BEGIN
  RAISE NOTICE 'v1008: daily_logs.updated_by now correctly references public.users(id), matching what trigger_update_audit_fields() (v102) actually assigns.';
END $$;

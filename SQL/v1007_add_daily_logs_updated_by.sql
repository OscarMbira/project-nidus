-- v1007_add_daily_logs_updated_by.sql
--
-- Root cause: v1006's fix made daily_logs.log_reference get assigned by the Admin ID
-- Generation AFTER INSERT trigger (trg_daily_logs_admin_display_id) — which does so via an
-- UPDATE statement on the row it just inserted. That UPDATE fires daily_logs' own
-- trg_daily_logs_before_update trigger, whose function (trigger_update_audit_fields(), v01 —
-- shared across dozens of tables) unconditionally does `NEW.updated_by := auth.uid()`. But
-- daily_logs was never given an updated_by column in the first place (only created_by/
-- deleted_by) — hence "record 'new' has no field 'updated_by'". Pre-existing gap, not
-- something the v1006 fix introduced; v1006 just caused daily_logs to actually receive an
-- UPDATE for the first time (before v756b, log_reference was set directly at INSERT time,
-- so this trigger's UPDATE path was never exercised for this table).
--
-- Every sibling audit column on this table (created_by, deleted_by) references public.users
-- (id) — but trigger_update_audit_fields() populates updated_by with auth.uid(), the AUTH
-- user id, not the internal public.users.id. Matching that (not the created_by/deleted_by
-- convention) avoids trading this error for an immediate FK violation on the next UPDATE —
-- same reasoning already applied to team_charters.updated_by earlier in this codebase's
-- history (v978), which also targets auth.users(id) for the same reason.

ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.daily_logs.updated_by IS
  'Auth user who last updated this log — set automatically by trigger_update_audit_fields() '
  '(v01), which assigns auth.uid() directly. References auth.users(id), NOT public.users(id), '
  'unlike created_by/deleted_by on this same table — deliberate, matches what the trigger '
  'actually writes.';

DO $$
BEGIN
  RAISE NOTICE 'v1007: daily_logs.updated_by added — trg_daily_logs_before_update (trigger_update_audit_fields) can now run without erroring, and the Admin ID Generation UPDATE it wraps around will succeed.';
END $$;

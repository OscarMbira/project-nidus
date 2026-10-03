-- ================================================
-- File: v1177_timesheet_entry_edit_history.sql
-- Description: Append-only edit history for timesheet_entries — a BEFORE UPDATE trigger snapshots
--              the row's editable fields whenever any of them actually change, so amending a past
--              week's timesheet (v1178's month/week picker) always keeps a record of what it
--              looked like before. Trigger-based (not application-layer) so it can't be bypassed
--              by any current or future write path, same rationale as other audit mechanisms in
--              this codebase.
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Purpose: distinct from timesheet_entry_reviews (v1169 — approve/reject decisions). This
-- table tracks edits to the entry's own data (hours, times, category, description, date) —
-- i.e. "what did this entry used to say", not "who approved/rejected it and why".

CREATE TABLE IF NOT EXISTS public.timesheet_entry_edit_history (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id        uuid        NOT NULL REFERENCES public.timesheet_entries(id) ON DELETE CASCADE,
    edited_by       uuid        REFERENCES auth.users(id),
    previous_values jsonb       NOT NULL,
    edited_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ts_entry_edit_history_entry_id ON public.timesheet_entry_edit_history(entry_id);

COMMENT ON TABLE public.timesheet_entry_edit_history IS 'Append-only snapshot of a timesheet_entries row''s editable fields immediately before each change (v1177) — never updated/overwritten, so resubmission/amendment history is preserved.';

ALTER TABLE public.timesheet_entry_edit_history ENABLE ROW LEVEL SECURITY;

-- Same visibility as the entry itself (owner, or PM/TL/TM on that project) — read-only; nothing
-- writes to this table except the trigger below.
CREATE POLICY "timesheet_entry_edit_history_select" ON public.timesheet_entry_edit_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.timesheet_entries te
      WHERE te.id = timesheet_entry_edit_history.entry_id
        AND (
          te.user_id = auth.uid()
          OR (
            EXISTS (
              SELECT 1 FROM public.user_projects up
              WHERE up.project_id = te.project_id
                AND up.user_id    = get_user_id_from_auth(auth.uid())
                AND up.is_deleted = FALSE
            )
            AND EXISTS (
              SELECT 1 FROM public.user_roles ur
              JOIN public.roles r ON r.id = ur.role_id
              WHERE ur.user_id  = get_user_id_from_auth(auth.uid())
                AND ur.is_active = TRUE
                AND NOT COALESCE(ur.is_deleted, FALSE)
                AND r.role_name IN ('project_manager', 'team_lead', 'team_manager')
            )
          )
        )
    )
  );

-- ── Trigger: snapshot OLD values whenever a tracked field actually changes ──

CREATE OR REPLACE FUNCTION public.log_timesheet_entry_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (OLD.hours_worked IS DISTINCT FROM NEW.hours_worked
      OR OLD.description IS DISTINCT FROM NEW.description
      OR OLD.work_category IS DISTINCT FROM NEW.work_category
      OR OLD.entry_date IS DISTINCT FROM NEW.entry_date
      OR OLD.start_time IS DISTINCT FROM NEW.start_time
      OR OLD.end_time IS DISTINCT FROM NEW.end_time
      OR OLD.overtime_type_code IS DISTINCT FROM NEW.overtime_type_code) THEN
    INSERT INTO public.timesheet_entry_edit_history (entry_id, edited_by, previous_values)
    VALUES (
      OLD.id,
      auth.uid(),
      jsonb_build_object(
        'hours_worked', OLD.hours_worked,
        'description', OLD.description,
        'work_category', OLD.work_category,
        'entry_date', OLD.entry_date,
        'start_time', OLD.start_time,
        'end_time', OLD.end_time,
        'overtime_type_code', OLD.overtime_type_code,
        'status', OLD.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_timesheet_entries_edit_history ON public.timesheet_entries;
CREATE TRIGGER trg_timesheet_entries_edit_history
  BEFORE UPDATE ON public.timesheet_entries
  FOR EACH ROW EXECUTE FUNCTION public.log_timesheet_entry_edit();

-- ── Simulator mirror (per-schema business data, same as timesheet_day_locations) ──

CREATE TABLE IF NOT EXISTS sim.timesheet_entry_edit_history (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id        uuid        NOT NULL REFERENCES sim.timesheet_entries(id) ON DELETE CASCADE,
    edited_by       uuid,
    previous_values jsonb       NOT NULL,
    edited_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sim_ts_entry_edit_history_entry_id ON sim.timesheet_entry_edit_history(entry_id);

ALTER TABLE sim.timesheet_entry_edit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sim_timesheet_entry_edit_history_all" ON sim.timesheet_entry_edit_history
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION sim.log_timesheet_entry_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (OLD.hours_worked IS DISTINCT FROM NEW.hours_worked
      OR OLD.description IS DISTINCT FROM NEW.description
      OR OLD.work_category IS DISTINCT FROM NEW.work_category
      OR OLD.entry_date IS DISTINCT FROM NEW.entry_date
      OR OLD.start_time IS DISTINCT FROM NEW.start_time
      OR OLD.end_time IS DISTINCT FROM NEW.end_time
      OR OLD.overtime_type_code IS DISTINCT FROM NEW.overtime_type_code) THEN
    INSERT INTO sim.timesheet_entry_edit_history (entry_id, edited_by, previous_values)
    VALUES (
      OLD.id,
      auth.uid(),
      jsonb_build_object(
        'hours_worked', OLD.hours_worked,
        'description', OLD.description,
        'work_category', OLD.work_category,
        'entry_date', OLD.entry_date,
        'start_time', OLD.start_time,
        'end_time', OLD.end_time,
        'overtime_type_code', OLD.overtime_type_code,
        'status', OLD.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sim_timesheet_entries_edit_history ON sim.timesheet_entries;
CREATE TRIGGER trg_sim_timesheet_entries_edit_history
  BEFORE UPDATE ON sim.timesheet_entries
  FOR EACH ROW EXECUTE FUNCTION sim.log_timesheet_entry_edit();

-- ── Register table ──

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('timesheet_entry_edit_history', 'Append-only snapshot of a timesheet entry''s editable fields immediately before each change', true, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at        = NOW();

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1177: timesheet_entry_edit_history (public + sim) created with BEFORE UPDATE triggers.';
  RAISE NOTICE '================================================';
END $$;

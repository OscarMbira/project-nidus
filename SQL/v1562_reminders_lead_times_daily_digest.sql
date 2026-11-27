-- ============================================================================
-- v1562: Due-date reminders, reminder lead times and the daily digest — v1352 Slice 1 (1.3, 1.3a, 2.2)
-- PRD:  projectprd/v1352_background_jobs_PRD.md (D5, D6, D7, D8, A1.6)
-- Plan: projectplan/v1352_background_jobs_plan.md (Slice 1)
--
-- Data (rule 25.1 — record types, lead times and reminder texts are rows, not code):
--   public.reminder_record_types        one row per (schema, record type): table or view, date column,
--                                       offset, title / project / owner columns, status filter,
--                                       recipient rule (owner | role:<code> | org_admins), default lead
--                                       time, overdue window, message key, Planner tables (A1.6)
--   public.reminder_messages            before / overdue texts per message key ({title} {date} {days})
--   public|sim.reminder_lead_time_settings   organisation overrides of the default lead time (D7)
--   public|sim.reminder_markers         one row per item × kind × due date: an item gets one "before"
--                                       and one "overdue" reminder only (D6)
-- Jobs (rule 80, catalogue rows at the end of this file):
--   reminders.due_dates          sql      public.run_due_reminders(jsonb)    0 6 * * *  organisation time
--   notifications.daily_digest   sql      public.run_daily_digest(jsonb)     0 7 * * *  organisation time
--   notifications.digest_send    handler  one email per person per day (queue only, dedupe per day)
-- Lead-time page RPCs (PMO Configuration, Platform + Simulator):
--   public.reminder_lead_times_get() / _save(jsonb)     sim.reminder_lead_times_get() / _save(jsonb)
--
-- Reminders appear in-app per item (public.notifications — the Simulator reads the same table and marks
-- practice items). Email only arrives through the daily digest (D6), which respects the user's
-- "Reports & Digests" email switch in Notification Preferences (public or sim, per item).
-- Planner-edition accounts only get reminders for record types whose tables are all on the Planner
-- allow-list (PRD story 18).
-- No human-readable reference columns, so no Admin ID Generation rule is needed (rule 16.2).
-- Prerequisites: v1559, v1560, v1060 (regional settings), v1119, v1247, v1251, v995.
-- Re-run SQL/v1251_planner_table_wall.sql after this file. Idempotent.
-- ============================================================================

-- ── 1. Shared helpers for people-facing jobs (both schemas) ──────────────────
CREATE OR REPLACE FUNCTION public.bj_valid_time_zone(p_tz TEXT)
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT CASE WHEN p_tz IS NOT NULL AND EXISTS (SELECT 1 FROM pg_timezone_names z WHERE z.name = p_tz) THEN p_tz END;
$$;

-- Organisation time zone from Regional & Format Settings (rule 68); UTC when not set.
CREATE OR REPLACE FUNCTION public.bj_account_time_zone(p_account_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT COALESCE(public.bj_valid_time_zone(
    (SELECT s.time_zone::TEXT FROM public.organisation_regional_format_settings s
      WHERE s.account_id = p_account_id AND NOT COALESCE(s.is_deleted, FALSE) LIMIT 1)), 'UTC');
$$;

CREATE OR REPLACE FUNCTION public.bj_account_date_format(p_account_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT COALESCE((SELECT s.date_format::TEXT FROM public.organisation_regional_format_settings s
                    WHERE s.account_id = p_account_id AND NOT COALESCE(s.is_deleted, FALSE) LIMIT 1), 'D MMM YYYY');
$$;

-- The organisation a person works in: last active workspace, else the account they own.
CREATE OR REPLACE FUNCTION public.bj_user_account(p_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT COALESCE(
    (SELECT u.last_active_account_id FROM public.users u WHERE u.id = p_user_id),
    (SELECT a.id FROM public.accounts a WHERE a.owner_user_id = p_user_id AND NOT COALESCE(a.is_deleted, FALSE)
      ORDER BY a.created_at LIMIT 1));
$$;

CREATE OR REPLACE FUNCTION public.bj_user_from_auth(p_auth_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT u.id FROM public.users u
   WHERE p_auth_user_id IS NOT NULL AND u.auth_user_id = p_auth_user_id AND NOT COALESCE(u.is_deleted, FALSE)
   LIMIT 1;
$$;

-- Organisation of a project. Simulator practice projects belong to the learner's organisation.
CREATE OR REPLACE FUNCTION public.bj_project_account(p_schema TEXT, p_project_id UUID)
RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
BEGIN
  IF p_project_id IS NULL THEN RETURN NULL; END IF;
  IF p_schema = 'sim' THEN
    RETURN public.bj_user_account(public.bj_user_from_auth(
      (SELECT pp.user_id FROM sim.practice_projects pp WHERE pp.id = p_project_id)));
  END IF;
  RETURN (SELECT p.account_id FROM public.projects p WHERE p.id = p_project_id);
END;
$$;

-- D5: the project override where the job works per project, else the organisation, else UTC.
CREATE OR REPLACE FUNCTION public.bj_project_time_zone(p_schema TEXT, p_project_id UUID, p_account_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v_tz TEXT;
BEGIN
  IF p_schema = 'public' AND p_project_id IS NOT NULL THEN
    v_tz := public.bj_valid_time_zone((SELECT s.time_zone::TEXT FROM public.project_regional_format_settings s
                                        WHERE s.project_id = p_project_id AND NOT COALESCE(s.is_deleted, FALSE) LIMIT 1));
    IF v_tz IS NOT NULL THEN RETURN v_tz; END IF;
  END IF;
  RETURN public.bj_account_time_zone(COALESCE(p_account_id, public.bj_project_account(p_schema, p_project_id)));
END;
$$;

-- PRD story 18: a Planner-edition account only gets jobs whose tables are all on the Planner allow-list.
CREATE OR REPLACE FUNCTION public.bj_account_allows_tables(p_account_id UUID, p_tables TEXT[])
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT COALESCE((SELECT a.product_edition::TEXT FROM public.accounts a WHERE a.id = p_account_id), 'platform') IS DISTINCT FROM 'planner'
      OR NOT EXISTS (SELECT 1 FROM unnest(COALESCE(p_tables, ARRAY[]::TEXT[])) AS t(name)
                      WHERE NOT EXISTS (SELECT 1 FROM public.planner_table_allowlist w WHERE w.table_name = t.name));
$$;

-- Organisation-time jobs get {"time_zones": [...]} from the tick; a manual run has none and covers all zones.
CREATE OR REPLACE FUNCTION public.bj_zone_due(p_context JSONB, p_zone TEXT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE
AS $$
  SELECT NOT (COALESCE(p_context, '{}'::jsonb) ? 'time_zones')
      OR COALESCE(p_context -> 'time_zones', '[]'::jsonb) ? COALESCE(p_zone, 'UTC');
$$;

-- Dates in the organisation's date format (rule 68 tokens: YYYY YY MMMM MMM MM M DD D).
CREATE OR REPLACE FUNCTION public.bj_format_date(p_date DATE, p_format TEXT)
RETURNS TEXT
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  f   TEXT := COALESCE(NULLIF(btrim(p_format), ''), 'D MMM YYYY');
  res TEXT := '';
  i   INTEGER := 1;
BEGIN
  IF p_date IS NULL THEN RETURN NULL; END IF;
  WHILE i <= length(f) LOOP
    IF substr(f, i, 4) = 'YYYY' THEN res := res || to_char(p_date, 'YYYY'); i := i + 4;
    ELSIF substr(f, i, 4) = 'MMMM' THEN res := res || to_char(p_date, 'FMMonth'); i := i + 4;
    ELSIF substr(f, i, 3) = 'MMM' THEN res := res || to_char(p_date, 'Mon'); i := i + 3;
    ELSIF substr(f, i, 2) = 'MM' THEN res := res || to_char(p_date, 'MM'); i := i + 2;
    ELSIF substr(f, i, 2) = 'DD' THEN res := res || to_char(p_date, 'DD'); i := i + 2;
    ELSIF substr(f, i, 2) = 'YY' THEN res := res || to_char(p_date, 'YY'); i := i + 2;
    ELSIF substr(f, i, 1) = 'D' THEN res := res || to_char(p_date, 'FMDD'); i := i + 1;
    ELSIF substr(f, i, 1) = 'M' THEN res := res || to_char(p_date, 'FMMM'); i := i + 1;
    ELSE res := res || substr(f, i, 1); i := i + 1;
    END IF;
  END LOOP;
  RETURN res;
END;
$$;

-- One in-app notification (public.notifications is shared by both apps; practice items carry schema 'sim').
CREATE OR REPLACE FUNCTION public.bj_notify(
  p_user_id UUID, p_type TEXT, p_category TEXT, p_title TEXT, p_message TEXT,
  p_entity_type TEXT, p_entity_id UUID, p_project_id UUID, p_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, notification_type, notification_category, title, message,
                                    related_entity_type, related_entity_id, delivery_method, notification_data, project_id)
  VALUES (p_user_id, p_type, p_category, left(COALESCE(p_title, ''), 200), COALESCE(p_message, ''),
          p_entity_type, p_entity_id, 'in_app', COALESCE(p_data, '{}'::jsonb), p_project_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- People holding a role on a project (role codes like project_manager, team_lead).
CREATE OR REPLACE FUNCTION public.bj_project_role_users(p_schema TEXT, p_project_id UUID, p_role TEXT)
RETURNS UUID[]
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v UUID[] := ARRAY[]::UUID[];
BEGIN
  IF p_project_id IS NULL THEN RETURN v; END IF;
  IF p_schema = 'sim' THEN
    IF p_role = 'project_manager' THEN
      v := ARRAY(SELECT x FROM (
             SELECT pp.project_manager_user_id AS x FROM sim.practice_projects pp WHERE pp.id = p_project_id
             UNION
             SELECT public.bj_user_from_auth(m.user_id) FROM sim.practice_project_memberships m
              WHERE m.practice_project_id = p_project_id AND COALESCE(m.is_active, TRUE) AND m.role_name = 'project_manager'
           ) s WHERE x IS NOT NULL);
      IF cardinality(v) = 0 THEN
        -- the learner who owns the practice project
        v := ARRAY(SELECT x FROM (SELECT public.bj_user_from_auth(pp.user_id) AS x FROM sim.practice_projects pp
                                   WHERE pp.id = p_project_id) s WHERE x IS NOT NULL);
      END IF;
    ELSE
      v := ARRAY(SELECT x FROM (SELECT public.bj_user_from_auth(m.user_id) AS x FROM sim.practice_project_memberships m
                                 WHERE m.practice_project_id = p_project_id AND COALESCE(m.is_active, TRUE)
                                   AND m.role_name = p_role) s WHERE x IS NOT NULL);
    END IF;
    RETURN v;
  END IF;

  v := ARRAY(SELECT DISTINCT x FROM (
         SELECT p.project_manager_user_id AS x FROM public.projects p WHERE p.id = p_project_id AND p_role = 'project_manager'
         UNION
         SELECT ur.user_id FROM public.user_roles ur
           JOIN public.roles r ON r.id = ur.role_id AND NOT COALESCE(r.is_deleted, FALSE)
          WHERE ur.project_id = p_project_id AND ur.is_active = TRUE AND NOT COALESCE(ur.is_deleted, FALSE)
            AND lower(replace(r.role_name, ' ', '_')) = p_role
       ) s WHERE x IS NOT NULL);
  RETURN v;
END;
$$;

-- Account owner + PMO Admins of the organisation (same reach as is_pmo_admin_or_owner_for_account).
CREATE OR REPLACE FUNCTION public.bj_account_admin_users(p_account_id UUID)
RETURNS UUID[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT ARRAY(SELECT DISTINCT x FROM (
    SELECT a.owner_user_id AS x FROM public.accounts a WHERE a.id = p_account_id AND NOT COALESCE(a.is_deleted, FALSE)
    UNION
    SELECT ur.user_id FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      JOIN public.projects p ON p.id = ur.project_id
     WHERE p.account_id = p_account_id AND r.role_name IN ('PMO Admin', 'pmo_admin', 'System Admin')
       AND ur.is_active = TRUE AND NOT COALESCE(ur.is_deleted, FALSE) AND NOT COALESCE(p.is_deleted, FALSE)
  ) s WHERE x IS NOT NULL);
$$;

-- ── 2. Tables ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reminder_messages (
  message_key    TEXT PRIMARY KEY CHECK (message_key ~ '^[a-z][a-z0-9_]*$'),
  before_title   TEXT NOT NULL,
  before_body    TEXT NOT NULL,
  overdue_title  TEXT NOT NULL,
  overdue_body   TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.reminder_messages IS
  'v1352: reminder texts per message key. Placeholders {title} {date} {days}. Rule 25.1 — texts are data.';

CREATE TABLE IF NOT EXISTS public.reminder_record_types (
  schema_name          TEXT NOT NULL CHECK (schema_name IN ('public', 'sim')),
  record_type          TEXT NOT NULL CHECK (record_type ~ '^[a-z][a-z0-9_]*$'),
  label                TEXT NOT NULL,
  description          TEXT,
  table_name           TEXT NOT NULL CHECK (table_name ~ '^[a-z_][a-z0-9_]*$'),
  id_column            TEXT NOT NULL DEFAULT 'id' CHECK (id_column ~ '^[a-z_][a-z0-9_]*$'),
  date_column          TEXT NOT NULL CHECK (date_column ~ '^[a-z_][a-z0-9_]*$'),
  due_offset_days      INTEGER NOT NULL DEFAULT 0 CHECK (due_offset_days BETWEEN 0 AND 365),
  title_column         TEXT NOT NULL CHECK (title_column ~ '^[a-z_][a-z0-9_]*$'),
  project_column       TEXT CHECK (project_column IS NULL OR project_column ~ '^[a-z_][a-z0-9_]*$'),
  account_column       TEXT CHECK (account_column IS NULL OR account_column ~ '^[a-z_][a-z0-9_]*$'),
  owner_columns        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  owner_id_kind        TEXT NOT NULL DEFAULT 'user' CHECK (owner_id_kind IN ('user', 'auth')),
  status_filter        TEXT,
  recipient_rule       TEXT NOT NULL DEFAULT 'owner' CHECK (recipient_rule ~ '^(owner|org_admins|role:[a-z_]+)$'),
  default_lead_days    INTEGER NOT NULL DEFAULT 3 CHECK (default_lead_days BETWEEN 0 AND 365),
  overdue_window_days  INTEGER NOT NULL DEFAULT 14 CHECK (overdue_window_days BETWEEN 0 AND 365),
  message_key          TEXT NOT NULL REFERENCES public.reminder_messages(message_key),
  planner_tables       TEXT[],          -- Planner allow-list names; Simulator rows use 'sim.<table>' (never allow-listed)
  sort_order           INTEGER NOT NULL DEFAULT 100,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (schema_name, record_type),
  CONSTRAINT reminder_record_types_has_scope CHECK (project_column IS NOT NULL OR account_column IS NOT NULL)
);
COMMENT ON TABLE public.reminder_record_types IS
  'v1352 A1.6: record types the due-date reminder job reads. Later features add rows, not code. '
  'status_filter is a SQL condition on alias r, written by versioned SQL only (no client access).';

CREATE TABLE IF NOT EXISTS public.reminder_lead_time_settings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  record_type  TEXT NOT NULL,
  lead_days    INTEGER NOT NULL CHECK (lead_days BETWEEN 0 AND 365),
  created_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_reminder_lead_time_settings UNIQUE (account_id, record_type)
);

CREATE TABLE IF NOT EXISTS sim.reminder_lead_time_settings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  record_type  TEXT NOT NULL,
  lead_days    INTEGER NOT NULL CHECK (lead_days BETWEEN 0 AND 365),
  created_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sim_reminder_lead_time_settings UNIQUE (account_id, record_type)
);

CREATE TABLE IF NOT EXISTS public.reminder_markers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type         TEXT NOT NULL,
  record_id           UUID NOT NULL,
  reminder_kind       TEXT NOT NULL CHECK (reminder_kind IN ('before', 'overdue')),
  due_date            DATE NOT NULL,
  account_id          UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  recipient_user_ids  UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  sent_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_reminder_markers UNIQUE (record_type, record_id, reminder_kind, due_date)
);
CREATE INDEX IF NOT EXISTS idx_reminder_markers_sent ON public.reminder_markers (sent_at);

CREATE TABLE IF NOT EXISTS sim.reminder_markers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type         TEXT NOT NULL,
  record_id           UUID NOT NULL,
  reminder_kind       TEXT NOT NULL CHECK (reminder_kind IN ('before', 'overdue')),
  due_date            DATE NOT NULL,
  account_id          UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  recipient_user_ids  UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  sent_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sim_reminder_markers UNIQUE (record_type, record_id, reminder_kind, due_date)
);
CREATE INDEX IF NOT EXISTS idx_sim_reminder_markers_sent ON sim.reminder_markers (sent_at);

-- RLS on, no client access: the pages use the SECURITY DEFINER RPCs below; jobs run as the definer.
ALTER TABLE public.reminder_messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_record_types        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_lead_time_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.reminder_lead_time_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_markers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.reminder_markers                ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reminder_messages, public.reminder_record_types, public.reminder_lead_time_settings,
              sim.reminder_lead_time_settings, public.reminder_markers, sim.reminder_markers FROM anon, authenticated;
GRANT ALL ON public.reminder_messages, public.reminder_record_types, public.reminder_lead_time_settings,
             sim.reminder_lead_time_settings, public.reminder_markers, sim.reminder_markers TO service_role;

-- ── 3. Source views for record types that need a join to reach their project ─
-- Views are owned by the migration role, so clients get no access to them.
CREATE OR REPLACE VIEW public.reminder_src_issue_actions AS
SELECT a.id, a.target_date, a.action_description AS title, a.status, a.assigned_to_id, i.project_id
  FROM public.issue_actions a
  JOIN public.issues i ON i.id = a.issue_id AND NOT COALESCE(i.is_deleted, FALSE);

CREATE OR REPLACE VIEW sim.reminder_src_issue_actions AS
SELECT a.id, a.due_date, a.action_title AS title, a.status, a.assigned_to_user_id, i.practice_project_id
  FROM sim.practice_issue_actions a
  JOIN sim.practice_issues i ON i.id = a.practice_issue_id AND NOT COALESCE(i.is_deleted, FALSE);

CREATE OR REPLACE VIEW public.reminder_src_daily_log_entries AS
SELECT e.id, e.target_date, e.description AS title, e.status, e.is_deleted, e.person_responsible_id, l.project_id
  FROM public.daily_log_entries e
  JOIN public.daily_logs l ON l.id = e.daily_log_id AND NOT COALESCE(l.is_deleted, FALSE);

CREATE OR REPLACE VIEW sim.reminder_src_daily_log_entries AS
SELECT e.id, e.target_date, e.description AS title, e.status, e.person_responsible_id, l.practice_project_id
  FROM sim.practice_daily_log_entries e
  JOIN sim.practice_daily_logs l ON l.id = e.practice_daily_log_id AND NOT COALESCE(l.is_deleted, FALSE);

-- Register sign-offs have no deadline column: the reminder date is when the slot was opened plus the
-- record type's due_offset_days. Only the slot whose turn it is (no earlier mandatory slot open).
CREATE OR REPLACE VIEW public.reminder_src_register_signoffs AS
SELECT s.id, s.created_at, s.status, s.assigned_user_id, rec.title, reg.scope_project_id AS project_id, reg.account_id,
       NOT EXISTS (SELECT 1 FROM public.local_register_record_signatories e
                    WHERE e.record_id = s.record_id AND e.signing_round = s.signing_round
                      AND e.slot_order < s.slot_order AND e.is_mandatory AND e.status <> 'signed') AS is_turn
  FROM public.local_register_record_signatories s
  JOIN public.local_register_records rec ON rec.id = s.record_id AND NOT rec.is_deleted
  JOIN public.local_registers reg ON reg.id = rec.register_id;

CREATE OR REPLACE VIEW sim.reminder_src_register_signoffs AS
SELECT s.id, s.created_at, s.status, s.assigned_user_id, rec.title, reg.scope_project_id AS practice_project_id,
       COALESCE(reg.account_id, sysreg.account_id) AS account_id,
       NOT EXISTS (SELECT 1 FROM sim.local_register_record_signatories e
                    WHERE e.record_id = s.record_id AND e.signing_round = s.signing_round
                      AND e.slot_order < s.slot_order AND e.is_mandatory AND e.status <> 'signed') AS is_turn
  FROM sim.local_register_record_signatories s
  JOIN sim.local_register_records rec ON rec.id = s.record_id AND NOT COALESCE(rec.is_deleted, FALSE)
  LEFT JOIN sim.local_registers reg ON reg.id = rec.register_id AND NOT rec.is_system_register
  LEFT JOIN public.local_registers sysreg ON sysreg.id = rec.register_id AND rec.is_system_register;

REVOKE ALL ON public.reminder_src_issue_actions, sim.reminder_src_issue_actions,
              public.reminder_src_daily_log_entries, sim.reminder_src_daily_log_entries,
              public.reminder_src_register_signoffs, sim.reminder_src_register_signoffs FROM anon, authenticated;

-- ── 4. Seed: reminder texts and today's record types (A1.6) ──────────────────
INSERT INTO public.reminder_messages (message_key, before_title, before_body, overdue_title, overdue_body) VALUES
  ('risk_review', 'Risk review due {date}', 'The risk “{title}” is due for review on {date}.',
                  'Risk review overdue', 'The review of the risk “{title}” was due on {date}.'),
  ('issue_due', 'Issue due {date}', 'The issue “{title}” is due to be resolved by {date}.',
                'Issue overdue', 'The issue “{title}” was due to be resolved by {date}.'),
  ('action_due', 'Action due {date}', 'The action “{title}” is due on {date}.',
                 'Action overdue', 'The action “{title}” was due on {date}.'),
  ('milestone_due', 'Milestone due {date}', 'The milestone “{title}” is due on {date}.',
                    'Milestone overdue', 'The milestone “{title}” was due on {date} and is not marked complete.'),
  ('signoff_due', 'Sign-off waiting for you', 'Please sign “{title}” by {date}.',
                  'Sign-off overdue', 'Your sign-off of “{title}” was expected by {date}.'),
  ('daily_log_due', 'Daily log item due {date}', 'The daily log item “{title}” has a target date of {date}.',
                    'Daily log item overdue', 'The daily log item “{title}” had a target date of {date}.'),
  ('timesheet_period', 'Timesheet for the week ending {date}', 'Please complete and submit your timesheet for “{title}” for the week ending {date}.',
                       'Timesheet overdue', 'Your timesheet for “{title}” for the week ending {date} is still incomplete.')
ON CONFLICT (message_key) DO UPDATE SET
  before_title = EXCLUDED.before_title, before_body = EXCLUDED.before_body,
  overdue_title = EXCLUDED.overdue_title, overdue_body = EXCLUDED.overdue_body, updated_at = NOW();

INSERT INTO public.reminder_record_types (schema_name, record_type, label, description, table_name, id_column, date_column,
  due_offset_days, title_column, project_column, account_column, owner_columns, owner_id_kind, status_filter,
  recipient_rule, default_lead_days, overdue_window_days, message_key, planner_tables, sort_order) VALUES
  -- Platform
  ('public', 'risk_review', 'Risk reviews', 'Risks whose next review date is coming up or has passed. Sent to the risk owner.',
   'risks', 'id', 'next_review_date', 0, 'risk_title', 'project_id', NULL, ARRAY['risk_owner_id', 'risk_owner_user_id'], 'user',
   'NOT COALESCE(r.is_deleted, FALSE) AND lower(COALESCE(to_jsonb(r) ->> ''status_enum'', r.status, '''')) NOT IN (''closed'', ''expired'', ''realized'')',
   'owner', 3, 14, 'risk_review', ARRAY['risks'], 10),
  ('public', 'issue_due', 'Issue due dates', 'Open issues whose due date is coming up or has passed. Sent to the issue owner.',
   'issues', 'id', 'due_date', 0, 'issue_title', 'project_id', NULL, ARRAY['owner_id', 'assigned_to_user_id'], 'user',
   'NOT COALESCE(r.is_deleted, FALSE) AND lower(COALESCE(r.status, '''')) NOT IN (''resolved'', ''closed'', ''cancelled'')',
   'owner', 3, 14, 'issue_due', ARRAY['issues'], 20),
  ('public', 'issue_action_due', 'Actions', 'Issue actions with a target date coming up or passed. Sent to the person the action is assigned to.',
   'reminder_src_issue_actions', 'id', 'target_date', 0, 'title', 'project_id', NULL, ARRAY['assigned_to_id'], 'user',
   'lower(COALESCE(r.status, '''')) NOT IN (''completed'', ''cancelled'')',
   'owner', 2, 14, 'action_due', ARRAY['issue_actions', 'issues'], 30),
  ('public', 'milestone_due', 'Milestones', 'Milestones not yet complete whose date is coming up or has passed. Sent to the project manager.',
   'project_milestones', 'id', 'milestone_date', 0, 'milestone_name', 'project_id', NULL, ARRAY[]::TEXT[], 'user',
   'NOT COALESCE(r.is_deleted, FALSE) AND NOT COALESCE(r.is_completed, FALSE) AND lower(COALESCE(r.status, '''')) NOT IN (''achieved'', ''completed'', ''cancelled'')',
   'role:project_manager', 7, 14, 'milestone_due', ARRAY['project_milestones'], 40),
  ('public', 'signoff_due', 'Document sign-offs', 'Register record sign-offs waiting for the signatory. The date is 7 days after the sign-off was requested.',
   'reminder_src_register_signoffs', 'id', 'created_at', 7, 'title', 'project_id', 'account_id', ARRAY['assigned_user_id'], 'user',
   'r.status = ''pending'' AND r.is_turn',
   'owner', 2, 14, 'signoff_due', ARRAY['local_register_record_signatories', 'local_register_records', 'local_registers'], 50),
  ('public', 'daily_log_due', 'Daily log items', 'Daily log entries with a target date coming up or passed. Sent to the person responsible.',
   'reminder_src_daily_log_entries', 'id', 'target_date', 0, 'title', 'project_id', NULL, ARRAY['person_responsible_id'], 'user',
   'NOT COALESCE(r.is_deleted, FALSE) AND lower(COALESCE(r.status, '''')) NOT IN (''completed'', ''cancelled'')',
   'owner', 1, 14, 'daily_log_due', ARRAY['daily_log_entries', 'daily_logs'], 60),
  -- Simulator (practice projects)
  ('sim', 'risk_review', 'Risk reviews', 'Practice risks whose next review date is coming up or has passed. Sent to the risk owner.',
   'practice_risks', 'id', 'next_review_date', 0, 'risk_title', 'practice_project_id', NULL, ARRAY['risk_owner_user_id'], 'auth',
   'NOT COALESCE(r.is_deleted, FALSE) AND lower(COALESCE(r.status, '''')) NOT IN (''closed'', ''realized'')',
   'owner', 3, 14, 'risk_review', ARRAY['sim.practice_risks'], 10),
  ('sim', 'issue_due', 'Issue due dates', 'Open practice issues whose due date is coming up or has passed. Sent to the person assigned.',
   'practice_issues', 'id', 'due_date', 0, 'issue_title', 'practice_project_id', NULL, ARRAY['assigned_to_user_id'], 'auth',
   'NOT COALESCE(r.is_deleted, FALSE) AND lower(COALESCE(r.status, '''')) NOT IN (''resolved'', ''closed'', ''cancelled'')',
   'owner', 3, 14, 'issue_due', ARRAY['sim.practice_issues'], 20),
  ('sim', 'issue_action_due', 'Actions', 'Practice issue actions with a due date coming up or passed. Sent to the person assigned.',
   'reminder_src_issue_actions', 'id', 'due_date', 0, 'title', 'practice_project_id', NULL, ARRAY['assigned_to_user_id'], 'auth',
   'lower(COALESCE(r.status, '''')) NOT IN (''completed'', ''cancelled'')',
   'owner', 2, 14, 'action_due', ARRAY['sim.practice_issue_actions', 'sim.practice_issues'], 30),
  ('sim', 'milestone_due', 'Milestones', 'Practice milestones not yet complete whose date is coming up or has passed. Sent to the project manager.',
   'project_milestones', 'id', 'milestone_date', 0, 'milestone_name', 'practice_project_id', NULL, ARRAY[]::TEXT[], 'user',
   'NOT COALESCE(r.is_deleted, FALSE) AND NOT COALESCE(r.is_completed, FALSE) AND lower(COALESCE(r.status, '''')) NOT IN (''achieved'', ''completed'', ''cancelled'')',
   'role:project_manager', 7, 14, 'milestone_due', ARRAY['sim.project_milestones'], 40),
  ('sim', 'signoff_due', 'Document sign-offs', 'Practice register sign-offs waiting for the signatory. The date is 7 days after the sign-off was requested.',
   'reminder_src_register_signoffs', 'id', 'created_at', 7, 'title', 'practice_project_id', 'account_id', ARRAY['assigned_user_id'], 'user',
   'r.status = ''pending'' AND r.is_turn',
   'owner', 2, 14, 'signoff_due', ARRAY['sim.local_register_record_signatories', 'sim.local_register_records'], 50),
  ('sim', 'daily_log_due', 'Daily log items', 'Practice daily log entries with a target date coming up or passed. Sent to the person responsible.',
   'reminder_src_daily_log_entries', 'id', 'target_date', 0, 'title', 'practice_project_id', NULL, ARRAY['person_responsible_id'], 'auth',
   'lower(COALESCE(r.status, '''')) NOT IN (''completed'', ''cancelled'')',
   'owner', 1, 14, 'daily_log_due', ARRAY['sim.practice_daily_log_entries', 'sim.practice_daily_logs'], 60)
ON CONFLICT (schema_name, record_type) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, table_name = EXCLUDED.table_name,
  id_column = EXCLUDED.id_column, date_column = EXCLUDED.date_column, due_offset_days = EXCLUDED.due_offset_days,
  title_column = EXCLUDED.title_column, project_column = EXCLUDED.project_column, account_column = EXCLUDED.account_column,
  owner_columns = EXCLUDED.owner_columns, owner_id_kind = EXCLUDED.owner_id_kind, status_filter = EXCLUDED.status_filter,
  recipient_rule = EXCLUDED.recipient_rule, default_lead_days = EXCLUDED.default_lead_days,
  overdue_window_days = EXCLUDED.overdue_window_days, message_key = EXCLUDED.message_key,
  planner_tables = EXCLUDED.planner_tables, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- ── 5. Reminder engine ───────────────────────────────────────────────────────
-- 'before' from (due − lead) up to the due date; 'overdue' after it, within the overdue window (so the
-- first run does not remind about items that went overdue long ago). NULL = nothing to send today.
CREATE OR REPLACE FUNCTION public.reminder_kind(p_due DATE, p_today DATE, p_lead_days INTEGER, p_overdue_window_days INTEGER)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_due IS NULL OR p_today IS NULL THEN NULL
    WHEN p_today > p_due AND p_today <= p_due + GREATEST(COALESCE(p_overdue_window_days, 14), 0) THEN 'overdue'
    WHEN p_today <= p_due AND p_today >= p_due - GREATEST(COALESCE(p_lead_days, 0), 0) THEN 'before'
  END;
$$;

CREATE OR REPLACE FUNCTION public.reminder_render(p_text TEXT, p_title TEXT, p_date TEXT, p_days INTEGER)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT replace(replace(replace(COALESCE(p_text, ''), '{title}', COALESCE(p_title, '')),
                 '{date}', COALESCE(p_date, '')), '{days}', COALESCE(p_days::TEXT, ''));
$$;

-- D7: organisation override, else the record type's default.
CREATE OR REPLACE FUNCTION public.reminder_lead_days(p_schema TEXT, p_account_id UUID, p_record_type TEXT, p_default INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
BEGIN
  IF p_schema = 'sim' THEN
    RETURN COALESCE((SELECT s.lead_days FROM sim.reminder_lead_time_settings s
                      WHERE s.account_id = p_account_id AND s.record_type = p_record_type), p_default);
  END IF;
  RETURN COALESCE((SELECT s.lead_days FROM public.reminder_lead_time_settings s
                    WHERE s.account_id = p_account_id AND s.record_type = p_record_type), p_default);
END;
$$;

-- The "already sent" marker (D6). Returns the new marker id, or NULL when this reminder was sent before.
CREATE OR REPLACE FUNCTION public.reminder_mark(p_schema TEXT, p_record_type TEXT, p_record_id UUID, p_kind TEXT,
                                               p_due DATE, p_account_id UUID, p_recipients UUID[] DEFAULT ARRAY[]::UUID[])
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_schema = 'sim' THEN
    INSERT INTO sim.reminder_markers (record_type, record_id, reminder_kind, due_date, account_id, recipient_user_ids)
    VALUES (p_record_type, p_record_id, p_kind, p_due, p_account_id, COALESCE(p_recipients, ARRAY[]::UUID[]))
    ON CONFLICT (record_type, record_id, reminder_kind, due_date) DO NOTHING
    RETURNING id INTO v_id;
  ELSE
    INSERT INTO public.reminder_markers (record_type, record_id, reminder_kind, due_date, account_id, recipient_user_ids)
    VALUES (p_record_type, p_record_id, p_kind, p_due, p_account_id, COALESCE(p_recipients, ARRAY[]::UUID[]))
    ON CONFLICT (record_type, record_id, reminder_kind, due_date) DO NOTHING
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reminder_set_marker_recipients(p_schema TEXT, p_marker_id UUID, p_recipients UUID[])
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
BEGIN
  IF p_schema = 'sim' THEN
    UPDATE sim.reminder_markers SET recipient_user_ids = COALESCE(p_recipients, ARRAY[]::UUID[]) WHERE id = p_marker_id;
  ELSE
    UPDATE public.reminder_markers SET recipient_user_ids = COALESCE(p_recipients, ARRAY[]::UUID[]) WHERE id = p_marker_id;
  END IF;
END;
$$;

-- Who gets the reminder: the rule's people; when nobody is found, the project manager (Simulator: the learner).
CREATE OR REPLACE FUNCTION public.reminder_recipients(p_schema TEXT, p_rule TEXT, p_owner UUID, p_owner_kind TEXT,
                                                     p_project_id UUID, p_account_id UUID)
RETURNS UUID[]
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v       UUID[] := ARRAY[]::UUID[];
  v_owner UUID;
BEGIN
  v_owner := CASE WHEN p_owner_kind = 'auth' THEN public.bj_user_from_auth(p_owner) ELSE p_owner END;
  IF p_rule = 'owner' THEN
    IF v_owner IS NOT NULL THEN v := ARRAY[v_owner]; END IF;
  ELSIF p_rule = 'org_admins' THEN
    v := public.bj_account_admin_users(p_account_id);
  ELSIF p_rule LIKE 'role:%' THEN
    v := public.bj_project_role_users(p_schema, p_project_id, substr(p_rule, 6));
  END IF;
  IF COALESCE(cardinality(v), 0) = 0 THEN
    v := public.bj_project_role_users(p_schema, p_project_id, 'project_manager');
  END IF;
  RETURN ARRAY(SELECT DISTINCT x.id FROM unnest(COALESCE(v, ARRAY[]::UUID[])) AS c(id)
                 JOIN public.users x ON x.id = c.id
                WHERE COALESCE(x.is_active, TRUE) AND NOT COALESCE(x.is_deleted, FALSE));
END;
$$;

-- Query text for one record type. Identifiers are quoted; status_filter comes from versioned SQL only.
CREATE OR REPLACE FUNCTION public.reminder_source_query(p_type public.reminder_record_types, p_days_ahead INTEGER)
RETURNS TEXT
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_due   TEXT := format('((r.%I)::date + %s)', p_type.date_column, p_type.due_offset_days);
  v_owner TEXT;
BEGIN
  v_owner := CASE WHEN cardinality(p_type.owner_columns) = 0 THEN 'NULL::uuid'
                  ELSE 'COALESCE(' || (SELECT string_agg(format('r.%I::uuid', c), ', ') FROM unnest(p_type.owner_columns) AS c) || ')' END;
  RETURN format(
    'SELECT r.%I::uuid AS record_id, %s AS due_date, left(COALESCE(r.%I::text, %L), 200) AS title, %s AS project_id, '
    || '%s AS account_id, %s AS owner_id FROM %I.%I r WHERE r.%I IS NOT NULL AND (%s) AND %s BETWEEN CURRENT_DATE - %s AND CURRENT_DATE + %s',
    p_type.id_column, v_due, p_type.title_column, '',
    CASE WHEN p_type.project_column IS NULL THEN 'NULL::uuid' ELSE format('r.%I::uuid', p_type.project_column) END,
    CASE WHEN p_type.account_column IS NULL THEN 'NULL::uuid' ELSE format('r.%I::uuid', p_type.account_column) END,
    v_owner, p_type.schema_name, p_type.table_name, p_type.date_column,
    COALESCE(NULLIF(btrim(p_type.status_filter), ''), 'TRUE'),
    v_due, p_type.overdue_window_days + 2, GREATEST(p_days_ahead, 0) + 2);
END;
$$;

-- The job (catalogue code reminders.due_dates). Context: {"time_zones": [...]} from the tick; {"dry_run": true}
-- counts what would be sent without writing anything. A record type whose table or columns are wrong is
-- skipped and listed in the result, so one bad row never stops the others.
CREATE OR REPLACE FUNCTION public.run_due_reminders(p_context JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v_dry       BOOLEAN := COALESCE((p_context ->> 'dry_run')::BOOLEAN, FALSE);
  t           public.reminder_record_types;
  r           RECORD;
  v_sql       TEXT;
  v_ahead     INTEGER;
  v_msg       public.reminder_messages;
  v_account   UUID;
  v_tz        TEXT;
  v_today     DATE;
  v_lead      INTEGER;
  v_kind      TEXT;
  v_marker    UUID;
  v_users     UUID[];
  v_user      UUID;
  v_date      TEXT;
  v_title     TEXT;
  v_body      TEXT;
  v_type_cnt  INTEGER;
  v_sent      INTEGER := 0;
  v_due_cnt   INTEGER := 0;
  v_by_type   JSONB := '{}'::jsonb;
  v_skipped   JSONB := '[]'::jsonb;
BEGIN
  FOR t IN SELECT * FROM public.reminder_record_types WHERE is_active ORDER BY schema_name, sort_order, record_type LOOP
    v_type_cnt := 0;
    v_msg := (SELECT m FROM public.reminder_messages m WHERE m.message_key = t.message_key);
    IF t.schema_name = 'sim' THEN
      v_ahead := GREATEST(t.default_lead_days, COALESCE((SELECT max(s.lead_days) FROM sim.reminder_lead_time_settings s WHERE s.record_type = t.record_type), 0));
    ELSE
      v_ahead := GREATEST(t.default_lead_days, COALESCE((SELECT max(s.lead_days) FROM public.reminder_lead_time_settings s WHERE s.record_type = t.record_type), 0));
    END IF;
    BEGIN
      v_sql := public.reminder_source_query(t, v_ahead);
      EXECUTE v_sql || ' LIMIT 0';
    EXCEPTION WHEN OTHERS THEN
      v_skipped := v_skipped || jsonb_build_object('schema', t.schema_name, 'record_type', t.record_type, 'error', SQLERRM);
      CONTINUE;
    END;

    BEGIN
      FOR r IN EXECUTE v_sql LOOP
        v_account := COALESCE(r.account_id, public.bj_project_account(t.schema_name, r.project_id));
        CONTINUE WHEN v_account IS NULL;
        CONTINUE WHEN NOT public.bj_zone_due(p_context, public.bj_account_time_zone(v_account));
        CONTINUE WHEN NOT public.bj_account_allows_tables(v_account, COALESCE(t.planner_tables, ARRAY[t.table_name]));
        v_tz := public.bj_project_time_zone(t.schema_name, r.project_id, v_account);
        v_today := (NOW() AT TIME ZONE v_tz)::DATE;
        v_lead := public.reminder_lead_days(t.schema_name, v_account, t.record_type, t.default_lead_days);
        v_kind := public.reminder_kind(r.due_date, v_today, v_lead, t.overdue_window_days);
        CONTINUE WHEN v_kind IS NULL;
        v_due_cnt := v_due_cnt + 1;
        CONTINUE WHEN v_dry;

        v_marker := public.reminder_mark(t.schema_name, t.record_type, r.record_id, v_kind, r.due_date, v_account);
        CONTINUE WHEN v_marker IS NULL;   -- sent before (D6: once per kind)
        v_users := public.reminder_recipients(t.schema_name, t.recipient_rule, r.owner_id, t.owner_id_kind, r.project_id, v_account);
        PERFORM public.reminder_set_marker_recipients(t.schema_name, v_marker, v_users);

        v_date := public.bj_format_date(r.due_date, public.bj_account_date_format(v_account));
        v_title := public.reminder_render(CASE v_kind WHEN 'before' THEN v_msg.before_title ELSE v_msg.overdue_title END,
                                          r.title, v_date, r.due_date - v_today);
        v_body := public.reminder_render(CASE v_kind WHEN 'before' THEN v_msg.before_body ELSE v_msg.overdue_body END,
                                         r.title, v_date, r.due_date - v_today);
        IF t.schema_name = 'sim' THEN v_title := 'Practice: ' || v_title; END IF;   -- D8: practice items are marked

        FOREACH v_user IN ARRAY v_users LOOP
          PERFORM public.bj_notify(v_user, CASE v_kind WHEN 'overdue' THEN 'warning' ELSE 'info' END, 'reminder',
            v_title, v_body, regexp_replace(COALESCE(t.planner_tables[1], t.table_name), '^sim\.', ''), r.record_id,
            CASE WHEN t.schema_name = 'public' THEN r.project_id END,
            jsonb_build_object('schema', t.schema_name, 'practice', t.schema_name = 'sim', 'record_type', t.record_type,
                               'reminder_kind', v_kind, 'due_date', r.due_date, 'project_id', r.project_id));
          v_sent := v_sent + 1;
          v_type_cnt := v_type_cnt + 1;
        END LOOP;
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      v_skipped := v_skipped || jsonb_build_object('schema', t.schema_name, 'record_type', t.record_type, 'error', SQLERRM);
    END;
    v_by_type := v_by_type || jsonb_build_object(t.schema_name || '.' || t.record_type, v_type_cnt);
  END LOOP;

  RETURN jsonb_build_object('processed', v_sent, 'due_items', v_due_cnt, 'dry_run', v_dry,
                            'by_type', v_by_type, 'skipped_types', v_skipped);
END;
$$;

-- ── 6. Lead-time page RPCs (PMO Configuration, D7) ───────────────────────────
CREATE OR REPLACE FUNCTION public.reminder_lead_times_payload(p_schema TEXT, p_account_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v_items   JSONB;
  v_created TIMESTAMPTZ;
  v_updated TIMESTAMPTZ;
  v_cby     UUID;
  v_uby     UUID;
BEGIN
  IF p_schema = 'sim' THEN
    v_items := (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                   'record_type', t.record_type, 'label', t.label, 'description', t.description,
                   'default_lead_days', t.default_lead_days, 'lead_days', s.lead_days, 'updated_at', s.updated_at)
                 ORDER BY t.sort_order, t.label), '[]'::jsonb)
                  FROM public.reminder_record_types t
                  LEFT JOIN sim.reminder_lead_time_settings s ON s.account_id = p_account_id AND s.record_type = t.record_type
                 WHERE t.schema_name = 'sim' AND t.is_active);
    v_created := (SELECT min(s.created_at) FROM sim.reminder_lead_time_settings s WHERE s.account_id = p_account_id);
    v_updated := (SELECT max(s.updated_at) FROM sim.reminder_lead_time_settings s WHERE s.account_id = p_account_id);
    v_cby := (SELECT s.created_by FROM sim.reminder_lead_time_settings s WHERE s.account_id = p_account_id ORDER BY s.created_at LIMIT 1);
    v_uby := (SELECT s.updated_by FROM sim.reminder_lead_time_settings s WHERE s.account_id = p_account_id ORDER BY s.updated_at DESC LIMIT 1);
  ELSE
    v_items := (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                   'record_type', t.record_type, 'label', t.label, 'description', t.description,
                   'default_lead_days', t.default_lead_days, 'lead_days', s.lead_days, 'updated_at', s.updated_at)
                 ORDER BY t.sort_order, t.label), '[]'::jsonb)
                  FROM public.reminder_record_types t
                  LEFT JOIN public.reminder_lead_time_settings s ON s.account_id = p_account_id AND s.record_type = t.record_type
                 WHERE t.schema_name = 'public' AND t.is_active);
    v_created := (SELECT min(s.created_at) FROM public.reminder_lead_time_settings s WHERE s.account_id = p_account_id);
    v_updated := (SELECT max(s.updated_at) FROM public.reminder_lead_time_settings s WHERE s.account_id = p_account_id);
    v_cby := (SELECT s.created_by FROM public.reminder_lead_time_settings s WHERE s.account_id = p_account_id ORDER BY s.created_at LIMIT 1);
    v_uby := (SELECT s.updated_by FROM public.reminder_lead_time_settings s WHERE s.account_id = p_account_id ORDER BY s.updated_at DESC LIMIT 1);
  END IF;

  RETURN jsonb_build_object(
    'account_id', p_account_id,
    'account_name', (SELECT a.account_name FROM public.accounts a WHERE a.id = p_account_id),
    'account_code', (SELECT a.account_code FROM public.accounts a WHERE a.id = p_account_id),
    'items', v_items,
    'created_at', v_created,
    'updated_at', v_updated,
    'created_by_name', (SELECT COALESCE(u.display_name, u.full_name) FROM public.users u WHERE u.id = v_cby),
    'updated_by_name', (SELECT COALESCE(u.display_name, u.full_name) FROM public.users u WHERE u.id = v_uby));
END;
$$;

CREATE OR REPLACE FUNCTION public.reminder_lead_times_save_for(p_schema TEXT, p_items JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v_account UUID := public.auth_user_current_account_id();
  v_me      UUID := public.current_internal_user_id();
  v_item    JSONB;
  v_type    TEXT;
  v_days    INTEGER;
BEGIN
  IF v_account IS NULL THEN RAISE EXCEPTION 'Could not find your organisation'; END IF;
  IF NOT public.is_pmo_admin_or_owner_for_account(v_account) THEN
    RAISE EXCEPTION 'Only a PMO Admin or the account owner can change reminder lead times' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(COALESCE(p_items, '[]'::jsonb)) <> 'array' THEN RAISE EXCEPTION 'Items must be a list'; END IF;

  FOR v_item IN SELECT x FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) AS x LOOP
    v_type := v_item ->> 'record_type';
    IF NOT EXISTS (SELECT 1 FROM public.reminder_record_types t WHERE t.schema_name = p_schema AND t.record_type = v_type) THEN
      RAISE EXCEPTION 'Unknown reminder type: %', v_type;
    END IF;
    IF v_item -> 'lead_days' IS NULL OR jsonb_typeof(v_item -> 'lead_days') = 'null' THEN
      -- back to the system default
      IF p_schema = 'sim' THEN
        DELETE FROM sim.reminder_lead_time_settings WHERE account_id = v_account AND record_type = v_type;
      ELSE
        DELETE FROM public.reminder_lead_time_settings WHERE account_id = v_account AND record_type = v_type;
      END IF;
      CONTINUE;
    END IF;
    v_days := (v_item ->> 'lead_days')::NUMERIC::INTEGER;
    IF v_days < 0 OR v_days > 365 THEN RAISE EXCEPTION 'Lead time must be between 0 and 365 days'; END IF;
    IF p_schema = 'sim' THEN
      INSERT INTO sim.reminder_lead_time_settings (account_id, record_type, lead_days, created_by, updated_by)
      VALUES (v_account, v_type, v_days, v_me, v_me)
      ON CONFLICT (account_id, record_type) DO UPDATE SET lead_days = EXCLUDED.lead_days, updated_by = v_me, updated_at = NOW()
        WHERE sim.reminder_lead_time_settings.lead_days IS DISTINCT FROM EXCLUDED.lead_days;
    ELSE
      INSERT INTO public.reminder_lead_time_settings (account_id, record_type, lead_days, created_by, updated_by)
      VALUES (v_account, v_type, v_days, v_me, v_me)
      ON CONFLICT (account_id, record_type) DO UPDATE SET lead_days = EXCLUDED.lead_days, updated_by = v_me, updated_at = NOW()
        WHERE public.reminder_lead_time_settings.lead_days IS DISTINCT FROM EXCLUDED.lead_days;
    END IF;
  END LOOP;

  RETURN public.reminder_lead_times_payload(p_schema, v_account)
      || jsonb_build_object('can_manage', TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION public.reminder_lead_times_get()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_account UUID := public.auth_user_current_account_id();
BEGIN
  IF v_account IS NULL THEN RAISE EXCEPTION 'Could not find your organisation'; END IF;
  RETURN public.reminder_lead_times_payload('public', v_account)
      || jsonb_build_object('can_manage', public.is_pmo_admin_or_owner_for_account(v_account));
END;
$$;

CREATE OR REPLACE FUNCTION public.reminder_lead_times_save(p_items JSONB)
RETURNS JSONB
LANGUAGE sql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT public.reminder_lead_times_save_for('public', p_items);
$$;

CREATE OR REPLACE FUNCTION sim.reminder_lead_times_get()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v_account UUID := public.auth_user_current_account_id();
BEGIN
  IF v_account IS NULL THEN RAISE EXCEPTION 'Could not find your organisation'; END IF;
  RETURN public.reminder_lead_times_payload('sim', v_account)
      || jsonb_build_object('can_manage', public.is_pmo_admin_or_owner_for_account(v_account));
END;
$$;

CREATE OR REPLACE FUNCTION sim.reminder_lead_times_save(p_items JSONB)
RETURNS JSONB
LANGUAGE sql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
  SELECT public.reminder_lead_times_save_for('sim', p_items);
$$;

-- ── 7. Daily digest (2.2, D6) ────────────────────────────────────────────────
-- The "Reports & Digests" category in Notification Preferences is the digest switch: email off, or
-- frequency off, means no digest email for that app's items. In-app reminders always stay.
-- v1591: reads either notification_preferences column set (public has the v30 columns).
CREATE OR REPLACE FUNCTION public.notifications_digest_wanted(p_schema TEXT, p_auth_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v_user_id UUID;
  v_ids     TEXT[];
  v_pref    JSONB;
  v_email   BOOLEAN;
  v_freq    TEXT;
BEGIN
  IF p_auth_user_id IS NULL THEN RETURN FALSE; END IF;
  v_user_id := (SELECT us.id FROM public.users us WHERE us.auth_user_id = p_auth_user_id LIMIT 1);
  v_ids := ARRAY[p_auth_user_id::TEXT, COALESCE(v_user_id::TEXT, p_auth_user_id::TEXT)];

  IF p_schema = 'sim' THEN
    v_pref := (SELECT to_jsonb(p) FROM sim.notification_preferences p
                WHERE to_jsonb(p) ->> 'user_id' = ANY (v_ids)
                  AND COALESCE(to_jsonb(p) ->> 'event_category', to_jsonb(p) ->> 'preference_category',
                               to_jsonb(p) ->> 'preference_type') = 'reports'
                LIMIT 1);
  ELSE
    v_pref := (SELECT to_jsonb(p) FROM public.notification_preferences p
                WHERE to_jsonb(p) ->> 'user_id' = ANY (v_ids)
                  AND COALESCE(to_jsonb(p) ->> 'event_category', to_jsonb(p) ->> 'preference_category',
                               to_jsonb(p) ->> 'preference_type') = 'reports'
                LIMIT 1);
  END IF;

  IF v_pref IS NULL THEN RETURN TRUE; END IF;
  v_email := COALESCE((v_pref ->> 'channel_email')::BOOLEAN, (v_pref ->> 'email_enabled')::BOOLEAN, TRUE);
  v_freq  := COALESCE(v_pref ->> 'frequency', v_pref ->> 'digest_frequency', 'daily_digest');
  RETURN v_email AND v_freq NOT IN ('off', 'never');
END;
$$;

-- The job (catalogue code notifications.daily_digest): one queue item per person per local day with the
-- unread notices of the last 24 hours not yet emailed. The digest_send handler sends it and marks them.
CREATE OR REPLACE FUNCTION public.run_daily_digest(p_context JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v_dry     BOOLEAN := COALESCE((p_context ->> 'dry_run')::BOOLEAN, FALSE);
  v_max     INTEGER := 100;
  u         RECORD;
  v_account UUID;
  v_tz      TEXT;
  v_local   DATE;
  v_pub     BOOLEAN;
  v_sim     BOOLEAN;
  v_items   JSONB;
  v_ids     UUID[];
  v_queued  INTEGER := 0;
BEGIN
  FOR u IN
    SELECT us.id, us.auth_user_id, us.email, COALESCE(us.display_name, us.full_name) AS name
      FROM public.users us
     WHERE COALESCE(us.is_active, TRUE) AND NOT COALESCE(us.is_deleted, FALSE)
       AND COALESCE(us.email_notifications_enabled, TRUE) AND COALESCE(btrim(us.email), '') <> ''
       AND EXISTS (SELECT 1 FROM public.notifications n
                    WHERE n.user_id = us.id AND n.created_at >= (NOW() - INTERVAL '24 hours')
                      AND NOT COALESCE(n.is_deleted, FALSE) AND NOT COALESCE(n.is_read, FALSE)
                      AND NOT COALESCE(n.email_sent, FALSE))
  LOOP
    v_account := public.bj_user_account(u.id);
    v_tz := public.bj_account_time_zone(v_account);
    CONTINUE WHEN NOT public.bj_zone_due(p_context, v_tz);
    v_local := (NOW() AT TIME ZONE v_tz)::DATE;
    v_pub := public.notifications_digest_wanted('public', u.auth_user_id);
    v_sim := public.notifications_digest_wanted('sim', u.auth_user_id);
    CONTINUE WHEN NOT (v_pub OR v_sim);

    v_ids := ARRAY(
      SELECT n.id FROM public.notifications n
       WHERE n.user_id = u.id AND n.created_at >= (NOW() - INTERVAL '24 hours')
         AND NOT COALESCE(n.is_deleted, FALSE) AND NOT COALESCE(n.is_read, FALSE) AND NOT COALESCE(n.email_sent, FALSE)
         AND CASE WHEN COALESCE(n.notification_data ->> 'schema', 'public') = 'sim' THEN v_sim ELSE v_pub END
       ORDER BY n.created_at
       LIMIT v_max);
    CONTINUE WHEN cardinality(v_ids) = 0;

    v_items := (SELECT jsonb_agg(jsonb_build_object(
                   'id', n.id, 'title', n.title, 'message', n.message,
                   'practice', COALESCE(n.notification_data ->> 'schema', 'public') = 'sim',
                   'kind', n.notification_type, 'category', n.notification_category) ORDER BY n.created_at)
                  FROM public.notifications n WHERE n.id = ANY(v_ids));

    IF NOT v_dry THEN
      PERFORM public.enqueue_background_job('notifications.digest_send',
        jsonb_build_object('user_id', u.id, 'to', u.email, 'name', u.name, 'local_date', v_local,
                           'date_label', public.bj_format_date(v_local, public.bj_account_date_format(v_account)),
                           'items', v_items, 'notification_ids', to_jsonb(v_ids)),
        NULL, 'digest:' || u.id::TEXT || ':' || v_local::TEXT, v_account);
    END IF;
    v_queued := v_queued + 1;
  END LOOP;

  IF v_queued > 0 AND NOT v_dry THEN PERFORM public.background_job_wake_worker(); END IF;
  RETURN jsonb_build_object('processed', v_queued, 'dry_run', v_dry);
END;
$$;

-- Called by the digest_send handler after the email went out (service role only).
CREATE OR REPLACE FUNCTION public.notifications_digest_mark_sent(p_user_id UUID, p_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.notifications
     SET email_sent = TRUE, email_sent_at = NOW()
   WHERE user_id = p_user_id AND id = ANY(COALESCE(p_ids, ARRAY[]::UUID[]));
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ── 8. Grants ────────────────────────────────────────────────────────────────
DO $$
DECLARE
  fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.bj_account_time_zone(uuid)', 'public.bj_account_date_format(uuid)', 'public.bj_user_account(uuid)',
    'public.bj_user_from_auth(uuid)', 'public.bj_project_account(text,uuid)', 'public.bj_project_time_zone(text,uuid,uuid)',
    'public.bj_account_allows_tables(uuid,text[])', 'public.bj_notify(uuid,text,text,text,text,text,uuid,uuid,jsonb)',
    'public.bj_project_role_users(text,uuid,text)', 'public.bj_account_admin_users(uuid)',
    'public.reminder_lead_days(text,uuid,text,integer)', 'public.reminder_mark(text,text,uuid,text,date,uuid,uuid[])',
    'public.reminder_set_marker_recipients(text,uuid,uuid[])', 'public.reminder_recipients(text,text,uuid,text,uuid,uuid)',
    'public.run_due_reminders(jsonb)', 'public.reminder_lead_times_payload(text,uuid)',
    'public.reminder_lead_times_save_for(text,jsonb)', 'public.notifications_digest_wanted(text,uuid)',
    'public.run_daily_digest(jsonb)', 'public.notifications_digest_mark_sent(uuid,uuid[])'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.notifications_digest_mark_sent(UUID, UUID[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.reminder_lead_times_get() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reminder_lead_times_save(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION sim.reminder_lead_times_get() TO authenticated;
GRANT EXECUTE ON FUNCTION sim.reminder_lead_times_save(JSONB) TO authenticated;

-- ── 9. Catalogue rows (rule 80) ──────────────────────────────────────────────
SELECT public.background_job_register(
  p_code => 'reminders.due_dates',
  p_name => 'Due-date reminders',
  p_kind => 'sql',
  p_description => 'In-app reminders before and after the dates of the record types in reminder_record_types (both apps), once per item and kind.',
  p_owner_system => 'platform',
  p_sql_function => 'public.run_due_reminders',
  p_cron => '0 6 * * *',
  p_time_basis => 'organisation',
  p_timeout_seconds => 900
);
SELECT public.background_job_register(
  p_code => 'notifications.daily_digest',
  p_name => 'Daily email digest',
  p_kind => 'sql',
  p_description => 'Queues one email per person per day with the day’s unread reminders and notices (Simulator items marked as practice).',
  p_owner_system => 'platform',
  p_sql_function => 'public.run_daily_digest',
  p_cron => '0 7 * * *',
  p_time_basis => 'organisation',
  p_timeout_seconds => 600
);
SELECT public.background_job_register(
  p_code => 'notifications.digest_send',
  p_name => 'Daily digest email',
  p_kind => 'handler',
  p_description => 'Sends one queued daily digest email through send-email and marks its notices as emailed.',
  p_owner_system => 'platform',
  p_timeout_seconds => 300,
  p_max_attempts => 5,
  p_item_ttl_seconds => 86400,
  p_batch_size => 100,
  p_per_org_batch_cap => 50
);

-- ── 10. Table registry (Database Table Registration Rule) ────────────────────
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('reminder_record_types', 'Record types the due-date reminder job reads: table, date column, filter, recipients, default lead time (v1352 A1)', true, true),
  ('reminder_messages', 'Reminder texts per message key, before and overdue (v1352)', true, true),
  ('reminder_lead_time_settings', 'Organisation overrides of reminder lead times per record type (v1352 D7)', false, true),
  ('sim.reminder_lead_time_settings', 'Simulator organisation overrides of reminder lead times per record type (v1352 D7)', false, true),
  ('reminder_markers', 'Reminders already sent: one before and one overdue per item and due date (v1352 D6)', true, true),
  ('sim.reminder_markers', 'Simulator reminders already sent: one before and one overdue per item and due date (v1352 D6)', true, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

NOTIFY pgrst, 'reload schema';

-- Check: every record type builds and runs (dry run writes nothing). Expect skipped_types = [].
SELECT public.run_due_reminders('{"dry_run": true}'::jsonb) AS reminders_dry_run;

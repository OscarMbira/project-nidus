-- =============================================================================
-- v963u_sim_timesheet_report_integration_tables.sql
-- v963 PMIS Core Gap Closure — Phases 19/20/21 Simulator-schema mirrors
--
-- Phase 19 (GAP-13 Timesheet Approvals, period-level): sim.timesheets,
--   sim.timesheet_approvals, sim.timesheet_approval_settings — mirrors
--   public.* from v644_pmis_gap_tables_tier2.sql. sim.timesheet_entries
--   already exists (v628e_timesheets.sql); this adds the timesheet_id FK.
-- Phase 20 (GAP-23 Scheduled Health Reports): sim.scheduled_health_reports,
--   sim.scheduled_report_runs — mirrors public.* from v645_pmis_gap_tables_tier3.sql.
-- Phase 21 (GAP-25 Integrations Marketplace): sim.integration_catalog,
--   sim.integration_connections — mirrors public.* from v645_pmis_gap_tables_tier3.sql.
--
-- Follows the existing sim-schema convention in this codebase (see
-- v628e_timesheets.sql sim.timesheet_entries): no FK constraints to
-- public.projects/auth.users (sim data is self-contained and practice-scoped),
-- permissive RLS (`auth.uid() IS NOT NULL`), plain uuid columns.
-- Prerequisites: sim schema exists, sim.timesheet_entries (v628e).
-- No seed data.
-- =============================================================================

-- ── Phase 19: Timesheet Approvals (period-level) ────────────────────────────

CREATE TABLE IF NOT EXISTS sim.timesheets (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid        NOT NULL,
  user_id           uuid        NOT NULL,
  week_start_date   date        NOT NULL,
  week_end_date     date        NOT NULL,
  approval_status   text        NOT NULL DEFAULT 'draft'
                    CHECK (approval_status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected')),
  total_hours       numeric(8,2) NOT NULL DEFAULT 0,
  submitted_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  is_deleted        boolean     NOT NULL DEFAULT false,
  CONSTRAINT uq_sim_timesheets_period UNIQUE (project_id, user_id, week_start_date),
  CONSTRAINT chk_sim_timesheets_week CHECK (week_end_date >= week_start_date)
);

ALTER TABLE sim.timesheet_entries
  ADD COLUMN IF NOT EXISTS timesheet_id uuid REFERENCES sim.timesheets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sim_timesheet_entries_timesheet
  ON sim.timesheet_entries (timesheet_id) WHERE timesheet_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS sim.timesheet_approval_settings (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        uuid,
  project_id        uuid,
  approver_role     text        NOT NULL DEFAULT 'project_manager',
  escalation_days   integer     NOT NULL DEFAULT 3,
  auto_approve      boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  is_deleted        boolean     NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS sim.timesheet_approvals (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id      uuid        NOT NULL REFERENCES sim.timesheets(id) ON DELETE CASCADE,
  approver_user_id  uuid        NOT NULL,
  approval_status   text        NOT NULL CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approval_comment  text,
  decided_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sim_timesheets_project ON sim.timesheets(project_id);
CREATE INDEX IF NOT EXISTS idx_sim_timesheets_user ON sim.timesheets(user_id);
CREATE INDEX IF NOT EXISTS idx_sim_timesheet_approvals_timesheet ON sim.timesheet_approvals(timesheet_id);

-- ── Phase 20: Scheduled Health Reports ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS sim.scheduled_health_reports (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid        NOT NULL,
  schedule_name     text        NOT NULL,
  frequency         text        NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly')),
  schedule_config   jsonb       NOT NULL DEFAULT '{}'::jsonb,
  recipient_emails  text[]      NOT NULL DEFAULT '{}',
  report_template_id uuid,
  is_active         boolean     NOT NULL DEFAULT true,
  next_run_at       timestamptz,
  created_by        uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  is_deleted        boolean     NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS sim.scheduled_report_runs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id       uuid        NOT NULL REFERENCES sim.scheduled_health_reports(id) ON DELETE CASCADE,
  run_status        text        NOT NULL DEFAULT 'pending'
                    CHECK (run_status IN ('pending', 'running', 'completed', 'failed')),
  report_data       jsonb,
  sent_at           timestamptz,
  error_message     text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sim_scheduled_health_reports_project ON sim.scheduled_health_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_sim_scheduled_report_runs_schedule ON sim.scheduled_report_runs(schedule_id);

-- ── Phase 21: Integrations Marketplace ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS sim.integration_catalog (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_code  text        NOT NULL,
  integration_name  text        NOT NULL,
  category          text        NOT NULL,
  description       text,
  logo_url          text,
  is_available      boolean     NOT NULL DEFAULT true,
  is_coming_soon    boolean     NOT NULL DEFAULT false,
  setup_guide_url   text,
  sort_order        integer     NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_sim_integration_catalog_code UNIQUE (integration_code)
);

CREATE TABLE IF NOT EXISTS sim.integration_connections (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id            uuid        NOT NULL,
  integration_id        uuid        NOT NULL REFERENCES sim.integration_catalog(id) ON DELETE CASCADE,
  connected_by          uuid,
  connection_status     text        NOT NULL DEFAULT 'connected'
                        CHECK (connection_status IN ('connected', 'disconnected', 'error')),
  credentials_encrypted jsonb,
  event_mapping         jsonb       NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at          timestamptz,
  sync_error            text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  is_deleted            boolean     NOT NULL DEFAULT false,
  CONSTRAINT uq_sim_integration_connections UNIQUE (account_id, integration_id)
);

CREATE INDEX IF NOT EXISTS idx_sim_integration_connections_account ON sim.integration_connections(account_id);

-- ── Triggers (updated_at) ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sim.set_pmis_gap_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'timesheets', 'timesheet_approval_settings', 'timesheet_approvals',
    'scheduled_health_reports', 'scheduled_report_runs',
    'integration_catalog', 'integration_connections'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON sim.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON sim.%I FOR EACH ROW EXECUTE FUNCTION sim.set_pmis_gap_updated_at()', t, t);
  END LOOP;
END $$;

-- ── RLS (sim-schema convention: permissive, any authenticated user) ─────────

ALTER TABLE sim.timesheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sim_timesheets_all" ON sim.timesheets FOR ALL USING (auth.uid() IS NOT NULL);

ALTER TABLE sim.timesheet_approval_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sim_timesheet_approval_settings_all" ON sim.timesheet_approval_settings FOR ALL USING (auth.uid() IS NOT NULL);

ALTER TABLE sim.timesheet_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sim_timesheet_approvals_all" ON sim.timesheet_approvals FOR ALL USING (auth.uid() IS NOT NULL);

ALTER TABLE sim.scheduled_health_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sim_scheduled_health_reports_all" ON sim.scheduled_health_reports FOR ALL USING (auth.uid() IS NOT NULL);

ALTER TABLE sim.scheduled_report_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sim_scheduled_report_runs_all" ON sim.scheduled_report_runs FOR ALL USING (auth.uid() IS NOT NULL);

ALTER TABLE sim.integration_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sim_integration_catalog_select" ON sim.integration_catalog FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "sim_integration_catalog_write" ON sim.integration_catalog FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "sim_integration_catalog_update" ON sim.integration_catalog FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "sim_integration_catalog_delete" ON sim.integration_catalog FOR DELETE USING (auth.uid() IS NOT NULL);

ALTER TABLE sim.integration_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sim_integration_connections_all" ON sim.integration_connections FOR ALL USING (auth.uid() IS NOT NULL);

-- ── Register in database_tables ───────────────────────────────────────────────

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.timesheets', 'Simulator weekly timesheet submission periods (GAP-13)', false, true),
  ('sim.timesheet_approval_settings', 'Simulator timesheet approval chain config (GAP-13)', false, true),
  ('sim.timesheet_approvals', 'Simulator timesheet approval decisions (GAP-13)', false, true),
  ('sim.scheduled_health_reports', 'Simulator scheduled project-health report configs (GAP-23)', false, true),
  ('sim.scheduled_report_runs', 'Simulator execution log for scheduled health reports (GAP-23)', false, true),
  ('sim.integration_catalog', 'Simulator integrations marketplace catalog (GAP-25)', false, true),
  ('sim.integration_connections', 'Simulator active integration connections per account (GAP-25)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v963u_sim_timesheet_report_integration_tables.sql completed'; END $$;

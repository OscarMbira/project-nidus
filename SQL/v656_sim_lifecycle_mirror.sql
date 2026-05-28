-- v656: Simulator lifecycle mirror (sim schema)
-- Mirrors v651 infrastructure + Category A/B helpers for practice tables.
-- @see projectplan/v639_Record_Lifecycle_Management_Plan.md

CREATE OR REPLACE FUNCTION sim.set_lifecycle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS sim.record_lifecycle_config (
  LIKE public.record_lifecycle_config INCLUDING ALL
);

CREATE TABLE IF NOT EXISTS sim.record_archive_config (
  LIKE public.record_archive_config INCLUDING ALL
);

CREATE TABLE IF NOT EXISTS sim.record_authorisers (
  LIKE public.record_authorisers INCLUDING ALL
);

CREATE TABLE IF NOT EXISTS sim.record_authorisation_requests (
  LIKE public.record_authorisation_requests INCLUDING ALL
);

CREATE TABLE IF NOT EXISTS sim.record_lifecycle_logs (
  LIKE public.record_lifecycle_logs INCLUDING ALL
);

ALTER TABLE sim.record_lifecycle_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.record_archive_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.record_authorisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.record_authorisation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.record_lifecycle_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_sim_lifecycle_config ON sim.record_lifecycle_config;
CREATE POLICY policy_sim_lifecycle_config ON sim.record_lifecycle_config
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS policy_sim_archive_config ON sim.record_archive_config;
CREATE POLICY policy_sim_archive_config ON sim.record_archive_config
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS policy_sim_authorisers ON sim.record_authorisers;
CREATE POLICY policy_sim_authorisers ON sim.record_authorisers
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS policy_sim_auth_requests ON sim.record_authorisation_requests;
CREATE POLICY policy_sim_auth_requests ON sim.record_authorisation_requests
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS policy_sim_lifecycle_logs ON sim.record_lifecycle_logs;
CREATE POLICY policy_sim_lifecycle_logs ON sim.record_lifecycle_logs
  FOR SELECT TO authenticated USING (TRUE);

CREATE OR REPLACE FUNCTION sim.ensure_lifecycle_live_columns(p_table regclass)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  tname text := p_table::text;
BEGIN
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS record_status VARCHAR(30) DEFAULT ''live''', p_table);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS root_record_id UUID', p_table);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS record_version INTEGER DEFAULT 1', p_table);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS parent_record_id UUID', p_table);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS moved_to_history_at TIMESTAMPTZ', p_table);
  EXECUTE format('UPDATE %s SET root_record_id = id WHERE root_record_id IS NULL', p_table);
  EXECUTE format('UPDATE %s SET record_status = ''live'' WHERE record_status IS NULL', p_table);
END;
$$;

CREATE OR REPLACE FUNCTION sim.ensure_lifecycle_category_a(p_base text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  live regclass := to_regclass('sim.' || p_base);
  hist text := p_base || '_history';
  arch text := p_base || '_archive';
  allv text := p_base || '_all';
BEGIN
  IF live IS NULL THEN RETURN; END IF;
  PERFORM sim.ensure_lifecycle_live_columns(live);
  EXECUTE format('CREATE TABLE IF NOT EXISTS sim.%I (LIKE sim.%I INCLUDING ALL)', hist, p_base);
  EXECUTE format('CREATE TABLE IF NOT EXISTS sim.%I (LIKE sim.%I INCLUDING ALL)', arch, p_base);
  EXECUTE format('ALTER TABLE sim.%I ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ', p_base);
  EXECUTE format('ALTER TABLE sim.%I ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.users(id)', p_base);
  EXECUTE format('ALTER TABLE sim.%I ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ', hist);
  EXECUTE format('ALTER TABLE sim.%I ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.users(id)', hist);
  EXECUTE format('ALTER TABLE sim.%I ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ', arch);
  EXECUTE format('ALTER TABLE sim.%I ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.users(id)', arch);
  EXECUTE format('DROP VIEW IF EXISTS sim.%I CASCADE', allv);
  EXECUTE format($v$
    CREATE VIEW sim.%I AS
      SELECT * FROM sim.%I
      UNION ALL
      SELECT * FROM sim.%I
      UNION ALL
      SELECT * FROM sim.%I
  $v$, allv, p_base, hist, arch);
END;
$$;

SELECT sim.ensure_lifecycle_category_a('practice_risks');
SELECT sim.ensure_lifecycle_category_a('practice_issues');
SELECT sim.ensure_lifecycle_category_a('practice_tasks');
SELECT sim.ensure_lifecycle_category_a('practice_defects');

CREATE OR REPLACE FUNCTION sim.ensure_lifecycle_category_b(p_table text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE live regclass := to_regclass('sim.' || p_table);
BEGIN
  IF live IS NULL THEN RETURN; END IF;
  PERFORM sim.ensure_lifecycle_live_columns(live);
END;
$$;

SELECT sim.ensure_lifecycle_category_b('practice_business_cases');
SELECT sim.ensure_lifecycle_category_b('practice_stage_plans');
SELECT sim.ensure_lifecycle_category_b('project_decisions');
SELECT sim.ensure_lifecycle_category_b('practice_highlight_reports');
SELECT sim.ensure_lifecycle_category_b('practice_exception_reports');
SELECT sim.ensure_lifecycle_category_b('practice_end_stage_reports');
SELECT sim.ensure_lifecycle_category_b('practice_lessons_reports');
SELECT sim.ensure_lifecycle_category_b('practice_project_initiation_documents');
SELECT sim.ensure_lifecycle_category_b('practice_benefits_review_plans');

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.record_lifecycle_config', 'Simulator lifecycle config', false, true),
  ('sim.record_archive_config', 'Simulator archive overrides', false, true),
  ('sim.record_authorisers', 'Simulator authoriser chains', false, true),
  ('sim.record_authorisation_requests', 'Simulator authorisation requests', false, true),
  ('sim.record_lifecycle_logs', 'Simulator lifecycle transition logs', true, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v656_sim_lifecycle_mirror.sql completed'; END $$;

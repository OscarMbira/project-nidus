-- v494 — Testing Centre: runs, results, evidence (public + sim)
-- Supabase Storage bucket `testing-centre-evidence` must be created in dashboard (private).

-- -----------------------------------------------------------------------------
-- Public: runs
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tc_test_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_code VARCHAR(64) NOT NULL,
    suite_id UUID REFERENCES public.tc_test_suites(id) ON DELETE SET NULL,
    tc_test_case_id UUID REFERENCES public.tc_test_cases(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    environment_id UUID REFERENCES public.tc_test_environments(id) ON DELETE SET NULL,
    triggered_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    trigger_type VARCHAR(64) NOT NULL DEFAULT 'manual',
    run_status VARCHAR(40) NOT NULL DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    duration_ms INTEGER,
    total_tests INTEGER DEFAULT 0,
    passed_tests INTEGER DEFAULT 0,
    failed_tests INTEGER DEFAULT 0,
    skipped_tests INTEGER DEFAULT 0,
    blocked_tests INTEGER DEFAULT 0,
    auto_defects_created INTEGER NOT NULL DEFAULT 0,
    summary TEXT,
    error_summary TEXT,
    recommended_next_action TEXT,
    ai_fix_prompt_generated BOOLEAN NOT NULL DEFAULT FALSE,
    ai_fix_prompt_file_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tc_test_runs_code UNIQUE (run_code)
);

CREATE TABLE IF NOT EXISTS public.tc_test_run_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tc_test_run_id UUID NOT NULL REFERENCES public.tc_test_runs(id) ON DELETE CASCADE,
    tc_test_case_id UUID NOT NULL REFERENCES public.tc_test_cases(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL,
    actual_result TEXT,
    expected_result TEXT,
    failure_reason TEXT,
    failure_classification VARCHAR(64),
    assertion_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    logs JSONB,
    screenshot_ids UUID[],
    trace_file_id UUID,
    video_file_id UUID,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    duration_ms INTEGER,
    executed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tc_evidence_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tc_test_run_id UUID REFERENCES public.tc_test_runs(id) ON DELETE CASCADE,
    tc_test_run_result_id UUID REFERENCES public.tc_test_run_results(id) ON DELETE SET NULL,
    tc_test_case_id UUID REFERENCES public.tc_test_cases(id) ON DELETE SET NULL,
    file_type VARCHAR(64) NOT NULL,
    storage_bucket TEXT NOT NULL DEFAULT 'testing-centre-evidence',
    storage_path TEXT NOT NULL,
    file_name TEXT,
    mime_type TEXT,
    file_size BIGINT,
    description TEXT,
    captured_step_no INTEGER,
    comparison_status TEXT,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_test_runs_started ON public.tc_test_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_tc_run_results_run ON public.tc_test_run_results(tc_test_run_id);

-- run_code: RUN-YYYYMMDD-NNNN
CREATE OR REPLACE FUNCTION public.tc_test_runs_set_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  seqn int;
  d text := to_char((NEW.created_at AT TIME ZONE 'UTC'), 'YYYYMMDD');
BEGIN
  IF NEW.run_code IS NULL OR NEW.run_code = '' THEN
    SELECT COALESCE(MAX(
      CASE
        WHEN run_code ~ ('^RUN-' || d || '-[0-9]{4}$')
        THEN (substring(run_code from '[0-9]{4}$'))::int
        ELSE 0
      END
    ), 0) + 1 INTO seqn
    FROM public.tc_test_runs
    WHERE run_code LIKE 'RUN-' || d || '-%';
    NEW.run_code := 'RUN-' || d || '-' || lpad(seqn::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_tc_test_runs_code ON public.tc_test_runs;
CREATE TRIGGER trg_tc_test_runs_code
  BEFORE INSERT ON public.tc_test_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.tc_test_runs_set_code();

CREATE OR REPLACE FUNCTION public.get_tc_run_dashboard_metrics(
  p_env_id uuid,
  p_days int DEFAULT 30
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.app_user_has_testing_centre_permission('testing_centre.view') THEN
    RAISE EXCEPTION 'insufficient permission';
  END IF;
  RETURN jsonb_build_object(
    'runs_last_days', (SELECT count(*)::int FROM tc_test_runs r WHERE r.started_at >= now() - (p_days || ' days')::interval
      AND (p_env_id IS NULL OR r.environment_id = p_env_id)),
    'passed', (SELECT coalesce(sum(passed_tests),0)::int FROM tc_test_runs r WHERE r.started_at >= now() - (p_days || ' days')::interval
      AND (p_env_id IS NULL OR r.environment_id = p_env_id)),
    'failed', (SELECT coalesce(sum(failed_tests),0)::int FROM tc_test_runs r WHERE r.started_at >= now() - (p_days || ' days')::interval
      AND (p_env_id IS NULL OR r.environment_id = p_env_id))
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_tc_run_dashboard_metrics(uuid, int) TO authenticated;

-- RLS
ALTER TABLE public.tc_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tc_test_run_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tc_evidence_files ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.tc_test_runs, public.tc_test_run_results, public.tc_evidence_files TO authenticated;

DROP POLICY IF EXISTS tc_runs_all ON public.tc_test_runs;
CREATE POLICY tc_runs_s ON public.tc_test_runs FOR SELECT TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.view'));
CREATE POLICY tc_runs_i ON public.tc_test_runs FOR INSERT TO authenticated
  WITH CHECK (public.app_user_has_testing_centre_permission('testing_centre.run'));
CREATE POLICY tc_runs_u ON public.tc_test_runs FOR UPDATE TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.run'));
CREATE POLICY tc_runs_d ON public.tc_test_runs FOR DELETE TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.delete'));

DROP POLICY IF EXISTS tc_res_s ON public.tc_test_run_results;
CREATE POLICY tc_res_s ON public.tc_test_run_results FOR SELECT TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.view'));
CREATE POLICY tc_res_w ON public.tc_test_run_results FOR ALL TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.run'))
  WITH CHECK (public.app_user_has_testing_centre_permission('testing_centre.run'));

DROP POLICY IF EXISTS tc_evi_s ON public.tc_evidence_files;
CREATE POLICY tc_evi_s ON public.tc_evidence_files FOR SELECT TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.view'));
CREATE POLICY tc_evi_w ON public.tc_evidence_files FOR ALL TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.run') OR public.app_user_has_testing_centre_permission('testing_centre.configure'))
  WITH CHECK (true);

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active) VALUES
  ('tc_test_runs', 'Testing Centre: test run executions', false, true),
  ('tc_test_run_results', 'Testing Centre: per-case results', false, true),
  ('tc_evidence_files', 'Testing Centre: screenshots, logs, AI prompts', false, true)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, is_active = true;

-- -----------------------------------------------------------------------------
-- sim schema
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sim.tc_test_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_code VARCHAR(64) NOT NULL,
    suite_id UUID REFERENCES sim.tc_test_suites(id) ON DELETE SET NULL,
    tc_test_case_id UUID REFERENCES sim.tc_test_cases(id) ON DELETE SET NULL,
    practice_project_id UUID REFERENCES sim.practice_projects(id) ON DELETE SET NULL,
    environment_id UUID REFERENCES sim.tc_test_environments(id) ON DELETE SET NULL,
    triggered_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    trigger_type VARCHAR(64) NOT NULL DEFAULT 'manual',
    run_status VARCHAR(40) NOT NULL DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    duration_ms INTEGER,
    total_tests INTEGER DEFAULT 0,
    passed_tests INTEGER DEFAULT 0,
    failed_tests INTEGER DEFAULT 0,
    skipped_tests INTEGER DEFAULT 0,
    blocked_tests INTEGER DEFAULT 0,
    auto_defects_created INTEGER NOT NULL DEFAULT 0,
    summary TEXT,
    error_summary TEXT,
    recommended_next_action TEXT,
    ai_fix_prompt_generated BOOLEAN NOT NULL DEFAULT FALSE,
    ai_fix_prompt_file_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sim_tc_test_runs_code UNIQUE (run_code)
);
CREATE TABLE IF NOT EXISTS sim.tc_test_run_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tc_test_run_id UUID NOT NULL REFERENCES sim.tc_test_runs(id) ON DELETE CASCADE,
    tc_test_case_id UUID NOT NULL REFERENCES sim.tc_test_cases(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL,
    actual_result TEXT,
    expected_result TEXT,
    failure_reason TEXT,
    failure_classification VARCHAR(64),
    assertion_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    logs JSONB,
    screenshot_ids UUID[],
    trace_file_id UUID,
    video_file_id UUID,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    duration_ms INTEGER,
    executed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS sim.tc_evidence_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tc_test_run_id UUID REFERENCES sim.tc_test_runs(id) ON DELETE CASCADE,
    tc_test_run_result_id UUID,
    tc_test_case_id UUID REFERENCES sim.tc_test_cases(id) ON DELETE SET NULL,
    file_type VARCHAR(64) NOT NULL,
    storage_bucket TEXT NOT NULL DEFAULT 'testing-centre-evidence',
    storage_path TEXT NOT NULL,
    file_name TEXT,
    mime_type TEXT,
    file_size BIGINT,
    description TEXT,
    captured_step_no INTEGER,
    comparison_status TEXT,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sim_tc_evi_res') THEN
    ALTER TABLE sim.tc_evidence_files
      ADD CONSTRAINT fk_sim_tc_evi_res FOREIGN KEY (tc_test_run_result_id) REFERENCES sim.tc_test_run_results(id) ON DELETE SET NULL;
  END IF;
END $$;
ALTER TABLE sim.tc_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.tc_test_run_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.tc_evidence_files ENABLE ROW LEVEL SECURITY;
GRANT ALL ON sim.tc_test_runs, sim.tc_test_run_results, sim.tc_evidence_files TO authenticated;
CREATE POLICY s_tc_runs_s ON sim.tc_test_runs FOR SELECT TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.view'));
CREATE POLICY s_tc_runs_w ON sim.tc_test_runs FOR ALL TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.run'));
CREATE POLICY s_tc_res_s ON sim.tc_test_run_results FOR SELECT TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.view'));
CREATE POLICY s_tc_res_w ON sim.tc_test_run_results FOR ALL TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.run'));
CREATE POLICY s_tc_evi_s ON sim.tc_evidence_files FOR SELECT TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.view'));
CREATE POLICY s_tc_evi_w ON public.tc_evidence_files FOR ALL TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.run') OR public.app_user_has_testing_centre_permission('testing_centre.configure'));

-- sim run_code trigger
CREATE OR REPLACE FUNCTION sim.tc_test_runs_set_code() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE seqn int; d text := to_char((NEW.created_at AT TIME ZONE 'UTC'), 'YYYYMMDD');
BEGIN
  IF NEW.run_code IS NULL OR NEW.run_code = '' THEN
    SELECT COALESCE(MAX( CASE WHEN run_code ~ ('^RUN-' || d || '-[0-9]{4}$') THEN (substring(run_code from '[0-9]{4}$'))::int ELSE 0 END ), 0) + 1 INTO seqn
    FROM sim.tc_test_runs WHERE run_code LIKE 'RUN-' || d || '-%';
    NEW.run_code := 'RUN-' || d || '-' || lpad(seqn::text, 4, '0');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_sim_tc_runs_code ON sim.tc_test_runs;
CREATE TRIGGER trg_sim_tc_runs_code BEFORE INSERT ON sim.tc_test_runs FOR EACH ROW EXECUTE FUNCTION sim.tc_test_runs_set_code();

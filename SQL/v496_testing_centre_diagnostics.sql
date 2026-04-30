-- v496 — Diagnostic sessions + link defects to Testing Centre runs (public + sim)

-- public diagnostic sessions
CREATE TABLE IF NOT EXISTS public.tc_diagnostic_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_code VARCHAR(64) NOT NULL,
    title TEXT NOT NULL,
    reported_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    affected_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    affected_role TEXT,
    affected_module_id UUID REFERENCES public.tc_test_modules(id) ON DELETE SET NULL,
    issue_description TEXT,
    reproduction_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    uploaded_screenshot_ids UUID[],
    environment_id UUID REFERENCES public.tc_test_environments(id) ON DELETE SET NULL,
    diagnosis_status VARCHAR(40) NOT NULL DEFAULT 'open',
    probable_root_cause TEXT,
    recommended_fix TEXT,
    generated_cursor_prompt TEXT,
    linked_defect_id UUID REFERENCES public.defects(id) ON DELETE SET NULL,
    linked_tc_test_run_id UUID REFERENCES public.tc_test_runs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tc_diagnostic_code UNIQUE (session_code)
);

CREATE OR REPLACE FUNCTION public.tc_diagnostic_sessions_set_code() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE seqn int; d text := to_char((COALESCE(NEW.created_at, now()) AT TIME ZONE 'UTC'), 'YYYYMMDD');
BEGIN
  IF NEW.session_code IS NULL OR NEW.session_code = '' THEN
    SELECT COALESCE(MAX( CASE WHEN session_code ~ ('^DIAG-' || d || '-[0-9]{4}$') THEN (substring(session_code from '[0-9]{4}$'))::int ELSE 0 END ), 0) + 1 INTO seqn
    FROM public.tc_diagnostic_sessions WHERE session_code LIKE 'DIAG-' || d || '-%';
    NEW.session_code := 'DIAG-' || d || '-' || lpad(seqn::text, 4, '0');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_tc_diag_code ON public.tc_diagnostic_sessions;
CREATE TRIGGER trg_tc_diag_code BEFORE INSERT ON public.tc_diagnostic_sessions FOR EACH ROW
  EXECUTE FUNCTION public.tc_diagnostic_sessions_set_code();

ALTER TABLE public.defects ADD COLUMN IF NOT EXISTS source VARCHAR(50);
ALTER TABLE public.defects ADD COLUMN IF NOT EXISTS linked_tc_test_run_id UUID REFERENCES public.tc_test_runs(id) ON DELETE SET NULL;
ALTER TABLE public.defects ADD COLUMN IF NOT EXISTS linked_tc_test_result_id UUID REFERENCES public.tc_test_run_results(id) ON DELETE SET NULL;
ALTER TABLE public.defects ADD COLUMN IF NOT EXISTS linked_tc_test_case_id UUID REFERENCES public.tc_test_cases(id) ON DELETE SET NULL;
ALTER TABLE public.defects ADD COLUMN IF NOT EXISTS linked_tc_diagnostic_session_id UUID REFERENCES public.tc_diagnostic_sessions(id) ON DELETE SET NULL;
ALTER TABLE public.defects ADD COLUMN IF NOT EXISTS cursor_prompt_generated BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.defects ADD COLUMN IF NOT EXISTS cursor_prompt_text TEXT;
ALTER TABLE public.defects ADD COLUMN IF NOT EXISTS linked_test_run_ids JSONB;
COMMENT ON COLUMN public.defects.source IS 'e.g. manual, test_run, diagnostic';

CREATE INDEX IF NOT EXISTS idx_defects_linked_run ON public.defects(linked_tc_test_run_id) WHERE is_deleted = FALSE;

ALTER TABLE public.tc_diagnostic_sessions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.tc_diagnostic_sessions TO authenticated;
DROP POLICY IF EXISTS tc_diag_s ON public.tc_diagnostic_sessions;
CREATE POLICY tc_diag_s ON public.tc_diagnostic_sessions FOR SELECT TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.view'));
CREATE POLICY tc_diag_w ON public.tc_diagnostic_sessions FOR ALL TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.create') OR public.app_user_has_testing_centre_permission('testing_centre.edit'))
  WITH CHECK (true);

-- sim
CREATE TABLE IF NOT EXISTS sim.tc_diagnostic_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_code VARCHAR(64) NOT NULL,
    title TEXT NOT NULL,
    reported_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    affected_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    affected_role TEXT,
    affected_module_id UUID REFERENCES sim.tc_test_modules(id) ON DELETE SET NULL,
    issue_description TEXT,
    reproduction_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    uploaded_screenshot_ids UUID[],
    environment_id UUID REFERENCES sim.tc_test_environments(id) ON DELETE SET NULL,
    diagnosis_status VARCHAR(40) NOT NULL DEFAULT 'open',
    probable_root_cause TEXT,
    recommended_fix TEXT,
    generated_cursor_prompt TEXT,
    linked_defect_id UUID REFERENCES sim.practice_defects(id) ON DELETE SET NULL,
    linked_tc_test_run_id UUID REFERENCES sim.tc_test_runs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sim_diagnostic_code UNIQUE (session_code)
);
ALTER TABLE sim.practice_defects ADD COLUMN IF NOT EXISTS source VARCHAR(50);
ALTER TABLE sim.practice_defects ADD COLUMN IF NOT EXISTS linked_tc_test_run_id UUID;
ALTER TABLE sim.practice_defects ADD COLUMN IF NOT EXISTS linked_tc_test_result_id UUID;
ALTER TABLE sim.practice_defects ADD COLUMN IF NOT EXISTS linked_tc_test_case_id UUID;
ALTER TABLE sim.practice_defects ADD COLUMN IF NOT EXISTS linked_tc_diagnostic_session_id UUID REFERENCES sim.tc_diagnostic_sessions(id) ON DELETE SET NULL;
ALTER TABLE sim.practice_defects ADD COLUMN IF NOT EXISTS cursor_prompt_generated BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE sim.practice_defects ADD COLUMN IF NOT EXISTS cursor_prompt_text TEXT;
ALTER TABLE sim.practice_defects ADD COLUMN IF NOT EXISTS linked_test_run_ids JSONB;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pd_fk_run') THEN
    ALTER TABLE sim.practice_defects
      ADD CONSTRAINT pd_fk_run FOREIGN KEY (linked_tc_test_run_id) REFERENCES sim.tc_test_runs(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pd_fk_res') THEN
    ALTER TABLE sim.practice_defects
      ADD CONSTRAINT pd_fk_res FOREIGN KEY (linked_tc_test_result_id) REFERENCES sim.tc_test_run_results(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pd_fk_case') THEN
    ALTER TABLE sim.practice_defects
      ADD CONSTRAINT pd_fk_case FOREIGN KEY (linked_tc_test_case_id) REFERENCES sim.tc_test_cases(id) ON DELETE SET NULL;
  END IF;
END $$;
ALTER TABLE sim.tc_diagnostic_sessions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON sim.tc_diagnostic_sessions TO authenticated;
CREATE POLICY s_diag_s ON sim.tc_diagnostic_sessions FOR SELECT TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.view'));
CREATE POLICY s_diag_w ON sim.tc_diagnostic_sessions FOR ALL TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.create') OR public.app_user_has_testing_centre_permission('testing_centre.edit'))
  WITH CHECK (true);

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active) VALUES
  ('tc_diagnostic_sessions', 'Testing Centre: user diagnostic sessions', false, true)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, is_active = true;

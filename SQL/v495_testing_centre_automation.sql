-- v495 — Testing Centre: automation script registry + directory whitelist

CREATE TABLE IF NOT EXISTS public.tc_automation_scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    script_key VARCHAR(128) NOT NULL,
    script_type VARCHAR(32) NOT NULL,
    script_path TEXT NOT NULL,
    tc_test_case_id UUID REFERENCES public.tc_test_cases(id) ON DELETE SET NULL,
    description TEXT,
    last_run_status VARCHAR(32),
    last_run_at TIMESTAMPTZ,
    last_failure_summary TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tc_script_key UNIQUE (script_key)
);

CREATE TABLE IF NOT EXISTS public.tc_allowed_script_directories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    directory_path TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tc_automation_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tc_allowed_script_directories ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.tc_automation_scripts, public.tc_allowed_script_directories TO authenticated;

DROP POLICY IF EXISTS tc_as_s ON public.tc_automation_scripts;
CREATE POLICY tc_as_s ON public.tc_automation_scripts FOR SELECT TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.view'));
CREATE POLICY tc_as_w ON public.tc_automation_scripts FOR ALL TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.configure'))
  WITH CHECK (public.app_user_has_testing_centre_permission('testing_centre.configure'));

DROP POLICY IF EXISTS tc_asd_s ON public.tc_allowed_script_directories;
CREATE POLICY tc_asd_s ON public.tc_allowed_script_directories FOR SELECT TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.view'));
CREATE POLICY tc_asd_w ON public.tc_allowed_script_directories FOR ALL TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.configure'))
  WITH CHECK (public.app_user_has_testing_centre_permission('testing_centre.configure'));

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active) VALUES
  ('tc_automation_scripts', 'Testing Centre: registered Playwright/Vitest SQL scripts', false, true),
  ('tc_allowed_script_directories', 'Testing Centre: script path whitelist', false, true)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, is_active = true;

-- sim
CREATE TABLE IF NOT EXISTS sim.tc_automation_scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    script_key VARCHAR(128) NOT NULL,
    script_type VARCHAR(32) NOT NULL,
    script_path TEXT NOT NULL,
    tc_test_case_id UUID REFERENCES sim.tc_test_cases(id) ON DELETE SET NULL,
    description TEXT,
    last_run_status VARCHAR(32),
    last_run_at TIMESTAMPTZ,
    last_failure_summary TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sim_tc_script_key UNIQUE (script_key)
);
CREATE TABLE IF NOT EXISTS sim.tc_allowed_script_directories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    directory_path TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE sim.tc_automation_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.tc_allowed_script_directories ENABLE ROW LEVEL SECURITY;
GRANT ALL ON sim.tc_automation_scripts, sim.tc_allowed_script_directories TO authenticated;
CREATE POLICY s_tc_as ON sim.tc_automation_scripts FOR ALL TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.view') OR public.app_user_has_testing_centre_permission('testing_centre.configure'))
  WITH CHECK (public.app_user_has_testing_centre_permission('testing_centre.configure'));
CREATE POLICY s_tc_asd ON sim.tc_allowed_script_directories FOR ALL TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.configure'))
  WITH CHECK (public.app_user_has_testing_centre_permission('testing_centre.configure'));

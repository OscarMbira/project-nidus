-- v497 — Retention, test data sets, screenshot comparisons (public + sim)

CREATE OR REPLACE FUNCTION public.cleanup_expired_evidence(p_retention_days int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c int;
BEGIN
  IF NOT public.app_user_has_testing_centre_permission('testing_centre.configure') THEN
    RAISE EXCEPTION 'insufficient permission';
  END IF;
  WITH del AS (
    DELETE FROM public.tc_evidence_files e
    WHERE e.created_at < now() - (p_retention_days || ' days')::interval
    RETURNING 1
  )
  SELECT count(*)::int INTO c FROM del;
  RETURN COALESCE(c, 0);
END;
$$;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_evidence(int) TO authenticated;

CREATE TABLE IF NOT EXISTS public.tc_test_data_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    persona VARCHAR(64),
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    environment_type VARCHAR(64) NOT NULL DEFAULT 'local',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tc_screenshot_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    baseline_evidence_id UUID REFERENCES public.tc_evidence_files(id) ON DELETE SET NULL,
    actual_evidence_id UUID REFERENCES public.tc_evidence_files(id) ON DELETE SET NULL,
    comparison_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    diff_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tc_test_data_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tc_screenshot_comparisons ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.tc_test_data_sets, public.tc_screenshot_comparisons TO authenticated;
CREATE POLICY tds_s ON public.tc_test_data_sets FOR SELECT TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.view'));
CREATE POLICY tds_w ON public.tc_test_data_sets FOR ALL TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.configure'));
CREATE POLICY tsc_s ON public.tc_screenshot_comparisons FOR SELECT TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.view'));
CREATE POLICY tsc_w ON public.tc_screenshot_comparisons FOR ALL TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.configure'));

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active) VALUES
  ('tc_test_data_sets', 'Testing Centre: JSON test data profiles', false, true),
  ('tc_screenshot_comparisons', 'Testing Centre: baseline vs actual', false, true)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, is_active = true;

-- sim
CREATE TABLE IF NOT EXISTS sim.tc_test_data_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    persona VARCHAR(64),
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    environment_type VARCHAR(64) NOT NULL DEFAULT 'local',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS sim.tc_screenshot_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    baseline_evidence_id UUID REFERENCES sim.tc_evidence_files(id) ON DELETE SET NULL,
    actual_evidence_id UUID REFERENCES sim.tc_evidence_files(id) ON DELETE SET NULL,
    comparison_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    diff_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE sim.tc_test_data_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.tc_screenshot_comparisons ENABLE ROW LEVEL SECURITY;
GRANT ALL ON sim.tc_test_data_sets, sim.tc_screenshot_comparisons TO authenticated;
CREATE POLICY s_tds ON sim.tc_test_data_sets FOR ALL TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.view') OR public.app_user_has_testing_centre_permission('testing_centre.configure'));
CREATE POLICY s_tsc ON sim.tc_screenshot_comparisons FOR ALL TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.view') OR public.app_user_has_testing_centre_permission('testing_centre.configure'));

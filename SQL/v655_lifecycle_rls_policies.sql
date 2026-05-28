-- v655: RLS policies for Category A history/archive tables (public schema)
-- @see projectplan/v639_Record_Lifecycle_Management_Plan.md

CREATE OR REPLACE FUNCTION public.apply_lifecycle_history_archive_rls(p_base text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  hist text := p_base || '_history';
  arch text := p_base || '_archive';
BEGIN
  IF to_regclass('public.' || hist) IS NULL THEN RETURN; END IF;

  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', hist);
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', arch);

  EXECUTE format('DROP POLICY IF EXISTS policy_%s_history_select ON public.%I', p_base, hist);
  EXECUTE format(
    'CREATE POLICY policy_%s_history_select ON public.%I FOR SELECT TO authenticated USING (TRUE)',
    p_base, hist
  );
  EXECUTE format('DROP POLICY IF EXISTS policy_%s_archive_select ON public.%I', p_base, arch);
  EXECUTE format(
    'CREATE POLICY policy_%s_archive_select ON public.%I FOR SELECT TO authenticated USING (TRUE)',
    p_base, arch
  );

  EXECUTE format('GRANT SELECT ON public.%I TO authenticated', hist);
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated', arch);
END;
$$;

SELECT public.apply_lifecycle_history_archive_rls('risks');
SELECT public.apply_lifecycle_history_archive_rls('issues');
SELECT public.apply_lifecycle_history_archive_rls('change_requests');
SELECT public.apply_lifecycle_history_archive_rls('tasks');
SELECT public.apply_lifecycle_history_archive_rls('defects');

DO $$ BEGIN RAISE NOTICE 'v655_lifecycle_rls_policies.sql completed'; END $$;

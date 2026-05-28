-- v658: Auto-archive expired history records (pg_cron daily)
-- @see projectplan/v639_Record_Lifecycle_Management_Plan.md

CREATE OR REPLACE FUNCTION public.auto_archive_expired_history(p_table_name TEXT DEFAULT NULL)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  tbl text;
  tables text[] := ARRAY['risks', 'issues', 'change_requests', 'tasks', 'defects'];
  hist text;
  arch text;
  retention_days INTEGER;
  moved_count INTEGER := 0;
  batch INTEGER;
  rec_account UUID;
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF p_table_name IS NOT NULL AND tbl <> p_table_name THEN
      CONTINUE;
    END IF;
    hist := tbl || '_history';
    IF to_regclass('public.' || hist) IS NULL THEN CONTINUE; END IF;
    arch := tbl || '_archive';

    FOR rec_account IN
      SELECT DISTINCT account_id FROM public.record_lifecycle_config WHERE table_name = tbl AND is_active = TRUE
    LOOP
      retention_days := (public.get_lifecycle_config(rec_account, NULL, tbl)->>'historyRetentionDays')::INTEGER;
      IF retention_days IS NULL THEN CONTINUE; END IF;
      IF NOT COALESCE((public.get_lifecycle_config(rec_account, NULL, tbl)->>'autoArchiveEnabled')::boolean, FALSE) THEN
        CONTINUE;
      END IF;

      EXECUTE format($q$
        WITH moved AS (
          DELETE FROM public.%I h
          WHERE h.moved_to_history_at IS NOT NULL
            AND h.moved_to_history_at + ($1 || ' days')::interval <= NOW()
          RETURNING *
        )
        INSERT INTO public.%I SELECT m.*, NOW(), NULL FROM moved m
      $q$, hist, arch) USING retention_days;
      GET DIAGNOSTICS batch = ROW_COUNT;
      moved_count := moved_count + batch;
    END LOOP;
  END LOOP;
  RETURN moved_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_archive_expired_history(TEXT) TO authenticated;

-- pg_cron job (requires pg_cron extension — safe to skip if unavailable)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'nidus_auto_archive_history';
    PERFORM cron.schedule(
      'nidus_auto_archive_history',
      '0 0 * * *',
      $$SELECT public.auto_archive_expired_history();$$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available — schedule auto_archive_expired_history manually';
END $$;

DO $$ BEGIN RAISE NOTICE 'v658_auto_archive_cron.sql completed'; END $$;

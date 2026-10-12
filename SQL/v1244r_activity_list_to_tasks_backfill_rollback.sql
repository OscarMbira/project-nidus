-- ============================================================================
-- v1244r: Undo one v1244 backfill batch (public and sim)
-- 1. Find the batch id: SELECT * FROM public.v1244_backfill_log ORDER BY run_at DESC;
-- 2. Put it in v_batch below and run.
-- Deleting the tagged tasks removes their task_dependencies (ON DELETE CASCADE) and clears
-- activity_list.task_id (FK ON DELETE SET NULL from v1243). Tasks edited by users after the
-- backfill are deleted too — check the counts printed first in a transaction if unsure.
-- ============================================================================
DO $$
DECLARE
  v_batch TEXT := 'PUT-BATCH-ID-HERE';
  v_public INTEGER;
  v_sim INTEGER;
BEGIN
  IF v_batch = 'PUT-BATCH-ID-HERE' THEN
    RAISE EXCEPTION 'Set v_batch to the batch id from public.v1244_backfill_log';
  END IF;

  DELETE FROM public.tasks WHERE custom_fields->>'v1244_backfill' = v_batch;
  GET DIAGNOSTICS v_public = ROW_COUNT;
  DELETE FROM sim.tasks WHERE custom_fields->>'v1244_backfill' = v_batch;
  GET DIAGNOSTICS v_sim = ROW_COUNT;
  DELETE FROM public.v1244_backfill_log WHERE batch_id::text = v_batch;

  RAISE NOTICE 'v1244r: removed % public and % sim backfilled tasks for batch %', v_public, v_sim, v_batch;
END $$;

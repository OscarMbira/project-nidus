-- ============================================================================
-- v1269 fix (feature v1265): a missed due date must not stop the schedule from recalculating
--
-- tasks.chk_tasks_dates (v06) also required due_date >= planned_start_date. When links or the
-- calendar moved a task past its due date, the whole recalculation failed with 23514 (found by
-- the v1265 Plan Sheet seed). A due date is a deadline: missing it is a warning to show on the
-- task (PRD v1265 D12), not an error that blocks the plan. Keep the planned start ≤ finish rule,
-- drop the due-date part. Both schemas (sim.tasks copies the constraint). Idempotent.
-- Run before SQL/v1270_plan_sheet_seed.sql.
-- ============================================================================

DO $$
DECLARE s TEXT;
BEGIN
  FOREACH s IN ARRAY ARRAY['public', 'sim'] LOOP
    EXECUTE format('ALTER TABLE %I.tasks DROP CONSTRAINT IF EXISTS chk_tasks_dates', s);
    EXECUTE format('ALTER TABLE %I.tasks ADD CONSTRAINT chk_tasks_dates CHECK (
      planned_end_date IS NULL OR planned_start_date IS NULL OR planned_end_date >= planned_start_date)', s);
  END LOOP;
END $$;

COMMENT ON CONSTRAINT chk_tasks_dates ON public.tasks IS
  'v1265: planned finish not before planned start. Due date is a deadline (may be missed; shown as a warning), not checked here.';

SELECT conrelid::regclass AS table_name, pg_get_constraintdef(oid) AS rule
FROM pg_constraint WHERE conname = 'chk_tasks_dates' ORDER BY 1;

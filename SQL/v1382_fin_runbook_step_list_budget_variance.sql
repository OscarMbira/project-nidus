-- ============================================================================
-- v1382: Runbook steps list — add the Over / Under Budget column
-- ============================================================================
-- PRD: projectprd/v1337_cbs_data_migration_runbook_PRD.md · Plan: projectplan/v1337_cbs_data_migration_runbook_plan.md
--
-- Adds the calculated field budget_variance_minutes (Time Taken − Budget) to the Steps list on the
-- runbook page, right after Budget. "signed": true shows the sign on both sides (+15m over budget,
-- -5m under budget); warn_when shows it in red when the step went over budget. Labels and columns
-- stay in the database (rule 25.1, v1381).
--
-- Re-runnable: appended only when the column is not there yet. Run after v1381.
-- ============================================================================

BEGIN;

UPDATE public.local_registers
SET behaviour = jsonb_set(
      behaviour, '{list_columns}',
      (behaviour -> 'list_columns') || $c$[
        {"field": "budget_variance_minutes", "label": "Over / Under", "signed": true,
         "warn_when": {"field": "budget_variance_minutes", "gt": 0}}
      ]$c$::jsonb),
    updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000043'::uuid   -- fin_runbook_steps
  AND jsonb_typeof(behaviour -> 'list_columns') = 'array'
  AND NOT (behaviour -> 'list_columns') @> '[{"field": "budget_variance_minutes"}]'::jsonb;

COMMIT;

-- Check: the last columns should be time_taken_minutes, budget_minutes, budget_variance_minutes.
SELECT register_key, jsonb_array_length(behaviour -> 'list_columns') AS columns,
       (SELECT string_agg(c ->> 'field', ', ') FROM jsonb_array_elements(behaviour -> 'list_columns') c) AS fields
FROM public.local_registers
WHERE id = '00000000-0000-4000-9001-000000000043'::uuid;

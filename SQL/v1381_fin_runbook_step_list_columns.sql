-- ============================================================================
-- v1381: Runbook steps list — columns and headings come from the database
-- ============================================================================
-- PRD: projectprd/v1337_cbs_data_migration_runbook_PRD.md · Plan: projectplan/v1337_cbs_data_migration_runbook_plan.md
--
-- The runbook page's Steps list (RunbookStepList) shows the columns of the run-monitoring workbook.
-- Which columns, in what order, and their headings are stored on the Runbook Steps register as
-- behaviour.list_columns — nothing is hard-coded in the app (rule 25.1):
--   [{ "field": "<field_key> | title | status", "label": "<heading>"?, "display": "duration"|"percent"? }, …]
--   optional "warn_when": { "field": "<field_key>", "gt": <n> } shows the cell in red when that value is above n.
-- A missing label falls back to the field's own field_label. Values are formatted from the field
-- definition (number, date & time, yes / no, dropdown label, calculated duration / percent).
-- To change the list, edit this array — no code deploy needed.
--
-- Re-runnable: merges the key into the existing behaviour. Run after v1376.
-- ============================================================================

BEGIN;

UPDATE public.local_registers
SET behaviour = COALESCE(behaviour, '{}'::jsonb) || jsonb_build_object('list_columns', $c$[
      {"field": "sequence",              "label": "#"},
      {"field": "title",                 "label": "Step"},
      {"field": "step_type",             "label": "Type"},
      {"field": "status",                "label": "Status"},
      {"field": "handoff_received",      "label": "Hand-off Received"},
      {"field": "records_received",      "label": "Received"},
      {"field": "records_loaded",        "label": "Loaded"},
      {"field": "success_percent"},
      {"field": "records_failed",        "label": "Failed", "warn_when": {"field": "records_failed", "gt": 0}},
      {"field": "throughput_per_second", "label": "Throughput / s"},
      {"field": "start_at"},
      {"field": "end_at"},
      {"field": "time_taken_minutes", "warn_when": {"field": "budget_variance_minutes", "gt": 0}},
      {"field": "budget_minutes",        "label": "Budget", "display": "duration"}
    ]$c$::jsonb),
    updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000043'::uuid;   -- fin_runbook_steps

COMMIT;

-- Check: the configured columns.
SELECT register_key, jsonb_array_length(behaviour -> 'list_columns') AS columns, behaviour -> 'list_columns' AS list_columns
FROM public.local_registers
WHERE id = '00000000-0000-4000-9001-000000000043'::uuid;

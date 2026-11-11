-- ============================================================================
-- v1383: Runbook Steps — three fields become multi-valued
-- ============================================================================
-- PRD: projectprd/v1337_cbs_data_migration_runbook_PRD.md · Plan: projectplan/v1337_cbs_data_migration_runbook_plan.md
--
-- fin_runbook_steps (register 9001-…043):
--   * Depends On (steps)      text      → multi_line  (one step per line, e.g. "12 – Customers")
--   * Decision Notes          long_text → multi_line  (one note per line; existing text kept as line 1)
--   * Out-of-Order Reasons    long_text → table, columns When (UTC) | By | Reason (rule 67.1: each line
--                                         already has those three parts). Rows are tab-separated, as the
--                                         app now writes them (appendOverrideReason). Existing lines
--                                         "2026-10-03 22:40 UTC – Cutover manager: reason" are converted
--                                         to that row format below.
--
-- Re-runnable: field updates are idempotent; the conversion only touches lines still in the old
-- "… UTC – by: reason" / "… UTC: reason" form. Run after v1376 (and after v1379 for the sample data).
-- v1376 has the same definitions, so re-running it keeps these types.
-- ============================================================================

BEGIN;

-- ── 1. Field types ───────────────────────────────────────────────────────────
UPDATE public.local_register_fields
SET field_type = 'multi_line', updated_at = NOW()
WHERE register_id = '00000000-0000-4000-9001-000000000043'::uuid
  AND field_key IN ('depends_on', 'decision_notes');

UPDATE public.local_register_fields
SET field_type = 'table',
    dropdown_options = '[{"value":"at","label":"When (UTC)"},{"value":"by","label":"By"},{"value":"reason","label":"Reason"}]'::jsonb,
    updated_at = NOW()
WHERE register_id = '00000000-0000-4000-9001-000000000043'::uuid
  AND field_key = 'sequence_override_reason';

-- ── 2. Existing out-of-order reasons → table rows (When <tab> By <tab> Reason) ──
-- 'n' flag: ^ and $ match at each line, so every line of a multi-line value is converted.
UPDATE public.local_register_records r
SET field_values = jsonb_set(r.field_values, '{sequence_override_reason}', to_jsonb(
      regexp_replace(r.field_values ->> 'sequence_override_reason',
                     '^([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2} UTC)(?: – ([^:\n]*))?: (.*)$',
                     E'\\1\t\\2\t\\3', 'gn'))),
    updated_at = NOW()
WHERE r.register_id = '00000000-0000-4000-9001-000000000043'::uuid   -- fin_runbook_steps
  AND r.field_values ->> 'sequence_override_reason' ~ '[0-9]{2}:[0-9]{2} UTC( – [^:\n]*)?: ';

COMMIT;

-- Check: field types, and every saved reason now in row form.
SELECT field_key, field_type, dropdown_options
FROM public.local_register_fields
WHERE register_id = '00000000-0000-4000-9001-000000000043'::uuid
  AND field_key IN ('depends_on', 'decision_notes', 'sequence_override_reason')
ORDER BY display_order;

SELECT display_id, title, replace(field_values ->> 'sequence_override_reason', E'\t', ' | ') AS out_of_order_reasons
FROM public.local_register_records
WHERE register_id = '00000000-0000-4000-9001-000000000043'::uuid AND COALESCE(field_values ->> 'sequence_override_reason', '') <> '';

-- ============================================================================
-- v1366: Testing Strategy — Acceptable Open Defects at Exit and Automation Approach become tables
-- ============================================================================
-- Owner request 2026-11-09: these two fields held structured data as text ("Critical: none" lines;
-- a sentence of ";"-separated rules) and should be captured and shown as tables:
--   * Acceptable Open Defects at Exit — Severity · Maximum Open at Exit · Condition
--   * Automation Approach            — Scope · Approach · When
-- The form, record view, exports and the complete document then show real tables (v1326 table type).
-- Existing values are converted: "Label: value" lines → Severity + Maximum Open; other lines and
-- ";"-separated parts → one row each (in Condition / Approach). The sample strategy (…-a03f-…001,
-- v1365) gets structured rows while it still holds the sample text.
-- Prerequisites: v1326 (table type), v1364, v1365. Idempotent (only text that is not yet a table —
-- no tab in it — is converted).
-- ============================================================================

BEGIN;

UPDATE public.local_register_fields
SET field_type = 'table',
    dropdown_options = '[{"value":"severity","label":"Severity"},{"value":"maximum","label":"Maximum Open at Exit"},{"value":"condition","label":"Condition"}]'::jsonb,
    updated_at = NOW()
WHERE register_id = '00000000-0000-4000-9001-00000000003f'::uuid AND field_key = 'acceptable_open_defects_at_exit';

UPDATE public.local_register_fields
SET field_type = 'table',
    dropdown_options = '[{"value":"scope","label":"Scope"},{"value":"approach","label":"Approach"},{"value":"when","label":"When"}]'::jsonb,
    updated_at = NOW()
WHERE register_id = '00000000-0000-4000-9001-00000000003f'::uuid AND field_key = 'automation_approach';

-- Edits to a document record are allowed here even if it is waiting for sign-off.
SELECT set_config('nidus.local_register_signoff', 'on', TRUE);

-- Sample strategy: structured rows (only while it still holds the v1365 text).
UPDATE public.local_register_records
SET field_values = field_values
      || jsonb_build_object('acceptable_open_defects_at_exit',
           E'Critical\t0\tNone open at exit\nHigh\t0\tNone open at exit\nMedium\t10\tEach with an agreed workaround\nLow\tNo limit\tEach with a fix plan')
      || jsonb_build_object('automation_approach',
           E'Stable, high-risk regression scenarios\tAutomate first\tBefore system integration testing\nNew functions\tTest manually until stable\tDuring system testing\nAutomated regression pack\tRun in full\tAfter every build drop and before each dress rehearsal'),
    updated_at = NOW()
WHERE id = '00000000-0000-4000-a03f-000000000001'::uuid
  AND field_values ->> 'acceptable_open_defects_at_exit' = E'Critical: none\nHigh: none\nMedium: up to 10 with agreed workarounds\nLow: no limit, with a fix plan'
  AND field_values ->> 'automation_approach' = 'Automate stable, high-risk regression scenarios first; keep new functions manual until stable; run the automated pack after every build drop.';

-- Any other record: convert text that is not yet a table.
UPDATE public.local_register_records r
SET field_values = r.field_values || jsonb_build_object('acceptable_open_defects_at_exit', (
      SELECT string_agg(
               CASE WHEN line ~ '^[^:]{1,40}:\s*\S'
                    THEN btrim(split_part(line, ':', 1)) || E'\t' || btrim(substr(line, strpos(line, ':') + 1)) || E'\t'
                    ELSE E'\t\t' || btrim(line) END,
               E'\n' ORDER BY n)
      FROM unnest(string_to_array(r.field_values ->> 'acceptable_open_defects_at_exit', E'\n')) WITH ORDINALITY AS t(line, n)
      WHERE btrim(line) <> '')),
    updated_at = NOW()
WHERE r.register_id = '00000000-0000-4000-9001-00000000003f'::uuid
  AND COALESCE(r.field_values ->> 'acceptable_open_defects_at_exit', '') <> ''
  AND strpos(r.field_values ->> 'acceptable_open_defects_at_exit', E'\t') = 0;

UPDATE public.local_register_records r
SET field_values = r.field_values || jsonb_build_object('automation_approach', (
      SELECT string_agg(E'\t' || btrim(regexp_replace(part, '\.$', '')) || E'\t', E'\n' ORDER BY n)
      FROM unnest(regexp_split_to_array(r.field_values ->> 'automation_approach', E'[;\n]')) WITH ORDINALITY AS t(part, n)
      WHERE btrim(part) <> '')),
    updated_at = NOW()
WHERE r.register_id = '00000000-0000-4000-9001-00000000003f'::uuid
  AND COALESCE(r.field_values ->> 'automation_approach', '') <> ''
  AND strpos(r.field_values ->> 'automation_approach', E'\t') = 0;

COMMIT;

-- Check: both fields are tables; the sample shows its rows.
SELECT f.field_key, f.field_type, jsonb_array_length(f.dropdown_options) AS columns,
       array_length(string_to_array(r.field_values ->> f.field_key, E'\n'), 1) AS sample_rows
FROM public.local_register_fields f
LEFT JOIN public.local_register_records r ON r.id = '00000000-0000-4000-a03f-000000000001'::uuid
WHERE f.register_id = '00000000-0000-4000-9001-00000000003f'::uuid
  AND f.field_key IN ('acceptable_open_defects_at_exit', 'automation_approach');

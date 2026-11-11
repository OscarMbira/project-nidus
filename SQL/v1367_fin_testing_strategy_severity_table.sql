-- ============================================================================
-- v1367: Testing Strategy — Severity Definitions becomes a table
-- ============================================================================
-- Owner request 2026-11-09: show Severity Definitions as a table — Severity · Impact · Workaround —
-- on the form, record view, exports and the complete document (v1326 table type).
-- Existing values are converted: "Severity – impact, workaround" lines → Severity + Impact
-- (+ Workaround after the last comma when it mentions a workaround); the sample strategy
-- (…-a03f-…001, v1365) gets clean rows while it still holds the sample text.
-- Prerequisites: v1326, v1364, v1365. Idempotent (text that is already a table — has a tab — is left).
-- ============================================================================

BEGIN;

UPDATE public.local_register_fields
SET field_type = 'table',
    dropdown_options = '[{"value":"severity","label":"Severity"},{"value":"impact","label":"Impact"},{"value":"workaround","label":"Workaround"}]'::jsonb,
    updated_at = NOW()
WHERE register_id = '00000000-0000-4000-9001-00000000003f'::uuid AND field_key = 'severity_definitions';

-- Edits to a document record are allowed here even if it is waiting for sign-off.
SELECT set_config('nidus.local_register_signoff', 'on', TRUE);

-- Sample strategy (only while it still holds the v1365 text).
UPDATE public.local_register_records
SET field_values = field_values || jsonb_build_object('severity_definitions',
      E'Critical\tSystem unusable or financial impact\tNo workaround\nHigh\tMajor function fails\tWorkaround difficult\nMedium\tFunction fails\tWorkaround exists\nLow\tCosmetic or minor\tNot needed'),
    updated_at = NOW()
WHERE id = '00000000-0000-4000-a03f-000000000001'::uuid
  AND field_values ->> 'severity_definitions' = E'Critical – system unusable or financial impact, no workaround\nHigh – major function fails, workaround difficult\nMedium – function fails, workaround exists\nLow – cosmetic or minor';

-- Any other record: "Severity – rest" lines; a final ", … workaround …" part becomes the Workaround cell.
UPDATE public.local_register_records r
SET field_values = r.field_values || jsonb_build_object('severity_definitions', (
      SELECT string_agg(
               CASE WHEN line ~ '\s[–—-]\s'
                    THEN btrim(split_part(regexp_replace(line, '\s[–—-]\s', '|~|'), '|~|', 1)) || E'\t'
                         || CASE WHEN rest ~* ',[^,]*workaround[^,]*$'
                                 THEN btrim(regexp_replace(rest, ',[^,]*$', '')) || E'\t' || initcap(btrim(substring(rest from ',([^,]*)$')))
                                 ELSE btrim(rest) || E'\t' END
                    ELSE btrim(line) || E'\t\t' END,
               E'\n' ORDER BY n)
      FROM (
        SELECT line, n, btrim(substr(line, length(split_part(regexp_replace(line, '\s[–—-]\s', '|~|'), '|~|', 1)) + 4)) AS rest
        FROM unnest(string_to_array(r.field_values ->> 'severity_definitions', E'\n')) WITH ORDINALITY AS t(line, n)
        WHERE btrim(line) <> ''
      ) x)),
    updated_at = NOW()
WHERE r.register_id = '00000000-0000-4000-9001-00000000003f'::uuid
  AND COALESCE(r.field_values ->> 'severity_definitions', '') <> ''
  AND strpos(r.field_values ->> 'severity_definitions', E'\t') = 0;

COMMIT;

-- Check: field type and the sample rows.
SELECT f.field_type, r.field_values ->> 'severity_definitions' AS sample_value
FROM public.local_register_fields f
LEFT JOIN public.local_register_records r ON r.id = '00000000-0000-4000-a03f-000000000001'::uuid
WHERE f.register_id = '00000000-0000-4000-9001-00000000003f'::uuid AND f.field_key = 'severity_definitions';

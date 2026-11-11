-- ============================================================================
-- v1396: Cutover registers — field audit: list fields with several parts become tables
-- ============================================================================
-- Owner request 2026-11-09: audit every list field on the eleven Cutover registers and show the ones
-- whose lines hold several parts as tables (rule 67.1), for example Decision Points
-- "Friday 16:00 – freeze go/no-go" becomes When | Decision Point | Decision Owner.
--   Cutover Strategy: Services and Channels Impacted (Service / Channel | Impact | Downtime Window),
--     Decision Points (When | Decision Point | Decision Owner), Escalation Path (Escalate To |
--     When / Threshold), Related Documents (Document | Reference)
--   Cutover Plan: Related Documents. Go/No-Go Checkpoints duplicated the Checkpoints table, so its
--     lines are merged there (Checkpoint | Time) and the field leaves the form (values stay stored).
--   Rollback Plan: Systems to Restore (System | Restore Order | Owner), Backups Required (Backup |
--     Taken At | Verified), Post-Rollback Checks (Check | Owner | Result), Communication Plan
--     (Audience | Message | When | Owner), Related Documents
--   Cutover Sign-Off: Evidence Reviewed (Evidence | Reference)
-- Saved values: lines like "A – B" already read as table rows. Lines like "Name (detail)" and
-- "Backup – time (status)" are converted to rows here. The sample records (v1395) get complete rows
-- with the new columns filled. Documents locked for sign-off are left unchanged (the sign-off lock
-- blocks edits), and their old lines still show, in the first column.
-- All other list fields hold one statement per line and stay lists (audit in the plan / guide).
-- Prerequisites: v1394, v1395. Idempotent.
-- ============================================================================

BEGIN;

-- ── 1. Field definitions ──

-- Cutover Strategy
UPDATE public.local_register_fields f
SET field_type = 'table', field_label = v.field_label, dropdown_options = v.columns::jsonb, updated_at = NOW()
FROM (VALUES
  ('services_and_channels_impacted', 'Services & Channels Impacted', '[{"value":"service","label":"Service / Channel"},{"value":"impact","label":"Impact"},{"value":"window","label":"Downtime Window"}]'),
  ('decision_points', 'Decision Points', '[{"value":"when","label":"When"},{"value":"decision_point","label":"Decision Point"},{"value":"decision_owner","label":"Decision Owner"}]'),
  ('escalation_path', 'Escalation Path', '[{"value":"escalate_to","label":"Escalate To"},{"value":"when","label":"When / Threshold"}]'),
  ('related_documents', 'Related Documents', '[{"value":"document","label":"Document"},{"value":"reference","label":"Reference"}]')
) AS v(field_key, field_label, columns)
WHERE f.register_id = '00000000-0000-4000-9001-00000000001e'::uuid AND f.field_key = v.field_key;

-- Cutover Plan
UPDATE public.local_register_fields f
SET field_type = 'table', field_label = v.field_label, dropdown_options = v.columns::jsonb, updated_at = NOW()
FROM (VALUES
  ('related_documents', 'Related Documents', '[{"value":"document","label":"Document"},{"value":"reference","label":"Reference"}]')
) AS v(field_key, field_label, columns)
WHERE f.register_id = '00000000-0000-4000-9001-00000000001f'::uuid AND f.field_key = v.field_key;

-- Rollback Plan
UPDATE public.local_register_fields f
SET field_type = 'table', field_label = v.field_label, dropdown_options = v.columns::jsonb, updated_at = NOW()
FROM (VALUES
  ('systems_to_restore', 'Systems to Restore', '[{"value":"system","label":"System"},{"value":"order","label":"Restore Order"},{"value":"owner","label":"Owner"}]'),
  ('backups_required', 'Backups Required', '[{"value":"backup","label":"Backup"},{"value":"taken_at","label":"Taken At"},{"value":"verified","label":"Verified","type":"select","options":["Yes","No","Not tested"]}]'),
  ('post_rollback_checks', 'Post-Rollback Checks', '[{"value":"check","label":"Check"},{"value":"owner","label":"Owner"},{"value":"result","label":"Result","type":"select","options":["Pass","Fail","Not run"]}]'),
  ('communication_plan', 'Communication Plan', '[{"value":"audience","label":"Audience"},{"value":"message","label":"Message"},{"value":"when","label":"When"},{"value":"owner","label":"Owner"}]'),
  ('related_documents', 'Related Documents', '[{"value":"document","label":"Document"},{"value":"reference","label":"Reference"}]')
) AS v(field_key, field_label, columns)
WHERE f.register_id = '00000000-0000-4000-9001-000000000024'::uuid AND f.field_key = v.field_key;

-- Cutover Sign-Off
UPDATE public.local_register_fields
SET field_type = 'table', dropdown_options = '[{"value":"evidence","label":"Evidence"},{"value":"reference","label":"Reference"}]'::jsonb, updated_at = NOW()
WHERE register_id = '00000000-0000-4000-9001-000000000028'::uuid AND field_key = 'evidence_reviewed';

-- ── 2. Cutover Plan: Go/No-Go Checkpoints merged with Checkpoints ──
-- "Freeze (Fri 16:00)" becomes the row Freeze | Fri 16:00, added below any existing checkpoints.
UPDATE public.local_register_records r
SET field_values = jsonb_set(r.field_values, '{checkpoints}', to_jsonb(
      concat_ws(E'\n',
        NULLIF(r.field_values ->> 'checkpoints', ''),
        regexp_replace(regexp_replace(r.field_values ->> 'go_no_go_checkpoints',
          '^([^\t\n(]+?) \(([^()\n]*)\)$', E'\\1\t\\2\t', 'gn'),
          '^([^\t\n]+)$', E'\\1\t\t', 'gn')))),
    updated_at = NOW()
WHERE r.register_id = '00000000-0000-4000-9001-00000000001f'::uuid
  AND r.id <> '00000000-0000-4000-b01f-000000000001'::uuid
  AND r.signoff_state = 'none'
  AND COALESCE(r.field_values ->> 'go_no_go_checkpoints', '') <> '';

DELETE FROM public.local_register_fields
WHERE register_id = '00000000-0000-4000-9001-00000000001f'::uuid AND field_key = 'go_no_go_checkpoints';

-- ── 3. Other saved values: "Name (detail)" and "Backup – time (status)" lines become rows ──
UPDATE public.local_register_records r
SET field_values = r.field_values || jsonb_build_object(c.field_key, regexp_replace(r.field_values ->> c.field_key,
      '^([^\t\n(]+?) \(([^()\n]*)\)$', E'\\1\t\\2', 'gn')),
    updated_at = NOW()
FROM (VALUES
  ('00000000-0000-4000-9001-00000000001e'::uuid, 'services_and_channels_impacted'),
  ('00000000-0000-4000-9001-00000000001e'::uuid, 'related_documents'),
  ('00000000-0000-4000-9001-00000000001f'::uuid, 'related_documents'),
  ('00000000-0000-4000-9001-000000000024'::uuid, 'related_documents')
) AS c(register_id, field_key)
WHERE r.register_id = c.register_id
  AND r.signoff_state = 'none'
  AND COALESCE(r.field_values ->> c.field_key, '') <> ''
  AND position(E'\t' in r.field_values ->> c.field_key) = 0;

UPDATE public.local_register_records r
SET field_values = r.field_values || jsonb_build_object('backups_required', regexp_replace(r.field_values ->> 'backups_required',
      '^([^\t\n]+?) – ([^\t\n(]+?) \(([^()\n]*)\)$', E'\\1\t\\2\t\\3', 'gn')),
    updated_at = NOW()
WHERE r.register_id = '00000000-0000-4000-9001-000000000024'::uuid
  AND r.signoff_state = 'none'
  AND COALESCE(r.field_values ->> 'backups_required', '') <> ''
  AND position(E'\t' in r.field_values ->> 'backups_required') = 0;

-- ── 4. Sample records (v1395): complete rows with the new columns ──
UPDATE public.local_register_records
SET field_values = (field_values) || $j${"services_and_channels_impacted":"Internet and mobile banking\tRead-only, then unavailable\tFri 18:00 to Sun 21:00\nCards and ATMs\tStand-in authorisation with lower limits\tUp to 4 hours on Saturday night\nBranch systems\tBranches closed\tSaturday\nOutgoing payments\tHeld, released in priority order\tFri 18:00 to Sun 19:00","decision_points":"Friday 16:00\tFreeze go/no-go\tProgramme director\nSaturday 06:00\tStatic window complete\tCutover manager\nSaturday 22:00\tFinancial migration complete\tCutover manager\nSunday 12:00\tReconciliation and business verification\tCutover board\nSunday 18:00\tFinal go-live decision (point of no return)\tExecutive sponsor","escalation_path":"Workstream lead\tWithin 15 minutes\nCutover manager\tWithin 30 minutes\nCutover board (programme director chair)\tGo/no-go questions or schedule slips over 1 hour\nExecutive sponsor\tRollback decisions","related_documents":"Data Migration Strategy\tDM-STR-001\nTesting Strategy\tTS-STR-001\nDress Rehearsal Strategy\tDR-STR-001\nHypercare Plan\t"}$j$::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-b01e-000000000001'::uuid AND signoff_state = 'none';

UPDATE public.local_register_records
SET field_values = (field_values - 'go_no_go_checkpoints') || $j${"related_documents":"Cutover Strategy\tCUT-STR-001\nRollback Plan\tRB-PLN-001","checkpoints":"Freeze go/no-go\tFri 16:00\tProgramme director\nStatic window complete\tSat 06:00\tCutover manager\nFinancial migration complete\tSat 22:00\tCutover manager\nReconciliation and verification\tSun 12:00\tCutover board\nFinal go-live (point of no return)\tSun 18:00\tCutover board"}$j$::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-b01f-000000000001'::uuid AND signoff_state = 'none';

UPDATE public.local_register_records
SET field_values = (field_values) || $j${"systems_to_restore":"Legacy core banking\t1\tAhmed Hassan\nIntegration layer routes\t2\tAhmed Hassan\nCard authorisation routing\t3\tAhmed Hassan\nInternet and mobile banking back-ends\t4\tLinda Zhou","backups_required":"Legacy database\tFriday 20:00\tYes\nIntegration layer configuration\tFriday 18:00\tNot tested\nChannel configuration\tFriday 18:00\tNot tested","post_rollback_checks":"Legacy balances agree to Friday close plus replayed transactions\tOlivia Banda\tNot run\nSample customer checks by each business unit\tAmina Diallo\tNot run\nCard and payment test transactions\tLinda Zhou\tNot run","communication_plan":"Executive committee\tCutover rolled back, next steps\tOn the rollback decision\tDaniel Okafor\nRegulator\tFormal notice of the rollback\tWithin 2 hours\tNomvula Khumalo\nCustomers\tServices restored as normal\tBefore Monday opening\tLinda Zhou\nStaff\tBriefing on the legacy system\tBefore branches open\tAmina Diallo","related_documents":"Cutover Strategy\tCUT-STR-001\nCutover Plan\tCUT-PLN-001"}$j$::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-b024-000000000001'::uuid AND signoff_state = 'none';

UPDATE public.local_register_records
SET field_values = (field_values) || $j${"evidence_reviewed":"Cutover Strategy v1.0\tCUT-STR-001"}$j$::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-b028-000000000001'::uuid AND signoff_state = 'none';

UPDATE public.local_register_records
SET field_values = (field_values) || $j${"evidence_reviewed":"Business Readiness assessments\tBR-01 to BR-10"}$j$::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-b028-000000000007'::uuid AND signoff_state = 'none';

UPDATE public.local_register_records
SET field_values = (field_values) || $j${"evidence_reviewed":"Technology Readiness assessments\tTR-01 to TR-10"}$j$::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-b028-000000000008'::uuid AND signoff_state = 'none';

COMMIT;

-- Check: the converted fields, and the sample values now in rows.
SELECT r.register_key, f.field_key, f.field_type, jsonb_array_length(f.dropdown_options) AS columns
FROM public.local_register_fields f JOIN public.local_registers r ON r.id = f.register_id
WHERE f.register_id IN ('00000000-0000-4000-9001-00000000001e'::uuid, '00000000-0000-4000-9001-00000000001f'::uuid, '00000000-0000-4000-9001-000000000024'::uuid, '00000000-0000-4000-9001-000000000028'::uuid)
  AND f.field_key IN ('services_and_channels_impacted', 'decision_points', 'escalation_path', 'related_documents', 'systems_to_restore', 'backups_required', 'post_rollback_checks', 'communication_plan', 'evidence_reviewed', 'checkpoints', 'go_no_go_checkpoints')
ORDER BY r.register_key, f.display_order;

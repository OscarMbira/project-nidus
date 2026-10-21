-- ============================================================================
-- v1303: Workstreams — list fields on their own tabs + new Required Skills list
-- ============================================================================
-- Owner request 2026-10-21, Workstreams register (fin_workstreams,
-- 00000000-0000-4000-9001-000000000004):
--   1. objectives, key_deliverables, dependencies, key_risks_issues -> multi-value
--      (v1299 'multi_line' type, @nidus/ui MultiLineListInput), one tab each.
--   2. New multi-value field required_skills ("Required Skills") on its own tab — the skills the
--      workstream needs. Suggested line format: skill – proficiency – quantity
--      (e.g. "Core banking SME (T24) – Expert – 2 FTE"), so it also serves resource planning.
--
-- display_order is renumbered so the list tabs sit together. The form reads:
--   Details · Objectives · Key Deliverables · Dependencies · Key Risks / Issues ·
--   Required Skills · Schedule & Budget · Progress · Audit details
-- These were 'text' fields, so existing values are already strings and become the first list
-- item. Prerequisite: v1299 (multi_line type). Idempotent.
-- ============================================================================

-- ── 1. New field: Required Skills ───────────────────────────────────────────────────
INSERT INTO public.local_register_fields (register_id, field_key, field_label, field_type, is_required, display_order, field_group)
SELECT '00000000-0000-4000-9001-000000000004'::uuid, 'required_skills', 'Required Skills', 'multi_line', false, 8, 'Required Skills'
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000004'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type,
  display_order = EXCLUDED.display_order, field_group = EXCLUDED.field_group, updated_at = NOW();

-- ── 2. List fields -> multi_line + own tab; renumber every field's display_order ───
UPDATE public.local_register_fields f
SET display_order = v.display_order,
    field_type = COALESCE(v.field_type, f.field_type),
    field_group = CASE WHEN v.field_type = 'multi_line' THEN f.field_label ELSE f.field_group END,
    updated_at = NOW()
FROM (VALUES
  ('workstream_code', 0, NULL),
  ('workstream_type', 1, NULL),
  ('workstream_lead', 2, NULL),
  ('business_owner', 3, NULL),
  ('objectives', 4, 'multi_line'),
  ('key_deliverables', 5, 'multi_line'),
  ('dependencies', 6, 'multi_line'),
  ('key_risks_issues', 7, 'multi_line'),
  ('required_skills', 8, NULL),
  ('planned_start_date', 9, NULL),
  ('planned_end_date', 10, NULL),
  ('forecast_end_date', 11, NULL),
  ('team_size', 12, NULL),
  ('budget', 13, NULL),
  ('actual_spend', 14, NULL),
  ('percent_complete', 15, NULL),
  ('rag_status', 16, NULL),
  ('last_status_update', 17, NULL)
) AS v(field_key, display_order, field_type)
WHERE f.register_id = '00000000-0000-4000-9001-000000000004'::uuid
  AND f.field_key = v.field_key;

DO $$
DECLARE
  v_multi INT;
  v_total INT;
BEGIN
  SELECT COUNT(*) FILTER (WHERE field_type = 'multi_line'), COUNT(*) INTO v_multi, v_total
  FROM public.local_register_fields
  WHERE register_id = '00000000-0000-4000-9001-000000000004'::uuid;
  RAISE NOTICE 'v1303: Workstreams has % fields, % multi-line (expected 18 and 5)', v_total, v_multi;
END $$;

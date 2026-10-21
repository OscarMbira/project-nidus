-- ============================================================================
-- v1300: Transformation Overview — one tab per scope list field
-- ============================================================================
-- v1297 grouped In Scope / Out of Scope / Regulatory Drivers / Key Dependencies on a single
-- "Scope & Dependencies" tab. Since v1299 made them multi-line lists, that tab became a long
-- stack of four list tables. Owner request 2026-10-21: give each its own tab.
--
-- Tab order follows display_order (10-13), so the form reads:
--   Details · Governance · Timeline & Finance · In Scope · Out of Scope · Regulatory Drivers ·
--   Key Dependencies · Health & Review · Audit details
-- Data-only change (rule 25.1) — no field_values are touched. Idempotent.
-- ============================================================================

UPDATE public.local_register_fields f
SET field_group = v.field_group, updated_at = NOW()
FROM (VALUES
  ('in_scope', 'In Scope'),
  ('out_of_scope', 'Out of Scope'),
  ('regulatory_drivers', 'Regulatory Drivers'),
  ('key_dependencies', 'Key Dependencies')
) AS v(field_key, field_group)
WHERE f.register_id = '00000000-0000-4000-9001-000000000001'::uuid
  AND f.field_key = v.field_key;

DO $$
DECLARE
  v_left INT;
BEGIN
  SELECT COUNT(*) INTO v_left FROM public.local_register_fields
  WHERE register_id = '00000000-0000-4000-9001-000000000001'::uuid
    AND field_group = 'Scope & Dependencies';
  RAISE NOTICE 'v1300: % fields still on "Scope & Dependencies" (expected 0)', v_left;
END $$;

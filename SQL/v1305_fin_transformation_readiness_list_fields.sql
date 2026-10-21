-- ============================================================================
-- v1305: Transformation Readiness — three fields become multi-value lists
-- ============================================================================
-- Owner request 2026-10-21, Transformation Readiness register (fin_transformation_readiness,
-- 00000000-0000-4000-9001-000000000006): make these multi-value (v1299 'multi_line' type,
-- @nidus/ui MultiLineListInput). They stay on their current tabs:
--   business_unit        (Details)
--   key_gaps             (Remediation)
--   remediation_actions  (Remediation)
-- These were 'text' fields, so existing values are already strings and become the first list
-- item. Prerequisite: v1299 (multi_line type). Idempotent.
-- ============================================================================

UPDATE public.local_register_fields
SET field_type = 'multi_line', updated_at = NOW()
WHERE register_id = '00000000-0000-4000-9001-000000000006'::uuid
  AND field_key IN ('business_unit', 'key_gaps', 'remediation_actions');

DO $$
DECLARE
  v_multi INT;
BEGIN
  SELECT COUNT(*) INTO v_multi FROM public.local_register_fields
  WHERE register_id = '00000000-0000-4000-9001-000000000006'::uuid AND field_type = 'multi_line';
  RAISE NOTICE 'v1305: Transformation Readiness has % multi-line fields (expected 3)', v_multi;
END $$;

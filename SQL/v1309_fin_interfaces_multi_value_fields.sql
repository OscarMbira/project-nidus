-- ============================================================================
-- v1309: Interfaces — reference and connected system become lists
-- ============================================================================
-- Owner request 2026-10-21, Interfaces register (fin_core_banking_interfaces,
-- 00000000-0000-4000-9001-000000000009): make these multi-value (v1299 'multi_line'), staying
-- required and on the Details tab:
--   interface_reference -> "Interface / Use Case References"
--   connected_system    -> "Connected Systems"
-- An empty list still counts as missing, so Save waits for at least one item in each.
-- Text values already saved become the first list item. Prerequisite: v1307. Idempotent.
-- ============================================================================

UPDATE public.local_register_fields
SET field_type = 'multi_line',
    field_label = CASE field_key
                    WHEN 'interface_reference' THEN 'Interface / Use Case References'
                    ELSE 'Connected Systems' END,
    updated_at = NOW()
WHERE register_id = '00000000-0000-4000-9001-000000000009'::uuid
  AND field_key IN ('interface_reference', 'connected_system');

DO $$
DECLARE
  v_multi INT;
BEGIN
  SELECT COUNT(*) INTO v_multi FROM public.local_register_fields
  WHERE register_id = '00000000-0000-4000-9001-000000000009'::uuid AND field_type = 'multi_line';
  RAISE NOTICE 'v1309: Interfaces has % list fields (expected 5)', v_multi;
END $$;

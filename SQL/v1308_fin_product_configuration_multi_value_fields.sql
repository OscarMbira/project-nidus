-- ============================================================================
-- v1308: Product Configuration — multi-value fields
-- ============================================================================
-- Owner request 2026-10-21, Product Configuration register (fin_product_configuration,
-- 00000000-0000-4000-9001-000000000007). Fields stay on their current tabs:
--   business_area          dropdown    -> multi_select (same options)          Details
--   configuration_analyst  user_picker -> multi_line                            Details
--   release_wave           text        -> multi_line                            Details
--   currencies             text        -> multi_line                            Features & Pricing
--   signed_off_by + sign_off_date -> one multi_line "Sign-Offs" list, one line per sign-off
--     ("Name – Role – Date"), so each date stays with its approver. sign_off_date is removed.
-- channels ("Available Channels") is already multi_select (v1307) — unchanged.
--
-- Existing values are carried over: a single business_area becomes a one-item array; text
-- values become the first list item; any sign_off_date is appended to that record's
-- signed_off_by line before the field is removed. Prerequisite: v1307. Idempotent.
-- ============================================================================

BEGIN;

-- 1. Field definitions
UPDATE public.local_register_fields
SET field_type = CASE field_key WHEN 'business_area' THEN 'multi_select' ELSE 'multi_line' END,
    field_label = CASE field_key
                    WHEN 'configuration_analyst' THEN 'Configuration Analysts'
                    WHEN 'signed_off_by' THEN 'Sign-Offs (Name – Role – Date)'
                    ELSE field_label END,
    updated_at = NOW()
WHERE register_id = '00000000-0000-4000-9001-000000000007'::uuid
  AND field_key IN ('business_area', 'configuration_analyst', 'release_wave', 'currencies', 'signed_off_by');

-- 2. Carry existing values over
UPDATE public.local_register_records
SET field_values = jsonb_set(field_values, '{business_area}', jsonb_build_array(field_values->'business_area')),
    updated_at = NOW()
WHERE register_id = '00000000-0000-4000-9001-000000000007'::uuid
  AND jsonb_typeof(field_values->'business_area') = 'string';

UPDATE public.local_register_records
SET field_values = jsonb_set(field_values, '{signed_off_by}',
      to_jsonb(trim(BOTH ' –' FROM COALESCE(field_values->>'signed_off_by', '') || ' – ' || (field_values->>'sign_off_date')))),
    updated_at = NOW()
WHERE register_id = '00000000-0000-4000-9001-000000000007'::uuid
  AND COALESCE(field_values->>'sign_off_date', '') <> '';

UPDATE public.local_register_records
SET field_values = field_values - 'sign_off_date', updated_at = NOW()
WHERE register_id = '00000000-0000-4000-9001-000000000007'::uuid
  AND field_values ? 'sign_off_date';

-- 3. Remove the separate date field
DELETE FROM public.local_register_fields
WHERE register_id = '00000000-0000-4000-9001-000000000007'::uuid
  AND field_key = 'sign_off_date';

COMMIT;

DO $$
DECLARE
  v_multi INT;
BEGIN
  SELECT COUNT(*) INTO v_multi FROM public.local_register_fields
  WHERE register_id = '00000000-0000-4000-9001-000000000007'::uuid
    AND field_type IN ('multi_line', 'multi_select');
  RAISE NOTICE 'v1308: Product Configuration has % multi-value fields (expected 11)', v_multi;
END $$;

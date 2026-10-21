-- ============================================================================
-- v1302: Business Units — four impact fields as lists, one tab each
-- ============================================================================
-- Owner request 2026-10-21: on the Business Units register (fin_business_units,
-- 00000000-0000-4000-9001-000000000003) make these fields multi-value (v1299 'multi_line'
-- type — @nidus/ui MultiLineListInput) and give each its own tab:
--   products_services_impacted (was text), staff_impacted, locations_impacted,
--   customers_impacted (were number)
-- "Staff Impacted (headcount)" is relabelled "Staff Impacted" — each line can now name a staff
-- group and its headcount (e.g. "Branch tellers – 120").
--
-- Tabs follow display_order, so the form reads:
--   Details · Change Impact · Products / Services Impacted · Staff Impacted ·
--   Branches / Locations Impacted · Customers Impacted · Readiness · Audit details
-- Change Impact keeps Impact Level and Primary Change Type.
-- Existing numeric values are converted to text so they become the first list item.
-- Prerequisite: v1299 (multi_line type). Idempotent.
-- ============================================================================

UPDATE public.local_register_fields f
SET field_type = 'multi_line',
    field_label = v.field_label,
    field_group = v.field_label,
    updated_at = NOW()
FROM (VALUES
  ('products_services_impacted', 'Products / Services Impacted'),
  ('staff_impacted', 'Staff Impacted'),
  ('locations_impacted', 'Branches / Locations Impacted'),
  ('customers_impacted', 'Customers Impacted')
) AS v(field_key, field_label)
WHERE f.register_id = '00000000-0000-4000-9001-000000000003'::uuid
  AND f.field_key = v.field_key;

-- Existing numeric values -> text (one per field), so nothing disappears from the form.
UPDATE public.local_register_records r
SET field_values = (
      SELECT jsonb_object_agg(
               kv.key,
               CASE WHEN kv.key IN ('staff_impacted', 'locations_impacted', 'customers_impacted')
                         AND jsonb_typeof(kv.value) = 'number'
                    THEN to_jsonb(kv.value #>> '{}')
                    ELSE kv.value END)
      FROM jsonb_each(r.field_values) kv),
    updated_at = NOW()
WHERE r.register_id = '00000000-0000-4000-9001-000000000003'::uuid
  AND (jsonb_typeof(r.field_values->'staff_impacted') = 'number'
    OR jsonb_typeof(r.field_values->'locations_impacted') = 'number'
    OR jsonb_typeof(r.field_values->'customers_impacted') = 'number');

DO $$
DECLARE
  v_multi INT;
BEGIN
  SELECT COUNT(*) INTO v_multi FROM public.local_register_fields
  WHERE register_id = '00000000-0000-4000-9001-000000000003'::uuid AND field_type = 'multi_line';
  RAISE NOTICE 'v1302: Business Units has % multi-line fields on their own tabs (expected 4)', v_multi;
END $$;

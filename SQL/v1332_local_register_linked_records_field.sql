-- ============================================================================
-- v1332: "Linked records" field type — Product Takeover shows each product's Data Scope details
-- ============================================================================
-- Owner request 2026-10-24: the Data Migration Strategy's Product Takeover section must show the
-- actual per-product takeover details (heading, introduction, rule bullets — like the "LD Loans
-- and Past Dues / AC accounts / Accounts Dormancy and Inactivity" sections of a strategy
-- document), not just the list of product names.
-- Owner decisions (same day): the details come from the Data Scope register (one record per
-- product, same project — the v1317 design) and appear in the exports and on the record's tab.
--
--   1. New Local Register field type 'linked_records' (public + sim). Its dropdown_options name
--      the source register: [{ "value": "<register_key>", "label": "<label>" }]. It stores no value;
--      the app shows the source register's records for the same project as sub-sections
--      (title, description, then each filled field as bullets).
--   2. Data Migration Strategy gets "Product Takeover Details" (source: fin_data_scope) on its
--      Product Takeover tab, after the existing four fields.
-- Prerequisites: v1316, v1317, v1326. Idempotent.
-- ============================================================================

ALTER TABLE public.local_register_fields DROP CONSTRAINT IF EXISTS chk_local_register_fields_field_type;
ALTER TABLE public.local_register_fields
  ADD CONSTRAINT chk_local_register_fields_field_type CHECK (field_type IN
    ('text', 'long_text', 'multi_line', 'number', 'date', 'dropdown', 'multi_select', 'boolean', 'user_picker', 'currency', 'table', 'linked_records'));

ALTER TABLE sim.local_register_fields DROP CONSTRAINT IF EXISTS chk_sim_local_register_fields_field_type;
ALTER TABLE sim.local_register_fields
  ADD CONSTRAINT chk_sim_local_register_fields_field_type CHECK (field_type IN
    ('text', 'long_text', 'multi_line', 'number', 'date', 'dropdown', 'multi_select', 'boolean', 'user_picker', 'currency', 'table', 'linked_records'));

INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, 'product_takeover_details', 'Product Takeover Details', 'linked_records', false, 38, 'Product Takeover',
       '[{"value":"fin_data_scope","label":"Data Scope"}]'::jsonb
FROM public.local_registers lr
WHERE lr.register_key = 'fin_migration_strategy'
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.local_register_fields f
  JOIN public.local_registers lr ON lr.id = f.register_id
  WHERE lr.register_key = 'fin_migration_strategy' AND f.field_key = 'product_takeover_details' AND f.field_type = 'linked_records';
  RAISE NOTICE 'v1332: % Product Takeover Details field(s) (expected 1, or more if accounts hold copies)', v_count;
END $$;

NOTIFY pgrst, 'reload schema';

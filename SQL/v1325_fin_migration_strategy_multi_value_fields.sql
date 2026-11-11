-- ============================================================================
-- v1325: Migration Strategy — circled fields become multi-value lists
-- ============================================================================
-- Owner request 2026-10-24: make these Migration Strategy fields multi-value (one entry per line,
-- Card/Table list input, rule 67). Dropdowns stay as they are (Stages in Data Transition, Parties to
-- the Migration and Environments Used are already multi-select).
--
--   Migration Approach      Target System Configuration Dependencies
--   Data Takeover           Migration / ETL Tools, Estimated Record Volumes, Estimated Data Volumes,
--                           Mock Migrations Planned, Dress Rehearsals Planned
--                           (labels show the pattern per line, e.g. "Data Object – Records")
--   Product Takeover        Product Takeover Approach
--   Data Quality            Data Cleansing Approach
--   Accounting & Recon.     Financial / Accounting Impact, Holding / Suspense Accounts,
--                           Reconciliation Approach
--   Roles & Environments    Environment Management
--
-- Field keys, tabs and order are unchanged. Any value already saved (text or a number) becomes the
-- first list entry. Prerequisites: v1316, v1317, v1318. Idempotent.
-- ============================================================================

UPDATE public.local_register_fields f
SET field_type = 'multi_line',
    field_label = v.field_label,
    dropdown_options = NULL,
    updated_at = NOW()
FROM (VALUES
  ('configuration_dependencies', 'Target System Configuration Dependencies'),
  ('migration_tool', 'Migration / ETL Tools'),
  ('estimated_record_volume', 'Estimated Record Volumes (Data Object – Records)'),
  ('estimated_data_volume_gb', 'Estimated Data Volumes (Source / Data Object – GB)'),
  ('mock_runs_planned', 'Mock Migrations Planned (Mock – Date – Scope)'),
  ('dress_rehearsals_planned', 'Dress Rehearsals Planned (Rehearsal – Date – Scope)'),
  ('product_takeover_approach', 'Product Takeover Approach (detailed rules per product are captured in Data Scope)'),
  ('data_cleansing_approach', 'Data Cleansing Approach'),
  ('financial_impact', 'Financial / Accounting Impact (if any)'),
  ('holding_account_reference', 'Holding / Suspense Accounts (if applicable)'),
  ('reconciliation_approach', 'Reconciliation Approach'),
  ('environment_management', 'Environment Management')
) AS v(field_key, field_label)
WHERE f.register_id = '00000000-0000-4000-9001-00000000000c'::uuid
  AND f.field_key = v.field_key;

-- Saved numbers become text so the list input shows them as the first entry. Runs with the
-- sign-off flag so records already locked for sign-off keep their values readable too.
DO $$
DECLARE
  v_key TEXT;
BEGIN
  PERFORM set_config('nidus.local_register_signoff', 'on', TRUE);
  FOREACH v_key IN ARRAY ARRAY['estimated_record_volume', 'estimated_data_volume_gb', 'mock_runs_planned', 'dress_rehearsals_planned']
  LOOP
    UPDATE public.local_register_records
    SET field_values = jsonb_set(field_values, ARRAY[v_key], to_jsonb(field_values ->> v_key))
    WHERE register_id = '00000000-0000-4000-9001-00000000000c'::uuid
      AND jsonb_typeof(field_values -> v_key) = 'number';

    UPDATE sim.local_register_records
    SET field_values = jsonb_set(field_values, ARRAY[v_key], to_jsonb(field_values ->> v_key))
    WHERE register_id = '00000000-0000-4000-9001-00000000000c'::uuid
      AND is_system_register = TRUE
      AND jsonb_typeof(field_values -> v_key) = 'number';
  END LOOP;
  PERFORM set_config('nidus.local_register_signoff', '', TRUE);
END $$;

DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.local_register_fields
  WHERE register_id = '00000000-0000-4000-9001-00000000000c'::uuid AND field_type = 'multi_line'
    AND field_key IN ('configuration_dependencies', 'migration_tool', 'estimated_record_volume', 'estimated_data_volume_gb',
      'mock_runs_planned', 'dress_rehearsals_planned', 'product_takeover_approach', 'data_cleansing_approach',
      'financial_impact', 'holding_account_reference', 'reconciliation_approach', 'environment_management');
  RAISE NOTICE 'v1325: % of 12 Migration Strategy fields are now multi-value', v_count;
END $$;

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- v1356: Data Cleansing (FIN pack, Data Migration) — full cleansing issue form with tabs
-- ============================================================================
-- Owner request 2026-11-09: the Data Cleansing form only had Title / Description / Status. Each record
-- is one data quality issue and the work to fix it before migration. Tabs (field_group = tab;
-- ungrouped fields stay on Details):
--   Details             — issue reference, product / data area (Data Scope list), data object, source
--                         system, issue category, severity, blocks migration, found during, business
--                         data owner, cleansing lead
--   Impact & Scope      — records checked, records affected, value affected, detection rule / query,
--                         impact if not fixed, affected mapping sheets
--   Cleansing Approach  — cleansing method, responsible team, cleansing rules / steps, customer consent
--                         or approval needed
--   Progress            — target and actual completion dates, records corrected, progress %, target
--                         quality %, progress log (table)
--   Verification        — verification method, verified in, verified by, verification date, residual
--                         exceptions, residual risk accepted
--   Notes               — open issues, notes
-- Status workflow: Not Started → In Progress → On Hold → Complete → Verified → Closed – Risk Accepted
-- (existing keys kept). All new fields optional, vendor-neutral (rule 26). Platform register
-- definition; the Simulator reads the same system register definitions. Sample values: v1357.
-- Prerequisites: v947 (register), v1297 (tabs), v1326 (table type), v1338 (Data Scope products).
-- Idempotent.
-- ============================================================================

INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT '00000000-0000-4000-9001-000000000010'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM (VALUES
  -- Details
  ('issue_reference', 'Issue Reference', 'text', 0, NULL, NULL),
  ('product_area', 'Product / Data Area', 'dropdown', 1, NULL, NULL),
  ('data_object', 'Data Object / Entity', 'text', 2, NULL, NULL),
  ('source_system', 'Source System', 'text', 3, NULL, NULL),
  ('issue_category', 'Issue Category', 'dropdown', 4, NULL, '[{"value":"duplicates","label":"Duplicate records"},{"value":"missing_mandatory","label":"Missing mandatory data"},{"value":"invalid_format","label":"Invalid format"},{"value":"invalid_reference","label":"Invalid code or reference"},{"value":"outdated","label":"Outdated / stale data"},{"value":"inconsistent","label":"Inconsistent across systems"},{"value":"business_rule","label":"Breaks a target business rule"},{"value":"closure_candidate","label":"Records to close or archive first"},{"value":"other","label":"Other"}]'),
  ('severity', 'Severity', 'dropdown', 5, NULL, '[{"value":"critical","label":"Critical — blocks the load"},{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]'),
  ('blocks_migration', 'Blocks Migration', 'boolean', 6, NULL, NULL),
  ('found_during', 'Found During', 'dropdown', 7, NULL, '[{"value":"profiling","label":"Data profiling"},{"value":"mock_1","label":"Mock 1"},{"value":"mock_2","label":"Mock 2"},{"value":"mock_3","label":"Mock 3"},{"value":"dress_rehearsal","label":"Dress rehearsal"},{"value":"business_review","label":"Business review"}]'),
  ('data_owner', 'Business Data Owner', 'user_picker', 8, NULL, NULL),
  ('cleansing_lead', 'Cleansing Lead', 'user_picker', 9, NULL, NULL),

  -- Impact & Scope
  ('records_checked', 'Records Checked', 'number', 10, 'Impact & Scope', NULL),
  ('records_affected', 'Records Affected', 'number', 11, 'Impact & Scope', NULL),
  ('value_affected', 'Value Affected', 'currency', 12, 'Impact & Scope', NULL),
  ('detection_rule', 'Detection Rule / Query', 'multi_line', 13, 'Impact & Scope', NULL),
  ('impact_if_not_fixed', 'Impact if Not Fixed', 'multi_line', 14, 'Impact & Scope', NULL),
  ('affected_mapping_sheets', 'Affected Mapping Sheets (DMS)', 'text', 15, 'Impact & Scope', NULL),

  -- Cleansing Approach
  ('cleansing_method', 'Cleansing Method', 'dropdown', 16, 'Cleansing Approach', '[{"value":"fix_at_source","label":"Fix at source (legacy system)"},{"value":"transform_in_staging","label":"Transformation rule in staging"},{"value":"fix_after_migration","label":"Fix manually after migration"},{"value":"exclude","label":"Exclude from migration"},{"value":"close_before_migration","label":"Close / archive before migration"},{"value":"accept_as_is","label":"Accept as is (risk accepted)"}]'),
  ('responsible_team', 'Responsible Team', 'text', 17, 'Cleansing Approach', NULL),
  ('cleansing_steps', 'Cleansing Rules / Steps', 'multi_line', 18, 'Cleansing Approach', NULL),
  ('approval_needed', 'Customer Consent or Approval Needed', 'boolean', 19, 'Cleansing Approach', NULL),

  -- Progress
  ('target_completion_date', 'Target Completion Date', 'date', 20, 'Progress', NULL),
  ('actual_completion_date', 'Actual Completion Date', 'date', 21, 'Progress', NULL),
  ('records_corrected', 'Records Corrected', 'number', 22, 'Progress', NULL),
  ('progress_percent', 'Progress (%)', 'number', 23, 'Progress', NULL),
  ('quality_target_percent', 'Target Quality (%)', 'number', 24, 'Progress', NULL),
  ('progress_log', 'Progress Log', 'table', 25, 'Progress', '[{"value":"date","label":"Date","type":"date"},{"value":"corrected","label":"Records Corrected"},{"value":"remaining","label":"Remaining"},{"value":"comment","label":"Comment"}]'),

  -- Verification
  ('verification_method', 'Verification Method', 'multi_line', 26, 'Verification', NULL),
  ('verified_in', 'Verified In', 'dropdown', 27, 'Verification', '[{"value":"mock_1","label":"Mock 1"},{"value":"mock_2","label":"Mock 2"},{"value":"mock_3","label":"Mock 3"},{"value":"dress_rehearsal","label":"Dress rehearsal"},{"value":"production_extract","label":"Production extract"}]'),
  ('verified_by', 'Verified By', 'user_picker', 28, 'Verification', NULL),
  ('verification_date', 'Verification Date', 'date', 29, 'Verification', NULL),
  ('residual_exceptions', 'Residual Exceptions', 'number', 30, 'Verification', NULL),
  ('residual_risk_accepted', 'Residual Risk Accepted', 'boolean', 31, 'Verification', NULL),

  -- Notes
  ('open_issues', 'Open Issues', 'multi_line', 32, 'Notes', NULL),
  ('notes', 'Notes', 'multi_line', 33, 'Notes', NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000010'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- Product / Data Area uses the Data Scope product list.
UPDATE public.local_register_fields f
SET dropdown_options = s.dropdown_options, updated_at = NOW()
FROM public.local_register_fields s
WHERE f.register_id = '00000000-0000-4000-9001-000000000010'::uuid AND f.field_key = 'product_area'
  AND s.register_id = '00000000-0000-4000-9001-00000000000d'::uuid AND s.field_key = 'product_area';

UPDATE public.local_registers
SET status_workflow = '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"on_hold","label":"On Hold"},{"key":"complete","label":"Complete"},{"key":"verified","label":"Verified"},{"key":"risk_accepted","label":"Closed – Risk Accepted"}]'::jsonb,
    updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000010'::uuid;

-- Check: 34 fields in 6 tabs; product list copied.
SELECT COALESCE(field_group, 'Details') AS tab, count(*) AS fields
FROM public.local_register_fields
WHERE register_id = '00000000-0000-4000-9001-000000000010'::uuid
GROUP BY 1 ORDER BY min(display_order);

-- ============================================================================
-- v1344: Source Systems (FIN pack, Data Migration) — full form with tabs
-- ============================================================================
-- Owner request 2026-11-08: the Source Systems form only had Title / Description / Status. Adds the
-- fields a data migration team needs to track every legacy source, grouped into tabs
-- (field_group = tab; ungrouped fields stay on Details):
--   Details              — system type, vendor / product, version, entities covered, business and
--                          technical owners, migration criticality, migration wave
--   Technical & Access   — hosting, database / platform, extraction method, extract format, who
--                          extracts, access status, access reference (no passwords)
--   Data Profile         — data domains, key tables / files, record count, data volume, history
--                          available, data quality rating, known data issues
--   Extraction & Cutover — extraction runs (table: run, planned / actual date, records, status),
--                          data freeze date, final extract date, extract duration, control totals
--                          source, dependencies
--   Retirement           — disposition after go-live, decommission date, read-only access until,
--                          regulatory retention, archive approach
--   Notes                — open issues, notes
-- Status workflow: Identified → Profiled → Connected → Extracted → Reconciled → Retired (the
-- existing keys identified / connected / extracted are kept, so current records are unaffected).
-- All new fields are optional, vendor-neutral (rule 26). Platform register definition; the Simulator
-- reads the same system register definitions. Seed values: v1345.
-- Prerequisites: v947 (register), v1297 (field_group tabs), v1326 (table type). Idempotent.
-- ============================================================================

INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT '00000000-0000-4000-9001-00000000000e'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM (VALUES
  -- Details
  ('system_type', 'System Type', 'dropdown', 0, NULL, '[{"value":"core_banking","label":"Core banking"},{"value":"card_management","label":"Card management"},{"value":"loan_origination","label":"Loan origination"},{"value":"treasury","label":"Treasury / dealing"},{"value":"trade_finance","label":"Trade finance"},{"value":"payments","label":"Payments"},{"value":"general_ledger","label":"Finance / general ledger"},{"value":"document_imaging","label":"Document imaging"},{"value":"kyc_aml","label":"KYC / AML"},{"value":"digital_channels","label":"Digital channels"},{"value":"identity_access","label":"Identity and access management"},{"value":"crm","label":"CRM"},{"value":"data_warehouse","label":"Data warehouse / reporting"},{"value":"spreadsheet_manual","label":"Spreadsheets / manual records"},{"value":"other","label":"Other"}]'),
  ('vendor_product', 'Vendor / Product', 'text', 1, NULL, NULL),
  ('version_release', 'Version / Release', 'text', 2, NULL, NULL),
  ('entities_covered', 'Entities, Instances or Branches Covered', 'multi_line', 3, NULL, NULL),
  ('business_owner', 'Business Owner', 'user_picker', 4, NULL, NULL),
  ('technical_owner', 'Technical Owner', 'user_picker', 5, NULL, NULL),
  ('migration_criticality', 'Migration Criticality', 'dropdown', 6, NULL, '[{"value":"high","label":"High — financial data or go-live blocker"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]'),
  ('migration_wave', 'Migration Wave / Window', 'text', 7, NULL, NULL),

  -- Technical & Access
  ('hosting', 'Hosting', 'dropdown', 8, 'Technical & Access', '[{"value":"on_premise","label":"On premise"},{"value":"private_cloud","label":"Private cloud"},{"value":"public_cloud","label":"Public cloud"},{"value":"vendor_hosted","label":"Vendor hosted / SaaS"}]'),
  ('database_platform', 'Database / Platform', 'text', 9, 'Technical & Access', NULL),
  ('extraction_method', 'Extraction Method', 'dropdown', 10, 'Technical & Access', '[{"value":"database_extract","label":"Database extract (SQL / scripts)"},{"value":"vendor_utility","label":"Vendor extract utility"},{"value":"file_export","label":"File export"},{"value":"api","label":"API"},{"value":"report_export","label":"Report export"},{"value":"manual","label":"Manual capture"}]'),
  ('extract_format', 'Extract File Format', 'text', 11, 'Technical & Access', NULL),
  ('extraction_responsible', 'Extraction Done By', 'dropdown', 12, 'Technical & Access', '[{"value":"bank","label":"Bank"},{"value":"legacy_system_vendor","label":"Legacy system vendor"},{"value":"migration_partner","label":"Migration partner"},{"value":"shared","label":"Shared"}]'),
  ('access_status', 'Access Status', 'dropdown', 13, 'Technical & Access', '[{"value":"not_requested","label":"Not requested"},{"value":"requested","label":"Requested"},{"value":"granted","label":"Granted"},{"value":"revoked","label":"Revoked"}]'),
  ('access_reference', 'Access / Connection Reference (no passwords)', 'text', 14, 'Technical & Access', NULL),

  -- Data Profile
  ('data_domains', 'Data Domains Held', 'multi_select', 15, 'Data Profile', '[{"value":"customers","label":"Customers"},{"value":"accounts","label":"Accounts"},{"value":"deposits","label":"Deposits"},{"value":"loans","label":"Loans"},{"value":"limits_collateral","label":"Limits and collateral"},{"value":"trade_finance","label":"Trade finance"},{"value":"treasury","label":"Treasury"},{"value":"cards","label":"Cards"},{"value":"payments","label":"Payments and standing orders"},{"value":"general_ledger","label":"General ledger"},{"value":"documents_images","label":"Documents and images"},{"value":"users_security","label":"Users and security"},{"value":"reference_data","label":"Reference data"}]'),
  ('key_data_objects', 'Key Tables / Files', 'multi_line', 16, 'Data Profile', NULL),
  ('estimated_record_count', 'Estimated Record Count', 'number', 17, 'Data Profile', NULL),
  ('data_volume_gb', 'Data Volume (GB)', 'number', 18, 'Data Profile', NULL),
  ('history_available_years', 'History Available (years)', 'number', 19, 'Data Profile', NULL),
  ('data_quality_rating', 'Data Quality Rating', 'dropdown', 20, 'Data Profile', '[{"value":"good","label":"Good"},{"value":"acceptable","label":"Acceptable — cleansing needed"},{"value":"poor","label":"Poor — major cleansing needed"},{"value":"unknown","label":"Not yet profiled"}]'),
  ('known_data_issues', 'Known Data Issues', 'multi_line', 21, 'Data Profile', NULL),

  -- Extraction & Cutover
  ('extraction_runs', 'Extraction Runs', 'table', 22, 'Extraction & Cutover', '[{"value":"run","label":"Run"},{"value":"planned_date","label":"Planned Date","type":"date"},{"value":"actual_date","label":"Actual Date","type":"date"},{"value":"records","label":"Records Extracted"},{"value":"status","label":"Status"}]'),
  ('data_freeze_date', 'Data Freeze Date', 'date', 23, 'Extraction & Cutover', NULL),
  ('final_extract_date', 'Final Extract Date', 'date', 24, 'Extraction & Cutover', NULL),
  ('extract_duration_hours', 'Extract Duration (hours)', 'number', 25, 'Extraction & Cutover', NULL),
  ('control_totals_source', 'Control Totals Source', 'text', 26, 'Extraction & Cutover', NULL),
  ('dependencies', 'Dependencies', 'multi_line', 27, 'Extraction & Cutover', NULL),

  -- Retirement
  ('post_go_live_disposition', 'After Go-Live', 'dropdown', 28, 'Retirement', '[{"value":"decommission","label":"Decommission"},{"value":"read_only","label":"Keep read-only"},{"value":"archive","label":"Archive data, then decommission"},{"value":"keep_active","label":"Keep in use"}]'),
  ('decommission_date', 'Planned Decommission Date', 'date', 29, 'Retirement', NULL),
  ('read_only_access_until', 'Read-Only Access Until', 'date', 30, 'Retirement', NULL),
  ('retention_years', 'Regulatory Retention (years)', 'number', 31, 'Retirement', NULL),
  ('archive_approach', 'Archive Approach', 'multi_line', 32, 'Retirement', NULL),

  -- Notes
  ('open_issues', 'Open Issues', 'multi_line', 33, 'Notes', NULL),
  ('notes', 'Notes', 'multi_line', 34, 'Notes', NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000000e'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"identified","label":"Identified"},{"key":"profiled","label":"Profiled"},{"key":"connected","label":"Connected"},{"key":"extracted","label":"Extracted"},{"key":"reconciled","label":"Reconciled"},{"key":"retired","label":"Retired"}]'::jsonb,
    updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-00000000000e'::uuid;

-- Check: 35 fields in 6 tabs, 6 statuses.
SELECT COALESCE(field_group, 'Details') AS tab, count(*) AS fields
FROM public.local_register_fields
WHERE register_id = '00000000-0000-4000-9001-00000000000e'::uuid
GROUP BY 1 ORDER BY min(display_order);

-- ============================================================================
-- v1317: Data Migration — banking product takeover (Migration Strategy + Data Scope)
-- ============================================================================
-- Owner request 2026-10-23: the Migration Strategy must cater for banking & financial products
-- (the "Data Takeover" sections of the strategy documents shared: customers, accounts, deposits,
-- loans, limits, collateral, treasury, trade finance, securities, GL balances, tellers, users,
-- static data, …) without tying the form to any particular core banking system (rule 26 — neutral
-- names only, no vendor/module names).
--
-- Owner decision (same day): keep the strategy short and capture each product's detailed rules
-- (scope criteria, inclusions/exclusions, numbering, cut-off, uncleared items, steps,
-- reconciliation) as ONE RECORD PER PRODUCT in the existing, still-empty Data Scope register
-- (fin_data_scope, 00000000-0000-4000-9001-00000000000d) — so 30+ products stay a scannable list
-- instead of one very long tab.
--
--   1. Migration Strategy (00000000-0000-4000-9001-00000000000c):
--      * new "Product Takeover" tab: products in scope (searchable multi-select, 38 options),
--        takeover approach, two Yes/No checks;
--      * "Financial Impact & Reconciliation" tab renamed "Migration Accounting & Reconciliation" with
--        migration accounting entries and IFRS 9 fields added;
--      * display order re-sequenced (65 fields, 15 tabs + Details).
--   2. Data Scope: 27 fields on 5 tabs + Details, product-takeover description and statuses.
--      Existing status keys (in_scope, out_of_scope) are kept.
-- Prerequisites: v1316. Idempotent. Platform only (FIN registers are seeded in public only).
-- ============================================================================

-- ── 1a. Migration Strategy: new fields ──────────────────────────────────────────────
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT '00000000-0000-4000-9001-00000000000c'::uuid, v.field_key, v.field_label, v.field_type, v.is_required,
       v.display_order, v.field_group, v.dropdown_options::jsonb
FROM (VALUES
  ('products_in_scope', 'Banking & Financial Products in Scope', 'multi_select', false, 34, 'Product Takeover', '[{"value":"customers_individual_and_corporate","label":"Customers (individual & corporate)"},{"value":"current_and_savings_accounts","label":"Current & savings accounts"},{"value":"term_fixed_deposits","label":"Term / fixed deposits"},{"value":"loans_and_lending_arrangements","label":"Loans & lending arrangements"},{"value":"legacy_loans_and_arrears_past_dues","label":"Legacy loans & arrears / past dues"},{"value":"mortgages","label":"Mortgages"},{"value":"internal_office_accounts","label":"Internal / office accounts"},{"value":"dormant_and_inactive_accounts","label":"Dormant & inactive accounts"},{"value":"credit_limits_and_facilities","label":"Credit limits & facilities"},{"value":"collateral_and_collateral_rights","label":"Collateral & collateral rights"},{"value":"blocked_held_funds_liens","label":"Blocked / held funds (liens)"},{"value":"statement_preferences","label":"Statement preferences"},{"value":"standing_orders","label":"Standing orders"},{"value":"sweeps_and_cash_pooling","label":"Sweeps & cash pooling"},{"value":"cheques_drafts_and_stop_payment_instructions","label":"Cheques, drafts & stop-payment instructions"},{"value":"customer_images_signatures_and_mandates","label":"Customer images, signatures & mandates"},{"value":"cards_debit_credit_prepaid","label":"Cards (debit / credit / prepaid)"},{"value":"treasury_fx_spot_and_forward_deals","label":"Treasury – FX spot & forward deals"},{"value":"money_market_placements_and_borrowings","label":"Money market placements & borrowings"},{"value":"letters_of_credit_issued_and_advised","label":"Letters of credit (issued & advised)"},{"value":"lc_drawings_settlements","label":"LC drawings / settlements"},{"value":"bank_guarantees_issued","label":"Bank guarantees issued"},{"value":"bills_for_collection_discounting","label":"Bills for collection / discounting"},{"value":"securities_custody_accounts","label":"Securities custody accounts"},{"value":"securities_master_instruments","label":"Securities master (instruments)"},{"value":"islamic_banking_products","label":"Islamic banking products"},{"value":"microfinance_group_lending","label":"Microfinance / group lending"},{"value":"insurance_bancassurance","label":"Insurance / bancassurance"},{"value":"general_ledger_pandl_and_customer_balances","label":"General ledger, P&L & customer balances"},{"value":"uncleared_balances_items_in_transit","label":"Uncleared balances / items in transit"},{"value":"teller_ids_tills_and_teller_cash_accounts","label":"Teller IDs, tills & teller cash accounts"},{"value":"customer_delivery_addresses_and_advice_preferences","label":"Customer delivery addresses & advice preferences"},{"value":"bank_identifier_codes_bic_swift_directory","label":"Bank identifier codes (BIC / SWIFT directory)"},{"value":"mobile_and_internet_banking_users","label":"Mobile & internet banking users"},{"value":"user_profiles_user_groups_and_access_rights","label":"User profiles, user groups & access rights"},{"value":"custom_tables_and_templates","label":"Custom tables & templates"},{"value":"static_reference_data_branches_currencies_rates_holidays","label":"Static / reference data (branches, currencies, rates, holidays)"},{"value":"other","label":"Other"}]'),
  ('product_takeover_approach', 'Product Takeover Approach (detailed rules per product are captured in Data Scope)', 'long_text', false, 35, 'Product Takeover', NULL),
  ('balance_reconciliation_by_product', 'Balances Reconciled by Product', 'boolean', false, 36, 'Product Takeover', NULL),
  ('product_owner_signoff_required', 'Product Owner Sign-Off Required', 'boolean', false, 37, 'Product Takeover', NULL),
  ('migration_accounting_entries', 'Migration Accounting Entries (Product – Debit – Credit – Narrative)', 'multi_line', false, 44, 'Migration Accounting & Reconciliation', NULL),
  ('ifrs9_impact', 'IFRS 9 / Expected Credit Loss Impact', 'boolean', false, 46, 'Migration Accounting & Reconciliation', NULL),
  ('ifrs9_data_carried_over', 'IFRS 9 Data Carried Over (e.g. staging, days past due, provisions)', 'multi_line', false, 47, 'Migration Accounting & Reconciliation', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000000c'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── 1b. Migration Strategy: final order and tab names ───────────────────────────────
UPDATE public.local_register_fields f
SET display_order = o.display_order,
    field_group = CASE WHEN f.field_key IN ('financial_impact', 'regulatory_reporting_impacted', 'holding_account_reference', 'reconciliation_approach', 'reconciliation_levels', 'reconciliation_tolerance')
                       THEN 'Migration Accounting & Reconciliation' ELSE f.field_group END,
    updated_at = NOW()
FROM (VALUES
  ('document_reference', 0),
  ('document_version', 1),
  ('document_owner', 2),
  ('system_category', 3),
  ('migration_type', 4),
  ('migration_approach', 5),
  ('target_system', 6),
  ('target_go_live_date', 7),
  ('next_review_date', 8),
  ('introduction', 9),
  ('purpose', 10),
  ('migration_objectives', 11),
  ('in_scope', 12),
  ('out_of_scope', 13),
  ('assumptions', 14),
  ('constraints', 15),
  ('approach_description', 16),
  ('migration_stages', 17),
  ('configuration_dependencies', 18),
  ('system_readiness_checks', 19),
  ('migration_window_start', 20),
  ('migration_window_end', 21),
  ('planned_downtime_hours', 22),
  ('services_impacted', 23),
  ('user_communication_required', 24),
  ('rollback_approach', 25),
  ('data_categories', 26),
  ('data_objects', 27),
  ('source_systems', 28),
  ('migration_tool', 29),
  ('estimated_record_volume', 30),
  ('estimated_data_volume_gb', 31),
  ('mock_runs_planned', 32),
  ('dress_rehearsals_planned', 33),
  ('products_in_scope', 34),
  ('product_takeover_approach', 35),
  ('balance_reconciliation_by_product', 36),
  ('product_owner_signoff_required', 37),
  ('data_integrity_rules', 38),
  ('data_cleansing_approach', 39),
  ('data_standards', 40),
  ('data_quality_target', 41),
  ('data_owner_signoff_required', 42),
  ('financial_impact', 43),
  ('migration_accounting_entries', 44),
  ('regulatory_reporting_impacted', 45),
  ('ifrs9_impact', 46),
  ('ifrs9_data_carried_over', 47),
  ('holding_account_reference', 48),
  ('reconciliation_approach', 49),
  ('reconciliation_levels', 50),
  ('reconciliation_tolerance', 51),
  ('pre_migration_tasks', 52),
  ('post_migration_tasks', 53),
  ('overall_risk_rating', 54),
  ('risks_mitigations', 55),
  ('parties_involved', 56),
  ('roles_responsibilities', 57),
  ('environments', 58),
  ('environment_management', 59),
  ('approvals', 60),
  ('version_history', 61),
  ('glossary', 62),
  ('appendices', 63),
  ('notes', 64)
) AS o(field_key, display_order)
WHERE f.register_id = '00000000-0000-4000-9001-00000000000c'::uuid
  AND f.field_key = o.field_key;

-- ── 2a. Data Scope: purpose and statuses ────────────────────────────────────────────
UPDATE public.local_registers
SET description = 'Data migration scope and takeover rules — one record per product or data area',
    status_workflow = '[{"key":"draft","label":"Draft"},{"key":"in_scope","label":"In Scope"},{"key":"rules_approved","label":"Rules Approved"},{"key":"migrated","label":"Migrated"},{"key":"reconciled","label":"Reconciled & Signed Off"},{"key":"out_of_scope","label":"Out of Scope"}]'::jsonb,
    updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-00000000000d'::uuid;

-- ── 2b. Data Scope: fields ──────────────────────────────────────────────────────────
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT '00000000-0000-4000-9001-00000000000d'::uuid, v.field_key, v.field_label, v.field_type, v.is_required,
       v.display_order, v.field_group, v.dropdown_options::jsonb
FROM (VALUES
  ('product_area', 'Product / Data Area', 'dropdown', true, 0, NULL, '[{"value":"customers_individual_and_corporate","label":"Customers (individual & corporate)"},{"value":"current_and_savings_accounts","label":"Current & savings accounts"},{"value":"term_fixed_deposits","label":"Term / fixed deposits"},{"value":"loans_and_lending_arrangements","label":"Loans & lending arrangements"},{"value":"legacy_loans_and_arrears_past_dues","label":"Legacy loans & arrears / past dues"},{"value":"mortgages","label":"Mortgages"},{"value":"internal_office_accounts","label":"Internal / office accounts"},{"value":"dormant_and_inactive_accounts","label":"Dormant & inactive accounts"},{"value":"credit_limits_and_facilities","label":"Credit limits & facilities"},{"value":"collateral_and_collateral_rights","label":"Collateral & collateral rights"},{"value":"blocked_held_funds_liens","label":"Blocked / held funds (liens)"},{"value":"statement_preferences","label":"Statement preferences"},{"value":"standing_orders","label":"Standing orders"},{"value":"sweeps_and_cash_pooling","label":"Sweeps & cash pooling"},{"value":"cheques_drafts_and_stop_payment_instructions","label":"Cheques, drafts & stop-payment instructions"},{"value":"customer_images_signatures_and_mandates","label":"Customer images, signatures & mandates"},{"value":"cards_debit_credit_prepaid","label":"Cards (debit / credit / prepaid)"},{"value":"treasury_fx_spot_and_forward_deals","label":"Treasury – FX spot & forward deals"},{"value":"money_market_placements_and_borrowings","label":"Money market placements & borrowings"},{"value":"letters_of_credit_issued_and_advised","label":"Letters of credit (issued & advised)"},{"value":"lc_drawings_settlements","label":"LC drawings / settlements"},{"value":"bank_guarantees_issued","label":"Bank guarantees issued"},{"value":"bills_for_collection_discounting","label":"Bills for collection / discounting"},{"value":"securities_custody_accounts","label":"Securities custody accounts"},{"value":"securities_master_instruments","label":"Securities master (instruments)"},{"value":"islamic_banking_products","label":"Islamic banking products"},{"value":"microfinance_group_lending","label":"Microfinance / group lending"},{"value":"insurance_bancassurance","label":"Insurance / bancassurance"},{"value":"general_ledger_pandl_and_customer_balances","label":"General ledger, P&L & customer balances"},{"value":"uncleared_balances_items_in_transit","label":"Uncleared balances / items in transit"},{"value":"teller_ids_tills_and_teller_cash_accounts","label":"Teller IDs, tills & teller cash accounts"},{"value":"customer_delivery_addresses_and_advice_preferences","label":"Customer delivery addresses & advice preferences"},{"value":"bank_identifier_codes_bic_swift_directory","label":"Bank identifier codes (BIC / SWIFT directory)"},{"value":"mobile_and_internet_banking_users","label":"Mobile & internet banking users"},{"value":"user_profiles_user_groups_and_access_rights","label":"User profiles, user groups & access rights"},{"value":"custom_tables_and_templates","label":"Custom tables & templates"},{"value":"static_reference_data_branches_currencies_rates_holidays","label":"Static / reference data (branches, currencies, rates, holidays)"},{"value":"other","label":"Other"}]'),
  ('legacy_source_module', 'Legacy Source System / Module', 'text', false, 1, NULL, NULL),
  ('target_module', 'Target System Module', 'text', false, 2, NULL, NULL),
  ('product_owner', 'Product / Data Owner', 'user_picker', false, 3, NULL, NULL),
  ('migration_strategy_reference', 'Migration Strategy Reference', 'text', false, 4, NULL, NULL),
  ('migration_wave', 'Migration Wave / Phase', 'text', false, 5, NULL, NULL),
  ('scope_criteria', 'Scope Criteria (e.g. product codes or category ranges)', 'multi_line', false, 6, 'Scope & Rules', NULL),
  ('inclusion_rules', 'Inclusion Rules (what will be migrated)', 'multi_line', false, 7, 'Scope & Rules', NULL),
  ('exclusion_rules', 'Exclusion Rules (what will not be migrated)', 'multi_line', false, 8, 'Scope & Rules', NULL),
  ('numbering_key_rules', 'Numbering & Key Rules (new numbers, legacy references kept as alternate keys)', 'multi_line', false, 9, 'Scope & Rules', NULL),
  ('restrictions_carried_over', 'Restrictions, Holds & Narratives Carried Over', 'multi_line', false, 10, 'Scope & Rules', NULL),
  ('special_conditions', 'Special Conditions & Exceptions', 'multi_line', false, 11, 'Scope & Rules', NULL),
  ('target_setup_prerequisites', 'Target Setup Required First (e.g. product conditions, charges, parameters)', 'multi_line', false, 12, 'Prerequisites & Steps', NULL),
  ('freeze_rules', 'Freeze / Blackout Rules Before Go-Live', 'multi_line', false, 13, 'Prerequisites & Steps', NULL),
  ('migration_steps', 'Migration Steps', 'multi_line', false, 14, 'Prerequisites & Steps', NULL),
  ('data_dependencies', 'Dependencies on Other Products / Data', 'multi_line', false, 15, 'Prerequisites & Steps', NULL),
  ('estimated_record_count', 'Estimated Record Count', 'number', false, 16, 'Volumes & Balances', NULL),
  ('estimated_balance_total', 'Estimated Balance Total', 'currency', false, 17, 'Volumes & Balances', NULL),
  ('balance_cutoff_rule', 'Balance Cut-off Rule', 'long_text', false, 18, 'Volumes & Balances', NULL),
  ('uncleared_items_treatment', 'Uncleared Items / Value-Date Treatment', 'long_text', false, 19, 'Volumes & Balances', NULL),
  ('accounting_entries', 'Accounting Entries (Debit – Credit – Narrative)', 'multi_line', false, 20, 'Volumes & Balances', NULL),
  ('reconciliation_checks', 'Reconciliation Checks', 'multi_line', false, 21, 'Reconciliation & Sign-Off', NULL),
  ('balance_reconciliation_required', 'Balance Reconciliation Required', 'boolean', false, 22, 'Reconciliation & Sign-Off', NULL),
  ('product_owner_signed_off', 'Product Owner Signed Off', 'boolean', false, 23, 'Reconciliation & Sign-Off', NULL),
  ('sign_off_date', 'Sign-Off Date', 'date', false, 24, 'Reconciliation & Sign-Off', NULL),
  ('open_issues', 'Open Issues / Dependencies', 'multi_line', false, 25, 'Reconciliation & Sign-Off', NULL),
  ('notes', 'Notes', 'multi_line', false, 26, 'Notes', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000000d'::uuid)
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
  v_fields INT;
  v_tabs   INT;
BEGIN
  SELECT COUNT(*), COUNT(DISTINCT field_group) INTO v_fields, v_tabs
  FROM public.local_register_fields WHERE register_id = '00000000-0000-4000-9001-00000000000c'::uuid;
  RAISE NOTICE 'v1317: Migration Strategy has % fields on % extra tabs (expected 65 / 15)', v_fields, v_tabs;

  SELECT COUNT(*), COUNT(DISTINCT field_group) INTO v_fields, v_tabs
  FROM public.local_register_fields WHERE register_id = '00000000-0000-4000-9001-00000000000d'::uuid;
  RAISE NOTICE 'v1317: Data Scope has % fields on % extra tabs (expected 27 / 5)', v_fields, v_tabs;
END $$;

NOTIFY pgrst, 'reload schema';

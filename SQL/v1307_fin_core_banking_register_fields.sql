-- ============================================================================
-- v1307: Core Banking registers — full field sets, tabs, list fields and Notes
-- ============================================================================
-- Owner request 2026-10-21: complete forms for the five Core Banking registers (FIN pack), with
-- logical tabs, multi-value fields and a Notes tab, modelled on the bank's real working
-- spreadsheets (parameter tracker, environment register, API/interface tracker, delta/
-- customisation tracker). Vendor-specific terms from those sheets are neutralised (rule 26):
-- vendor-supplied defaults -> "Vendor baseline values", initial configuration stage ->
-- "Initial Configuration Stage", API collections -> "Specification / Collection Reference".
--
--   …9001-…007  fin_product_configuration     Product Configuration
--   …9001-…008  fin_parameterisation          Parameterisation
--   …9001-…009  fin_core_banking_interfaces   Interfaces
--   …9001-…00a  fin_core_banking_environments Environments
--   …9001-…00b  fin_customisation             Customisation
--
-- Conventions (as v1296-v1305): Title / Description / Status are built in; field_group = tab
-- (NULL = Details); tabs follow each group's first display_order; each list ('multi_line') field
-- sits on its own tab; 'multi_select' reuses dropdown_options. The four existing v947 dropdowns
-- (product_area, parameter_type, interface_type, environment) keep their key and options.
-- Environments: connection fields are for host names, addresses and ports only — never
-- passwords or secrets.
-- Prerequisites: v947, v1297 (field_group), v1299 (multi_line), v1304 (multi_select).
-- Idempotent: ON CONFLICT (register_id, field_key) DO UPDATE.
-- ============================================================================

INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT v.register_id::uuid, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order,
       v.field_group, v.dropdown_options::jsonb
FROM (VALUES
  -- ══ Product Configuration (…007) ══════════════════════════════════════════════════
  -- Details
  ('00000000-0000-4000-9001-000000000007', 'product_area', 'Product Area', 'dropdown', false, 0, NULL,
    '[{"label":"Deposits","value":"deposits"},{"label":"Lending","value":"lending"},{"label":"Payments","value":"payments"},{"label":"Customer","value":"customer"},{"label":"Fees / Charges","value":"fees_charges"}]'),
  ('00000000-0000-4000-9001-000000000007', 'product_type', 'Product Type', 'dropdown', true, 1, NULL,
    '[{"value":"current_account","label":"Current Account"},{"value":"savings","label":"Savings Account"},{"value":"term_deposit","label":"Term / Fixed Deposit"},{"value":"call_deposit","label":"Call / Notice Deposit"},{"value":"personal_loan","label":"Personal Loan"},{"value":"mortgage","label":"Mortgage"},{"value":"overdraft","label":"Overdraft"},{"value":"asset_finance","label":"Asset Finance"},{"value":"business_loan","label":"Business / Term Loan"},{"value":"trade_finance","label":"Trade Finance"},{"value":"other","label":"Other"}]'),
  ('00000000-0000-4000-9001-000000000007', 'product_code', 'Product Code', 'text', true, 2, NULL, NULL),
  ('00000000-0000-4000-9001-000000000007', 'business_area', 'Business Area', 'dropdown', false, 3, NULL,
    '[{"value":"retail","label":"Retail"},{"value":"sme","label":"SME"},{"value":"corporate","label":"Corporate"},{"value":"private_wealth","label":"Private & Wealth"},{"value":"all","label":"All"}]'),
  ('00000000-0000-4000-9001-000000000007', 'product_owner', 'Product Owner', 'user_picker', false, 4, NULL, NULL),
  ('00000000-0000-4000-9001-000000000007', 'configuration_analyst', 'Configuration Analyst', 'user_picker', false, 5, NULL, NULL),
  ('00000000-0000-4000-9001-000000000007', 'release_wave', 'Release / Wave', 'text', false, 6, NULL, NULL),
  -- Features & Pricing
  ('00000000-0000-4000-9001-000000000007', 'currencies', 'Currencies', 'text', false, 7, 'Features & Pricing', NULL),
  ('00000000-0000-4000-9001-000000000007', 'interest_basis', 'Interest Basis', 'dropdown', false, 8, 'Features & Pricing',
    '[{"value":"none","label":"No Interest"},{"value":"fixed","label":"Fixed"},{"value":"variable","label":"Variable"},{"value":"tiered","label":"Tiered"},{"value":"linked","label":"Linked to Reference Rate"}]'),
  ('00000000-0000-4000-9001-000000000007', 'interest_rate_range', 'Interest Rate / Range', 'text', false, 9, 'Features & Pricing', NULL),
  ('00000000-0000-4000-9001-000000000007', 'minimum_balance', 'Minimum Balance / Amount', 'currency', false, 10, 'Features & Pricing', NULL),
  ('00000000-0000-4000-9001-000000000007', 'maximum_limit', 'Maximum Balance / Limit', 'currency', false, 11, 'Features & Pricing', NULL),
  ('00000000-0000-4000-9001-000000000007', 'term_range', 'Term Range', 'text', false, 12, 'Features & Pricing', NULL),
  ('00000000-0000-4000-9001-000000000007', 'channels', 'Available Channels', 'multi_select', false, 13, 'Features & Pricing',
    '[{"value":"branch","label":"Branch"},{"value":"internet","label":"Internet Banking"},{"value":"mobile","label":"Mobile Banking"},{"value":"atm","label":"ATM"},{"value":"pos","label":"Point of Sale"},{"value":"contact_centre","label":"Contact Centre"},{"value":"agent","label":"Agent Banking"}]'),
  -- Lists, one tab each
  ('00000000-0000-4000-9001-000000000007', 'fees_charges', 'Fees & Charges', 'multi_line', false, 14, 'Fees & Charges', NULL),
  ('00000000-0000-4000-9001-000000000007', 'eligibility_rules', 'Eligibility Rules', 'multi_line', false, 15, 'Eligibility Rules', NULL),
  ('00000000-0000-4000-9001-000000000007', 'gl_mappings', 'General Ledger Mappings', 'multi_line', false, 16, 'GL Mapping', NULL),
  -- Legacy Mapping
  ('00000000-0000-4000-9001-000000000007', 'migration_approach', 'Migration Approach', 'dropdown', false, 17, 'Legacy Mapping',
    '[{"value":"migrate_as_is","label":"Migrate As-Is"},{"value":"map_to_new","label":"Map to New Product"},{"value":"close_and_reopen","label":"Close and Re-open"},{"value":"retire","label":"Retire (No Migration)"},{"value":"new_product","label":"New Product (No Legacy)"}]'),
  ('00000000-0000-4000-9001-000000000007', 'legacy_product_codes', 'Legacy Product Codes', 'multi_line', false, 18, 'Legacy Mapping', NULL),
  -- Configuration & Sign-Off
  ('00000000-0000-4000-9001-000000000007', 'configuration_start_date', 'Configuration Start Date', 'date', false, 19, 'Configuration & Sign-Off', NULL),
  ('00000000-0000-4000-9001-000000000007', 'configuration_complete_date', 'Configuration Complete Date', 'date', false, 20, 'Configuration & Sign-Off', NULL),
  ('00000000-0000-4000-9001-000000000007', 'test_reference', 'Test Case / Evidence Reference', 'text', false, 21, 'Configuration & Sign-Off', NULL),
  ('00000000-0000-4000-9001-000000000007', 'business_sign_off', 'Business Sign-Off Obtained', 'boolean', false, 22, 'Configuration & Sign-Off', NULL),
  ('00000000-0000-4000-9001-000000000007', 'signed_off_by', 'Signed Off By', 'user_picker', false, 23, 'Configuration & Sign-Off', NULL),
  ('00000000-0000-4000-9001-000000000007', 'sign_off_date', 'Sign-Off Date', 'date', false, 24, 'Configuration & Sign-Off', NULL),
  ('00000000-0000-4000-9001-000000000007', 'notes', 'Notes', 'multi_line', false, 25, 'Notes', NULL),

  -- ══ Parameterisation (…008) ═══════════════════════════════════════════════════════
  -- Details
  ('00000000-0000-4000-9001-000000000008', 'parameter_type', 'Parameter Type', 'dropdown', false, 0, NULL,
    '[{"label":"Global Parameters","value":"global"},{"label":"Product Parameters","value":"product"},{"label":"Branch Parameters","value":"branch"},{"label":"Accounting Parameters","value":"accounting"}]'),
  ('00000000-0000-4000-9001-000000000008', 'parameter_category', 'Category', 'dropdown', true, 1, NULL,
    '[{"value":"base_prerequisites","label":"Base Setup Prerequisites"},{"value":"accounts_deposits","label":"Accounts & Deposits"},{"value":"lending","label":"Lending"},{"value":"payments","label":"Payments"},{"value":"customer","label":"Customer"},{"value":"financial_accounting","label":"Financial Accounting"},{"value":"document_management","label":"Document Management"},{"value":"security_access","label":"Security & Access"},{"value":"other","label":"Other"}]'),
  ('00000000-0000-4000-9001-000000000008', 'parameter_table_name', 'Parameter Table Name', 'text', true, 2, NULL, NULL),
  ('00000000-0000-4000-9001-000000000008', 'business_area', 'Business Area', 'dropdown', false, 3, NULL,
    '[{"value":"retail","label":"Retail"},{"value":"corporate","label":"Corporate"},{"value":"finance","label":"Finance"},{"value":"operations","label":"Operations"},{"value":"all","label":"All"}]'),
  ('00000000-0000-4000-9001-000000000008', 'configuration_stage', 'Configuration Stage', 'dropdown', false, 4, NULL,
    '[{"value":"initial","label":"Initial Configuration Stage"},{"value":"build","label":"Build Stage Configuration"},{"value":"not_configured","label":"Will Not Be Configured"}]'),
  ('00000000-0000-4000-9001-000000000008', 'data_received', 'Data Received', 'dropdown', false, 5, NULL,
    '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"},{"value":"vendor_baseline","label":"Vendor Baseline Values"},{"value":"not_applicable","label":"Not Applicable"},{"value":"duplicate","label":"Duplicate"}]'),
  ('00000000-0000-4000-9001-000000000008', 'person_responsible', 'Person Responsible', 'user_picker', false, 6, NULL, NULL),
  ('00000000-0000-4000-9001-000000000008', 'business_owner', 'Business Owner', 'user_picker', false, 7, NULL, NULL),
  -- Lists, one tab each
  ('00000000-0000-4000-9001-000000000008', 'parameter_values', 'Parameter Values / Records', 'multi_line', false, 8, 'Parameter Values', NULL),
  ('00000000-0000-4000-9001-000000000008', 'dependent_parameters', 'Dependent Parameter Tables', 'multi_line', false, 9, 'Dependencies', NULL),
  -- Authorisation & Testing
  ('00000000-0000-4000-9001-000000000008', 'values_authorised', 'Values Authorised', 'boolean', false, 10, 'Authorisation & Testing', NULL),
  ('00000000-0000-4000-9001-000000000008', 'authorised_by', 'Authorised By', 'user_picker', false, 11, 'Authorisation & Testing', NULL),
  ('00000000-0000-4000-9001-000000000008', 'authorised_date', 'Authorised Date', 'date', false, 12, 'Authorisation & Testing', NULL),
  ('00000000-0000-4000-9001-000000000008', 'configured_date', 'Configured Date', 'date', false, 13, 'Authorisation & Testing', NULL),
  ('00000000-0000-4000-9001-000000000008', 'tested_date', 'Tested Date', 'date', false, 14, 'Authorisation & Testing', NULL),
  ('00000000-0000-4000-9001-000000000008', 'test_reference', 'Test Case / Evidence Reference', 'text', false, 15, 'Authorisation & Testing', NULL),
  ('00000000-0000-4000-9001-000000000008', 'notes', 'Notes / Final Comments', 'multi_line', false, 16, 'Notes', NULL),

  -- ══ Interfaces (…009) ═════════════════════════════════════════════════════════════
  -- Details
  ('00000000-0000-4000-9001-000000000009', 'interface_type', 'Interface Type', 'dropdown', false, 0, NULL,
    '[{"label":"Upstream System","value":"upstream"},{"label":"Downstream System","value":"downstream"},{"label":"File Interface","value":"file"},{"label":"API","value":"api"}]'),
  ('00000000-0000-4000-9001-000000000009', 'interface_reference', 'Interface / Use Case Reference', 'text', true, 1, NULL, NULL),
  ('00000000-0000-4000-9001-000000000009', 'provider_consumer', 'Provider / Consumer', 'dropdown', false, 2, NULL,
    '[{"value":"provider","label":"Provider (core exposes the service)"},{"value":"consumer","label":"Consumer (core calls the service)"},{"value":"both","label":"Both"}]'),
  ('00000000-0000-4000-9001-000000000009', 'connected_system', 'Connected System', 'text', true, 3, NULL, NULL),
  ('00000000-0000-4000-9001-000000000009', 'interface_owner', 'Owner', 'user_picker', false, 4, NULL, NULL),
  ('00000000-0000-4000-9001-000000000009', 'business_analyst', 'Business Analyst', 'user_picker', false, 5, NULL, NULL),
  -- Technical Specification
  ('00000000-0000-4000-9001-000000000009', 'technology', 'Technology / Protocol', 'dropdown', false, 6, 'Technical Specification',
    '[{"value":"rest","label":"REST API"},{"value":"soap","label":"SOAP Web Service"},{"value":"iso20022","label":"ISO 20022 Messaging"},{"value":"iso8583","label":"ISO 8583 Card Messaging"},{"value":"file_batch","label":"File / Batch Transfer"},{"value":"message_queue","label":"Message Queue"},{"value":"database","label":"Database Link"}]'),
  ('00000000-0000-4000-9001-000000000009', 'frequency', 'Frequency', 'dropdown', false, 7, 'Technical Specification',
    '[{"value":"real_time","label":"Real-Time"},{"value":"intraday","label":"Intraday Batch"},{"value":"end_of_day","label":"End of Day"},{"value":"periodic","label":"Weekly / Monthly"},{"value":"on_demand","label":"On Demand"}]'),
  ('00000000-0000-4000-9001-000000000009', 'specification_reference', 'Specification / Collection Reference', 'text', false, 8, 'Technical Specification', NULL),
  ('00000000-0000-4000-9001-000000000009', 'data_format', 'Data Format', 'text', false, 9, 'Technical Specification', NULL),
  ('00000000-0000-4000-9001-000000000009', 'security_method', 'Security Method', 'dropdown', false, 10, 'Technical Specification',
    '[{"value":"mutual_tls","label":"Mutual TLS"},{"value":"oauth2","label":"OAuth 2.0"},{"value":"api_key","label":"API Key"},{"value":"vpn","label":"Site-to-Site VPN"},{"value":"sftp_keys","label":"SFTP with Keys"},{"value":"none","label":"None"}]'),
  ('00000000-0000-4000-9001-000000000009', 'peak_daily_volume', 'Peak Daily Volume', 'number', false, 11, 'Technical Specification', NULL),
  -- Lists, one tab each
  ('00000000-0000-4000-9001-000000000009', 'data_elements', 'Key Data Elements', 'multi_line', false, 12, 'Data Elements', NULL),
  ('00000000-0000-4000-9001-000000000009', 'dependencies', 'Dependencies', 'multi_line', false, 13, 'Dependencies', NULL),
  -- Testing & Deployment
  ('00000000-0000-4000-9001-000000000009', 'change_reference', 'Change / Delta Reference', 'text', false, 14, 'Testing & Deployment', NULL),
  ('00000000-0000-4000-9001-000000000009', 'sit_status', 'SIT Status', 'dropdown', false, 15, 'Testing & Deployment',
    '[{"value":"not_started","label":"Not Started"},{"value":"in_progress","label":"In Progress"},{"value":"passed","label":"Passed"},{"value":"failed","label":"Failed"},{"value":"deployed","label":"Deployed"}]'),
  ('00000000-0000-4000-9001-000000000009', 'uat_status', 'UAT Status', 'dropdown', false, 16, 'Testing & Deployment',
    '[{"value":"not_started","label":"Not Started"},{"value":"in_progress","label":"In Progress"},{"value":"passed","label":"Passed"},{"value":"failed","label":"Failed"},{"value":"deployed","label":"Deployed"}]'),
  ('00000000-0000-4000-9001-000000000009', 'deployment_date', 'Deployment Date', 'date', false, 17, 'Testing & Deployment', NULL),
  ('00000000-0000-4000-9001-000000000009', 'business_pack_delivered', 'Business Pack Delivered', 'boolean', false, 18, 'Testing & Deployment', NULL),
  ('00000000-0000-4000-9001-000000000009', 'menu_delivered', 'Menu Delivered', 'boolean', false, 19, 'Testing & Deployment', NULL),
  ('00000000-0000-4000-9001-000000000009', 'menu_name', 'Menu Name', 'text', false, 20, 'Testing & Deployment', NULL),
  ('00000000-0000-4000-9001-000000000009', 'notes', 'Notes', 'multi_line', false, 21, 'Notes', NULL),

  -- ══ Environments (…00a) ═══════════════════════════════════════════════════════════
  -- Details
  ('00000000-0000-4000-9001-00000000000a', 'environment', 'Environment', 'dropdown', false, 0, NULL,
    '[{"label":"Development","value":"development"},{"label":"SIT","value":"sit"},{"label":"UAT","value":"uat"},{"label":"Pre-Production","value":"pre_production"},{"label":"Production","value":"production"},{"label":"DR","value":"dr"}]'),
  ('00000000-0000-4000-9001-00000000000a', 'component', 'Component', 'dropdown', false, 1, NULL,
    '[{"value":"core_banking","label":"Core Banking"},{"value":"channels","label":"Digital Channels"},{"value":"atm_card","label":"ATM / Card"},{"value":"integration","label":"Integration / Middleware"},{"value":"reporting","label":"Reporting / Data"},{"value":"other","label":"Other"}]'),
  ('00000000-0000-4000-9001-00000000000a', 'used_by', 'Used By', 'text', false, 2, NULL, NULL),
  ('00000000-0000-4000-9001-00000000000a', 'site', 'Hosting Site', 'dropdown', false, 3, NULL,
    '[{"value":"primary_dc","label":"Primary Data Centre"},{"value":"secondary_dc","label":"Secondary / DR Data Centre"},{"value":"cloud","label":"Cloud"},{"value":"vendor","label":"Vendor Hosted"}]'),
  ('00000000-0000-4000-9001-00000000000a', 'environment_owner', 'Environment Owner', 'user_picker', false, 4, NULL, NULL),
  -- Connection Details (no passwords or secrets)
  ('00000000-0000-4000-9001-00000000000a', 'host_name', 'Host / Server Name', 'text', false, 5, 'Connection Details', NULL),
  ('00000000-0000-4000-9001-00000000000a', 'ip_address', 'IP Address', 'text', false, 6, 'Connection Details', NULL),
  ('00000000-0000-4000-9001-00000000000a', 'mount_point', 'Mount Point', 'text', false, 7, 'Connection Details', NULL),
  ('00000000-0000-4000-9001-00000000000a', 'http_port', 'HTTP Port', 'number', false, 8, 'Connection Details', NULL),
  ('00000000-0000-4000-9001-00000000000a', 'https_port', 'HTTPS Port', 'number', false, 9, 'Connection Details', NULL),
  ('00000000-0000-4000-9001-00000000000a', 'application_url', 'Application URL', 'text', false, 10, 'Connection Details', NULL),
  -- Database
  ('00000000-0000-4000-9001-00000000000a', 'db_host', 'Database Host / IP Address', 'text', false, 11, 'Database', NULL),
  ('00000000-0000-4000-9001-00000000000a', 'db_port', 'Database Port', 'number', false, 12, 'Database', NULL),
  ('00000000-0000-4000-9001-00000000000a', 'db_name', 'Database Name', 'text', false, 13, 'Database', NULL),
  ('00000000-0000-4000-9001-00000000000a', 'db_engine', 'Database Engine / Version', 'text', false, 14, 'Database', NULL),
  -- Availability & Refresh
  ('00000000-0000-4000-9001-00000000000a', 'requested_date', 'Requested Date', 'date', false, 15, 'Availability & Refresh', NULL),
  ('00000000-0000-4000-9001-00000000000a', 'provisioned_date', 'Provisioned Date', 'date', false, 16, 'Availability & Refresh', NULL),
  ('00000000-0000-4000-9001-00000000000a', 'available_from', 'Available From', 'date', false, 17, 'Availability & Refresh', NULL),
  ('00000000-0000-4000-9001-00000000000a', 'available_to', 'Available To', 'date', false, 18, 'Availability & Refresh', NULL),
  ('00000000-0000-4000-9001-00000000000a', 'refresh_frequency', 'Refresh Frequency', 'dropdown', false, 19, 'Availability & Refresh',
    '[{"value":"none","label":"No Refresh"},{"value":"weekly","label":"Weekly"},{"value":"per_release","label":"Per Release"},{"value":"on_demand","label":"On Demand"}]'),
  ('00000000-0000-4000-9001-00000000000a', 'last_refresh_date', 'Last Refresh Date', 'date', false, 20, 'Availability & Refresh', NULL),
  ('00000000-0000-4000-9001-00000000000a', 'deployed_build', 'Deployed Build / Release', 'text', false, 21, 'Availability & Refresh', NULL),
  -- Lists, one tab each
  ('00000000-0000-4000-9001-00000000000a', 'user_access', 'Teams / Users with Access', 'multi_line', false, 22, 'Access', NULL),
  ('00000000-0000-4000-9001-00000000000a', 'notes', 'Notes', 'multi_line', false, 23, 'Notes', NULL),

  -- ══ Customisation (…00b) ══════════════════════════════════════════════════════════
  -- Details
  ('00000000-0000-4000-9001-00000000000b', 'delta_reference', 'Delta / Change Reference', 'text', true, 0, NULL, NULL),
  ('00000000-0000-4000-9001-00000000000b', 'scope', 'Scope', 'dropdown', false, 1, NULL,
    '[{"value":"all","label":"All"},{"value":"retail","label":"Retail"},{"value":"corporate","label":"Corporate"},{"value":"channels","label":"Channels"},{"value":"back_office","label":"Back Office"}]'),
  ('00000000-0000-4000-9001-00000000000b', 'business_area', 'Business Area', 'dropdown', false, 2, NULL,
    '[{"value":"retail_corporate","label":"Retail & Corporate"},{"value":"retail","label":"Retail"},{"value":"corporate","label":"Corporate"},{"value":"treasury","label":"Treasury"},{"value":"operations","label":"Operations"},{"value":"finance","label":"Finance"},{"value":"all","label":"All"}]'),
  ('00000000-0000-4000-9001-00000000000b', 'initial_delivery_phase', 'Initial Planned Delivery Phase', 'text', false, 3, NULL, NULL),
  ('00000000-0000-4000-9001-00000000000b', 'business_analyst', 'Business Analyst', 'user_picker', false, 4, NULL, NULL),
  ('00000000-0000-4000-9001-00000000000b', 'priority', 'Priority', 'dropdown', false, 5, NULL,
    '[{"value":"must","label":"Must Have"},{"value":"should","label":"Should Have"},{"value":"could","label":"Could Have"}]'),
  ('00000000-0000-4000-9001-00000000000b', 'change_board_status', 'Change Board Status', 'dropdown', false, 6, NULL,
    '[{"value":"submitted","label":"Submitted"},{"value":"approved","label":"Approved"},{"value":"deferred","label":"Deferred"},{"value":"rejected","label":"Rejected"}]'),
  -- Lists, one tab each
  ('00000000-0000-4000-9001-00000000000b', 'business_justification', 'Business Justification', 'multi_line', false, 7, 'Justification', NULL),
  ('00000000-0000-4000-9001-00000000000b', 'dependent_deltas', 'Duplicate & Dependent Deltas', 'multi_line', false, 8, 'Dependent Deltas', NULL),
  -- Integration Dependencies
  ('00000000-0000-4000-9001-00000000000b', 'integration_dependency_available', 'Integration Dependency Available', 'boolean', false, 9, 'Integration Dependencies', NULL),
  ('00000000-0000-4000-9001-00000000000b', 'integration_dependency_details', 'Integration Dependency Details', 'multi_line', false, 10, 'Integration Dependencies', NULL),
  -- Delivery & Readiness
  ('00000000-0000-4000-9001-00000000000b', 'deployment_status', 'Deployment Status', 'dropdown', false, 11, 'Delivery & Readiness',
    '[{"value":"not_started","label":"Not Started"},{"value":"in_development","label":"In Development"},{"value":"pending","label":"Pending"},{"value":"deployed_for_testing","label":"Deployed for Testing"},{"value":"deployed_to_production","label":"Deployed to Production"}]'),
  ('00000000-0000-4000-9001-00000000000b', 'eta', 'ETA', 'date', false, 12, 'Delivery & Readiness', NULL),
  ('00000000-0000-4000-9001-00000000000b', 'estimated_effort_days', 'Estimated Effort (days)', 'number', false, 13, 'Delivery & Readiness', NULL),
  ('00000000-0000-4000-9001-00000000000b', 'estimated_cost', 'Estimated Cost', 'currency', false, 14, 'Delivery & Readiness', NULL),
  ('00000000-0000-4000-9001-00000000000b', 'ready_for_testing', 'Ready for Testing', 'boolean', false, 15, 'Delivery & Readiness', NULL),
  -- Quality Checks
  ('00000000-0000-4000-9001-00000000000b', 'user_manual_required', 'User Manual Required', 'boolean', false, 16, 'Quality Checks', NULL),
  ('00000000-0000-4000-9001-00000000000b', 'user_manual_available', 'User Manual Available', 'boolean', false, 17, 'Quality Checks', NULL),
  ('00000000-0000-4000-9001-00000000000b', 'sanity_check_required', 'Sanity Check Required', 'boolean', false, 18, 'Quality Checks', NULL),
  ('00000000-0000-4000-9001-00000000000b', 'sanity_check_status', 'Sanity Check Status', 'dropdown', false, 19, 'Quality Checks',
    '[{"value":"not_applicable","label":"Not Applicable"},{"value":"pending","label":"Pending"},{"value":"passed","label":"Passed"},{"value":"failed","label":"Failed"}]'),
  ('00000000-0000-4000-9001-00000000000b', 'walkthrough_required', 'Walkthrough Required', 'boolean', false, 20, 'Quality Checks', NULL),
  ('00000000-0000-4000-9001-00000000000b', 'walkthrough_status', 'Walkthrough Status', 'dropdown', false, 21, 'Quality Checks',
    '[{"value":"not_applicable","label":"Not Applicable"},{"value":"pending","label":"Pending"},{"value":"done","label":"Done"}]'),
  ('00000000-0000-4000-9001-00000000000b', 'notes', 'Notes / Remarks', 'multi_line', false, 22, 'Notes', NULL)
) AS v(register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
JOIN public.local_registers lr ON lr.id = v.register_id::uuid
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
  r RECORD;
BEGIN
  FOR r IN
    SELECT lr.label, COUNT(f.id) AS fields, COUNT(DISTINCT f.field_group) AS tabs
    FROM public.local_registers lr
    LEFT JOIN public.local_register_fields f ON f.register_id = lr.id
    WHERE lr.id::text BETWEEN '00000000-0000-4000-9001-000000000007' AND '00000000-0000-4000-9001-00000000000b'
    GROUP BY lr.label ORDER BY lr.label
  LOOP
    RAISE NOTICE 'v1307: % — % fields, % extra tabs', r.label, r.fields, r.tabs;
  END LOOP;
END $$;

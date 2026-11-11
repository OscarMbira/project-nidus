-- ============================================================================
-- v1411: Build, Integration & Data registers — full forms with tabs (Information Technology)
-- ============================================================================
-- Owner request 2026-11-11: best-practice fields, in logical tabs, for the eight Information Technology registers under Environments, Development, Interfaces and Data, which had only Title / Description / Status:
--   Environments (ict_environments): 20 fields — Details · Configuration · Access & Bookings · Health & Cost · Notes
--   Development Items (ict_development_items): 21 fields — Details · Requirements · Effort & Dates · Build & Quality · Dependencies · Notes
--   Code Reviews (ict_code_reviews): 17 fields — Details · Reviewers · Size & Checks · Findings · Notes
--   Interface Register (ict_interface_register): 21 fields — Details · Specification · Volumes & Service Levels · Security · Testing · Notes
--   Integration Dependencies (ict_integration_dependencies): 15 fields — Details · Dates & Impact · Actions · Notes
--   Data Sources (ict_data_sources): 20 fields — Details · Access · Quality · Classification · Notes
--   Data Models (ict_data_models): 17 fields — Details · Entities · Rules & Standards · Lineage · Approval · Notes
--   Data Migration (ict_data_migration): 20 fields — Details · Volumes · Reconciliation · Mocks & Sign-Off · Notes
-- Lists with several parts per line are tables (rule 67.1), with dropdown columns where the values are a
-- short fixed list. Effort variance, load and reject rates, balance differences and data quality scores are calculated fields, worked out on save.
-- Status workflows keep their existing keys and gain the states each register needs. No records exist
-- yet for these registers, so no saved values change. All fields optional, vendor-neutral (rule 26).
-- Platform register definitions, the Simulator reads the same system register definitions.
-- Sample records: v1412. Prerequisites: v949, v1326, v1375 and the v1339 average calculation in the app. Idempotent.
-- ============================================================================

BEGIN;

-- ── Environments (ict_environments) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9003-000000000012'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('environment_code', 'Environment Code', 'text', 0, NULL, NULL, NULL),
  ('environment_type', 'Environment Type', 'dropdown', 1, NULL, '[{"value":"development","label":"Development"},{"value":"test","label":"System Test"},{"value":"sit","label":"SIT"},{"value":"uat","label":"UAT"},{"value":"performance","label":"Performance"},{"value":"migration","label":"Migration Rehearsal"},{"value":"training","label":"Training"},{"value":"pre_production","label":"Pre-Production"},{"value":"production","label":"Production"},{"value":"dr","label":"Disaster Recovery"}]', NULL),
  ('purpose', 'Purpose', 'long_text', 2, NULL, NULL, NULL),
  ('environment_owner', 'Environment Owner', 'text', 3, NULL, NULL, NULL),
  ('hosting', 'Hosting', 'dropdown', 4, NULL, '[{"value":"on_premises","label":"On-premises"},{"value":"private_cloud","label":"Private cloud"},{"value":"public_cloud","label":"Public cloud"},{"value":"hybrid","label":"Hybrid"}]', NULL),
  ('location', 'Data Centre / Region', 'text', 5, NULL, NULL, NULL),
  ('needed_by', 'Needed By', 'date', 6, NULL, NULL, NULL),
  ('ready_date', 'Ready Date', 'date', 7, NULL, NULL, NULL),
  ('application_version', 'Application Version / Release', 'text', 8, 'Configuration', NULL, NULL),
  ('components', 'Components', 'table', 9, 'Configuration', '[{"value":"component","label":"Component"},{"value":"version","label":"Version"},{"value":"notes","label":"Notes"}]', NULL),
  ('test_data', 'Test Data', 'dropdown', 10, 'Configuration', '[{"value":"none","label":"None"},{"value":"synthetic","label":"Synthetic"},{"value":"masked_production","label":"Masked production copy"},{"value":"production","label":"Production data"}]', NULL),
  ('last_refresh', 'Last Data Refresh', 'date', 11, 'Configuration', NULL, NULL),
  ('refresh_frequency', 'Refresh Frequency', 'dropdown', 12, 'Configuration', '[{"value":"on_request","label":"On request"},{"value":"weekly","label":"Weekly"},{"value":"monthly","label":"Monthly"},{"value":"per_mock","label":"Per mock migration"},{"value":"not_applicable","label":"Not applicable"}]', NULL),
  ('access_approver', 'Access Approver', 'text', 13, 'Access & Bookings', NULL, NULL),
  ('named_users', 'Named Users', 'number', 14, 'Access & Bookings', NULL, NULL),
  ('bookings', 'Bookings', 'table', 15, 'Access & Bookings', '[{"value":"team","label":"Team"},{"value":"from","label":"From","type":"date"},{"value":"to","label":"To","type":"date"},{"value":"purpose","label":"Purpose"}]', NULL),
  ('availability_target', 'Availability Target (%)', 'number', 16, 'Health & Cost', NULL, NULL),
  ('monthly_cost', 'Monthly Running Cost', 'currency', 17, 'Health & Cost', NULL, NULL),
  ('issues', 'Issues', 'table', 18, 'Health & Cost', '[{"value":"issue","label":"Issue"},{"value":"severity","label":"Severity","type":"select","options":["High","Medium","Low"]},{"value":"owner","label":"Owner"},{"value":"status","label":"Status","type":"select","options":["Open","In Progress","Closed"]}]', NULL),
  ('notes', 'Notes', 'long_text', 19, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9003-000000000012'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"not_provisioned","label":"Not Provisioned"},{"key":"provisioned","label":"Provisioned"},{"key":"ready","label":"Ready"},{"key":"in_use","label":"In Use"},{"key":"issue","label":"Issue"},{"key":"decommissioned","label":"Decommissioned"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9003-000000000012'::uuid;

-- ── Development Items (ict_development_items) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9003-000000000013'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('item_reference', 'Item Reference', 'text', 0, NULL, NULL, NULL),
  ('item_type', 'Item Type', 'dropdown', 1, NULL, '[{"value":"feature","label":"Feature"},{"value":"component","label":"Component"},{"value":"service","label":"Service"},{"value":"api","label":"API"},{"value":"configuration","label":"Configuration"},{"value":"report","label":"Report"},{"value":"interface","label":"Interface"},{"value":"data_conversion","label":"Data conversion"},{"value":"bug_fix","label":"Bug fix"}]', NULL),
  ('workstream', 'Workstream', 'dropdown', 2, NULL, '[{"value":"customer_channels","label":"Customer and digital channels"},{"value":"payments","label":"Payments and transfers"},{"value":"lending","label":"Lending, limits and collateral"},{"value":"deposits","label":"Deposits and accounts"},{"value":"data_migration","label":"Data migration and quality"},{"value":"integration","label":"Integration and interfaces"},{"value":"cybersecurity","label":"Cybersecurity and access"},{"value":"environments","label":"Environments and release"},{"value":"operational_readiness","label":"Operational readiness and hypercare"}]', NULL),
  ('priority', 'Priority', 'dropdown', 3, NULL, '[{"value":"must","label":"Must have"},{"value":"should","label":"Should have"},{"value":"could","label":"Could have"},{"value":"wont","label":"Will not have (this release)"}]', NULL),
  ('developer', 'Developer', 'text', 4, NULL, NULL, NULL),
  ('sprint', 'Sprint', 'text', 5, NULL, NULL, NULL),
  ('requirements', 'Requirements', 'table', 6, 'Requirements', '[{"value":"reference","label":"Reference"},{"value":"requirement","label":"Requirement"}]', NULL),
  ('acceptance_criteria', 'Acceptance Criteria', 'multi_line', 7, 'Requirements', NULL, NULL),
  ('story_points', 'Story Points', 'number', 8, 'Effort & Dates', NULL, NULL),
  ('estimate_hours', 'Estimate (hours)', 'number', 9, 'Effort & Dates', NULL, NULL),
  ('actual_hours', 'Actual (hours)', 'number', 10, 'Effort & Dates', NULL, NULL),
  ('effort_variance', 'Effort Variance (hours)', 'number', 11, 'Effort & Dates', NULL, '{"op":"difference","minuend":"actual_hours","subtrahend":"estimate_hours"}'),
  ('start_date', 'Start Date', 'date', 12, 'Effort & Dates', NULL, NULL),
  ('target_date', 'Target Date', 'date', 13, 'Effort & Dates', NULL, NULL),
  ('completed_date', 'Completed Date', 'date', 14, 'Effort & Dates', NULL, NULL),
  ('repository', 'Repository / Branch', 'text', 15, 'Build & Quality', NULL, NULL),
  ('code_review_ref', 'Code Review', 'text', 16, 'Build & Quality', NULL, NULL),
  ('unit_test_coverage', 'Unit Test Coverage (%)', 'number', 17, 'Build & Quality', NULL, NULL),
  ('defects_found', 'Defects Found', 'number', 18, 'Build & Quality', NULL, NULL),
  ('dependencies', 'Dependencies', 'table', 19, 'Dependencies', '[{"value":"dependency","label":"Dependency"},{"value":"type","label":"Type","type":"select","options":["Item","Interface","Environment","Decision","Third party"]},{"value":"status","label":"Status","type":"select","options":["Open","Met","At risk"]}]', NULL),
  ('notes', 'Notes', 'long_text', 20, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9003-000000000013'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"blocked","label":"Blocked"},{"key":"code_review","label":"Code Review"},{"key":"built","label":"Built"},{"key":"complete","label":"Complete"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9003-000000000013'::uuid;

-- ── Code Reviews (ict_code_reviews) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9003-000000000014'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('review_reference', 'Review Reference', 'text', 0, NULL, NULL, NULL),
  ('development_item', 'Development Item', 'text', 1, NULL, NULL, NULL),
  ('change_request', 'Pull / Merge Request', 'text', 2, NULL, NULL, NULL),
  ('repository', 'Repository', 'text', 3, NULL, NULL, NULL),
  ('author', 'Author', 'text', 4, NULL, NULL, NULL),
  ('review_type', 'Review Type', 'dropdown', 5, NULL, '[{"value":"peer","label":"Peer review"},{"value":"pair","label":"Pair review"},{"value":"security","label":"Security review"},{"value":"architecture","label":"Architecture review"}]', NULL),
  ('opened_on', 'Opened', 'date', 6, NULL, NULL, NULL),
  ('closed_on', 'Closed', 'date', 7, NULL, NULL, NULL),
  ('reviewers', 'Reviewers', 'table', 8, 'Reviewers', '[{"value":"reviewer","label":"Reviewer"},{"value":"decision","label":"Decision","type":"select","options":["Approved","Changes requested","Commented","Pending"]},{"value":"date","label":"Date","type":"date"}]', NULL),
  ('files_changed', 'Files Changed', 'number', 9, 'Size & Checks', NULL, NULL),
  ('lines_added', 'Lines Added', 'number', 10, 'Size & Checks', NULL, NULL),
  ('lines_removed', 'Lines Removed', 'number', 11, 'Size & Checks', NULL, NULL),
  ('automated_checks', 'Automated Checks', 'table', 12, 'Size & Checks', '[{"value":"check","label":"Check"},{"value":"result","label":"Result","type":"select","options":["Pass","Fail","Not run"]}]', NULL),
  ('coverage', 'Test Coverage of Change (%)', 'number', 13, 'Size & Checks', NULL, NULL),
  ('findings', 'Findings', 'table', 14, 'Findings', '[{"value":"finding","label":"Finding"},{"value":"severity","label":"Severity","type":"select","options":["Blocker","Major","Minor","Suggestion"]},{"value":"area","label":"File / Area"},{"value":"resolved","label":"Resolved","type":"select","options":["Yes","No"]}]', NULL),
  ('rework_hours', 'Rework (hours)', 'number', 15, 'Findings', NULL, NULL),
  ('notes', 'Notes', 'long_text', 16, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9003-000000000014'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"open","label":"Open"},{"key":"changes_requested","label":"Changes Requested"},{"key":"approved","label":"Approved"},{"key":"merged","label":"Merged"},{"key":"abandoned","label":"Abandoned"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9003-000000000014'::uuid;

-- ── Interface Register (ict_interface_register) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9003-000000000015'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('interface_id', 'Interface ID', 'text', 0, NULL, NULL, NULL),
  ('source_system', 'Source System', 'text', 1, NULL, NULL, NULL),
  ('target_system', 'Target System', 'text', 2, NULL, NULL, NULL),
  ('interface_type', 'Interface Type', 'dropdown', 3, NULL, '[{"value":"api","label":"API"},{"value":"event","label":"Event / message"},{"value":"file","label":"File transfer"},{"value":"batch","label":"Batch"},{"value":"database","label":"Database link"},{"value":"manual","label":"Manual"}]', NULL),
  ('direction', 'Direction (from the core)', 'dropdown', 4, NULL, '[{"value":"outbound","label":"Outbound"},{"value":"inbound","label":"Inbound"},{"value":"both","label":"Both ways"}]', NULL),
  ('timing', 'Timing', 'dropdown', 5, NULL, '[{"value":"real_time","label":"Real time"},{"value":"near_real_time","label":"Near real time"},{"value":"intraday","label":"Intraday batches"},{"value":"end_of_day","label":"End of day"}]', NULL),
  ('business_owner', 'Business Owner', 'text', 6, NULL, NULL, NULL),
  ('technical_owner', 'Technical Owner', 'text', 7, NULL, NULL, NULL),
  ('data_objects', 'Data Exchanged', 'multi_line', 8, 'Specification', NULL, NULL),
  ('message_format', 'Message Format', 'dropdown', 9, 'Specification', '[{"value":"json","label":"JSON"},{"value":"xml","label":"XML"},{"value":"iso_20022","label":"ISO 20022"},{"value":"csv","label":"CSV"},{"value":"fixed_width","label":"Fixed width"},{"value":"other","label":"Other"}]', NULL),
  ('protocol', 'Protocol / Transport', 'text', 10, 'Specification', NULL, NULL),
  ('specification_ref', 'Specification Reference', 'text', 11, 'Specification', NULL, NULL),
  ('daily_volume', 'Daily Volume (messages / records)', 'number', 12, 'Volumes & Service Levels', NULL, NULL),
  ('peak_per_hour', 'Peak per Hour', 'number', 13, 'Volumes & Service Levels', NULL, NULL),
  ('max_latency_seconds', 'Maximum Latency (seconds)', 'number', 14, 'Volumes & Service Levels', NULL, NULL),
  ('availability_target', 'Availability Target (%)', 'number', 15, 'Volumes & Service Levels', NULL, NULL),
  ('authentication', 'Authentication', 'dropdown', 16, 'Security', '[{"value":"mutual_tls","label":"Mutual TLS"},{"value":"oauth","label":"OAuth tokens"},{"value":"api_key","label":"API key"},{"value":"ssh_keys","label":"SSH keys"},{"value":"none","label":"None"}]', NULL),
  ('encrypted', 'Encrypted in Transit', 'boolean', 17, 'Security', NULL, NULL),
  ('data_classification', 'Data Classification', 'dropdown', 18, 'Security', '[{"value":"public","label":"Public"},{"value":"internal","label":"Internal"},{"value":"confidential","label":"Confidential"},{"value":"restricted","label":"Restricted"}]', NULL),
  ('test_results', 'Test Results', 'table', 19, 'Testing', '[{"value":"phase","label":"Test Phase"},{"value":"result","label":"Result","type":"select","options":["Not run","Passed","Passed with defects","Failed"]},{"value":"date","label":"Date","type":"date"}]', NULL),
  ('notes', 'Notes', 'long_text', 20, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9003-000000000015'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"not_started","label":"Not Started"},{"key":"in_design","label":"In Design"},{"key":"built","label":"Built"},{"key":"testing","label":"Testing"},{"key":"ready","label":"Ready"},{"key":"live","label":"Live"},{"key":"retired","label":"Retired"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9003-000000000015'::uuid;

-- ── Integration Dependencies (ict_integration_dependencies) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9003-000000000016'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('dependency_reference', 'Dependency Reference', 'text', 0, NULL, NULL, NULL),
  ('dependency_type', 'Dependency Type', 'dropdown', 1, NULL, '[{"value":"upstream","label":"Upstream system"},{"value":"downstream","label":"Downstream system"},{"value":"third_party","label":"Third party"},{"value":"infrastructure","label":"Infrastructure"},{"value":"data","label":"Data"},{"value":"decision","label":"Decision"}]', NULL),
  ('depends_on', 'Depends On', 'text', 2, NULL, NULL, NULL),
  ('provider_team', 'Provider Team', 'text', 3, NULL, NULL, NULL),
  ('provider_contact', 'Provider Contact', 'text', 4, NULL, NULL, NULL),
  ('owner', 'Our Owner', 'text', 5, NULL, NULL, NULL),
  ('rag', 'RAG', 'dropdown', 6, NULL, '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]', NULL),
  ('needed_by', 'Needed By', 'date', 7, 'Dates & Impact', NULL, NULL),
  ('committed_date', 'Committed Date', 'date', 8, 'Dates & Impact', NULL, NULL),
  ('delivered_date', 'Delivered Date', 'date', 9, 'Dates & Impact', NULL, NULL),
  ('affected_interfaces', 'Affected Interfaces', 'multi_line', 10, 'Dates & Impact', NULL, NULL),
  ('impact_if_late', 'Impact if Late', 'long_text', 11, 'Dates & Impact', NULL, NULL),
  ('actions', 'Actions', 'table', 12, 'Actions', '[{"value":"action","label":"Action"},{"value":"owner","label":"Owner"},{"value":"due","label":"Due Date","type":"date"},{"value":"status","label":"Status","type":"select","options":["Open","In Progress","Done"]}]', NULL),
  ('escalated_to', 'Escalated To', 'text', 13, 'Actions', NULL, NULL),
  ('notes', 'Notes', 'long_text', 14, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9003-000000000016'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"open","label":"Open"},{"key":"at_risk","label":"At Risk"},{"key":"blocked","label":"Blocked"},{"key":"resolved","label":"Resolved"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9003-000000000016'::uuid;

-- ── Data Sources (ict_data_sources) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9003-000000000017'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('source_code', 'Source Code', 'text', 0, NULL, NULL, NULL),
  ('system_name', 'System / Data Set', 'text', 1, NULL, NULL, NULL),
  ('data_domain', 'Data Domain', 'dropdown', 2, NULL, '[{"value":"customer","label":"Customer"},{"value":"account","label":"Accounts and deposits"},{"value":"lending","label":"Loans and limits"},{"value":"collateral","label":"Collateral"},{"value":"payments","label":"Payments"},{"value":"cards","label":"Cards"},{"value":"general_ledger","label":"General ledger"},{"value":"reference","label":"Reference data"},{"value":"documents","label":"Documents and images"}]', NULL),
  ('data_owner', 'Data Owner', 'text', 3, NULL, NULL, NULL),
  ('data_steward', 'Data Steward', 'text', 4, NULL, NULL, NULL),
  ('record_count', 'Records', 'number', 5, NULL, NULL, NULL),
  ('data_volume_gb', 'Volume (GB)', 'number', 6, NULL, NULL, NULL),
  ('connection_method', 'Connection Method', 'dropdown', 7, 'Access', '[{"value":"database_extract","label":"Database extract"},{"value":"file_export","label":"File export"},{"value":"api","label":"API"},{"value":"manual","label":"Manual"}]', NULL),
  ('extract_frequency', 'Extract Frequency', 'text', 8, 'Access', NULL, NULL),
  ('access_approved', 'Access Approved', 'boolean', 9, 'Access', NULL, NULL),
  ('access_date', 'Access Date', 'date', 10, 'Access', NULL, NULL),
  ('completeness', 'Completeness (%)', 'number', 11, 'Quality', NULL, NULL),
  ('accuracy', 'Accuracy (%)', 'number', 12, 'Quality', NULL, NULL),
  ('validity', 'Validity (%)', 'number', 13, 'Quality', NULL, NULL),
  ('quality_score', 'Data Quality Score (%)', 'number', 14, 'Quality', NULL, '{"op":"average","fields":["completeness","accuracy","validity"],"decimals":1,"display":"percent"}'),
  ('quality_issues', 'Quality Issues', 'table', 15, 'Quality', '[{"value":"issue","label":"Issue"},{"value":"records","label":"Records Affected"},{"value":"action","label":"Action"}]', NULL),
  ('data_classification', 'Data Classification', 'dropdown', 16, 'Classification', '[{"value":"public","label":"Public"},{"value":"internal","label":"Internal"},{"value":"confidential","label":"Confidential"},{"value":"restricted","label":"Restricted"}]', NULL),
  ('personal_data', 'Contains Personal Data', 'boolean', 17, 'Classification', NULL, NULL),
  ('retention', 'Retention Rule', 'text', 18, 'Classification', NULL, NULL),
  ('notes', 'Notes', 'long_text', 19, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9003-000000000017'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"identified","label":"Identified"},{"key":"connected","label":"Connected"},{"key":"profiled","label":"Profiled"},{"key":"approved","label":"Approved for Migration"},{"key":"retired","label":"Retired"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9003-000000000017'::uuid;

-- ── Data Models (ict_data_models) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9003-000000000018'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('model_reference', 'Model Reference', 'text', 0, NULL, NULL, NULL),
  ('model_type', 'Model Type', 'dropdown', 1, NULL, '[{"value":"conceptual","label":"Conceptual"},{"value":"logical","label":"Logical"},{"value":"physical","label":"Physical"},{"value":"canonical","label":"Canonical (interface)"},{"value":"reporting","label":"Reporting"}]', NULL),
  ('data_domain', 'Data Domain', 'text', 2, NULL, NULL, NULL),
  ('modeller', 'Modeller', 'text', 3, NULL, NULL, NULL),
  ('model_version', 'Model Version', 'text', 4, NULL, NULL, NULL),
  ('entities', 'Entities', 'table', 5, 'Entities', '[{"value":"entity","label":"Entity"},{"value":"description","label":"Description"},{"value":"key","label":"Key Attributes"}]', NULL),
  ('entity_count', 'Number of Entities', 'number', 6, 'Entities', NULL, NULL),
  ('business_rules', 'Business Rules', 'multi_line', 7, 'Rules & Standards', NULL, NULL),
  ('naming_standard', 'Naming Standard', 'text', 8, 'Rules & Standards', NULL, NULL),
  ('reference_data', 'Reference Data Used', 'multi_line', 9, 'Rules & Standards', NULL, NULL),
  ('source_systems', 'Source Systems', 'multi_line', 10, 'Lineage', NULL, NULL),
  ('consumers', 'Consumers', 'multi_line', 11, 'Lineage', NULL, NULL),
  ('data_classification', 'Data Classification', 'dropdown', 12, 'Lineage', '[{"value":"public","label":"Public"},{"value":"internal","label":"Internal"},{"value":"confidential","label":"Confidential"},{"value":"restricted","label":"Restricted"}]', NULL),
  ('reviewed_by', 'Reviewed By', 'text', 13, 'Approval', NULL, NULL),
  ('approved_by', 'Approved By', 'text', 14, 'Approval', NULL, NULL),
  ('approval_date', 'Approval Date', 'date', 15, 'Approval', NULL, NULL),
  ('notes', 'Notes', 'long_text', 16, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9003-000000000018'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"draft","label":"Draft"},{"key":"in_review","label":"In Review"},{"key":"approved","label":"Approved"},{"key":"superseded","label":"Superseded"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9003-000000000018'::uuid;

-- ── Data Migration (ict_data_migration) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9003-000000000019'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('object_code', 'Object Code', 'text', 0, NULL, NULL, NULL),
  ('source_systems', 'Source Systems', 'text', 1, NULL, NULL, NULL),
  ('target_module', 'Target Module', 'text', 2, NULL, NULL, NULL),
  ('object_owner', 'Business Owner', 'text', 3, NULL, NULL, NULL),
  ('migration_lead', 'Migration Lead', 'text', 4, NULL, NULL, NULL),
  ('approach', 'Approach', 'dropdown', 5, NULL, '[{"value":"etl","label":"Extract, transform, load"},{"value":"recreate","label":"Recreate in the target"},{"value":"manual","label":"Manual keying"},{"value":"archive","label":"Archive only"}]', NULL),
  ('load_order', 'Load Order', 'number', 6, NULL, NULL, NULL),
  ('source_records', 'Source Records', 'number', 7, 'Volumes', NULL, NULL),
  ('loaded_records', 'Loaded Records', 'number', 8, 'Volumes', NULL, NULL),
  ('rejected_records', 'Rejected Records', 'number', 9, 'Volumes', NULL, NULL),
  ('load_rate', 'Load Rate (%)', 'number', 10, 'Volumes', NULL, '{"op":"percent","numerator":"loaded_records","denominator":"source_records","display":"percent"}'),
  ('reject_rate', 'Reject Rate (%)', 'number', 11, 'Volumes', NULL, '{"op":"percent","numerator":"rejected_records","denominator":"source_records","display":"percent"}'),
  ('source_balance', 'Source Balance', 'currency', 12, 'Reconciliation', NULL, NULL),
  ('target_balance', 'Target Balance', 'currency', 13, 'Reconciliation', NULL, NULL),
  ('balance_difference', 'Balance Difference', 'currency', 14, 'Reconciliation', NULL, '{"op":"difference","minuend":"target_balance","subtrahend":"source_balance","decimals":2}'),
  ('reconciliation_checks', 'Reconciliation Checks', 'table', 15, 'Reconciliation', '[{"value":"check","label":"Check"},{"value":"result","label":"Result","type":"select","options":["Matched","Difference","Not run"]},{"value":"comment","label":"Comment"}]', NULL),
  ('mock_results', 'Mock Results', 'table', 16, 'Mocks & Sign-Off', '[{"value":"mock","label":"Mock"},{"value":"date","label":"Date","type":"date"},{"value":"loaded","label":"Loaded %"},{"value":"result","label":"Result","type":"select","options":["Pass","Pass with conditions","Fail","Not run"]}]', NULL),
  ('signoff_by', 'Business Sign-Off By', 'text', 17, 'Mocks & Sign-Off', NULL, NULL),
  ('signoff_date', 'Sign-Off Date', 'date', 18, 'Mocks & Sign-Off', NULL, NULL),
  ('notes', 'Notes', 'long_text', 19, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9003-000000000019'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"scoping","label":"Scoping"},{"key":"migrating","label":"Migrating"},{"key":"quality_check","label":"Quality Check"},{"key":"reconciled","label":"Reconciled"},{"key":"signed_off","label":"Signed Off"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9003-000000000019'::uuid;

COMMIT;

-- Check: fields and tabs per register.
SELECT r.register_key, count(f.*) AS fields, count(DISTINCT COALESCE(f.field_group, 'Details')) AS tabs,
       count(*) FILTER (WHERE f.field_type = 'table') AS table_fields,
       count(*) FILTER (WHERE f.calculation IS NOT NULL) AS calculated_fields
FROM public.local_registers r JOIN public.local_register_fields f ON f.register_id = r.id
WHERE r.id IN ('00000000-0000-4000-9003-000000000012'::uuid, '00000000-0000-4000-9003-000000000013'::uuid, '00000000-0000-4000-9003-000000000014'::uuid, '00000000-0000-4000-9003-000000000015'::uuid, '00000000-0000-4000-9003-000000000016'::uuid, '00000000-0000-4000-9003-000000000017'::uuid, '00000000-0000-4000-9003-000000000018'::uuid, '00000000-0000-4000-9003-000000000019'::uuid)
GROUP BY r.register_key ORDER BY r.register_key;

-- ============================================================================
-- v1399: Go-Live registers — full forms with tabs (Banking & Financial Services)
-- ============================================================================
-- Owner request 2026-11-09: best-practice fields, in logical tabs, for the six Go-Live registers, which had only Title / Description / Status:
--   Production Deployment (fin_production_deployment): 23 fields — Details · Schedule · Steps · Verification · Backout · Notes
--   Opening Balances (fin_opening_balances): 20 fields — Details · Balances · Accounts · Reconciliation · Sign-Off · Notes
--   Day-1 Validation (fin_day1_validation): 16 fields — Details · Results · Evidence · Issues · Notes
--   Business Verification (fin_business_verification): 18 fields — Details · Results · Differences · Sign-Off · Notes
--   Technical Verification (fin_technical_verification): 15 fields — Details · Checks · Results · Issues · Sign-Off · Notes
--   Go-Live Decision (fin_go_live_decision): 17 fields — Details · Inputs · Decision · Communication · Notes
-- Lists with several parts per line are tables (rule 67.1), with dropdown columns where the values are a
-- short fixed list. Durations, differences and match / pass / exception rates are calculated fields (v1375), worked out on save.
-- Status workflows keep their existing keys and gain the states each register needs. No records exist
-- yet for these registers, so no saved values change. All fields optional, vendor-neutral (rule 26).
-- Platform register definitions, the Simulator reads the same system register definitions.
-- Sample records: v1400. Prerequisites: v947, v1326, v1375. Idempotent.
-- ============================================================================

BEGIN;

-- ── Production Deployment (fin_production_deployment) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000032'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('deployment_reference', 'Deployment Reference', 'text', 0, NULL, NULL, NULL),
  ('component', 'Component', 'dropdown', 1, NULL, '[{"value":"core_banking","label":"Core banking platform"},{"value":"integration","label":"Integration layer"},{"value":"channels","label":"Channels"},{"value":"payments","label":"Payments"},{"value":"infrastructure","label":"Infrastructure"},{"value":"database","label":"Database"},{"value":"network","label":"Network"},{"value":"security","label":"Security"},{"value":"batch","label":"Batch and scheduling"},{"value":"monitoring","label":"Monitoring"},{"value":"reporting","label":"Reporting"}]', NULL),
  ('deployment_type', 'Deployment Type', 'dropdown', 2, NULL, '[{"value":"application_release","label":"Application release"},{"value":"configuration","label":"Configuration and parameters"},{"value":"database_change","label":"Database change"},{"value":"infrastructure","label":"Infrastructure"},{"value":"interface","label":"Interface / certificates"},{"value":"security_access","label":"Security and access"},{"value":"batch_schedule","label":"Batch schedule"}]', NULL),
  ('release_version', 'Release / Version', 'text', 3, NULL, NULL, NULL),
  ('change_reference', 'Change Request Reference', 'text', 4, NULL, NULL, NULL),
  ('deployment_window', 'Deployment Window', 'dropdown', 5, NULL, '[{"value":"pre_cutover","label":"Before the cutover weekend"},{"value":"cutover_weekend","label":"Cutover weekend"},{"value":"post_go_live","label":"After go-live"}]', NULL),
  ('environment', 'Environment', 'dropdown', 6, NULL, '[{"value":"production","label":"Production"},{"value":"dr","label":"Disaster recovery site"},{"value":"both","label":"Production and DR"}]', NULL),
  ('owner', 'Owner', 'user_picker', 7, NULL, NULL, NULL),
  ('planned_start', 'Planned Start', 'datetime', 8, 'Schedule', NULL, NULL),
  ('planned_end', 'Planned End', 'datetime', 9, 'Schedule', NULL, NULL),
  ('planned_minutes', 'Planned Duration', 'number', 10, 'Schedule', NULL, '{"op":"minutes_between","start":"planned_start","end":"planned_end","display":"duration"}'),
  ('actual_start', 'Actual Start', 'datetime', 11, 'Schedule', NULL, NULL),
  ('actual_end', 'Actual End', 'datetime', 12, 'Schedule', NULL, NULL),
  ('actual_minutes', 'Actual Duration', 'number', 13, 'Schedule', NULL, '{"op":"minutes_between","start":"actual_start","end":"actual_end","display":"duration"}'),
  ('prerequisites', 'Prerequisites', 'multi_line', 14, 'Steps', NULL, NULL),
  ('steps', 'Deployment Steps', 'table', 15, 'Steps', '[{"value":"step","label":"Step"},{"value":"action","label":"Action"},{"value":"owner","label":"Owner"},{"value":"status","label":"Status","type":"select","options":["Not started","Done","Failed","Skipped"]}]', NULL),
  ('smoke_tests', 'Smoke Tests', 'table', 16, 'Verification', '[{"value":"check","label":"Check"},{"value":"result","label":"Result","type":"select","options":["Pass","Fail","Not run"]},{"value":"checked_by","label":"Checked By"}]', NULL),
  ('deployed_by', 'Deployed By', 'user_picker', 17, 'Verification', NULL, NULL),
  ('verified_by', 'Verified By', 'user_picker', 18, 'Verification', NULL, NULL),
  ('backout_plan', 'Backout Plan', 'long_text', 19, 'Backout', NULL, NULL),
  ('backout_tested', 'Backout Tested', 'boolean', 20, 'Backout', NULL, NULL),
  ('backout_minutes', 'Backout Time (minutes)', 'number', 21, 'Backout', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 22, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000032'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"planned","label":"Planned"},{"key":"scheduled","label":"Scheduled"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"},{"key":"failed","label":"Failed"},{"key":"backed_out","label":"Backed Out"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000032'::uuid;

-- ── Opening Balances (fin_opening_balances) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000033'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('balance_reference', 'Balance Reference', 'text', 0, NULL, NULL, NULL),
  ('balance_area', 'Balance Area', 'dropdown', 1, NULL, '[{"value":"customer_deposits","label":"Customer deposits"},{"value":"loans_advances","label":"Loans and advances"},{"value":"trade_finance","label":"Trade finance (contingent)"},{"value":"treasury","label":"Treasury placements and borrowings"},{"value":"nostro_vostro","label":"Nostro and vostro"},{"value":"internal_accounts","label":"Internal and suspense accounts"},{"value":"fixed_assets","label":"Fixed assets"},{"value":"equity_reserves","label":"Equity and reserves"},{"value":"income_expense","label":"Income and expense"},{"value":"cash","label":"Cash and vault"}]', NULL),
  ('gl_range', 'General Ledger Range', 'text', 2, NULL, NULL, NULL),
  ('currency', 'Currency', 'text', 3, NULL, NULL, NULL),
  ('owner', 'Owner', 'user_picker', 4, NULL, NULL, NULL),
  ('baseline_balance', 'Baseline Balance (latest mock)', 'currency', 5, 'Balances', NULL, NULL),
  ('baseline_source', 'Baseline Source', 'text', 6, 'Balances', NULL, NULL),
  ('legacy_closing_balance', 'Legacy Closing Balance', 'currency', 7, 'Balances', NULL, NULL),
  ('loaded_balance', 'Loaded Opening Balance', 'currency', 8, 'Balances', NULL, NULL),
  ('balance_difference', 'Difference', 'currency', 9, 'Balances', NULL, '{"op":"difference","minuend":"loaded_balance","subtrahend":"legacy_closing_balance"}'),
  ('legacy_accounts', 'Legacy Accounts', 'number', 10, 'Accounts', NULL, NULL),
  ('loaded_accounts', 'Loaded Accounts', 'number', 11, 'Accounts', NULL, NULL),
  ('account_difference', 'Account Difference', 'number', 12, 'Accounts', NULL, '{"op":"difference","minuend":"loaded_accounts","subtrahend":"legacy_accounts"}'),
  ('reconciliation_reference', 'Reconciliation Reference', 'text', 13, 'Reconciliation', NULL, NULL),
  ('differences', 'Differences', 'table', 14, 'Reconciliation', '[{"value":"item","label":"Item"},{"value":"amount","label":"Amount"},{"value":"explanation","label":"Explanation"},{"value":"status","label":"Status","type":"select","options":["Open","Explained","Corrected"]}]', NULL),
  ('verified_by', 'Verified By', 'user_picker', 15, 'Sign-Off', NULL, NULL),
  ('verification_date', 'Verification Date', 'date', 16, 'Sign-Off', NULL, NULL),
  ('finance_approver', 'Finance Approver', 'user_picker', 17, 'Sign-Off', NULL, NULL),
  ('approval_date', 'Approval Date', 'date', 18, 'Sign-Off', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 19, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000033'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"pending","label":"Pending"},{"key":"loaded","label":"Loaded"},{"key":"differences","label":"Differences Found"},{"key":"verified","label":"Verified"},{"key":"accepted","label":"Accepted with Explained Differences"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000033'::uuid;

-- ── Day-1 Validation (fin_day1_validation) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000034'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('check_reference', 'Check Reference', 'text', 0, NULL, NULL, NULL),
  ('check_area', 'Check Area', 'dropdown', 1, NULL, '[{"value":"branches","label":"Branches"},{"value":"payments","label":"Payments"},{"value":"cards_atms","label":"Cards and ATMs"},{"value":"digital_channels","label":"Digital channels"},{"value":"contact_centre","label":"Contact centre"},{"value":"end_of_day","label":"End of day"},{"value":"interest_fees","label":"Interest and fees"},{"value":"statements","label":"Statements and notices"},{"value":"regulatory_reporting","label":"Regulatory reporting"},{"value":"general_ledger","label":"General ledger"}]', NULL),
  ('check_type', 'Check Type', 'dropdown', 2, NULL, '[{"value":"transaction_test","label":"Live transaction test"},{"value":"report_check","label":"Report check"},{"value":"balance_check","label":"Balance check"},{"value":"process_walkthrough","label":"Process walkthrough"},{"value":"monitoring_check","label":"Monitoring check"}]', NULL),
  ('owner', 'Owner', 'user_picker', 3, NULL, NULL, NULL),
  ('scheduled_at', 'Scheduled At', 'datetime', 4, NULL, NULL, NULL),
  ('frequency', 'Frequency', 'dropdown', 5, NULL, '[{"value":"once","label":"Once"},{"value":"hourly","label":"Hourly"},{"value":"start_end_of_day","label":"Start and end of day"},{"value":"daily_first_week","label":"Daily in the first week"}]', NULL),
  ('expected_result', 'Expected Result', 'long_text', 6, 'Results', NULL, NULL),
  ('actual_result', 'Actual Result', 'long_text', 7, 'Results', NULL, NULL),
  ('sample_size', 'Sample Size', 'number', 8, 'Results', NULL, NULL),
  ('exceptions', 'Exceptions', 'number', 9, 'Results', NULL, NULL),
  ('exception_rate', 'Exception Rate', 'number', 10, 'Results', NULL, '{"op":"percent","numerator":"exceptions","denominator":"sample_size","decimals":1,"display":"percent"}'),
  ('checked_at', 'Checked At', 'datetime', 11, 'Evidence', NULL, NULL),
  ('checked_by', 'Checked By', 'user_picker', 12, 'Evidence', NULL, NULL),
  ('evidence_reference', 'Evidence Reference', 'text', 13, 'Evidence', NULL, NULL),
  ('issues', 'Issues', 'table', 14, 'Issues', '[{"value":"issue","label":"Issue"},{"value":"severity","label":"Severity","type":"select","options":["Critical","High","Medium","Low"]},{"value":"action","label":"Action"},{"value":"owner","label":"Owner"},{"value":"status","label":"Status","type":"select","options":["Open","Fixed","Accepted"]}]', NULL),
  ('notes', 'Notes', 'multi_line', 15, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000034'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"pending","label":"Pending"},{"key":"passed","label":"Passed"},{"key":"passed_with_issues","label":"Passed with Issues"},{"key":"failed","label":"Failed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000034'::uuid;

-- ── Business Verification (fin_business_verification) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000035'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('verification_reference', 'Verification Reference', 'text', 0, NULL, NULL, NULL),
  ('business_unit', 'Business Unit', 'dropdown', 1, NULL, '[{"value":"retail_branches","label":"Retail branches"},{"value":"contact_centre","label":"Contact centre"},{"value":"business_banking","label":"Business banking"},{"value":"corporate_trade","label":"Corporate and trade finance"},{"value":"treasury","label":"Treasury"},{"value":"payments_operations","label":"Payments operations"},{"value":"card_operations","label":"Card operations"},{"value":"finance","label":"Finance"},{"value":"risk_compliance","label":"Risk and compliance"},{"value":"digital_channels","label":"Digital channels"},{"value":"it_operations","label":"IT operations"}]', NULL),
  ('verification_lead', 'Verification Lead', 'user_picker', 2, NULL, NULL, NULL),
  ('verification_window', 'Verification Window', 'dropdown', 3, NULL, '[{"value":"after_static","label":"After the static window"},{"value":"after_financial","label":"After the financial window"},{"value":"before_go_live","label":"Before the final go-live decision"}]', NULL),
  ('planned_start', 'Planned Start', 'datetime', 4, NULL, NULL, NULL),
  ('planned_end', 'Planned End', 'datetime', 5, NULL, NULL, NULL),
  ('sample_records', 'Sample Records Selected', 'number', 6, 'Results', NULL, NULL),
  ('records_checked', 'Records Checked', 'number', 7, 'Results', NULL, NULL),
  ('records_matched', 'Records Matched', 'number', 8, 'Results', NULL, NULL),
  ('match_rate', 'Match Rate', 'number', 9, 'Results', NULL, '{"op":"percent","numerator":"records_matched","denominator":"records_checked","decimals":1,"display":"percent"}'),
  ('checks', 'Checks', 'table', 10, 'Results', '[{"value":"check","label":"Check"},{"value":"records","label":"Records"},{"value":"result","label":"Result","type":"select","options":["Match","Mismatch","Not checked"]},{"value":"comment","label":"Comment"}]', NULL),
  ('differences', 'Differences Found', 'table', 11, 'Differences', '[{"value":"record","label":"Record"},{"value":"field","label":"Field"},{"value":"legacy","label":"Legacy Value"},{"value":"new","label":"New Value"},{"value":"explanation","label":"Explanation"}]', NULL),
  ('differences_accepted', 'Differences Accepted', 'boolean', 12, 'Differences', NULL, NULL),
  ('verified_by', 'Verified By', 'user_picker', 13, 'Sign-Off', NULL, NULL),
  ('verified_at', 'Verified At', 'datetime', 14, 'Sign-Off', NULL, NULL),
  ('recommendation', 'Recommendation', 'dropdown', 15, 'Sign-Off', '[{"value":"go","label":"Go"},{"value":"go_with_conditions","label":"Go with conditions"},{"value":"no_go","label":"No-Go"}]', NULL),
  ('conditions', 'Conditions', 'multi_line', 16, 'Sign-Off', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 17, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000035'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"pending","label":"Pending"},{"key":"in_progress","label":"In Progress"},{"key":"verified","label":"Verified"},{"key":"issues_found","label":"Issues Found"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000035'::uuid;

-- ── Technical Verification (fin_technical_verification) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000036'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('verification_reference', 'Verification Reference', 'text', 0, NULL, NULL, NULL),
  ('component', 'Component', 'dropdown', 1, NULL, '[{"value":"core_banking","label":"Core banking platform"},{"value":"integration","label":"Integration layer"},{"value":"channels","label":"Channels"},{"value":"payments","label":"Payments"},{"value":"infrastructure","label":"Infrastructure"},{"value":"database","label":"Database"},{"value":"network","label":"Network"},{"value":"security","label":"Security"},{"value":"batch","label":"Batch and scheduling"},{"value":"monitoring","label":"Monitoring"},{"value":"reporting","label":"Reporting"}]', NULL),
  ('verification_type', 'Verification Type', 'dropdown', 2, NULL, '[{"value":"connectivity","label":"Connectivity"},{"value":"interface","label":"Interface / message flow"},{"value":"batch","label":"Batch and end of day"},{"value":"performance","label":"Performance"},{"value":"security_access","label":"Security and access"},{"value":"monitoring","label":"Monitoring and alerts"},{"value":"backup_dr","label":"Backup and DR"},{"value":"data_integrity","label":"Data integrity"}]', NULL),
  ('technical_lead', 'Technical Lead', 'user_picker', 3, NULL, NULL, NULL),
  ('planned_start', 'Planned Start', 'datetime', 4, NULL, NULL, NULL),
  ('checks', 'Checks', 'table', 5, 'Checks', '[{"value":"check","label":"Check"},{"value":"expected","label":"Expected"},{"value":"result","label":"Result","type":"select","options":["Pass","Fail","Not run"]},{"value":"evidence","label":"Evidence"}]', NULL),
  ('checks_total', 'Checks', 'number', 6, 'Results', NULL, NULL),
  ('checks_passed', 'Checks Passed', 'number', 7, 'Results', NULL, NULL),
  ('pass_rate', 'Pass Rate', 'number', 8, 'Results', NULL, '{"op":"percent","numerator":"checks_passed","denominator":"checks_total","decimals":1,"display":"percent"}'),
  ('issues', 'Issues', 'table', 9, 'Issues', '[{"value":"issue","label":"Issue"},{"value":"severity","label":"Severity","type":"select","options":["Critical","High","Medium","Low"]},{"value":"action","label":"Action"},{"value":"owner","label":"Owner"},{"value":"status","label":"Status","type":"select","options":["Open","Fixed","Accepted"]}]', NULL),
  ('verified_by', 'Verified By', 'user_picker', 10, 'Sign-Off', NULL, NULL),
  ('verified_at', 'Verified At', 'datetime', 11, 'Sign-Off', NULL, NULL),
  ('recommendation', 'Recommendation', 'dropdown', 12, 'Sign-Off', '[{"value":"go","label":"Go"},{"value":"go_with_conditions","label":"Go with conditions"},{"value":"no_go","label":"No-Go"}]', NULL),
  ('conditions', 'Conditions', 'multi_line', 13, 'Sign-Off', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 14, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000036'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"pending","label":"Pending"},{"key":"in_progress","label":"In Progress"},{"key":"verified","label":"Verified"},{"key":"issues_found","label":"Issues Found"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000036'::uuid;

-- ── Go-Live Decision (fin_go_live_decision) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000037'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('decision_reference', 'Decision Reference', 'text', 0, NULL, NULL, NULL),
  ('decision_type', 'Decision Type', 'dropdown', 1, NULL, '[{"value":"go_live_date","label":"Go-live date"},{"value":"scope","label":"Release scope"},{"value":"readiness_gate","label":"Readiness gate"},{"value":"final_go_live","label":"Final go-live"},{"value":"rollback","label":"Rollback"},{"value":"hypercare_exit","label":"Hypercare exit"},{"value":"decommission","label":"Legacy decommissioning"}]', NULL),
  ('decision_forum', 'Decision Forum', 'text', 2, NULL, NULL, NULL),
  ('chair', 'Chair', 'user_picker', 3, NULL, NULL, NULL),
  ('decision_due', 'Decision Due', 'date', 4, NULL, NULL, NULL),
  ('decision_date', 'Decision Date', 'date', 5, NULL, NULL, NULL),
  ('readiness_inputs', 'Readiness Inputs', 'table', 6, 'Inputs', '[{"value":"input","label":"Input"},{"value":"source","label":"Source"},{"value":"status","label":"Status","type":"select","options":["Green","Amber","Red","Not available"]},{"value":"comment","label":"Comment"}]', NULL),
  ('open_critical_defects', 'Open Critical Defects', 'number', 7, 'Inputs', NULL, NULL),
  ('open_high_defects', 'Open High Defects', 'number', 8, 'Inputs', NULL, NULL),
  ('risks_accepted', 'Risks Accepted', 'table', 9, 'Inputs', '[{"value":"risk","label":"Risk"},{"value":"owner","label":"Owner"},{"value":"acceptance","label":"Acceptance"}]', NULL),
  ('rationale', 'Rationale', 'long_text', 10, 'Decision', NULL, NULL),
  ('conditions', 'Conditions', 'table', 11, 'Decision', '[{"value":"condition","label":"Condition"},{"value":"owner","label":"Owner"},{"value":"due","label":"Due Date","type":"date"},{"value":"status","label":"Status","type":"select","options":["Open","Met"]}]', NULL),
  ('attendees', 'Attendees and Votes', 'table', 12, 'Decision', '[{"value":"name","label":"Name"},{"value":"role","label":"Role"},{"value":"vote","label":"Vote","type":"select","options":["Go","No-Go","Abstain","Not present"]}]', NULL),
  ('communicated_to', 'Communicated To', 'multi_line', 13, 'Communication', NULL, NULL),
  ('communication_date', 'Communication Date', 'date', 14, 'Communication', NULL, NULL),
  ('minutes_reference', 'Minutes Reference', 'text', 15, 'Communication', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 16, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000037'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"pending","label":"Pending"},{"key":"go","label":"Go"},{"key":"go_with_conditions","label":"Go with Conditions"},{"key":"no_go","label":"No-Go"},{"key":"deferred","label":"Deferred"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000037'::uuid;

COMMIT;

-- Check: fields and tabs per register.
SELECT r.register_key, count(f.*) AS fields, count(DISTINCT COALESCE(f.field_group, 'Details')) AS tabs,
       count(*) FILTER (WHERE f.field_type = 'table') AS table_fields,
       count(*) FILTER (WHERE f.calculation IS NOT NULL) AS calculated_fields
FROM public.local_registers r JOIN public.local_register_fields f ON f.register_id = r.id
WHERE r.id IN ('00000000-0000-4000-9001-000000000032'::uuid, '00000000-0000-4000-9001-000000000033'::uuid, '00000000-0000-4000-9001-000000000034'::uuid, '00000000-0000-4000-9001-000000000035'::uuid, '00000000-0000-4000-9001-000000000036'::uuid, '00000000-0000-4000-9001-000000000037'::uuid)
GROUP BY r.register_key ORDER BY r.register_key;

-- ============================================================================
-- v1413: Testing, Technical Debt & Cybersecurity registers — full forms with tabs (Information Technology)
-- ============================================================================
-- Owner request 2026-11-11: best-practice fields, in logical tabs, for the six Information Technology registers under Testing, Technical Debt and Cybersecurity, which had only Title / Description / Status:
--   Testing (ict_testing): 28 fields — Details · Schedule · Scope & Criteria · Execution · Defects · Sign-Off · Notes
--   Technical Debt (ict_technical_debt): 19 fields — Details · Cause & Impact · Remediation · Notes
--   Security Requirements (ict_security_requirements): 19 fields — Details · Control · Verification · Waiver · Notes
--   Threat Assessment (ict_threat_assessment): 17 fields — Details · Assets & Entry Points · Threats · Risk · Actions · Notes
--   Vulnerabilities (ict_vulnerabilities): 18 fields — Details · Remediation · Risk Acceptance · Notes
--   Penetration Testing (ict_penetration_testing): 22 fields — Details · Scope & Authorisation · Findings · Report & Retest · Notes
-- Lists with several parts per line are tables (rule 67.1), with dropdown columns where the values are a
-- short fixed list. Execution and pass rates, priority scores and the share of high threats are calculated fields, worked out on save.
-- Status workflows keep their existing keys and gain the states each register needs. No records exist
-- yet for these registers, so no saved values change. All fields optional, vendor-neutral (rule 26).
-- Platform register definitions, the Simulator reads the same system register definitions.
-- Sample records: v1414. Prerequisites: v949, v1326, v1375 and the v1339 average calculation in the app. Idempotent.
-- ============================================================================

BEGIN;

-- ── Testing (ict_testing) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9003-00000000001a'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('test_reference', 'Test Reference', 'text', 0, NULL, NULL, NULL),
  ('test_type', 'Test Type', 'dropdown', 1, NULL, '[{"value":"unit","label":"Unit"},{"value":"system","label":"System"},{"value":"sit","label":"System integration (SIT)"},{"value":"uat","label":"User acceptance (UAT)"},{"value":"regression","label":"Regression"},{"value":"performance","label":"Performance"},{"value":"security","label":"Security"},{"value":"migration","label":"Migration"},{"value":"dr","label":"Disaster recovery"},{"value":"operational_acceptance","label":"Operational acceptance"}]', NULL),
  ('workstream', 'Workstream', 'dropdown', 2, NULL, '[{"value":"customer_channels","label":"Customer and digital channels"},{"value":"payments","label":"Payments and transfers"},{"value":"lending","label":"Lending, limits and collateral"},{"value":"deposits","label":"Deposits and accounts"},{"value":"data_migration","label":"Data migration and quality"},{"value":"integration","label":"Integration and interfaces"},{"value":"cybersecurity","label":"Cybersecurity and access"},{"value":"environments","label":"Environments and release"},{"value":"operational_readiness","label":"Operational readiness and hypercare"},{"value":"all","label":"All workstreams"}]', NULL),
  ('test_lead', 'Test Lead', 'text', 3, NULL, NULL, NULL),
  ('environment', 'Environment', 'text', 4, NULL, NULL, NULL),
  ('planned_start', 'Planned Start', 'date', 5, 'Schedule', NULL, NULL),
  ('planned_end', 'Planned End', 'date', 6, 'Schedule', NULL, NULL),
  ('actual_start', 'Actual Start', 'date', 7, 'Schedule', NULL, NULL),
  ('actual_end', 'Actual End', 'date', 8, 'Schedule', NULL, NULL),
  ('scope', 'Scope', 'multi_line', 9, 'Scope & Criteria', NULL, NULL),
  ('entry_criteria', 'Entry Criteria', 'table', 10, 'Scope & Criteria', '[{"value":"criterion","label":"Criterion"},{"value":"met","label":"Met","type":"select","options":["Yes","Partly","No"]}]', NULL),
  ('exit_criteria', 'Exit Criteria', 'table', 11, 'Scope & Criteria', '[{"value":"criterion","label":"Criterion"},{"value":"met","label":"Met","type":"select","options":["Yes","Partly","No"]}]', NULL),
  ('cases_planned', 'Test Cases Planned', 'number', 12, 'Execution', NULL, NULL),
  ('cases_executed', 'Executed', 'number', 13, 'Execution', NULL, NULL),
  ('cases_passed', 'Passed', 'number', 14, 'Execution', NULL, NULL),
  ('cases_failed', 'Failed', 'number', 15, 'Execution', NULL, NULL),
  ('cases_blocked', 'Blocked', 'number', 16, 'Execution', NULL, NULL),
  ('execution_rate', 'Execution Rate (%)', 'number', 17, 'Execution', NULL, '{"op":"percent","numerator":"cases_executed","denominator":"cases_planned","display":"percent"}'),
  ('pass_rate', 'Pass Rate (%)', 'number', 18, 'Execution', NULL, '{"op":"percent","numerator":"cases_passed","denominator":"cases_executed","display":"percent"}'),
  ('defects_critical', 'Open Critical Defects', 'number', 19, 'Defects', NULL, NULL),
  ('defects_high', 'Open High Defects', 'number', 20, 'Defects', NULL, NULL),
  ('defects_medium_low', 'Open Medium / Low Defects', 'number', 21, 'Defects', NULL, NULL),
  ('key_defects', 'Key Defects', 'table', 22, 'Defects', '[{"value":"defect","label":"Defect"},{"value":"severity","label":"Severity","type":"select","options":["Critical","High","Medium","Low"]},{"value":"status","label":"Status","type":"select","options":["Open","Fixed","Retest","Closed"]}]', NULL),
  ('recommendation', 'Recommendation', 'dropdown', 23, 'Sign-Off', '[{"value":"proceed","label":"Proceed"},{"value":"proceed_conditions","label":"Proceed with conditions"},{"value":"do_not_proceed","label":"Do not proceed"}]', NULL),
  ('conditions', 'Conditions', 'multi_line', 24, 'Sign-Off', NULL, NULL),
  ('signed_off_by', 'Signed Off By', 'text', 25, 'Sign-Off', NULL, NULL),
  ('signoff_date', 'Sign-Off Date', 'date', 26, 'Sign-Off', NULL, NULL),
  ('notes', 'Notes', 'long_text', 27, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9003-00000000001a'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"blocked","label":"Blocked"},{"key":"passed","label":"Passed"},{"key":"passed_conditions","label":"Passed with Conditions"},{"key":"failed","label":"Failed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9003-00000000001a'::uuid;

-- ── Technical Debt (ict_technical_debt) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9003-00000000001b'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('debt_reference', 'Debt Reference', 'text', 0, NULL, NULL, NULL),
  ('debt_category', 'Category', 'dropdown', 1, NULL, '[{"value":"architecture","label":"Architecture"},{"value":"code","label":"Code"},{"value":"infrastructure","label":"Infrastructure"},{"value":"security","label":"Security"},{"value":"data","label":"Data"},{"value":"testing","label":"Testing"},{"value":"documentation","label":"Documentation"}]', NULL),
  ('workstream', 'Workstream', 'dropdown', 2, NULL, '[{"value":"customer_channels","label":"Customer and digital channels"},{"value":"payments","label":"Payments and transfers"},{"value":"lending","label":"Lending, limits and collateral"},{"value":"deposits","label":"Deposits and accounts"},{"value":"data_migration","label":"Data migration and quality"},{"value":"integration","label":"Integration and interfaces"},{"value":"cybersecurity","label":"Cybersecurity and access"},{"value":"environments","label":"Environments and release"},{"value":"operational_readiness","label":"Operational readiness and hypercare"},{"value":"all","label":"All workstreams"}]', NULL),
  ('component', 'System / Component', 'text', 3, NULL, NULL, NULL),
  ('raised_by', 'Raised By', 'text', 4, NULL, NULL, NULL),
  ('owner', 'Owner', 'text', 5, NULL, NULL, NULL),
  ('date_identified', 'Date Identified', 'date', 6, NULL, NULL, NULL),
  ('cause', 'Cause', 'dropdown', 7, 'Cause & Impact', '[{"value":"deliberate_shortcut","label":"Deliberate shortcut to meet a date"},{"value":"design_change","label":"Design changed after build"},{"value":"missing_tests","label":"Missing tests"},{"value":"outdated_technology","label":"Outdated technology"},{"value":"workaround","label":"Workaround for a supplier or product gap"},{"value":"unknown","label":"Unknown / inherited"}]', NULL),
  ('impact', 'Impact if Not Fixed', 'long_text', 8, 'Cause & Impact', NULL, NULL),
  ('impact_score', 'Impact (1 = low, 5 = high)', 'number', 9, 'Cause & Impact', NULL, NULL),
  ('urgency_score', 'Urgency (1 = low, 5 = high)', 'number', 10, 'Cause & Impact', NULL, NULL),
  ('priority_score', 'Priority Score', 'number', 11, 'Cause & Impact', NULL, '{"op":"average","fields":["impact_score","urgency_score"],"of":5,"decimals":0,"display":"percent"}'),
  ('remediation_plan', 'Remediation Plan', 'long_text', 12, 'Remediation', NULL, NULL),
  ('effort_days', 'Effort to Fix (days)', 'number', 13, 'Remediation', NULL, NULL),
  ('target_release', 'Target Release', 'text', 14, 'Remediation', NULL, NULL),
  ('target_date', 'Target Date', 'date', 15, 'Remediation', NULL, NULL),
  ('resolved_date', 'Resolved Date', 'date', 16, 'Remediation', NULL, NULL),
  ('linked_items', 'Linked Items', 'table', 17, 'Remediation', '[{"value":"reference","label":"Reference"},{"value":"item","label":"Item"}]', NULL),
  ('notes', 'Notes', 'long_text', 18, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9003-00000000001b'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"identified","label":"Identified"},{"key":"prioritised","label":"Prioritised"},{"key":"in_remediation","label":"In Remediation"},{"key":"resolved","label":"Resolved"},{"key":"accepted","label":"Accepted (Not Fixing)"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9003-00000000001b'::uuid;

-- ── Security Requirements (ict_security_requirements) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9003-00000000001c'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('requirement_id', 'Requirement ID', 'text', 0, NULL, NULL, NULL),
  ('category', 'Category', 'dropdown', 1, NULL, '[{"value":"identity_access","label":"Identity and access"},{"value":"data_protection","label":"Data protection"},{"value":"logging_monitoring","label":"Logging and monitoring"},{"value":"network","label":"Network security"},{"value":"application","label":"Application security"},{"value":"resilience","label":"Resilience"},{"value":"third_party","label":"Third party"},{"value":"compliance","label":"Compliance"}]', NULL),
  ('source', 'Source', 'dropdown', 2, NULL, '[{"value":"policy","label":"Bank security policy"},{"value":"regulation","label":"Regulation"},{"value":"standard","label":"Industry standard"},{"value":"threat_assessment","label":"Threat assessment"},{"value":"pen_test","label":"Penetration test finding"}]', NULL),
  ('priority', 'Priority', 'dropdown', 3, NULL, '[{"value":"must","label":"Must"},{"value":"should","label":"Should"},{"value":"could","label":"Could"}]', NULL),
  ('owner', 'Owner', 'text', 4, NULL, NULL, NULL),
  ('applies_to', 'Applies To', 'multi_line', 5, NULL, NULL, NULL),
  ('requirement_text', 'Requirement', 'long_text', 6, 'Control', NULL, NULL),
  ('control_reference', 'Control Reference', 'text', 7, 'Control', NULL, NULL),
  ('implementation', 'How It Is Met', 'long_text', 8, 'Control', NULL, NULL),
  ('implemented_in', 'Implemented In (release / item)', 'text', 9, 'Control', NULL, NULL),
  ('verification_method', 'Verification Method', 'dropdown', 10, 'Verification', '[{"value":"test","label":"Test case"},{"value":"review","label":"Design or code review"},{"value":"scan","label":"Automated scan"},{"value":"pen_test","label":"Penetration test"},{"value":"audit","label":"Audit"}]', NULL),
  ('evidence', 'Evidence', 'table', 11, 'Verification', '[{"value":"evidence","label":"Evidence"},{"value":"reference","label":"Reference"},{"value":"date","label":"Date","type":"date"}]', NULL),
  ('verification_result', 'Result', 'dropdown', 12, 'Verification', '[{"value":"pass","label":"Pass"},{"value":"partial","label":"Partly met"},{"value":"fail","label":"Fail"},{"value":"not_verified","label":"Not yet verified"}]', NULL),
  ('verified_by', 'Verified By', 'text', 13, 'Verification', NULL, NULL),
  ('verified_date', 'Verified Date', 'date', 14, 'Verification', NULL, NULL),
  ('waiver_reason', 'Waiver Reason', 'long_text', 15, 'Waiver', NULL, NULL),
  ('waiver_approved_by', 'Waiver Approved By', 'text', 16, 'Waiver', NULL, NULL),
  ('waiver_expiry', 'Waiver Expiry', 'date', 17, 'Waiver', NULL, NULL),
  ('notes', 'Notes', 'long_text', 18, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9003-00000000001c'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"},{"key":"implemented","label":"Implemented"},{"key":"verified","label":"Verified"},{"key":"waived","label":"Waived"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9003-00000000001c'::uuid;

-- ── Threat Assessment (ict_threat_assessment) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9003-00000000001d'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('assessment_reference', 'Assessment Reference', 'text', 0, NULL, NULL, NULL),
  ('system_in_scope', 'System / Change in Scope', 'text', 1, NULL, NULL, NULL),
  ('method', 'Method', 'dropdown', 2, NULL, '[{"value":"workshop","label":"Threat modelling workshop"},{"value":"data_flow","label":"Data flow analysis"},{"value":"attack_tree","label":"Attack trees"},{"value":"checklist","label":"Checklist review"}]', NULL),
  ('assessor', 'Lead Assessor', 'text', 3, NULL, NULL, NULL),
  ('assessment_date', 'Assessment Date', 'date', 4, NULL, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', 5, NULL, NULL, NULL),
  ('assets', 'Assets', 'table', 6, 'Assets & Entry Points', '[{"value":"asset","label":"Asset"},{"value":"classification","label":"Classification","type":"select","options":["Restricted","Confidential","Internal","Public"]}]', NULL),
  ('entry_points', 'Entry Points', 'multi_line', 7, 'Assets & Entry Points', NULL, NULL),
  ('trust_boundaries', 'Trust Boundaries', 'multi_line', 8, 'Assets & Entry Points', NULL, NULL),
  ('threat_list', 'Threats', 'table', 9, 'Threats', '[{"value":"threat","label":"Threat"},{"value":"category","label":"Category","type":"select","options":["Spoofing","Tampering","Repudiation","Information disclosure","Denial of service","Elevation of privilege"]},{"value":"likelihood","label":"Likelihood","type":"select","options":["High","Medium","Low"]},{"value":"impact","label":"Impact","type":"select","options":["High","Medium","Low"]},{"value":"control","label":"Control"}]', NULL),
  ('threats_identified', 'Threats Identified', 'number', 10, 'Risk', NULL, NULL),
  ('high_threats', 'High Threats', 'number', 11, 'Risk', NULL, NULL),
  ('high_share', 'Share of High Threats (%)', 'number', 12, 'Risk', NULL, '{"op":"percent","numerator":"high_threats","denominator":"threats_identified","decimals":0,"display":"percent"}'),
  ('inherent_risk', 'Inherent Risk', 'dropdown', 13, 'Risk', '[{"value":"very_high","label":"Very high"},{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]', NULL),
  ('residual_risk', 'Residual Risk', 'dropdown', 14, 'Risk', '[{"value":"very_high","label":"Very high"},{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]', NULL),
  ('actions', 'Actions', 'table', 15, 'Actions', '[{"value":"action","label":"Action"},{"value":"owner","label":"Owner"},{"value":"due","label":"Due Date","type":"date"},{"value":"status","label":"Status","type":"select","options":["Open","In Progress","Done"]}]', NULL),
  ('notes', 'Notes', 'long_text', 16, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9003-00000000001d'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"planned","label":"Planned"},{"key":"in_progress","label":"In Progress"},{"key":"actions_open","label":"Complete – Actions Open"},{"key":"complete","label":"Complete"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9003-00000000001d'::uuid;

-- ── Vulnerabilities (ict_vulnerabilities) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9003-00000000001e'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('vuln_reference', 'Vulnerability Reference', 'text', 0, NULL, NULL, NULL),
  ('source', 'Found By', 'dropdown', 1, NULL, '[{"value":"scan","label":"Vulnerability scan"},{"value":"pen_test","label":"Penetration test"},{"value":"code_review","label":"Code review"},{"value":"supplier_advisory","label":"Supplier advisory"},{"value":"bug_report","label":"Reported by staff"}]', NULL),
  ('affected_asset', 'Affected Asset', 'text', 2, NULL, NULL, NULL),
  ('environment', 'Environment', 'text', 3, NULL, NULL, NULL),
  ('severity', 'Severity', 'dropdown', 4, NULL, '[{"value":"critical","label":"Critical"},{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]', NULL),
  ('cvss_score', 'Severity Score (0–10)', 'number', 5, NULL, NULL, NULL),
  ('public_reference', 'Public Reference (CVE)', 'text', 6, NULL, NULL, NULL),
  ('found_date', 'Found Date', 'date', 7, NULL, NULL, NULL),
  ('owner', 'Owner', 'text', 8, NULL, NULL, NULL),
  ('remediation', 'Remediation', 'long_text', 9, 'Remediation', NULL, NULL),
  ('sla_days', 'Fix Within (days)', 'number', 10, 'Remediation', NULL, NULL),
  ('due_date', 'Due Date', 'date', 11, 'Remediation', NULL, NULL),
  ('fixed_date', 'Fixed Date', 'date', 12, 'Remediation', NULL, NULL),
  ('retest_result', 'Retest Result', 'dropdown', 13, 'Remediation', '[{"value":"not_retested","label":"Not retested"},{"value":"fixed","label":"Fixed"},{"value":"not_fixed","label":"Not fixed"}]', NULL),
  ('accepted_by', 'Risk Accepted By', 'text', 14, 'Risk Acceptance', NULL, NULL),
  ('acceptance_reason', 'Reason', 'long_text', 15, 'Risk Acceptance', NULL, NULL),
  ('acceptance_expiry', 'Acceptance Expiry', 'date', 16, 'Risk Acceptance', NULL, NULL),
  ('notes', 'Notes', 'long_text', 17, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9003-00000000001e'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"open","label":"Open"},{"key":"in_remediation","label":"In Remediation"},{"key":"closed","label":"Closed"},{"key":"risk_accepted","label":"Risk Accepted"},{"key":"false_positive","label":"False Positive"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9003-00000000001e'::uuid;

-- ── Penetration Testing (ict_penetration_testing) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9003-00000000001f'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('test_reference', 'Test Reference', 'text', 0, NULL, NULL, NULL),
  ('test_type', 'Test Type', 'dropdown', 1, NULL, '[{"value":"external_network","label":"External network"},{"value":"internal_network","label":"Internal network"},{"value":"web_application","label":"Web application"},{"value":"mobile_application","label":"Mobile application"},{"value":"api","label":"API"},{"value":"social_engineering","label":"Social engineering"},{"value":"red_team","label":"Red team"}]', NULL),
  ('approach', 'Approach', 'dropdown', 2, NULL, '[{"value":"black_box","label":"Black box (no inside knowledge)"},{"value":"grey_box","label":"Grey box (some knowledge)"},{"value":"white_box","label":"White box (full knowledge)"}]', NULL),
  ('tester', 'Testing Company / Team', 'text', 3, NULL, NULL, NULL),
  ('test_lead', 'Our Test Lead', 'text', 4, NULL, NULL, NULL),
  ('environment', 'Environment', 'text', 5, NULL, NULL, NULL),
  ('start_date', 'Start Date', 'date', 6, NULL, NULL, NULL),
  ('end_date', 'End Date', 'date', 7, NULL, NULL, NULL),
  ('in_scope', 'In Scope', 'multi_line', 8, 'Scope & Authorisation', NULL, NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', 9, 'Scope & Authorisation', NULL, NULL),
  ('rules_of_engagement', 'Rules of Engagement', 'long_text', 10, 'Scope & Authorisation', NULL, NULL),
  ('authorised_by', 'Authorised By', 'text', 11, 'Scope & Authorisation', NULL, NULL),
  ('findings_critical', 'Critical Findings', 'number', 12, 'Findings', NULL, NULL),
  ('findings_high', 'High Findings', 'number', 13, 'Findings', NULL, NULL),
  ('findings_medium', 'Medium Findings', 'number', 14, 'Findings', NULL, NULL),
  ('findings_low', 'Low Findings', 'number', 15, 'Findings', NULL, NULL),
  ('finding_list', 'Findings', 'table', 16, 'Findings', '[{"value":"finding","label":"Finding"},{"value":"severity","label":"Severity","type":"select","options":["Critical","High","Medium","Low"]},{"value":"vulnerability","label":"Vulnerability Ref"},{"value":"status","label":"Status","type":"select","options":["Open","Fixed","Accepted","Retest passed"]}]', NULL),
  ('report_reference', 'Report Reference', 'text', 17, 'Report & Retest', NULL, NULL),
  ('report_date', 'Report Date', 'date', 18, 'Report & Retest', NULL, NULL),
  ('retest_date', 'Retest Date', 'date', 19, 'Report & Retest', NULL, NULL),
  ('overall_result', 'Overall Result', 'dropdown', 20, 'Report & Retest', '[{"value":"pass","label":"Pass"},{"value":"pass_conditions","label":"Pass with conditions"},{"value":"fail","label":"Fail"}]', NULL),
  ('notes', 'Notes', 'long_text', 21, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9003-00000000001f'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"planned","label":"Planned"},{"key":"scheduled","label":"Scheduled"},{"key":"in_progress","label":"In Progress"},{"key":"report_received","label":"Report Received"},{"key":"retest","label":"Retest"},{"key":"complete","label":"Complete"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9003-00000000001f'::uuid;

COMMIT;

-- Check: fields and tabs per register.
SELECT r.register_key, count(f.*) AS fields, count(DISTINCT COALESCE(f.field_group, 'Details')) AS tabs,
       count(*) FILTER (WHERE f.field_type = 'table') AS table_fields,
       count(*) FILTER (WHERE f.calculation IS NOT NULL) AS calculated_fields
FROM public.local_registers r JOIN public.local_register_fields f ON f.register_id = r.id
WHERE r.id IN ('00000000-0000-4000-9003-00000000001a'::uuid, '00000000-0000-4000-9003-00000000001b'::uuid, '00000000-0000-4000-9003-00000000001c'::uuid, '00000000-0000-4000-9003-00000000001d'::uuid, '00000000-0000-4000-9003-00000000001e'::uuid, '00000000-0000-4000-9003-00000000001f'::uuid)
GROUP BY r.register_key ORDER BY r.register_key;

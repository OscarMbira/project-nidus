-- ============================================================================
-- v1431: Logframe, M&E, Partners, Impact & Learning registers — full forms with tabs (NGO / Development)
-- ============================================================================
-- Owner request 2026-11-11: best-practice fields (including audit and compliance fields), in logical tabs, for the six NGO / Development registers under Logical Framework, Monitoring & Evaluation, Partners and Impact & Learning, which had only Title / Description / Status:
--   Logical Framework (ngo_logical_framework): 14 fields — Details · Result · Indicators · Assumptions & Risks · Revisions · Notes
--   Results Framework (ngo_results_framework): 18 fields — Details · Targets & Progress · Data Collection · Data Quality · Notes
--   M&E Tracking (ngo_me_tracking): 20 fields — Details · Plan · Data Collection · Findings · Notes
--   Partner Register (ngo_partner_register): 28 fields — Details · Capacity · Agreement · Audit & Compliance · Notes
--   Impact Assessment (ngo_impact_assessment): 17 fields — Details · Design · Findings · Use of Findings · Notes
--   Programme Closeout (ngo_programme_closeout): 14 fields — Details · Audit & Finance · Checks & Evidence · Notes
-- Lists with several parts per line are tables (rule 67.1), with dropdown columns where the values are a
-- short fixed list. Indicator achievement, survey response rates, partner capacity scores (average of 1–5 ratings, v1339) and sub-grant disbursement are calculated fields, worked out on save.
-- Status workflows keep their existing keys and gain the states each register needs. Record history (created /
-- updated by and when) is on every form’s Audit details tab (rule 63.1). No records exist yet for these
-- registers, so no saved values change. All fields optional, vendor-neutral (rule 26). Platform register
-- definitions, the Simulator reads the same system register definitions.
-- Sample records: v1432. Prerequisites: v956, v1326, v1375 and the v1339 average calculation in the app. Idempotent.
-- ============================================================================

BEGIN;

-- ── Logical Framework (ngo_logical_framework) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-900a-00000000000d'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('result_code', 'Result Code', 'text', 0, NULL, NULL, NULL),
  ('level', 'Level', 'dropdown', 1, NULL, '[{"value":"goal","label":"Goal (impact)"},{"value":"outcome","label":"Outcome"},{"value":"output","label":"Output"},{"value":"activity","label":"Activity group"}]', NULL),
  ('parent_result', 'Contributes To', 'text', 2, NULL, NULL, NULL),
  ('programme', 'Programme', 'text', 3, NULL, NULL, NULL),
  ('responsible', 'Responsible', 'text', 4, NULL, NULL, NULL),
  ('result_statement', 'Result Statement', 'long_text', 5, 'Result', NULL, NULL),
  ('indicators', 'Indicators', 'table', 6, 'Indicators', '[{"value":"indicator","label":"Indicator"},{"value":"baseline","label":"Baseline"},{"value":"target","label":"Target"},{"value":"verification","label":"Means of Verification"}]', NULL),
  ('assumptions', 'Assumptions', 'multi_line', 7, 'Assumptions & Risks', NULL, NULL),
  ('risks', 'Risks', 'multi_line', 8, 'Assumptions & Risks', NULL, NULL),
  ('version', 'Logframe Version', 'text', 9, 'Revisions', NULL, NULL),
  ('approved_by', 'Approved By', 'text', 10, 'Revisions', NULL, NULL),
  ('approval_date', 'Approved', 'date', 11, 'Revisions', NULL, NULL),
  ('change_log', 'Change Log', 'table', 12, 'Revisions', '[{"value":"version","label":"Version"},{"value":"date","label":"Date","type":"date"},{"value":"change","label":"Change"}]', NULL),
  ('notes', 'Notes', 'long_text', 13, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-900a-00000000000d'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"draft","label":"Draft"},{"key":"in_review","label":"In Review"},{"key":"approved","label":"Approved"},{"key":"revised","label":"Revised"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-900a-00000000000d'::uuid;

-- ── Results Framework (ngo_results_framework) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-900a-00000000000e'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('indicator_code', 'Indicator Code', 'text', 0, NULL, NULL, NULL),
  ('result_level', 'Result Level', 'dropdown', 1, NULL, '[{"value":"impact","label":"Impact"},{"value":"outcome","label":"Outcome"},{"value":"output","label":"Output"}]', NULL),
  ('linked_result', 'Linked Result', 'text', 2, NULL, NULL, NULL),
  ('unit', 'Unit', 'text', 3, NULL, NULL, NULL),
  ('disaggregation', 'Disaggregated By', 'multi_select', 4, NULL, '[{"value":"sex","label":"Sex"},{"value":"age","label":"Age"},{"value":"disability","label":"Disability"},{"value":"location","label":"Location"},{"value":"refugee_host","label":"Refugee / host"}]', NULL),
  ('baseline_value', 'Baseline', 'number', 5, 'Targets & Progress', NULL, NULL),
  ('baseline_year', 'Baseline Year', 'text', 6, 'Targets & Progress', NULL, NULL),
  ('target_value', 'End Target', 'number', 7, 'Targets & Progress', NULL, NULL),
  ('current_value', 'Current Value', 'number', 8, 'Targets & Progress', NULL, NULL),
  ('achievement', 'Achieved (% of target)', 'number', 9, 'Targets & Progress', NULL, '{"op":"percent","numerator":"current_value","denominator":"target_value","display":"percent"}'),
  ('last_updated', 'Last Updated', 'date', 10, 'Targets & Progress', NULL, NULL),
  ('data_source', 'Data Source', 'text', 11, 'Data Collection', NULL, NULL),
  ('method', 'Collection Method', 'dropdown', 12, 'Data Collection', '[{"value":"survey","label":"Household survey"},{"value":"records","label":"Programme records"},{"value":"observation","label":"Observation"},{"value":"government","label":"Government data"},{"value":"interviews","label":"Interviews and focus groups"}]', NULL),
  ('frequency', 'Frequency', 'dropdown', 13, 'Data Collection', '[{"value":"monthly","label":"Monthly"},{"value":"quarterly","label":"Quarterly"},{"value":"annually","label":"Annually"},{"value":"baseline_midline_endline","label":"Baseline, mid-term and endline"}]', NULL),
  ('responsible', 'Responsible', 'text', 14, 'Data Collection', NULL, NULL),
  ('dqa_date', 'Last Data Quality Check', 'date', 15, 'Data Quality', NULL, NULL),
  ('dqa_rating', 'Data Quality Rating', 'dropdown', 16, 'Data Quality', '[{"value":"good","label":"Good"},{"value":"fair","label":"Fair"},{"value":"poor","label":"Poor"},{"value":"not_checked","label":"Not checked"}]', NULL),
  ('notes', 'Notes', 'long_text', 17, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-900a-00000000000e'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"},{"key":"on_track","label":"On Track"},{"key":"off_track","label":"Off Track"},{"key":"achieved","label":"Achieved"},{"key":"dropped","label":"Dropped"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-900a-00000000000e'::uuid;

-- ── M&E Tracking (ngo_me_tracking) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-900a-00000000000f'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('me_reference', 'M&E Reference', 'text', 0, NULL, NULL, NULL),
  ('activity_type', 'Activity Type', 'dropdown', 1, NULL, '[{"value":"baseline","label":"Baseline survey"},{"value":"routine","label":"Routine monitoring"},{"value":"post_distribution","label":"Post-distribution monitoring"},{"value":"midterm","label":"Mid-term review"},{"value":"final_evaluation","label":"Final evaluation"},{"value":"dqa","label":"Data quality assessment"},{"value":"learning_review","label":"Learning review"}]', NULL),
  ('programme', 'Programme', 'text', 2, NULL, NULL, NULL),
  ('countries', 'Countries', 'multi_select', 3, NULL, '[{"value":"kenya","label":"Kenya"},{"value":"uganda","label":"Uganda"},{"value":"tanzania","label":"Tanzania"},{"value":"ethiopia","label":"Ethiopia"},{"value":"south_sudan","label":"South Sudan"},{"value":"somalia","label":"Somalia"}]', NULL),
  ('lead', 'Lead', 'text', 4, NULL, NULL, NULL),
  ('external_evaluator', 'External Evaluator', 'text', 5, NULL, NULL, NULL),
  ('planned_start', 'Planned Start', 'date', 6, 'Plan', NULL, NULL),
  ('planned_end', 'Planned End', 'date', 7, 'Plan', NULL, NULL),
  ('actual_end', 'Actual End', 'date', 8, 'Plan', NULL, NULL),
  ('method', 'Method', 'dropdown', 9, 'Plan', '[{"value":"household_survey","label":"Household survey"},{"value":"kii_fgd","label":"Interviews and focus groups"},{"value":"mixed","label":"Mixed methods"},{"value":"records_review","label":"Records review"},{"value":"observation","label":"Observation"}]', NULL),
  ('indicators_covered', 'Indicators Covered', 'multi_line', 10, 'Plan', NULL, NULL),
  ('budget', 'Budget', 'currency', 11, 'Plan', NULL, NULL),
  ('sample_planned', 'Planned Sample', 'number', 12, 'Data Collection', NULL, NULL),
  ('sample_achieved', 'Achieved Sample', 'number', 13, 'Data Collection', NULL, NULL),
  ('response_rate', 'Achieved (% of sample)', 'number', 14, 'Data Collection', NULL, '{"op":"percent","numerator":"sample_achieved","denominator":"sample_planned","display":"percent"}'),
  ('consent_and_ethics', 'Consent and Ethics Approval', 'boolean', 15, 'Data Collection', NULL, NULL),
  ('key_findings', 'Key Findings', 'multi_line', 16, 'Findings', NULL, NULL),
  ('recommendations', 'Recommendations', 'table', 17, 'Findings', '[{"value":"action","label":"Action"},{"value":"owner","label":"Owner"},{"value":"due","label":"Due Date","type":"date"},{"value":"status","label":"Status","type":"select","options":["Open","In Progress","Done"]}]', NULL),
  ('report_reference', 'Report Reference', 'text', 18, 'Findings', NULL, NULL),
  ('notes', 'Notes', 'long_text', 19, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-900a-00000000000f'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"baseline","label":"Baseline"},{"key":"targets_set","label":"Targets Set"},{"key":"data_collection","label":"Data Collection"},{"key":"results","label":"Results"},{"key":"evaluated","label":"Evaluated"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-900a-00000000000f'::uuid;

-- ── Partner Register (ngo_partner_register) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-900a-000000000010'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('partner_code', 'Partner Code', 'text', 0, NULL, NULL, NULL),
  ('partner_type', 'Partner Type', 'dropdown', 1, NULL, '[{"value":"local_ngo","label":"Local NGO"},{"value":"cbo","label":"Community-based organisation"},{"value":"faith_based","label":"Faith-based organisation"},{"value":"women_led","label":"Women-led organisation"},{"value":"government","label":"Government body"},{"value":"private","label":"Private sector"},{"value":"academic","label":"Academic or research"}]', NULL),
  ('country', 'Country', 'dropdown', 2, NULL, '[{"value":"kenya","label":"Kenya"},{"value":"uganda","label":"Uganda"},{"value":"tanzania","label":"Tanzania"},{"value":"ethiopia","label":"Ethiopia"},{"value":"south_sudan","label":"South Sudan"},{"value":"somalia","label":"Somalia"}]', NULL),
  ('director', 'Director', 'text', 3, NULL, NULL, NULL),
  ('contact_email', 'Contact Email', 'text', 4, NULL, NULL, NULL),
  ('registration_number', 'Registration Number', 'text', 5, NULL, NULL, NULL),
  ('governance_score', 'Governance (1 = weak, 5 = strong)', 'number', 6, 'Capacity', NULL, NULL),
  ('finance_score', 'Financial Management (1 = weak, 5 = strong)', 'number', 7, 'Capacity', NULL, NULL),
  ('programme_score', 'Programme Quality (1 = weak, 5 = strong)', 'number', 8, 'Capacity', NULL, NULL),
  ('safeguarding_score', 'Safeguarding (1 = weak, 5 = strong)', 'number', 9, 'Capacity', NULL, NULL),
  ('me_score', 'Monitoring and Evaluation (1 = weak, 5 = strong)', 'number', 10, 'Capacity', NULL, NULL),
  ('capacity_score', 'Capacity Score', 'number', 11, 'Capacity', NULL, '{"op":"average","fields":["governance_score","finance_score","programme_score","safeguarding_score","me_score"],"of":5,"decimals":0,"display":"percent"}'),
  ('risk_rating', 'Partner Risk Rating', 'dropdown', 12, 'Capacity', '[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]', NULL),
  ('capacity_plan', 'Capacity Strengthening Plan', 'multi_line', 13, 'Capacity', NULL, NULL),
  ('agreement_reference', 'Sub-Grant Agreement', 'text', 14, 'Agreement', NULL, NULL),
  ('programme', 'Programme', 'text', 15, 'Agreement', NULL, NULL),
  ('sub_grant_value', 'Sub-Grant Value', 'currency', 16, 'Agreement', NULL, NULL),
  ('disbursed', 'Disbursed', 'currency', 17, 'Agreement', NULL, NULL),
  ('disbursed_rate', 'Disbursed (%)', 'number', 18, 'Agreement', NULL, '{"op":"percent","numerator":"disbursed","denominator":"sub_grant_value","display":"percent"}'),
  ('agreement_start', 'Start', 'date', 19, 'Agreement', NULL, NULL),
  ('agreement_end', 'End', 'date', 20, 'Agreement', NULL, NULL),
  ('due_diligence_date', 'Due Diligence Completed', 'date', 21, 'Audit & Compliance', NULL, NULL),
  ('last_audit_date', 'Last Audit', 'date', 22, 'Audit & Compliance', NULL, NULL),
  ('audit_opinion', 'Audit Opinion', 'dropdown', 23, 'Audit & Compliance', '[{"value":"unqualified","label":"Unqualified (clean)"},{"value":"qualified","label":"Qualified"},{"value":"adverse","label":"Adverse"},{"value":"disclaimer","label":"Disclaimer"},{"value":"not_yet","label":"Not yet audited"}]', NULL),
  ('audit_findings', 'Audit Findings', 'table', 24, 'Audit & Compliance', '[{"value":"finding","label":"Finding"},{"value":"rating","label":"Rating","type":"select","options":["High","Medium","Low"]},{"value":"status","label":"Status","type":"select","options":["Open","In progress","Closed"]}]', NULL),
  ('safeguarding_policy', 'Safeguarding Policy in Place', 'boolean', 25, 'Audit & Compliance', NULL, NULL),
  ('anti_fraud_policy', 'Anti-Fraud Policy in Place', 'boolean', 26, 'Audit & Compliance', NULL, NULL),
  ('notes', 'Notes', 'long_text', 27, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-900a-000000000010'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"due_diligence","label":"Due Diligence"},{"key":"agreement","label":"Agreement"},{"key":"active","label":"Active"},{"key":"closeout","label":"Closeout"},{"key":"not_selected","label":"Not Selected"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-900a-000000000010'::uuid;

-- ── Impact Assessment (ngo_impact_assessment) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-900a-000000000011'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('assessment_reference', 'Assessment Reference', 'text', 0, NULL, NULL, NULL),
  ('assessment_type', 'Type', 'dropdown', 1, NULL, '[{"value":"impact_evaluation","label":"Impact evaluation"},{"value":"outcome_harvesting","label":"Outcome harvesting"},{"value":"case_study","label":"Case study"},{"value":"cost_effectiveness","label":"Cost-effectiveness analysis"},{"value":"most_significant_change","label":"Most significant change stories"}]', NULL),
  ('programme', 'Programme', 'text', 2, NULL, NULL, NULL),
  ('evaluator', 'Evaluator', 'text', 3, NULL, NULL, NULL),
  ('start_date', 'Start', 'date', 4, NULL, NULL, NULL),
  ('end_date', 'End', 'date', 5, NULL, NULL, NULL),
  ('design', 'Design', 'dropdown', 6, 'Design', '[{"value":"randomised","label":"Randomised comparison"},{"value":"quasi_experimental","label":"Comparison group"},{"value":"pre_post","label":"Before and after"},{"value":"qualitative","label":"Qualitative"},{"value":"mixed","label":"Mixed methods"}]', NULL),
  ('questions', 'Evaluation Questions', 'multi_line', 7, 'Design', NULL, NULL),
  ('sample_size', 'Sample Size', 'number', 8, 'Design', NULL, NULL),
  ('impact_measures', 'Impact Measures', 'table', 9, 'Findings', '[{"value":"measure","label":"Measure"},{"value":"baseline","label":"Baseline"},{"value":"endline","label":"Endline / Latest"},{"value":"change","label":"Change"}]', NULL),
  ('key_findings', 'Key Findings', 'multi_line', 10, 'Findings', NULL, NULL),
  ('cost_per_beneficiary', 'Cost per Beneficiary', 'currency', 11, 'Findings', NULL, NULL),
  ('recommendations', 'Recommendations', 'table', 12, 'Use of Findings', '[{"value":"action","label":"Action"},{"value":"owner","label":"Owner"},{"value":"due","label":"Due Date","type":"date"},{"value":"status","label":"Status","type":"select","options":["Open","In Progress","Done"]}]', NULL),
  ('management_response', 'Management Response', 'long_text', 13, 'Use of Findings', NULL, NULL),
  ('dissemination', 'Shared With', 'multi_line', 14, 'Use of Findings', NULL, NULL),
  ('report_reference', 'Report Reference', 'text', 15, 'Use of Findings', NULL, NULL),
  ('notes', 'Notes', 'long_text', 16, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-900a-000000000011'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"planned","label":"Planned"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-900a-000000000011'::uuid;

-- ── Programme Closeout (ngo_programme_closeout) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-900a-000000000012'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('closeout_reference', 'Closeout Reference', 'text', 0, NULL, NULL, NULL),
  ('programme', 'Programme', 'text', 1, NULL, NULL, NULL),
  ('category', 'Task', 'dropdown', 2, NULL, '[{"value":"final_report","label":"Final narrative report"},{"value":"final_financial","label":"Final financial report"},{"value":"final_audit","label":"Final audit"},{"value":"assets","label":"Asset disposal or transfer"},{"value":"staff","label":"Staff transition"},{"value":"partners","label":"Partner closeout"},{"value":"community_handover","label":"Community handover"},{"value":"records","label":"Records archiving"},{"value":"donor_signoff","label":"Donor sign-off"}]', NULL),
  ('responsible', 'Responsible', 'text', 3, NULL, NULL, NULL),
  ('due_date', 'Due', 'date', 4, NULL, NULL, NULL),
  ('completed_date', 'Completed', 'date', 5, NULL, NULL, NULL),
  ('final_audit_required', 'Final Audit Required', 'boolean', 6, 'Audit & Finance', NULL, NULL),
  ('audit_opinion', 'Final Audit Opinion', 'dropdown', 7, 'Audit & Finance', '[{"value":"unqualified","label":"Unqualified (clean)"},{"value":"qualified","label":"Qualified"},{"value":"adverse","label":"Adverse"},{"value":"disclaimer","label":"Disclaimer"},{"value":"not_yet","label":"Not yet audited"}]', NULL),
  ('unspent_funds', 'Unspent Funds', 'currency', 8, 'Audit & Finance', NULL, NULL),
  ('refund_due', 'Refund Due to the Donor', 'boolean', 9, 'Audit & Finance', NULL, NULL),
  ('checks', 'Checks', 'table', 10, 'Checks & Evidence', '[{"value":"check","label":"Check"},{"value":"done","label":"Done","type":"select","options":["Yes","Partly","No"]}]', NULL),
  ('evidence', 'Evidence', 'table', 11, 'Checks & Evidence', '[{"value":"evidence","label":"Evidence"},{"value":"reference","label":"Reference"}]', NULL),
  ('signed_off_by', 'Signed Off By', 'text', 12, 'Checks & Evidence', NULL, NULL),
  ('notes', 'Notes', 'long_text', 13, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-900a-000000000012'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"open","label":"Open"},{"key":"in_progress","label":"In Progress"},{"key":"closed","label":"Closed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-900a-000000000012'::uuid;

COMMIT;

-- Check: fields and tabs per register.
SELECT r.register_key, count(f.*) AS fields, count(DISTINCT COALESCE(f.field_group, 'Details')) AS tabs,
       count(*) FILTER (WHERE f.field_type = 'table') AS table_fields,
       count(*) FILTER (WHERE f.calculation IS NOT NULL) AS calculated_fields
FROM public.local_registers r JOIN public.local_register_fields f ON f.register_id = r.id
WHERE r.id IN ('00000000-0000-4000-900a-00000000000d'::uuid, '00000000-0000-4000-900a-00000000000e'::uuid, '00000000-0000-4000-900a-00000000000f'::uuid, '00000000-0000-4000-900a-000000000010'::uuid, '00000000-0000-4000-900a-000000000011'::uuid, '00000000-0000-4000-900a-000000000012'::uuid)
GROUP BY r.register_key ORDER BY r.register_key;

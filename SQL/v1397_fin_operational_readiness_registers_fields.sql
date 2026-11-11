-- ============================================================================
-- v1397: Operational Readiness registers — full forms with tabs (Banking & Financial Services)
-- ============================================================================
-- Owner request 2026-11-09: best-practice fields, in logical tabs, for the nine Operational Readiness
-- registers, which had only Title / Description / Status:
--   SOPs (fin_sops): 22 fields — Details · Procedure · Controls · Change Impact · Approval · Notes
--   Process Readiness (fin_process_readiness): 22 fields — Details · Change Impact · Testing · Controls & KPIs · Gaps & Sign-Off · Notes
--   Training (fin_readiness_training): 19 fields — Details · Schedule · Attendance · Materials · Feedback · Notes
--   Branch Readiness (fin_branch_readiness): 26 fields — Details · People · Equipment · Cash & Access · Checklist · Gaps & Sign-Off · Notes
--   Contact Centre Readiness (fin_contact_centre_readiness): 23 fields — Details · People · Scripts & Knowledge · Systems · Volumes & Service Levels · Gaps & Sign-Off · Notes
--   Support Model (fin_support_model): 18 fields — Details · Scope · Service Levels · Escalation & Contacts · Handover · Notes
--   Monitoring (fin_readiness_monitoring): 17 fields — Details · Thresholds · Alerting · Testing · Notes
--   Incident Management (fin_incident_management): 17 fields — Details · Priorities & SLAs · Roles & Rota · Process · Testing · Notes
--   Readiness Sign-Off (fin_readiness_sign_off): 14 fields — Details · Approvers · Evidence · Decision · Notes
-- Lists with several parts per line are tables (rule 67.1), with dropdown columns where the values are a
-- short fixed list. Training, branch workstation and contact centre agent completion are calculated
-- percentages (v1375), worked out on save. Status workflows keep their existing keys and gain the states
-- a readiness item needs (at risk, ready with conditions, retired, live). No records exist yet for these
-- registers, so no saved values change. All fields optional, vendor-neutral (rule 26). Platform register
-- definitions, the Simulator reads the same system register definitions. Sample records: v1398.
-- Prerequisites: v947, v1326, v1375. Idempotent.
-- ============================================================================

BEGIN;

-- ── SOPs (fin_sops) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000029'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('sop_reference', 'SOP Reference', 'text', 0, NULL, NULL, NULL),
  ('business_unit', 'Business Unit', 'dropdown', 1, NULL, '[{"value":"retail_branches","label":"Retail branches"},{"value":"contact_centre","label":"Contact centre"},{"value":"business_banking","label":"Business banking"},{"value":"corporate_trade","label":"Corporate and trade finance"},{"value":"treasury","label":"Treasury"},{"value":"payments_operations","label":"Payments operations"},{"value":"card_operations","label":"Card operations"},{"value":"finance","label":"Finance"},{"value":"risk_compliance","label":"Risk and compliance"},{"value":"digital_channels","label":"Digital channels"},{"value":"it_operations","label":"IT operations"}]', NULL),
  ('process_area', 'Process Area', 'text', 2, NULL, NULL, NULL),
  ('sop_owner', 'SOP Owner', 'user_picker', 3, NULL, NULL, NULL),
  ('sop_type', 'SOP Type', 'dropdown', 4, NULL, '[{"value":"new","label":"New procedure"},{"value":"updated","label":"Updated procedure"},{"value":"retired","label":"Legacy procedure retired"}]', NULL),
  ('version', 'Version', 'text', 5, NULL, NULL, NULL),
  ('criticality', 'Criticality', 'dropdown', 6, NULL, '[{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]', NULL),
  ('effective_date', 'Effective Date', 'date', 7, NULL, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', 8, NULL, NULL, NULL),
  ('purpose', 'Purpose', 'long_text', 9, 'Procedure', NULL, NULL),
  ('procedure_steps', 'Procedure Steps', 'table', 10, 'Procedure', '[{"value":"step","label":"Step"},{"value":"action","label":"Action"},{"value":"role","label":"Role"},{"value":"system","label":"System / Screen"}]', NULL),
  ('systems_used', 'Systems Used', 'multi_line', 11, 'Procedure', NULL, NULL),
  ('controls', 'Controls', 'table', 12, 'Controls', '[{"value":"control","label":"Control"},{"value":"type","label":"Type","type":"select","options":["Preventive","Detective","Manual check"]},{"value":"performed_by","label":"Performed By"}]', NULL),
  ('legacy_procedure', 'Legacy Procedure Replaced', 'text', 13, 'Change Impact', NULL, NULL),
  ('key_changes', 'Key Changes for Staff', 'multi_line', 14, 'Change Impact', NULL, NULL),
  ('training_required', 'Training Required', 'boolean', 15, 'Change Impact', NULL, NULL),
  ('training_reference', 'Training Course', 'text', 16, 'Change Impact', NULL, NULL),
  ('reviewed_by', 'Reviewed By', 'user_picker', 17, 'Approval', NULL, NULL),
  ('approved_by', 'Approved By', 'user_picker', 18, 'Approval', NULL, NULL),
  ('approval_date', 'Approval Date', 'date', 19, 'Approval', NULL, NULL),
  ('published_location', 'Published Location', 'text', 20, 'Approval', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 21, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000029'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"draft","label":"Draft"},{"key":"in_review","label":"In Review"},{"key":"approved","label":"Approved"},{"key":"published","label":"Published"},{"key":"retired","label":"Retired"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000029'::uuid;

-- ── Process Readiness (fin_process_readiness) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-00000000002a'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('readiness_reference', 'Readiness Reference', 'text', 0, NULL, NULL, NULL),
  ('process_name', 'Business Process', 'text', 1, NULL, NULL, NULL),
  ('business_unit', 'Business Unit', 'dropdown', 2, NULL, '[{"value":"retail_branches","label":"Retail branches"},{"value":"contact_centre","label":"Contact centre"},{"value":"business_banking","label":"Business banking"},{"value":"corporate_trade","label":"Corporate and trade finance"},{"value":"treasury","label":"Treasury"},{"value":"payments_operations","label":"Payments operations"},{"value":"card_operations","label":"Card operations"},{"value":"finance","label":"Finance"},{"value":"risk_compliance","label":"Risk and compliance"},{"value":"digital_channels","label":"Digital channels"},{"value":"it_operations","label":"IT operations"}]', NULL),
  ('process_owner', 'Process Owner', 'user_picker', 3, NULL, NULL, NULL),
  ('process_type', 'Process Type', 'dropdown', 4, NULL, '[{"value":"customer_facing","label":"Customer facing"},{"value":"back_office","label":"Back office"},{"value":"finance","label":"Finance and reporting"},{"value":"regulatory","label":"Regulatory"},{"value":"control","label":"Control"}]', NULL),
  ('criticality', 'Criticality', 'dropdown', 5, NULL, '[{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]', NULL),
  ('assessment_date', 'Assessment Date', 'date', 6, NULL, NULL, NULL),
  ('overall_rag', 'Overall RAG', 'dropdown', 7, NULL, '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]', NULL),
  ('process_changes', 'What Changes', 'multi_line', 8, 'Change Impact', NULL, NULL),
  ('impact_level', 'Impact Level', 'dropdown', 9, 'Change Impact', '[{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]', NULL),
  ('sops_updated', 'SOPs Updated', 'boolean', 10, 'Change Impact', NULL, NULL),
  ('sop_references', 'SOP References', 'multi_line', 11, 'Change Impact', NULL, NULL),
  ('tested_in_uat', 'Tested in UAT', 'boolean', 12, 'Testing', NULL, NULL),
  ('tested_in_rehearsal', 'Tested in Dress Rehearsal', 'boolean', 13, 'Testing', NULL, NULL),
  ('test_evidence', 'Test Evidence', 'text', 14, 'Testing', NULL, NULL),
  ('controls_updated', 'Controls Updated', 'boolean', 15, 'Controls & KPIs', NULL, NULL),
  ('manual_workaround', 'Manual Workaround', 'long_text', 16, 'Controls & KPIs', NULL, NULL),
  ('kpis', 'KPIs', 'table', 17, 'Controls & KPIs', '[{"value":"kpi","label":"KPI"},{"value":"target","label":"Target"},{"value":"measured_by","label":"Measured By"}]', NULL),
  ('gaps_and_actions', 'Gaps and Actions', 'table', 18, 'Gaps & Sign-Off', '[{"value":"gap","label":"Gap"},{"value":"action","label":"Action"},{"value":"owner","label":"Owner"},{"value":"due","label":"Due Date","type":"date"}]', NULL),
  ('confirmed_by', 'Confirmed By', 'user_picker', 19, 'Gaps & Sign-Off', NULL, NULL),
  ('confirmation_date', 'Confirmation Date', 'date', 20, 'Gaps & Sign-Off', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 21, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000002a'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"not_ready","label":"Not Ready"},{"key":"at_risk","label":"At Risk"},{"key":"ready_with_conditions","label":"Ready with Conditions"},{"key":"ready","label":"Ready"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-00000000002a'::uuid;

-- ── Training (fin_readiness_training) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-00000000002b'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('training_reference', 'Training Reference', 'text', 0, NULL, NULL, NULL),
  ('business_unit', 'Business Unit', 'dropdown', 1, NULL, '[{"value":"retail_branches","label":"Retail branches"},{"value":"contact_centre","label":"Contact centre"},{"value":"business_banking","label":"Business banking"},{"value":"corporate_trade","label":"Corporate and trade finance"},{"value":"treasury","label":"Treasury"},{"value":"payments_operations","label":"Payments operations"},{"value":"card_operations","label":"Card operations"},{"value":"finance","label":"Finance"},{"value":"risk_compliance","label":"Risk and compliance"},{"value":"digital_channels","label":"Digital channels"},{"value":"it_operations","label":"IT operations"}]', NULL),
  ('target_roles', 'Target Roles', 'multi_line', 2, NULL, NULL, NULL),
  ('delivery_method', 'Delivery Method', 'dropdown', 3, NULL, '[{"value":"classroom","label":"Classroom"},{"value":"virtual","label":"Virtual classroom"},{"value":"e_learning","label":"E-learning"},{"value":"on_the_job","label":"On the job"},{"value":"train_the_trainer","label":"Train the trainer"}]', NULL),
  ('training_lead', 'Training Lead', 'user_picker', 4, NULL, NULL, NULL),
  ('duration_hours', 'Duration (hours)', 'number', 5, NULL, NULL, NULL),
  ('training_environment', 'Training Environment', 'dropdown', 6, NULL, '[{"value":"training","label":"Training environment"},{"value":"uat","label":"UAT"},{"value":"sandbox","label":"Sandbox"}]', NULL),
  ('planned_start', 'Planned Start', 'date', 7, 'Schedule', NULL, NULL),
  ('planned_end', 'Planned End', 'date', 8, 'Schedule', NULL, NULL),
  ('sessions', 'Sessions', 'table', 9, 'Schedule', '[{"value":"session","label":"Session"},{"value":"date","label":"Date","type":"date"},{"value":"location","label":"Location"},{"value":"trainer","label":"Trainer"},{"value":"capacity","label":"Capacity"}]', NULL),
  ('staff_targeted', 'Staff Targeted', 'number', 10, 'Attendance', NULL, NULL),
  ('staff_trained', 'Staff Trained', 'number', 11, 'Attendance', NULL, NULL),
  ('completion', 'Completion', 'number', 12, 'Attendance', NULL, '{"op":"percent","numerator":"staff_trained","denominator":"staff_targeted","decimals":1,"display":"percent"}'),
  ('assessment_pass_rate', 'Assessment Pass Rate (%)', 'number', 13, 'Attendance', NULL, NULL),
  ('materials', 'Materials', 'table', 14, 'Materials', '[{"value":"material","label":"Material"},{"value":"format","label":"Format","type":"select","options":["Slides","Manual","Video","Quick reference card","E-learning module"]},{"value":"status","label":"Status","type":"select","options":["Draft","Ready","Published"]}]', NULL),
  ('average_rating', 'Average Rating (out of 5)', 'number', 15, 'Feedback', NULL, NULL),
  ('feedback', 'Feedback', 'multi_line', 16, 'Feedback', NULL, NULL),
  ('follow_up_actions', 'Follow-Up Actions', 'multi_line', 17, 'Feedback', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 18, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000002b'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"planned","label":"Planned"},{"key":"scheduled","label":"Scheduled"},{"key":"in_progress","label":"In Progress"},{"key":"delivered","label":"Delivered"},{"key":"cancelled","label":"Cancelled"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-00000000002b'::uuid;

-- ── Branch Readiness (fin_branch_readiness) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-00000000002c'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('branch_code', 'Branch Code', 'text', 0, NULL, NULL, NULL),
  ('region', 'Region', 'text', 1, NULL, NULL, NULL),
  ('branch_type', 'Branch Type', 'dropdown', 2, NULL, '[{"value":"full_service","label":"Full service"},{"value":"express","label":"Express"},{"value":"agency","label":"Agency"},{"value":"corporate_centre","label":"Corporate centre"}]', NULL),
  ('branch_manager', 'Branch Manager', 'user_picker', 3, NULL, NULL, NULL),
  ('assessment_date', 'Assessment Date', 'date', 4, NULL, NULL, NULL),
  ('overall_rag', 'Overall RAG', 'dropdown', 5, NULL, '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]', NULL),
  ('staff_count', 'Staff', 'number', 6, 'People', NULL, NULL),
  ('staff_trained', 'Staff Trained', 'number', 7, 'People', NULL, NULL),
  ('training_completion', 'Training Completion', 'number', 8, 'People', NULL, '{"op":"percent","numerator":"staff_trained","denominator":"staff_count","decimals":1,"display":"percent"}'),
  ('super_user', 'Branch Super User', 'text', 9, 'People', NULL, NULL),
  ('weekend_roster_confirmed', 'Cutover Weekend Roster Confirmed', 'boolean', 10, 'People', NULL, NULL),
  ('workstations_total', 'Workstations', 'number', 11, 'Equipment', NULL, NULL),
  ('workstations_ready', 'Workstations Ready', 'number', 12, 'Equipment', NULL, NULL),
  ('workstation_readiness', 'Workstation Readiness', 'number', 13, 'Equipment', NULL, '{"op":"percent","numerator":"workstations_ready","denominator":"workstations_total","decimals":1,"display":"percent"}'),
  ('printers_configured', 'Printers and Passbook Printers Configured', 'boolean', 14, 'Equipment', NULL, NULL),
  ('network_tested', 'Network Tested', 'boolean', 15, 'Equipment', NULL, NULL),
  ('atms', 'ATMs', 'number', 16, 'Equipment', NULL, NULL),
  ('teller_ids_created', 'Teller IDs Created', 'boolean', 17, 'Cash & Access', NULL, NULL),
  ('cash_limits_loaded', 'Cash and Teller Limits Loaded', 'boolean', 18, 'Cash & Access', NULL, NULL),
  ('vault_balances_confirmed', 'Vault Balances Confirmed', 'boolean', 19, 'Cash & Access', NULL, NULL),
  ('access_rights_tested', 'Access Rights Tested', 'boolean', 20, 'Cash & Access', NULL, NULL),
  ('readiness_checks', 'Readiness Checks', 'table', 21, 'Checklist', '[{"value":"check","label":"Check"},{"value":"owner","label":"Owner"},{"value":"status","label":"Status","type":"select","options":["Done","In progress","Not started","Not applicable"]},{"value":"due","label":"Due Date","type":"date"}]', NULL),
  ('gaps_and_actions', 'Gaps and Actions', 'table', 22, 'Gaps & Sign-Off', '[{"value":"gap","label":"Gap"},{"value":"action","label":"Action"},{"value":"owner","label":"Owner"},{"value":"due","label":"Due Date","type":"date"}]', NULL),
  ('confirmed_by', 'Confirmed By', 'user_picker', 23, 'Gaps & Sign-Off', NULL, NULL),
  ('confirmation_date', 'Confirmation Date', 'date', 24, 'Gaps & Sign-Off', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 25, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000002c'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"not_ready","label":"Not Ready"},{"key":"at_risk","label":"At Risk"},{"key":"ready_with_conditions","label":"Ready with Conditions"},{"key":"ready","label":"Ready"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-00000000002c'::uuid;

-- ── Contact Centre Readiness (fin_contact_centre_readiness) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-00000000002d'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('readiness_reference', 'Readiness Reference', 'text', 0, NULL, NULL, NULL),
  ('area', 'Area / Channel', 'dropdown', 1, NULL, '[{"value":"inbound_voice","label":"Inbound voice"},{"value":"outbound","label":"Outbound calls"},{"value":"chat","label":"Chat and messaging"},{"value":"email_social","label":"Email and social media"},{"value":"complaints","label":"Complaints"},{"value":"card_services","label":"Card services"},{"value":"business_line","label":"Business banking line"},{"value":"collections","label":"Collections"}]', NULL),
  ('team_lead', 'Team Lead', 'user_picker', 2, NULL, NULL, NULL),
  ('assessment_date', 'Assessment Date', 'date', 3, NULL, NULL, NULL),
  ('overall_rag', 'Overall RAG', 'dropdown', 4, NULL, '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]', NULL),
  ('agents_required', 'Agents Required', 'number', 5, 'People', NULL, NULL),
  ('agents_trained', 'Agents Trained', 'number', 6, 'People', NULL, NULL),
  ('training_completion', 'Training Completion', 'number', 7, 'People', NULL, '{"op":"percent","numerator":"agents_trained","denominator":"agents_required","decimals":1,"display":"percent"}'),
  ('extra_capacity', 'Extra Agents for Go-Live Week', 'number', 8, 'People', NULL, NULL),
  ('roster_confirmed', 'Go-Live Roster Confirmed', 'boolean', 9, 'People', NULL, NULL),
  ('scripts', 'Scripts', 'table', 10, 'Scripts & Knowledge', '[{"value":"script","label":"Script"},{"value":"topic","label":"Topic"},{"value":"status","label":"Status","type":"select","options":["Draft","Approved","Published"]}]', NULL),
  ('knowledge_base_updated', 'Knowledge Base Updated', 'boolean', 11, 'Scripts & Knowledge', NULL, NULL),
  ('faq_published', 'Customer FAQ Published', 'boolean', 12, 'Scripts & Knowledge', NULL, NULL),
  ('ivr_updated', 'IVR Menus and Messages Updated', 'boolean', 13, 'Systems', NULL, NULL),
  ('crm_tested', 'Agent Desktop Tested with the New Platform', 'boolean', 14, 'Systems', NULL, NULL),
  ('screen_access_tested', 'Agent Screen Access Tested', 'boolean', 15, 'Systems', NULL, NULL),
  ('forecast_daily_contacts', 'Forecast Daily Contacts (go-live week)', 'number', 16, 'Volumes & Service Levels', NULL, NULL),
  ('expected_uplift', 'Expected Uplift (%)', 'number', 17, 'Volumes & Service Levels', NULL, NULL),
  ('service_level_target', 'Service Level Target', 'text', 18, 'Volumes & Service Levels', NULL, NULL),
  ('gaps_and_actions', 'Gaps and Actions', 'table', 19, 'Gaps & Sign-Off', '[{"value":"gap","label":"Gap"},{"value":"action","label":"Action"},{"value":"owner","label":"Owner"},{"value":"due","label":"Due Date","type":"date"}]', NULL),
  ('confirmed_by', 'Confirmed By', 'user_picker', 20, 'Gaps & Sign-Off', NULL, NULL),
  ('confirmation_date', 'Confirmation Date', 'date', 21, 'Gaps & Sign-Off', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 22, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000002d'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"not_ready","label":"Not Ready"},{"key":"at_risk","label":"At Risk"},{"key":"ready_with_conditions","label":"Ready with Conditions"},{"key":"ready","label":"Ready"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-00000000002d'::uuid;

-- ── Support Model (fin_support_model) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-00000000002e'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('service_reference', 'Service Reference', 'text', 0, NULL, NULL, NULL),
  ('support_tier', 'Support Tier', 'dropdown', 1, NULL, '[{"value":"service_desk","label":"Service desk (level 1)"},{"value":"application","label":"Application support (level 2)"},{"value":"vendor","label":"Vendor support (level 3)"},{"value":"infrastructure","label":"Infrastructure support"},{"value":"business_super_users","label":"Business super users"}]', NULL),
  ('support_team', 'Support Team', 'text', 2, NULL, NULL, NULL),
  ('team_lead', 'Team Lead', 'user_picker', 3, NULL, NULL, NULL),
  ('coverage_hours', 'Coverage Hours', 'dropdown', 4, NULL, '[{"value":"business_hours","label":"Business hours"},{"value":"extended","label":"Extended hours"},{"value":"24x7","label":"24 × 7"}]', NULL),
  ('hypercare_coverage', 'Hypercare Coverage', 'text', 5, NULL, NULL, NULL),
  ('effective_from', 'Effective From', 'date', 6, NULL, NULL, NULL),
  ('systems_supported', 'Systems Supported', 'multi_line', 7, 'Scope', NULL, NULL),
  ('services_in_scope', 'Services in Scope', 'multi_line', 8, 'Scope', NULL, NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', 9, 'Scope', NULL, NULL),
  ('sla_targets', 'Service Level Targets', 'table', 10, 'Service Levels', '[{"value":"priority","label":"Priority","type":"select","options":["P1","P2","P3","P4"]},{"value":"response","label":"Response"},{"value":"resolution","label":"Resolution"},{"value":"updates","label":"Update Frequency"}]', NULL),
  ('escalation_path', 'Escalation Path', 'table', 11, 'Escalation & Contacts', '[{"value":"level","label":"Level"},{"value":"contact","label":"Contact"},{"value":"when","label":"When"}]', NULL),
  ('contact_channels', 'Contact Channels', 'multi_line', 12, 'Escalation & Contacts', NULL, NULL),
  ('knowledge_transfer_complete', 'Knowledge Transfer Complete', 'boolean', 13, 'Handover', NULL, NULL),
  ('runbooks_handed_over', 'Runbooks Handed Over', 'boolean', 14, 'Handover', NULL, NULL),
  ('handover_date', 'Handover Date', 'date', 15, 'Handover', NULL, NULL),
  ('accepted_by', 'Accepted By', 'user_picker', 16, 'Handover', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 17, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000002e'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"},{"key":"operational","label":"Operational"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-00000000002e'::uuid;

-- ── Monitoring (fin_readiness_monitoring) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-00000000002f'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('monitor_reference', 'Monitor Reference', 'text', 0, NULL, NULL, NULL),
  ('component', 'Component', 'dropdown', 1, NULL, '[{"value":"core_banking","label":"Core banking platform"},{"value":"integration","label":"Integration layer"},{"value":"channels","label":"Channels"},{"value":"payments","label":"Payments"},{"value":"infrastructure","label":"Infrastructure"},{"value":"database","label":"Database"},{"value":"network","label":"Network"},{"value":"security","label":"Security"},{"value":"batch","label":"Batch and scheduling"},{"value":"reporting","label":"Reporting"},{"value":"business_service","label":"Business service"}]', NULL),
  ('monitor_type', 'Monitor Type', 'dropdown', 2, NULL, '[{"value":"availability","label":"Availability"},{"value":"performance","label":"Performance"},{"value":"capacity","label":"Capacity"},{"value":"batch","label":"Batch / job"},{"value":"interface","label":"Interface / message flow"},{"value":"security","label":"Security"},{"value":"business_kpi","label":"Business KPI"},{"value":"reconciliation","label":"Reconciliation"}]', NULL),
  ('owner', 'Owner', 'user_picker', 3, NULL, NULL, NULL),
  ('environment', 'Environment', 'dropdown', 4, NULL, '[{"value":"production","label":"Production"},{"value":"dr","label":"Disaster recovery site"},{"value":"both","label":"Production and DR"}]', NULL),
  ('metric', 'Metric', 'text', 5, 'Thresholds', NULL, NULL),
  ('warning_threshold', 'Warning Threshold', 'text', 6, 'Thresholds', NULL, NULL),
  ('critical_threshold', 'Critical Threshold', 'text', 7, 'Thresholds', NULL, NULL),
  ('check_frequency', 'Check Frequency', 'text', 8, 'Thresholds', NULL, NULL),
  ('alert_channels', 'Alert Channels', 'multi_select', 9, 'Alerting', '[{"value":"email","label":"Email"},{"value":"sms","label":"SMS"},{"value":"dashboard","label":"Dashboard"},{"value":"on_call","label":"On-call page"},{"value":"ticket","label":"Service desk ticket"}]', NULL),
  ('alert_recipients', 'Alert Recipients', 'multi_line', 10, 'Alerting', NULL, NULL),
  ('escalate_after_minutes', 'Escalate After (minutes)', 'number', 11, 'Alerting', NULL, NULL),
  ('runbook_reference', 'Response Runbook', 'text', 12, 'Alerting', NULL, NULL),
  ('alert_tested', 'Alert Tested', 'boolean', 13, 'Testing', NULL, NULL),
  ('test_date', 'Test Date', 'date', 14, 'Testing', NULL, NULL),
  ('dashboard_ready', 'Dashboard Ready', 'boolean', 15, 'Testing', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 16, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000002f'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"ready","label":"Ready"},{"key":"live","label":"Live"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-00000000002f'::uuid;

-- ── Incident Management (fin_incident_management) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000030'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('item_reference', 'Item Reference', 'text', 0, NULL, NULL, NULL),
  ('element', 'Element', 'dropdown', 1, NULL, '[{"value":"priority_matrix","label":"Priority and impact matrix"},{"value":"major_incident","label":"Major incident process"},{"value":"on_call","label":"On-call rota"},{"value":"ticket_categories","label":"Ticket categories"},{"value":"problem_management","label":"Problem management"},{"value":"communications","label":"Incident communications"},{"value":"vendor_escalation","label":"Vendor escalation"},{"value":"post_incident_review","label":"Post-incident review"},{"value":"tooling","label":"Service desk tooling"}]', NULL),
  ('owner', 'Owner', 'user_picker', 2, NULL, NULL, NULL),
  ('due_date', 'Due Date', 'date', 3, NULL, NULL, NULL),
  ('completion_date', 'Completion Date', 'date', 4, NULL, NULL, NULL),
  ('overall_rag', 'Overall RAG', 'dropdown', 5, NULL, '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]', NULL),
  ('priority_matrix', 'Priority Matrix', 'table', 6, 'Priorities & SLAs', '[{"value":"priority","label":"Priority","type":"select","options":["P1","P2","P3","P4"]},{"value":"definition","label":"Definition"},{"value":"response","label":"Response"},{"value":"resolution","label":"Resolution"}]', NULL),
  ('roles', 'Roles', 'table', 7, 'Roles & Rota', '[{"value":"role","label":"Role"},{"value":"name","label":"Name"},{"value":"contact","label":"Contact"}]', NULL),
  ('rota_published', 'On-Call Rota Published', 'boolean', 8, 'Roles & Rota', NULL, NULL),
  ('rota_period', 'Rota Period', 'text', 9, 'Roles & Rota', NULL, NULL),
  ('process_steps', 'Process Steps', 'multi_line', 10, 'Process', NULL, NULL),
  ('tooling_configured', 'Tooling Configured', 'boolean', 11, 'Process', NULL, NULL),
  ('templates', 'Templates', 'multi_line', 12, 'Process', NULL, NULL),
  ('tested_in_rehearsal', 'Tested in Dress Rehearsal', 'boolean', 13, 'Testing', NULL, NULL),
  ('test_date', 'Test Date', 'date', 14, 'Testing', NULL, NULL),
  ('test_findings', 'Test Findings', 'multi_line', 15, 'Testing', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 16, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000030'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"ready","label":"Ready"},{"key":"live","label":"Live"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000030'::uuid;

-- ── Readiness Sign-Off (fin_readiness_sign_off) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000031'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('signoff_reference', 'Sign-Off Reference', 'text', 0, NULL, NULL, NULL),
  ('signoff_type', 'Sign-Off Area', 'dropdown', 1, NULL, '[{"value":"business_unit","label":"Business unit readiness"},{"value":"processes_sops","label":"Processes and SOPs"},{"value":"training","label":"Training"},{"value":"branch_network","label":"Branch network"},{"value":"contact_centre","label":"Contact centre"},{"value":"support_model","label":"Support model"},{"value":"monitoring","label":"Monitoring"},{"value":"incident_management","label":"Incident management"},{"value":"overall","label":"Overall operational readiness"}]', NULL),
  ('business_unit', 'Business Unit', 'dropdown', 2, NULL, '[{"value":"retail_branches","label":"Retail branches"},{"value":"contact_centre","label":"Contact centre"},{"value":"business_banking","label":"Business banking"},{"value":"corporate_trade","label":"Corporate and trade finance"},{"value":"treasury","label":"Treasury"},{"value":"payments_operations","label":"Payments operations"},{"value":"card_operations","label":"Card operations"},{"value":"finance","label":"Finance"},{"value":"risk_compliance","label":"Risk and compliance"},{"value":"digital_channels","label":"Digital channels"},{"value":"it_operations","label":"IT operations"}]', NULL),
  ('signoff_owner', 'Sign-Off Coordinator', 'user_picker', 3, NULL, NULL, NULL),
  ('requested_date', 'Requested Date', 'date', 4, NULL, NULL, NULL),
  ('due_date', 'Due Date', 'date', 5, NULL, NULL, NULL),
  ('approvers', 'Approvers', 'table', 6, 'Approvers', '[{"value":"department","label":"Department"},{"value":"name","label":"Name"},{"value":"role","label":"Role"},{"value":"decision","label":"Decision","type":"select","options":["Approved","Approved with conditions","Rejected","Pending"]},{"value":"date","label":"Date","type":"date"}]', NULL),
  ('evidence_reviewed', 'Evidence Reviewed', 'table', 7, 'Evidence', '[{"value":"evidence","label":"Evidence"},{"value":"reference","label":"Reference"}]', NULL),
  ('open_issues', 'Open Issues at Sign-Off', 'number', 8, 'Evidence', NULL, NULL),
  ('conditions', 'Conditions / Caveats', 'multi_line', 9, 'Evidence', NULL, NULL),
  ('decision', 'Decision', 'dropdown', 10, 'Decision', '[{"value":"approved","label":"Approved"},{"value":"approved_with_conditions","label":"Approved with conditions"},{"value":"rejected","label":"Rejected"},{"value":"pending","label":"Pending"}]', NULL),
  ('decision_date', 'Decision Date', 'date', 11, 'Decision', NULL, NULL),
  ('decision_comments', 'Decision Comments', 'multi_line', 12, 'Decision', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 13, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000031'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"pending","label":"Pending"},{"key":"signed_off","label":"Signed Off"},{"key":"signed_off_with_conditions","label":"Signed Off with Conditions"},{"key":"rejected","label":"Rejected"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000031'::uuid;

COMMIT;

-- Check: fields and tabs per register.
SELECT r.register_key, count(f.*) AS fields, count(DISTINCT COALESCE(f.field_group, 'Details')) AS tabs,
       count(*) FILTER (WHERE f.field_type = 'table') AS table_fields,
       count(*) FILTER (WHERE f.calculation IS NOT NULL) AS calculated_fields
FROM public.local_registers r JOIN public.local_register_fields f ON f.register_id = r.id
WHERE r.id IN ('00000000-0000-4000-9001-000000000029'::uuid, '00000000-0000-4000-9001-00000000002a'::uuid, '00000000-0000-4000-9001-00000000002b'::uuid, '00000000-0000-4000-9001-00000000002c'::uuid, '00000000-0000-4000-9001-00000000002d'::uuid, '00000000-0000-4000-9001-00000000002e'::uuid, '00000000-0000-4000-9001-00000000002f'::uuid, '00000000-0000-4000-9001-000000000030'::uuid, '00000000-0000-4000-9001-000000000031'::uuid)
GROUP BY r.register_key ORDER BY r.register_key;

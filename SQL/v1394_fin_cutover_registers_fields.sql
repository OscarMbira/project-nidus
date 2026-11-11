-- ============================================================================
-- v1394: Cutover registers — full forms with tabs (Banking & Financial Services → Cutover)
-- ============================================================================
-- Owner request 2026-11-09: best-practice fields, in logical tabs, for the eleven Cutover registers.
-- Eight registers had only Title / Description / Status and now get full forms:
--   Cutover Activities (fin_cutover_activities): 24 fields — Details · Schedule · Dependencies · Execution · Notes
--   Cutover Dependencies (fin_cutover_dependencies): 18 fields — Details · Impact · Tracking · Notes
--   Command Centre (fin_command_centre): 21 fields — Details · Response · Escalation · Impact · Notes
--   Go / No-Go (fin_go_no_go): 20 fields — Details · Criteria · Readiness · Decision · Notes
--   Cutover Communications (fin_cutover_communications): 20 fields — Details · Schedule · Content · Tracking · Notes
--   Business Readiness (fin_business_readiness): 20 fields — Details · People · Process · Checklist · Gaps & Sign-Off · Notes
--   Technology Readiness (fin_technology_readiness): 24 fields — Details · Build & Deploy · Operations · Checklist · Issues & Sign-Off · Notes
--   Cutover Sign-Off (fin_cutover_sign_off): 15 fields — Details · Approvers · Evidence · Decision · Notes
-- The three document registers (Cutover Strategy, Cutover Plan, Rollback Plan) already have full
-- forms (v1322); their splittable lists become tables (rule 67.1):
--   Cutover Strategy (fin_cutover_strategy): Key Milestones, Services & Channels Impacted, Decision Points, Escalation Path, Risks and Mitigations, Roles and Responsibilities, Related Documents
--   Cutover Plan (fin_cutover_plan): Activity Runsheet, Checkpoints, Communication Schedule, Contact List, Risks and Mitigations, Roles and Responsibilities, Related Documents
--   Rollback Plan (fin_rollback_plan): Rollback Steps, Systems to Restore, Backups Required, Post-Rollback Checks, Communication Plan, Risks and Mitigations, Roles and Responsibilities, Related Documents
-- No records exist yet for any of the eleven registers, so no saved values need converting.
-- Shared option lists: the cutover phases match the Strategy / Plan "Cutover Phases" options, and
-- every register that belongs to a run uses the same "Cutover Event" list (mock migration, dress
-- rehearsals 1–3, go-live weekend). Durations, time to resolve, delivery rate and training completion
-- are calculated fields (v1375), worked out on save. Status workflows keep their existing keys and gain
-- the states a cutover needs (blocked, at risk, go with conditions, …). All fields optional;
-- vendor-neutral (rule 26). Platform register definitions; the Simulator reads the same system
-- register definitions. Sample records: v1395.
-- Prerequisites: v947, v1322, v1326, v1375 (date & time + calculated fields). Idempotent.
-- ============================================================================

BEGIN;

-- ── Cutover Activities (fin_cutover_activities) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000020'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('activity_reference', 'Activity Reference', 'text', 0, NULL, NULL, NULL),
  ('cutover_event', 'Cutover Event', 'dropdown', 1, NULL, '[{"value":"mock_migration","label":"Mock migration"},{"value":"dress_rehearsal_1","label":"Dress rehearsal 1"},{"value":"dress_rehearsal_2","label":"Dress rehearsal 2"},{"value":"dress_rehearsal_3","label":"Dress rehearsal 3"},{"value":"go_live","label":"Go-live weekend"}]', NULL),
  ('cutover_phase', 'Cutover Phase', 'dropdown', 2, NULL, '[{"value":"preparation","label":"Preparation"},{"value":"freeze","label":"Freeze"},{"value":"final_migration","label":"Final migration"},{"value":"technical_cutover","label":"Technical cutover"},{"value":"business_validation","label":"Business validation"},{"value":"go_no_go","label":"Go/No-Go"},{"value":"go_live","label":"Go-live"},{"value":"hypercare","label":"Hypercare"}]', NULL),
  ('sequence', 'Run Order', 'number', 3, NULL, NULL, NULL),
  ('activity_type', 'Activity Type', 'dropdown', 4, NULL, '[{"value":"technical","label":"Technical"},{"value":"data_migration","label":"Data migration"},{"value":"business","label":"Business"},{"value":"validation","label":"Validation / reconciliation"},{"value":"communication","label":"Communication"},{"value":"governance","label":"Governance / checkpoint"}]', NULL),
  ('owner', 'Owner', 'user_picker', 5, NULL, NULL, NULL),
  ('team', 'Team', 'text', 6, NULL, NULL, NULL),
  ('critical_path', 'On Critical Path', 'boolean', 7, NULL, NULL, NULL),
  ('can_run_in_parallel', 'Can Run in Parallel', 'boolean', 8, NULL, NULL, NULL),
  ('planned_start', 'Planned Start', 'datetime', 9, 'Schedule', NULL, NULL),
  ('planned_end', 'Planned End', 'datetime', 10, 'Schedule', NULL, NULL),
  ('planned_minutes', 'Planned Duration', 'number', 11, 'Schedule', NULL, '{"op":"minutes_between","start":"planned_start","end":"planned_end","display":"duration"}'),
  ('actual_start', 'Actual Start', 'datetime', 12, 'Schedule', NULL, NULL),
  ('actual_end', 'Actual End', 'datetime', 13, 'Schedule', NULL, NULL),
  ('actual_minutes', 'Actual Duration', 'number', 14, 'Schedule', NULL, '{"op":"minutes_between","start":"actual_start","end":"actual_end","display":"duration"}'),
  ('variance_minutes', 'Over / Under Plan', 'number', 15, 'Schedule', NULL, '{"op":"difference","minuend":"actual_minutes","subtrahend":"planned_minutes","display":"duration"}'),
  ('predecessors', 'Predecessors', 'multi_line', 16, 'Dependencies', NULL, NULL),
  ('successors', 'Successors', 'multi_line', 17, 'Dependencies', NULL, NULL),
  ('systems_involved', 'Systems Involved', 'multi_line', 18, 'Dependencies', NULL, NULL),
  ('instructions', 'Instructions', 'long_text', 19, 'Execution', NULL, NULL),
  ('completion_evidence', 'Completion Evidence', 'text', 20, 'Execution', NULL, NULL),
  ('verified_by', 'Verified By', 'user_picker', 21, 'Execution', NULL, NULL),
  ('issues', 'Issues Raised', 'table', 22, 'Execution', '[{"value":"issue","label":"Issue"},{"value":"impact","label":"Impact"},{"value":"action","label":"Action"},{"value":"owner","label":"Owner"}]', NULL),
  ('notes', 'Notes', 'multi_line', 23, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000020'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"},{"key":"blocked","label":"Blocked"},{"key":"skipped","label":"Skipped"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000020'::uuid;

-- ── Cutover Dependencies (fin_cutover_dependencies) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000021'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('dependency_reference', 'Dependency Reference', 'text', 0, NULL, NULL, NULL),
  ('dependency_type', 'Dependency Type', 'dropdown', 1, NULL, '[{"value":"internal_technical","label":"Internal – technical"},{"value":"internal_business","label":"Internal – business"},{"value":"third_party","label":"Third party / vendor"},{"value":"regulatory","label":"Regulatory"},{"value":"infrastructure","label":"Infrastructure"}]', NULL),
  ('direction', 'Direction', 'dropdown', 2, NULL, '[{"value":"inbound","label":"Cutover depends on it"},{"value":"outbound","label":"It depends on the cutover"}]', NULL),
  ('provider', 'Provided By', 'text', 3, NULL, NULL, NULL),
  ('receiver', 'Needed By (team)', 'text', 4, NULL, NULL, NULL),
  ('cutover_phase', 'Cutover Phase', 'dropdown', 5, NULL, '[{"value":"preparation","label":"Preparation"},{"value":"freeze","label":"Freeze"},{"value":"final_migration","label":"Final migration"},{"value":"technical_cutover","label":"Technical cutover"},{"value":"business_validation","label":"Business validation"},{"value":"go_no_go","label":"Go/No-Go"},{"value":"go_live","label":"Go-live"},{"value":"hypercare","label":"Hypercare"}]', NULL),
  ('owner', 'Owner', 'user_picker', 6, NULL, NULL, NULL),
  ('criticality', 'Criticality', 'dropdown', 7, NULL, '[{"value":"critical","label":"Critical"},{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]', NULL),
  ('needed_by_date', 'Needed By Date', 'date', 8, NULL, NULL, NULL),
  ('committed_date', 'Committed Date', 'date', 9, NULL, NULL, NULL),
  ('impact_if_missed', 'Impact if Missed', 'long_text', 10, 'Impact', NULL, NULL),
  ('affected_activities', 'Affected Activities', 'multi_line', 11, 'Impact', NULL, NULL),
  ('workaround', 'Workaround', 'long_text', 12, 'Impact', NULL, NULL),
  ('rag_status', 'RAG Status', 'dropdown', 13, 'Tracking', '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]', NULL),
  ('confirmation_received', 'Confirmation Received', 'boolean', 14, 'Tracking', NULL, NULL),
  ('confirmation_reference', 'Confirmation Reference', 'text', 15, 'Tracking', NULL, NULL),
  ('progress_updates', 'Progress Updates', 'table', 16, 'Tracking', '[{"value":"date","label":"Date","type":"date"},{"value":"update","label":"Update"},{"value":"by","label":"By"}]', NULL),
  ('notes', 'Notes', 'multi_line', 17, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000021'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"open","label":"Open"},{"key":"at_risk","label":"At Risk"},{"key":"resolved","label":"Resolved"},{"key":"closed","label":"Closed – Not Needed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000021'::uuid;

-- ── Command Centre (fin_command_centre) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000022'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('log_reference', 'Log Reference', 'text', 0, NULL, NULL, NULL),
  ('entry_type', 'Entry Type', 'dropdown', 1, NULL, '[{"value":"issue","label":"Issue"},{"value":"incident","label":"Incident"},{"value":"decision","label":"Decision"},{"value":"status_update","label":"Status update"},{"value":"escalation","label":"Escalation"},{"value":"risk","label":"Risk"},{"value":"action","label":"Action"}]', NULL),
  ('cutover_event', 'Cutover Event', 'dropdown', 2, NULL, '[{"value":"mock_migration","label":"Mock migration"},{"value":"dress_rehearsal_1","label":"Dress rehearsal 1"},{"value":"dress_rehearsal_2","label":"Dress rehearsal 2"},{"value":"dress_rehearsal_3","label":"Dress rehearsal 3"},{"value":"go_live","label":"Go-live weekend"}]', NULL),
  ('cutover_phase', 'Cutover Phase', 'dropdown', 3, NULL, '[{"value":"preparation","label":"Preparation"},{"value":"freeze","label":"Freeze"},{"value":"final_migration","label":"Final migration"},{"value":"technical_cutover","label":"Technical cutover"},{"value":"business_validation","label":"Business validation"},{"value":"go_no_go","label":"Go/No-Go"},{"value":"go_live","label":"Go-live"},{"value":"hypercare","label":"Hypercare"}]', NULL),
  ('workstream', 'Workstream', 'dropdown', 4, NULL, '[{"value":"technical","label":"Technical"},{"value":"data_migration","label":"Data migration"},{"value":"business","label":"Business"},{"value":"testing","label":"Testing"},{"value":"communications","label":"Communications"},{"value":"third_party","label":"Third party"},{"value":"governance","label":"Governance"}]', NULL),
  ('severity', 'Severity', 'dropdown', 5, NULL, '[{"value":"critical","label":"Critical"},{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]', NULL),
  ('logged_at', 'Logged At', 'datetime', 6, NULL, NULL, NULL),
  ('logged_by', 'Logged By', 'user_picker', 7, NULL, NULL, NULL),
  ('assigned_to', 'Assigned To', 'user_picker', 8, 'Response', NULL, NULL),
  ('actions_taken', 'Actions Taken', 'table', 9, 'Response', '[{"value":"time","label":"Time"},{"value":"action","label":"Action"},{"value":"by","label":"By"}]', NULL),
  ('resolution', 'Resolution', 'long_text', 10, 'Response', NULL, NULL),
  ('resolved_at', 'Resolved At', 'datetime', 11, 'Response', NULL, NULL),
  ('time_to_resolve_minutes', 'Time to Resolve', 'number', 12, 'Response', NULL, '{"op":"minutes_between","start":"logged_at","end":"resolved_at","display":"duration"}'),
  ('escalated', 'Escalated', 'boolean', 13, 'Escalation', NULL, NULL),
  ('escalated_to', 'Escalated To', 'text', 14, 'Escalation', NULL, NULL),
  ('decision_required', 'Decision Required', 'boolean', 15, 'Escalation', NULL, NULL),
  ('decision', 'Decision', 'long_text', 16, 'Escalation', NULL, NULL),
  ('timeline_impact_minutes', 'Impact on Timeline (minutes)', 'number', 17, 'Impact', NULL, NULL),
  ('affected_activities', 'Affected Activities', 'multi_line', 18, 'Impact', NULL, NULL),
  ('runbook_reference', 'Runbook / Activity Reference', 'text', 19, 'Impact', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 20, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000022'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"open","label":"Open"},{"key":"monitoring","label":"Monitoring"},{"key":"escalated","label":"Escalated"},{"key":"closed","label":"Closed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000022'::uuid;

-- ── Go / No-Go (fin_go_no_go) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000023'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('checkpoint_reference', 'Checkpoint Reference', 'text', 0, NULL, NULL, NULL),
  ('cutover_event', 'Cutover Event', 'dropdown', 1, NULL, '[{"value":"mock_migration","label":"Mock migration"},{"value":"dress_rehearsal_1","label":"Dress rehearsal 1"},{"value":"dress_rehearsal_2","label":"Dress rehearsal 2"},{"value":"dress_rehearsal_3","label":"Dress rehearsal 3"},{"value":"go_live","label":"Go-live weekend"}]', NULL),
  ('cutover_phase', 'Cutover Phase', 'dropdown', 2, NULL, '[{"value":"preparation","label":"Preparation"},{"value":"freeze","label":"Freeze"},{"value":"final_migration","label":"Final migration"},{"value":"technical_cutover","label":"Technical cutover"},{"value":"business_validation","label":"Business validation"},{"value":"go_no_go","label":"Go/No-Go"},{"value":"go_live","label":"Go-live"},{"value":"hypercare","label":"Hypercare"}]', NULL),
  ('sequence', 'Checkpoint Order', 'number', 3, NULL, NULL, NULL),
  ('scheduled_at', 'Scheduled At', 'datetime', 4, NULL, NULL, NULL),
  ('decision_forum', 'Decision Forum', 'text', 5, NULL, NULL, NULL),
  ('chair', 'Chair', 'user_picker', 6, NULL, NULL, NULL),
  ('criteria', 'Criteria', 'table', 7, 'Criteria', '[{"value":"criterion","label":"Criterion"},{"value":"owner","label":"Owner"},{"value":"status","label":"Status","type":"select","options":["Met","Met with conditions","Not met","Not assessed"]},{"value":"evidence","label":"Evidence"}]', NULL),
  ('open_critical_defects', 'Open Critical Defects', 'number', 8, 'Readiness', NULL, NULL),
  ('open_high_defects', 'Open High Defects', 'number', 9, 'Readiness', NULL, NULL),
  ('reconciliation_status', 'Reconciliation Status', 'dropdown', 10, 'Readiness', '[{"value":"balanced","label":"Balanced"},{"value":"differences_explained","label":"Differences explained"},{"value":"differences_open","label":"Differences open"},{"value":"not_run","label":"Not run yet"}]', NULL),
  ('schedule_variance_minutes', 'Schedule Variance (minutes)', 'number', 11, 'Readiness', NULL, NULL),
  ('readiness_summary', 'Readiness Summary', 'long_text', 12, 'Readiness', NULL, NULL),
  ('decision_at', 'Decision Time', 'datetime', 13, 'Decision', NULL, NULL),
  ('decision_rationale', 'Decision Rationale', 'long_text', 14, 'Decision', NULL, NULL),
  ('conditions', 'Conditions', 'multi_line', 15, 'Decision', NULL, NULL),
  ('attendees', 'Attendees and Votes', 'table', 16, 'Decision', '[{"value":"name","label":"Name"},{"value":"role","label":"Role"},{"value":"vote","label":"Vote","type":"select","options":["Go","No-Go","Abstain","Not present"]}]', NULL),
  ('rollback_invoked', 'Rollback Invoked', 'boolean', 17, 'Decision', NULL, NULL),
  ('next_checkpoint', 'Next Checkpoint', 'text', 18, 'Decision', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 19, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000023'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"pending","label":"Pending"},{"key":"go","label":"Go"},{"key":"go_with_conditions","label":"Go with Conditions"},{"key":"no_go","label":"No-Go"},{"key":"deferred","label":"Deferred"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000023'::uuid;

-- ── Cutover Communications (fin_cutover_communications) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000025'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('comm_reference', 'Communication Reference', 'text', 0, NULL, NULL, NULL),
  ('communication_type', 'Communication Type', 'dropdown', 1, NULL, '[{"value":"announcement","label":"Announcement"},{"value":"reminder","label":"Reminder"},{"value":"instructions","label":"Instructions"},{"value":"status_update","label":"Status update"},{"value":"service_disruption","label":"Service disruption notice"},{"value":"go_live_confirmation","label":"Go-live confirmation"},{"value":"rollback_notice","label":"Rollback notice"}]', NULL),
  ('audiences', 'Audiences', 'multi_select', 2, NULL, '[{"value":"customers","label":"Customers"},{"value":"staff","label":"All staff"},{"value":"branches","label":"Branches"},{"value":"contact_centre","label":"Contact centre"},{"value":"regulator","label":"Regulator"},{"value":"correspondent_banks","label":"Correspondent banks"},{"value":"vendors","label":"Vendors and partners"},{"value":"executives","label":"Executive committee"},{"value":"board","label":"Board"},{"value":"media","label":"Media"}]', NULL),
  ('channels', 'Channels', 'multi_select', 3, NULL, '[{"value":"email","label":"Email"},{"value":"sms","label":"SMS"},{"value":"website","label":"Website"},{"value":"mobile_app","label":"Mobile app"},{"value":"branch_notice","label":"Branch notice"},{"value":"intranet","label":"Intranet"},{"value":"letter","label":"Letter"},{"value":"press_release","label":"Press release"},{"value":"conference_call","label":"Conference call"}]', NULL),
  ('cutover_phase', 'Cutover Phase', 'dropdown', 4, NULL, '[{"value":"preparation","label":"Preparation"},{"value":"freeze","label":"Freeze"},{"value":"final_migration","label":"Final migration"},{"value":"technical_cutover","label":"Technical cutover"},{"value":"business_validation","label":"Business validation"},{"value":"go_no_go","label":"Go/No-Go"},{"value":"go_live","label":"Go-live"},{"value":"hypercare","label":"Hypercare"}]', NULL),
  ('sender', 'Sender', 'user_picker', 5, NULL, NULL, NULL),
  ('approver', 'Approver', 'user_picker', 6, NULL, NULL, NULL),
  ('scheduled_send', 'Scheduled Send', 'datetime', 7, 'Schedule', NULL, NULL),
  ('actual_send', 'Actual Send', 'datetime', 8, 'Schedule', NULL, NULL),
  ('trigger_condition', 'Trigger / Condition', 'text', 9, 'Schedule', NULL, NULL),
  ('approval_date', 'Approval Date', 'date', 10, 'Schedule', NULL, NULL),
  ('key_messages', 'Key Messages', 'multi_line', 11, 'Content', NULL, NULL),
  ('message_body', 'Message', 'long_text', 12, 'Content', NULL, NULL),
  ('call_to_action', 'Call to Action', 'text', 13, 'Content', NULL, NULL),
  ('contact_point', 'Contact Point for Questions', 'text', 14, 'Content', NULL, NULL),
  ('recipients', 'Recipients', 'number', 15, 'Tracking', NULL, NULL),
  ('delivered', 'Delivered', 'number', 16, 'Tracking', NULL, NULL),
  ('delivery_rate', 'Delivery Rate', 'number', 17, 'Tracking', NULL, '{"op":"percent","numerator":"delivered","denominator":"recipients","decimals":1,"display":"percent"}'),
  ('feedback', 'Feedback and Queries', 'multi_line', 18, 'Tracking', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 19, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000025'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"planned","label":"Planned"},{"key":"approved","label":"Approved"},{"key":"sent","label":"Sent"},{"key":"cancelled","label":"Cancelled"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000025'::uuid;

-- ── Business Readiness (fin_business_readiness) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000026'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('readiness_reference', 'Readiness Reference', 'text', 0, NULL, NULL, NULL),
  ('business_unit', 'Business Unit', 'dropdown', 1, NULL, '[{"value":"retail_branches","label":"Retail branches"},{"value":"contact_centre","label":"Contact centre"},{"value":"business_banking","label":"Business banking"},{"value":"corporate_trade","label":"Corporate and trade finance"},{"value":"treasury","label":"Treasury"},{"value":"payments_operations","label":"Payments operations"},{"value":"card_operations","label":"Card operations"},{"value":"finance","label":"Finance"},{"value":"risk_compliance","label":"Risk and compliance"},{"value":"digital_channels","label":"Digital channels"}]', NULL),
  ('readiness_owner', 'Readiness Owner', 'user_picker', 2, NULL, NULL, NULL),
  ('cutover_event', 'Assessed For', 'dropdown', 3, NULL, '[{"value":"mock_migration","label":"Mock migration"},{"value":"dress_rehearsal_1","label":"Dress rehearsal 1"},{"value":"dress_rehearsal_2","label":"Dress rehearsal 2"},{"value":"dress_rehearsal_3","label":"Dress rehearsal 3"},{"value":"go_live","label":"Go-live weekend"}]', NULL),
  ('assessment_date', 'Assessment Date', 'date', 4, NULL, NULL, NULL),
  ('overall_rag', 'Overall RAG', 'dropdown', 5, NULL, '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]', NULL),
  ('staff_impacted', 'Staff Impacted', 'number', 6, 'People', NULL, NULL),
  ('staff_trained', 'Staff Trained', 'number', 7, 'People', NULL, NULL),
  ('training_completion', 'Training Completion', 'number', 8, 'People', NULL, '{"op":"percent","numerator":"staff_trained","denominator":"staff_impacted","decimals":1,"display":"percent"}'),
  ('super_users_assigned', 'Super Users Assigned', 'boolean', 9, 'People', NULL, NULL),
  ('cutover_roster_confirmed', 'Cutover Roster Confirmed', 'boolean', 10, 'People', NULL, NULL),
  ('procedures_updated', 'Procedures Updated', 'boolean', 11, 'Process', NULL, NULL),
  ('manual_workarounds_ready', 'Manual Workarounds Ready', 'boolean', 12, 'Process', NULL, NULL),
  ('freeze_procedures', 'Freeze-Period Procedures', 'multi_line', 13, 'Process', NULL, NULL),
  ('continuity_confirmed', 'Business Continuity Confirmed', 'boolean', 14, 'Process', NULL, NULL),
  ('readiness_checks', 'Readiness Checks', 'table', 15, 'Checklist', '[{"value":"check","label":"Check"},{"value":"owner","label":"Owner"},{"value":"status","label":"Status","type":"select","options":["Done","In progress","Not started","Not applicable"]},{"value":"due","label":"Due Date","type":"date"}]', NULL),
  ('gaps_and_actions', 'Gaps and Actions', 'table', 16, 'Gaps & Sign-Off', '[{"value":"gap","label":"Gap"},{"value":"action","label":"Action"},{"value":"owner","label":"Owner"},{"value":"due","label":"Due Date","type":"date"}]', NULL),
  ('confirmed_by', 'Confirmed By', 'user_picker', 17, 'Gaps & Sign-Off', NULL, NULL),
  ('confirmation_date', 'Confirmation Date', 'date', 18, 'Gaps & Sign-Off', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 19, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000026'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"not_ready","label":"Not Ready"},{"key":"at_risk","label":"At Risk"},{"key":"ready_with_conditions","label":"Ready with Conditions"},{"key":"ready","label":"Ready"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000026'::uuid;

-- ── Technology Readiness (fin_technology_readiness) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000027'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('readiness_reference', 'Readiness Reference', 'text', 0, NULL, NULL, NULL),
  ('component_type', 'Component Type', 'dropdown', 1, NULL, '[{"value":"core_banking","label":"Core banking platform"},{"value":"integration","label":"Integration layer"},{"value":"channels","label":"Channels"},{"value":"payments","label":"Payments"},{"value":"infrastructure","label":"Infrastructure"},{"value":"database","label":"Database"},{"value":"network","label":"Network"},{"value":"security","label":"Security"},{"value":"batch","label":"Batch and scheduling"},{"value":"monitoring","label":"Monitoring"},{"value":"reporting","label":"Reporting"}]', NULL),
  ('system_name', 'System / Component', 'text', 2, NULL, NULL, NULL),
  ('environment', 'Environment', 'dropdown', 3, NULL, '[{"value":"production","label":"Production"},{"value":"dr","label":"Disaster recovery site"},{"value":"both","label":"Production and DR"}]', NULL),
  ('technical_owner', 'Technical Owner', 'user_picker', 4, NULL, NULL, NULL),
  ('cutover_event', 'Assessed For', 'dropdown', 5, NULL, '[{"value":"mock_migration","label":"Mock migration"},{"value":"dress_rehearsal_1","label":"Dress rehearsal 1"},{"value":"dress_rehearsal_2","label":"Dress rehearsal 2"},{"value":"dress_rehearsal_3","label":"Dress rehearsal 3"},{"value":"go_live","label":"Go-live weekend"}]', NULL),
  ('assessment_date', 'Assessment Date', 'date', 6, NULL, NULL, NULL),
  ('overall_rag', 'Overall RAG', 'dropdown', 7, NULL, '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]', NULL),
  ('build_version', 'Build / Version', 'text', 8, 'Build & Deploy', NULL, NULL),
  ('config_baselined', 'Configuration Baselined', 'boolean', 9, 'Build & Deploy', NULL, NULL),
  ('deployed_to_production', 'Deployed to Production', 'boolean', 10, 'Build & Deploy', NULL, NULL),
  ('deployment_date', 'Deployment Date', 'date', 11, 'Build & Deploy', NULL, NULL),
  ('monitoring_in_place', 'Monitoring in Place', 'boolean', 12, 'Operations', NULL, NULL),
  ('backups_verified', 'Backups Verified', 'boolean', 13, 'Operations', NULL, NULL),
  ('dr_failover_tested', 'DR Failover Tested', 'boolean', 14, 'Operations', NULL, NULL),
  ('batch_schedule_ready', 'Batch Schedule Ready', 'boolean', 15, 'Operations', NULL, NULL),
  ('access_provisioned', 'Production Access Provisioned', 'boolean', 16, 'Operations', NULL, NULL),
  ('performance_verified', 'Performance Verified', 'boolean', 17, 'Operations', NULL, NULL),
  ('security_cleared', 'Security Cleared', 'boolean', 18, 'Operations', NULL, NULL),
  ('readiness_checks', 'Readiness Checks', 'table', 19, 'Checklist', '[{"value":"check","label":"Check"},{"value":"owner","label":"Owner"},{"value":"status","label":"Status","type":"select","options":["Done","In progress","Not started","Not applicable"]},{"value":"due","label":"Due Date","type":"date"}]', NULL),
  ('open_issues', 'Open Issues', 'table', 20, 'Issues & Sign-Off', '[{"value":"issue","label":"Issue"},{"value":"severity","label":"Severity","type":"select","options":["Critical","High","Medium","Low"]},{"value":"action","label":"Action"},{"value":"owner","label":"Owner"}]', NULL),
  ('confirmed_by', 'Confirmed By', 'user_picker', 21, 'Issues & Sign-Off', NULL, NULL),
  ('confirmation_date', 'Confirmation Date', 'date', 22, 'Issues & Sign-Off', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 23, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000027'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"not_ready","label":"Not Ready"},{"key":"at_risk","label":"At Risk"},{"key":"ready_with_conditions","label":"Ready with Conditions"},{"key":"ready","label":"Ready"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000027'::uuid;

-- ── Cutover Sign-Off (fin_cutover_sign_off) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000028'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('signoff_reference', 'Sign-Off Reference', 'text', 0, NULL, NULL, NULL),
  ('signoff_type', 'Sign-Off Type', 'dropdown', 1, NULL, '[{"value":"strategy_baseline","label":"Cutover strategy baseline"},{"value":"plan_baseline","label":"Cutover plan baseline"},{"value":"rehearsal_exit","label":"Dress rehearsal exit"},{"value":"business_readiness","label":"Business readiness"},{"value":"technical_readiness","label":"Technical readiness"},{"value":"data_reconciliation","label":"Final data reconciliation"},{"value":"business_verification","label":"Business verification"},{"value":"go_live_approval","label":"Go-live approval"},{"value":"cutover_closure","label":"Cutover closure and hypercare entry"}]', NULL),
  ('cutover_event', 'Cutover Event', 'dropdown', 2, NULL, '[{"value":"mock_migration","label":"Mock migration"},{"value":"dress_rehearsal_1","label":"Dress rehearsal 1"},{"value":"dress_rehearsal_2","label":"Dress rehearsal 2"},{"value":"dress_rehearsal_3","label":"Dress rehearsal 3"},{"value":"go_live","label":"Go-live weekend"}]', NULL),
  ('signoff_owner', 'Sign-Off Coordinator', 'user_picker', 3, NULL, NULL, NULL),
  ('requested_date', 'Requested Date', 'date', 4, NULL, NULL, NULL),
  ('due_date', 'Due Date', 'date', 5, NULL, NULL, NULL),
  ('approvers', 'Approvers', 'table', 6, 'Approvers', '[{"value":"department","label":"Department"},{"value":"name","label":"Name"},{"value":"role","label":"Role"},{"value":"decision","label":"Decision","type":"select","options":["Approved","Approved with conditions","Rejected","Pending"]},{"value":"date","label":"Date","type":"date"}]', NULL),
  ('evidence_reviewed', 'Evidence Reviewed', 'table', 7, 'Evidence', '[{"value":"evidence","label":"Evidence"},{"value":"reference","label":"Reference"}]', NULL),
  ('open_defects', 'Open Defects at Sign-Off', 'number', 8, 'Evidence', NULL, NULL),
  ('reconciliation_reference', 'Reconciliation Reference', 'text', 9, 'Evidence', NULL, NULL),
  ('conditions', 'Conditions / Caveats', 'multi_line', 10, 'Evidence', NULL, NULL),
  ('decision', 'Decision', 'dropdown', 11, 'Decision', '[{"value":"approved","label":"Approved"},{"value":"approved_with_conditions","label":"Approved with conditions"},{"value":"rejected","label":"Rejected"},{"value":"pending","label":"Pending"}]', NULL),
  ('decision_date', 'Decision Date', 'date', 12, 'Decision', NULL, NULL),
  ('decision_comments', 'Decision Comments', 'multi_line', 13, 'Decision', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 14, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000028'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"pending","label":"Pending"},{"key":"signed_off","label":"Signed Off"},{"key":"signed_off_with_conditions","label":"Signed Off with Conditions"},{"key":"rejected","label":"Rejected"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000028'::uuid;

-- ── Cutover Strategy (fin_cutover_strategy): lists → tables (rule 67.1) ──
UPDATE public.local_register_fields f
SET field_type = 'table', field_label = v.field_label, dropdown_options = v.columns::jsonb, updated_at = NOW()
FROM (VALUES
  ('key_milestones', 'Key Milestones', '[{"value":"milestone","label":"Milestone"},{"value":"date","label":"Target Date","type":"date"},{"value":"owner","label":"Owner"}]'),
  ('services_and_channels_impacted', 'Services & Channels Impacted', '[{"value":"service","label":"Service / Channel"},{"value":"impact","label":"Impact"},{"value":"window","label":"Downtime Window"}]'),
  ('decision_points', 'Decision Points', '[{"value":"when","label":"When"},{"value":"decision_point","label":"Decision Point"},{"value":"decision_owner","label":"Decision Owner"}]'),
  ('escalation_path', 'Escalation Path', '[{"value":"escalate_to","label":"Escalate To"},{"value":"when","label":"When / Threshold"}]'),
  ('risks_mitigations', 'Risks and Mitigations', '[{"value":"risk","label":"Risk"},{"value":"impact","label":"Impact"},{"value":"mitigation","label":"Mitigation"},{"value":"owner","label":"Owner"}]'),
  ('roles_and_responsibilities', 'Roles and Responsibilities', '[{"value":"role","label":"Role"},{"value":"responsibility","label":"Responsibility"},{"value":"name","label":"Name"}]'),
  ('related_documents', 'Related Documents', '[{"value":"document","label":"Document"},{"value":"reference","label":"Reference"}]')
) AS v(field_key, field_label, columns)
WHERE f.register_id = '00000000-0000-4000-9001-00000000001e'::uuid AND f.field_key = v.field_key;

-- ── Cutover Plan (fin_cutover_plan): lists → tables (rule 67.1) ──
UPDATE public.local_register_fields f
SET field_type = 'table', field_label = v.field_label, dropdown_options = v.columns::jsonb, updated_at = NOW()
FROM (VALUES
  ('activity_runsheet', 'Activity Runsheet', '[{"value":"seq","label":"Seq"},{"value":"activity","label":"Activity"},{"value":"owner","label":"Owner"},{"value":"start","label":"Start"},{"value":"duration","label":"Duration"}]'),
  ('checkpoints', 'Checkpoints', '[{"value":"checkpoint","label":"Checkpoint"},{"value":"time","label":"Time"},{"value":"decision_owner","label":"Decision Owner"}]'),
  ('communication_schedule', 'Communication Schedule', '[{"value":"when","label":"When"},{"value":"audience","label":"Audience"},{"value":"message","label":"Message"},{"value":"channel","label":"Channel"}]'),
  ('contact_list', 'Contact List', '[{"value":"name","label":"Name"},{"value":"role","label":"Role"},{"value":"phone","label":"Phone"}]'),
  ('risks_mitigations', 'Risks and Mitigations', '[{"value":"risk","label":"Risk"},{"value":"impact","label":"Impact"},{"value":"mitigation","label":"Mitigation"},{"value":"owner","label":"Owner"}]'),
  ('roles_and_responsibilities', 'Roles and Responsibilities', '[{"value":"role","label":"Role"},{"value":"responsibility","label":"Responsibility"},{"value":"name","label":"Name"}]'),
  ('related_documents', 'Related Documents', '[{"value":"document","label":"Document"},{"value":"reference","label":"Reference"}]')
) AS v(field_key, field_label, columns)
WHERE f.register_id = '00000000-0000-4000-9001-00000000001f'::uuid AND f.field_key = v.field_key;

-- ── Rollback Plan (fin_rollback_plan): lists → tables (rule 67.1) ──
UPDATE public.local_register_fields f
SET field_type = 'table', field_label = v.field_label, dropdown_options = v.columns::jsonb, updated_at = NOW()
FROM (VALUES
  ('rollback_steps', 'Rollback Steps', '[{"value":"seq","label":"Seq"},{"value":"step","label":"Step"},{"value":"owner","label":"Owner"},{"value":"duration","label":"Duration"}]'),
  ('systems_to_restore', 'Systems to Restore', '[{"value":"system","label":"System"},{"value":"order","label":"Restore Order"},{"value":"owner","label":"Owner"}]'),
  ('backups_required', 'Backups Required', '[{"value":"backup","label":"Backup"},{"value":"taken_at","label":"Taken At"},{"value":"verified","label":"Verified","type":"select","options":["Yes","No","Not tested"]}]'),
  ('post_rollback_checks', 'Post-Rollback Checks', '[{"value":"check","label":"Check"},{"value":"owner","label":"Owner"},{"value":"result","label":"Result","type":"select","options":["Pass","Fail","Not run"]}]'),
  ('communication_plan', 'Communication Plan', '[{"value":"audience","label":"Audience"},{"value":"message","label":"Message"},{"value":"when","label":"When"},{"value":"owner","label":"Owner"}]'),
  ('risks_mitigations', 'Risks and Mitigations', '[{"value":"risk","label":"Risk"},{"value":"impact","label":"Impact"},{"value":"mitigation","label":"Mitigation"},{"value":"owner","label":"Owner"}]'),
  ('roles_and_responsibilities', 'Roles and Responsibilities', '[{"value":"role","label":"Role"},{"value":"responsibility","label":"Responsibility"},{"value":"name","label":"Name"}]'),
  ('related_documents', 'Related Documents', '[{"value":"document","label":"Document"},{"value":"reference","label":"Reference"}]')
) AS v(field_key, field_label, columns)
WHERE f.register_id = '00000000-0000-4000-9001-000000000024'::uuid AND f.field_key = v.field_key;

COMMIT;

-- Check: fields and tabs per register (Cutover Strategy 38, Cutover Plan 36, Rollback Plan 35 unchanged).
SELECT r.register_key, count(f.*) AS fields, count(DISTINCT COALESCE(f.field_group, 'Details')) AS tabs,
       count(*) FILTER (WHERE f.field_type = 'table') AS table_fields,
       count(*) FILTER (WHERE f.calculation IS NOT NULL) AS calculated_fields
FROM public.local_registers r JOIN public.local_register_fields f ON f.register_id = r.id
WHERE r.id IN ('00000000-0000-4000-9001-000000000020', '00000000-0000-4000-9001-000000000021', '00000000-0000-4000-9001-000000000022', '00000000-0000-4000-9001-000000000023', '00000000-0000-4000-9001-000000000025', '00000000-0000-4000-9001-000000000026', '00000000-0000-4000-9001-000000000027', '00000000-0000-4000-9001-000000000028', '00000000-0000-4000-9001-00000000001e', '00000000-0000-4000-9001-00000000001f', '00000000-0000-4000-9001-000000000024')
GROUP BY r.register_key ORDER BY r.register_key;

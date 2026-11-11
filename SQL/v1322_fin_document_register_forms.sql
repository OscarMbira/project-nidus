-- ============================================================================
-- v1322: Banking & Financial Services — complete document forms (v1318 PRD d.3)
-- ============================================================================
-- Owner decision 2026-10-24: full best-practice forms for the empty document registers.
-- Every form has the standard frame (Details: reference, version, owner*, next review; an
-- Introduction tab for strategy/plan/architecture/design documents; Risks & Roles; Glossary &
-- Appendices; Document Control) plus register-specific tabs. Vendor-neutral names (rule 26).
-- Field keys glossary / appendices / version_history / related_documents are placed by the
-- complete document export (Glossary as section 2, Appendices, Document Control page).
-- 6 registers, 215 fields. Prerequisites: v1316 (long_text type), v1321. Idempotent.
-- ============================================================================

-- ── fin_cutover_strategy: 38 fields, Details + 8 tabs ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('cutover_approach', 'Cutover Approach', 'dropdown', false, 4, NULL, '[{"value":"big_bang","label":"Big bang"},{"value":"phased","label":"Phased"},{"value":"parallel_run","label":"Parallel run"},{"value":"pilot_then_rollout","label":"Pilot then rollout"}]'),
  ('target_go_live_date', 'Target Go-Live Date', 'date', false, 5, NULL, NULL),
  ('cutover_window_start', 'Cutover Window Start', 'date', false, 6, NULL, NULL),
  ('cutover_window_end', 'Cutover Window End', 'date', false, 7, NULL, NULL),
  ('purpose', 'Purpose', 'long_text', false, 8, 'Introduction', NULL),
  ('objectives', 'Objectives', 'multi_line', false, 9, 'Introduction', NULL),
  ('scope', 'Scope', 'multi_line', false, 10, 'Introduction', NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', false, 11, 'Introduction', NULL),
  ('assumptions', 'Assumptions', 'multi_line', false, 12, 'Introduction', NULL),
  ('constraints', 'Constraints', 'multi_line', false, 13, 'Introduction', NULL),
  ('approach_description', 'Approach Description', 'long_text', false, 14, 'Cutover Approach', NULL),
  ('cutover_phases', 'Cutover Phases', 'multi_select', false, 15, 'Cutover Approach', '[{"value":"preparation","label":"Preparation"},{"value":"freeze","label":"Freeze"},{"value":"final_migration","label":"Final migration"},{"value":"technical_cutover","label":"Technical cutover"},{"value":"business_validation","label":"Business validation"},{"value":"go_no_go","label":"Go/No-Go"},{"value":"go_live","label":"Go-live"},{"value":"hypercare","label":"Hypercare"}]'),
  ('key_milestones', 'Key Milestones', 'multi_line', false, 16, 'Cutover Approach', NULL),
  ('dependencies', 'Dependencies', 'multi_line', false, 17, 'Cutover Approach', NULL),
  ('code_freeze_date', 'Code Freeze Date', 'date', false, 18, 'Freeze & Continuity', NULL),
  ('data_freeze_date', 'Data Freeze Date', 'date', false, 19, 'Freeze & Continuity', NULL),
  ('business_freeze_rules', 'Business Freeze Rules', 'multi_line', false, 20, 'Freeze & Continuity', NULL),
  ('planned_downtime', 'Planned Downtime (hours)', 'number', false, 21, 'Freeze & Continuity', NULL),
  ('services_and_channels_impacted', 'Services & Channels Impacted', 'multi_line', false, 22, 'Freeze & Continuity', NULL),
  ('fallback_manual_procedures', 'Fallback / Manual Procedures', 'multi_line', false, 23, 'Freeze & Continuity', NULL),
  ('customer_communication_required', 'Customer Communication Required', 'boolean', false, 24, 'Freeze & Continuity', NULL),
  ('go_no_go_criteria', 'Go/No-Go Criteria', 'multi_line', false, 25, 'Go/No-Go & Governance', NULL),
  ('decision_points', 'Decision Points', 'multi_line', false, 26, 'Go/No-Go & Governance', NULL),
  ('command_centre_arrangements', 'Command Centre Arrangements', 'long_text', false, 27, 'Go/No-Go & Governance', NULL),
  ('escalation_path', 'Escalation Path', 'multi_line', false, 28, 'Go/No-Go & Governance', NULL),
  ('rollback_triggers', 'Rollback Triggers', 'multi_line', false, 29, 'Rollback', NULL),
  ('point_of_no_return', 'Point of No Return', 'long_text', false, 30, 'Rollback', NULL),
  ('rollback_approach', 'Rollback Approach', 'long_text', false, 31, 'Rollback', NULL),
  ('risks_mitigations', 'Risks – Mitigations', 'multi_line', false, 32, 'Risks & Roles', NULL),
  ('roles_and_responsibilities', 'Roles & Responsibilities (Role – Responsibility – Name)', 'multi_line', false, 33, 'Risks & Roles', NULL),
  ('glossary', 'Glossary of Terms (Term – Definition)', 'multi_line', false, 34, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices (Title – Reference / Link)', 'multi_line', false, 35, 'Glossary & Appendices', NULL),
  ('version_history', 'Version History (Version – Date – Author – Change)', 'multi_line', false, 36, 'Document Control', NULL),
  ('related_documents', 'Related Documents', 'multi_line', false, 37, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'fin_cutover_strategy'
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── fin_cutover_plan: 36 fields, Details + 9 tabs ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('cutover_manager', 'Cutover Manager', 'user_picker', false, 4, NULL, NULL),
  ('cutover_start', 'Cutover Start', 'date', false, 5, NULL, NULL),
  ('cutover_end', 'Cutover End', 'date', false, 6, NULL, NULL),
  ('planned_go_live_date', 'Planned Go-Live Date', 'date', false, 7, NULL, NULL),
  ('purpose', 'Purpose', 'long_text', false, 8, 'Introduction', NULL),
  ('objectives', 'Objectives', 'multi_line', false, 9, 'Introduction', NULL),
  ('scope', 'Scope', 'multi_line', false, 10, 'Introduction', NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', false, 11, 'Introduction', NULL),
  ('assumptions', 'Assumptions', 'multi_line', false, 12, 'Introduction', NULL),
  ('constraints', 'Constraints', 'multi_line', false, 13, 'Introduction', NULL),
  ('cutover_phases', 'Cutover Phases', 'multi_select', false, 14, 'Timeline', '[{"value":"preparation","label":"Preparation"},{"value":"freeze","label":"Freeze"},{"value":"final_migration","label":"Final migration"},{"value":"technical_cutover","label":"Technical cutover"},{"value":"business_validation","label":"Business validation"},{"value":"go_no_go","label":"Go/No-Go"},{"value":"go_live","label":"Go-live"},{"value":"hypercare","label":"Hypercare"}]'),
  ('activity_runsheet', 'Activity Runsheet (Seq – Activity – Owner – Start – Duration)', 'multi_line', false, 15, 'Timeline', NULL),
  ('critical_path', 'Critical Path', 'multi_line', false, 16, 'Timeline', NULL),
  ('checkpoints', 'Checkpoints', 'multi_line', false, 17, 'Timeline', NULL),
  ('entry_criteria', 'Entry Criteria', 'multi_line', false, 18, 'Prerequisites', NULL),
  ('technical_prerequisites', 'Technical Prerequisites', 'multi_line', false, 19, 'Prerequisites', NULL),
  ('business_prerequisites', 'Business Prerequisites', 'multi_line', false, 20, 'Prerequisites', NULL),
  ('communication_schedule', 'Communication Schedule', 'multi_line', false, 21, 'Communications', NULL),
  ('stakeholders_to_notify', 'Stakeholders to Notify', 'multi_line', false, 22, 'Communications', NULL),
  ('contact_list', 'Contact List (Name – Role – Phone)', 'multi_line', false, 23, 'Communications', NULL),
  ('validation_checks', 'Validation Checks', 'multi_line', false, 24, 'Validation & Go-Live', NULL),
  ('go_no_go_checkpoints', 'Go/No-Go Checkpoints', 'multi_line', false, 25, 'Validation & Go-Live', NULL),
  ('exit_criteria', 'Exit Criteria', 'multi_line', false, 26, 'Validation & Go-Live', NULL),
  ('rollback_triggers', 'Rollback Triggers', 'multi_line', false, 27, 'Contingency', NULL),
  ('rollback_steps', 'Rollback Steps', 'multi_line', false, 28, 'Contingency', NULL),
  ('point_of_no_return', 'Point of No Return', 'text', false, 29, 'Contingency', NULL),
  ('risks_mitigations', 'Risks – Mitigations', 'multi_line', false, 30, 'Risks & Roles', NULL),
  ('roles_and_responsibilities', 'Roles & Responsibilities (Role – Responsibility – Name)', 'multi_line', false, 31, 'Risks & Roles', NULL),
  ('glossary', 'Glossary of Terms (Term – Definition)', 'multi_line', false, 32, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices (Title – Reference / Link)', 'multi_line', false, 33, 'Glossary & Appendices', NULL),
  ('version_history', 'Version History (Version – Date – Author – Change)', 'multi_line', false, 34, 'Document Control', NULL),
  ('related_documents', 'Related Documents', 'multi_line', false, 35, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'fin_cutover_plan'
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── fin_dress_rehearsal_strategy: 33 fields, Details + 8 tabs ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('number_of_rehearsals', 'Number of Rehearsals', 'number', false, 4, NULL, NULL),
  ('first_rehearsal_date', 'First Rehearsal Date', 'date', false, 5, NULL, NULL),
  ('final_rehearsal_date', 'Final Rehearsal Date', 'date', false, 6, NULL, NULL),
  ('purpose', 'Purpose', 'long_text', false, 7, 'Introduction', NULL),
  ('objectives', 'Objectives', 'multi_line', false, 8, 'Introduction', NULL),
  ('scope', 'Scope', 'multi_line', false, 9, 'Introduction', NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', false, 10, 'Introduction', NULL),
  ('assumptions', 'Assumptions', 'multi_line', false, 11, 'Introduction', NULL),
  ('constraints', 'Constraints', 'multi_line', false, 12, 'Introduction', NULL),
  ('rehearsal_types', 'Rehearsal Types', 'multi_select', false, 13, 'Approach', '[{"value":"technical_rehearsal","label":"Technical rehearsal"},{"value":"full_dress_rehearsal","label":"Full dress rehearsal"},{"value":"timed_cutover_rehearsal","label":"Timed cutover rehearsal"},{"value":"rollback_rehearsal","label":"Rollback rehearsal"},{"value":"business_validation_rehearsal","label":"Business validation rehearsal"}]'),
  ('rehearsal_approach', 'Approach', 'long_text', false, 14, 'Approach', NULL),
  ('environment', 'Environment', 'text', false, 15, 'Environment & Data', NULL),
  ('data_set_used', 'Data Set Used', 'long_text', false, 16, 'Environment & Data', NULL),
  ('production_data_volume', 'Production Data Volume (%)', 'number', false, 17, 'Environment & Data', NULL),
  ('environment_prerequisites', 'Environment Prerequisites', 'multi_line', false, 18, 'Environment & Data', NULL),
  ('runsheet_reference', 'Runsheet Reference', 'text', false, 19, 'Execution', NULL),
  ('timing_targets', 'Timing Targets', 'multi_line', false, 20, 'Execution', NULL),
  ('participants', 'Participants', 'multi_line', false, 21, 'Execution', NULL),
  ('command_centre_used', 'Command Centre Used', 'boolean', false, 22, 'Execution', NULL),
  ('success_criteria', 'Success Criteria', 'multi_line', false, 23, 'Measurement & Exit', NULL),
  ('metrics_captured', 'Metrics Captured', 'multi_select', false, 24, 'Measurement & Exit', '[{"value":"duration_vs_plan","label":"Duration vs plan"},{"value":"reconciliation_results","label":"Reconciliation results"},{"value":"defects_found","label":"Defects found"},{"value":"rollback_time","label":"Rollback time"},{"value":"data_quality","label":"Data quality"}]'),
  ('exit_criteria', 'Exit Criteria', 'multi_line', false, 25, 'Measurement & Exit', NULL),
  ('lessons_learned_process', 'Lessons Learned Process', 'long_text', false, 26, 'Measurement & Exit', NULL),
  ('risks_mitigations', 'Risks – Mitigations', 'multi_line', false, 27, 'Risks & Roles', NULL),
  ('roles_and_responsibilities', 'Roles & Responsibilities (Role – Responsibility – Name)', 'multi_line', false, 28, 'Risks & Roles', NULL),
  ('glossary', 'Glossary of Terms (Term – Definition)', 'multi_line', false, 29, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices (Title – Reference / Link)', 'multi_line', false, 30, 'Glossary & Appendices', NULL),
  ('version_history', 'Version History (Version – Date – Author – Change)', 'multi_line', false, 31, 'Document Control', NULL),
  ('related_documents', 'Related Documents', 'multi_line', false, 32, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'fin_dress_rehearsal_strategy'
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── fin_testing_strategy: 38 fields, Details + 9 tabs ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('test_manager', 'Test Manager', 'user_picker', false, 4, NULL, NULL),
  ('testing_start', 'Testing Start', 'date', false, 5, NULL, NULL),
  ('testing_end', 'Testing End', 'date', false, 6, NULL, NULL),
  ('purpose', 'Purpose', 'long_text', false, 7, 'Introduction', NULL),
  ('objectives', 'Objectives', 'multi_line', false, 8, 'Introduction', NULL),
  ('scope', 'Scope', 'multi_line', false, 9, 'Introduction', NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', false, 10, 'Introduction', NULL),
  ('assumptions', 'Assumptions', 'multi_line', false, 11, 'Introduction', NULL),
  ('constraints', 'Constraints', 'multi_line', false, 12, 'Introduction', NULL),
  ('test_approach', 'Approach', 'long_text', false, 13, 'Test Approach', NULL),
  ('test_levels', 'Test Levels', 'multi_select', false, 14, 'Test Approach', '[{"value":"unit","label":"Unit"},{"value":"system","label":"System"},{"value":"integration_sit","label":"Integration / SIT"},{"value":"user_acceptance","label":"User acceptance"},{"value":"regression","label":"Regression"},{"value":"performance","label":"Performance"},{"value":"security","label":"Security"},{"value":"operational_acceptance","label":"Operational acceptance"},{"value":"disaster_recovery","label":"Disaster recovery"},{"value":"migration","label":"Migration"},{"value":"interface","label":"Interface"},{"value":"accessibility","label":"Accessibility"}]'),
  ('risk_based_testing', 'Risk-Based Testing', 'boolean', false, 15, 'Test Approach', NULL),
  ('test_techniques', 'Test Techniques', 'multi_line', false, 16, 'Test Approach', NULL),
  ('test_environments', 'Test Environments', 'multi_select', false, 17, 'Environments & Data', '[{"value":"development","label":"Development"},{"value":"test","label":"Test"},{"value":"sit","label":"SIT"},{"value":"uat","label":"UAT"},{"value":"pre_production","label":"Pre-production"},{"value":"dr","label":"DR"}]'),
  ('test_data_approach', 'Test Data Approach', 'long_text', false, 18, 'Environments & Data', NULL),
  ('data_masking_required', 'Data Masking Required', 'boolean', false, 19, 'Environments & Data', NULL),
  ('entry_criteria', 'Entry Criteria', 'multi_line', false, 20, 'Entry & Exit', NULL),
  ('exit_criteria', 'Exit Criteria', 'multi_line', false, 21, 'Entry & Exit', NULL),
  ('suspension_criteria', 'Suspension Criteria', 'multi_line', false, 22, 'Entry & Exit', NULL),
  ('resumption_criteria', 'Resumption Criteria', 'multi_line', false, 23, 'Entry & Exit', NULL),
  ('severity_definitions', 'Severity Definitions', 'multi_line', false, 24, 'Defect Management', NULL),
  ('defect_workflow', 'Defect Workflow', 'long_text', false, 25, 'Defect Management', NULL),
  ('acceptable_open_defects_at_exit', 'Acceptable Open Defects at Exit', 'multi_line', false, 26, 'Defect Management', NULL),
  ('test_management_tool', 'Test Management Tool', 'text', false, 27, 'Tools & Reporting', NULL),
  ('automation_approach', 'Automation Approach', 'long_text', false, 28, 'Tools & Reporting', NULL),
  ('reporting_cadence', 'Reporting Cadence', 'dropdown', false, 29, 'Tools & Reporting', '[{"value":"daily","label":"Daily"},{"value":"weekly","label":"Weekly"},{"value":"per_phase","label":"Per phase"}]'),
  ('metrics_reported', 'Metrics Reported', 'multi_line', false, 30, 'Tools & Reporting', NULL),
  ('test_deliverables', 'Test Deliverables', 'multi_line', false, 31, 'Tools & Reporting', NULL),
  ('risks_mitigations', 'Risks – Mitigations', 'multi_line', false, 32, 'Risks & Roles', NULL),
  ('roles_and_responsibilities', 'Roles & Responsibilities (Role – Responsibility – Name)', 'multi_line', false, 33, 'Risks & Roles', NULL),
  ('glossary', 'Glossary of Terms (Term – Definition)', 'multi_line', false, 34, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices (Title – Reference / Link)', 'multi_line', false, 35, 'Glossary & Appendices', NULL),
  ('version_history', 'Version History (Version – Date – Author – Change)', 'multi_line', false, 36, 'Document Control', NULL),
  ('related_documents', 'Related Documents', 'multi_line', false, 37, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'fin_testing_strategy'
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── fin_hypercare_plan: 35 fields, Details + 8 tabs ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('hypercare_lead', 'Hypercare Lead', 'user_picker', false, 4, NULL, NULL),
  ('hypercare_start', 'Hypercare Start', 'date', false, 5, NULL, NULL),
  ('hypercare_end', 'Hypercare End', 'date', false, 6, NULL, NULL),
  ('purpose', 'Purpose', 'long_text', false, 7, 'Introduction', NULL),
  ('objectives', 'Objectives', 'multi_line', false, 8, 'Introduction', NULL),
  ('scope', 'Scope', 'multi_line', false, 9, 'Introduction', NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', false, 10, 'Introduction', NULL),
  ('assumptions', 'Assumptions', 'multi_line', false, 11, 'Introduction', NULL),
  ('constraints', 'Constraints', 'multi_line', false, 12, 'Introduction', NULL),
  ('support_scope', 'Support Scope', 'multi_line', false, 13, 'Support Model', NULL),
  ('support_hours', 'Support Hours', 'dropdown', false, 14, 'Support Model', '[{"value":"business_hours","label":"Business hours"},{"value":"extended_hours","label":"Extended hours"},{"value":"24x7","label":"24x7"}]'),
  ('support_tiers', 'Support Tiers', 'multi_line', false, 15, 'Support Model', NULL),
  ('on_call_rota', 'On-Call Rota', 'multi_line', false, 16, 'Support Model', NULL),
  ('contact_channels', 'Contact Channels', 'multi_line', false, 17, 'Support Model', NULL),
  ('kpis', 'KPIs (KPI – Target)', 'multi_line', false, 18, 'Monitoring & KPIs', NULL),
  ('monitoring_activities', 'Monitoring Activities', 'multi_line', false, 19, 'Monitoring & KPIs', NULL),
  ('daily_checks', 'Daily Checks', 'multi_line', false, 20, 'Monitoring & KPIs', NULL),
  ('severity_definitions', 'Severity Definitions', 'multi_line', false, 21, 'Incidents & Defects', NULL),
  ('response_and_resolution_targets', 'Response & Resolution Targets', 'multi_line', false, 22, 'Incidents & Defects', NULL),
  ('escalation_path', 'Escalation Path', 'multi_line', false, 23, 'Incidents & Defects', NULL),
  ('triage_meeting_cadence', 'Triage Meeting Cadence', 'dropdown', false, 24, 'Incidents & Defects', '[{"value":"daily","label":"Daily"},{"value":"twice_daily","label":"Twice daily"},{"value":"weekly","label":"Weekly"}]'),
  ('exit_criteria', 'Exit Criteria', 'multi_line', false, 25, 'Exit & Handover', NULL),
  ('handover_to_business_as_usual', 'Handover to Business-as-Usual', 'long_text', false, 26, 'Exit & Handover', NULL),
  ('knowledge_transfer', 'Knowledge Transfer', 'multi_line', false, 27, 'Exit & Handover', NULL),
  ('lessons_learned', 'Lessons Learned', 'long_text', false, 28, 'Exit & Handover', NULL),
  ('risks_mitigations', 'Risks – Mitigations', 'multi_line', false, 29, 'Risks & Roles', NULL),
  ('roles_and_responsibilities', 'Roles & Responsibilities (Role – Responsibility – Name)', 'multi_line', false, 30, 'Risks & Roles', NULL),
  ('glossary', 'Glossary of Terms (Term – Definition)', 'multi_line', false, 31, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices (Title – Reference / Link)', 'multi_line', false, 32, 'Glossary & Appendices', NULL),
  ('version_history', 'Version History (Version – Date – Author – Change)', 'multi_line', false, 33, 'Document Control', NULL),
  ('related_documents', 'Related Documents', 'multi_line', false, 34, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'fin_hypercare_plan'
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── fin_rollback_plan: 35 fields, Details + 9 tabs ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('rollback_decision_owner', 'Rollback Decision Owner', 'user_picker', false, 4, NULL, NULL),
  ('point_of_no_return', 'Point of No Return', 'text', false, 5, NULL, NULL),
  ('purpose', 'Purpose', 'long_text', false, 6, 'Introduction', NULL),
  ('objectives', 'Objectives', 'multi_line', false, 7, 'Introduction', NULL),
  ('scope', 'Scope', 'multi_line', false, 8, 'Introduction', NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', false, 9, 'Introduction', NULL),
  ('assumptions', 'Assumptions', 'multi_line', false, 10, 'Introduction', NULL),
  ('constraints', 'Constraints', 'multi_line', false, 11, 'Introduction', NULL),
  ('rollback_triggers', 'Rollback Triggers', 'multi_line', false, 12, 'Triggers & Decision', NULL),
  ('decision_criteria', 'Decision Criteria', 'multi_line', false, 13, 'Triggers & Decision', NULL),
  ('decision_authority', 'Decision Authority', 'multi_line', false, 14, 'Triggers & Decision', NULL),
  ('decision_deadline', 'Decision Deadline', 'text', false, 15, 'Triggers & Decision', NULL),
  ('rollback_steps', 'Rollback Steps (Seq – Step – Owner – Duration)', 'multi_line', false, 16, 'Procedure', NULL),
  ('estimated_rollback_duration', 'Estimated Rollback Duration (hours)', 'number', false, 17, 'Procedure', NULL),
  ('systems_to_restore', 'Systems to Restore', 'multi_line', false, 18, 'Procedure', NULL),
  ('data_restore_approach', 'Data Restore Approach', 'long_text', false, 19, 'Procedure', NULL),
  ('transactions_during_cutover', 'Transactions During Cutover', 'long_text', false, 20, 'Data & Transactions', NULL),
  ('reprocessing_approach', 'Reprocessing Approach', 'long_text', false, 21, 'Data & Transactions', NULL),
  ('backups_required', 'Backups Required', 'multi_line', false, 22, 'Data & Transactions', NULL),
  ('post_rollback_checks', 'Post-Rollback Checks', 'multi_line', false, 23, 'Validation & Communication', NULL),
  ('communication_plan', 'Communication Plan', 'multi_line', false, 24, 'Validation & Communication', NULL),
  ('customer_impact', 'Customer Impact', 'long_text', false, 25, 'Validation & Communication', NULL),
  ('rollback_tested', 'Rollback Tested', 'boolean', false, 26, 'Testing', NULL),
  ('rollback_test_date', 'Rollback Test Date', 'date', false, 27, 'Testing', NULL),
  ('test_results', 'Test Results', 'long_text', false, 28, 'Testing', NULL),
  ('risks_mitigations', 'Risks – Mitigations', 'multi_line', false, 29, 'Risks & Roles', NULL),
  ('roles_and_responsibilities', 'Roles & Responsibilities (Role – Responsibility – Name)', 'multi_line', false, 30, 'Risks & Roles', NULL),
  ('glossary', 'Glossary of Terms (Term – Definition)', 'multi_line', false, 31, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices (Title – Reference / Link)', 'multi_line', false, 32, 'Glossary & Appendices', NULL),
  ('version_history', 'Version History (Version – Date – Author – Change)', 'multi_line', false, 33, 'Document Control', NULL),
  ('related_documents', 'Related Documents', 'multi_line', false, 34, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'fin_rollback_plan'
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
  v_count INT;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('fin_cutover_strategy', 38),
    ('fin_cutover_plan', 36),
    ('fin_dress_rehearsal_strategy', 33),
    ('fin_testing_strategy', 38),
    ('fin_hypercare_plan', 35),
    ('fin_rollback_plan', 35)
  ) AS t(register_key, expected) LOOP
    SELECT COUNT(*) INTO v_count
    FROM public.local_register_fields f
    JOIN public.local_registers lr ON lr.id = f.register_id
    WHERE lr.register_key = r.register_key AND lr.is_system_defined = TRUE;
    RAISE NOTICE 'v1322: % has % fields (expected %)', r.register_key, v_count, r.expected;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

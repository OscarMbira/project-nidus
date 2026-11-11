-- ============================================================================
-- v1323: Construction & Engineering — complete document forms (v1318 PRD d.3)
-- ============================================================================
-- Owner decision 2026-10-24: full best-practice forms for the empty document registers.
-- Every form has the standard frame (Details: reference, version, owner*, next review; an
-- Introduction tab for strategy/plan/architecture/design documents; Risks & Roles; Glossary &
-- Appendices; Document Control) plus register-specific tabs. Vendor-neutral names (rule 26).
-- Field keys glossary / appendices / version_history / related_documents are placed by the
-- complete document export (Glossary as section 2, Appendices, Document Control page).
-- 7 registers, 232 fields. Prerequisites: v1316 (long_text type), v1321. Idempotent.
-- ============================================================================

-- ── con_commissioning_plan: 36 fields, Details + 8 tabs ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('commissioning_manager', 'Commissioning Manager', 'user_picker', false, 4, NULL, NULL),
  ('facility_system', 'Facility / System', 'text', false, 5, NULL, NULL),
  ('planned_start', 'Planned Start', 'date', false, 6, NULL, NULL),
  ('planned_completion', 'Planned Completion', 'date', false, 7, NULL, NULL),
  ('purpose', 'Purpose', 'long_text', false, 8, 'Introduction', NULL),
  ('objectives', 'Objectives', 'multi_line', false, 9, 'Introduction', NULL),
  ('scope', 'Scope', 'multi_line', false, 10, 'Introduction', NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', false, 11, 'Introduction', NULL),
  ('assumptions', 'Assumptions', 'multi_line', false, 12, 'Introduction', NULL),
  ('constraints', 'Constraints', 'multi_line', false, 13, 'Introduction', NULL),
  ('systems_to_commission', 'Systems to Commission', 'multi_line', false, 14, 'Systems & Stages', NULL),
  ('commissioning_stages', 'Commissioning Stages', 'multi_select', false, 15, 'Systems & Stages', '[{"value":"pre_commissioning","label":"Pre-commissioning"},{"value":"cold_commissioning","label":"Cold commissioning"},{"value":"hot_commissioning","label":"Hot commissioning"},{"value":"performance_testing","label":"Performance testing"},{"value":"reliability_run","label":"Reliability run"},{"value":"handover","label":"Handover"}]'),
  ('commissioning_sequence', 'Commissioning Sequence', 'multi_line', false, 16, 'Systems & Stages', NULL),
  ('interfaces_and_dependencies', 'Interfaces & Dependencies', 'multi_line', false, 17, 'Systems & Stages', NULL),
  ('test_procedures', 'Test Procedures', 'multi_line', false, 18, 'Testing & Acceptance', NULL),
  ('acceptance_criteria', 'Acceptance Criteria', 'multi_line', false, 19, 'Testing & Acceptance', NULL),
  ('witness_and_hold_points', 'Witness & Hold Points', 'multi_line', false, 20, 'Testing & Acceptance', NULL),
  ('performance_guarantees', 'Performance Guarantees', 'multi_line', false, 21, 'Testing & Acceptance', NULL),
  ('safety_requirements', 'Safety Requirements', 'multi_line', false, 22, 'Safety & Permits', NULL),
  ('permit_to_work_required', 'Permit to Work Required', 'boolean', false, 23, 'Safety & Permits', NULL),
  ('isolation_procedures', 'Isolation Procedures', 'multi_line', false, 24, 'Safety & Permits', NULL),
  ('energisation_procedures', 'Energisation Procedures', 'multi_line', false, 25, 'Safety & Permits', NULL),
  ('commissioning_records', 'Commissioning Records', 'multi_line', false, 26, 'Handover', NULL),
  ('oandm_training', 'O&M Training', 'multi_line', false, 27, 'Handover', NULL),
  ('handover_documents', 'Handover Documents', 'multi_line', false, 28, 'Handover', NULL),
  ('punch_list_approach', 'Punch List Approach', 'long_text', false, 29, 'Handover', NULL),
  ('risks_mitigations', 'Risks – Mitigations', 'multi_line', false, 30, 'Risks & Roles', NULL),
  ('roles_and_responsibilities', 'Roles & Responsibilities (Role – Responsibility – Name)', 'multi_line', false, 31, 'Risks & Roles', NULL),
  ('glossary', 'Glossary of Terms (Term – Definition)', 'multi_line', false, 32, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices (Title – Reference / Link)', 'multi_line', false, 33, 'Glossary & Appendices', NULL),
  ('version_history', 'Version History (Version – Date – Author – Change)', 'multi_line', false, 34, 'Document Control', NULL),
  ('related_documents', 'Related Documents', 'multi_line', false, 35, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'con_commissioning_plan'
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── con_hse_plan: 45 fields, Details + 11 tabs ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('hse_manager', 'HSE Manager', 'user_picker', false, 4, NULL, NULL),
  ('site_location', 'Site Location', 'text', false, 5, NULL, NULL),
  ('peak_workforce', 'Peak Workforce', 'number', false, 6, NULL, NULL),
  ('purpose', 'Purpose', 'long_text', false, 7, 'Introduction', NULL),
  ('objectives', 'Objectives', 'multi_line', false, 8, 'Introduction', NULL),
  ('scope', 'Scope', 'multi_line', false, 9, 'Introduction', NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', false, 10, 'Introduction', NULL),
  ('assumptions', 'Assumptions', 'multi_line', false, 11, 'Introduction', NULL),
  ('constraints', 'Constraints', 'multi_line', false, 12, 'Introduction', NULL),
  ('hse_policy_statement', 'HSE Policy Statement', 'long_text', false, 13, 'Policy & Objectives', NULL),
  ('hse_objectives', 'HSE Objectives', 'multi_line', false, 14, 'Policy & Objectives', NULL),
  ('legal_requirements', 'Legal Requirements', 'multi_line', false, 15, 'Policy & Objectives', NULL),
  ('standards_applied', 'Standards Applied', 'multi_line', false, 16, 'Policy & Objectives', NULL),
  ('high_risk_activities', 'High-Risk Activities', 'multi_select', false, 17, 'Hazards & Controls', '[{"value":"work_at_height","label":"Work at height"},{"value":"lifting","label":"Lifting"},{"value":"excavation","label":"Excavation"},{"value":"confined_space","label":"Confined space"},{"value":"hot_work","label":"Hot work"},{"value":"electrical","label":"Electrical"},{"value":"demolition","label":"Demolition"},{"value":"traffic_management","label":"Traffic management"},{"value":"hazardous_substances","label":"Hazardous substances"}]'),
  ('major_hazards', 'Major Hazards', 'multi_line', false, 18, 'Hazards & Controls', NULL),
  ('risk_assessment_approach', 'Risk Assessment Approach', 'long_text', false, 19, 'Hazards & Controls', NULL),
  ('control_measures', 'Control Measures', 'multi_line', false, 20, 'Hazards & Controls', NULL),
  ('permit_to_work_system', 'Permit to Work System', 'long_text', false, 21, 'Safe Systems of Work', NULL),
  ('method_statements_required', 'Method Statements Required', 'boolean', false, 22, 'Safe Systems of Work', NULL),
  ('ppe_requirements', 'PPE Requirements', 'multi_line', false, 23, 'Safe Systems of Work', NULL),
  ('site_rules', 'Site Rules', 'multi_line', false, 24, 'Safe Systems of Work', NULL),
  ('induction_requirements', 'Induction Requirements', 'multi_line', false, 25, 'Training & Competence', NULL),
  ('training_matrix', 'Training Matrix', 'multi_line', false, 26, 'Training & Competence', NULL),
  ('toolbox_talk_frequency', 'Toolbox Talk Frequency', 'dropdown', false, 27, 'Training & Competence', '[{"value":"daily","label":"Daily"},{"value":"weekly","label":"Weekly"},{"value":"fortnightly","label":"Fortnightly"}]'),
  ('emergency_procedures', 'Emergency Procedures', 'multi_line', false, 28, 'Emergency Preparedness', NULL),
  ('first_aid_arrangements', 'First Aid Arrangements', 'multi_line', false, 29, 'Emergency Preparedness', NULL),
  ('emergency_contacts', 'Emergency Contacts', 'multi_line', false, 30, 'Emergency Preparedness', NULL),
  ('evacuation_drill_frequency', 'Evacuation Drill Frequency', 'dropdown', false, 31, 'Emergency Preparedness', '[{"value":"monthly","label":"Monthly"},{"value":"quarterly","label":"Quarterly"},{"value":"half_yearly","label":"Half-yearly"}]'),
  ('environmental_aspects', 'Environmental Aspects', 'multi_line', false, 32, 'Environment', NULL),
  ('waste_management', 'Waste Management', 'long_text', false, 33, 'Environment', NULL),
  ('pollution_prevention', 'Pollution Prevention', 'multi_line', false, 34, 'Environment', NULL),
  ('inspections_and_audits', 'Inspections & Audits', 'multi_line', false, 35, 'Monitoring & Reporting', NULL),
  ('hse_kpis', 'HSE KPIs', 'multi_line', false, 36, 'Monitoring & Reporting', NULL),
  ('incident_reporting_procedure', 'Incident Reporting Procedure', 'long_text', false, 37, 'Monitoring & Reporting', NULL),
  ('near_miss_reporting_in_place', 'Near-Miss Reporting in Place', 'boolean', false, 38, 'Monitoring & Reporting', NULL),
  ('risks_mitigations', 'Risks – Mitigations', 'multi_line', false, 39, 'Risks & Roles', NULL),
  ('roles_and_responsibilities', 'Roles & Responsibilities (Role – Responsibility – Name)', 'multi_line', false, 40, 'Risks & Roles', NULL),
  ('glossary', 'Glossary of Terms (Term – Definition)', 'multi_line', false, 41, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices (Title – Reference / Link)', 'multi_line', false, 42, 'Glossary & Appendices', NULL),
  ('version_history', 'Version History (Version – Date – Author – Change)', 'multi_line', false, 43, 'Document Control', NULL),
  ('related_documents', 'Related Documents', 'multi_line', false, 44, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'con_hse_plan'
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── con_inspection_plan: 31 fields, Details + 8 tabs ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('inspection_lead', 'Inspection Lead', 'user_picker', false, 4, NULL, NULL),
  ('work_package', 'Work Package', 'text', false, 5, NULL, NULL),
  ('purpose', 'Purpose', 'long_text', false, 6, 'Introduction', NULL),
  ('objectives', 'Objectives', 'multi_line', false, 7, 'Introduction', NULL),
  ('scope', 'Scope', 'multi_line', false, 8, 'Introduction', NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', false, 9, 'Introduction', NULL),
  ('assumptions', 'Assumptions', 'multi_line', false, 10, 'Introduction', NULL),
  ('constraints', 'Constraints', 'multi_line', false, 11, 'Introduction', NULL),
  ('inspection_scope', 'Inspection Scope', 'multi_line', false, 12, 'Scope & Standards', NULL),
  ('specifications_and_standards', 'Specifications & Standards', 'multi_line', false, 13, 'Scope & Standards', NULL),
  ('acceptance_criteria', 'Acceptance Criteria', 'multi_line', false, 14, 'Scope & Standards', NULL),
  ('inspection_types', 'Inspection Types', 'multi_select', false, 15, 'Activities', '[{"value":"visual","label":"Visual"},{"value":"dimensional","label":"Dimensional"},{"value":"material_test","label":"Material test"},{"value":"non_destructive_test","label":"Non-destructive test"},{"value":"pressure_test","label":"Pressure test"},{"value":"electrical_test","label":"Electrical test"},{"value":"functional_test","label":"Functional test"}]'),
  ('inspection_activities', 'Inspection Activities (Activity – Method – Frequency – Responsible)', 'multi_line', false, 16, 'Activities', NULL),
  ('sampling_frequency', 'Sampling Frequency', 'text', false, 17, 'Activities', NULL),
  ('hold_points', 'Hold Points', 'multi_line', false, 18, 'Hold & Witness Points', NULL),
  ('witness_points', 'Witness Points', 'multi_line', false, 19, 'Hold & Witness Points', NULL),
  ('notification_period', 'Notification Period (hours)', 'number', false, 20, 'Hold & Witness Points', NULL),
  ('records_required', 'Records Required', 'multi_line', false, 21, 'Records & Nonconformance', NULL),
  ('nonconformance_procedure', 'Nonconformance Procedure', 'long_text', false, 22, 'Records & Nonconformance', NULL),
  ('inspector_competence', 'Inspector Competence', 'multi_line', false, 23, 'Records & Nonconformance', NULL),
  ('equipment_calibration', 'Equipment Calibration', 'multi_line', false, 24, 'Records & Nonconformance', NULL),
  ('risks_mitigations', 'Risks – Mitigations', 'multi_line', false, 25, 'Risks & Roles', NULL),
  ('roles_and_responsibilities', 'Roles & Responsibilities (Role – Responsibility – Name)', 'multi_line', false, 26, 'Risks & Roles', NULL),
  ('glossary', 'Glossary of Terms (Term – Definition)', 'multi_line', false, 27, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices (Title – Reference / Link)', 'multi_line', false, 28, 'Glossary & Appendices', NULL),
  ('version_history', 'Version History (Version – Date – Author – Change)', 'multi_line', false, 29, 'Document Control', NULL),
  ('related_documents', 'Related Documents', 'multi_line', false, 30, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'con_inspection_plan'
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── con_recovery_plans: 32 fields, Details + 8 tabs ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('recovery_owner', 'Recovery Owner', 'user_picker', false, 4, NULL, NULL),
  ('current_delay', 'Current Delay (days)', 'number', false, 5, NULL, NULL),
  ('target_recovery_date', 'Target Recovery Date', 'date', false, 6, NULL, NULL),
  ('purpose', 'Purpose', 'long_text', false, 7, 'Introduction', NULL),
  ('objectives', 'Objectives', 'multi_line', false, 8, 'Introduction', NULL),
  ('scope', 'Scope', 'multi_line', false, 9, 'Introduction', NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', false, 10, 'Introduction', NULL),
  ('assumptions', 'Assumptions', 'multi_line', false, 11, 'Introduction', NULL),
  ('constraints', 'Constraints', 'multi_line', false, 12, 'Introduction', NULL),
  ('delay_description', 'Delay Description', 'long_text', false, 13, 'Delay Analysis', NULL),
  ('delay_categories', 'Delay Categories', 'multi_select', false, 14, 'Delay Analysis', '[{"value":"design","label":"Design"},{"value":"procurement","label":"Procurement"},{"value":"labour","label":"Labour"},{"value":"plant","label":"Plant"},{"value":"weather","label":"Weather"},{"value":"client_change","label":"Client change"},{"value":"subcontractor","label":"Subcontractor"},{"value":"permits","label":"Permits"},{"value":"ground_conditions","label":"Ground conditions"}]'),
  ('root_causes', 'Root Causes', 'multi_line', false, 15, 'Delay Analysis', NULL),
  ('critical_activities_affected', 'Critical Activities Affected', 'multi_line', false, 16, 'Delay Analysis', NULL),
  ('acceleration_options', 'Acceleration Options', 'multi_select', false, 17, 'Recovery Strategy', '[{"value":"additional_resources","label":"Additional resources"},{"value":"extended_hours","label":"Extended hours"},{"value":"shift_work","label":"Shift work"},{"value":"resequencing","label":"Resequencing"},{"value":"prefabrication","label":"Prefabrication"},{"value":"scope_change","label":"Scope change"}]'),
  ('recovery_measures', 'Recovery Measures', 'multi_line', false, 18, 'Recovery Strategy', NULL),
  ('revised_milestones', 'Revised Milestones', 'multi_line', false, 19, 'Recovery Strategy', NULL),
  ('additional_cost', 'Additional Cost', 'currency', false, 20, 'Cost & Resources', NULL),
  ('additional_resources', 'Additional Resources', 'multi_line', false, 21, 'Cost & Resources', NULL),
  ('funding_approval_required', 'Funding Approval Required', 'boolean', false, 22, 'Cost & Resources', NULL),
  ('progress_indicators', 'Progress Indicators', 'multi_line', false, 23, 'Monitoring', NULL),
  ('review_frequency', 'Review Frequency', 'dropdown', false, 24, 'Monitoring', '[{"value":"daily","label":"Daily"},{"value":"weekly","label":"Weekly"},{"value":"fortnightly","label":"Fortnightly"}]'),
  ('early_warning_triggers', 'Early-Warning Triggers', 'multi_line', false, 25, 'Monitoring', NULL),
  ('risks_mitigations', 'Risks – Mitigations', 'multi_line', false, 26, 'Risks & Roles', NULL),
  ('roles_and_responsibilities', 'Roles & Responsibilities (Role – Responsibility – Name)', 'multi_line', false, 27, 'Risks & Roles', NULL),
  ('glossary', 'Glossary of Terms (Term – Definition)', 'multi_line', false, 28, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices (Title – Reference / Link)', 'multi_line', false, 29, 'Glossary & Appendices', NULL),
  ('version_history', 'Version History (Version – Date – Author – Change)', 'multi_line', false, 30, 'Document Control', NULL),
  ('related_documents', 'Related Documents', 'multi_line', false, 31, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'con_recovery_plans'
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── con_site_logistics: 34 fields, Details + 9 tabs ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('logistics_manager', 'Logistics Manager', 'user_picker', false, 4, NULL, NULL),
  ('site_location', 'Site Location', 'text', false, 5, NULL, NULL),
  ('purpose', 'Purpose', 'long_text', false, 6, 'Introduction', NULL),
  ('objectives', 'Objectives', 'multi_line', false, 7, 'Introduction', NULL),
  ('scope', 'Scope', 'multi_line', false, 8, 'Introduction', NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', false, 9, 'Introduction', NULL),
  ('assumptions', 'Assumptions', 'multi_line', false, 10, 'Introduction', NULL),
  ('constraints', 'Constraints', 'multi_line', false, 11, 'Introduction', NULL),
  ('layout_description', 'Layout Description', 'long_text', false, 12, 'Site Layout', NULL),
  ('access_points', 'Access Points', 'multi_line', false, 13, 'Site Layout', NULL),
  ('laydown_areas', 'Laydown Areas', 'multi_line', false, 14, 'Site Layout', NULL),
  ('welfare_facilities', 'Welfare Facilities', 'multi_line', false, 15, 'Site Layout', NULL),
  ('traffic_management_plan', 'Traffic Management Plan', 'long_text', false, 16, 'Traffic & Deliveries', NULL),
  ('delivery_rules', 'Delivery Rules', 'multi_line', false, 17, 'Traffic & Deliveries', NULL),
  ('vehicle_routes', 'Vehicle Routes', 'multi_line', false, 18, 'Traffic & Deliveries', NULL),
  ('delivery_hours', 'Delivery Hours', 'text', false, 19, 'Traffic & Deliveries', NULL),
  ('storage_arrangements', 'Storage Arrangements', 'multi_line', false, 20, 'Storage & Handling', NULL),
  ('material_handling', 'Material Handling', 'multi_line', false, 21, 'Storage & Handling', NULL),
  ('cranes_and_hoists', 'Cranes & Hoists', 'multi_line', false, 22, 'Storage & Handling', NULL),
  ('site_security', 'Site Security', 'multi_line', false, 23, 'Security & Neighbours', NULL),
  ('neighbour_considerations', 'Neighbour Considerations', 'multi_line', false, 24, 'Security & Neighbours', NULL),
  ('noise_and_dust_controls', 'Noise & Dust Controls', 'multi_line', false, 25, 'Security & Neighbours', NULL),
  ('waste_management', 'Waste Management', 'long_text', false, 26, 'Waste & Utilities', NULL),
  ('temporary_utilities', 'Temporary Utilities', 'multi_line', false, 27, 'Waste & Utilities', NULL),
  ('risks_mitigations', 'Risks – Mitigations', 'multi_line', false, 28, 'Risks & Roles', NULL),
  ('roles_and_responsibilities', 'Roles & Responsibilities (Role – Responsibility – Name)', 'multi_line', false, 29, 'Risks & Roles', NULL),
  ('glossary', 'Glossary of Terms (Term – Definition)', 'multi_line', false, 30, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices (Title – Reference / Link)', 'multi_line', false, 31, 'Glossary & Appendices', NULL),
  ('version_history', 'Version History (Version – Date – Author – Change)', 'multi_line', false, 32, 'Document Control', NULL),
  ('related_documents', 'Related Documents', 'multi_line', false, 33, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'con_site_logistics'
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── con_method_statements: 29 fields, Details + 8 tabs ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('activity', 'Activity', 'text', true, 4, NULL, NULL),
  ('work_location', 'Work Location', 'text', false, 5, NULL, NULL),
  ('supervisor', 'Supervisor', 'user_picker', false, 6, NULL, NULL),
  ('planned_start', 'Planned Start', 'date', false, 7, NULL, NULL),
  ('scope_description', 'Scope Description', 'long_text', false, 8, 'Scope of Work', NULL),
  ('sequence_of_works', 'Sequence of Works', 'multi_line', false, 9, 'Scope of Work', NULL),
  ('labour', 'Labour', 'multi_line', false, 10, 'Resources', NULL),
  ('plant_and_equipment', 'Plant & Equipment', 'multi_line', false, 11, 'Resources', NULL),
  ('materials', 'Materials', 'multi_line', false, 12, 'Resources', NULL),
  ('competence_requirements', 'Competence Requirements', 'multi_line', false, 13, 'Resources', NULL),
  ('hazards', 'Hazards', 'multi_line', false, 14, 'Hazards & Controls', NULL),
  ('control_measures', 'Control Measures', 'multi_line', false, 15, 'Hazards & Controls', NULL),
  ('ppe_required', 'PPE Required', 'multi_select', false, 16, 'Hazards & Controls', '[{"value":"hard_hat","label":"Hard hat"},{"value":"safety_boots","label":"Safety boots"},{"value":"high_visibility_clothing","label":"High-visibility clothing"},{"value":"gloves","label":"Gloves"},{"value":"eye_protection","label":"Eye protection"},{"value":"hearing_protection","label":"Hearing protection"},{"value":"harness","label":"Harness"},{"value":"respirator","label":"Respirator"}]'),
  ('permits_required', 'Permits Required', 'multi_select', false, 17, 'Hazards & Controls', '[{"value":"hot_work","label":"Hot work"},{"value":"confined_space","label":"Confined space"},{"value":"excavation","label":"Excavation"},{"value":"electrical_isolation","label":"Electrical isolation"},{"value":"work_at_height","label":"Work at height"},{"value":"lifting","label":"Lifting"}]'),
  ('quality_checks', 'Quality Checks', 'multi_line', false, 18, 'Quality & Emergency', NULL),
  ('hold_points', 'Hold Points', 'multi_line', false, 19, 'Quality & Emergency', NULL),
  ('emergency_arrangements', 'Emergency Arrangements', 'multi_line', false, 20, 'Quality & Emergency', NULL),
  ('environmental_controls', 'Environmental Controls', 'multi_line', false, 21, 'Quality & Emergency', NULL),
  ('briefing_record', 'Briefing Record (Name – Date)', 'multi_line', false, 22, 'Briefing', NULL),
  ('risks_mitigations', 'Risks – Mitigations', 'multi_line', false, 23, 'Risks & Roles', NULL),
  ('roles_and_responsibilities', 'Roles & Responsibilities (Role – Responsibility – Name)', 'multi_line', false, 24, 'Risks & Roles', NULL),
  ('glossary', 'Glossary of Terms (Term – Definition)', 'multi_line', false, 25, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices (Title – Reference / Link)', 'multi_line', false, 26, 'Glossary & Appendices', NULL),
  ('version_history', 'Version History (Version – Date – Author – Change)', 'multi_line', false, 27, 'Document Control', NULL),
  ('related_documents', 'Related Documents', 'multi_line', false, 28, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'con_method_statements'
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── con_itps: 25 fields, Details + 7 tabs ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('work_package', 'Work Package', 'text', true, 4, NULL, NULL),
  ('discipline', 'Discipline', 'dropdown', false, 5, NULL, '[{"value":"civil","label":"Civil"},{"value":"structural","label":"Structural"},{"value":"mechanical","label":"Mechanical"},{"value":"electrical","label":"Electrical"},{"value":"instrumentation","label":"Instrumentation"},{"value":"piping","label":"Piping"},{"value":"architectural","label":"Architectural"},{"value":"hvac","label":"HVAC"}]'),
  ('contractor', 'Contractor', 'text', false, 6, NULL, NULL),
  ('specifications', 'Specifications', 'multi_line', false, 7, 'References', NULL),
  ('drawings', 'Drawings', 'multi_line', false, 8, 'References', NULL),
  ('standards', 'Standards', 'multi_line', false, 9, 'References', NULL),
  ('inspection_and_test_activities', 'Inspection & Test Activities (Seq – Activity – Acceptance Criteria – Verifying Document – Inspection Type)', 'multi_line', false, 10, 'Activities', NULL),
  ('hold_points', 'Hold Points', 'multi_line', false, 11, 'Inspection Points', NULL),
  ('witness_points', 'Witness Points', 'multi_line', false, 12, 'Inspection Points', NULL),
  ('surveillance_points', 'Surveillance Points', 'multi_line', false, 13, 'Inspection Points', NULL),
  ('review_points', 'Review Points', 'multi_line', false, 14, 'Inspection Points', NULL),
  ('contractor_responsibilities', 'Contractor Responsibilities', 'multi_line', false, 15, 'Responsibilities & Records', NULL),
  ('client_responsibilities', 'Client Responsibilities', 'multi_line', false, 16, 'Responsibilities & Records', NULL),
  ('third_party_inspection', 'Third-Party Inspection', 'boolean', false, 17, 'Responsibilities & Records', NULL),
  ('records_required', 'Records Required', 'multi_line', false, 18, 'Responsibilities & Records', NULL),
  ('risks_mitigations', 'Risks – Mitigations', 'multi_line', false, 19, 'Risks & Roles', NULL),
  ('roles_and_responsibilities', 'Roles & Responsibilities (Role – Responsibility – Name)', 'multi_line', false, 20, 'Risks & Roles', NULL),
  ('glossary', 'Glossary of Terms (Term – Definition)', 'multi_line', false, 21, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices (Title – Reference / Link)', 'multi_line', false, 22, 'Glossary & Appendices', NULL),
  ('version_history', 'Version History (Version – Date – Author – Change)', 'multi_line', false, 23, 'Document Control', NULL),
  ('related_documents', 'Related Documents', 'multi_line', false, 24, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'con_itps'
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
    ('con_commissioning_plan', 36),
    ('con_hse_plan', 45),
    ('con_inspection_plan', 31),
    ('con_recovery_plans', 32),
    ('con_site_logistics', 34),
    ('con_method_statements', 29),
    ('con_itps', 25)
  ) AS t(register_key, expected) LOOP
    SELECT COUNT(*) INTO v_count
    FROM public.local_register_fields f
    JOIN public.local_registers lr ON lr.id = f.register_id
    WHERE lr.register_key = r.register_key AND lr.is_system_defined = TRUE;
    RAISE NOTICE 'v1323: % has % fields (expected %)', r.register_key, v_count, r.expected;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

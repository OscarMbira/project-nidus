-- ============================================================================
-- v1364: Testing Strategy (FIN pack, Testing & Assurance) — full strategy document structure
-- ============================================================================
-- Owner request 2026-11-09: extend the Testing Strategy document register with the sections of a
-- complete bank testing strategy (owner's sample table of contents), vendor-neutral (rule 26 — e.g.
-- "System testing (core banking)", no product names). Existing fields are kept; new fields and tabs:
--   Introduction          + Project Summary, Testing Services in Scope, Functional Areas in Scope (table)
--   Test Approach         + Functional Test Design, Automated Test Design; Test Levels gains
--                           Parameterisation, Sanity and Failover
--   Test Execution (new)  Test Execution Phases (table), Parameterisation, Sanity, System and System
--                           Integration Testing
--   Non-Functional (new)  Performance Testing + Performance Targets (table), Failover Testing,
--                           Security Testing
--   UAT & Dress Rehearsal (new) UAT Support, UAT Business Participants, Dress Rehearsal, Planned
--                           Dress Rehearsals (table)
--   Entry & Exit          + Acceptance Criteria, Critical Success Factors
--   Defect Management     + Defect Resolution Targets (table)
--   Test Management (new) Document Management, Meetings (table), Reporting Cadence and Metrics
--                           (moved from Tools & Reporting), Test Deliverables (moved),
--                           Review / Sign-Off Board (table)
--   Tools                 (was Tools & Reporting) + Testing Tools (table)
--   Timeline & RACI (new) Testing Timeline (table), RACI (table)
--   Risks & Roles         Risks and Contingencies and Testing Team become tables (no records exist yet,
--                           so no values are converted)
--   Glossary & Appendices + Acronyms (table)
-- Sign-off stays on the document engine's Sign-off tab (v1318); Version History is the change log.
-- No sample records exist for this register, so there is no companion seed.
-- Prerequisites: v1318 (document registers), v1326 (table type). Idempotent.
-- ============================================================================

INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT '00000000-0000-4000-9001-00000000003f'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM (VALUES
  -- Details
  ('document_reference', 'Document Reference', 'text', 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', 3, NULL, NULL),
  ('test_manager', 'Test Manager', 'user_picker', 4, NULL, NULL),
  ('testing_start', 'Testing Start', 'date', 5, NULL, NULL),
  ('testing_end', 'Testing End', 'date', 6, NULL, NULL),

  -- Introduction
  ('project_summary', 'Project Summary', 'long_text', 7, 'Introduction', NULL),
  ('purpose', 'Purpose', 'long_text', 8, 'Introduction', NULL),
  ('objectives', 'Objectives of the Testing', 'multi_line', 9, 'Introduction', NULL),
  ('scope', 'Scope', 'multi_line', 10, 'Introduction', NULL),
  ('testing_services', 'Testing Services in Scope', 'multi_line', 11, 'Introduction', NULL),
  ('functional_scope', 'Functional Areas in Scope', 'table', 12, 'Introduction', '[{"value":"area","label":"Module / Area"},{"value":"processes","label":"Features / Processes"},{"value":"priority","label":"Priority"}]'),
  ('out_of_scope', 'Out of Scope', 'multi_line', 13, 'Introduction', NULL),
  ('assumptions', 'Assumptions', 'multi_line', 14, 'Introduction', NULL),
  ('constraints', 'Constraints', 'multi_line', 15, 'Introduction', NULL),

  -- Test Approach
  ('test_approach', 'Approach', 'long_text', 16, 'Test Approach', NULL),
  ('test_levels', 'Test Levels', 'multi_select', 17, 'Test Approach', '[{"value":"unit","label":"Unit"},{"value":"parameterisation","label":"Parameterisation"},{"value":"sanity","label":"Sanity"},{"value":"system","label":"System"},{"value":"integration_sit","label":"System integration (SIT)"},{"value":"user_acceptance","label":"User acceptance (UAT)"},{"value":"regression","label":"Regression"},{"value":"performance","label":"Performance"},{"value":"failover","label":"Failover"},{"value":"security","label":"Security"},{"value":"operational_acceptance","label":"Operational acceptance"},{"value":"disaster_recovery","label":"Disaster recovery"},{"value":"migration","label":"Data migration"},{"value":"interface","label":"Interface"},{"value":"accessibility","label":"Accessibility"}]'),
  ('risk_based_testing', 'Risk-Based Testing', 'boolean', 18, 'Test Approach', NULL),
  ('test_techniques', 'Test Techniques', 'multi_line', 19, 'Test Approach', NULL),
  ('functional_test_design', 'Functional Test Design', 'long_text', 20, 'Test Approach', NULL),
  ('automated_test_design', 'Automated Test Design', 'long_text', 21, 'Test Approach', NULL),

  -- Test Execution
  ('test_phases', 'Test Execution Phases', 'table', 22, 'Test Execution', '[{"value":"phase","label":"Phase"},{"value":"objective","label":"Objective"},{"value":"environment","label":"Environment"},{"value":"start","label":"Start","type":"date"},{"value":"end","label":"End","type":"date"},{"value":"owner","label":"Owner"}]'),
  ('parameterisation_testing', 'Parameterisation Testing', 'long_text', 23, 'Test Execution', NULL),
  ('sanity_testing', 'Sanity Testing', 'long_text', 24, 'Test Execution', NULL),
  ('system_testing', 'System Testing (core banking)', 'long_text', 25, 'Test Execution', NULL),
  ('integration_testing', 'System Integration Testing', 'long_text', 26, 'Test Execution', NULL),

  -- Non-Functional
  ('performance_testing', 'Performance Testing', 'long_text', 27, 'Non-Functional', NULL),
  ('performance_targets', 'Performance Targets', 'table', 28, 'Non-Functional', '[{"value":"process","label":"Transaction / Process"},{"value":"volume","label":"Volume"},{"value":"target","label":"Target"},{"value":"measure","label":"How Measured"}]'),
  ('failover_testing', 'Failover Testing', 'long_text', 29, 'Non-Functional', NULL),
  ('security_testing', 'Security Testing', 'long_text', 30, 'Non-Functional', NULL),

  -- UAT & Dress Rehearsal
  ('uat_support', 'User Acceptance Testing Support', 'long_text', 31, 'UAT & Dress Rehearsal', NULL),
  ('uat_participants', 'UAT Business Participants', 'multi_line', 32, 'UAT & Dress Rehearsal', NULL),
  ('dress_rehearsal', 'Dress Rehearsal Approach', 'long_text', 33, 'UAT & Dress Rehearsal', NULL),
  ('dress_rehearsals_planned', 'Planned Dress Rehearsals', 'table', 34, 'UAT & Dress Rehearsal', '[{"value":"rehearsal","label":"Rehearsal"},{"value":"date","label":"Date","type":"date"},{"value":"scope","label":"Scope"}]'),

  -- Environments & Data
  ('test_environments', 'Test Environments', 'multi_select', 35, 'Environments & Data', NULL),
  ('test_data_approach', 'Test Data Approach', 'long_text', 36, 'Environments & Data', NULL),
  ('data_masking_required', 'Data Masking Required', 'boolean', 37, 'Environments & Data', NULL),

  -- Entry & Exit
  ('entry_criteria', 'Entry Criteria', 'multi_line', 38, 'Entry & Exit', NULL),
  ('exit_criteria', 'Exit Criteria', 'multi_line', 39, 'Entry & Exit', NULL),
  ('suspension_criteria', 'Suspension Criteria', 'multi_line', 40, 'Entry & Exit', NULL),
  ('resumption_criteria', 'Resumption Criteria', 'multi_line', 41, 'Entry & Exit', NULL),
  ('acceptance_criteria', 'Acceptance Criteria', 'multi_line', 42, 'Entry & Exit', NULL),
  ('critical_success_factors', 'Critical Success Factors', 'multi_line', 43, 'Entry & Exit', NULL),

  -- Defect Management
  ('severity_definitions', 'Severity Definitions', 'multi_line', 44, 'Defect Management', NULL),
  ('defect_workflow', 'Defect Workflow', 'long_text', 45, 'Defect Management', NULL),
  ('defect_resolution_targets', 'Defect Resolution Targets', 'table', 46, 'Defect Management', '[{"value":"severity","label":"Severity"},{"value":"response","label":"Response Time"},{"value":"fix","label":"Fix Time"}]'),
  ('acceptable_open_defects_at_exit', 'Acceptable Open Defects at Exit', 'multi_line', 47, 'Defect Management', NULL),

  -- Test Management
  ('document_management', 'Document Management', 'multi_line', 48, 'Test Management', NULL),
  ('meetings', 'Meetings', 'table', 49, 'Test Management', '[{"value":"meeting","label":"Meeting"},{"value":"frequency","label":"Frequency"},{"value":"attendees","label":"Attendees"},{"value":"purpose","label":"Purpose"}]'),
  ('reporting_cadence', 'Reporting Cadence', 'dropdown', 50, 'Test Management', NULL),
  ('metrics_reported', 'Metrics Reported', 'multi_line', 51, 'Test Management', NULL),
  ('test_deliverables', 'Test Deliverables', 'multi_line', 52, 'Test Management', NULL),
  ('signoff_board', 'Review / Sign-Off Board', 'table', 53, 'Test Management', '[{"value":"deliverable","label":"Deliverable"},{"value":"reviewer","label":"Reviewer"},{"value":"approver","label":"Approver"}]'),

  -- Tools
  ('test_management_tool', 'Test Management Tool', 'text', 54, 'Tools', NULL),
  ('testing_tools', 'Testing Tools', 'table', 55, 'Tools', '[{"value":"tool","label":"Tool"},{"value":"purpose","label":"Purpose"},{"value":"users","label":"Users / Licences"}]'),
  ('automation_approach', 'Automation Approach', 'long_text', 56, 'Tools', NULL),

  -- Timeline & RACI
  ('test_timeline', 'Testing Timeline', 'table', 57, 'Timeline & RACI', '[{"value":"milestone","label":"Phase / Milestone"},{"value":"start","label":"Start","type":"date"},{"value":"end","label":"End","type":"date"},{"value":"notes","label":"Notes"}]'),
  ('raci', 'RACI', 'table', 58, 'Timeline & RACI', '[{"value":"activity","label":"Activity"},{"value":"responsible","label":"Responsible"},{"value":"accountable","label":"Accountable"},{"value":"consulted","label":"Consulted"},{"value":"informed","label":"Informed"}]'),

  -- Risks & Roles
  ('risks_mitigations', 'Risks and Contingencies', 'table', 59, 'Risks & Roles', '[{"value":"risk","label":"Risk"},{"value":"impact","label":"Impact"},{"value":"mitigation","label":"Mitigation"},{"value":"contingency","label":"Contingency"}]'),
  ('roles_and_responsibilities', 'Testing Team Structure', 'table', 60, 'Risks & Roles', '[{"value":"role","label":"Role"},{"value":"name","label":"Name"},{"value":"organisation","label":"Organisation"},{"value":"responsibilities","label":"Responsibilities"}]'),

  -- Glossary & Appendices
  ('acronyms', 'Acronyms', 'table', 61, 'Glossary & Appendices', '[{"value":"acronym","label":"Acronym"},{"value":"meaning","label":"Meaning"}]'),
  ('glossary', 'Glossary of Terms', 'table', 62, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices', 'table', 63, 'Glossary & Appendices', NULL),

  -- Document Control
  ('version_history', 'Version History', 'table', 64, 'Document Control', NULL),
  ('related_documents', 'References / Related Documents', 'multi_line', 65, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000003f'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  -- Fields listed with NULL options keep theirs (environments, reporting cadence, glossary, appendices, version history).
  dropdown_options = COALESCE(EXCLUDED.dropdown_options, public.local_register_fields.dropdown_options),
  updated_at = NOW();

-- Check: fields per tab.
SELECT COALESCE(field_group, 'Details') AS tab, count(*) AS fields
FROM public.local_register_fields
WHERE register_id = '00000000-0000-4000-9001-00000000003f'::uuid
GROUP BY 1 ORDER BY min(display_order);

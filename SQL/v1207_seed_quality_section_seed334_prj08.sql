-- =============================================================================
-- v1207: Seed sample data for the Quality sidebar section, SEED334-PRJ-08 ONLY
-- Covers: Quality Plan (fills the existing strategy's empty sub-sections),
--         Non-Conformance (quality_defects, is_non_conformance = true),
--         Acceptance (project_product_descriptions + ppd_acceptance_criteria),
--         Configuration Item Register (configuration_management_strategies +
--         configuration_items).
--
-- NOT covered here, on purpose:
--   * Quality Register and Quality Reviews already have real data for this
--     project (12 and 5 rows respectively) — nothing to seed.
--   * Testing Centre (/platform/testing-centre) is not project-scoped at all —
--     its tc_test_cases link to an internal app-module registry (module_id),
--     for testing Nidus itself, not a customer project. There is no
--     project-specific data to seed there.
--
-- Prerequisites:
--   v334 (SEED334 projects), v180 (QMS tables), v32 (quality_defects),
--   v177 (PPD tables), v192/v194 (configuration management tables).
--   The project's Quality Management Strategy row must already exist
--   (it does — created via the app, QMS-V72X9JP3U).
-- Idempotent: fixed hex-only UUIDs + ON CONFLICT (id) DO NOTHING. Safe to re-run.
-- =============================================================================

DO $$
DECLARE
  v_project_id   UUID;
  v_project_code TEXT := 'SEED334-PRJ-08';
  v_user_id      UUID;
  v_auth_uid     UUID;
  v_qms_id       UUID;
  v_ppd_id       UUID;
  v_cms_id       UUID;
BEGIN

  SELECT id INTO v_project_id
  FROM public.projects
  WHERE project_code = v_project_code
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'v1207: project % not found — run v334 first', v_project_code;
  END IF;

  SELECT owner_user_id INTO v_user_id FROM public.projects WHERE id = v_project_id;
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM public.users WHERE COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  END IF;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'v1207: No user available to attribute seed rows. Skipping.';
    RETURN;
  END IF;

  SELECT auth_user_id INTO v_auth_uid FROM public.users WHERE id = v_user_id LIMIT 1;
  IF v_auth_uid IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth_uid::text)::text, true);
  END IF;

  -- ===========================================================================
  -- PART A — Quality Plan: fill the existing strategy's empty sub-sections
  -- ===========================================================================
  SELECT id INTO v_qms_id FROM public.quality_management_strategies WHERE project_id = v_project_id;
  IF v_qms_id IS NULL THEN
    RAISE NOTICE 'v1207: No Quality Management Strategy found for %; skipping Part A (Quality Plan).', v_project_code;
  ELSE

    INSERT INTO public.qms_quality_standards (
      id, qms_id, standard_code, standard_name, standard_version, standard_description,
      standard_type, applicability, compliance_level, certification_required, display_order, created_by
    ) VALUES
      ('c1207001-5d01-4a01-9c01-534433340801', v_qms_id, 'ISO 9001:2015', 'Quality Management Systems', '2015',
       'International standard for quality management systems.', 'international',
       'Applies to all delivery processes on this project.', 'mandatory', true, 1, v_user_id),
      ('c1207001-5d01-4a01-9c01-534433340802', v_qms_id, 'ROP-DATA-01', 'Route Optimization Data Accuracy Standard', '1.0',
       'Customer-defined accuracy requirements for optimized route output.', 'customer',
       'Applies to the route optimization engine and its reporting.', 'mandatory', false, 2, v_user_id)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.qms_quality_methods (
      id, qms_id, method_name, method_type, method_description, when_to_use,
      entry_criteria, exit_criteria, required_participants, documentation_required,
      is_mandatory, display_order, created_by
    ) VALUES
      ('c1207002-5d01-4a01-9c01-534433340801', v_qms_id, 'Peer code review', 'review',
       'Every code change is reviewed by at least one other engineer before merge.',
       'Before any code change is merged.', 'Pull request opened.', 'Reviewer approval recorded.',
       'Author and one reviewer.', 'Review comments on the pull request.', true, 1, v_user_id),
      ('c1207002-5d01-4a01-9c01-534433340802', v_qms_id, 'User acceptance testing', 'testing',
       'Business stakeholders test each major deliverable against its acceptance criteria.',
       'Before a product is marked complete in the Quality Register.', 'Product passes internal testing.',
       'All acceptance criteria recorded as passed or waived.', 'Product owner and end-user representative.',
       'Completed acceptance checklist.', true, 2, v_user_id)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.qms_quality_metrics (
      id, qms_id, metric_name, metric_description, metric_category, measurement_method,
      unit_of_measure, target_value, threshold_warning, threshold_critical,
      collection_frequency, responsible_role, display_order, created_by
    ) VALUES
      ('c1207003-5d01-4a01-9c01-534433340801', v_qms_id, 'Defect density', 'Defects found per delivered product.',
       'defect', 'Count of open quality_defects rows divided by products delivered.', 'defects/product',
       '< 1', '1-2', '> 2', 'weekly', 'Quality Manager', 1, v_user_id),
      ('c1207003-5d01-4a01-9c01-534433340802', v_qms_id, 'Route optimization accuracy', 'Accuracy of the route optimization engine output against known-good routes.',
       'performance', 'Automated comparison against a validated route set.', '%',
       '98', '95-98', '< 95', 'continuous', 'Engineering Lead', 2, v_user_id)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.qms_tools_techniques (
      id, qms_id, tool_name, tool_type, tool_description, tool_purpose, applicable_to,
      proficiency_required, license_required, display_order, created_by
    ) VALUES
      ('c1207004-5d01-4a01-9c01-534433340801', v_qms_id, 'Testing Centre', 'software',
       'In-app test case and test run tracking.', 'Records manual and automated test execution.',
       'Quality control.', 'basic', false, 1, v_user_id),
      ('c1207004-5d01-4a01-9c01-534433340802', v_qms_id, 'Inspection checklist', 'checklist',
       'Structured checklist used during product inspections.', 'Standardises what is checked at each inspection.',
       'Quality control and assurance.', 'none', false, 2, v_user_id)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.qms_records (
      id, qms_id, record_name, record_type, record_description, record_purpose,
      storage_location, retention_period, is_mandatory, display_order, created_by
    ) VALUES
      ('c1207005-5d01-4a01-9c01-534433340801', v_qms_id, 'Quality Register entries', 'quality_register',
       'Per-product quality criteria, method and outcome.', 'Evidence that each product met its quality criteria.',
       'Quality Register (this project).', 'Project lifetime plus 1 year.', true, 1, v_user_id),
      ('c1207005-5d01-4a01-9c01-534433340802', v_qms_id, 'Test execution results', 'test_results',
       'Pass/fail outcome and evidence for every executed test case.', 'Evidence that testing was carried out and what it found.',
       'Testing & QA module (this project).', 'Project lifetime plus 1 year.', true, 2, v_user_id)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.qms_reports (
      id, qms_id, report_name, report_type, report_description, report_purpose,
      report_content, frequency, recipients, responsible_role, display_order, created_by
    ) VALUES
      ('c1207006-5d01-4a01-9c01-534433340801', v_qms_id, 'Monthly quality status report', 'quality_status',
       'Summary of quality register status, open defects and review outcomes.', 'Keeps the project board informed of quality health.',
       'Quality Register summary, open defect count by severity, review outcomes.', 'monthly',
       'Project Board, PMO', 'Quality Manager', 1, v_user_id)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.qms_scheduled_activities (
      id, qms_id, activity_name, activity_type, activity_description, activity_purpose,
      timing, frequency, participants, outputs, linked_to_quality_register, display_order, created_by
    ) VALUES
      ('c1207007-5d01-4a01-9c01-534433340801', v_qms_id, 'Stage-end quality review', 'review',
       'Review of all products delivered in the stage against their quality criteria.',
       'Confirms the stage''s products are fit for purpose before moving on.', 'stage_end', NULL,
       'Project Manager, Quality Manager, relevant product owners.', 'Quality review record.', true, 1, v_user_id),
      ('c1207007-5d01-4a01-9c01-534433340802', v_qms_id, 'Mid-project quality audit', 'audit',
       'Independent check that the quality approach itself is being followed.',
       'Assures the project board the quality process is working, not just the products.', 'milestone', NULL,
       'Independent QA reviewer.', 'Audit report.', false, 2, v_user_id)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.qms_roles_responsibilities (
      id, qms_id, role_name, role_type, role_description, responsibilities,
      independence_level, assigned_to_id, is_mandatory, display_order, created_by
    ) VALUES
      ('c1207008-5d01-4a01-9c01-534433340801', v_qms_id, 'Project Manager', 'project_manager',
       'Owns delivery of the quality approach day to day.',
       'Ensures quality criteria are set for every product and tracked in the Quality Register.',
       'project_team', v_user_id, true, 1, v_user_id),
      ('c1207008-5d01-4a01-9c01-534433340802', v_qms_id, 'Independent QA Reviewer', 'project_assurance',
       'Provides independent assurance that quality activities are being carried out as planned.',
       'Runs stage-end audits and reports findings to the project board.',
       'project_independent', NULL, true, 2, v_user_id)
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'v1207: Quality Plan sub-sections seeded for %.', v_project_code;
  END IF;

  -- ===========================================================================
  -- PART B — Non-Conformance (quality_defects, is_non_conformance = true)
  -- ===========================================================================
  INSERT INTO public.quality_defects (
    id, project_id, defect_reference, defect_title, defect_description, defect_type, defect_category,
    discovered_by, discovery_date, discovery_method, severity, priority,
    is_non_conformance, affected_standard, status, notes, created_by
  ) VALUES
    ('c1207009-5d01-4a01-9c01-534433340801', v_project_id, 'NC-SEED334-001',
     'Payment handling does not meet PCI data-at-rest standard',
     'Card reference data is stored without the masking required by the project''s PCI handling standard.',
     'compliance', 'data handling', v_user_id, CURRENT_DATE - 6, 'audit', 'high', 'urgent',
     true, 'ISO 9001:2015', 'open', 'Raised during the mid-project quality audit.', v_user_id),

    ('c1207009-5d01-4a01-9c01-534433340802', v_project_id, 'NC-SEED334-002',
     'Route optimization output violates the agreed data schema',
     'The optimization engine emits an extra field not defined in ROP-DATA-01, breaking downstream consumers.',
     'compliance', 'data format', v_user_id, CURRENT_DATE - 3, 'review', 'medium', 'high',
     true, 'ROP-DATA-01', 'in-progress', 'Fix scheduled for next sprint.', v_user_id),

    ('c1207009-5d01-4a01-9c01-534433340803', v_project_id, 'DEF-SEED334-901',
     'Minor spacing inconsistency on the dashboard summary cards',
     'Card padding is inconsistent between light and dark mode on the project dashboard.',
     'usability', 'ui', v_user_id, CURRENT_DATE - 1, 'review', 'low', 'low',
     false, NULL, 'open', 'Cosmetic only, not a standards breach — kept out of the Non-Conformance list on purpose.', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- ===========================================================================
  -- PART C — Acceptance (project_product_descriptions + ppd_acceptance_criteria)
  -- ===========================================================================
  INSERT INTO public.project_product_descriptions (
    id, project_id, ppd_reference, product_title, purpose, composition,
    customer_quality_expectations, quality_characteristics, applicable_standards,
    acceptance_method, acceptance_responsibilities, status, created_by
  ) VALUES
    ('c120700a-5d01-4a01-9c01-534433340801', v_project_id, 'PPD-SEED334-PRJ-08',
     'Velocity Freight — Dynamic Route Optimization Pilot',
     'A working route optimization pilot that Velocity Freight dispatch staff can use to cut delivery time on pilot routes.',
     'Route optimization engine, dispatcher web console, driver mobile view, reporting dashboard.',
     'Fast, accurate route suggestions that dispatchers trust enough to use without manual override.',
     'Must respond within 2 seconds for a standard route set; must be accurate to within 2% of the known-best route.',
     'ISO 9001:2015, ROP-DATA-01',
     'Dispatch team runs a 2-week pilot against live routes and signs off against the acceptance criteria below.',
     'Velocity Freight Operations Manager, with PMO witness.', 'approved', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  SELECT id INTO v_ppd_id FROM public.project_product_descriptions WHERE project_id = v_project_id;

  IF v_ppd_id IS NOT NULL THEN
    INSERT INTO public.ppd_acceptance_criteria (
      id, ppd_id, criteria_number, criteria_reference, criteria_title, criteria_description,
      criteria_category, stakeholder_group, priority, measurement_method, target_value,
      unit_of_measure, is_measurable, is_realistic, acceptance_status, display_order, created_by
    ) VALUES
      ('c120700b-5d01-4a01-9c01-534433340801', v_ppd_id, 1, 'AC-001',
       'Route suggestion response time',
       'The engine returns a suggested route within 2 seconds for a standard pilot route set.',
       'performance', 'operations', 'must_have', 'Timed test runs against the pilot route set.', '2',
       'seconds', true, true, 'passed', 1, v_user_id),

      ('c120700b-5d01-4a01-9c01-534433340802', v_ppd_id, 2, 'AC-002',
       'Route accuracy',
       'Suggested routes are within 2% of the known-best route distance for the pilot route set.',
       'quality', 'operations', 'must_have', 'Automated comparison against a validated route set.', '2',
       '%', true, true, 'pending', 2, v_user_id),

      ('c120700b-5d01-4a01-9c01-534433340803', v_ppd_id, 3, 'AC-003',
       'Dispatcher sign-off',
       'The Velocity Freight Operations Manager signs off the pilot after the 2-week trial.',
       'operational', 'management', 'must_have', 'Signed acceptance form at the end of the pilot.', NULL,
       NULL, false, true, 'pending', 3, v_user_id)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- ===========================================================================
  -- PART D — Configuration Item Register
  -- ===========================================================================
  INSERT INTO public.configuration_management_strategies (
    id, project_id, cms_reference, purpose, scope,
    configuration_planning_approach, configuration_control_approach, status, created_by
  ) VALUES
    ('c120700c-5d01-4a01-9c01-534433340801', v_project_id, 'CMS-CFG-SEED334-PRJ-08',
     'Defines how configuration items for the route optimization pilot are identified, versioned and controlled.',
     'Covers the optimization engine, dispatcher console, driver mobile view and their supporting configuration.',
     'Each major deliverable is registered as a configuration item at creation, with a baseline version.',
     'Changes to a baselined item go through the project''s change control process before a new version is accepted.',
     'approved', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  SELECT id INTO v_cms_id FROM public.configuration_management_strategies WHERE project_id = v_project_id;

  IF v_cms_id IS NOT NULL THEN
    INSERT INTO public.configuration_items (
      id, project_id, cfg_ms_id, configuration_item_identifier, item_name, item_description,
      item_type_code, current_version, current_status_code, is_in_baseline, created_by
    ) VALUES
      ('c120700d-5d01-4a01-9c01-534433340801', v_project_id, v_cms_id, 'CI-SEED334-001',
       'Route Optimization Engine', 'The core optimization service that computes suggested routes.',
       'software_component', '1.2', 'baselined', true, v_user_id),

      ('c120700d-5d01-4a01-9c01-534433340802', v_project_id, v_cms_id, 'CI-SEED334-002',
       'Dispatcher Web Console', 'The web application dispatch staff use to review and accept suggested routes.',
       'software_component', '1.0', 'baselined', true, v_user_id),

      ('c120700d-5d01-4a01-9c01-534433340803', v_project_id, v_cms_id, 'CI-SEED334-003',
       'Quality Management Strategy (QMS-V72X9JP3U)', 'The approved document defining the project''s quality approach.',
       'document', '1.0', 'draft', false, v_user_id)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RAISE NOTICE 'v1207: Non-Conformance, Acceptance and Configuration Item Register seeded for %.', v_project_code;

END $$;

-- Verification: one row count per area.
SELECT 'quality_defects (non-conformance)' AS area, COUNT(*) AS rows
FROM public.quality_defects qd
JOIN public.projects p ON p.id = qd.project_id
WHERE p.project_code = 'SEED334-PRJ-08' AND qd.is_non_conformance = true
UNION ALL
SELECT 'ppd_acceptance_criteria', COUNT(*)
FROM public.ppd_acceptance_criteria ac
JOIN public.project_product_descriptions ppd ON ppd.id = ac.ppd_id
JOIN public.projects p ON p.id = ppd.project_id
WHERE p.project_code = 'SEED334-PRJ-08'
UNION ALL
SELECT 'configuration_items', COUNT(*)
FROM public.configuration_items ci
JOIN public.projects p ON p.id = ci.project_id
WHERE p.project_code = 'SEED334-PRJ-08'
UNION ALL
SELECT 'qms_quality_standards', COUNT(*)
FROM public.qms_quality_standards qs
JOIN public.quality_management_strategies qms ON qms.id = qs.qms_id
JOIN public.projects p ON p.id = qms.project_id
WHERE p.project_code = 'SEED334-PRJ-08';

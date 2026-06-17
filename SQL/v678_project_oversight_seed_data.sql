-- ============================================================================
-- v678: Project Oversight Seed Data
-- Tables: risks, issues, quality_register, lessons_logs, lessons,
--         project_delays, delay_templates, scope_management_plans,
--         scope_statements, schedule_management_plans,
--         change_board, change_requests
-- Prerequisites: v25, v26, v31, v32, v169, v355, v359, v363, v444
-- Context: Fictional "ERP Digital Transformation" project seed records
-- ============================================================================

DO $$
DECLARE
  v_project_id   UUID;
  v_org_id       UUID;
  v_user1        UUID;   -- PM / primary owner
  v_user2        UUID;   -- Senior BA / second user
  v_user3        UUID;   -- QA Lead / third user

  -- table-existence flags (checked via information_schema before each section)
  v_has_lessons      BOOLEAN := FALSE;
  v_has_delays       BOOLEAN := FALSE;
  v_has_scope_mgmt   BOOLEAN := FALSE;
  v_has_scope_stmt   BOOLEAN := FALSE;
  v_has_sched_mgmt   BOOLEAN := FALSE;
  v_has_change       BOOLEAN := FALSE;

  -- generated IDs reused across inserts
  v_board_id         UUID := gen_random_uuid();
  v_lessons_log_id   UUID := gen_random_uuid();
  v_risk1_id         UUID := gen_random_uuid();
  v_risk2_id         UUID := gen_random_uuid();
  v_issue1_id        UUID := gen_random_uuid();
  v_issue2_id        UUID := gen_random_uuid();
  v_delay_tpl1       UUID := gen_random_uuid();
  v_delay_tpl2       UUID := gen_random_uuid();
BEGIN
  -- -----------------------------------------------------------------------
  -- Resolve a real project and real users so FK constraints are satisfied
  -- -----------------------------------------------------------------------
  SELECT id INTO v_project_id
  FROM projects
  WHERE is_deleted = FALSE
  ORDER BY created_at
  LIMIT 1;

  SELECT id INTO v_org_id
  FROM accounts
  ORDER BY created_at
  LIMIT 1;

  -- Grab up to 3 distinct users
  SELECT id INTO v_user1 FROM users WHERE is_deleted = FALSE ORDER BY created_at LIMIT 1;
  SELECT id INTO v_user2 FROM users WHERE is_deleted = FALSE AND id <> v_user1 ORDER BY created_at LIMIT 1;
  SELECT id INTO v_user3 FROM users WHERE is_deleted = FALSE AND id <> v_user1 AND id <> COALESCE(v_user2, v_user1) ORDER BY created_at LIMIT 1;

  -- Fall back: all three can be the same user if only one exists
  v_user2 := COALESCE(v_user2, v_user1);
  v_user3 := COALESCE(v_user3, v_user2);

  -- Check which optional tables exist so we can skip gracefully if migrations
  -- v169, v355, v359, v363, v31, v444 have not been run yet.
  SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='lessons_logs')         INTO v_has_lessons;
  SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='project_delays')       INTO v_has_delays;
  SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='scope_management_plans') INTO v_has_scope_mgmt;
  SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='scope_statements')     INTO v_has_scope_stmt;
  SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='schedule_management_plans') INTO v_has_sched_mgmt;
  SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='change_board')         INTO v_has_change;

  IF v_project_id IS NULL THEN
    RAISE NOTICE 'No project found – seed data skipped. Create a project first.';
    RETURN;
  END IF;

  IF v_org_id IS NULL THEN
    RAISE NOTICE 'No organisation found – delay templates and delay records will be skipped.';
  END IF;

  RAISE NOTICE 'Seeding oversight data for project % (org %)', v_project_id, v_org_id;

  -- =========================================================================
  -- 1. RISK REGISTER
  -- =========================================================================

  INSERT INTO risks (
    id, project_id,
    risk_title, risk_description, risk_code,
    risk_category, risk_type,
    probability, impact,
    status,
    identified_by_user_id, risk_owner_user_id,
    response_strategy, response_strategy_description,
    identified_date, target_mitigation_date, next_review_date,
    impact_description, affected_areas,
    created_by, updated_by
  ) VALUES
  (
    v_risk1_id, v_project_id,
    'Key resource unavailability during critical phase',
    'The lead integration architect may be reassigned mid-project due to concurrent enterprise demand.',
    'RISK-001',
    'resource', 'threat',
    4, 5,
    'identified',
    v_user1, v_user1,
    'mitigate', 'Identify and onboard a backup integration architect. Cross-train a mid-level developer.',
    CURRENT_DATE - 14, CURRENT_DATE + 30, CURRENT_DATE + 7,
    'Delay of 4–6 weeks if architect departs during integration sprint.',
    ARRAY['Integration', 'Schedule', 'Cost'],
    v_user1, v_user1
  ),
  (
    v_risk2_id, v_project_id,
    'Third-party API deprecation',
    'The legacy HR system API used for employee data synchronisation is scheduled for deprecation by the vendor.',
    'RISK-002',
    'technical', 'threat',
    3, 4,
    'assessed',
    v_user1, v_user2,
    'avoid', 'Accelerate migration to the vendor REST v2 API ahead of the deprecation deadline.',
    CURRENT_DATE - 21, CURRENT_DATE + 45, CURRENT_DATE + 14,
    'Data sync failures across HR and payroll modules if API is removed mid-project.',
    ARRAY['Technical', 'Integration'],
    v_user1, v_user2
  ),
  (
    gen_random_uuid(), v_project_id,
    'Budget overrun on software licensing',
    'Current licence cost estimates are based on 200 named users; actual onboarding may reach 350 users.',
    'RISK-003',
    'financial', 'threat',
    3, 3,
    'mitigated',
    v_user2, v_user1,
    'transfer', 'Negotiate a concurrent-user licence model with the vendor to cap cost exposure.',
    CURRENT_DATE - 30, CURRENT_DATE + 10, CURRENT_DATE + 21,
    'Potential 40% increase in licence costs exceeding the approved budget tolerance.',
    ARRAY['Financial', 'Procurement'],
    v_user1, v_user1
  ),
  (
    gen_random_uuid(), v_project_id,
    'Low end-user adoption post go-live',
    'Staff resistance to new workflows may reduce adoption rates below the 70% target in Q1.',
    'RISK-004',
    'organizational', 'threat',
    4, 3,
    'identified',
    v_user3, v_user3,
    'mitigate', 'Deliver role-specific training sessions and appoint departmental super-users as change agents.',
    CURRENT_DATE - 7, CURRENT_DATE + 60, CURRENT_DATE + 30,
    'ROI delays and potential parallel-running costs if adoption target is missed.',
    ARRAY['Change Management', 'Training'],
    v_user1, v_user1
  ),
  (
    gen_random_uuid(), v_project_id,
    'Data migration quality defects',
    'Historical data in the legacy system contains inconsistencies that may corrupt master data in the new ERP.',
    'RISK-005',
    'quality', 'threat',
    3, 5,
    'assessed',
    v_user2, v_user2,
    'mitigate', 'Run full data cleansing sprint before migration and implement automated validation rules.',
    CURRENT_DATE - 10, CURRENT_DATE + 20, CURRENT_DATE + 7,
    'Corrupted master data could cause reporting failures and audit non-compliance.',
    ARRAY['Data', 'Quality', 'Compliance'],
    v_user1, v_user2
  ),
  (
    gen_random_uuid(), v_project_id,
    'Regulatory compliance window opportunity',
    'New government digital reporting framework offers early-adopter incentives if submitted before deadline.',
    'RISK-006',
    'external', 'opportunity',
    3, 4,
    'identified',
    v_user1, v_user1,
    'exploit', 'Prioritise regulatory reporting module to qualify for grant funding and reduced audit frequency.',
    CURRENT_DATE - 5, CURRENT_DATE + 90, CURRENT_DATE + 30,
    'Potential USD 150,000 grant and reduced compliance audit burden.',
    ARRAY['Regulatory', 'Financial'],
    v_user1, v_user1
  )
  ON CONFLICT DO NOTHING;

  -- =========================================================================
  -- 2. ISSUE REGISTER
  -- =========================================================================

  INSERT INTO issues (
    id, project_id,
    issue_title, issue_description, issue_code,
    issue_type, issue_category,
    priority, severity,
    status,
    reported_by_user_id, assigned_to_user_id,
    due_date, estimated_resolution_date,
    impact_description, affected_areas,
    created_by, updated_by
  ) VALUES
  (
    v_issue1_id, v_project_id,
    'Development environment SSL certificate expired',
    'The SSL certificate on the UAT environment expired, blocking the QA team from accessing the test portal.',
    'ISSUE-001',
    'blocker', 'technical',
    'critical', 'high',
    'in_progress',
    v_user2, v_user3,
    CURRENT_DATE + 1, CURRENT_DATE + 1,
    'QA testing completely blocked. Sprint 6 deliverables at risk.',
    ARRAY['QA', 'Environment'],
    v_user1, v_user2
  ),
  (
    v_issue2_id, v_project_id,
    'Finance module rounding discrepancy',
    'Multi-currency transactions show 0.01–0.05 rounding errors when the reporting currency differs from the transaction currency.',
    'ISSUE-002',
    'bug', 'technical',
    'high', 'high',
    'assigned',
    v_user3, v_user2,
    CURRENT_DATE + 7, CURRENT_DATE + 5,
    'Financial reporting will fail audit accuracy checks if unresolved before go-live.',
    ARRAY['Finance', 'Reporting'],
    v_user1, v_user1
  ),
  (
    gen_random_uuid(), v_project_id,
    'Missing user story acceptance criteria for HR onboarding',
    'Sprint 4 HR onboarding stories lack documented acceptance criteria, causing disagreement between BA and QA.',
    'ISSUE-003',
    'question', 'process',
    'medium', 'medium',
    'new',
    v_user2, v_user1,
    CURRENT_DATE + 5, CURRENT_DATE + 3,
    'Risk of incomplete testing and sign-off delay for the HR module.',
    ARRAY['HR Module', 'Requirements'],
    v_user1, v_user1
  ),
  (
    gen_random_uuid(), v_project_id,
    'Performance degradation under load test (500+ concurrent users)',
    'Load tests show API response times exceeding 8 seconds at 500 concurrent users against a 2-second SLA.',
    'ISSUE-004',
    'bug', 'technical',
    'high', 'critical',
    'in_progress',
    v_user3, v_user3,
    CURRENT_DATE + 10, CURRENT_DATE + 8,
    'System will not meet performance SLA at go-live user volumes.',
    ARRAY['Performance', 'Infrastructure'],
    v_user1, v_user2
  ),
  (
    gen_random_uuid(), v_project_id,
    'Stakeholder unavailability for UAT sign-off week',
    'Three key business stakeholders have confirmed conflicting diary commitments during the planned UAT sign-off week.',
    'ISSUE-005',
    'task', 'stakeholder',
    'high', 'medium',
    'assigned',
    v_user1, v_user2,
    CURRENT_DATE + 14, CURRENT_DATE + 12,
    'UAT sign-off delay will cascade into go-live date slippage.',
    ARRAY['UAT', 'Schedule'],
    v_user1, v_user1
  ),
  (
    gen_random_uuid(), v_project_id,
    'Integration test data not refreshed for Sprint 5',
    'The integration test data set was not refreshed after Sprint 4 changes, causing false positive test results.',
    'ISSUE-006',
    'bug', 'process',
    'medium', 'medium',
    'resolved',
    v_user2, v_user3,
    CURRENT_DATE - 2, CURRENT_DATE - 1,
    'Test results from Sprint 5 are unreliable and need to be re-run after data refresh.',
    ARRAY['Testing', 'Data'],
    v_user1, v_user2
  )
  ON CONFLICT DO NOTHING;

  -- =========================================================================
  -- 3. QUALITY REGISTER
  -- =========================================================================

  INSERT INTO quality_register (
    project_id,
    product_reference, product_name, product_description, product_type, product_category,
    quality_method, quality_responsibilities,
    quality_owner_user_id,
    quality_criteria, acceptance_criteria,
    quality_standards, compliance_requirements,
    quality_tolerance_description, defect_tolerance,
    quality_review_planned_date,
    sign_off_required,
    quality_status,
    quality_score, pass_criteria_met,
    notes,
    created_by, updated_by
  ) VALUES
  (
    v_project_id,
    'QR-001', 'System Requirements Specification (SRS)', 'Comprehensive functional and non-functional requirements for the ERP system.', 'document', 'Initiation',
    'review', 'Business Analyst drafts; PMO QA Lead reviews; Project Sponsor approves.',
    v_user2,
    'All functional requirements traceable to business objectives. No ambiguous "shall/should" language.',
    'Stakeholder sign-off obtained. Traceability matrix 100% complete.',
    ARRAY['ISO/IEC 29148:2018'], ARRAY['Internal Quality Policy v3'],
    'Maximum 5 minor defects per review cycle. Zero critical defects at approval.',
    5,
    CURRENT_DATE + 5,
    TRUE,
    'passed',
    94.50, TRUE,
    'SRS approved after second review cycle. Two minor ambiguities corrected.',
    v_user1, v_user2
  ),
  (
    v_project_id,
    'QR-002', 'Data Migration Plan', 'Plan documenting approach, tools, and validation for migrating 8 years of legacy data.', 'document', 'Planning',
    'inspection', 'DBA Lead drafts; QA Lead inspects; Data Governance Manager approves.',
    v_user3,
    'All data entities mapped. Rollback procedure defined. Test migration completed with 100% reconciliation.',
    'Zero data loss in test migration. Reconciliation report signed off.',
    ARRAY['ISO 8000-110'], ARRAY['GDPR Data Handling Annex'],
    'Maximum 0.1% record variance between source and target after migration.',
    0,
    CURRENT_DATE + 20,
    TRUE,
    'in-review',
    NULL, NULL,
    'First inspection cycle completed. Three data mapping gaps identified for correction.',
    v_user1, v_user3
  ),
  (
    v_project_id,
    'QR-003', 'Finance Module – Functional Build', 'Coded finance module covering AP, AR, GL, and multi-currency transactions.', 'software', 'Build',
    'testing', 'Dev team unit tests; QA team functional tests; Finance BA acceptance tests.',
    v_user3,
    'All 47 functional test cases pass. Rounding error tolerance < 0.001%. API response < 2s at 500 users.',
    'Signed test report. Zero critical bugs. Performance SLA met.',
    ARRAY['IFRS 9', 'ISO/IEC 25010'], ARRAY['SOX Compliance Checklist'],
    'Maximum 3 medium defects at first QA pass. Zero critical at final approval.',
    3,
    CURRENT_DATE + 15,
    TRUE,
    'pending',
    NULL, NULL,
    'Unit tests complete. Rounding defect (ISSUE-002) blocking functional test sign-off.',
    v_user1, v_user1
  ),
  (
    v_project_id,
    'QR-004', 'User Training Materials', 'Role-based training guides, quick-reference cards, and e-learning modules for all staff.', 'document', 'Training',
    'review', 'L&D team drafts; HR Business Partner reviews; PMO approves completeness.',
    v_user2,
    'All 12 user roles have dedicated training guide. E-learning completion rate tracked.',
    'Training materials peer-reviewed. Pilot session NPS score ≥ 8.',
    ARRAY['Internal L&D Standard v2'], ARRAY[]::TEXT[],
    'Pilot cohort satisfaction score below 7 triggers revision cycle.',
    NULL,
    CURRENT_DATE + 45,
    TRUE,
    'pending',
    NULL, NULL,
    NULL,
    v_user1, v_user1
  ),
  (
    v_project_id,
    'QR-005', 'Go-Live Readiness Report', 'Formal sign-off document confirming all go-live criteria met.', 'report', 'Deployment',
    'approval', 'PMO compiles; Steering Committee approves.',
    v_user1,
    'All critical defects resolved. Performance SLA evidenced. Training completion ≥ 80%.',
    'Steering Committee unanimous approval. No critical open risks.',
    ARRAY[]::TEXT[], ARRAY['IT Governance Policy'],
    'Any single critical risk or defect blocks go-live approval.',
    0,
    CURRENT_DATE + 60,
    TRUE,
    'pending',
    NULL, NULL,
    NULL,
    v_user1, v_user1
  )
  ON CONFLICT DO NOTHING;

  -- =========================================================================
  -- 4. LESSONS LOG (header + individual lessons)
  -- trigger_set_created_fields() overwrites created_by with auth.uid() which
  -- is NULL in SQL-editor / service-role sessions. Disable the BEFORE INSERT
  -- triggers so our explicit values are preserved, then re-enable them.
  -- =========================================================================

  IF NOT v_has_lessons THEN
    RAISE NOTICE 'lessons_logs table not found – run v169 migration first. Skipping lessons seed.';
  ELSE

  EXECUTE 'ALTER TABLE lessons_logs DISABLE TRIGGER trg_lessons_logs_before_insert';
  EXECUTE 'ALTER TABLE lessons      DISABLE TRIGGER trg_lessons_before_insert';

  INSERT INTO lessons_logs (
    id, project_id,
    log_reference, document_ref, version_number,
    author_id, owner_id,
    update_process, access_control_notes,
    is_active,
    created_by, updated_by
  ) VALUES (
    v_lessons_log_id, v_project_id,
    'LL-2026-001', 'DOC-LL-ERP-001', '1.0',
    v_user1, v_user1,
    'Lessons are logged by any team member in real time. PM reviews and categorises weekly. Log reviewed at each stage gate.',
    'Read access for all project team members. Write access restricted to PM and BAs.',
    TRUE,
    v_user1, v_user1
  )
  ON CONFLICT (project_id) DO NOTHING;

  -- Re-fetch the log id (may already exist from a prior run)
  SELECT id INTO v_lessons_log_id FROM lessons_logs WHERE project_id = v_project_id LIMIT 1;

  INSERT INTO lessons (
    lessons_log_id,
    lesson_reference, lesson_number,
    lesson_scope, is_corporate_lesson,
    title,
    event_description, effect_description, effect_type,
    cause_description, early_warning_indicators, recommendations,
    was_identified_risk, risk_type,
    project_phase, project_stage,
    status, priority, category,
    date_logged, logged_by_id,
    created_by, updated_by
  ) VALUES
  (
    v_lessons_log_id,
    'L-2026-001', 1,
    'corporate', TRUE,
    'Involve data governance team from project kick-off',
    'Data governance team was engaged only after the migration plan was drafted, requiring two full rework cycles.',
    'Added 3-week delay and rework cost to the data migration workstream.',
    'negative',
    'Assumption that data ownership was a technical DBA responsibility rather than a governance function.',
    'Multiple stakeholders expressing conflicting data ownership claims in early workshops.',
    'Include a data governance representative in the project steering committee from initiation. Add data governance review to all project templates.',
    FALSE, NULL,
    'Planning', 'Stage 2',
    'action_taken', 'high', 'process',
    CURRENT_DATE - 20, v_user1,
    v_user1, v_user1
  ),
  (
    v_lessons_log_id,
    'L-2026-002', 2,
    'project', FALSE,
    'Daily stand-up meetings improved integration team velocity',
    'After adopting daily 15-minute stand-ups, the integration team resolved blockers 60% faster than in Sprint 1.',
    'Sprint 3 velocity increased by 35% and two critical blockers resolved same-day.',
    'positive',
    'Cross-dependency visibility was low; integration team discovered blockers too late.',
    'Team members working in silos without shared task visibility.',
    'Implement daily stand-ups for all cross-functional workstreams from Sprint 1. Include dependency map on stand-up board.',
    FALSE, NULL,
    'Execution', 'Stage 3',
    'closed', 'medium', 'process',
    CURRENT_DATE - 14, v_user2,
    v_user1, v_user2
  ),
  (
    v_lessons_log_id,
    'L-2026-003', 3,
    'corporate', TRUE,
    'Third-party vendor SLA response times understated in contract',
    'Vendor support tickets took an average of 48 hours to respond despite a contracted 4-hour SLA for critical issues.',
    'UAT was delayed by 5 days waiting for vendor patches. Escalation process was unclear.',
    'negative',
    'SLA terms not verified against vendor''s actual support capacity during procurement. No escalation clause in contract.',
    'Support response delays accumulating in the first two sprints.',
    'Include vendor SLA verification as a procurement due-diligence step. Add escalation matrix and financial penalty clauses for SLA breaches.',
    TRUE, 'threat',
    'Execution', 'Stage 3',
    'action_required', 'critical', 'procurement',
    CURRENT_DATE - 10, v_user3,
    v_user1, v_user3
  ),
  (
    v_lessons_log_id,
    'L-2026-004', 4,
    'project', FALSE,
    'Early stakeholder demo sessions reduced sign-off rework',
    'Fortnightly stakeholder demo sessions meant feedback was incorporated in-sprint rather than at formal sign-off gates.',
    'Change request volume at Stage 3 gate was 70% lower than the Stage 2 gate.',
    'positive',
    'Historical practice relied on formal review gates with no interim visibility.',
    'None – this is a positive practice to replicate.',
    'Mandate fortnightly stakeholder demo sessions as a standard in the project management framework.',
    FALSE, NULL,
    'Execution', 'Stage 3',
    'closed', 'medium', 'stakeholder',
    CURRENT_DATE - 7, v_user1,
    v_user1, v_user1
  ),
  (
    v_lessons_log_id,
    'L-2026-005', 5,
    'corporate', TRUE,
    'Automated regression testing suite prevented go-live defects',
    'A 450-test automated regression suite detected 12 regressions introduced during Sprint 5 hotfixes before UAT.',
    'Zero regression defects reached UAT; go-live readiness improved significantly.',
    'positive',
    'Decision to invest in test automation made in Sprint 1, delivering returns from Sprint 4 onwards.',
    'Manual regression cycles were taking 3 days per sprint, flagging automation ROI early.',
    'Budget for automated regression suite in all future system implementation projects from Sprint 1. Define minimum coverage at 80% of functional test cases.',
    FALSE, NULL,
    'Execution', 'Stage 4',
    'closed', 'high', 'technical',
    CURRENT_DATE - 3, v_user3,
    v_user1, v_user3
  ),
  (
    v_lessons_log_id,
    'L-2026-006', 6,
    'project', FALSE,
    'Resource plan did not account for public holiday impact on sprint capacity',
    'Two sprint velocity targets were missed because the resource plan did not factor in three public holidays.',
    'Two deadline misses and one revised milestone, causing stakeholder concern.',
    'negative',
    'Sprint capacity model used 5-day work weeks without adjusting for national holidays.',
    'Sprint planning sessions showing inflated capacity estimates relative to available working days.',
    'Update the sprint planning template to deduct known public holidays automatically. Review capacity at sprint planning using an adjusted calendar.',
    FALSE, NULL,
    'Planning', 'Stage 2',
    'action_taken', 'medium', 'schedule',
    CURRENT_DATE - 1, v_user2,
    v_user1, v_user2
  )
  ON CONFLICT DO NOTHING;

  -- Re-enable triggers now that lessons data is inserted
  EXECUTE 'ALTER TABLE lessons_logs ENABLE TRIGGER trg_lessons_logs_before_insert';
  EXECUTE 'ALTER TABLE lessons      ENABLE TRIGGER trg_lessons_before_insert';

  END IF; -- v_has_lessons

  -- =========================================================================
  -- 5. DELAY TEMPLATES (organisation-level)
  -- =========================================================================

  IF NOT v_has_delays THEN
    RAISE NOTICE 'delay_templates table not found – run v444 migration first. Skipping delay seed.';
  ELSIF v_org_id IS NOT NULL THEN
    INSERT INTO delay_templates (
      id, organisation_id,
      name, delay_category, delay_cause, responsible_party,
      default_severity, resolution_plan_template,
      tags, status
    ) VALUES
    (
      v_delay_tpl1, v_org_id,
      'Weather Event Disruption', 'weather',
      'Extreme weather (flood, storm, heatwave) preventing site or office access.',
      'External / Force Majeure',
      'medium',
      '1. Activate remote working protocol. 2. Notify client of delay and revised forecast. 3. Assess schedule float and adjust milestones. 4. Document for insurance / contractual notice.',
      ARRAY['weather', 'force-majeure', 'bcp'],
      'active'
    ),
    (
      v_delay_tpl2, v_org_id,
      'Key Resource Sick Leave / Unavailability', 'resource',
      'Named resource on critical path takes unplanned sick leave or is reassigned.',
      'Internal / HR',
      'high',
      '1. Identify backup resource or temporary cover. 2. Brief backup resource on outstanding tasks within 24 hours. 3. Reassess critical path impact. 4. Notify PM and update risk register.',
      ARRAY['resource', 'staffing', 'critical-path'],
      'active'
    ),
    (
      gen_random_uuid(), v_org_id,
      'Third-party Dependency Not Delivered', 'external_dependency',
      'External supplier, vendor, or government body fails to deliver input on time.',
      'External Vendor / Supplier',
      'high',
      '1. Issue formal notice of delay to vendor citing contractual SLA. 2. Explore interim workaround. 3. Quantify schedule impact and raise change request if tolerance exceeded. 4. Escalate to procurement manager.',
      ARRAY['vendor', 'external', 'dependency', 'sla'],
      'active'
    ),
    (
      gen_random_uuid(), v_org_id,
      'Regulatory Approval Delay', 'regulatory',
      'Regulatory body takes longer than anticipated to issue approval, permit, or licence.',
      'Regulatory Authority',
      'critical',
      '1. Chase regulatory authority with formal written request. 2. Engage legal / compliance team. 3. Explore provisional start options where permissible. 4. Update project schedule with revised approval estimate.',
      ARRAY['regulatory', 'compliance', 'permit'],
      'active'
    ),
    (
      gen_random_uuid(), v_org_id,
      'Change Request Impact on Schedule', 'change_request',
      'Approved change request introduces additional scope that was not accounted for in the original schedule.',
      'Project Manager / Change Board',
      'medium',
      '1. Re-baseline schedule to accommodate approved change. 2. Identify tasks displaced and notify affected workstreams. 3. Update project delay register with reference to change request. 4. Communicate revised milestone dates to stakeholders.',
      ARRAY['change-request', 'scope', 'rebaseline'],
      'active'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- =========================================================================
  -- 6. DELAY REGISTER (project-level) — requires tables + valid organisation
  -- =========================================================================

  IF v_has_delays AND v_org_id IS NOT NULL THEN
    INSERT INTO project_delays (
      project_id, organisation_id,
      delay_reference, title, description,
      delay_category, delay_cause, responsible_party,
      impact_schedule_days, impact_cost,
      severity, status,
      identified_date, original_baseline_date, revised_forecast_date,
      resolution_plan, resolution_owner_id, resolution_target_date,
      linked_issue_id,
      source_type,
      created_by
    ) VALUES
    (
      v_project_id, v_org_id,
      'DEL-001',
      'UAT Environment SSL Certificate Outage',
      'Expired SSL certificate on the UAT server blocked QA team access for 36 hours.',
      'technical', 'SSL certificate renewal process was not included in the environment maintenance schedule.',
      'Internal / Infrastructure Team',
      2, 0,
      'medium', 'resolved',
      CURRENT_DATE - 5, CURRENT_DATE - 3, CURRENT_DATE - 1,
      '1. Emergency certificate renewal completed. 2. Added certificate expiry monitoring to DevOps alerting. 3. Certificate renewal added to environment runbook.',
      v_user3, CURRENT_DATE - 1,
      v_issue1_id,
      'auto_issue',
      v_user1
    ),
    (
      v_project_id, v_org_id,
      'DEL-002',
      'Finance Module Rounding Defect – Delayed Sign-off',
      'Multi-currency rounding defect (ISSUE-002) has delayed functional test sign-off for the Finance module by one sprint.',
      'technical', 'Edge case in currency conversion library not covered by initial unit tests.',
      'Internal / Development Team',
      10, 12500.00,
      'high', 'under_review',
      CURRENT_DATE - 3, CURRENT_DATE + 7, CURRENT_DATE + 17,
      '1. Developer assigned to fix rounding algorithm. 2. Additional test cases added to cover 8 currency pairs. 3. Finance BA to re-run acceptance tests on fix.',
      v_user2, CURRENT_DATE + 17,
      v_issue2_id,
      'auto_issue',
      v_user1
    ),
    (
      v_project_id, v_org_id,
      'DEL-003',
      'Vendor Patch Delivery Delay – Integration Module',
      'ERP vendor took 48 hours to deliver a critical integration patch, breaching the 4-hour SLA.',
      'external_dependency', 'Vendor support ticket queued incorrectly as medium priority internally.',
      'External Vendor',
      5, 8000.00,
      'high', 'approved',
      CURRENT_DATE - 10, CURRENT_DATE - 5, CURRENT_DATE,
      '1. Formal SLA breach notice sent to vendor. 2. Escalation protocol documented. 3. Penalty clause invoked for credit against next licence invoice.',
      v_user1, CURRENT_DATE,
      NULL,
      'manual',
      v_user1
    ),
    (
      v_project_id, v_org_id,
      'DEL-004',
      'Data Cleansing Effort Underestimated',
      'Legacy data contained 23,000 duplicate records requiring manual cleansing, significantly exceeding the estimate of 5,000.',
      'resource', 'Initial data profiling sample was too small (2%) to detect the true duplication rate.',
      'Internal / Data Migration Team',
      14, 22000.00,
      'critical', 'identified',
      CURRENT_DATE - 2, CURRENT_DATE + 14, CURRENT_DATE + 28,
      '1. Bring in two additional data analysts for a 2-week data cleanse sprint. 2. Run full-volume data profiling before any future migration estimate. 3. Raise change request for additional budget.',
      v_user2, CURRENT_DATE + 28,
      NULL,
      'manual',
      v_user1
    ),
    (
      v_project_id, v_org_id,
      'DEL-005',
      'Stakeholder Diary Conflict – UAT Sign-off Week',
      'Three key business owners are unavailable during the planned UAT sign-off week, requiring a 1-week postponement.',
      'stakeholder', 'Sign-off week was scheduled without confirming stakeholder availability.',
      'Business / Stakeholder Management',
      7, 5000.00,
      'medium', 'identified',
      CURRENT_DATE - 1, CURRENT_DATE + 14, CURRENT_DATE + 21,
      '1. Reschedule UAT sign-off to the following week. 2. Obtain written availability confirmation for rescheduled date. 3. Update project schedule and notify all affected parties.',
      v_user1, CURRENT_DATE + 21,
      NULL,
      'manual',
      v_user1
    )
    ON CONFLICT DO NOTHING;
  ELSE
    RAISE NOTICE 'Delay register skipped (tables exist: %, org exists: %)', v_has_delays, (v_org_id IS NOT NULL);
  END IF; -- v_has_delays + v_org_id

  -- =========================================================================
  -- 7. SCOPE MANAGEMENT PLAN
  -- =========================================================================

  IF NOT v_has_scope_mgmt THEN
    RAISE NOTICE 'scope_management_plans table not found – run v355 migration first. Skipping.';
  ELSE

  INSERT INTO scope_management_plans (
    project_id,
    scope_definition_approach,
    change_control_process,
    scope_validation_method,
    deliverable_acceptance_process,
    roles_responsibilities,
    wbs_maintenance_process,
    scope_baseline_info,
    status, version,
    created_by, approved_by
  ) VALUES (
    v_project_id,
    'Scope is defined through facilitated requirements workshops with key business stakeholders. Outputs include a Business Requirements Document (BRD), a functional specification, and a WBS. All scope items are documented in the project management tool and baselined at the end of Stage 1.',
    'All scope changes must be submitted as a formal Change Request (CR) via the project management portal. CRs are assessed for impact on schedule, cost, and quality by the PM and relevant workstream leads. Changes within project tolerance are approved by the PM. Changes exceeding tolerance thresholds are escalated to the Change Board.',
    'Scope validation is conducted at each stage gate review. The PMO QA Lead verifies that completed deliverables match the baselined scope and acceptance criteria defined in the project scope statement.',
    'Deliverables are accepted through a formal sign-off process. The relevant business owner reviews each deliverable against the acceptance criteria in the Quality Register and provides written approval. Signed acceptance forms are stored in the project document repository.',
    'Project Manager: owns scope baseline and change control process. Business Analyst: facilitates scope definition workshops and maintains BRD. Workstream Leads: responsible for delivery within scoped boundaries. PMO QA Lead: validates deliverables against baselined scope. Steering Committee: approves scope changes exceeding tolerance.',
    'The WBS is maintained in the project scheduling tool and updated by the PM at the start of each sprint planning session. All WBS changes triggered by approved CRs are reflected within 24 hours of Change Board approval.',
    'Scope Baseline v1.0 established on project kickoff date. Includes BRD v2.1, Functional Specification v1.3, and WBS v1.0. Baseline stored in the project document library under /Baselines/Scope.',
    'approved', '1.0',
    v_user1, v_user1
  )
  ON CONFLICT DO NOTHING;

  END IF; -- v_has_scope_mgmt

  -- =========================================================================
  -- 8. SCOPE STATEMENT
  -- =========================================================================

  IF NOT v_has_scope_stmt THEN
    RAISE NOTICE 'scope_statements table not found – run v359 migration first. Skipping.';
  ELSE

  INSERT INTO scope_statements (
    project_id,
    project_description,
    product_scope_description,
    in_scope,
    out_of_scope,
    key_deliverables,
    acceptance_criteria,
    constraints,
    assumptions,
    exclusions,
    status, version,
    created_by, updated_by
  ) VALUES (
    v_project_id,
    'Implementation of an Enterprise Resource Planning (ERP) system to replace legacy Finance, HR, and Supply Chain point solutions. The project covers configuration, integration, data migration, testing, training, and go-live support for all modules across headquarters and two regional offices.',
    'A fully configured, integrated, and production-ready ERP system hosted on the organisation''s private cloud infrastructure, with all legacy data migrated, all staff trained, and all interfaces to approved external systems operational.',
    ARRAY[
      'Finance module: General Ledger, Accounts Payable, Accounts Receivable, multi-currency support',
      'HR module: Employee records, payroll, leave management, onboarding workflows',
      'Supply Chain module: Purchase orders, goods receipt, inventory, supplier management',
      'System integration with existing CRM and banking gateway',
      'Data migration of 8 years of historical Finance and HR records',
      'Role-based user training for all 12 role profiles',
      'Go-live support for 4 weeks post-deployment',
      'Standard operational reporting suite (12 pre-defined reports)'
    ],
    ARRAY[
      'Custom mobile application development',
      'Integration with third-party e-commerce platform (deferred to Phase 2)',
      'Business intelligence and advanced analytics dashboards (deferred to Phase 2)',
      'Project management and time-tracking modules',
      'Customer-facing portal',
      'Data migration of records older than 8 years'
    ],
    ARRAY[
      'System Requirements Specification (SRS) v2.1',
      'Data Migration Plan and Reconciliation Report',
      'Configured and tested ERP system (all three modules)',
      'Integration specifications and working interfaces',
      'User acceptance test results and sign-off report',
      'Training materials (12 role-based guides + e-learning modules)',
      'Go-live readiness report',
      'Operations and support handover documentation'
    ],
    ARRAY[
      'All functional test cases pass with zero critical defects',
      'Data migration reconciliation report shows ≤ 0.1% variance',
      'System performance meets SLA: API response < 2 seconds at 500 concurrent users',
      'Training completion rate ≥ 80% of target users before go-live',
      'Steering Committee unanimously approves go-live readiness report',
      'All integration interfaces validated end-to-end in UAT'
    ],
    ARRAY[
      'Go-live must occur before the start of the new financial year',
      'Infrastructure upgrades must be completed by the infrastructure team before the system build phase',
      'The project budget is fixed at the approved amount; scope must be managed within this constraint',
      'All development must comply with the organisation''s IT security policy and data protection regulations'
    ],
    ARRAY[
      'The organisation''s IT infrastructure team will complete server provisioning within the agreed timeline',
      'Key business stakeholders will be available for workshops and sign-off sessions as scheduled',
      'The ERP vendor will provide support resources as per the signed support agreement',
      'Existing staff have sufficient digital literacy to adopt the new system with the planned training',
      'Regulatory requirements will not change materially during the project duration'
    ],
    ARRAY[
      'Legacy system decommissioning (separate post-implementation project)',
      'Post-go-live enhancements beyond the approved scope',
      'Procurement of end-user hardware or devices'
    ],
    'approved', '1.1',
    v_user1, v_user1
  )
  ON CONFLICT DO NOTHING;

  END IF; -- v_has_scope_stmt

  -- =========================================================================
  -- 9. SCHEDULE MANAGEMENT PLAN
  -- =========================================================================

  IF NOT v_has_sched_mgmt THEN
    RAISE NOTICE 'schedule_management_plans table not found – run v363 migration first. Skipping.';
  ELSE

  INSERT INTO schedule_management_plans (
    project_id,
    scheduling_methodology,
    scheduling_tool,
    level_of_accuracy,
    units_of_measure,
    control_thresholds,
    reporting_formats,
    schedule_model_maintenance,
    variance_thresholds,
    status, version,
    created_by, updated_by
  ) VALUES (
    v_project_id,
    'The project uses a hybrid scheduling approach: a high-level milestone plan governs the overall stage gates, while sprint-level plans (2-week sprints) govern day-to-day delivery. The critical path is maintained in the master schedule and reviewed at each sprint planning session.',
    'MS Project Online for the master schedule and critical path tracking. Jira for sprint-level task boards. Confluence for milestone reporting.',
    'Activity durations estimated to the nearest half-day. Stage-level milestones defined to the nearest working week. Estimates derived using three-point estimation (optimistic / most likely / pessimistic).',
    'Duration in working days. Effort in person-hours. Costs in USD.',
    '{
      "schedule_variance_amber": "5",
      "schedule_variance_red": "10",
      "spi_amber": "0.90",
      "spi_red": "0.80",
      "milestone_slip_amber_days": 5,
      "milestone_slip_red_days": 10
    }'::JSONB,
    'Weekly status report (RAG status, milestone tracker, top 5 risks). Fortnightly steering committee dashboard. Monthly portfolio report to PMO. Sprint retrospective velocity chart.',
    'The PM updates the master schedule every Monday morning before the weekly status report is issued. Sprint task boards are updated daily by workstream leads. Schedule baseline changes triggered by approved change requests are reflected within 24 hours.',
    '{
      "cost_variance_amber_pct": 5,
      "cost_variance_red_pct": 10,
      "schedule_variance_amber_pct": 5,
      "schedule_variance_red_pct": 10,
      "earned_value_reporting": true,
      "spi_threshold_escalation": 0.85
    }'::JSONB,
    'approved', '1.0',
    v_user1, v_user1
  )
  ON CONFLICT DO NOTHING;

  END IF; -- v_has_sched_mgmt

  -- =========================================================================
  -- 10. CHANGE BOARD + CHANGE REQUESTS
  -- =========================================================================

  IF NOT v_has_change THEN
    RAISE NOTICE 'change_board table not found – run v31 migration first. Skipping.';
  ELSE

  -- Re-use existing board for this project if one already exists
  SELECT id INTO v_board_id FROM change_board WHERE project_id = v_project_id AND is_deleted = FALSE LIMIT 1;

  IF v_board_id IS NULL THEN
    v_board_id := gen_random_uuid();
  END IF;

  INSERT INTO change_board (
    id, project_id,
    board_name, board_description, board_level,
    meeting_frequency, quorum_required, approval_threshold_percentage,
    cost_threshold_low, cost_threshold_high, schedule_threshold_days,
    status, established_date,
    notes,
    created_by
  ) VALUES (
    v_board_id, v_project_id,
    'ERP Programme Change Board',
    'Governs all change requests for the ERP Digital Transformation programme. Approves changes within project tolerance and escalates out-of-tolerance items to the Steering Committee.',
    'project',
    'bi-weekly', 3, 66.67,
    5000.00, 50000.00, 5,
    'active', CURRENT_DATE - 30,
    'Change Board convenes every second Tuesday at 10:00. Emergency CRs can be submitted for out-of-cycle email approval with a 24-hour response window.',
    v_user1
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO change_requests (
    project_id, change_board_id,
    change_reference, change_title, change_description,
    change_category, change_type,
    submitted_by, submission_date,
    reason_for_change, current_situation, proposed_solution, alternative_solutions,
    priority, urgency, business_criticality,
    status,
    created_by
  ) VALUES
  (
    v_project_id, v_board_id,
    'CR-001',
    'Extend data migration window by 14 days',
    'The data cleansing effort for legacy Finance records has been significantly underestimated. A 14-day extension to the data migration phase is required.',
    'schedule', 'corrective',
    v_user1, CURRENT_DATE - 2,
    'Legacy data profiling revealed 23,000 duplicate Finance records against an estimate of 5,000, requiring an additional 14 working days of cleansing effort.',
    'Data migration phase is currently scheduled to complete in 12 working days. At the current cleansing rate, 26 working days are required.',
    'Extend the data migration phase by 14 calendar days. Bring in two additional data analysts for the duration. Absorb additional cost within the existing project contingency.',
    'Option A: Reduce migration scope (exclude records older than 5 years). Risk: audit query. Option B: Run parallel cleansing during the build phase. Risk: resource conflict.',
    'high', 'high', 'high',
    'under-assessment',
    v_user1
  ),
  (
    v_project_id, v_board_id,
    'CR-002',
    'Add automated currency rounding compliance test suite',
    'Additional automated test cases are required to cover 8 currency pair edge cases identified in the Finance module rounding defect investigation.',
    'quality', 'corrective',
    v_user3, CURRENT_DATE - 3,
    'Rounding defect ISSUE-002 exposed a gap in test coverage for multi-currency scenarios. 14 additional automated test cases are required.',
    'Finance module currently has 47 automated functional test cases. Currency edge cases are tested manually only.',
    'Develop 14 additional automated test cases covering all 8 currency pairs and rounding thresholds. Integrate into the nightly regression suite.',
    'Option: Continue manual testing. Risk: human error and inconsistency across releases.',
    'high', 'high', 'critical',
    'approved',
    v_user1
  ),
  (
    v_project_id, v_board_id,
    'CR-003',
    'Upgrade integration server hardware to meet performance SLA',
    'Load testing has confirmed the current integration server specification is insufficient to meet the 2-second response SLA at 500 concurrent users.',
    'scope', 'enhancement',
    v_user3, CURRENT_DATE - 1,
    'Infrastructure team''s original server specification was based on an estimate of 200 concurrent users. Actual user load projections have increased to 500 concurrent users.',
    'Integration server CPUs and RAM are running at 94% utilisation during load tests, causing 8-second average response times.',
    'Upgrade the integration server from 8-core/32GB to 16-core/64GB configuration. Estimated hardware cost: USD 18,000.',
    'Option: Implement API caching to reduce server load. Risk: cache invalidation complexity and stale data risk.',
    'critical', 'immediate', 'critical',
    'pending-approval',
    v_user1
  ),
  (
    v_project_id, v_board_id,
    'CR-004',
    'Migrate from legacy API to vendor REST v2 ahead of schedule',
    'The legacy HR system API is scheduled for deprecation in 90 days. Accelerating migration to REST v2 reduces project risk.',
    'technical', 'preventive',
    v_user2, CURRENT_DATE - 5,
    'RISK-002 identified vendor API deprecation as a high-impact threat. Accelerating migration to REST v2 eliminates this risk entirely.',
    'Integration team is currently building against the legacy SOAP API. Migration to REST v2 was planned for Q3 but can be pulled forward.',
    'Reallocate two integration developer weeks to complete REST v2 migration in Sprint 6 rather than Sprint 9. No additional cost; schedule neutral.',
    'Option: Proceed with planned Q3 migration. Risk: if vendor accelerates deprecation, project may be impacted.',
    'medium', 'medium', 'high',
    'approved',
    v_user1
  ),
  (
    v_project_id, v_board_id,
    'CR-005',
    'Add e-learning platform integration to training module',
    'HR business partner requests integration between the ERP onboarding module and the organisation''s LMS to auto-enrol new starters.',
    'scope', 'enhancement',
    v_user2, CURRENT_DATE - 8,
    'New HR directive requires all new starters to complete mandatory e-learning within 7 days of joining. Current ERP implementation does not include LMS integration.',
    'Training materials will be delivered as standalone documents with no tracking. HR will need manual reporting to track completion.',
    'Build a one-way API integration between the ERP HR module and the LMS to auto-enrol new starters and receive completion events. Estimated effort: 5 developer days.',
    'Option: Manual CSV export/import between ERP and LMS. Risk: high admin overhead and lag in compliance data.',
    'medium', 'medium', 'medium',
    'submitted',
    v_user1
  ),
  (
    v_project_id, v_board_id,
    'CR-006',
    'Defer advanced analytics dashboards to Phase 2',
    'Analytics dashboards were provisionally included in scope discussions but never formally baselined. Formally defer to Phase 2 to protect schedule.',
    'scope', 'preventive',
    v_user1, CURRENT_DATE - 15,
    'Scope clarification exercise identified that advanced BI dashboards were discussed in early workshops but are not included in the baselined WBS or BRD.',
    'Ambiguity is creating stakeholder expectation that dashboards will be delivered in this phase, risking scope creep.',
    'Issue a formal scope exclusion notice to all stakeholders confirming analytics dashboards are deferred to Phase 2. Document in scope statement v1.1.',
    'Option: Include dashboards. Risk: 3-week schedule overrun and USD 35,000 additional cost.',
    'low', 'low', 'low',
    'implemented',
    v_user1
  )
  ON CONFLICT DO NOTHING;

  END IF; -- v_has_change

  RAISE NOTICE 'v678 seed data inserted successfully for project %', v_project_id;

END $$;

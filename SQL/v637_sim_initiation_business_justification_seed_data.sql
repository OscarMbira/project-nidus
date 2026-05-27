-- =============================================================================
-- v637_sim_initiation_business_justification_seed_data.sql
-- Simulator parity seed for Initiation & Business Justification section
--   • practice_business_cases
--   • practice_project_briefs
--   • practice_benefits_review_plans
-- Prerequisites: sim.practice_projects, auth.users, v229, v238 applied
-- Idempotent: document_content->>'seed_marker' = 'SEED637'
-- =============================================================================

DO $$
DECLARE
  v_user_id       UUID;
  v_practice_proj UUID;
  v_pb_id         UUID;
  v_bc_id         UUID;
BEGIN
  SELECT pp.user_id, pp.id INTO v_user_id, v_practice_proj
  FROM sim.practice_projects pp
  INNER JOIN auth.users au ON au.id = pp.user_id
  WHERE COALESCE(pp.is_deleted, FALSE) = FALSE
  ORDER BY pp.created_at ASC NULLS LAST
  LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT u.auth_user_id INTO v_user_id
    FROM public.users u
    INNER JOIN auth.users au ON au.id = u.auth_user_id
    WHERE COALESCE(u.is_deleted, FALSE) = FALSE
    ORDER BY u.created_at ASC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'v637: No auth.users row — skip sim initiation seed.';
    RETURN;
  END IF;

  IF v_practice_proj IS NULL THEN
    SELECT pp.id INTO v_practice_proj
    FROM sim.practice_projects pp
    WHERE COALESCE(pp.is_deleted, FALSE) = FALSE
    ORDER BY pp.created_at ASC NULLS LAST
    LIMIT 1;
  END IF;

  DELETE FROM sim.practice_benefits_review_plans
  WHERE plan_title LIKE 'SEED637-%';

  DELETE FROM sim.practice_business_cases
  WHERE document_content->>'seed_marker' = 'SEED637';

  DELETE FROM sim.practice_project_briefs
  WHERE document_content->>'seed_marker' = 'SEED637';

  INSERT INTO sim.practice_project_briefs (
    practice_project_id, brief_title, brief_description, project_definition,
    project_objectives, project_scope, out_of_scope, project_approach,
    target_start_date, target_end_date, is_approved, document_content,
    document_version, user_id, created_by
  ) VALUES (
    v_practice_proj,
    'Practice Project Brief — Digital Service Rollout',
    'Simulator practice brief for initiating a customer-facing digital service.',
    'Deliver a responsive self-service portal integrated to CRM and billing systems.',
    ARRAY[
      'Launch MVP within 9 months',
      'Reduce support tickets by 20%',
      'Achieve CSAT ≥ 4.2/5'
    ],
    'UX redesign, authentication upgrade, self-service billing and case management.',
    'Native mobile apps and legacy back-office replacement (phase 2).',
    'Agile delivery with fortnightly releases; hybrid vendor and in-house squad.',
    CURRENT_DATE + 14, CURRENT_DATE + 270, FALSE,
    '{"seed_marker":"SEED637","reference":"SEED637-PB-001","status":"draft"}'::jsonb,
    1, v_user_id, v_user_id
  ) RETURNING id INTO v_pb_id;

  INSERT INTO sim.practice_business_cases (
    practice_project_id, project_brief_id, case_title, case_description,
    business_justification, expected_benefits, expected_costs, expected_risks,
    options_considered, recommended_option, option_justification,
    estimated_cost, estimated_benefits, net_present_value, return_on_investment, payback_period_months,
    is_approved, document_content, document_version, user_id, created_by
  ) VALUES (
    v_practice_proj, v_pb_id,
    'Practice Business Case — Customer Portal Redesign',
    'Investment case for replacing the ageing customer portal.',
    'Customer satisfaction lags competitors; support volume is 35% above target.',
    'Support cost reduction, improved retention, higher digital adoption.',
    'Development, integration, change management, and ongoing licence costs.',
    'Integration complexity, adoption risk, vendor dependency.',
    '[
      {"option":"do_nothing","title":"Do Nothing","cost":0},
      {"option":"do_minimum","title":"Patch Only","cost":180000},
      {"option":"do_something","title":"Full Redesign","cost":420000,"recommended":true}
    ]'::jsonb,
    'do_something',
    'Full redesign delivers acceptable ROI and meets regulatory customer-experience obligations.',
    420000.00, 680000.00, 210000.00, 16.5, 24,
    FALSE,
    '{"seed_marker":"SEED637","reference":"SEED637-BC-001","status":"submitted"}'::jsonb,
    1, v_user_id, v_user_id
  ) RETURNING id INTO v_bc_id;

  INSERT INTO sim.practice_business_cases (
    practice_project_id, case_title, case_description, business_justification,
    recommended_option, estimated_cost, net_present_value, return_on_investment,
    is_approved, approved_at, document_content, document_version, user_id, created_by
  ) VALUES (
    v_practice_proj,
    'Practice Business Case — Data Warehouse Migration',
    'Analytics modernisation case for governed PMO reporting datasets.',
    'Manual reconciliation consumes 40% of reporting effort; audit noted weak lineage.',
    'do_something', 680000.00, 540000.00, 14.2,
    TRUE, NOW(),
    '{"seed_marker":"SEED637","reference":"SEED637-BC-002","status":"approved"}'::jsonb,
    2, v_user_id, v_user_id
  );

  INSERT INTO sim.practice_benefits_review_plans (
    practice_project_id, practice_business_case_id, plan_title, version_number, plan_date,
    author_user_id, owner_user_id, scope_description, accountability_description,
    measurement_approach, measurement_timing_rationale, resources_description,
    estimated_review_effort_hours, baseline_measures_description,
    performance_review_approach, performance_review_frequency,
    dis_benefits_included, dis_benefits_description, status,
    user_id, created_by
  ) VALUES (
    v_practice_proj, v_bc_id,
    'SEED637-BRP-001 — Practice Benefits Review Plan — Customer Portal',
    '1.0', CURRENT_DATE,
    v_user_id, v_user_id,
    'Operational and customer-experience benefits linked to the portal redesign.',
    'Benefits Owner: Product Director; Measurement Lead: Business Analyst; Assurance: PMO.',
    'Leading indicators (task completion, CSAT) and lagging indicators (support volume, retention).',
    'Monthly during rollout; quarterly for 12 months post go-live.',
    '0.5 FTE Business Analyst, CRM reporting access, survey tooling.',
    120.00,
    'Baseline support volumes and CSAT from the last 6 months of operations data.',
    'Stage-gate reviews at MVP, go-live +90 days, and +12 months.',
    'monthly',
    TRUE, 'Temporary duplicate handling during parallel portal operation.',
    'draft',
    v_user_id, v_user_id
  );

  INSERT INTO sim.practice_benefits_review_plans (
    practice_project_id, plan_title, version_number, plan_date,
    scope_description, measurement_approach, performance_review_frequency,
    performance_review_approach, baseline_measures_description, status,
    user_id, created_by
  ) VALUES (
    v_practice_proj,
    'SEED637-BRP-002 — Practice Benefits Review Plan — Data Warehouse Migration',
    '1.0', CURRENT_DATE - 7,
    'Reporting efficiency, data quality, and portfolio decision-making benefits.',
    'Automated dashboard metrics plus quarterly benefits realisation workshops.',
    'quarterly',
    'Reviews at stage end, project closure, and +6 months post closure.',
    'Baseline hours on manual reconciliation and uncertified datasets in use.',
    'approved',
    v_user_id, v_user_id
  );

  RAISE NOTICE 'v637: Seeded sim initiation documents for practice project %.', v_practice_proj;
END $$;

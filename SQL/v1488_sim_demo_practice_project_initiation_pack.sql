-- ============================================================================
-- v1488: Simulator demo practice project with a full initiation pack (v1344, slice 9)
-- ============================================================================
-- PRD projectprd/v1344_project_setup_forms_fields_audit_seed_PRD.md A8; plan slice 9.
-- Creates one practice project, "Demo practice project — initiation pack", owned by the
-- Account Owner of the organisation that owns the SEED334 demo projects (looked up here:
-- accounts.owner_user_id of SEED334-PRJ-01's account → that user's auth id). No names or
-- emails are written in this file.
-- The project gets a rich Mandate (+ deliverables, dependencies), Project Brief, Business Case,
-- PID and Benefits Review Plan in the sim schema only (Simulator data never goes to public).
-- Status mix (A7): mandate approved, brief approved, business case approved, PID submitted
-- (not yet approved), benefits review plan draft.
-- Display IDs: mandate_reference '' and practice_code NULL, so the existing triggers assign them
-- (rule 16.2). Fixed ids, prefix c1344f1… (checked free). Idempotent: ON CONFLICT (id) DO NOTHING,
-- so a document someone has since edited is left alone. Safe to re-run.
-- Prerequisites: v80, v229, v230, v238, v528, v1447, v1481.
-- ============================================================================

-- The Admin display-ID trigger on sim.practice_business_cases needs this column; it was missing
-- in the live database (see v1489). Adding it here too lets this file run on its own.
ALTER TABLE sim.practice_business_cases
  ADD COLUMN IF NOT EXISTS case_reference VARCHAR(30);

DO $$
DECLARE
  v_owner_auth  uuid;
  v_owner_user  uuid;
  v_project     uuid := 'c1344f10-0000-4000-8000-000000000001';
  v_mandate     uuid := 'c1344f11-0000-4000-8000-000000000001';
  v_brief       uuid := 'c1344f13-0000-4000-8000-000000000001';
  v_case        uuid := 'c1344f14-0000-4000-8000-000000000001';
  v_pid         uuid := 'c1344f15-0000-4000-8000-000000000001';
  v_plan        uuid := 'c1344f16-0000-4000-8000-000000000001';
BEGIN
  v_owner_user := (SELECT a.owner_user_id FROM public.projects p
                   JOIN public.accounts a ON a.id = p.account_id
                   WHERE p.project_code = 'SEED334-PRJ-01' AND COALESCE(p.is_deleted, FALSE) = FALSE
                   LIMIT 1);
  v_owner_auth := (SELECT u.auth_user_id FROM public.users u
                   JOIN auth.users au ON au.id = u.auth_user_id
                   WHERE u.id = v_owner_user LIMIT 1);
  IF v_owner_auth IS NULL THEN
    RAISE NOTICE 'v1488: Account Owner of the SEED334 organisation not found or not signed up — skipped';
    RETURN;
  END IF;

  -- ── Mandate (approved) ────────────────────────────────────────────────────
  INSERT INTO sim.project_mandates (
    id, mandate_reference, mandate_title, document_status, version_number, created_date,
    purpose, authority_responsible, background, is_standalone,
    project_objectives, scope, scope_exclusions, constraints, interfaces,
    quality_expectations, quality_priority, outline_business_case,
    assumptions, outline_risks, proposed_executive_name, proposed_pm_name,
    is_active, is_practice_mode, user_id)
  VALUES (
    v_mandate, '', 'Demo practice project — initiation pack', 'approved', '1.0', CURRENT_DATE - 60,
    'Replace the paper-based field inspection process with a mobile app so inspection results reach the office the same day.',
    'Operations Director, on behalf of the executive committee.',
    'Inspectors complete paper forms that are typed up days later. Errors and delays mean repairs start late and audit evidence is hard to find.',
    TRUE,
    E'Inspection results available in the office the same day\nRe-keying effort removed\nPhoto evidence attached to every failed inspection\nAudit trail for every inspection',
    E'Mobile inspection app for 40 inspectors\nOffice dashboard for supervisors\nIntegration with the asset register\nTraining and roll-out',
    E'Replacement of the asset register\nContractor inspections\nCustomer-facing portal',
    E'Live within 9 months\nBudget not to exceed 250,000\nMust work offline in rural areas',
    E'Asset register (read and update)\nIdentity provider for single sign-on\nDocument store for photos',
    E'App usable by inspectors after half a day of training\nNo inspection data lost when offline\nDashboard figures match the asset register',
    'time',
    'Re-keying costs about 1.5 staff a year and late repairs cost more again. A mobile app is expected to pay back within two years.',
    E'Inspectors keep their current devices\nThe asset register vendor provides an API\nSupervisors are available for testing',
    E'Low adoption by inspectors used to paper\nPoor mobile coverage on remote sites\nAsset register API not ready in time',
    'Operations Director', 'Practice Project Manager',
    TRUE, TRUE, v_owner_auth)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO sim.mandate_deliverables (id, mandate_id, deliverable_name, deliverable_description, is_in_scope, is_major_deliverable, estimated_completion, display_order)
  VALUES
    ('c1344f12-0000-4000-8000-000000000001', v_mandate, 'Mobile inspection app', 'Offline-capable app with photo capture and digital sign-off.', TRUE, TRUE, 'Month 6', 1),
    ('c1344f12-0000-4000-8000-000000000002', v_mandate, 'Supervisor dashboard', 'Daily view of completed, failed and overdue inspections.', TRUE, TRUE, 'Month 7', 2),
    ('c1344f12-0000-4000-8000-000000000003', v_mandate, 'Asset register integration', 'Two-way link so inspections update asset condition.', TRUE, TRUE, 'Month 7', 3),
    ('c1344f12-0000-4000-8000-000000000004', v_mandate, 'Training pack', 'Half-day course, quick guide and video for inspectors.', TRUE, FALSE, 'Month 8', 4),
    ('c1344f12-0000-4000-8000-000000000005', v_mandate, 'Customer portal', 'Out of scope for this project; considered for a later phase.', FALSE, FALSE, NULL, 5)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO sim.mandate_dependencies (id, mandate_id, dependency_type, dependency_description, impact_during_project, impact_after_implementation, dependency_status, display_order, created_by, updated_by)
  VALUES
    ('c1344f12-0000-4000-8000-000000000011', v_mandate, 'external', 'Asset register vendor delivers the update API.', TRUE, FALSE, 'analysed', 1, v_owner_auth, v_owner_auth),
    ('c1344f12-0000-4000-8000-000000000012', v_mandate, 'internal', 'IT security approves offline storage of inspection data on devices.', TRUE, FALSE, 'identified', 2, v_owner_auth, v_owner_auth),
    ('c1344f12-0000-4000-8000-000000000013', v_mandate, 'interdependency', 'Network upgrade project improves coverage on remote sites.', FALSE, TRUE, 'managed', 3, v_owner_auth, v_owner_auth)
  ON CONFLICT (id) DO NOTHING;

  -- ── Practice project ──────────────────────────────────────────────────────
  INSERT INTO sim.practice_projects (id, mandate_id, project_name, project_description, project_status,
                                     start_date, is_practice_mode, user_id)
  VALUES (v_project, v_mandate, 'Demo practice project — initiation pack',
          'Practice project with a complete initiation pack: mandate, brief, business case, PID and benefits review plan.',
          'planning', CURRENT_DATE - 45, TRUE, v_owner_auth)
  ON CONFLICT (id) DO NOTHING;

  -- ── Project Brief (approved) ──────────────────────────────────────────────
  INSERT INTO sim.practice_project_briefs (
    id, practice_project_id, mandate_id, brief_title, brief_description, project_definition,
    project_objectives, project_scope, out_of_scope, project_approach, quality_approach, risk_approach,
    key_milestones, target_start_date, target_end_date, is_approved, approved_at, document_version, user_id, created_by)
  VALUES (
    v_brief, v_project, v_mandate, 'Project Brief — Mobile field inspections',
    'Brief for replacing paper inspections with a mobile app and supervisor dashboard.',
    'A mobile inspection app, supervisor dashboard and asset register link, rolled out to 40 inspectors.',
    ARRAY['Same-day inspection results', 'No re-keying of inspection forms', 'Photo evidence on every failed inspection', 'Full audit trail'],
    'App, dashboard, asset register integration, training and roll-out in three regions.',
    'Asset register replacement, contractor inspections, customer portal.',
    'Buy a configurable inspection product, integrate it in-house, roll out region by region with a pilot first.',
    'Supervisors accept each release against the inspection checklist before it reaches inspectors.',
    'Risk log reviewed fortnightly; vendor API and remote coverage tracked as top risks.',
    '[
      {"name":"Product selected and contract signed","date":"month 1"},
      {"name":"Pilot region live","date":"month 3"},
      {"name":"Pilot review and go / no-go","date":"month 5"},
      {"name":"All regions live","date":"month 8"}
    ]'::jsonb,
    CURRENT_DATE - 30, CURRENT_DATE + 240, TRUE, NOW() - INTERVAL '25 days', 1, v_owner_auth, v_owner_auth)
  ON CONFLICT (id) DO NOTHING;

  -- ── Business Case (approved) ──────────────────────────────────────────────
  INSERT INTO sim.practice_business_cases (
    id, practice_project_id, project_brief_id, case_title, case_description,
    business_justification, expected_benefits, expected_costs, expected_risks,
    options_considered, recommended_option, option_justification,
    estimated_cost, estimated_benefits, net_present_value, return_on_investment, payback_period_months,
    is_approved, approved_at, document_version, user_id, created_by)
  VALUES (
    v_case, v_project, v_brief, 'Business Case — Mobile field inspections',
    'Investment case for a mobile inspection app.',
    'Re-keying and late repairs cost more each year than the app will cost to run. Audit findings need a reliable inspection trail.',
    E'Re-keying effort removed (about 1.5 staff a year)\nRepairs start 5 days sooner on average\nAudit evidence found in minutes, not days',
    E'Product licences\nIntegration work\nDevices for inspectors without one\nTraining and support',
    E'Low adoption\nRemote coverage\nVendor API delay',
    '[
      {"option":"do_nothing","title":"Keep paper forms","cost":0},
      {"option":"do_minimum","title":"Scan forms and store PDFs","cost":60000},
      {"option":"do_something","title":"Mobile inspection app","cost":230000,"recommended":true}
    ]'::jsonb,
    'do_something',
    'Only the mobile app removes re-keying and gives same-day results; scanning keeps the delay.',
    230000.00, 420000.00, 145000.00, 26.0, 22,
    TRUE, NOW() - INTERVAL '20 days', 1, v_owner_auth, v_owner_auth)
  ON CONFLICT (id) DO NOTHING;

  -- ── PID (submitted, awaiting approval) ────────────────────────────────────
  INSERT INTO sim.practice_project_initiation_documents (
    id, practice_project_id, business_case_id, project_brief_id, pid_title, pid_description,
    project_definition, project_objectives, project_scope, exclusions, interfaces,
    project_approach, quality_approach, risk_approach, change_control_approach, communication_approach,
    project_manager_user_id, tolerance_levels, reporting_arrangements, monitoring_and_control,
    project_plan_summary, stage_plan_summary, is_approved, document_version, user_id, created_by, updated_by)
  VALUES (
    v_pid, v_project, v_case, v_brief, 'PID — Mobile field inspections',
    'Project Initiation Document for the mobile field inspection project. Submitted to the board for approval.',
    'Deliver a mobile inspection app, supervisor dashboard and asset register link to 40 inspectors in three regions.',
    ARRAY['Same-day inspection results', 'No re-keying of inspection forms', 'Photo evidence on every failed inspection', 'Full audit trail'],
    'App configuration, dashboard, integration, devices, training and regional roll-out.',
    'Asset register replacement, contractor inspections, customer portal.',
    ARRAY['Asset register', 'Identity provider (single sign-on)', 'Document store for photos'],
    'Pilot in one region for six weeks, then roll out to the other two regions one month apart.',
    'Supervisors test each release against the inspection checklist; the pilot must reach 95% complete records before roll-out.',
    'Risks reviewed fortnightly by the project manager and monthly by the board; owners named for every high risk.',
    'Changes go through a change log; the project manager approves within tolerance, the board above it.',
    'Fortnightly newsletter to inspectors, monthly board report, and a pilot feedback channel.',
    v_owner_auth,
    '{"time":"2 weeks","cost":"10%","scope":"Training pack may be simplified","quality":"95% complete records"}'::jsonb,
    'Highlight report every two weeks; end stage report at the end of the pilot; exception report when a tolerance is forecast to be exceeded.',
    'Weekly team checkpoint, fortnightly highlight report, stage-end review by the board.',
    '{"summary":"Three stages: initiation (1 month), pilot (3 months), roll-out (4 months)."}'::jsonb,
    '{"summary":"Initiation: confirm product, sign contracts, set up test devices and pilot region."}'::jsonb,
    FALSE, 1, v_owner_auth, v_owner_auth, v_owner_auth)
  ON CONFLICT (id) DO NOTHING;

  -- ── Benefits Review Plan (draft) ──────────────────────────────────────────
  INSERT INTO sim.practice_benefits_review_plans (
    id, practice_project_id, practice_business_case_id, plan_title, version_number, plan_date,
    author_user_id, owner_user_id, scope_description, accountability_description,
    measurement_approach, measurement_timing_rationale, resources_description,
    estimated_review_effort_hours, baseline_measures_description,
    performance_review_approach, performance_review_frequency,
    dis_benefits_included, dis_benefits_description, status, user_id, created_by)
  VALUES (
    v_plan, v_project, v_case, 'Benefits Review Plan — Mobile field inspections', '1.0', CURRENT_DATE - 10,
    v_owner_auth, v_owner_auth,
    E'Benefits in scope of this review plan:\n- Re-keying effort removed\n- Repairs start sooner\n- Faster audit evidence',
    'The Operations Director owns the benefits; regional supervisors report the figures; the project manager supports until handover.',
    E'Re-keying effort: staff hours spent typing forms\nRepair start: days from failed inspection to work order\nAudit evidence: time to find an inspection record',
    'Measured three months after each region goes live, so results reflect normal working.',
    'Supervisor time for monthly figures; business analyst for the quarterly review.',
    40.00,
    'Baseline from the last three months of paper inspections in each region.',
    'Results compared with baseline and target at each review; gaps get an owner and an action.',
    'quarterly',
    TRUE, 'Short-term drop in inspections per day while inspectors learn the app.',
    'draft', v_owner_auth, v_owner_auth)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Check
SELECT pp.practice_code, pp.project_name,
       m.mandate_reference, m.document_status AS mandate_status,
       (SELECT count(*) FROM sim.mandate_deliverables d WHERE d.mandate_id = m.id) AS deliverables,
       (SELECT count(*) FROM sim.mandate_dependencies d WHERE d.mandate_id = m.id) AS dependencies,
       (SELECT count(*) FROM sim.practice_project_briefs b WHERE b.practice_project_id = pp.id) AS briefs,
       (SELECT count(*) FROM sim.practice_business_cases c WHERE c.practice_project_id = pp.id) AS business_cases,
       (SELECT count(*) FROM sim.practice_project_initiation_documents d WHERE d.practice_project_id = pp.id) AS pids,
       (SELECT count(*) FROM sim.practice_benefits_review_plans b WHERE b.practice_project_id = pp.id) AS review_plans
FROM sim.practice_projects pp
LEFT JOIN sim.project_mandates m ON m.id = pp.mandate_id
WHERE pp.id = 'c1344f10-0000-4000-8000-000000000001';

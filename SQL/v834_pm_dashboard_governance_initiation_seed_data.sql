-- =============================================================================
-- v834: Demo seed data for the PM Dashboard "Governance Reference" and
-- "Initiation Documents" nav panels, for every project.
-- Plan: projectplan/v837_pm_dashboard_governance_initiation_seed_plan.md
-- Companion seed file per CLAUDE.md rule 18.2 — explicit user request, not
-- auto-inserted.
--
-- Scope: public schema only. Both the Platform PM Dashboard
-- (apps/platform/src/pages/pm/PMDashboard.jsx) and the Simulator app's own
-- /pm/dashboard (apps/simulator/src/pages/pm/PMDashboard.jsx) render these two
-- panels from the identical public-schema tables keyed by the identical
-- projects.id — confirmed by reading both files — so one seed pass here covers
-- both apps. sim.practice_* is a separate "Practice" flow with a different
-- dashboard (no Governance/Initiation panels) and is intentionally untouched.
--
-- Idempotent: for the five tables with a UNIQUE project_id (one document per
-- project by design) we rely on ON CONFLICT (project_id) DO NOTHING. For the
-- two tables without a unique project_id (business_cases, benefits_review_plans
-- can exist pre-project or span a programme) each row's id is a deterministic
-- uuid_generate_v5(project_id, 'v834-<tag>'), inserted with
-- ON CONFLICT (id) DO NOTHING — same technique as v819/v829.
--
-- Reference numbers (rms_reference, qms_reference, cms_reference) are inserted
-- as '' so the AFTER INSERT admin display-ID trigger (v756b /
-- trg_apply_admin_display_id → admin.generate_display_id) assigns sequential
-- IDs (RMS-YYYY-NNN / QMS-YYYY-NNN / CMS-YYYY-NNN). Do NOT hand-mint
-- project-UUID hex suffixes — that skips the admin trigger and violates the
-- Admin ID Generation rules (fixed in v838).
--
-- Each category runs in its own BEGIN/EXCEPTION so one failing category can
-- never block the rest (v819's isolation pattern). Outcomes are logged to a
-- temp table and SELECTed at the end, because the Supabase SQL Editor Results
-- panel does not surface RAISE NOTICE/WARNING output.
-- =============================================================================

CREATE TEMP TABLE IF NOT EXISTS v834_seed_log (
  project_name TEXT,
  category TEXT,
  outcome TEXT,
  detail TEXT
);

DO $$
DECLARE
  proj RECORD;
  seed_user_id UUID;
BEGIN
  FOR proj IN SELECT id, project_name FROM projects WHERE is_deleted = FALSE LOOP

    SELECT COALESCE(
      proj_lookup.project_manager_user_id,
      proj_lookup.owner_user_id,
      (SELECT up.user_id FROM user_projects up
         WHERE up.project_id = proj.id AND up.is_deleted = FALSE
         ORDER BY CASE up.access_level WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END
         LIMIT 1),
      (SELECT u.id FROM users u WHERE u.is_active = TRUE AND u.is_deleted = FALSE LIMIT 1)
    )
    INTO seed_user_id
    FROM projects proj_lookup
    WHERE proj_lookup.id = proj.id;

    IF seed_user_id IS NULL THEN
      INSERT INTO v834_seed_log VALUES (proj.project_name, 'ALL', 'SKIPPED', 'no resolvable seed user for this project');
      CONTINUE;
    END IF;

    -- Governance Reference: Risk Management Strategy -----------------------
    BEGIN
      INSERT INTO risk_management_strategies (
        project_id, rms_reference, author_id, owner_id, purpose, objectives, scope,
        risk_identification_approach, risk_assessment_approach, risk_response_approach,
        risk_monitoring_approach, status, approved_date, approved_by, created_by
      )
      VALUES (
        proj.id,
        '', -- filled by trg_risk_management_strategies_admin_display_id
        seed_user_id, seed_user_id,
        'Defines how risks are identified, assessed and controlled for ' || proj.project_name || '.',
        'Identify, assess and respond to risk in a timely, proportionate way so that threats are minimised and opportunities are captured across the life of ' || proj.project_name || '.',
        'Covers all risk management activity for ' || proj.project_name || ', from identification through to closure, at project and stage level.',
        'Risks are identified via workshops, checklists and reviews at each stage boundary and logged in the Risk Register.',
        'Risks are assessed for probability and impact using the project''s standard 1-5 scale and prioritised on the risk matrix.',
        'Responses are selected from avoid, reduce, transfer, accept and share, with owners and actions tracked to closure.',
        'Risk status is reviewed at each checkpoint and highlight report, with escalation to the Project Board on tolerance breach.',
        'approved', CURRENT_DATE - 10, seed_user_id, seed_user_id
      )
      ON CONFLICT (project_id) DO NOTHING;
      INSERT INTO v834_seed_log VALUES (proj.project_name, 'risk_management_strategies', 'OK', '1 row attempted');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO v834_seed_log VALUES (proj.project_name, 'risk_management_strategies', 'FAILED', SQLERRM);
    END;

    -- Governance Reference: Quality Management Strategy ---------------------
    BEGIN
      INSERT INTO quality_management_strategies (
        project_id, qms_reference, author_id, owner_id, purpose, objectives, scope,
        quality_planning_approach, quality_control_approach, quality_assurance_approach,
        status, approved_date, approved_by, created_by
      )
      VALUES (
        proj.id,
        '', -- filled by trg_quality_management_strategies_admin_display_id
        seed_user_id, seed_user_id,
        'To define how the required quality of ' || proj.project_name || '''s products will be achieved.',
        'Ensure every product meets its agreed acceptance criteria and quality expectations, with defects caught before handover.',
        'Covers quality planning, control and assurance for all major products of ' || proj.project_name || '.',
        'Quality criteria and methods are defined per product in the Quality Register during planning.',
        'Products are checked against acceptance criteria via reviews and testing before being marked complete, recorded in the Quality Register.',
        'Independent quality assurance reviews are carried out at stage boundaries to confirm the quality approach itself is being followed.',
        'approved', CURRENT_DATE - 10, seed_user_id, seed_user_id
      )
      ON CONFLICT (project_id) DO NOTHING;
      INSERT INTO v834_seed_log VALUES (proj.project_name, 'quality_management_strategies', 'OK', '1 row attempted');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO v834_seed_log VALUES (proj.project_name, 'quality_management_strategies', 'FAILED', SQLERRM);
    END;

    -- Governance Reference: Communication Management Strategy ---------------
    BEGIN
      INSERT INTO communication_management_strategies (
        project_id, cms_reference, author_id, owner_id, purpose, objectives, scope,
        communication_planning_approach, communication_control_approach, communication_assurance_approach,
        status, approved_date, approved_by, created_by
      )
      VALUES (
        proj.id,
        '', -- filled by trg_communication_management_strategies_admin_display_id
        seed_user_id, seed_user_id,
        'To define how information will be communicated to and from stakeholders throughout ' || proj.project_name || '.',
        'Keep stakeholders informed at the right frequency and level of detail to support timely decisions.',
        'Covers all planned communication between the project and its stakeholders for ' || proj.project_name || '.',
        'Stakeholder communication needs are captured during Starting Up and reviewed at each stage boundary.',
        'Reports and updates are issued on the schedule agreed with each stakeholder group and tracked for delivery.',
        'Communication effectiveness is reviewed at checkpoints, with the approach adjusted if stakeholders report gaps.',
        'approved', CURRENT_DATE - 10, seed_user_id, seed_user_id
      )
      ON CONFLICT (project_id) DO NOTHING;
      INSERT INTO v834_seed_log VALUES (proj.project_name, 'communication_management_strategies', 'OK', '1 row attempted');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO v834_seed_log VALUES (proj.project_name, 'communication_management_strategies', 'FAILED', SQLERRM);
    END;

    -- Initiation Documents: Business Case ------------------------------------
    BEGIN
      INSERT INTO business_cases (
        id, project_id, case_title, executive_summary, strategic_alignment,
        reasons_for_project, problem_statement, recommended_option, option_justification,
        timescale_description, start_date, end_date,
        estimated_development_cost, estimated_ongoing_cost, funding_source,
        npv, roi_percentage, payback_period_months, discount_rate,
        major_risks, overall_risk_rating, document_status, created_by
      )
      VALUES (
        uuid_generate_v5(proj.id, 'v834-business-case'), proj.id,
        'Business Case — ' || proj.project_name,
        'Summarises the justification for investing in ' || proj.project_name || ', the expected benefits and the recommended way forward.',
        'Directly supports the organisation''s current strategic priorities for digital delivery and operational improvement.',
        'Current ways of working are inefficient and do not scale, creating cost and risk that ' || proj.project_name || ' is intended to remove.',
        'Without investment, the organisation continues to carry avoidable manual effort, cost and risk that ' || proj.project_name || ' is designed to address.',
        'do_something',
        'The do-something option delivers the required benefits within an acceptable cost and risk profile; doing nothing or doing the minimum leaves the core problem unresolved.',
        'Delivery is planned across initiation, delivery stages and closure, targeting completion within the financial year.',
        CURRENT_DATE - 30, CURRENT_DATE + 180,
        150000 + (abs(hashtext(proj.id::text)) % 100000),
        20000 + (abs(hashtext(proj.id::text || '-dev')) % 20000),
        'Approved capital budget',
        75000, 18.5, 14, 0.08,
        'Delivery delay, resource availability and scope creep are the principal risks, tracked via the Risk Register.',
        'medium', 'approved', seed_user_id
      )
      ON CONFLICT (id) DO NOTHING;
      INSERT INTO v834_seed_log VALUES (proj.project_name, 'business_cases', 'OK', '1 row attempted');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO v834_seed_log VALUES (proj.project_name, 'business_cases', 'FAILED', SQLERRM);
    END;

    -- Initiation Documents: Project Brief -------------------------------------
    BEGIN
      INSERT INTO project_briefs (
        project_id, author_id, owner_id,
        background, project_objectives, desired_outcomes, project_scope, scope_exclusions,
        constraints, assumptions, users_and_interested_parties,
        outline_business_case_summary, business_option_selected,
        product_description, customer_quality_expectations,
        project_approach_description, solution_type, delivery_approach, development_approach,
        team_structure_description, document_status, approved_date, approved_by, created_by
      )
      VALUES (
        proj.id, seed_user_id, seed_user_id,
        'Expands on the approved mandate for ' || proj.project_name || ', giving the full context needed to authorise the project.',
        'Deliver the agreed scope of ' || proj.project_name || ' on time, within budget, and to the agreed quality criteria.',
        'A working solution accepted by users, with measurable improvement over the current way of working.',
        'Design, build, test and handover of the agreed products for ' || proj.project_name || '.',
        'Excludes any changes to systems or processes outside the agreed project boundary.',
        'Delivery is constrained by the approved budget, the agreed end date, and available specialist resource.',
        'Assumes continued organisational support, stable requirements once baselined, and timely stakeholder decisions.',
        'Project Board, project team, end users and impacted operational teams.',
        'Investment is justified by the reduction in manual effort and risk set out in the Business Case.',
        'do_something',
        'A solution meeting the agreed acceptance criteria, delivered in line with the Project Product Description.',
        'Products must meet the acceptance criteria agreed with the customer before being signed off.',
        'Delivered in stages with checkpoint reporting, following the organisation''s standard delivery approach.',
        'bespoke', 'in_house', 'new_design',
        'A Project Manager leads a cross-functional team reporting to the Project Board.',
        'approved', CURRENT_DATE - 20, seed_user_id, seed_user_id
      )
      ON CONFLICT (project_id) DO NOTHING;
      INSERT INTO v834_seed_log VALUES (proj.project_name, 'project_briefs', 'OK', '1 row attempted');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO v834_seed_log VALUES (proj.project_name, 'project_briefs', 'FAILED', SQLERRM);
    END;

    -- Initiation Documents: Project Initiation Document (PID) ---------------
    BEGIN
      INSERT INTO project_initiation_documents (
        project_id, business_case_id, project_brief_id,
        pid_title, pid_description, project_definition, project_objectives,
        project_scope, exclusions,
        project_approach, quality_approach, risk_approach, change_control_approach, communication_approach,
        executive_user_id, project_manager_user_id,
        is_approved, approved_by, approved_at, created_by
      )
      VALUES (
        proj.id,
        (SELECT id FROM business_cases WHERE id = uuid_generate_v5(proj.id, 'v834-business-case')),
        (SELECT id FROM project_briefs WHERE project_id = proj.id),
        'Project Initiation Document — ' || proj.project_name,
        'Brings together the Business Case, Project Brief and plans to define how ' || proj.project_name || ' will be managed and controlled.',
        'Delivers the agreed scope of ' || proj.project_name || ' to the acceptance criteria set out in the Project Brief.',
        ARRAY[
          'Deliver on time and within the approved budget',
          'Meet the agreed quality and acceptance criteria',
          'Realise the benefits set out in the Business Case'
        ],
        'Design, build, test and handover of the agreed products for ' || proj.project_name || '.',
        'Any work outside the agreed project boundary and out-of-scope systems.',
        'Delivered in managed stages with checkpoint and highlight reporting to the Project Board.',
        'Quality control and assurance as defined in the Quality Management Strategy.',
        'Risk identification, assessment and response as defined in the Risk Management Strategy.',
        'Changes are logged, assessed for impact and approved by the Project Board before implementation.',
        'Stakeholders are kept informed as defined in the Communication Management Strategy.',
        seed_user_id, seed_user_id,
        TRUE, seed_user_id, NOW(), seed_user_id
      )
      ON CONFLICT (project_id) DO NOTHING;
      INSERT INTO v834_seed_log VALUES (proj.project_name, 'project_initiation_documents', 'OK', '1 row attempted');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO v834_seed_log VALUES (proj.project_name, 'project_initiation_documents', 'FAILED', SQLERRM);
    END;

    -- Initiation Documents: Benefits Review Plan -----------------------------
    BEGIN
      INSERT INTO benefits_review_plans (
        id, project_id, business_case_id, plan_title, author_user_id, owner_user_id,
        scope_description, accountability_description,
        measurement_approach, measurement_timing_rationale,
        resources_description, baseline_measures_description, baseline_recording_date,
        performance_review_approach, performance_review_frequency,
        status
      )
      VALUES (
        uuid_generate_v5(proj.id, 'v834-benefits-review-plan'), proj.id,
        uuid_generate_v5(proj.id, 'v834-business-case'),
        'Benefits Review Plan — ' || proj.project_name,
        seed_user_id, seed_user_id,
        'Covers measurement of the benefits identified in the Business Case for ' || proj.project_name || '.',
        'The Senior User is accountable for confirming benefits are realised, supported by the Project Manager during transition.',
        'Benefits are measured against the baseline using operational reporting and stakeholder feedback.',
        'Reviews are timed to allow the new way of working to bed in before results are measured.',
        'Review effort is provided by the operational team, coordinated by the Project Manager.',
        'Baseline figures are captured from current operational data before go-live.',
        CURRENT_DATE - 30,
        'Actual performance is compared against baseline and target at each review point, with variance explained.',
        'quarterly', 'approved'
      )
      ON CONFLICT (id) DO NOTHING;
      INSERT INTO v834_seed_log VALUES (proj.project_name, 'benefits_review_plans', 'OK', '1 row attempted');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO v834_seed_log VALUES (proj.project_name, 'benefits_review_plans', 'FAILED', SQLERRM);
    END;

  END LOOP;
END $$;

-- This SELECT is what actually shows up in the Results grid — look for any
-- 'FAILED' rows and share the whole grid (or just the FAILED rows) back.
SELECT * FROM v834_seed_log ORDER BY project_name, category;

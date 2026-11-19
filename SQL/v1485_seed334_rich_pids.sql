-- ============================================================================
-- v1485: Rich Project Initiation Documents for SEED334-PRJ-01…10 (v1344, slice 5 seed)
-- ============================================================================
-- PRD projectprd/v1344_project_setup_forms_fields_audit_seed_PRD.md D6, A6, A7.
-- v834 created one generic PID per project. For the ten demo projects the PID is enriched only
-- while its description is still v834's generic text (a PID someone has worked on is left
-- alone); a project with no PID gets one. Sections are built from the project's mandate
-- (v1436 / v1482) plus per-project approach text, and the child sections are filled when empty:
-- three objectives, two interfaces, two dependencies, three tolerances (time, cost, quality) and
-- two reporting arrangements (highlight, end stage). Status mix (A7): approved (01–05, 08, 09),
-- draft (06), under_review (07, 10). Fixed child ids (prefix c1344d0…). Idempotent.
-- Prerequisites: v214 (PID enhancement), v1482.
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  v_pid uuid;
BEGIN
  FOR r IN
    SELECT v.*, p.id AS project_id, p.project_name, COALESCE(p.project_manager_user_id, p.owner_user_id) AS author,
           m.purpose AS m_purpose, m.background AS m_background, m.outline_business_case AS m_case,
           ARRAY(SELECT btrim(x) FROM unnest(CASE WHEN m.project_objectives LIKE '[%'
                   THEN ARRAY(SELECT jsonb_array_elements_text(m.project_objectives::jsonb))
                   ELSE string_to_array(COALESCE(m.project_objectives, ''), chr(10)) END) x WHERE btrim(x) <> '') AS m_objectives,
           ARRAY(SELECT btrim(x) FROM unnest(CASE WHEN m.interfaces LIKE '[%'
                   THEN ARRAY(SELECT jsonb_array_elements_text(m.interfaces::jsonb))
                   ELSE string_to_array(COALESCE(m.interfaces, ''), chr(10)) END) x WHERE btrim(x) <> '') AS m_interfaces,
           CASE WHEN m.scope LIKE '[%' THEN (SELECT string_agg(x, chr(10)) FROM jsonb_array_elements_text(m.scope::jsonb) x) ELSE m.scope END AS m_scope,
           CASE WHEN m.scope_exclusions LIKE '[%' THEN (SELECT string_agg(x, chr(10)) FROM jsonb_array_elements_text(m.scope_exclusions::jsonb) x) ELSE m.scope_exclusions END AS m_exclusions
    FROM (VALUES
      (1, 'SEED334-PRJ-01', 'approved', 'Three stages (tokenisation, segmentation, evidence), each closed by a QSA pre-check.', 'Weekly highlight report to the Board Risk Committee sponsor.'),
      (2, 'SEED334-PRJ-02', 'approved', 'Agile sprints of two weeks; two-depot pilot before national rollout.', 'Fortnightly sprint review with the Operations Director.'),
      (3, 'SEED334-PRJ-03', 'approved', 'Twelve-site pilot, then regional rollout once forecast accuracy is proven.', 'Monthly highlight report to the Head of Renewable Assets.'),
      (4, 'SEED334-PRJ-04', 'approved', 'Clinic-by-clinic rollout, each with a two-week bedding-in period and clinical safety sign-off.', 'Weekly report to the Chief Medical Officer during rollout.'),
      (5, 'SEED334-PRJ-05', 'approved', 'Two mock migrations and a one-month parallel run before the cutover weekend.', 'Weekly steering committee chaired by the CFO.'),
      (6, 'SEED334-PRJ-06', 'draft', 'Partner migration in waves, lowest-risk partner first.', 'Fortnightly report to the CTO.'),
      (7, 'SEED334-PRJ-07', 'under_review', 'School-by-school rollout timed around term dates.', 'Monthly report to the trust board.'),
      (8, 'SEED334-PRJ-08', 'approved', 'Ten-week pilot at two depots, then a rollout decision.', 'Weekly highlight report to the Network Operations Director.'),
      (9, 'SEED334-PRJ-09', 'approved', 'Automate one alert family at a time with a supervised trial week each.', 'Weekly report to the CISO; monthly to the executive.'),
      (10, 'SEED334-PRJ-10', 'under_review', 'Release by claim type, starting with motor glass claims.', 'Fortnightly report to the COO and monthly to the regulator liaison.')
    ) AS v(idx, project_code, status, approach, reporting)
    JOIN public.projects p ON p.project_code = v.project_code AND COALESCE(p.is_deleted, FALSE) = FALSE
    LEFT JOIN public.project_mandates m ON m.project_id = p.id AND COALESCE(m.is_deleted, FALSE) = FALSE
  LOOP
    v_pid := (SELECT d.id FROM public.project_initiation_documents d WHERE d.project_id = r.project_id AND COALESCE(d.is_deleted, FALSE) = FALSE LIMIT 1);

    IF v_pid IS NULL THEN
      v_pid := ('c1344d01-0000-4000-8000-' || lpad(r.idx::text, 12, '0'))::uuid;
      INSERT INTO public.project_initiation_documents (id, project_id, pid_title, created_by)
      VALUES (v_pid, r.project_id, 'Project Initiation Document — ' || r.project_name, r.author)
      ON CONFLICT DO NOTHING;
      v_pid := (SELECT d.id FROM public.project_initiation_documents d WHERE d.project_id = r.project_id LIMIT 1);
    END IF;

    UPDATE public.project_initiation_documents d SET
      pid_description = 'How ' || r.project_name || ' will be directed, managed and controlled, built on the approved business case and brief.',
      project_background = COALESCE(r.m_background, d.project_background),
      project_justification = COALESCE(r.m_case, d.project_justification),
      project_definition = COALESCE(r.m_purpose, d.project_definition),
      project_objectives = CASE WHEN cardinality(r.m_objectives) > 0 THEN r.m_objectives ELSE d.project_objectives END,
      project_scope = COALESCE(r.m_scope, d.project_scope),
      exclusions = COALESCE(r.m_exclusions, d.exclusions),
      project_approach = r.approach,
      quality_approach = 'Quality criteria and reviews follow the Quality Management Strategy; each product is signed off by its named reviewer.',
      risk_approach = 'Risks are logged in the Risk Register, reviewed weekly and escalated when they threaten stage tolerances.',
      change_control_approach = 'Changes go through the Change Register; the Project Board approves anything outside stage tolerance.',
      communication_approach = 'Stakeholders are kept informed as set out in the Communication Management Strategy.',
      control_mechanisms = 'Stage plans, checkpoint reports, highlight reports, tolerances and exception reports.',
      monitoring_and_control = r.reporting,
      stage_boundary_reviews = 'An end-stage report and next stage plan go to the Project Board at each stage boundary.',
      timeline_summary = 'Initiation, delivery stages and closure over about nine months.',
      project_plan_summary = to_jsonb('Stages and major products follow the milestones in the project''s Milestones register.'::text),
      stage_plan_summary = to_jsonb('The current stage delivers the first major products named in the mandate.'::text),
      budget_summary = 'Funded from the approved capital budget; see the Business Case for costs and appraisal.',
      status = r.status,
      is_approved = (r.status = 'approved'),
      updated_at = NOW()
    WHERE d.id = v_pid
      AND (d.pid_description IS NULL OR d.pid_description LIKE 'Brings together the Business Case, Project Brief and plans%');

    IF NOT EXISTS (SELECT 1 FROM public.pid_objectives o WHERE o.pid_id = v_pid) AND cardinality(r.m_objectives) > 0 THEN
      INSERT INTO public.pid_objectives (id, pid_id, objective_number, objective_title, objective_description, objective_category, priority, success_criteria, display_order, created_by)
      SELECT ('c1344d02-0000-4000-8000-' || lpad((r.idx * 10 + o.n)::text, 12, '0'))::uuid, v_pid, o.n::int,
             left(o.txt, 200), o.txt, 'business', CASE WHEN o.n = 1 THEN 'must_have' ELSE 'should_have' END,
             'Measured against the baseline at the end-stage review.', o.n::int, r.author
      FROM unnest(r.m_objectives[1:3]) WITH ORDINALITY AS o(txt, n)
      ON CONFLICT (id) DO NOTHING;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.pid_interfaces i WHERE i.pid_id = v_pid) AND cardinality(r.m_interfaces) > 0 THEN
      INSERT INTO public.pid_interfaces (id, pid_id, interface_type, interface_name, interface_description, management_arrangement, display_order, created_by)
      SELECT ('c1344d03-0000-4000-8000-' || lpad((r.idx * 10 + i.n)::text, 12, '0'))::uuid, v_pid, 'system',
             left(i.txt, 200), 'The project must connect with ' || i.txt || '.', 'Agreed interface specification and joint testing.', i.n::int, r.author
      FROM unnest(r.m_interfaces[1:2]) WITH ORDINALITY AS i(txt, n)
      ON CONFLICT (id) DO NOTHING;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.pid_dependencies x WHERE x.pid_id = v_pid) THEN
      INSERT INTO public.pid_dependencies (id, pid_id, dependency_type, dependency_name, dependency_description, dependency_owner, dependency_status, mitigation_plan, expected_date, display_order, created_by)
      VALUES
        (('c1344d04-0000-4000-8000-' || lpad((r.idx * 10 + 1)::text, 12, '0'))::uuid, v_pid, 'internal', 'Specialist staff release',
         'Business specialists released for design and testing.', 'Project Executive', 'satisfied', 'Named backups agreed with line managers.', CURRENT_DATE - 20, 1, r.author),
        (('c1344d04-0000-4000-8000-' || lpad((r.idx * 10 + 2)::text, 12, '0'))::uuid, v_pid, 'external', 'Supplier delivery',
         'Main supplier delivers its components on the agreed dates.', 'Project Manager', CASE WHEN r.idx IN (2, 6) THEN 'at_risk' ELSE 'pending' END,
         'Weekly supplier checkpoint; contract has delay remedies.', CURRENT_DATE + 45, 2, r.author)
      ON CONFLICT (id) DO NOTHING;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.pid_tolerances t WHERE t.pid_id = v_pid) THEN
      INSERT INTO public.pid_tolerances (id, pid_id, tolerance_type, tolerance_description, tolerance_level, exception_process, display_order, created_by)
      VALUES
        (('c1344d05-0000-4000-8000-' || lpad((r.idx * 10 + 1)::text, 12, '0'))::uuid, v_pid, 'time', 'Project end date', '+/- 2 weeks', 'Exception report to the Project Board', 1, r.author),
        (('c1344d05-0000-4000-8000-' || lpad((r.idx * 10 + 2)::text, 12, '0'))::uuid, v_pid, 'cost', 'Total project budget', '+/- 5%', 'Exception report to the Project Board', 2, r.author),
        (('c1344d05-0000-4000-8000-' || lpad((r.idx * 10 + 3)::text, 12, '0'))::uuid, v_pid, 'quality', 'Products meet their acceptance criteria', 'No critical defects at release', 'Release held until fixed', 3, r.author)
      ON CONFLICT (id) DO NOTHING;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.pid_reporting_arrangements a WHERE a.pid_id = v_pid) THEN
      INSERT INTO public.pid_reporting_arrangements (id, pid_id, report_type, report_frequency, report_recipients, report_format, report_owner, report_description, display_order, created_by)
      VALUES
        (('c1344d06-0000-4000-8000-' || lpad((r.idx * 10 + 1)::text, 12, '0'))::uuid, v_pid, 'highlight_report', 'Weekly', 'Project Board', 'written', r.author, r.reporting, 1, r.author),
        (('c1344d06-0000-4000-8000-' || lpad((r.idx * 10 + 2)::text, 12, '0'))::uuid, v_pid, 'end_stage_report', 'At each stage boundary', 'Project Board', 'written', r.author, 'Stage results and the next stage plan.', 2, r.author)
      ON CONFLICT (id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- Check
SELECT p.project_code, d.status, d.is_approved,
       (SELECT count(*) FROM public.pid_objectives o WHERE o.pid_id = d.id) AS objectives,
       (SELECT count(*) FROM public.pid_interfaces i WHERE i.pid_id = d.id) AS interfaces,
       (SELECT count(*) FROM public.pid_dependencies x WHERE x.pid_id = d.id) AS dependencies,
       (SELECT count(*) FROM public.pid_tolerances t WHERE t.pid_id = d.id) AS tolerances,
       (SELECT count(*) FROM public.pid_reporting_arrangements a WHERE a.pid_id = d.id) AS reporting
FROM public.projects p
LEFT JOIN public.project_initiation_documents d ON d.project_id = p.id AND COALESCE(d.is_deleted, FALSE) = FALSE
WHERE p.project_code LIKE 'SEED334-PRJ-%' AND p.project_code <= 'SEED334-PRJ-10'
ORDER BY p.project_code;

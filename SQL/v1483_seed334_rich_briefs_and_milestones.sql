-- ============================================================================
-- v1483: Rich Project Briefs / Charters + milestones for SEED334-PRJ-01…10 (v1344, slice 3 seed)
-- ============================================================================
-- PRD projectprd/v1344_project_setup_forms_fields_audit_seed_PRD.md D6, A5, A6, A7.
-- PRJ-08 already has a rich brief (v1436). For the other nine, the brief expands the project's
-- mandate (v1482): background, objectives, scope, exclusions, constraints, assumptions, outline
-- case, deliverables and quality come from the mandate; outcomes, parties, approach and team are
-- added here. v834 created a thin brief for every project: a field is replaced only while it is
-- still empty or still v834's generic text, so edits people made are kept. A project with no
-- brief gets one (brief_reference blank — the reference trigger assigns it, one INSERT per row).
-- Status mix (A7): approved (01, 02, 03, 04, 05, 07, 09), draft (06), under_review (10).
-- Milestones (A5): the brief shows the Milestones register, so each of the ten projects gets
-- four milestones when its register is empty (fixed ids, prefix c1344b0…).
-- Prerequisites: v163, v834 (optional), v966w (milestones), v1482.
-- ============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT v.*, p.id AS project_id, p.project_name,
           COALESCE(p.project_manager_user_id, p.owner_user_id) AS author,
           m.background AS m_background, m.outline_business_case AS m_case,
           (SELECT string_agg(x, E'\n') FROM jsonb_array_elements_text(CASE WHEN m.project_objectives LIKE '[%' THEN m.project_objectives::jsonb ELSE '[]'::jsonb END) x) AS m_objectives,
           (SELECT string_agg(x, E'\n') FROM jsonb_array_elements_text(CASE WHEN m.scope LIKE '[%' THEN m.scope::jsonb ELSE '[]'::jsonb END) x) AS m_scope,
           (SELECT string_agg(x, E'\n') FROM jsonb_array_elements_text(CASE WHEN m.scope_exclusions LIKE '[%' THEN m.scope_exclusions::jsonb ELSE '[]'::jsonb END) x) AS m_exclusions,
           (SELECT string_agg(x, E'\n') FROM jsonb_array_elements_text(CASE WHEN m.constraints LIKE '[%' THEN m.constraints::jsonb ELSE '[]'::jsonb END) x) AS m_constraints,
           (SELECT string_agg(x, E'\n') FROM jsonb_array_elements_text(CASE WHEN m.assumptions LIKE '[%' THEN m.assumptions::jsonb ELSE '[]'::jsonb END) x) AS m_assumptions,
           (SELECT string_agg(x, E'\n') FROM jsonb_array_elements_text(CASE WHEN m.quality_expectations LIKE '[%' THEN m.quality_expectations::jsonb ELSE '[]'::jsonb END) x) AS m_quality,
           (SELECT string_agg(d.deliverable_name || ': ' || COALESCE(d.deliverable_description, ''), E'\n' ORDER BY d.display_order)
              FROM public.mandate_deliverables d WHERE d.mandate_id = m.id AND COALESCE(d.is_deleted, FALSE) = FALSE) AS m_products
    FROM (VALUES
      (1, 'SEED334-PRJ-01', 'approved',
       'A clean QSA retest and a smaller, simpler card environment that stays compliant.',
       'Board Risk Committee; card schemes; QSA; card operations; security operations; e-commerce merchants.',
       'Three stages: tokenisation, segmentation, evidence. Each stage ends with a QSA pre-check.',
       'Security PM with a network lead, two security engineers, a tokenisation vendor team and a compliance analyst.',
       'Close PCI findings', 'Tokenisation live', 'Segmentation live', 'QSA retest passed'),
      (2, 'SEED334-PRJ-02', 'approved',
       'Technicians close jobs on site and managers see work in progress in real time.',
       'Field technicians; depot supervisors; customers; billing team; IT mobile support.',
       'Agile delivery in two-week sprints with a two-depot pilot before rollout.',
       'Product owner, Scrum team of five, a field supervisor as user representative.',
       'Design sign-off', 'Pilot depot 1 live', 'Pilot depot 2 live', 'Go / no-go for rollout'),
      (3, 'SEED334-PRJ-03', 'approved',
       'Faults are found within a day and warranty claims are filed with evidence.',
       'Asset managers; site technicians; inverter vendors; warranty team; finance.',
       'Pilot on 12 sites, then scale by region after model accuracy is proven.',
       'Data PM, two data engineers, a data scientist, site operations lead.',
       'Edge collectors installed', 'Forecast model accepted', 'Alerts live', 'Rollout decision'),
      (4, 'SEED334-PRJ-04', 'approved',
       'Patients wait less and clinicians see triage data straight away.',
       'Patients; clinic nurses; clinicians; patient record vendor; information governance.',
       'Clinic-by-clinic rollout with a two-week bedding-in period each.',
       'Clinical PM, clinical safety officer, two developers, interface analyst, trainers.',
       'Clinical safety case approved', 'First clinic live', 'Interface live', 'All clinics live'),
      (5, 'SEED334-PRJ-05', 'approved',
       'A faster month-end close on a supported system with a clean audit trail.',
       'Finance team; auditors; budget holders; suppliers; IT.',
       'Waterfall with two mock migrations and a parallel run before the cutover weekend.',
       'Finance PM, ERP partner team, data migration lead, finance super users.',
       'Design approved', 'Mock migration 1', 'Mock migration 2', 'Cutover weekend'),
      (6, 'SEED334-PRJ-06', 'draft',
       'Partners use one secure gateway and spikes no longer cause outages.',
       'Partners; API product owners; security; operations; developer relations.',
       'Migrate partners in waves, starting with the lowest-risk partner.',
       'Platform PM, two platform engineers, security architect, partner manager.',
       'Gateway in place', 'First partner migrated', 'Developer portal live', 'All partners migrated'),
      (7, 'SEED334-PRJ-07', 'approved',
       'Teachers log in once and parents follow progress online.',
       'Teachers; parents; school leaders; SIS vendor; trust data protection officer.',
       'School-by-school rollout timed around term dates.',
       'Education PM, integration developer, two school champions, support desk.',
       'SSO live', 'Grade sync live', 'Parent portal live', 'All schools live'),
      (9, 'SEED334-PRJ-09', 'approved',
       'Analysts focus on real threats and incidents are handled within the hour.',
       'SOC analysts; CISO; IT operations; incident responders; auditors.',
       'Automate playbooks one alert family at a time, each with a supervised trial week.',
       'Security PM, SOAR engineer, two senior analysts, platform vendor.',
       'SOAR platform ready', 'First 10 playbooks live', 'All 20 playbooks live', 'Dashboard live'),
      (10, 'SEED334-PRJ-10', 'under_review',
       'Small claims are paid within a day while fraud stays under control.',
       'Claimants; claims handlers; fraud team; regulator; finance.',
       'Release by claim type, starting with motor glass claims.',
       'Claims PM, rules analyst, fraud data scientist, compliance officer, developers.',
       'Rules approved by risk', 'Glass claims automated', 'Home claims automated', 'Regulator review complete')
    ) AS v(idx, project_code, status, outcomes, parties, approach, team, ms1, ms2, ms3, ms4)
    JOIN public.projects p ON p.project_code = v.project_code AND COALESCE(p.is_deleted, FALSE) = FALSE
    LEFT JOIN public.project_mandates m ON m.project_id = p.id AND COALESCE(m.is_deleted, FALSE) = FALSE
  LOOP
    IF EXISTS (SELECT 1 FROM public.project_briefs b WHERE b.project_id = r.project_id) THEN
      UPDATE public.project_briefs b SET
        background = CASE WHEN b.background IS NULL OR b.background LIKE 'Expands on the approved mandate for %' THEN COALESCE(r.m_background, b.background) ELSE b.background END,
        project_objectives = CASE WHEN b.project_objectives IS NULL OR b.project_objectives LIKE 'Deliver the agreed scope of %' THEN COALESCE(r.m_objectives, b.project_objectives) ELSE b.project_objectives END,
        desired_outcomes = CASE WHEN b.desired_outcomes IS NULL OR b.desired_outcomes LIKE 'A working solution accepted by users%' THEN r.outcomes ELSE b.desired_outcomes END,
        project_scope = CASE WHEN b.project_scope IS NULL OR b.project_scope LIKE 'Design, build, test and handover of the agreed products for %' THEN COALESCE(r.m_scope, b.project_scope) ELSE b.project_scope END,
        scope_exclusions = CASE WHEN b.scope_exclusions IS NULL OR b.scope_exclusions LIKE 'Excludes any changes to systems or processes outside%' THEN COALESCE(r.m_exclusions, b.scope_exclusions) ELSE b.scope_exclusions END,
        constraints = CASE WHEN b.constraints IS NULL OR b.constraints LIKE 'Delivery is constrained by the approved budget%' THEN COALESCE(r.m_constraints, b.constraints) ELSE b.constraints END,
        assumptions = CASE WHEN b.assumptions IS NULL OR b.assumptions LIKE 'Assumes continued organisational support%' THEN COALESCE(r.m_assumptions, b.assumptions) ELSE b.assumptions END,
        users_and_interested_parties = CASE WHEN b.users_and_interested_parties IS NULL OR b.users_and_interested_parties LIKE 'Project Board, project team, end users%' THEN r.parties ELSE b.users_and_interested_parties END,
        outline_business_case_summary = CASE WHEN b.outline_business_case_summary IS NULL OR b.outline_business_case_summary LIKE 'Investment is justified by the reduction in manual effort%' THEN COALESCE(r.m_case, b.outline_business_case_summary) ELSE b.outline_business_case_summary END,
        product_description = CASE WHEN b.product_description IS NULL OR b.product_description LIKE 'A solution meeting the agreed acceptance criteria%' THEN COALESCE(r.m_products, b.product_description) ELSE b.product_description END,
        customer_quality_expectations = CASE WHEN b.customer_quality_expectations IS NULL OR b.customer_quality_expectations LIKE 'Products must meet the acceptance criteria%' THEN COALESCE(r.m_quality, b.customer_quality_expectations) ELSE b.customer_quality_expectations END,
        project_approach_description = CASE WHEN b.project_approach_description IS NULL OR b.project_approach_description LIKE 'Delivered in stages with checkpoint reporting%' THEN r.approach ELSE b.project_approach_description END,
        team_structure_description = CASE WHEN b.team_structure_description IS NULL OR b.team_structure_description LIKE 'A Project Manager leads a cross-functional team%' THEN r.team ELSE b.team_structure_description END,
        document_status = CASE WHEN b.document_status = 'approved' AND b.background LIKE 'Expands on the approved mandate for %' THEN r.status ELSE b.document_status END,
        updated_at = NOW()
      WHERE b.project_id = r.project_id;
    ELSE
      INSERT INTO public.project_briefs (
        project_id, brief_reference, author_id, owner_id, background, project_objectives, desired_outcomes, project_scope, scope_exclusions,
        constraints, assumptions, users_and_interested_parties, outline_business_case_summary, product_description,
        customer_quality_expectations, project_approach_description, team_structure_description, document_status, created_by)
      VALUES (
        r.project_id, '', r.author, r.author, r.m_background, r.m_objectives, r.outcomes, r.m_scope, r.m_exclusions,
        r.m_constraints, r.m_assumptions, r.parties, r.m_case, r.m_products,
        r.m_quality, r.approach, r.team, r.status, r.author);
    END IF;

    -- Four milestones when the project's register is empty (A5)
    IF NOT EXISTS (SELECT 1 FROM public.milestones ms WHERE ms.project_id = r.project_id AND COALESCE(ms.is_deleted, FALSE) = FALSE) THEN
      INSERT INTO public.milestones (id, project_id, milestone_name, description, target_date, forecast_date, actual_date, status, owner_user_id, sequence_order, created_by)
      SELECT ('c1344b01-0000-4000-8000-' || lpad((r.idx * 10 + n.k)::text, 12, '0'))::uuid, r.project_id, n.name,
             'High-level milestone from the project brief.',
             CURRENT_DATE + (n.k * 60 - 90),
             CASE WHEN n.k = 3 AND r.idx IN (2, 6) THEN CURRENT_DATE + (n.k * 60 - 60) ELSE NULL END,
             CASE WHEN n.k * 60 - 90 < 0 THEN CURRENT_DATE + (n.k * 60 - 90) ELSE NULL END,
             CASE WHEN n.k * 60 - 90 < 0 THEN 'achieved'
                  WHEN n.k = 3 AND r.idx IN (2, 6) THEN 'at_risk'
                  ELSE 'planned' END,
             r.author, n.k, r.author
      FROM (VALUES (1, r.ms1), (2, r.ms2), (3, r.ms3), (4, r.ms4)) AS n(k, name)
      ON CONFLICT (id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- PRJ-08 (v1436 brief) gets milestones too when its register is empty.
INSERT INTO public.milestones (id, project_id, milestone_name, description, target_date, actual_date, status, owner_user_id, sequence_order, created_by)
SELECT ('c1344b01-0000-4000-8000-' || lpad((80 + n.k)::text, 12, '0'))::uuid, p.id, n.name, 'High-level milestone from the project brief.',
       CURRENT_DATE + n.offs, CASE WHEN n.offs < 0 THEN CURRENT_DATE + n.offs END,
       CASE WHEN n.offs < 0 THEN 'achieved' ELSE 'planned' END,
       COALESCE(p.project_manager_user_id, p.owner_user_id), n.k, COALESCE(p.project_manager_user_id, p.owner_user_id)
FROM public.projects p
CROSS JOIN (VALUES (1, 'Interfaces live', -30), (2, 'Pilot depots live', 30), (3, 'Pilot results report', 90), (4, 'Rollout decision', 120)) AS n(k, name, offs)
WHERE p.project_code = 'SEED334-PRJ-08'
  AND NOT EXISTS (SELECT 1 FROM public.milestones ms WHERE ms.project_id = p.id AND COALESCE(ms.is_deleted, FALSE) = FALSE)
ON CONFLICT (id) DO NOTHING;

-- Check
SELECT p.project_code, b.document_status AS brief_status,
       (b.background NOT LIKE 'Expands on the approved mandate for %') AS brief_is_rich,
       (SELECT count(*) FROM public.milestones ms WHERE ms.project_id = p.id AND COALESCE(ms.is_deleted, FALSE) = FALSE) AS milestones
FROM public.projects p
LEFT JOIN public.project_briefs b ON b.project_id = p.id
WHERE p.project_code LIKE 'SEED334-PRJ-%' AND p.project_code <= 'SEED334-PRJ-10'
ORDER BY p.project_code;
